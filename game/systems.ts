import { effect } from "@preact/signals-core"
import { metadata } from "lib/metadata.ts"
import { get, set } from "lib/indexed-kv.ts"
import type { MessageRegistry, UpdateColors } from "game/messages.d.ts"
import type { Entity, Line, Place } from "game/entity.d.ts"
import type { ClientWorld } from "game/world.client.ts"
import type { ServerWorld } from "game/world.server.ts"
import { Player } from "game/player.ts"
import * as Animal from "game/animals.ts"

export const markerSystemClient: System<"client"> = {
    onMark(marked, world) {
        const { place } = marked
        const { channel, entities, state } = world

        if (
            state.connected !== "togame" ||
            state.game.state !== "active" ||
            state.game.turn !== state.player.sign
        ) {
            return
        }

        const unmarkedSquare = entities.values().find(
            e => e.Place === place && e.Marked === undefined
        )

        if (unmarkedSquare) {
            unmarkedSquare.Marked = state.game.turn
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
            player.state.sign !== world.state.turn
        ) {
            return
        }

        const unmarkedSquare = world.entities.values().find(
            e => e.Place === place && e.Marked === undefined
        )

        if (unmarkedSquare) {
            unmarkedSquare.Marked = player.state.sign
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
                if (world.server) {
                    return world.channel.send("Victory", { winner, line })
                } else {
                    return world.update("Victory", { winner, line })
                }
            }
        }

        if (markedPlaces === 9) {
            if (world.server) world.channel.send("Draw")
            else world.update("Draw")
        }
    }
}

function makesLine(line: Line, board: Array<Place>) {
    if (board.includes(line[0]) && board.includes(line[1]) && board.includes(line[2])) return true
    return false
}

export const turnSystemClient: System<"client"> = {
    onSwitch(data, world) {
        const { state } = world
        if (
            state.connected !== "togame" ||
            state.game.state !== "active"
        ) {
            return
        }
        const turn = data.to ?? (state.game.turn === "X" ? "O" : "X")
        state.game.turn = turn
    }
}

export const turnSystemServer: System<"server"> = {
    onSwitch(data, world) {
        if (world.state.connection === "ingame") {
            const to = data.to ?? world.state.turn === "X" ? "O" : "X"
            world.state = {
                ...world.state,
                turn: to
            }
            world.channel.send("Switch", { to })
        }
    }
}

