import { metadata } from "lib/metadata.ts"

/**
 * A store is a mutable object that can be subscribed to for updates.
 * Implemented using `EventTarget`.
 */

const et = metadata<EventTarget>()
const UPDATE = "update"
const update = new Event(UPDATE)

export function create<Store extends {}>(storeData: Store) {
    et.set(storeData, new EventTarget)
    return storeData
}

export function set<
    Store extends {},
    Prop extends keyof Store,
    Value extends Store[Prop]
>(store: Store, prop: Prop, value: Value) {
    const target = et.get(store)
    if (target === undefined) return notStore(store)
    if (store[prop] === value) return
    store[prop] = value
    target.dispatchEvent(update)
}

export function assign<Store extends {}>(store: Store, newStore: Store) {
    const target = et.get(store)
    if (target === undefined) return notStore(store)
    const keys = Object.keys(store).concat(Object.keys(newStore))
    for (const key of keys) {
        /** @ts-expect-error */
        store[key] = newStore[key]
    }
    target.dispatchEvent(update)
}

export function listen<Store extends {}>(
    store: Store,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
) {
    const target = et.get(store)
    if (target === undefined) return notStore(store)
    return target.addEventListener(UPDATE, listener, options)
}

export function stopListening<Store extends {}>(
    store: Store,
    listener: EventListenerOrEventListenerObject
) {
    const target = et.get(store)
    if (target === undefined) return notStore(store)
    return target.removeEventListener(UPDATE, listener)
}

function notStore(store: unknown) {
    console.error(new Error("object is not a store", { cause: store }))
}

