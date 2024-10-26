import type { Channel, Receiver } from "game/channel.ts"
import type { Entity } from "game/entity.ts"
import type { Data, MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { type System, connectionSystemClient, gameLoopSystemClient, markerSystemClient, syncSystemClient } from "game/systems.ts"
import { Store } from "game/store.ts"

export class ClientWorld implements World, Receiver {

    server = false as const
    client = true as const

    channel: ClientToServerChannel
    entities = new Set<Entity>
    systems: System<"both" | "client">[] = [ connectionSystemClient, gameLoopSystemClient, markerSystemClient, ...commonSystems, syncSystemClient ]
    
    spawnEntity = spawnEntity

    /*
     * The client can be trusting of the server.
     * Send all received events directly to all systems using `update()`.
     */
    receive = update
    update = update

    /**
     * A static entity containing global state related to the game, the connection and the player.
     */
    state: Entity<"Connection" | "Game" | "Sign" | "Turn"> = Store.create({
        Connection: "connecting",
        Game: "pending",
        Sign: null,
        Turn: null,
    })

    constructor(websocket: WebSocket) {
        const channel = this.channel = new ClientToServerChannel(websocket)
        channel.subscribe(this)
    }
}

class ClientToServerChannel implements Channel {
    
    constructor(readonly websocket: WebSocket) {
        if (websocket.readyState === WebSocket.OPEN) this.handleEvent(new Event("open"))
        else websocket.addEventListener("open", this, { once: true })
        websocket.addEventListener("message", this)
        websocket.addEventListener("close", this, { once: true })
    }
    
    send<Message extends keyof MessageRegistry>(message: Message, ..._data: Data<Message>) {
        const [ data = {} ] = _data
        const { websocket } = this
        if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ [message]: data }))
        } else if (websocket.readyState === WebSocket.CONNECTING) {
            websocket.addEventListener(
                "open",
                e => (e.target as WebSocket).send(JSON.stringify({ [message]: data })),
                { once: true }
            )
        } else {
            console.error(new Error(`Could not send the ${message} message to the server because the connection is in an unexpected readyState: ${readableReadyState(websocket.readyState)}`, { cause: websocket }))
        }
    }
    
    #receivers = new Set<Receiver>
    
    subscribe(receiver: Receiver) {
        this.#receivers.add(receiver)
    }
    
    unsubscribe(receiver: Receiver) {
        return this.#receivers.delete(receiver)
    }
    
    handleEvent(event: Event) {
        if (event.type === "open") {
            for (const receiver of this.#receivers) {
                receiver.receive("Connected", true)
            }
        } else if (event.type === "close") {
            this.websocket.removeEventListener("message", this)
        } else if (event.type === "message" && "data" in event && typeof event.data === "string") {
            const messageAndData = JSON.parse(event.data)
            for (const message in messageAndData) {
                const data = messageAndData[message]
                for (const receiver of this.#receivers) {
                    receiver.receive(message as keyof MessageRegistry, data)
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