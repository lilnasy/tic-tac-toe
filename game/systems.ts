import type { MessageRegistry } from "game/messages.ts"
import type { Entity, Line, Place } from "game/entity.ts"
import type { ClientWorld } from "game/world.client.ts"
import type { ServerWorld } from "game/world.server.ts"
import { Store } from "game/store.ts"
import { isServer } from "game/client-server.ts"
import { Player } from "game/player.ts"

export const markerSystemClient: System<"client"> = {
    onMark(marked, world) {
        const { place } = marked
        const { channel, entities, state } = world
        if (state.Sign === null || state.Sign !== state.Turn) return
        for (const entity of entities) {
            if (entity.Place === place && entity.Marked === undefined) {
                Store.set(entity, "Marked", state.Sign)
                channel.send("Mark", marked)
                world.update("Switch")
                return
            }
        }
    }
}

export const markerSystemServer: System<"server"> = {
    onMark(marked, world) {
        const player = Player.get(marked)
        if (!player) return Player.notFound("Mark", marked)
        const { place } = marked
        if (player.sign !== world.state.Turn) return
        for (const entity of world.entities) {
            if (entity.Place === place && entity.Marked === undefined) {
                Store.set(entity, "Marked", player.sign)
                return world.update("Switch")
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
                if (Marked !== undefined) markedPlaces++
            }
        }
        
        for (const line of lines) {
            let winner: "X" | "O" | undefined = undefined
            if (makesLine(line, markedWithX)) winner = "X"
            if (makesLine(line, markedWithO)) winner = "O"
            if (winner !== undefined) {
                if (isServer) {
                    return world.channel.send("Victory", { winner, line })
                } else {
                    return world.update("Victory", { winner, line })
                }
            }
        }

        if (markedPlaces === 9) {
            if (isServer) world.channel.send("Draw")
            else world.update("Draw")
        }
    }
}

function makesLine(line: Line, board: Array<Place>) {
    if (board.includes(line[0]) && board.includes(line[1]) && board.includes(line[2])) return true
    return false
}

export const turnSystem: System = {
    onSwitch(data, { channel, server, state }) {
        const { to = state.Turn === "X" ? "O" : "X" } = data
        Store.set(state, "Turn", to)
        if (isServer && server) channel.send("Switch", { to })
    }
}

export const gameLoopSystemClient: System<"client"> = {
    onStart({ Turn }, world) {
        const { entities, state } = world
        
        for (const entity of entities) {
            world.despawn(entity)
        }
        
        for (let place = 1; place <= 9; place++) {
            const unmarkedSquare: Entity<"Place" | "Sync"> = {
                Place: place as Place,
                Sync: { id: `square${place}` },
                View: "Square"
            }
            world.spawn(unmarkedSquare)
        }
        
        Store.set(state, "Connection", "ingame")
        Store.set(state, "Game", "active")
        Store.set(state, "Turn", Turn)
    },
    onDraw(_, { state }) {
        Store.set(state, "Game", "draw")
    },
    onVictory({ line }, world) {
        Store.set(world.state, "Game", "victory")
        world.spawn({
            Line: line,
            View: "Strikethrough"
        })
    },
    onRequestRematch(_, { channel }) {
        channel.send("RequestRematch")
    },
    onRematchRequested(_, { channel }) {

    }
}

