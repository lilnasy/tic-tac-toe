import { signal } from "@preact/signals"

export class ReactiveSet<T> implements Set<T> {
    
    [Symbol.toStringTag] = "ReactiveSet"
    
    // The underlying set that all updates are applied to, and
    // from which all values are read.
    #set: Set<T>

    // Used to announce changes, incremented on every mutation
    // to make sure equality checks never pass, and dependent
    // signals/computations are always invalidated and re-run.
    #version = signal(0)

    // A separate signal for size, in case the dependant
    // computation does not need the full set.
    #size = signal(0)

    constructor(values?: ReactiveSet<T> | Iterable<T> | null | undefined) {
        this.#set = new Set(values && #set in values ? values.#set : values)
    }

    [Symbol.iterator]() {
        this.#version.value
        return this.#set[Symbol.iterator]()
    }

    get size() {
        return this.#size.value
    }

    add(value: T): this {
        
        const { size } = this.#set
        
        this.#set.add(value)

        // only announce a change if the value being added
        // was not already present
        if (size !== this.#set.size) {
            this.#size.value = this.#set.size
            this.#version.value++
        }

        return this
    }

    clear(): void {
        if (this.#set.size !== 0) {
            this.#set.clear()
            this.#size.value = this.#set.size
            this.#version.value++
        }
    }

    delete(value: T): boolean {
        const deleted = this.#set.delete(value)
        this.#size.value = this.#set.size
        this.#version.value++
        return deleted
    }

    difference<U>(other: ReadonlySet<U> | ReactiveSet<U>): ReactiveSet<T> {
        this.#version.value
        return new ReactiveSet(this.#set.difference(other))
    }

    forEach<This>(callbackfn: (this: This, value: T, key: T, set: ReactiveSet<T>) => void, thisArg: This): void
    forEach(callbackfn: (value: T, key: T, set: ReactiveSet<T>) => void): void
    forEach(callbackfn: (value: T, key: T, set: ReactiveSet<T>) => void, thisArg?: any): void {
        this.#version.value
        for (const value of this.#set) {
            callbackfn.call(thisArg, value, value, this)
        }
    }

    has(value: T): boolean {
        this.#version.value
        return this.#set.has(value)
    }

    intersection<U>(other: ReadonlySet<U> | ReactiveSet<U>): ReactiveSet<T & U> {
        this.#version.value
        return new ReactiveSet(this.#set.intersection(other))
    }

    isDisjointFrom<U>(other: ReadonlySet<U> | ReactiveSet<U>): boolean {
        this.#version.value
        return this.#set.isDisjointFrom(#set in other ? other.#set : other)
    }

    isSubsetOf<U>(other: ReadonlySet<U> | ReactiveSet<U>): boolean {
        this.#version.value
        return this.#set.isSubsetOf(#set in other ? other.#set : other)
    }

    isSupersetOf<U>(other: ReadonlySet<U> | ReactiveSet<U>): boolean {
        this.#version.value
        return this.#set.isSupersetOf(#set in other ? other.#set : other)
    }

    entries(): IterableIterator<[T, T]> {
        this.#version.value
        return this.#set.entries()
    }

    keys(): IterableIterator<T> {
        this.#version.value
        return this.#set.keys()
    }

    symmetricDifference<U>(other: ReadonlySet<U> | ReactiveSet<U>): ReactiveSet<T | U> {
        this.#version.value
        return new ReactiveSet(this.#set.symmetricDifference(#set in other ? other.#set : other))
    }

    union<U>(other: ReadonlySet<U> | ReactiveSet<U>): ReactiveSet<T | U> {
        this.#version.value
        return new ReactiveSet(this.#set.union(#set in other ? other.#set : other))
    }

    values(): IterableIterator<T> {
        this.#version.value
        return this.#set.values()
    }
}
