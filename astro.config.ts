import { defineConfig, type ViteUserConfig } from "astro/config"
import node from "@withastro/node"
import preact from "@preact/preset-vite"
import emotion from "astro-emotion"
import precompress from "./lib/precompress.ts"
import fontLoader from "./lib/font-loader.ts"


const vite: ViteUserConfig = {
    assetsInclude: "font:*",
    plugins: [ preact(), fontLoader() ],
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
    }
}

// https://astro.build/config
export default defineConfig({
    srcDir: ".",
    integrations: [ emotion({ stylisPlugins: [] }), precompress ],
    adapter: node({ mode: "standalone" }),
    output: "server",
    server: {
        host: import.meta.env.DEV ? "0.0.0.0" : "127.0.0.1"
    },
    devToolbar: { enabled: false },
    vite
})
