import type { MessageRegistry } from "game/messages.ts"
import type { Entity, Line, Place } from "game/entity.ts"
import type { ClientWorld } from "game/world.client.ts"
import type { ServerWorld } from "game/world.server.ts"
import { Store } from "game/store.ts"
import { isServer } from "game/client-server.ts"
import { Player, type PlayerData } from "game/player.ts"
import * as Animal from "game/animals.ts"

export const markerSystemClient: System<"client"> = {
    onMark(marked, world) {
        const { place } = marked
        const { channel, entities, state } = world
        
        if (
            state.connection !== "ingame" ||
            state.game.state !== "active" ||
            state.game.turn !== state.game.player.sign
        ) {
            return
        }
        
        const unmarkedSquare = entities.values().find(
            e => e.Place === place && e.Marked === undefined
        )
        
        if (unmarkedSquare) {
            Store.set(unmarkedSquare, "Marked", state.game.turn)
            channel.send("Mark", marked)
            world.update("Switch")
        }
    }
}

export const markerSystemServer: System<"server"> = {
    onMark(marked, world) {
        const player = Player.get(marked)
        if (!player) return Player.notFound("Mark", marked)

        const { place } = marked

        if (
            player.state.connection !== "ingame" ||
            world.state.connection !== "ingame" ||
            player.state.data.sign !== world.state.turn
        ) {
            return
        }

        const unmarkedSquare = world.entities.values().find(
            e => e.Place === place && e.Marked === undefined
        )

        if (unmarkedSquare) {
            Store.set(unmarkedSquare, "Marked", player.state.data.sign)
            return world.update("Switch")
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

export const turnSystemClient: System<"client"> = {
    onSwitch(data, { state }) {
        if (state.connection === "ingame" && state.game.state === "active") {
            const turn = data.to ?? (state.game.turn === "X" ? "O" : "X")
            Store.assign(state, { ...state, game: { ...state.game, turn } })
        }
    }
}

export const turnSystemServer: System<"server"> = {
    onSwitch(data, { channel, state }) {
        if (state.connection === "ingame") {
            const to = data.to ?? state.turn === "X" ? "O" : "X"
            Store.assign(state, { ...state, turn: to })
            channel.send("Switch", { to })
        }
    }
}

export const gameLoopSystemClient: System<"client"> = {
    onStart({ player, turn }, world) {
        const { entities, state } = world
        if (state.connection !== "ingame" || state.game.state !== "waiting") {
            return
        }
        
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
        Store.assign(state, {
            connection: "ingame",
            game: {
                ...state.game,
                state: "active",
                player,
                turn,
            }
        })
    },
    onDraw(_, { state }) {
        if (state.connection !== "ingame" || state.game.state !== "active") {
            return
        }
        Store.assign(state, {
            connection: "ingame",
            game: {
                ...state.game,
                state: "draw",
            }
        })
    },
    onVictory({ line }, world) {
        const { state } = world
        if (state.connection !== "ingame" || state.game.state !== "active") {
            return
        }
        Store.assign(world.state, {
            connection: "ingame",
            game: {
                ...state.game,
                state: "victory",
                winner: state.game.turn
            }
        })
        world.spawn({
            Line: line,
            View: "Strikethrough"
        })
    },
    onRequestRematch(_, { channel }) {
        channel.send("RequestRematch")
    },
    onRematchRequested(_, { channel }) {
        // channel.send("RequestRematch")
    }
}

export const gameLoopSystemServer: System<"server"> = {
    onReady(_, world) {
        const { entities, players } = world

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
        
        const signs: ("X" | "O")[] = Math.random() < 0.5 ? [ "X", "O" ] : [ "O", "X" ]
        const firstTurn = Math.random() < 0.5 ? "X" : "O"
        Store.assign(world.state, { connection: "ingame", turn: firstTurn })

        for (const player of players) {
            if (
                player.state.connection === "connected" ||
                player.state.connection === "rematching"
            ) {
                const data: PlayerData = {
                    animal: Animal.random(),
                    sign: signs.pop()!
                }
                player.state = { connection: "ingame", data }
                player.send("Start", { player: data, turn: firstTurn })
            }
        }
    },
    onRequestRematch(data, world) {
        const { players } = world
        const requestingPlayer = Player.get(data)
        if (requestingPlayer === undefined) return Player.notFound("RequestRematch", data)
        if (requestingPlayer.state.connection !== "ingame") return
        requestingPlayer.state = { connection: "rematching", data: requestingPlayer.state.data }
        if (players.size === 2 && players.values().every(p => p.state.connection === "rematching")) {
            return world.update("Ready")
        }
        for (const player of players) {
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
        const entity = world.entities.values().find(e => e.Sync?.id === id)
        if (entity) Store.assign(entity, updatedEntity)
        else console.error(new Error("Server sent Sync message for an entity that does not exist in the client world.", { cause: updatedEntity }))
    }
}

export const syncSystemServer: System<"server"> = {
    onSpawn(entity, { channel, entities }) {
        const { Sync } = entity
        if (Sync !== undefined) {
            const alreadyNetworked = entities.values().some(e => e.Sync?.id === Sync.id)
            if (alreadyNetworked) {
                return console.error(new Error("A networked entity is being spawned with an ID that's already used by another entity in the world.", { cause: entity }))
            }
            // server announces all mutations done to networked entities to all connected players
            Store.listen(entity, () => channel.send("Sync", entity as Entity<"Sync">))
        }
    }
}

function onPopState(event: PopStateEvent) {
    if (event.state === null) location.reload()
}

export const connectionSystemClient: System<"client"> = {
    onConnected(_, world) {
        Store.assign(world.state, {
            connection: "ingame",
            game: { state: "inlobby" }
        })
        const url = new URL(location.href)
        const [ segment1, segment2 ] = url.pathname.split("/").filter(Boolean)
        if (segment1 === "world" && typeof segment2 === "string") {
            Store.assign(world.state, { connection: "connecting" })
            world.update("JoinWorld", {
                world: segment2,
                reconnectId: sessionStorage.getItem(`reconnectId:${segment2}`) ?? undefined
            })
        }
        removeEventListener("popstate", onPopState)
        addEventListener("popstate", onPopState)
    },
    onDisconnected(_, world) {
        Store.set(world.state, "connection", "disconnected")
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
        Store.assign(state, {
            connection: "ingame",
            game: {
                state: "waiting",
                world: { name: data.world }
            }
        })
        history.pushState(null, "", `/world/${data.world}`)
    },
    onWorldNotFound(data, world) {
        alert(`World '${data.world.replace("-", " ")}' does not exist. The game may have ended, or all the player may have left.`)
        history.back()
        Store.set(world.state, "connection", "ingame")
    },
    onWorldOccupied(data, world) {
        alert(`World '${data.world.replace("-", " ")}' already has enough players.`)
        history.back()
        Store.set(world.state, "connection", "ingame")
    }
}

export const connectionSystemServer: System<"server"> = {
    onAddPlayer({ player, reconnectId }, world) {
        const { players, disconnectedPlayers, name } = world
        if (players.has(player)) return
        if (reconnectId) {
            const dplayer = disconnectedPlayers.values()
                .find(p => p.id === reconnectId)
            if (dplayer !== undefined) {
                player.id = reconnectId
                player.state = dplayer.state
                disconnectedPlayers.delete(dplayer)
            }
        }
        if (players.size < 2) {
            players.add(player)
            player.send("JoinedWorld", {
                world: name,
                reconnect: { id: player.id },
            })
            if (players.size === 2 && players.values().every(p => p.state.connection === "connected")) {
                world.update("Ready")
            }
            /** subscribe the world to the message being sent by the player */
            player.subscribe(world)
        } else {
            player.send("WorldOccupied", { world: name })
        }
    },
    onDisconnected({ player }, world) {
        if (player !== undefined) {
            world.players.delete(player)
            world.disconnectedPlayers.add(player)
            player.unsubscribe(world)
        }
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
