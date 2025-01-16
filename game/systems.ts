import { metadata } from "lib/metadata.ts"
import { get, set } from "lib/indexed-kv.ts"
import type { MessageRegistry, Messages, UpdateColors, PlayerProfile } from "game/messages.d.ts"
import type { Line, SquarePosition } from "game/board.d.ts"
import type { ClientWorld } from "game/world.client.ts"
import type { ServerWorld } from "game/world.server.ts"
import { Player } from "game/player.ts"
import * as Animal from "game/animals.ts"
import faviconXO from "assets/xo.svg?url"
import faviconX from "assets/x.svg?url"
import faviconO from "assets/o.svg?url"
import confettiPop from "assets/confetti pop.webm"
import childrenCheering from "assets/children cheering.webm"

export const markerSystemClient: System<"client"> = {
    onMark(marked, world) {
        const { place } = marked
        const { channel, state } = world

        if (
            state.connected !== "togame" ||
            state.game.state !== "active" ||
            state.game.turn !== state.player.sign
        ) {
            return
        }
        const { board } = state

        const currentlyUnmarked = board[place - 1] === null

        if (currentlyUnmarked) {
            board[place - 1] = state.game.turn
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

        const { board } = world.state

        const currentlyUnmarked = board[place - 1] === null

        if (currentlyUnmarked) {
            board[place - 1] = player.state.sign
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
        const { state } = world
        
        const board =
            world.server && world.state.connection === "ingame" ? world.state.board :
            world.client && world.state.connected === "togame" ? world.state.board : null

        if (board === null) return

        const markedWithX = new Array<SquarePosition>
        const markedWithO = new Array<SquarePosition>

        let markedPlaces = 0

        for (let place = 1; place <=9; place++) {
            const marked = board[place - 1]
            if (marked !== null) {
                if (marked === "X") markedWithX.push(place as SquarePosition)
                if (marked === "O") markedWithO.push(place as SquarePosition)
                if (marked !== undefined) markedPlaces++
            }
        }

        for (const line of lines) {
            let winningSign: "X" | "O" | undefined = undefined
            if (makesLine(line, markedWithX)) winningSign = "X"
            if (makesLine(line, markedWithO)) winningSign = "O"
            if (winningSign !== undefined) {
                if (world.server) {
                    return world.channel.send("Victory", { winningSign, line })
                } else {
                    return world.update("Victory", { winningSign, line })
                }
            }
        }

        if (markedPlaces === 9) {
            if (world.server) world.channel.send("Draw")
            else world.update("Draw")
        }
    }
}

function makesLine(line: Line, board: Array<SquarePosition>) {
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
        }
    }
}

