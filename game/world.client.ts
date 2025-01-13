import { createMutable, store } from "lib/mutable-store.ts"
import type { Channel, Receiver } from "game/channel.d.ts"
import type { Data, Messages } from "game/messages.d.ts"
import type { PlayerData } from "game/player.ts"
import type { Board, Line } from "game/board.d.ts"
import type { World } from "game/world.d.ts"
import { type System, colorSystemClient, connectionSystemClient, faviconSystemClient, gameLoopSystemClient, lineCheckSystem, markerSystemClient, soundSystemClient, syncSystemClient, turnSystemClient } from "game/systems.ts"

export class ClientWorld implements World, Receiver {

    readonly server = false
    readonly client = true

    channel: ClientToServerChannel
    systems: System<"both" | "client">[] = [
        connectionSystemClient,
        gameLoopSystemClient,
        markerSystemClient,
        lineCheckSystem,
        turnSystemClient,
        syncSystemClient,
        colorSystemClient,
        faviconSystemClient,
        soundSystemClient
    ]

    @store accessor state: ClientWorldState = { connected: "connecting" }

    constructor(websocket: WebSocket) {
        const channel = this.channel = new ClientToServerChannel(websocket)
        channel.subscribe(this)
    }

    static connect() {
        const url = new URL(location.href)
        url.protocol = url.protocol.replace("http", "ws")
        url.pathname = "/connect"
        if (import.meta.env.DEV) {
            return ((globalThis as any).world as ClientWorld) ??= new ClientWorld(new WebSocket(url))
        } else {
            return new ClientWorld(new WebSocket(url))
        }
    }

    async update<Message extends Messages>(
        message: Message,
        ..._data: Data<Message>
    ) {
        const [ data = {} ] = _data
        for (const system of this.systems) {
            await system[`on${message}`]?.(data as any, this)
        }
    }

    /*
     * The client can be trusting of the server.
     * Send all received events directly to all systems using `update()`.
     */
    receive = this.update
}

export type ClientWorldState =
    /**
     * The client is waiting for the connection to the server to be established.
     */
    | { connected: "connecting" }
    /**
     * The player may create a new world, or join one while in the lobby.
     */
    | { connected: "tolobby" }
    /**
     * Waiting for the server response when joining through a shared link.
     */
    | { connected: "connectingtoworld", world: WorldData }
    /**
     * A new world has been created, and the player is waiting for an opponent to join.
     */
    | { connected: "toworld", world: WorldData, player: PlayerData }
    /**
     * The game is on, ready to send and receive moves.
     */
    | { connected: "togame", world: WorldData, board: Board, player: PlayerData.WithSign, game: GameState, opponent: PlayerData.WithSign }
    | { connected: "disconnected" }

type GameState =
    | { state: "active", turn: XO }
    | { state: "draw" }
    | { state: "victory", winningSign: XO, line: Line }

export interface WorldData {
    name: string
}

type XO = "X" | "O"

/**
 * Randomly simulates bad or good latency by delaying the delivery of received messages.
 * Bad latency sometimes results in lack of visual feedback, can be fixed by loading states.
 * Good latency can make transitions appear flashy, can be fixed by artificial delays.
 */
function simulateLatency(receiver: Receiver, ...args: Parameters<Receiver["receive"]>) {
    queue.push([receiver, args])
    setTimeout(dequeue, Math.random() < 0.5 ? 1000 : 150)
}

const queue = new Array<[Receiver, Parameters<Receiver["receive"]>]>()

function dequeue() {
    for (const [receiver, args] of queue) {
        receiver.receive(...args)
    }
    queue.length = 0
}

class ClientToServerChannel implements Channel {
    
    constructor(readonly websocket: WebSocket) {
        if (websocket.readyState === WebSocket.OPEN) queueMicrotask(() => this.handleEvent(new Event("open")))
        else websocket.addEventListener("open", this, { once: true })
        websocket.addEventListener("message", this)
        websocket.addEventListener("close", this, { once: true })
    }
    
    send<Message extends Messages>(message: Message, ..._data: Data<Message>) {
        const [ data = {} ] = _data
        const { websocket } = this
        if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ [message]: data }))
        } else if (websocket.readyState === WebSocket.CONNECTING) {
            websocket.addEventListener(
                "open",
                e => (e.target as WebSocket).send(JSON.stringify({ [message]: data })),
                { once: true }
            )
        } else {
            console.error(new Error(`Could not send the ${message} message to the server because the connection is in an unexpected readyState: ${readableReadyState(websocket.readyState)}`, { cause: websocket }))
        }
    }
    
    #receivers = new Set<Receiver>
    
    subscribe(receiver: Receiver) {
        this.#receivers.add(receiver)
    }
    
    unsubscribe(receiver: Receiver) {
        return this.#receivers.delete(receiver)
    }
    
    handleEvent(event: Event) {
        if (event.type === "open") {
            for (const receiver of this.#receivers) {
                receiver.receive("Connected", {})
            }
        } else if (event.type === "close") {
            this.websocket.removeEventListener("message", this)
            for (const receiver of this.#receivers) {
                receiver.receive("Disconnected", {})
            }
        } else if (event.type === "message" && "data" in event && typeof event.data === "string") {
            const messageAndData = JSON.parse(event.data)
            for (const message in messageAndData) {
                const data = messageAndData[message]
                for (const receiver of this.#receivers) {
                    if (import.meta.env.DEV) {
                        simulateLatency(receiver, message as Messages, data)
                    } else {
                        receiver.receive(message as Messages, data)
                    }
                }
            } 
        }
    }
}

function readableReadyState(readyState: WebSocket["readyState"]) {
    if (readyState === WebSocket.CONNECTING) return "CONNECTING"
    if (readyState === WebSocket.OPEN) return "OPEN"
    if (readyState === WebSocket.CLOSING) return "CLOSING"
    if (readyState === WebSocket.CLOSED) return "CLOSED"
}