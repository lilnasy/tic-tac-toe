export type Entity<State extends keyof States = never> = Partial<States> & Required<Pick<States, State>>

export interface States {
    Turn: Turn
    Marked: Marked
    Place: Place
    Line: null | Line
    Sync: Sync
    Connection: Connection
}

export type Connection = "pending" | "connected" | "ready" | "ingame"

/**
 * The Turn state represents the sign of the player who has
 * the current turn.
 */
export type Turn = "X" | "O" | null

/**
 * Marked is one of the states of the squares on the tic
 * tac toe board. Starts off as `false`, meaning not
 * marked yet. Becomes X or O once a player plays on that
 * square.
 */
export type Marked = "X" | "O" | false

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
