
export async function get<Keys extends string[]>(
    ...keys: Keys
): Promise<Keys extends [string] ? unknown :{ [index in keyof Keys]: unknown }> {
    const db = await openDb()
    const store = db
        .transaction("kv-store", "readonly")
        .objectStore("kv-store")
    const request = keys.map(key => store.get(key))
    const response = await Promise.all(request.map(promise)) as any
    if (keys.length === 1) return response[0]
    return response
}

export async function set(key: string, value: unknown) {
    const db = await openDb()
    const request = db
        .transaction("kv-store", "readwrite")
        .objectStore("kv-store")
        .put(value, key)
    return await promise(request)
}

async function openDb() {
    const request = indexedDB.open("kv-db")
    request.onupgradeneeded = createStore
    return await promise(request)
}

function createStore(event: IDBVersionChangeEvent) {
    return (event.target as IDBOpenDBRequest).result.createObjectStore("kv-store")
}

function promise<T extends IDBRequest>(request: T) {
    return new Promise<T["result"]>((resolve, reject) => {
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
    })
}
