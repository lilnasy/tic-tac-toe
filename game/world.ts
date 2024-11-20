import type { Data, MessageRegistry } from "game/messages.ts"
import type { Entity } from "game/entity.ts"
import type { Channel } from "game/channel.ts"
import type { System } from "game/systems.ts"

export interface World {
    channel: Channel
    entities: Set<Entity>
    systems: System<"client" | "server" | "both">[]
    update: typeof update
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
