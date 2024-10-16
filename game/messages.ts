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

    /* CLIENT-SENT MATCH-ESTABLISHING MESSAGES */
    Connected: Connected
    Ready: Ready
    NewWorld: NewWorld
    JoinWorld: JoinWorld

    /* SERVER VERSIONS OF CLIENT-SENT MATCH-ESTABLISHING MESSAGES */
    PlayerMark: PlayerMark
    PlayerReady: PlayerReady
    PlayerNewWorld: PlayerNewWorld
    PlayerJoinWorld: PlayerJoinWorld
    PlayerDisconnected: PlayerDisconnected
    
    /* SERVER-SENT MATCH-ESTABLISHING MESSAGES */
    JoinedWorld: JoinedWorld
    WorldNotFound: WorldNotFound
    WorldOccupied: WorldOccupied
}

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
export interface Switch {}

/**
 * The Mark message combined with the player object corresponding
 * to the player that sent the message. Server only.
 */
export interface PlayerMark extends Mark {
    player: Player
}

/**
 * A client-side only message shared when the websocket connection
 * to the server becomes open.
 */
export interface Connected {}

/**
 * A message sent by a player to the server that they are ready
 * to go in game. A precursor to the `PlayerReady` message on the
 * server that also includes the player object corresponding to
 * the player that sent the message.
 */
export interface Ready {}

/**
 * A message sent by a player to the server that they are ready
 * to go in game. Server only.
 */
export interface PlayerReady {
    player: Player
}

export interface PlayerDisconnected {
    player: Player
}

export interface NewWorld {}

export interface PlayerNewWorld {
    player: Player
}

export interface JoinWorld {
    world: string
    reconnectId?: string
}

export interface PlayerJoinWorld extends JoinWorld {
    player: Player
}

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

export interface Reconnect {}

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

/**
 * A message sent by the server to both server and client
 * systems when 2 players are connected and ready.
 */
export interface Start {}

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
