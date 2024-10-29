import { Component as Base, createContext, type JSX } from "preact"
import type { ClientWorld } from "game/world.client.ts"
import type { Data, MessageRegistry } from "game/messages.ts"

export const WorldContext = createContext<ClientWorld>({} as any)

export abstract class Component<P = {}> extends Base<P> {
    
    static contextType = WorldContext
    
    world = this.context as ClientWorld
    
    update<Message extends keyof MessageRegistry>(message: Message, ..._data: Data<Message>): void {
        this.world.update(message, ..._data)
    }

    /**
     * handleEvent() is called by the entities (stores; derivatives of
     * EventTarget) that the component has been added as an event listener to.
     * 
     * On each `set()` (called after each mutation), the entity object
     * invokes this function, which is used to redraw the component with
     * updated data from the entity.
     */
    handleEvent(event: Event) {
        if (event.type === "update") this.forceUpdate()
    }

    /**
     * Bypasses preact's diffing.
     * Only the entities are responsible for manually updating the view.
     */
    shouldComponentUpdate() {
        return false
    }
}

export namespace Attributes {
    export interface button extends JSX.HTMLAttributes<HTMLButtonElement> {}
    export interface dialog extends JSX.HTMLAttributes<HTMLDialogElement> {}
    export interface div extends JSX.HTMLAttributes<HTMLDivElement> {}
    export interface input extends JSX.HTMLAttributes<HTMLInputElement> {}
    export interface p extends JSX.HTMLAttributes<HTMLParagraphElement> {}
    export interface svg extends JSX.SVGAttributes {}
    export namespace svg {
        export interface line extends JSX.SVGAttributes<SVGLineElement> {}
    }
}
