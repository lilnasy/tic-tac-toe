import { defineConfig } from "astro/config"
import node from "@withastro/node"
import preact from "@astrojs/preact"
import emotion from "astro-emotion"

// https://astro.build/config
export default defineConfig({
    srcDir: ".",
    integrations: [emotion(), preact()],
    adapter: node({ mode: "standalone" }),
    output: "server",
    vite: {
        build: {
            assetsInlineLimit: 0,
            // minify: false,
        }
    },
})
