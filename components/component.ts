import { Component as Base, createContext } from "preact"
import { listen, stop } from "game/store.ts"
import type { Entity, States } from "game/entity.ts"
import type { ClientWorld } from "game/client.ts"
import type { MessageRegistry } from "game/messages.ts"
import type { Receiver } from "game/channel.ts"

export const WorldContext = createContext<ClientWorld>(null as any)

/*
 * Optional abstract properties and methods need to be described in a
 * separate interface instead of directly in the class definition.
 * 
 * This is a limitation in TypeScript's syntax also affecting.
 */
export interface Component<P = {}, S extends keyof States = never> {
    /**
     * The entity that the component visually represents.
     * Most components have a one-to-one relationship with an entity.
     */
    entity?: Entity<S>
    /**
     * Extra entity that the component depends on reactively. The global state entity, for example.
     */
    listen?: Entity<never>
    /**
     * Components may implement this callback to receive all the events being sent by the server.
     */
    receive?<Message extends keyof MessageRegistry>(message: Message, data: MessageRegistry[Message]): unknown
}

export abstract class Component<P, S> extends Base<P> {
    static contextType = WorldContext
    world = this.context as ClientWorld

    componentDidMount() {
        if (this.entity) listen(this.entity, this)
        if (this.listen) listen(this.listen, this)
        if (this.receive !== undefined) this.world.channel.subscribe(this as Receiver)
    }
    
    componentWillUnmount() {
        if (this.entity) stop(this.entity, this)
        if (this.listen) stop(this.listen, this)
        this.world.channel.unsubscribe(this as any)
    }

    /**
     * handleEvent() is called by the entities (stores; derivatives of
     * EventTarget) that the component has been added as an event listener to.
     * 
     * On each `announce()` (called after each mutation), the entity object
     * invokes this function, which is used to redraw the component with
     * updated data from the entity.
     */
    handleEvent() {
        this.forceUpdate()
    }

    /**
     * Bypasses preact's diffing.
     * Only the entities are responsible for manually updating the view.
     */
    shouldComponentUpdate() {
        return false
    }
}
