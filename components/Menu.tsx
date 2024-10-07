import { css } from "astro:emotion"
import { Component } from "preact"
import Game from "./Game.tsx"

export class Menu extends Component {
    
    websocket: WebSocket

    state = {
        websocketOpen: false,
        inWorld: false,
    }

    /**
     * The world name in the url path, if it exists.
     */
    worldNameInSharedLink?: string

    constructor() {
        super()
        const url = new URL(location.href)
        const path = url.pathname.split("/").filter(Boolean)
        if (path[0] === "world" && typeof path[1] === "string") this.worldNameInSharedLink = path[1]
        url.protocol = url.protocol.replace("http", "ws")
        url.pathname = "/connect"
        this.websocket = new WebSocket(url)
        this.websocket.addEventListener("open", this, { once: true })
        this.websocket.addEventListener("message", this)
    }

    handleEvent(event: Event) {
        if (event.type === "open") {
            this.setState({ ...this.state, websocketOpen: true })
            if (this.worldNameInSharedLink) this.joinGame(this.worldNameInSharedLink)
        }
        if (
            event.type === "message" &&
            "data" in event &&
            typeof event.data === "string"
        ) {
            const { data: message } = event
            if (message.startsWith("world ")) {
                history.replaceState(null, "", `/world/${message.slice(6)}`)
                this.setState({ ...this.state, inWorld: true })
                this.websocket.removeEventListener("message", this)
            }
            if (message.startsWith("worlddoesnotexist ")) {
                alert(`World ${message.slice(18)} does not exist`)
                history.replaceState(null, "", `/`)
            }
        }
    }

    newGame = () => {
        this.websocket.send("newgame")
    }

    joinGame = (worldName?: unknown) => {
        if (typeof worldName !== "string") worldName ??= prompt("Enter world name")
        if (typeof worldName !== "string") return
        this.websocket.send(`join ${worldName.replace(" ", "-")}`)
    }

    render() {
        if (this.state.inWorld === false) {
            return <div>
                <p class={css`color: var(--line-color);`}>tic tac toe</p>
                <button onClick={this.newGame} disabled={this.state.websocketOpen === false}>new game</button>
                <button onClick={this.joinGame} disabled={this.state.websocketOpen === false}>join game</button>
            </div>
        }
        return <Game websocket={this.websocket}/>
    }
}
