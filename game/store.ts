const weakmap = new WeakMap<{}, EventTarget>

export function store<Data extends {}>(data: Data) {
    if (weakmap.has(data)) {
        console.warn(new Error("data is already a store"), data)
        return data
    }
    const target = new EventTarget
    weakmap.set(data, target)
    return data
}

export function announce<Data extends {}>(data: Data, ...unknown: unknown[]) {
    const target = weakmap.get(data)!
    target.dispatchEvent(new Event("update"))
}

export function listen<Data extends {}>(data: Data, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) {
    const target = weakmap.get(data)!
    return target.addEventListener("update", listener, options)
}

export function stop<Data extends {}>(data: Data, listener: EventListenerOrEventListenerObject) {
    const target = weakmap.get(data)!
    return target.removeEventListener("update", listener)
}
