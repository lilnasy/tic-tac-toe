import type { APIContext } from "astro"
import { usher } from "game/usher.ts"

export async function GET(context: APIContext) {
    const { socket, response } = await context.locals.upgradeWebSocket()
    usher.usher(socket)
    return response
}
