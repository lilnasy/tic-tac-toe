import type { Entity } from "game/entity.ts"
import type { Channel, Receiver } from "game/channel.ts"
import type { Data, MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { connectionSystemServer, markerSystemServer, type System } from "game/systems.ts"
import { Player } from "game/player.ts"

export class ServerWorld implements World, Receiver {

    server = true as const
    client = false as const
    
    channel: ServerToClientsChannel
    entities = new Set<Entity>
    systems: System<"both" | "server">[] = [ markerSystemServer, ...commonSystems, connectionSystemServer ]

    players = new Set<Player>
    disconnectedPlayers = new Set<Player>
    
    spawnEntity = spawnEntity
    update = update
    
    /**
     * A static entity containing state related to the game.
     */
    state: Entity<"Turn"> = this.spawnEntity({
        Turn: null,
    })
    
    constructor(readonly name: string) {
        const channel = this.channel = new ServerToClientsChannel(this.players)
        channel.subscribe(this)
    }
    
    /**
     * To prevent reverse engineering and cheating, only certain messages sent by players
     * are allowed to have an effect on the server world.
     */
    #messageAllowlist: ReadonlyArray<keyof MessageRegistry> = [ "Mark" ]
    
    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (this.#messageAllowlist.includes(message)) this.update(message, data)
    }
}

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
