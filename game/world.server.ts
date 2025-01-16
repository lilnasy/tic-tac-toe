import type { Channel, Receiver } from "game/channel.d.ts"
import type { Data, MessageRegistry, Messages } from "game/messages.d.ts"
import type { Board } from "game/board.d.ts"
import type { World } from "game/world.d.ts"
import {
    type System,
    colorSystemServer,
    connectionSystemServer,
    gameLoopSystemServer,
    lineCheckSystem,
    markerSystemServer,
    profileSystemServer,
    syncSystemServer,
    turnSystemServer
} from "game/systems.ts"
import { Player } from "game/player.ts"

export class ServerWorld implements World, Receiver {
    readonly server = true
    readonly client = false

    channel: ServerToClientsChannel
    systems: System<"both" | "server">[] = [
        colorSystemServer,
        connectionSystemServer,
        gameLoopSystemServer,
        markerSystemServer,
        lineCheckSystem,
        turnSystemServer,
        syncSystemServer,
        profileSystemServer
    ]

    players = new Set<Player>

    /**
     * A static object containing global state related to the game.
     */
    state: ServerWorldState = { connection: "waiting" }

    constructor(readonly name: string) {
        this.channel = new ServerToClientsChannel(this.players)
        this.channel.subscribe(this)
    }

    update<Message extends Messages>(
        message: Message,
        ..._data: Data<Message>
    ) {
        const [ data = {} ] = _data
        for (const system of this.systems) {
            system[`on${message}`]?.(data as any, this)
        }
    }
    
    /**
     * To prevent reverse engineering and cheating, only certain messages sent by players
     * are allowed to have an effect on the server world.
     */
    static #messageAllowlist: ReadonlyArray<Messages> = [ "Disconnected", "UpdateColors", "Mark", "PlayerProfile", "RequestRematch" ]
    
    receive<Message extends Messages>(message: Message, data: MessageRegistry[Message]) {
        if (ServerWorld.#messageAllowlist.includes(message)) this.update(message, data)
    }
}

export type ServerWorldState =
    | { connection: "waiting" }
    | { connection: "ingame", board: Board, turn: "X" | "O" }

class ServerToClientsChannel implements Channel {
    
    constructor(readonly players: Set<Player>) {}
    
    send<Message extends Messages>(message: Message, ..._data: Data<Message>): void {
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
