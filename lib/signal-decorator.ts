import { type Signal, signal as preactSignal } from "@preact/signals"

// The function is described in terms of this interface to
// keep hover info from becoming too noisy.
export interface AccessorDecorator<RequiredValue = unknown> {
    <This, Value extends RequiredValue>(
        target: ClassAccessorDecoratorTarget<This, Value>,
        context: ClassAccessorDecoratorContext<This, Value>
    ): ClassAccessorDecoratorResult<This, Value>
}

/**
 * @decorator
 * Decorate fields of a class with `@signal` to make them reactive.
 * 
 * Example:
 *
 * ```js
 * import { signal } from "lib/signal-decorator.ts"
 *
 * class BearStore {
 * 
 *     ⁣@signal accessor bears = 0
 * 
 *     increasePopulation() {
 *         this.bears++
 *     }
 * 
 *     removeAllBears() {
 *         this.bears = 0
 *     }
 * }
 * 
 * const bearStore = new BearStore()
 * 
 * function BearCounter() {
 *     const { bears } = bearStore
 *     return <h1>{ bears } around here ...</h1>
 * }
 * ```
 */
export const signal: AccessorDecorator = decorator

function decorator<This, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>
): ClassAccessorDecoratorResult<This, Value> {
    /**
     * The accessor decorator givevs us a secret "accessor
     * storage", implemented as private field on the instance
     * when polyfilled.
     * 
     * `target.get` reads from this private storage, and
     * `target.set` writes to it.
     */
    
    /**
     * This type assertion is necessary because the type of the
     * underlying value (the signal) on the accessor storage is
     * different from the publicly exposed value via the getter-
     * setter. There doesn't seem to be a way to express this
     * dichotomy in TypeScript's interfaces.
     * 
     * Issue: https://github.com/microsoft/TypeScript/issues/60200
     */
    const { get } = target as ClassAccessorDecoratorTarget<This, Signal<Value>>

    return {
        /** 
         * The return value goes onto the accessor storage,
         * so this is correct.
         * @ts-expect-error */
        init(value) {
            return preactSignal(value) satisfies ReturnType<typeof get>
        },
        get() {
            return get.call(this).value
        },
        set(value) {
            return get.call(this).value = value
        }
    }
}