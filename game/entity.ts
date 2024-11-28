/**
 * An enitity is a behavior-less, mutable, serializable
 * object that may have some of the following states.
 * 
 * Presence of a particular state in an entity means that
 * relevant systems may act on it.
 * 
 * For example, Networking related systems are only
 * concerned with entities that have the `Sync` state.
 * 
 * Similarly, the game logic systems are only concerned
 * with entities that have the `Place` state.
 */

import { signal } from "@preact/signals-core"

export type Entity<State extends keyof States = never> =
    Partial<States> &
    Required<Pick<States, State>>

export function create<State extends keyof States>(entity: Entity<State>) {
    const version = signal(0)
    return new Proxy(entity, {
        get(target, key: keyof Entity<State>) {
            version.value
            return target[key]
        },
        set<T extends typeof entity>(target: T, key: keyof T, value: T[keyof T]) {
            const old = target[key]
            if (old !== value) {
                target[key] = value
                version.value++
            }
            return true
        }
    })
}

export interface States {
    Marked: Marked
    Place: Place
    Line: Line
    Sync: Sync
    View: View
}

/**
 * A square on the tic tac toe board gets the marked
 * state when a player marks on that square's place.
 */
type Marked = "X" | "O"

/**
 * The Place state is contained by the Square entity,
 * representing one of the nine possible places on the
 * tic tac toe board that the square can be on.
 * Starting from the top left, ending with bottom right.
 */
export type Place = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/**
 * The Line state represents the straight line made by
 * the winning player when the game ends. Used to render
 * a strikethrough line.
 */
export type Line = readonly [ Place, Place, Place ]

/**
 * A state containing a unique ID that is shared by the
 * server and client versions of the same entity.
 * It is used to find and update the client version when
 * the server version mutates.
 */
interface Sync {
    id: string
}

/**
 * The name of the component with which the entity 
 * should be rendered.
 */
type View = "Square" | "Strikethrough"
