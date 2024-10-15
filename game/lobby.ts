import { WebSocket } from "@withastro/node/websocket"
import { generateProjectName as generateWorldName } from "vendor/withastro/cli-kit"
import { ServerWorld } from "game/server.ts"
import { Player } from "game/player.ts"
import type { Receiver } from "game/channel.ts"
import type { MessageRegistry, PlayerDisconnected, PlayerJoinWorld, PlayerNewWorld } from "game/messages.ts"

/**
 * The lobby is responsible for creating new worlds where games can be played, and adding newly-connected players to those worlds.
 */
export const { lobby } = class Lobby implements Receiver {
    
    /**
     * Singleton instance of the Lobby class.
     */
    static lobby = new Lobby

    worlds = new Map<string, ServerWorld>

    enter(connection: WebSocket) {
        const player = new Player(connection)
        player.subscribe(this)
    }

    receive<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]) {
        if (message === "PlayerDisconnected") {
            const { player } = data as PlayerDisconnected
            player.unsubscribe(this)
        } else if (message === "PlayerNewWorld") {
            const { player } = data as PlayerNewWorld
            this.newWorld(player)
        } else if (message === "PlayerJoinWorld") {
            const { player, world } = data as PlayerJoinWorld
            this.joinWorld(player, world)
        }
    }

    newWorld(player: Player) {
        let worldName: string
        // security: possible world names are finite - an attack could create them all, and this line would then freeze the server
        while (this.worlds.has(worldName = generateWorldName())) {}
        const world = new ServerWorld(worldName)
        this.worlds.set(world.name, world)
        world.addPlayer(player)
        player.unsubscribe(this)
    }

    joinWorld(player: Player, worldName: string) {
        const world = this.worlds.get(worldName)
        if (world === undefined) {
            return player.send("WorldNotFound", { world: worldName })
        }
        world.addPlayer(player)
        player.unsubscribe(this)
    }
}
