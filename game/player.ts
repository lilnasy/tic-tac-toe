import type { Data, MessageRegistry } from "game/messages.ts"
import type { Channel, Receiver } from "game/channel.ts"

export class Player implements Channel {
    
    id = crypto.randomUUID()
    sign: "X" | "O" | undefined    
    state: "pending" | "connected" | "ingame" | "disconnected" = "pending"
    #websocket: WebSocket
    
    constructor(websocket: WebSocket) {
        if (websocket.readyState === WebSocket.OPEN) {
            this.state = "connected"
        } else if (websocket.readyState === WebSocket.CONNECTING) {
            websocket.addEventListener("open", this, { once: true })
        } else {
            console.error(new Error(`Connection to the player is an unexpected readyState: ${websocket.readyState}`, { cause: websocket }))
        }
        websocket.addEventListener("message", this)
        websocket.addEventListener("close", this, { once: true })
        this.#websocket = websocket
    }

    send<Message extends keyof MessageRegistry>(message: Message, ..._data: Data<Message>) {
        const [ data = {} ] = _data
        if (this.#websocket.readyState !== WebSocket.OPEN) {
            return console.error(new Error(`closed connection not cleaned up`, { cause: this }))
        }
        this.#websocket.send(JSON.stringify({ [message]: data }))
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
    static get(messageData: {}): Player {
        return Metadata.get(messageData as Metadata)
    }

    handleEvent(event: Event) {
        if (event.target !== this.#websocket) return
        if (event.type === "open") {
            this.state = "connected"
        } else if (event.type === "close") {
            this.state = "disconnected"
            this.#websocket.removeEventListener("message", this)
            for (const receiver of this.#receivers) {
                receiver.receive("Disconnected", { player: this })
            }
        } else if (event.type === "message" && "data" in event && typeof event.data === "string") {
            const messageAndData = JSON.parse(event.data)
            for (const message in messageAndData) {
                const data = messageAndData[message]
                /*
                * Special case some messages to also include the `Player`
                * object corresponding to the sender as a hidden field.
                */
               if (message === "Mark" || message === "NewWorld" || message === "JoinWorld") {
                    Metadata.set(data, this)
                }
                for (const receiver of this.#receivers) {
                    receiver.receive(message as keyof MessageRegistry, data)
                }
            }
        }
    }
}

class Metadata extends class { constructor(x: {}) { return x } } {
    #data: unknown
    static #create(object: {}): Metadata {
        return new Metadata(object)
    }
    static set(object: Metadata, data: unknown) {
        if (#data in object) {
            object.#data = data
        } else {
            Metadata.#create(object).#data = data
        }
    }
    static get<T>(object: Metadata): T {
        if (object.#data) return object.#data as T
        throw new Error(`The object does not have any metadata`, { cause: object })
    }
}