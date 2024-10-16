import type { Entity } from "game/entity.ts"
import type { Channel, Receiver } from "game/channel.ts"
import type { MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { connectionSystemServer, markerSystemServer, type System } from "game/systems.ts"
import { Player } from "game/player.ts"

export class ServerWorld implements World, Receiver {
    
    channel: ServerToClientsChannel
    entities = new Set<Entity>
    players = new Set<Player>
    #disconnectedPlayers: Set<Player> | undefined
    get disconnectedPlayers() {
        return this.#disconnectedPlayers ??= new Set
    }
    spawnEntity = spawnEntity
    systems: System<"both" | "server">[] = [ markerSystemServer, ...commonSystems, connectionSystemServer ]
    update = update
    
    gamestate: Entity<"Turn" | "Sync"> = this.spawnEntity({
        Turn: null,
        Sync: { id: "gamestate" }
    })
    
    constructor(readonly name: string) {
        const channel = this.channel = new ServerToClientsChannel(this.players)
        channel.subscribe(this)
    }
    
    /**
     * To prevent reverse engineering and cheating, only certain messages sent by players
     * are allowed to have an effect on the server world.
     */
    #messageAllowlist: Array<keyof MessageRegistry> = [ "PlayerJoinWorld", "PlayerMark", "PlayerReady", "PlayerDisconnected" ]
    
    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (this.#messageAllowlist.includes(message)) this.update(message, data)
    }
}

class ServerToClientsChannel implements Channel {
    
    constructor(readonly players: Set<Player>) {}
    
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
}
