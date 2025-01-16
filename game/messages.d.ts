import type { Entity, Line, Place } from "game/entity.d.ts"
import type { Player, PlayerData } from "game/player.ts"
import type { Board } from "game/board.d.ts"
import type { Animal } from "game/animals.ts"

export type Messages = keyof MessageRegistry

/**
 * All communication between the systems, and between server and
 * the clients must happen in the form of these messages.
 */
export interface MessageRegistry {

    /* GAME-MECHANICS MESSAGES */
    Mark: Mark
    Switch: Switch
    Spawn: Entity
    Ready: Ready
    Start: Start
    Sync: Sync
    Victory: Victory
    Draw: Draw
    RequestRematch: RequestRematch
    RematchRequested: RematachRequested

    /* PLAYER CUSTOMIZATION */
    PlayerProfile: PlayerProfile
    OpponentProfile: OpponentProfile

    /* COLOR SYNCING */
    SyncColors: SyncColors
    UpdateColors: UpdateColors

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
export type Data<Message extends Messages> =
    {} extends MessageRegistry[Message]
        ? ([] | [data: MessageRegistry[Message]])
        : [data: MessageRegistry[Message]]

/**
 * A message that a specific place on the tic tac toe board has
 * been marked by a player.
 */
export interface Mark {
    place: Place
}

/**
 * A message to switch turns to the other player after a valid move
 * has been played. Optimistic, the actual turn is provided by the
 * host in the `Sync` message.
 */
export interface Switch {
    to?: "X" | "O"
}

/**
 * A message in the server emitted when both the players
 * are ready to start the game.
 */
export interface Ready {}

/**
 * A message sent by the server to both server and client
 * systems when 2 players are connected and ready.
 */
export interface Start {
    opponent: PlayerData.WithSign
    /**
     * The sign of the local player..
     */
    sign: "X" | "O"
    /**
     * The sign of the player who will make the first move.
     */
    turn: "X" | "O"
}

/**
 * A message sent by the server to all connected players.
 * Contains the current authoritative state of the game.
 */
export interface Sync {
    board?: Board
    turn?: "X" | "O"
}

/**
 * A message that one of the players has successfully made a line
 * on the tic tac toe board.
 */
export interface Victory {
    winningSign: "X" | "O"
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
 * A message indicating that there was an update to the
 * colors which should be sent to the other players.
 */
export interface SyncColors {}

/**
 * A message indicating that either the color scheme or hue
 * should be updated. When sent across network, includes both
 * fields so that other players can fully synchronise.
 */
export interface UpdateColors {
    hue?: number
    scheme?: "dark" | "light" | "switch"
}

/**
 * A client-side only message shared when the websocket connection
 * to the server becomes open.
 */
export interface Connected {}

/**
 * A message emitted when the connection to the server (on the client)
 * or to the player (on the server) is closed or otherwise severed.
 */ 
export interface Disconnected {
    player?: Player
}

export interface NewWorld {}

/**
 * A message sent by the player to the server that it
 * wants to join a particular world.
 */
export interface JoinWorld {
    world: string
}

/**
 * A server-only message derived either from `NewWorld` or
 * `JoinWorld`, sent to the newly-created or pre-existing
 * world to which the player wants to be added. 
 */
export interface AddPlayer {
    player: Player
}

/**
 * A message sent by the server to the player when a new world
 * is created, or the player was added to a pre-existing one.
 */
export interface JoinedWorld {
    world: string
    player: PlayerData
}

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

/**
 * A message sent by the client to update player preferences,
 * which will be stored in IndexedDB and synced with other players.
 */
export interface PlayerProfile {
    name?: string
    animal: Animal["emoji"]
}

export interface OpponentProfile extends PlayerProfile {}
