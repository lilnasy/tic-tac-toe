import { defineConfig } from "astro/config"
import node from "@withastro/node"
import preact from "@astrojs/preact"
import emotion from "astro-emotion"
import precompress from "./precompress.ts"

// https://astro.build/config
export default defineConfig({
    srcDir: ".",
    integrations: [emotion(), preact(), precompress],
    adapter: node({ mode: "standalone" }),
    output: "server",
    devToolbar: { enabled: false },
    vite: {
        ssr: {
            external: import.meta.env.DEV ? ["cssesc"] : undefined,
            noExternal: true
        },
        build: { assetsInlineLimit: 0 }
    },
})