export const gameLoopSystemClient: System<"client"> = {
    onStart({ opponent, sign, turn }, world) {
        const { state } = world

        if (
            state.connected !== "toworld" &&
            state.connected !== "togame"
        ) {
            return
        }

        world.state = {
            connected: "togame",
            world: state.world,
            board: [ null, null, null, null, null, null, null, null, null ],
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
    onVictory({ line, winningSign }, world) {
        const { state } = world
        if (
            state.connected !== "togame" ||
            state.game.state !== "active"
        ) {
            return
        }
        state.game = {
            state: "victory",
            winningSign,
            line
        }
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
        const { players } = world

        const signs: ("X" | "O")[] = Math.random() < 0.5 ? ["X", "O"] : ["O", "X"]
        const firstTurn = Math.random() < 0.5 ? "X" : "O"
        world.state = {
            connection: "ingame",
            board: [ null, null, null, null, null, null, null, null, null ],
            turn: firstTurn
        }

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

        if (players.size === 2 && Array.from(players).every(p => p.state.connection === "inworld")) {
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
    onSync({ board, turn }, { state }) {
        if (state.connected !== "togame") return
        if (board) {
            state.board = board
        }
        if (turn && state.game.state === "active") {
            state.game.turn = turn
        }
    }
}

export const syncSystemServer: System<"server"> = {
    onMark(_, world) {
        if (world.state.connection === "ingame") {
            world.channel.send("Sync", {
                board: world.state.board,
                turn: world.state.turn
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
            world.update("JoinWorld", { world: segment2 })
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
    onAddPlayer({ player }, world) {
        const { players, name } = world
        if (players.has(player)) return

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
                }
            })
            if (players.size === 2 && Array.from(players).every(p => p.state.connection === "inworld")) {
                world.update("Ready")
            }
            /** subscribe the world to the message being sent by the player */
            player.subscribe(world)
        } else {
            player.send("WorldOccupied", { world: name })
        }
    },
    onDisconnected({ player }: { player?: Player }, world: ServerWorld) {
        if (player && player.state.connection === "ingame") {
            world.players.delete(player)
            world.channel.send("Disconnected", { player })
        }
    }
}

export const profileSystemClient: System<"client"> = {
    async onConnected(_, world) {
        const [ name, animal ] = await get("player.name", "player.animal")
        
        if ((name === undefined || typeof name === "string") && typeof animal === "string") {
            const update: PlayerProfile = { name, animal }
            world.update("PlayerProfile", update)
            world.channel.send("PlayerProfile", update)
        }
    },
    async onPlayerProfile(update, world) {
        if (update.name !== undefined) {
            await set("player.name", update.name)
        }
        if (update.animal !== undefined) {
            await set("player.animal", update.animal)
        }
        const { state } = world
        if (state.connected === "togame") {
            state.player.name = update.name
            state.player.animal = Animal.list.find(a => a.emoji === update.animal)!
            world.channel.send("PlayerProfile", update)
        }
    },
    onOpponentProfile(opponent, world) {
        const { state } = world
        if (state.connected === "togame") {
            state.opponent.name = opponent.name
            state.opponent.animal = Animal.list.find(a => a.emoji === opponent.animal)!
        }
    }
}

export const profileSystemServer: System<"server"> = {
    onAddPlayer({ player }, world) {
        const profile = playerProfiles.get(world)?.get(player.id)
        if (profile !== undefined) {
            player.send("PlayerProfile", profile)
        }
    },
    onPlayerProfile(profile, world) {
        const player = Player.get(profile)
        if (!player) return Player.notFound("PlayerProfile", profile)

        let profiles = playerProfiles.get(world)
        if (!profiles) {
            profiles = new Map()
            playerProfiles.set(world, profiles)
        }
        profiles.set(player.id, profile)

        // Broadcast to other players only
        for (const otherPlayer of world.players) {
            if (otherPlayer !== player) {
                otherPlayer.send("OpponentProfile", profile)
            }
        }
    }
}

const playerProfiles = metadata<Map<string, PlayerProfile>>()

export const faviconSystemClient: System<"client"> = {
    onSwitch({ to }, { state }) {
        const src =
            to === "X" ? faviconX :
            to === "O" ? faviconO :
            state.connected === "togame" && state.game.state === "active"
                ? state.game.turn === "X"
                    ? faviconO
                    : faviconX
            : faviconXO
        document.head.querySelector("link[rel=icon]")!.setAttribute("href", src)
    }
}

export const soundSystemClient: System<"client"> = {
    onVictory(_) {
        playAudio(confettiPop)
        .then(() =>
            playAudio(childrenCheering, { volume: 0.05, delay: 1000 })
        )
    }
}

/**
 * The systems may be called twice: first, optimistically by the local
 * world; and then, finally by the host world. To avoid playing overlapping
 * sound effects, we throttle each audio to run at most once in 5 seconds.
 */
const lastPlayedMap = new Map<string, number>()

async function playAudio(src: string, { volume, delay }: { volume?: number, delay?: number } = {}) {
    const now = Date.now()
    const lastPlayed = lastPlayedMap.get(src)

    if (lastPlayed === undefined || now - lastPlayed > 5000) {
        lastPlayedMap.set(src, now)
        /**
         * Fetching the audio file (from disk cache),
         * may be take non-negligible amount of time.
         * And then decoding it is an async operation
         * too.
         * 
         * If there's a delay, it is adjusted to include
         * this preparation time.
         */
        const delayAdjustmentStart = Date.now()
        const audioContext = new AudioContext
        const audioBufferSourceNode = audioContext.createBufferSource()
        const response = await fetch(src)
        audioBufferSourceNode.buffer = await audioContext.decodeAudioData(await response.arrayBuffer())
        if (volume !== undefined) {
            const gainNode = audioContext.createGain()
            gainNode.gain.value = volume
            audioBufferSourceNode.connect(gainNode).connect(audioContext.destination)
        } else {
            audioBufferSourceNode.connect(audioContext.destination)
        }
        const 
        delayAdjustment = Date.now() - delayAdjustmentStart
        const adjustedDelay = delay ?? 0 - delayAdjustment
        if (adjustedDelay > 0) await new Promise(resolve => setTimeout(resolve, delay))
        audioBufferSourceNode.start(0)
    }
}

export type System<RunsOn extends "server" | "client" | "both" = "both"> = {
    [M in `on${Messages}`]?: (
        data: MessageRegistry[RemoveOn<M>],
        world:
            RunsOn extends "server" ? ServerWorld :
            RunsOn extends "client" ? ClientWorld :
            ClientWorld | ServerWorld
    ) => unknown
}
type RemoveOn<S extends string> =
    S extends `on${infer T}` ? T : S
