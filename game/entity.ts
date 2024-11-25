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

export type Entity<State extends keyof States = never> =
    Partial<States> &
    Required<Pick<States, State>>

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
export type Marked = "X" | "O"

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
export interface Sync {
    id: string
}

/**
 * The name of the component with which the entity 
 * should be rendered.
 */
export type View = "Square" | "Strikethrough"
