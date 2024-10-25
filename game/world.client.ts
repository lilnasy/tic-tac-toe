import type { Channel, Receiver } from "game/channel.ts"
import type { Entity } from "game/entity.ts"
import type { Data, MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { type System, connectionSystemClient, markerSystemClient } from "game/systems.ts"

export class ClientWorld implements World, Receiver {

    server = false as const
    client = true as const

    channel: ClientToServerChannel
    entities = new Set<Entity>
    systems: System<"both" | "client">[] = [ markerSystemClient, ...commonSystems, connectionSystemClient ]
    
    spawnEntity = spawnEntity

    /*
     * The client can be trusting of the server.
     * Send all received events directly to all systems using `update()`.
     */
    receive = update
    update = update

    /**
     * A static entity containing state related to the game, the connection and the player.
     */
    state: Entity<"Connection" | "Game" | "Sign" | "Turn"> = this.spawnEntity({
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
            console.error(new Error(`Connection to the server is an unexpected readyState: ${websocket.readyState}`, { cause: websocket }))
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