export const gameLoopSystemServer: System<"server"> = {
    onStart({ Turn }, world) {
        const { entities, state, players } = world

        for (const entity of entities) {
            world.despawn(entity)
        }
        
        for (let place = 1; place <= 9; place++) {
            const unmarkedSquare: Entity<"Place" | "Sync"> = {
                Place: place as Place,
                Sync: { id: `square${place}` }
            }
            world.spawn(unmarkedSquare)
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

        Store.set(state, "Turn", Turn)

        world.channel.send("Start", { Turn })
    },
    onRequestRematch(data, world) {
        const requestingPlayer = Player.get(data)
        if (!requestingPlayer) return Player.notFound("RequestRematch", data)
        requestingPlayer.state = "rematching"
        if (world.players.size === 2 && world.players.values().every(p => p.state === "rematching")) {
            return world.update("Start", { Turn: Math.random() < 0.5 ? "X" : "O" })
        }
        for (const player of world.players) {
            if (player === requestingPlayer) continue
            player.send("RematchRequested")
        }
    }
}

export const colorSystemClient: System<"client"> = {
    onColorsUpdated(_, { channel }) {
        const { body, documentElement } = document
        const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
        const switched = body.hasAttribute("data-switch-color-scheme")
        const dark = Boolean(Number(prefersDark) ^ Number(switched))
        
        const _hue = parseInt(documentElement.style.getPropertyValue("--base-hue"))
        const hue = Number.isFinite(_hue) ? _hue : 0
        
        channel.send("UpdateColors", { hue, dark })
    },
    onUpdateColors(update) {
        const { body, documentElement } = document
        if (update.dark !== undefined) {
            const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
            const switched = body.hasAttribute("data-switch-color-scheme")
            const alreadyDark = Boolean(Number(prefersDark) ^ Number(switched))
            const toggle = Boolean(Number(alreadyDark) ^ Number(update.dark))
            if (toggle) body.toggleAttribute("data-switch-color-scheme")
        }
        if (update.hue !== undefined) {
            documentElement.style.setProperty("--base-hue", String(update.hue))
        }
    },
}

export const colorSystemServer: System<"server"> = {
    onUpdateColors(color, { channel }) {
        channel.send("UpdateColors", color)
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

export const syncSystemServer: System<"server"> = {
    onSpawn(entity, world) {
        const { Sync } = entity
        if (Sync !== undefined) {
            const alreadyNetworked = world.entities.values().some(e => e.Sync?.id === Sync.id)
            if (alreadyNetworked) {
                return console.error(new Error("A networked entity is being spawned with an ID that's already used by another entity in the world.", { cause: entity }))
            }
            // server announces all mutations done to networked entities to all connected players
            Store.listen(entity, () => world.channel.send("Sync", entity as Entity<"Sync">))
        }
    }
}

export const connectionSystemClient: System<"client"> = {
    onConnected(_, world) {
        const { state } = world
        Store.set(state, "Connection", "connected")
        const url = new URL(location.href)
        const [ segment1, segment2 ] = url.pathname.split("/").filter(Boolean)
        if (segment1 === "world" && typeof segment2 === "string") {
            Store.set(state, "Connection", "waiting")
            world.update("JoinWorld", {
                world: segment2,
                reconnectId: sessionStorage.getItem(`reconnectId:${segment2}`) ?? undefined
            })
        }
    },
    onNewWorld(_, world) {
        world.channel.send("NewWorld")
    },
    onJoinWorld(data, world) {
        world.channel.send("JoinWorld", data)
    },
    onJoinedWorld(data, { state }) {
        if ("id" in data.reconnect) {            
            sessionStorage.setItem(`reconnectId:${data.world}`, data.reconnect.id)
        } 
        Store.set(state, "Connection", "waiting")
        history.replaceState(null, "", `/world/${data.world}`)
    },
    onWorldNotFound(data, world) {
        alert(`World '${data.world.replace("-", " ")}' does not exist. The game may have ended, or all the player may have left.`)
        history.replaceState(null, "", `/`)
        Store.set(world.state, "Connection", "connected")
    },
    onWorldOccupied(data, world) {
        alert(`World '${data.world.replace("-", " ")}' already has enough players.`)
        history.replaceState(null, "", `/`)
        Store.set(world.state, "Connection", "connected")
    },
    onAssign({ sign }, world) {
        world.state.Sign = sign
    }
}

export const connectionSystemServer: System<"server"> = {
    onAddPlayer({ player, reconnectId }, world) {
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
            if (world.players.size === 2) {
                let allPlayersReady = true
                for (const player of world.players) {
                    if (player.state !== "connected") allPlayersReady = false
                }
                /** Start the game while randomly give the first turn to a player */
                if (allPlayersReady) world.update("Start", { Turn: Math.random() < 0.5 ? "X" : "O" })
            }
            /** subscribe the world to the message being sent by the player */
            player.subscribe(world)
        } else {
            player.send("WorldOccupied", { world: world.name })
        }
    },
    onDisconnected({ player }, world) {
        world.players.delete(player)
        world.disconnectedPlayers.add(player)
        player.unsubscribe(world)
    }
}

export type System<RunsOn extends "server" | "client" | "both" = "both"> = {
    [M in `on${keyof MessageRegistry}`]?: (
        data: MessageRegistry[RemoveOn<M>],
        world:
            RunsOn extends "server" ? ServerWorld :
            RunsOn extends "client" ? ClientWorld :
            ClientWorld | ServerWorld
    ) => unknown
}

type RemoveOn<S extends string> =
    S extends `on${infer T}` ? T : S
