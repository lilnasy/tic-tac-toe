
import { computed, signal, type ReadonlySignal } from "@preact/signals-core"
import type { AccessorDecorator } from "./signal-decorator.ts"

/**
 * @decorator
 * Decorate fields of a class with `@store` to
 * convert them into a deeply reactive mutable object.
 * 
 * The object remains reactive after being reassigned.
 * 
 * ```js
 * import { store } from "lib/mutable-store.ts"
 *
 * class Counter {
 *     ⁣@store accessor store = { count: 0 }
 * }
 * 
 * const counter = new Counter()
 * 
 * function App() {
 *     return <>
 *         <CounterDisplay store={counter.store} />
 *         <button onClick={() => counter.store.count++}>Increment</button>
 *         <button onClick={() => counter.store = { count: 0 }}>Reset</button>
 *     </>
 * }
 * 
 * function CounterDisplay({ store }: { store: Counter["store"] }) {
 *     return <>
 *         <h1>{ store.count }</h1>
 *     </>
 * }
 * ```
 */
export const store: AccessorDecorator<{}> = ({ get }) => {
    return {
        init(value) {
            return createMutable(value)
        },
        get() {
            return get.call(this)
        },
        set(value) {
            const signal = get.call(this)
            for (const key in signal) {
                // @ts-expect-error
                if (key in value === false) signal[key] = undefined
            }
            for (const key in value) {
                signal[key] = value[key]
            }
        }
    }
}

/**
 * Creates a mutable object that enables reactively
 * tracking changes to the object's properties. When
 * properties are accessed, computed signals are
 * automatically created for them.
 */
export function createMutable<T extends object>(source: T): T {
    const sourceSignal = signal(source)
    return proxy(
        source,
        k => sourceSignal.value[k],
        (k, v) => (source[k] = v, sourceSignal.value = { ...source })
    )
}

/**
 * Creates a proxy for the source object that is being
 * wrapped in a mutable store.
 * 
 * Forwards `get` and `set` operations to the provided
 * `get()` and `set()` functions. When the object is
 * deeply nested, `proxy()` calls itself recursively
 * to propagate operations to the original signal.
 * 
 * There is only one writable signal for the entire
 * store. This keeps the code relatively simple, while
 * still being performant for simple objects. Property
 * accesses create computed signals, that read from
 * this single signal, even when the access is deep.
 * 
 * @param source - The object being proxied. Not a
 * signal. All untrapped methods will be forwarded to
 * this object, to make it behave mostly predictably.
 */
function proxy<T extends object, K extends keyof T>(
    source: T,
    get: (key: K) => T[K],
    set: (key: K, value: T[K]) => void
): T {
    const computedCache = {} as Record<K, ReadonlySignal<unknown>>
    const proxyCache = {} as Record<K, object>
    return new Proxy(source, {
        has(_, key) {
            if (key === proxyTarget) return true
            return key in source
        },
        get(_, _key) {
            if (_key === proxyTarget) return source
            const key = _key as K
            if (computedCache[key]) {
                return computedCache[key].value
            }
            const fieldComputed = computed(() => {
                const field = get(key)
                if (typeof field === "object" && field !== null) {
                    if (proxyCache[key]) {
                        return proxyCache[key]
                    }
                    /**
                     * Create a "subproxy" that forwards
                     * get and set operations back to the
                     * current proxy. The current proxy
                     * may then forward those operations
                     * to its own parent proxy. This goes
                     * on until the operation reaches the
                     * signal created in `createMutable()`.
                     */
                    const substore = proxy(
                        field,
                        k => (get(key) as typeof field)[k],
                        (k, v) => set(key, { ...source[key], [k]: v })
                    )
                    proxyCache[key] = substore
                    return substore
                }
                return field
            })
            computedCache[key] = fieldComputed
            return fieldComputed.value
        },
        set(_, key, value) {
            set(key as any, unwrapProxy(value))
            return true
        },
        ownKeys() {
            /**
             * The [[OwnPropertyKeys]] internal method
             * is called when an object is spread.
             * 
             * In this case, we want all dependent
             * effects to rerun if there's a change on
             * any of the object's properties.
             * 
             * Preact does a strict equality check on
             * the return values of computed signals
             * to determine whether the computed has
             * changed and dependent signals and
             * effects should re-evalutate.
             * 
             * Since strict equality fails on NaN
             * (NaN is not strictly equal to itself),
             * we can return NaN to force all dependent
             * effects to re-run everytime.
             */
            const keysComputed = computed(() => {
                const keys = Reflect.ownKeys(source)
                /**
                 * Call get to establish a dependency
                 * on all keys.
                 */
                for (const key of keys) {
                    get(key as any)
                }
                return NaN
            })
            keysComputed.value
            return Reflect.ownKeys(source)
        }
    })
}

/**
 * When a store is being updated, we ensure that no
 * proxies appear in the new value. This avoids loops.
 * 
 * Done by recursively walking the potentially deeply
 * nested object.
 */
function unwrapProxy<T extends object>(value: T): T {
    if (typeof value === "object" && value !== null) {
        if (proxyTarget in value) {
            // @ts-expect-error
            return value[proxyTarget]
        }
        for (const key in value) {
            // @ts-expect-error
            value[key] = unwrapProxy(value[key])
        }
    }
    return value
}

/**
 * An internal symbol to detect if a value is a proxy,
 * and retrieve the original value (the target of the proxy).
 */
const proxyTarget = Symbol()
