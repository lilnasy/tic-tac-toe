import type { MessageRegistry } from "game/messages.ts"
import type { Entity, Line, Place } from "game/entity.ts"
import type { World } from "game/world.ts"
import type { ClientWorld } from "game/client.ts"
import type { ServerWorld } from "game/server.ts"
import { Store } from "game/store.ts"
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
                Store.set(entity, "Marked", world.playerSign)
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
                Store.set(entity, "Marked", player.sign)
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
        
        let markedPlaces = 0

        for (const { Marked, Place } of world.entities) {
            if (Place !== undefined && Marked !== undefined) {
                if (Marked === "X") markedWithX.push(Place)
                if (Marked === "O") markedWithO.push(Place)
                markedPlaces++
            }
        }
        
        for (const line of lines) {
            let winner: "X" | "O" | undefined = undefined
            if (makesLine(line, markedWithX)) winner = "X"
            if (makesLine(line, markedWithO)) winner = "O"
            if (winner) {
                world.update("Victory", { winner, line })
                if (isServer) world.channel.send("Victory", { winner, line })
            } else if (markedPlaces === 9) {
                // draw
            }
        }
    }
}
if (isServer) lineCheckSystem.onPlayerMark = lineCheckSystem.onMark

function makesLine(line: Line, board: Array<Place>) {
    if (board.includes(line[0]) && board.includes(line[1]) && board.includes(line[2])) return true
    return false
}

export const turnSystem: System = {
    onSwitch(_, { gamestate }) {
        if (gamestate.Turn === "X") Store.set(gamestate, "Turn", "O")
        else if (gamestate.Turn === "O") Store.set(gamestate, "Turn", "X")
    }
}

export const victorySystem: System = {
    onVictory({ line }, world) {
        for (const entity of world.entities) {
            if (entity.Line !== undefined) Store.set(entity, "Line", line)
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
            if (isServer) Store.listen(entity, () => world.channel.send("Sync", entity as Entity<"Sync">))
        }
    }
}

export const syncSystemClient: System<"client"> = {
    onSync(updatedEntity, world) {
        const { Sync: { id } } = updatedEntity
        for (const entity of world.entities) {
            if (entity.Sync !== undefined && entity.Sync.id === id) {
                for (const _key in updatedEntity) {
                    const key = _key as keyof typeof updatedEntity
                    Store.set(entity, key, updatedEntity[key])
                }
            }
        }
    }
}

export const connectionSystemClient: System<"client"> = {
    onConnected(_, world) {
        for (const entity of world.entities) {
            if (entity.Connection !== undefined) {
                Store.set(entity, "Connection", "connected")
            }
        }
        const url = new URL(location.href)
        const [ segment1, segment2 ] = url.pathname.split("/").filter(Boolean)
        if (segment1 === "world" && typeof segment2 === "string") {
            world.update("JoinWorld", {
                world: segment2,
                reconnectId: sessionStorage.getItem(`reconnectId:${segment2}`) ?? undefined
            })
        }
    },
    onNewWorld(_, world) {
        world.channel.send("NewWorld", true)
    },
    onJoinWorld(data, world) {
        world.channel.send("JoinWorld", data)
    },
    onJoinedWorld(data, world) {
        if ("id" in data.reconnect) {            
            sessionStorage.setItem(`reconnectId:${data.world}`, data.reconnect.id)
            world.channel.send("Ready", true)
        } 
        for (const entity of world.entities) {
            if (entity.Connection !== undefined) {
                Store.set(entity, "Connection", "ready")
            }
        }
        history.replaceState(null, "", `/world/${data.world}`)
    },
    onWorldNotFound({ world }) {
        alert(`World '${world.replace("-", " ")}' does not exist. The game may have ended, or all the player may have left.`)
        history.replaceState(null, "", `/`)
    },
    onWorldOccupied({ world }) {
        alert(`World '${world.replace("-", " ")}' already has enough players.`)
        history.replaceState(null, "", `/`)
    },
    onStart(_, world) {
        for (const entity of world.entities) {
            if (entity.Connection !== undefined) {
                Store.set(entity, "Connection", "ingame")
            }
        }
    }
}

export const connectionSystemServer: System<"server"> = {
    onPlayerJoinWorld({ player, reconnectId }, world) {
        if (world.players.has(player)) return
        if (reconnectId) {
            for (const dplayer of world.disconnectedPlayers) {
                if (reconnectId === dplayer.id) {
                    player.id = reconnectId
                    player.sign = dplayer.sign
                    world.disconnectedPlayers.delete(dplayer)
                    break
                }
            }
        }
        if (world.players.size < 2) {
            world.players.add(player)
            player.send("JoinedWorld", {
                world: world.name,
                reconnect: { id: player.id }
            })
            /** subscribe the world to the message being sent by the player */
            player.subscribe(world)
        } else {
            player.send("WorldOccupied", { world: world.name })
        }
    },
    onPlayerDisconnected({ player }, world) {
        world.players.delete(player)
        world.disconnectedPlayers.add(player)
        player.unsubscribe(world)
    },
    onPlayerReady({ player }, world) {
        player.state = "ready"
        if (world.players.size === 2) {
            let allPlayersReady = true
            for (const player of world.players) {
                if (player.state !== "ready") allPlayersReady = false
            }
            if (allPlayersReady) world.update("Start", true)
        }
    },
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
        Store.set(gamestate, "Turn", Math.random() < 0.5 ? "X" : "O")

        world.channel.send("Start", true)
    }
}

export type System<RunsOn extends "server" | "client" | "both" = "both"> = {
    [M in `on${keyof MessageRegistry}`]?: (data: MessageRegistry[RemoveOn<M>], world: RunsOn extends "server" ? ServerWorld : RunsOn extends "client" ? ClientWorld : ClientWorld | ServerWorld) => unknown
}

type RemoveOn<S extends string> =
    S extends `on${infer T}` ? T : S
