import type { MessageRegistry } from "game/messages.ts"
import { Store } from "game/store.ts"
import type { Entity, States } from "game/entity.ts"
import type { Channel } from "game/channel.ts"
import { type System, lineCheckSystem, syncSystem, turnSystem, victorySystem } from "game/systems.ts"

export interface World {
    channel: Channel
    entities: Set<Entity>
    gamestate: Entity<"Turn" | "Sync">
    spawnEntity: typeof spawnEntity
    systems: System<"client" | "server" | "both">[]
    update: typeof update
}

/**
 * Systems that run both on the server and the client; mostly the main game logic.
 */
export const commonSystems: System<"both">[] = [ lineCheckSystem, turnSystem, victorySystem, syncSystem ]

export function update<Message extends keyof MessageRegistry>(this: World, message: Message, data: MessageRegistry[Message]) {
    for (const system of this.systems) {
        system[`on${message}`]?.(data as any, this as any)
    }
}

export function spawnEntity<State extends keyof States>(this: World, data: Entity<State>) {
    this.entities.add(Store.create(data))
    this.update("Spawn", data)
    return data
}
