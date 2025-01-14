import { defineConfig } from "astro/config"
import nodeWs from "astro-node-websocket"
import preact from "@preact/preset-vite"
import emotion from "astro-emotion"
import precompress from "./lib/precompress.ts"
import fontLoader from "./lib/font-loader.ts"

const vite: import("vite").UserConfig = {
    plugins: [
        preact({
            reactAliasesEnabled: false,
            babel: {
                plugins: [[ "@babel/plugin-proposal-decorators", { version: "2023-11" } ]]
            }
        }),
    ],
    ssr: {
        noExternal: import.meta.env.PROD || undefined
    },
    build: {
        assetsInlineLimit: 0,
        sourcemap: true,
        rollupOptions: {
            output: {
                entryFileNames: '_astro/[hash].mjs',
                assetFileNames: '_astro/[hash][extname]'
            }
        }
    },
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
    server: {
        host: import.meta.env.DEV ? "0.0.0.0" : "127.0.0.1",
    },
    devToolbar: { enabled: false },
    vite
})
