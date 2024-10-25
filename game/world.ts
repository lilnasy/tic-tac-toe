import type { Data, MessageRegistry } from "game/messages.ts"
import { Store } from "game/store.ts"
import type { Entity, States } from "game/entity.ts"
import type { Channel } from "game/channel.ts"
import { type System, lineCheckSystem, gameLoopSystem, syncSystem, turnSystem } from "game/systems.ts"

export interface World {
    server: boolean
    client: boolean
    channel: Channel
    entities: Set<Entity>
    systems: System<"client" | "server" | "both">[]
    spawnEntity: typeof spawnEntity
    update: typeof update
}

/**
 * Systems that run both on the server and the client; mostly the main game logic.
 */
export const commonSystems: System<"both">[] = [ gameLoopSystem, lineCheckSystem, turnSystem, syncSystem ]

export function spawnEntity<State extends keyof States>(this: World, entity: Entity<State>) {
    this.entities.add(Store.create(entity))
    this.update("Spawn", entity)
    return entity
}

export function update<Message extends keyof MessageRegistry>(
    this: World,
    message: Message,
    ..._data: Data<Message>
) {
    const [ data = {} ] = _data
    for (const system of this.systems) {
        system[`on${message}`]?.(data as any, this as any)
    }
}
