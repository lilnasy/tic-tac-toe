import type { MessageRegistry } from "game/messages.ts"
import type { Channel, Receiver } from "game/channel.ts"

export class Player implements Channel {
    
    id = crypto.randomUUID()
    sign: "X" | "O" | undefined    
    state: "pending" | "connected" | "ready" | "ingame" | "disconnected" = "pending"
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

    send<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]): void {
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

    handleEvent(event: Event) {
        if (event.target !== this.#websocket) return
        if (event.type === "open") {
            this.state = "connected"
        } else if (event.type === "close") {
            this.state = "disconnected"
            this.#websocket.removeEventListener("message", this)
            for (const receiver of this.#receivers) {
                receiver.receive("PlayerDisconnected", { player: this })
            }
        } else if (event.type === "message" && "data" in event && typeof event.data === "string") {
            const messageAndData = JSON.parse(event.data)
            for (const message in messageAndData) {
                const data = messageAndData[message]
                /*
                * Special case some messages to also include the
                * `Player` object corresponding to the sernder.
                */
               if (message === "Ready") {
                   const outgoingData = { player: this }
                   for (const receiver of this.#receivers) {
                        receiver.receive("PlayerReady", outgoingData)
                    }
                } else if (message === "Mark") {
                    const outgoingData = { place: data.place, player: this }
                    for (const receiver of this.#receivers) {
                        receiver.receive("PlayerMark", outgoingData)
                    }
                } else if (message === "NewWorld") {
                    const outgoingData = { player: this }
                    for (const receiver of this.#receivers) {
                        receiver.receive("PlayerNewWorld", outgoingData)
                    }
                } else if (message === "JoinWorld") {
                    const outgoingData = { world: data.world, player: this }
                    for (const receiver of this.#receivers) {
                        receiver.receive("PlayerJoinWorld", outgoingData)
                    }
                } else {
                    for (const receiver of this.#receivers) {
                        receiver.receive(message as keyof MessageRegistry, data)
                    }
                }
            }
        }
    }
}