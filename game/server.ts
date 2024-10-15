import { WebSocket } from "@withastro/node/websocket"
import type { Entity } from "game/entity.ts"
import type { Channel, Receiver } from "game/channel.ts"
import type { MessageRegistry } from "game/messages.ts"
import { type World, commonSystems, spawnEntity, update } from "game/world.ts"
import { connectSystemServer, markerSystemServer, startSystemServer, type System } from "game/systems.ts"
import { Player } from "game/player.ts"

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
    
    addPlayer(player: Player) {
        this.players.add(player)
        player.send("JoinedWorld", { world: this.name })
        player.send("ReconnectId", player.id)
        player.subscribe(this.channel)
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

class ServerToClientsChannel implements Channel, Receiver {

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

    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (message === "PlayerDisconnected") {
            const { player } = data as MessageRegistry["PlayerDisconnected"]
            player.unsubscribe(this)
        } else {
            for (const receiver of this.#receivers) {
                receiver.receive(message, data)
            }
        }
    }
}
