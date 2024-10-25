export class Store extends class { constructor(x: {}) { return x } } {
    #et = new EventTarget

    static create<Store extends {}>(storeData: Store): Store {
        return new Store(storeData) as unknown as Store
    }

    static set<
        Store extends {},
        Prop extends keyof Store,
        Value extends Store[Prop]
    >(store: Store, prop: Prop, value: Value) {
        if (#et in store === false) return this.#notStore(store)
        if (store[prop] === value) return
        /** @ts-expect-error */
        store[prop] = value
        store.#et.dispatchEvent(new Event("update"))
    }

    static #usedStores: Set<Store> | undefined
    static track() {
        this.#usedStores = new Set
    }

    static get<
        Store extends {},
        Prop extends keyof Store
    >(store: Store, prop: Prop) {
        Store.#usedStores?.add(store as any)
        return store[prop]
    }

    static untrack() {
        const usedStores = this.#usedStores
        this.#usedStores = undefined
        return usedStores
    }

    static listen<Store extends {}>(store: Store, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) {
        if (#et in store === false) return this.#notStore(store)
        return store.#et.addEventListener("update", listener, options)
    }

    static stopListening<Store extends {}>(store: Store, listener: EventListenerOrEventListenerObject) {
        if (#et in store === false) return this.#notStore(store)
        return store.#et.removeEventListener("update", listener)
    }

    static #notStore(store: unknown) {
        console.log("object is not a store", store)
    }
}