export const gameLoopSystemClient: System<"client"> = {
    onStart({ opponent, sign, turn }, world) {
        const { entities, state } = world

        if (
            state.connected !== "toworld" &&
            state.connected !== "togame"
        ) {
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

        world.state = {
            ...state,
            connected: "togame",
            game: {
                state: "active",
                turn,
            },
            player: {
                ...state.player,
                sign
            },
            opponent
        }
    },
    onDraw(_, { state }) {
        if (
            state.connected !== "togame" ||
            state.game.state !== "active"
        ) {
            return
        }
        state.game = { state: "draw" }
    },
    onVictory({ line }, world) {
        const { state } = world
        if (
            state.connected !== "togame" ||
            state.game.state !== "active"
        ) {
            return
        }
        state.game = {
            state: "victory",
            winner: state.game.turn
        }
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

        const signs: ("X" | "O")[] = Math.random() < 0.5 ? ["X", "O"] : ["O", "X"]
        const firstTurn = Math.random() < 0.5 ? "X" : "O"
        world.state = { connection: "ingame", turn: firstTurn }

        const participatingPlayers: [Player, Animal.Type, "X" | "O"][] = []

        for (const player of players) {
            if (player.state.connection === "inworld") {
                const animal = player.state.animal
                const sign = signs.pop()!
                participatingPlayers.push([player, animal, sign])
            }
        }

        if (participatingPlayers.length === 2) {

            const [
                [player1, animal1, sign1],
                [player2, animal2, sign2]
            ] = participatingPlayers

            player1.state = { connection: "ingame", animal: animal1, sign: sign1 }
            player2.state = { connection: "ingame", animal: animal2, sign: sign2 }

            player1.send("Start", {
                turn: firstTurn,
                sign: sign1,
                opponent: { animal: animal2, sign: sign2 }
            })
            player2.send("Start", {
                turn: firstTurn,
                sign: sign2,
                opponent: { animal: animal1, sign: sign1 }
            })
        }
    },
    onRequestRematch(data, world) {
        const { players } = world
        const requestingPlayer = Player.get(data)
        if (requestingPlayer === undefined) return Player.notFound("RequestRematch", data)
        if (requestingPlayer.state.connection !== "ingame") return

        requestingPlayer.state = {
            ...requestingPlayer.state,
            connection: "inworld"
        }

        if (players.size === 2 && players.values().every(p => p.state.connection === "inworld")) {
            return world.update("Ready")
        }
        for (const player of players) {
            if (player === requestingPlayer) continue
            player.send("RematchRequested")
        }
    }
}

export const colorSystemClient: System<"client"> = {
    async onConnected(_, world) {
        const [_scheme, _hue] = await get("color.scheme", "color.hue")
        if (_scheme !== undefined || _hue !== undefined) {
            const scheme =
                _scheme === "dark" ? "dark" :
                    _scheme === "light" ? "light" :
                        undefined
            const hue = typeof _hue === "number" ? _hue : undefined
            world.update("UpdateColors", { hue, scheme })
            world.channel.send("UpdateColors", { hue, scheme })
        }
    },
    async onSyncColors(_, { channel }) {
        const [scheme, hue] = await get("color.scheme", "color.hue")
        if (
            (scheme === undefined || scheme === "light" || scheme === "dark") &&
            (hue === undefined || typeof hue === "number")
        ) {
            channel.send("UpdateColors", { hue, scheme })
        }
    },
    async onUpdateColors(update) {
        const { documentElement } = document
        if (update.scheme !== undefined) {
            let { scheme } = update
            if (scheme === "switch") {
                const _scheme = await get("color.scheme")
                if (_scheme === "light") scheme = "dark"
                else if (_scheme === "dark") scheme = "light"
                else if (matchMedia("(prefers-color-scheme: dark)").matches) scheme = "light"
                else scheme = "dark"
            }
            documentElement.toggleAttribute("data-dark", scheme === "dark")
            documentElement.toggleAttribute("data-light", scheme === "light")
            await set("color.scheme", scheme)
        }
        if (update.hue !== undefined) {
            documentElement.style.setProperty("--base-hue", String(update.hue))
            await set("color.hue", update.hue)
        }
    }
}

const colors = metadata<UpdateColors>()

export const colorSystemServer: System<"server"> = {
    onAddPlayer({ player }, world) {
        const UpdateColors = colors.get(world)
        if (UpdateColors !== undefined) {
            player.send("UpdateColors", UpdateColors)
        }
    },
    onUpdateColors(color, world) {
        colors.set(world, color)
        world.channel.send("UpdateColors", color)
    }
}

export const syncSystemClient: System<"client"> = {
    onSync(updatedEntity, world) {
        const { Sync: { id } } = updatedEntity
        const entity = world.entities.values().find(e => e.Sync?.id === id)
        if (entity) {
            for (const key of Object.keys(updatedEntity).concat(Object.keys(entity))) {
                // View is a client only state, preserve it during sync
                if (key === "View") continue
                /** @ts-expect-error */
                entity[key] = updatedEntity[key]
            }
        } else {
            console.warn(
                new Error(
                    "Server sent Sync message for an entity that does not exist in the client world.",
                    { cause: updatedEntity }
                )
            )
        }
    }
}

export const syncSystemServer: System<"server"> = {
    onSpawn(entity, world) {
        const { Sync } = entity
        if (Sync !== undefined) {
            const alreadyNetworked = world.entities.values().some(e => e.Sync?.id === Sync.id)
            if (alreadyNetworked) {
                return console.warn(new Error("A networked entity is being spawned with an ID that's already used by another entity in the world.", { cause: entity }))
            }
            // server announces all mutations done to networked entities to all connected players
            effect(() => {
                const ent = { ...entity, Sync }
                if (world.state.connection === "ingame") {
                    world.channel.send("Sync", ent)
                }
            })
        }
    }
}

export const connectionSystemClient: System<"client"> = {
    onConnected(_, world) {
        const url = new URL(location.href)
        const [segment1, segment2] = url.pathname.split("/").filter(Boolean)
        if (segment1 === "world" && typeof segment2 === "string") {
            world.state = {
                connected: "connectingtoworld",
                world: { name: segment2 }
            }
            world.update("JoinWorld", {
                world: segment2,
                reconnectId: sessionStorage.getItem(`reconnectId:${segment2}`) ?? undefined
            })
        } else {
            world.state = {
                connected: "tolobby"
            }
        }
    },
    onDisconnected(_, world) {
        world.state = { connected: "disconnected" }
    },
    onNewWorld(_, world) {
        world.channel.send("NewWorld")
    },
    onJoinWorld(data, world) {
        world.channel.send("JoinWorld", data)
    },
    onJoinedWorld(data, world) {
        if ("id" in data.reconnect) {
            sessionStorage.setItem(`reconnectId:${data.world}`, data.reconnect.id)
        }
        world.state = {
            connected: "toworld",
            world: { name: data.world },
            player: data.player
        }
        history.pushState(null, "", `/world/${data.world}`)
    },
    onWorldNotFound(data) {
        alert(`A game with the code '${data.world.replace("-", " ")}' does not exist. It may have ended, or all the players may have left.`)
        location.href = "/"
    },
    onWorldOccupied(data) {
        alert(`The game with the code '${data.world.replace("-", " ")}' already has enough players.`)
        location.href = "/"
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
                player.state = { connection: "connected" }
                disconnectedPlayers.delete(dplayer)
            }
        }
        if (player.state.connection !== "connected") {
            return
        }
        if (players.size < 2) {
            players.add(player)
            player.state = {
                connection: "inworld",
                animal: Animal.random()
            }
            player.send("JoinedWorld", {
                world: name,
                player: {
                    name: player.state.name,
                    animal: player.state.animal
                },
                reconnect: { id: player.id },
            })
            if (players.size === 2 && players.values().every(p => p.state.connection === "inworld")) {
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
