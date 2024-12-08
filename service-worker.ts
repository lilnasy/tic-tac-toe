/// <reference lib="WebWorker" />
import { get } from "./lib/indexed-kv.ts"

declare const self: ServiceWorkerGlobalScope

self.addEventListener("install", event => {
    if ("addRoutes" in event && typeof event.addRoutes === "function") {
        /**
         * Opt-out service worker of irrelevant requests
         */
        event.addRoutes({
            condition: {
                not: {
                    or: [
                        { requestMethod: "GET", requestDestination: "document", urlPattern: "/" },
                        { requestMethod: "GET", requestDestination: "document", urlPattern: "/world/:name" }
                    ]
                }
            },
            source: "network"
        })
    }
})

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url)
    if (url.pathname === "/" || url.pathname.match(/\/world\/.+-.+/)) {
        event.respondWith(
            Promise.all([
                fetch(event.request),
                get("color.scheme", "color.hue")
            ])
            .then(transform)
        )
    }
})

function transform([ response, [ scheme, hue ] ]: [ Response, [ unknown, unknown ] ]) {
    if ((scheme || hue) && response.body) {
        const schemeAttr = (scheme === "light" || scheme === "dark") ? ` data-${scheme}` : ""
        const hueStyle = typeof hue === "number" ? ` style="--base-hue: ${hue}"` : ""
        const replacement = `<html lang="en"${schemeAttr}${hueStyle}>`
        const newBody = response.body
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
