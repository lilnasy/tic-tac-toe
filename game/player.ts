import type { Data, Messages } from "game/messages.d.ts"
import type { Channel, Receiver } from "game/channel.d.ts"
import type * as Animal from "game/animals.ts"
import { metadata } from "lib/metadata.ts"

export interface PlayerData {
    name?: string
    animal: Animal.Type
}

export namespace PlayerData {
    export interface WithSign extends PlayerData {
        sign: "X" | "O"
    }
}

const sendingPlayer = metadata<Player>()

export type PlayerState = 
    | { connection: "pending" }
    | { connection: "connected" }
    | { connection: "inworld",    name?: string, animal: Animal.Type }
    | { connection: "ingame",     name?: string, animal: Animal.Type, sign: "X" | "O" }
    | { connection: "disconnected" }

export class Player implements Channel {
    
    id = crypto.randomUUID().slice(0, 8)
    state: PlayerState = { connection: "pending" }
    #websocket: WebSocket

    constructor(websocket: WebSocket) {
        if (websocket.readyState === WebSocket.OPEN) {
            this.state.connection = "connected"
        } else if (websocket.readyState === WebSocket.CONNECTING) {
            websocket.addEventListener("open", this, { once: true })
        } else {
            console.error(new Error(`Could not create a player using the provided websocket connection because it is in an unusable readyState: ${readableReadyState(websocket.readyState)}`, { cause: websocket }))
        }
        websocket.addEventListener("message", this)
        websocket.addEventListener("close", this, { once: true })
        this.#websocket = websocket
    }

    send<Message extends Messages>(message: Message, ..._data: Data<Message>) {
        const [ data = {} ] = _data
        // if the current player was the one who created this message, dont bother echoing it back
        if (Player.get(data) === this) return
        if (this.#websocket.readyState === WebSocket.OPEN) {
            this.#websocket.send(JSON.stringify({ [message]: data }))
        } else {
            console.error(new Error(`There was an attempt to send a message to a closed connection.`, { cause: this }))
        }
    }

    #receivers = new Set<Receiver>
    
    subscribe(receiver: Receiver) {
        this.#receivers.add(receiver)
    }
    
    unsubscribe(receiver: Receiver) {
        this.#receivers.delete(receiver)
    }

    /**
     * Retrieve the hidden field containing the player object
     * from a message originally created by that Player.
     */
    static get(messageData: {}): Player | undefined {
        return sendingPlayer.get(messageData)
    }

    static notFound(message: Messages, data: {}) {
        return console.error(new Error(`The ${message} message did not have a player associated with it.`, { cause: data }))
    }

    handleEvent(event: Event) {
        if (event.target !== this.#websocket) return
        if (event.type === "open") {
            this.state.connection = "connected"
        } else if (event.type === "close") {
            this.state.connection = "disconnected"
            this.#websocket.removeEventListener("message", this)
            for (const receiver of this.#receivers) {
                receiver.receive("Disconnected", { player: this })
            }
        } else if (event.type === "message" && "data" in event && typeof event.data === "string") {
            const messageAndData = JSON.parse(event.data)
            for (const message in messageAndData) {
                const data = messageAndData[message]
                /*
                * Special case some messages and attach the `Player`
                * who sent the message as a hidden field.
                */
                if (
                    message === "Mark" ||
                    message === "NewWorld" ||
                    message === "JoinWorld" ||
                    message === "PlayerProfile" ||
                    message === "RequestRematch"
                ) {
                    sendingPlayer.set(data, this)
                }
                for (const receiver of this.#receivers) {
                    receiver.receive(message as Messages, data)
                }
            }
        }
    }
}

function readableReadyState(readyState: WebSocket["readyState"]) {
    if (readyState === WebSocket.CONNECTING) return "CONNECTING"
    if (readyState === WebSocket.OPEN) return "OPEN"
    if (readyState === WebSocket.CLOSING) return "CLOSING"
    if (readyState === WebSocket.CLOSED) return "CLOSED"
}
