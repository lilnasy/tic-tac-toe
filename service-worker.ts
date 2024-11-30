/// <reference lib="WebWorker" />
import { get } from "./lib/indexed-kv.ts"

declare const self: ServiceWorkerGlobalScope

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url)
    if (url.pathname !== "/" && url.pathname.match(/\/world\/.+-.+/) === null) return
    event.respondWith(fetch(event.request).then(transform))
})

async function transform(response: Response) {
    const { body } = response
    const [ scheme, hue ] = await get("color.scheme", "color.hue")

    if (body && (scheme || hue)) {
        const schemeAttr = (scheme === "light" || scheme === "dark") ? ` data-${scheme}` : ""
        const hueStyle = typeof hue === "number" ? ` style="--base-hue: ${hue}"` : ""
        const replacement = `<html lang="en"${schemeAttr}${hueStyle}>`
        const newBody = body
            .pipeThrough(new TextDecoderStream)
            .pipeThrough(new TransformStream({
                transform(chunk, controller) {
                    controller.enqueue(chunk.replace('<html lang="en">', replacement))
                }
            }))
            .pipeThrough(new TextEncoderStream)
        return new Response(newBody, response)
    }
    return response
}
