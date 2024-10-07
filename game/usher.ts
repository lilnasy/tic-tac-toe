import { WebSocket } from "@withastro/node/websocket"
import { generateProjectName as generateWorldName } from "vendor/withastro/cli-kit"
import { ServerWorld } from "game/server.ts"

/**
 * The usher is responsible for creating new worlds where games can be played, and adding newly-connected players to those worlds.
 */
export const { usher } = class Usher {
    
    /**
     * Singleton instance of the Usher class.
     */
    static usher = new Usher

    worlds = new Map<string, ServerWorld>

    usher(player: WebSocket) {
        if (player.readyState === WebSocket.OPEN) usher.add(player)
        else if (player.readyState === WebSocket.CONNECTING) player.addEventListener("open", () => usher.add(player), { once: true, signal: AbortSignal.timeout(15000)})
        else console.error(new Error(`player's websocket is an unexpected readyState: ${player.readyState}`, { cause: player }))
    }
    
    add(player: WebSocket) {
        player.addEventListener("message", this)
        player.addEventListener("close", this, { once: true })
    }

    handleEvent(event: Event & { target: WebSocket}) {
        if (event.type === "close") {
            return event.target.removeEventListener("message", this)
        }
        if (
            event.type === "message" &&
            "data" in event === true &&
            typeof event.data === "string"
        ) {
            const { data: message, target: player } = event
            if (message === "newgame") this.newWorld(player)        
            if (message.startsWith("join")) this.joinWorld(player, message.slice("join ".length))
        }
    }

    newWorld(player: WebSocket) {
        let worldName: string
        // security: possible world names are finite - an attack could create them all, and this line would then freeze the server
        while (this.worlds.has(worldName = generateWorldName())) {}
        const world = new ServerWorld(worldName)
        this.worlds.set(worldName, world)
        player.send(`world ${worldName}`)
        player.removeEventListener("message", this)
        world.addPlayer(player)
    }

    joinWorld(player: WebSocket, worldName: string) {
        const world = this.worlds.get(worldName)
        if (world === undefined) return player.send(`worlddoesnotexist ${worldName}`)
        player.send(`world ${worldName}`)
        player.removeEventListener("message", this)
        world.addPlayer(player)
    }
}
