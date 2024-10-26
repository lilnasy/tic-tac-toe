import type { Entity, Line, Place } from "game/entity.ts"
import type { Player } from "game/player.ts"


/**
 * All communication between the systems, and between server and
 * the clients must happen in the form of these messages.
 */
export interface MessageRegistry {

    /* GAME-MECHANICS MESSAGES */
    Assign: Assign
    Mark: Mark
    Switch: Switch
    Spawn: Entity
    Start: Start
    Sync: Sync
    Victory: Victory
    Draw: Draw
    RequestRematch: RequestRematch
    RematchRequested: RematachRequested

    /* CLIENT-ONLY CONNECTION-MANAGEMENT MESSAGE */
    Connected: Connected

    /* CLIENT-TO-SERVER MATCH-ESTABLISHING MESSAGES */
    NewWorld: NewWorld
    JoinWorld: JoinWorld

    /* SERVER-ONLY CONNECTION MANAGEMENT MESSAGES */
    AddPlayer: AddPlayer
    Disconnected: Disconnected
    
    /* SERVER-TO-CLIENT MATCH-ESTABLISHING MESSAGES */
    JoinedWorld: JoinedWorld
    WorldNotFound: WorldNotFound
    WorldOccupied: WorldOccupied
}

/**
 * A type utility to get the shape of the Data that is expected
 * along with a particular message. Returns a tuple that can be
 * used for spread params, allowing the call site to leave out
 * the argument if data is an empty interface.
 */
export type Data<Message extends keyof MessageRegistry> =
    {} extends MessageRegistry[Message]
        ? ([] | [data: MessageRegistry[Message]])
        : [data: MessageRegistry[Message]]

/**
 * A message from the server telling a player
 * which sign - X or O - they will be playing as.
 */
export interface Assign {
    sign: "X" | "O"
}

/**
 * A message that a specific place on the tic tac toe board has
 * been marked by a player.
 */
export interface Mark {
    place: Place
}

/**
 * A message to switch turns to the other player after a valid move
 * has been played.
 */
export interface Switch {
    to?: "X" | "O"
}

/**
 * A message sent by the server to both server and client
 * systems when 2 players are connected and ready.
 */
export interface Start {
    Turn: "X" | "O"
}

/**
 * A message sent by the server to all connected players.
 * Contains all details of an entity that has been mutated in
 * the server world. Used to synchronise and update the
 * corresponding entity in the client world.
 */
export interface Sync extends Entity<"Sync"> {}

/**
 * A message that one of the players has successfully made a line
 * on the tic tac toe board.
 */
export interface Victory {
    winner: "X" | "O"
    line: Line
}

/**
 * A message propagated when all the squares have been marked,
 * but no player successfully made a line.
 */
export interface Draw {}

/**
 * A message sent by the client to the server when the player
 * wants a rematch.
 */
export interface RequestRematch {}

/**
 * A message sent by the server to the second player to let
 * it know that the first player has requested a rematch.
 */
export interface RematachRequested {}

/**
 * A client-side only message shared when the websocket connection
 * to the server becomes open.
 */
export interface Connected {}

/**
 * A server-only message sent to the server world when the
 * connection to the player is closed or otherwise severed.
 */ 
export interface Disconnected {
    player: Player
}

export interface NewWorld {}

/**
 * A message sent by the player to the server that it
 * wants to join a particular world.
 */
export interface JoinWorld {
    world: string
    /**
     * In case the player is reconnecting after being
     * disconnected, the `reconnectId` is used to
     * let the player continue where they left off.
     */
    reconnectId?: string
}

/**
 * A server-only message derived either from `NewWorld` or
 * `JoinWorld`, sent to the newly-created or pre-existing
 * world to which the player wants to be added. 
 */
export interface AddPlayer {
    player: Player
    reconnectId?: string
}

/**
 * A message sent by the server to the player when a new world
 * is created, or the player was added to a pre-existing one.
 */
export interface JoinedWorld {
    world: string
    reconnect: {
        /**
         * A unique id sent by the server to each player when they
         * initially connect. Will be used by the player to rejion game
         * after network issues.
         */
        id: string
    } | Reconnect
}

/**
 * TODO
 */
export interface Reconnect {}

/**
 * A message sent by the server to the player when the
 * specific world that the player requested to join does
 * not exist.
 */
export interface WorldNotFound {
    world: string
}

/**
 * A message from the server indicating that the world
 * that the player is atttempting to join already has all
 * the players to start a game.
 */
export interface WorldOccupied {
    world: string
}
