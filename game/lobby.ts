import { generateProjectName as generateWorldName } from "vendor/withastro/cli-kit"
import { ServerWorld } from "game/world.server.ts"
import { Player } from "game/player.ts"
import type { Receiver } from "game/channel.d.ts"
import type { JoinWorld, MessageRegistry, NewWorld, Disconnected, Messages } from "game/messages.d.ts"

/**
 * The lobby is responsible for creating new worlds where games can be played,
 * and adding newly-connected players to those worlds.
 */
export const lobby = new class Lobby implements Receiver {
    
    #worlds = new Map<string, ServerWorld>()

    /**
     * Creates a new player for the given connection and
     * starts listening for messages from it.
     */
    enter(weboscket: WebSocket) {
        const player = new Player(weboscket)
        player.subscribe(this)
    }

    /**
     * There are only three messages that the lobby is interested in.
     * 
     * - `NewWorld` is sent by a player when they click on "New Game".
     * 
     * - `JoinWorld` is sent by a player when they want to join an existing world
     *  whose name they have.
     * 
     * - `Disconnected` is sent implicitly when the connection is closed or is severed.
     */
    receive<Message extends Messages>(message: Message, data: MessageRegistry[Message]) {
        if (message === "Disconnected") {
            const { player }: Disconnected = data
            player!.unsubscribe(this)
        } else if (message === "NewWorld") {
            this.#newWorld(data)
        } else if (message === "JoinWorld") {
            this.#joinWorld(data)
        }
    }

    #newWorld(data: NewWorld) {
        const player = Player.get(data)
        if (!player) return Player.notFound("NewWorld", data)
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
        if (!player) return Player.notFound("JoinWorld", data)
        const world = this.#worlds.get(data.world)
        if (world === undefined) {
            return player.send("WorldNotFound", { world: data.world })
        }
        world.update("AddPlayer", { player })
    }
}
