export function metadata<Value>(key: string) {
    return class GetterSetter extends Stamper {
        static readonly name = key
        #value: Value | undefined
        static set(object: unknown, value: Value) {
            if (
                typeof object === "object" &&
                object !== null &&
                #value in object
            ) {
                object.#value = value
            } else {
                this.#attach(object).#value = value
            }
        }
        static get(object: unknown): Value | undefined {
            if (
                typeof object === "object" &&
                object !== null &&
                #value in object
            ) {
                return object.#value
            }
        }
        static #attach(object: unknown) {
            return new this(object)
        }
    }
}

class Stamper {
    constructor(object: unknown) {
        return object as any
    }
}
