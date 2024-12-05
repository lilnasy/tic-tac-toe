import { Component as Base, createContext, options, type JSX } from "preact"
import type { ClientWorld } from "game/world.client.ts"
import type { Data, Messages } from "game/messages.d.ts"

export const WorldContext = createContext<ClientWorld>({} as any)

export abstract class Component<P = {}, S = {}> extends Base<P, S> {
    
    static contextType = WorldContext
    
    world = this.context as ClientWorld
    
    update<Message extends Messages>(message: Message, ..._data: Data<Message>): unknown {
        return this.world.update(message, ..._data)
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

/**
 * Hooks into preact internals to treat `data-` props
 * **with boolean values** as boolean attributes.
 * 
 * If the value is `true`, the attribute is rendered,
 * otherwise it is omitted.
 * 
 * For example, this jsx:
 * ```jsx
 * <button data-hover="true" />
 * <button data-hover="false" />
 * <button data-hover={true} />
 * <button data-hover={false} />
 * ```
 * ...would render this html:
 * ```html
 * <button data-hover="true"></button>
 * <button data-hover="false"></button>
 * <button data-hover></button>
 * <button></button>
 * ```
 * 
 * This behavior matches svelte's behavior and my own
 * expectations, but preact made the switch to become
 * compatible with react.
 * https://github.com/preactjs/preact/issues/3717
 */
const vnode = options.vnode
options.vnode = function (node) {
    if (typeof node.type === "string") {
        const { props } = node
        for (const key in props) {
            const value = props[key as keyof typeof props]
            if (key.startsWith("data-") && typeof value === "boolean") {
                props[key as keyof typeof props] = value ? "" : null
            }
        }
    }
    return vnode?.(node)
}
