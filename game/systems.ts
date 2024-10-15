import type { MessageRegistry } from "game/messages.ts"
import type { Entity, Line, Place } from "game/entity.ts"
import type { World } from "game/world.ts"
import type { ClientWorld } from "game/client.ts"
import type { ServerWorld } from "game/server.ts"
import { announce, listen } from "game/store.ts"
import { isServer } from "game/client-server.ts"

export const markerSystemClient: System<"client"> = {
    onAssign({ sign }, world) {
        world.playerSign = sign
    },
    onMark(marked, world) {
        const { place } = marked
        if (world.playerSign !== world.gamestate.Turn) return
        for (const entity of world.entities) {
            if (entity.Place === place && entity.Marked === false) {
                announce(entity, entity.Marked = world.playerSign)
                world.channel.send("Mark", marked)
                world.update("Switch", {})
                return
            }
        }
    }
}

export const markerSystemServer: System<"server"> = {
    onPlayerMark(marked, world) {
        const { place, player } = marked
        if (player.sign !== world.gamestate.Turn) return
        for (const entity of world.entities) {
            if (entity.Place === place && entity.Marked === false) {
                announce(entity, entity.Marked = player.sign)
                world.update("Switch", {})
                return
            }
        }
    }
}

const lines = [
    [ 1, 2, 3 ],
    [ 4, 5, 6 ],
    [ 7, 8, 9 ],
    [ 1, 4, 7 ],
    [ 2, 5, 8 ],
    [ 3, 6, 9 ],
    [ 3, 5, 7 ],
    [ 1, 5, 9 ]
] as const

export const lineCheckSystem: System = {
    onMark(_, world) {
        const markedWithX = new Array<Place>
        const markedWithO = new Array<Place>
        
        for (const { Marked, Place } of world.entities) {
            if (Marked !== undefined && Place !== undefined) {
                if (Marked === "X") markedWithX.push(Place)
                if (Marked === "O") markedWithO.push(Place)
            }
        }
        
        for (const line of lines) {
            let winner: "X" | "O" | undefined = undefined
            if (makesLine(line, markedWithX)) winner = "X"
            if (makesLine(line, markedWithO)) winner = "O"
            if (winner) {
                world.update("Victory", { winner, line })
                if (isServer) world.channel.send("Victory", { winner, line })
                return
            }
        }
    }
}

lineCheckSystem.onPlayerMark = lineCheckSystem.onMark

function makesLine(line: Line, board: Array<Place>) {
    if (board.includes(line[0]) && board.includes(line[1]) && board.includes(line[2])) return true
    return false
}

export const turnSystem: System = {
    onSwitch(_, { gamestate }) {
        if (gamestate.Turn === "X") announce(gamestate, gamestate.Turn = "O")
        else if (gamestate.Turn === "O") announce(gamestate, gamestate.Turn = "X")
    }
}

export const victorySystem: System = {
    onVictory({ line }, world) {
        for (const entity of world.entities) {
            if (entity.Line !== undefined) announce(entity, entity.Line = line)
        }
    }
}

const networkedEntitiesByWorld = new WeakMap<World, Set<string>>

export const syncSystem: System = {
    onSpawn(entity, world) {
        if (entity.Sync !== undefined) {
            const networkedEntities = networkedEntitiesByWorld.get(world) ?? networkedEntitiesByWorld.set(world, new Set).get(world)!
            if (networkedEntities.has(entity.Sync.id)) return console.error(new Error("Multiple entities with the same Sync.id"), entity)
            else networkedEntities.add(entity.Sync.id)
            // server announces all mutations done to networked entities to all connected players
            if (isServer) listen(entity, () => world.channel.send("Sync", entity as Entity<"Sync">))
        }
    }
}

export const syncSystemClient: System<"client"> = {
    onSync(updatedEntity, world) {
        const { Sync: { id } } = updatedEntity
        for (const entity of world.entities) {
            if (entity.Sync !== undefined && entity.Sync.id === id) {
                announce(entity, Object.assign(entity, updatedEntity))
            }
        }
    }
}

export const connectSystemClient: System<"client"> = {
    onConnected(_, world) {
        for (const entity of world.entities) {
            if (entity.Connected !== undefined) {
                announce(entity, entity.Connected = true)
            }
        }
        const url = new URL(location.href)
        const [ segment1, segment2 ] = url.pathname.split("/").filter(Boolean)
        if (segment1 === "world" && typeof segment2 === "string") {
            world.update("JoinWorld", { world: segment2 })
        }
    },
    onNewWorld(_, world) {
        world.channel.send("NewWorld", true)
    },
    onJoinWorld(data, world) {
        world.channel.send("JoinWorld", data)
    },
    onJoinedWorld({ world }) {
        history.replaceState(null, "", `/world/${world}`)
    },
    onWorldNotFound({ world }) {
        alert(`World '${world.replace("-", " ")}' does not exist`)
        history.replaceState(null, "", `/`)
    },
    onReconnectId(id, world) {
        localStorage.setItem("ReconnectId", id)
        world.channel.send("Ready", true)
    }
}

export const connectSystemServer: System<"server"> = {
    onPlayerReady({ player }, world) {
        player.state = "ready"
        if (world.players.size === 2) {
            let allPlayersReady = true
            for (const player of world.players) {
                if (player.state !== "ready") allPlayersReady = false
            }
            if (allPlayersReady) world.update("Start", true)
        }
    }
}

export const startSystemServer: System<"server"> = {
    onStart(_, world) {
        const { entities, gamestate, players } = world

        for (const entity of entities) {
            entities.delete(entity)
        }

        entities.add(world.gamestate)
        
        for (let place = 1; place <= 9; place++) {
            const unmarkedSquare: Entity<"Marked" | "Place" | "Sync"> = {
                Marked: false,
                Place: place as Place,
                Sync: { id: `square${place}` }
            }
            world.spawnEntity(unmarkedSquare)
        }
        
        for (const player of players) {
            player.state = "ingame"
        }

        const [ player1, player2 ] = [ ...players ]
        const [ sign1, sign2 ] = Math.random() < 0.5 ? [ "X", "O" ] as const : [ "O", "X" ] as const
                
        player1.sign = sign1
        player1.send("Assign", { sign: sign1 })

        player2.sign = sign2
        player2.send("Assign", { sign: sign2 })

        /** randomly give the first turn to a player */
        announce(gamestate, gamestate.Turn = Math.random() < 0.5 ? "X" : "O")

        world.channel.send("Start", true)
    }
}

export type System<RunsOn extends "server" | "client" | "both" = "both"> = {
    [M in `on${keyof MessageRegistry}`]?: (data: MessageRegistry[RemoveOn<M>], world: RunsOn extends "server" ? ServerWorld : RunsOn extends "client" ? ClientWorld : ClientWorld | ServerWorld) => unknown
}

type RemoveOn<S extends string> =
    S extends `on${infer T}` ? T : S
