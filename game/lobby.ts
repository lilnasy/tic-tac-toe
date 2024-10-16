import { WebSocket } from "@withastro/node/websocket"
import { generateProjectName as generateWorldName } from "vendor/withastro/cli-kit"
import { ServerWorld } from "game/server.ts"
import { Player } from "game/player.ts"
import type { Receiver } from "game/channel.ts"
import type { MessageRegistry, PlayerDisconnected, PlayerJoinWorld, PlayerNewWorld } from "game/messages.ts"

/**
 * The lobby is responsible for creating new worlds where games can be played, and adding newly-connected players to those #worlds.
 */
export const { lobby } = class Lobby implements Receiver {
    
    /**
     * Singleton instance of the Lobby class.
     */
    static lobby = new Lobby

    #worlds = new Map<string, WeakRef<ServerWorld>>

    enter(weboscket: WebSocket) {
        const player = new Player(weboscket)
        player.subscribe(this)
    }

    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (message === "PlayerDisconnected") {
            const { player } = data as PlayerDisconnected
            player.unsubscribe(this)
        } else if (message === "PlayerNewWorld") {
            this.#newWorld(data as PlayerNewWorld)
        } else if (message === "PlayerJoinWorld") {
            this.#joinWorld(data as PlayerJoinWorld)
        }
    }

    #newWorld({ player }: PlayerNewWorld) {
        let worldName: string
        // security: possible world names are finite - an attack could create them all, and this line would then freeze the server
        while (this.#worlds.has(worldName = generateWorldName())) {}
        const world = new ServerWorld(worldName)
        this.#worlds.set(world.name, new WeakRef(world))
        world.update("PlayerJoinWorld", { player, world: worldName })
    }

    #joinWorld(message: PlayerJoinWorld) {
        const world = this.#worlds.get(message.world)?.deref()
        if (world === undefined) {
            return message.player.send("WorldNotFound", { world: message.world })
        }
        world.update("PlayerJoinWorld", message)
    }
}
