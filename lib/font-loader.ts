import path from "node:path"
import crypto from "node:crypto"
import fs from "node:fs"
import type { Plugin } from "vite"
import type { AstroIntegration } from "astro"

export default function (): AstroIntegration {
    return {
        name: "font-loader",
        hooks: {
            "astro:config:setup": ({ updateConfig }) => {
                updateConfig({
                    vite: {
                        plugins: [ vite() ]
                    }
                })
            },
            "astro:config:done" ({ injectTypes }) {
                injectTypes({
                    filename: "types.d.ts",
                    content: [
                        `declare module 'font:*' {`,
                        `    const href: string`,
                        `    export default href`,
                        `}`,
                    ].join("\n")
                })
            }
        }
    }
}

function vite(): Plugin {
    let root: string
    let metadata: Record<string, string>
    function metadataFilePath() {
        return path.join(root, "node_modules", ".fonts", "metadata.json")
    }
    function readMetadata() {
        if (metadata) return metadata
        const metadataFilePath = path.join(root, "node_modules", ".fonts", "metadata.json")
        try {
            const metadataText = fs.readFileSync(metadataFilePath, "utf8")
            metadata = JSON.parse(metadataText)
        } catch {
            fs.writeFileSync(metadataFilePath, "{}")
            metadata = {}
        }
        return metadata
    }
    function writeMetadata() {
        fs.writeFileSync(metadataFilePath(), JSON.stringify(metadata, null, 4))
    }
    const resolveId: Plugin["resolveId"] = async function (id) {
        if (id.startsWith("font:") === false && id.startsWith("/font:") === false) {
            return
        }
        const query = id.startsWith("font:") ? id.slice(5) : id.slice(6)
        try {
            const metadata = readMetadata()
            const filePath = metadata[query]
            if (filePath) return filePath
        }
        catch {
            // continue
        }
        const cssResponse = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
            headers: {
                "User-Agent": "AppleWebKit/537.36 Chrome/130.0.0.0"
            }
        })
        const cssText = await cssResponse.text()
        const [ fontPath ] = /(?<=url\()https:\/\/fonts.gstatic.com\/(\S)+(?=\))/.exec(cssText)!
        const fontResponse = await fetch(fontPath)
        const fontBuffer = await fontResponse.arrayBuffer()
        const fontBytes = new Uint8Array(fontBuffer)
        const hash = crypto.hash("md5", fontBytes)
        const filePath = path.join(root, "node_modules", ".fonts", `${hash}.woff2`)
        fs.mkdirSync(path.dirname(filePath), { recursive: true })
        fs.writeFileSync(filePath, fontBytes)
        const metadata = readMetadata()
        metadata[query] = filePath
        writeMetadata()
        return filePath
    }
    return {
        name: "font-loader",
        config() {
            return {
                resolve: {
                    alias: [{
                        find: /font:/,
                        replacement: "font:",
                        // url() in css can only be hooked into this way
                        customResolver: { resolveId }
                    }]
                }
            }
        },
        configureServer({ config }) {
            root = config.root
        },
        configResolved(config) {
            root = config.root
        },
        resolveId
    }
}