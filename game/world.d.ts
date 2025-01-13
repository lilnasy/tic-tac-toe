import type { Messages, Data } from "./messages.d.ts"
import type { Channel } from "./channel.d.ts"
import type { System } from "./systems.ts"

export interface World {    
    channel: Channel
    systems: System<"client" | "server" | "both">[]
    update<Message extends Messages>(
        message: Message,
        ...data: Data<Message>
    ): unknown
}
