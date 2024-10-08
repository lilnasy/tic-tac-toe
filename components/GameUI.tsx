import { css } from "astro:emotion"
import { Component, createRef, type JSX } from "preact"
import Game from "./Game.tsx"
import * as Icons from "./Icons.tsx"

export class GameUI extends Component {
    render() {
        return <>
            <TitleScreen/>
            <Toolbar/>
        </>
    }
}

class Toolbar extends Component {

    colorWheelDialogRef = createRef<HTMLDialogElement>()

    toggleColorWheel() {
        const dialog = this.colorWheelDialogRef.current
        if (dialog?.open) dialog.close()
        else dialog?.show()
    }
    
    switchLightDark() {
        document.documentElement.toggleAttribute("data-dark")
    }

    render() {
        return <div class={css`
                position: absolute;
                place-self: end;
                margin: 1rem;
            `}>
            <Tool Icon={Icons.Palette} onClick={this.toggleColorWheel}>
                <dialog
                    class={css`background: white;
                        border: none;
                        margin: 0;
                        padding: 0;
                        translate: -3rem -13rem;`
                    }
                    ref={this.colorWheelDialogRef}
                >
                    <div class={css`
                        height: 6rem;
                        width: 6rem;
                        margin: 2rem;
                        background: conic-gradient(in oklch increasing hue, oklch(0.7 0.15 0), oklch(0.7 0.15 359));
                        mask-image: radial-gradient(circle farthest-side at center, transparent 48%, white 50%, white 98%, transparent 100%);
                    `}/>
                </dialog>
            </Tool>
            <Tool Icon={Icons.InvertColors} onClick={this.switchLightDark}/>
        </div>
    }
}

interface ToolProps extends JSX.HTMLAttributes<HTMLButtonElement> {
    Icon: typeof Icons[keyof typeof Icons]
}

class Tool extends Component<ToolProps> {
    render() {
        return <button
            class={css`
                &:not([disabled]) {
                    cursor: pointer;
                }
                &:not(:hover) {
                    background: none;
                    --fill: var(--primary)
                }
                &:hover {
                    background: var(--primary);
                    --fill: var(--on-primary);
                }
                transition: background 250ms;
                border: none;
                border-radius: 1.5rem;
                height: 3rem;
                width: 3rem;
                margin: 0.25rem;
            `}
            {...this.props}
        >
            <this.props.Icon class={css`
                height: 2rem;
                width: 2rem;
                fill: var(--fill);
                transition: fill 250ms;
            `}/>
            {this.props.children}
        </button>
    }
}

class TitleScreen extends Component {
    
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
        const websocket = this.websocket = new WebSocket(url)
        websocket.addEventListener("open", this, { once: true })
        websocket.addEventListener("message", this)
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

    newGame() {
        this.websocket.send("newgame")
    }

    joinGame(worldName?: unknown) {
        if (typeof worldName !== "string") worldName ??= prompt("Enter world name")
        if (typeof worldName !== "string") return
        this.websocket.send(`join ${worldName.replace(" ", "-")}`)
    }

    render() {
        if (this.state.inWorld === false) {
            return <div class={css`
                display: grid;
                grid-template-areas: "a" "b" "c";
            `}>
                <p class={css`
                    font-family: "Sue Ellen Francisco";
                    font-size: 5rem;
                    text-align: center;
                    color: var(--primary);
                    transition: color 250ms;
                    line-height: 5rem;
                    margin: 1rem;
                `}>TIC<br/>TAC<br/>TOE</p>
                <button
                    class={titleButtonStyle}
                    onClick={this.newGame}
                    disabled={this.state.websocketOpen === false}
                    data-primary
                >New Game</button>
                <button
                    class={titleButtonStyle}
                    onClick={this.joinGame}
                    disabled={this.state.websocketOpen === false}
                    data-secondary
                >Join</button>
            </div>
        }
        return <Game websocket={this.websocket}/>
    }
}

const titleButtonStyle = css`
    &[data-primary] {
        background: var(--primary);
        color: var(--on-primary);
    }
    &[data-secondary] {
        background: var(--secondary);
        color: var(--on-secondary);
    }
    &:not([disabled]) {
        cursor: pointer;
    }
    &:hover {
        scale: 1.1;
    }
    transition-property: background, color, scale;
    transition-duration: 250ms;
    font-family: "Sue Ellen Francisco";
    height: 3rem;
    width: 8rem;
    font-size: 2rem;
    border-radius: 1.5rem;
    margin: 0.5rem;
    line-height: 3.4rem;
    border: none;
`
