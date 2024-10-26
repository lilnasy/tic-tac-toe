import { WebSocket } from "@withastro/node/websocket"
import { generateProjectName as generateWorldName } from "vendor/withastro/cli-kit"
import { ServerWorld } from "game/world.server.ts"
import { Player } from "game/player.ts"
import type { Receiver } from "game/channel.ts"
import type { JoinWorld, MessageRegistry, NewWorld, Disconnected } from "game/messages.ts"

/**
 * The lobby is responsible for creating new worlds where games can be played, and adding newly-connected players to those #worlds.
 */
export const { lobby } = class Lobby implements Receiver {
    
    /**
     * Singleton instance of the Lobby class.
     */
    static lobby = import.meta.env.DEV ? (((globalThis as any).lobby as Lobby) ??= new Lobby) : new Lobby

    #worlds = new Map<string, ServerWorld>

    enter(weboscket: WebSocket) {
        const player = new Player(weboscket)
        player.subscribe(this)
    }

    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (message === "Disconnected") {
            const { player } = data as Disconnected
            player.unsubscribe(this)
        } else if (message === "NewWorld") {
            this.#newWorld(data as NewWorld)
        } else if (message === "JoinWorld") {
            this.#joinWorld(data as JoinWorld)
        }
    }

    #newWorld(data: NewWorld) {
        const player = Player.get(data)
        let worldName: string
        // security: possible world names are finite - an attack could
        // create them all, and this line would then freeze the server
        while (this.#worlds.has(worldName = generateWorldName())) {}
        const world = new ServerWorld(worldName)
        this.#worlds.set(world.name, world)
        world.update("AddPlayer", { player })
    }

    #joinWorld(data: JoinWorld) {
        const player = Player.get(data)
        const world = this.#worlds.get(data.world)
        if (world === undefined) {
            return Player.get(data).send("WorldNotFound", { world: data.world })
        }
        world.update("AddPlayer", { player, reconnectId: data.reconnectId })
    }
}
