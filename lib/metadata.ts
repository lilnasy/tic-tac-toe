/**
 * A way to attach additional hidden properties to an object.
 * 
 * Example:
 * ```ts
 * const hiddenProperty = metadata<string>("optional label")
 * const obj = {}
 * hiddenProperty.set(obj, "value")
 * // obj looks the same as before, just a plain object
 * console.log(obj) // {}
 * console.log(hiddenProperty.get(obj)) // "value"
 * ```
 */
export function metadata<Value>() {
    return class GetterSetter extends Stamper {
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

/**
 * Allows subclasses to stamp private fields onto an
 * object without altering the object's prototype.
 */
class Stamper {
    constructor(object: unknown) {
        return object as any
    }
}
