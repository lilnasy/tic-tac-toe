import type { Entity, States } from "game/entity.ts"
import type { Channel, Receiver } from "game/channel.ts"
import type { Data, MessageRegistry } from "game/messages.ts"
import { type World, update } from "game/world.ts"
import { colorSystemServer, connectionSystemServer, gameLoopSystemServer, lineCheckSystem, markerSystemServer, syncSystemServer, turnSystemServer, type System } from "game/systems.ts"
import { Player } from "game/player.ts"
import { Store } from "game/store.ts"

export class ServerWorld implements World, Receiver {

    server = true as const
    client = false as const
    
    channel: ServerToClientsChannel
    entities = new Set<Entity>
    systems: System<"both" | "server">[] = [
        colorSystemServer,
        connectionSystemServer,
        gameLoopSystemServer,
        markerSystemServer,
        lineCheckSystem,
        turnSystemServer,
        syncSystemServer
    ]

    players = new Set<Player>
    disconnectedPlayers = new Set<Player>
    
    update = update
    
    /**
     * A static object containing global state related to the game.
     */
    state = Store.create<Gamestate>({ connection: "waiting" })
    
    constructor(readonly name: string) {
        const channel = this.channel = new ServerToClientsChannel(this.players)
        channel.subscribe(this)
    }

    spawn<State extends keyof States>(entity: Entity<State>) {
        const _entity = Store.create(entity)
        this.update("Spawn", _entity)
        this.entities.add(_entity)
        return _entity
    }

    despawn(entity: Entity) {
        this.entities.delete(entity)
    }
    
    /**
     * To prevent reverse engineering and cheating, only certain messages sent by players
     * are allowed to have an effect on the server world.
     */
    static #messageAllowlist: ReadonlyArray<keyof MessageRegistry> = [ "UpdateColors", "Mark", "RequestRematch" ]
    
    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (ServerWorld.#messageAllowlist.includes(message)) this.update(message, data)
    }
}

export type Gamestate =
    | { connection: "waiting" }
    | { connection: "ingame", turn: "X" | "O" }

class ServerToClientsChannel implements Channel {
    
    constructor(readonly players: Set<Player>) {}
    
    send<Message extends keyof MessageRegistry>(message: Message, ..._data: Data<Message>): void {
        for (const player of this.players) {
            player.send(message, ..._data as any)
        }
    }
    
    #receivers = new Set<Receiver>
    
    subscribe(receiver: Receiver) {
        this.#receivers.add(receiver)
    }
    
    unsubscribe(receiver: Receiver) {
        return this.#receivers.delete(receiver)
    }
}
