import { fileURLToPath } from "node:url"
import { defineConfig } from "astro/config"
import node from "@withastro/node"
import preact from "@preact/preset-vite"
import { ecsstatic } from "@acab/ecsstatic/vite"
import precompress from "./precompress.ts"

// https://astro.build/config
export default defineConfig({
    srcDir: ".",
    integrations: [precompress],
    adapter: node({ mode: "standalone" }),
    output: "server",
    server: {
        host: import.meta.env.DEV ? "0.0.0.0" : "127.0.0.1"
    },
    devToolbar: { enabled: false },
    vite: {
        plugins: [ ecsstatic({ classNamePrefix: "e" }), preact() ],
        ssr: {
            noExternal: import.meta.env.PROD || undefined
        },
        resolve: {
            alias: {
                assets: fileURLToPath(new URL("./assets", import.meta.url))
            }
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
})
