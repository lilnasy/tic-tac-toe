import { Component as Base, createContext, type JSX } from "preact"
import type { ClientWorld } from "game/world.client.ts"
import type { Data, MessageRegistry } from "game/messages.ts"

export const WorldContext = createContext<ClientWorld>({} as any)

export abstract class Component<P = {}, S = {}> extends Base<P, S> {
    
    static contextType = WorldContext
    
    world = this.context as ClientWorld
    
    update<Message extends keyof MessageRegistry>(message: Message, ..._data: Data<Message>): void {
        this.world.update(message, ..._data)
    }

    /**
     * handleEvent() is called when the entities that the component
     * has used during its render() call, are updated.
     * 
     * On each `set()` (called after each mutation), the entity object
     * invokes this function, which is used to redraw the component with
     * updated data from the entity.
     */
    handleEvent(event: Event) {
        if (event.type === "update") this.forceUpdate()
    }
}

/**
 * Allow dashed HTML tags.
 * I sometimes use them instead of divs, as they are semantically the
 * same as `div` (both have no semantic meaning), but make the dom
 * legible for me in devtools.
 */
declare module "preact" {
    namespace JSX {
        interface IntrinsicElements {
            [key: `${string}-${string}`]: JSX.HTMLAttributes<HTMLElement>
        }
    }
}

/**
 * Shorthands for getting attributes for prop types.
 * Allows using `Attributes.button` instead of `JSX.HTMLAttributes<HTMLButtonElement>`.
 */
export namespace Attributes {
    export interface button extends JSX.HTMLAttributes<HTMLButtonElement> {}
    export interface dialog extends JSX.HTMLAttributes<HTMLDialogElement> {}
    export interface div extends JSX.HTMLAttributes<HTMLDivElement> {}
    export interface element extends JSX.HTMLAttributes<HTMLElement> {}
    export interface input extends JSX.HTMLAttributes<HTMLInputElement> {}
    export interface p extends JSX.HTMLAttributes<HTMLParagraphElement> {}
    export interface svg extends JSX.HTMLAttributes<SVGSVGElement> {}
    export namespace svg {
        export interface line extends JSX.SVGAttributes<SVGLineElement> {}
    }
}
