import { defineConfig } from "astro/config"
import nodeWs from "astro-node-websocket"
import preact from "@preact/preset-vite"
import emotion from "astro-emotion"
import precompress from "./lib/precompress.ts"
import fontLoader from "./lib/font-loader.ts"

const vite: import("vite").UserConfig = {
    plugins: [
        // using preact vite plugin directly to configure babel
        preact({
            reactAliasesEnabled: false,
            babel: {
                plugins: [[ "@babel/plugin-proposal-decorators", { version: "2023-11" } ]]
            }
        }),
    ],
    ssr: {
        // inline all npm dependencies
        noExternal: import.meta.env.PROD || undefined
    },
    build: {
        // keep css and js assets external
        assetsInlineLimit: 0,
        // view uncompiled sourcemaps in devtools
        sourcemap: true,
        // prevent overly long asset names
        rollupOptions: {
            output: {
                entryFileNames: '_astro/[hash].mjs',
                assetFileNames: '_astro/[hash][extname]'
            }
        }
    },
    // bundle service worker into a module
    worker: {
        format: "es"
    }
}

// https://astro.build/config
export default defineConfig({
    srcDir: ".",
    integrations: [
        emotion({ stylisPlugins: [] }),
        fontLoader(),
        precompress,
    ],
    adapter: nodeWs({ mode: "standalone" }),
    output: "server",
    // bind to all interfaces in dev allowing other devices on wifi to connect
    server: {
        host: import.meta.env.DEV ? "0.0.0.0" : "127.0.0.1",
    },
    // more intrusive than helpful
    devToolbar: { enabled: false },
    vite
})
