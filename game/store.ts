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
        if (#et in store === false) return console.log("object is not a store", store)
         /** @ts-expect-error */
        store[prop] = value
        store.#et.dispatchEvent(new Event("update"))
    }
    
    static listen<Store extends {}>(store: Store, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) {
        if (#et in store === false) return console.log("object is not a store", store)
        return store.#et.addEventListener("update", listener, options)
    }
    
    static stopListening<Store extends {}>(store: Store, listener: EventListenerOrEventListenerObject) {
        if (#et in store === false) return console.log("object is not a store", store)
        return store.#et.removeEventListener("update", listener)
    }
}
