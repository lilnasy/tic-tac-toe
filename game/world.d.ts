import type { Data, Messages } from "game/messages.d.ts"
import type { Entity } from "game/entity.d.ts"
import type { Channel } from "game/channel.d.ts"
import type { System } from "game/systems.ts"

export interface World {
    channel: Channel
    entities: Set<Entity>
    systems: System<"client" | "server" | "both">[]
    update<Message extends Messages>(
        message: Message,
        ...data: Data<Message>
    ): unknown
}
