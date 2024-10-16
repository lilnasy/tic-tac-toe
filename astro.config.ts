import { defineConfig } from "astro/config"
import node from "@withastro/node"
import emotion from "astro-emotion"
import preact from "@preact/preset-vite"
import precompress from "./precompress.ts"

// https://astro.build/config
export default defineConfig({
    srcDir: ".",
    integrations: [emotion(), precompress],
    adapter: node({ mode: "standalone" }),
    output: "server",
    devToolbar: { enabled: false },
    vite: {
        plugins: [ preact() ],
        ssr: { noExternal: import.meta.env.PROD || undefined },
        build: {
            assetsInlineLimit: 0,
            rollupOptions: {
                output: {
                    entryFileNames: '_astro/[hash].mjs',
                    assetFileNames: '_astro/[hash][extname]',
                },
            }
        }
    },
})
