import type { MessageRegistry } from "game/messages.d.ts"

/**
 * Channel provides a type-safe way of communication between the server and the clients.
 * 
 * The implementation includes a `send()` function to send message to the other side, and
 * a `subscribe()` function which registers a `Receiver` which will be sent all the
 * messages from the other side.
 */
export interface Channel {
    send<Message extends Messages>(message: Message, data: MessageRegistry[Message]): unknown
    subscribe(receiver: Receiver): unknown
    unsubscribe(receiver: Receiver): unknown
}

export interface Receiver {
    receive<Message extends Messages>(message: Message, data: MessageRegistry[Message]): unknown
}
