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
    export interface button extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}
    export interface dialog extends JSX.HTMLAttributes<HTMLDialogElement> {}
    export interface div extends JSX.HTMLAttributes<HTMLDivElement> {}
    export interface input extends JSX.HTMLAttributes<HTMLInputElement> {}
    export interface p extends JSX.HTMLAttributes<HTMLParagraphElement> {}
    export interface svg extends JSX.HTMLAttributes<SVGSVGElement> {}
    export namespace svg {
        export interface line extends JSX.SVGAttributes<SVGLineElement> {}
    }
}

export interface Attributes extends JSX.HTMLAttributes<HTMLElement> {}

export namespace Events {
    export namespace button {
        export interface click extends JSX.TargetedMouseEvent<HTMLButtonElement> {}
    }
    export namespace input {
        export interface keyDown extends JSX.TargetedKeyboardEvent<HTMLInputElement> {}
        export interface focusOut extends JSX.TargetedFocusEvent<HTMLInputElement> {}
    }
}
