import type { Channel, Receiver } from "game/channel.ts"
import type { Entity } from "game/entity.ts"
import type { MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { type System, connectSystemClient, markerSystemClient, syncSystemClient } from "game/systems.ts"

export class ClientWorld implements World, Receiver {

    channel: ClientToServerChannel
    entities = new Set<Entity>
    playerSign: "X" | "O" | undefined = undefined
    spawnEntity = spawnEntity
    systems: System<"both" | "client">[] = [ markerSystemClient, ...commonSystems, connectSystemClient, syncSystemClient ]
    /*
     * The client can be trusting of the server.
     * Send all received events directly to all systems using `update()`.
     */
    receive = update
    update = update
    
    gamestate: Entity<"Turn" | "Sync"> = this.spawnEntity({
        Turn: undefined,
        Sync: { id: "gamestate" }
    })

    constructor(websocket: WebSocket) {
        const channel = this.channel = new ClientToServerChannel(websocket)
        channel.subscribe(this)
    }
}

class ClientToServerChannel implements Channel {
    
    constructor(readonly websocket: WebSocket) {
        websocket.addEventListener("message", this)
        websocket.addEventListener("close", this, { once: true })
    }

    send<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        this.websocket.send(JSON.stringify({ [message]: data }))
    }

    #receivers = new Set<Receiver>

    subscribe(receiver: Receiver) {
        this.#receivers.add(receiver)
    }

    unsubscribe(receiver: Receiver) {
        return this.#receivers.delete(receiver)
    }

    handleEvent(event: Event) {
        if (event.type === "close") this.websocket.removeEventListener("message", this)
        if (event.type === "message" && "data" in event && typeof event.data === "string") {
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
