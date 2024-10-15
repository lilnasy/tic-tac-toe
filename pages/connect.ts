import type { APIContext } from "astro"
import { lobby } from "game/lobby.ts"

export async function GET(context: APIContext) {
    const { socket, response } = await context.locals.upgradeWebSocket()
    lobby.enter(socket)
    return response
}
