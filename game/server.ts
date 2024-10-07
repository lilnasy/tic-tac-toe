import { WebSocket } from "@withastro/node/websocket"
import type { Channel, Receiver } from "game/channel.ts"
import type { MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { usher } from "game/usher.ts"
import { connectSystemServer, markerSystemServer, startSystemServer, type System } from "game/systems.ts"
import type { Entity } from "game/entity.ts"

export class ServerWorld implements World, Receiver {

    channel: ServerToClientsChannel
    entities = new Set<Entity>
    players = new Set<Player>
    spawnEntity = spawnEntity
    systems: System<"both" | "server">[] = [ markerSystemServer, ...commonSystems, connectSystemServer, startSystemServer ]
    update = update
    
    gamestate: Entity<"Turn" | "Sync"> = this.spawnEntity({
        Turn: undefined,
        Sync: { id: "gamestate" }
    })
    
    constructor(readonly name: string) {
        const channel = this.channel = new ServerToClientsChannel(this.name, this.players)
        channel.subscribe(this)
    }
    
    addPlayer(connection: WebSocket) {
        const player = new Player(connection)
        this.players.add(player)
        player.send("ReconnectId", player.id)
        player.websocket.addEventListener("message", this.channel)
        player.websocket.addEventListener("close", this.channel, { once: true })
    }

    /**
     * To prevent reverse engineering and cheating, only certain messages sent by players
     * are allowed to have an effect on the server world.
     */
    #messageAllowlist: Array<keyof MessageRegistry> = [ "PlayerMark", "PlayerReady" ]

    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (this.#messageAllowlist.includes(message)) this.update(message, data)
    }
}

class ServerToClientsChannel implements Channel {

    constructor(
        readonly worldName: string,
        readonly players: Set<Player>
    ) {}

    send<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]): void {
        for (const player of this.players) {
            player.send(message, data)
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
        if (event.type === "close") {
            const { target: websocket } = event
            if (websocket === null) return console.error(
                new Error("Event handed to a ServerWorld is missing the target websocket.")
            )
            this.players.delete(this.#playerFromWebSocket(websocket)!)
            if (this.players.size === 0) usher.worlds.delete(this.worldName)
            websocket.removeEventListener("message", this)
        }
        
        if (
            event.type === "message" &&
            "data" in event === true &&
            typeof event.data === "string"
        ) {
            const messageAndData = JSON.parse(event.data)
            for (const message in messageAndData) {
                const data = messageAndData[message]
                /*
                 * Special case the `Ready` and `Mark` message to also
                 * include the `Player` object corresponding to the sernder.
                 */
                if (message === "Ready") this.#sendToAllReceivers("PlayerReady", {
                    player: this.#playerFromWebSocket(event.target!)!
                })
                else if (message === "Mark") this.#sendToAllReceivers("PlayerMark", {
                    place: data.place,
                    player: this.#playerFromWebSocket(event.target!)!
                })
                else this.#sendToAllReceivers(message as keyof MessageRegistry, data)
            }
        }
    }

    #sendToAllReceivers<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        for (const receiver of this.#receivers) {
            receiver.receive(message, data)
        }
    }

    #playerFromWebSocket(websocket: EventTarget) {
        for (const player of this.players) {
            if (player.websocket === websocket) return player
        }
    }
}

export class Player {
    
    id = crypto.randomUUID()

    sign: "X" | "O" | undefined
    
    state: "connected" | "ready" | "ingame" = "connected"
    
    constructor(readonly websocket: WebSocket) {}

    send<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]): void {
        if (this.websocket.readyState !== WebSocket.OPEN) {
            return console.error(new Error(`closed connection not cleaned up`, { cause: this }))
        }
        this.websocket.send(JSON.stringify({ [message]: data }))
    }
}