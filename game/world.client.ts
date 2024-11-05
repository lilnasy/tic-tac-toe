import type { Channel, Receiver } from "game/channel.ts"
import type { Entity, States } from "game/entity.ts"
import type { Data, MessageRegistry } from "game/messages.ts"
import type { PlayerData } from "game/player.ts"
import type { Component } from "components/component.ts"
import { type World, update } from "game/world.ts"
import { type System, colorSystemClient, connectionSystemClient, gameLoopSystemClient, lineCheckSystem, markerSystemClient, syncSystemClient, turnSystemClient } from "game/systems.ts"
import { Store } from "game/store.ts"

export class ClientWorld implements World, Receiver {

    server = false as const
    client = true as const

    channel: ClientToServerChannel
    entities = new Set<Entity>
    systems: System<"both" | "client">[] = [
        colorSystemClient,
        connectionSystemClient,
        gameLoopSystemClient,
        markerSystemClient,
        lineCheckSystem,
        turnSystemClient,
        syncSystemClient
    ]

    /*
     * The client can be trusting of the server.
     * Send all received events directly to all systems using `update()`.
     */
    receive = update
    update = update

    state = Store.create<WorldState>({ connection: "connecting" })

    /**
     * A reference to the EntitiesView component is provided here
     * when it renders so that the world can update it when entities
     * are spawned and despawned.
     */
    EntitiesView: Component | undefined

    constructor(websocket: WebSocket) {
        const channel = this.channel = new ClientToServerChannel(websocket)
        channel.subscribe(this)
    }

    spawn<State extends keyof States>(entity: Entity<State>) {
        const _entity = Store.create(entity)
        this.update("Spawn", _entity)
        this.entities.add(_entity)
        this.EntitiesView?.forceUpdate()
        return _entity
    }

    despawn(entity: Entity) {
        this.entities.delete(entity)
        this.EntitiesView?.forceUpdate()
    }
}

type WorldState =
    /**
     * The client is waiting for the connection to the server to be established.
     */
    | { connection : "connecting" }
    | { connection : "ingame", game: Gamestate }
    | { connection : "disconnected" }

type Gamestate =
    /**
     * The player may create a new world, or join one while in the lobby.
     */
    | { state: "inlobby" }
    /**
     * A new world has been created, and the player is waiting for an opponent to join.
     */
    | { state: "waiting", world: WorldData }
    | { state: "active",  world: WorldData, player: PlayerData, turn: XO }
    | { state: "draw",    world: WorldData, player: PlayerData }
    | { state: "victory", world: WorldData, player: PlayerData, winner: XO }

interface WorldData {
    name: string
}

type XO = "X" | "O"

class ClientToServerChannel implements Channel {
    
    constructor(readonly websocket: WebSocket) {
        if (websocket.readyState === WebSocket.OPEN) this.handleEvent(new Event("open"))
        else websocket.addEventListener("open", this, { once: true })
        websocket.addEventListener("message", this)
        websocket.addEventListener("close", this, { once: true })
    }
    
    send<Message extends keyof MessageRegistry>(message: Message, ..._data: Data<Message>) {
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
                    receiver.receive(message as keyof MessageRegistry, data)
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