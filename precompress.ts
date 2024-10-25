import { fileURLToPath } from "node:url"
import fs from "node:fs"
import crypto from "node:crypto"
import path from "node:path"
import zlib from "node:zlib"
import type { AstroIntegration } from "astro"

const gzipOptions = { level: 9 } as const
const brotliOptions = { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } as const
let cacheDir: string

export default {
    name: "precompress",
    hooks: {
        "astro:config:done"({ config }) {
            cacheDir = path.join(fileURLToPath(config.root), "node_modules", ".precompress")
            if (fs.existsSync(cacheDir) === false) fs.mkdirSync(cacheDir)
        },
        "astro:build:done"({ dir, logger }) {
            const start = performance.now()
            let cached = 0
            let current = 0
            for (const entry of fs.readdirSync(dir, { recursive: true })) {
                if (typeof entry !== "string") continue
                if (
                    entry.endsWith(".mjs") === false &&
                    entry.endsWith(".css") === false &&
                    entry.endsWith(".svg") === false
                ) continue
                const srcFilePath = path.join(fileURLToPath(dir), entry as string)
                if (fs.lstatSync(srcFilePath).isFile() === false) continue

                const srcFile = fs.readFileSync(srcFilePath)
                const hash = crypto.hash("md5", srcFile, "hex")
                
                const cachedBrFilePath = path.join(cacheDir, hash + ".br")
                if (fs.existsSync(cachedBrFilePath)) {
                    cached++
                } else {
                    fs.writeFileSync(cachedBrFilePath, zlib.brotliCompressSync(srcFile, brotliOptions))
                    current++
                }
                fs.copyFileSync(cachedBrFilePath, srcFilePath + ".br")
                
                const cachedGzFilePath = path.join(cacheDir, hash + ".gz")
                if (fs.existsSync(cachedGzFilePath)) {
                    cached++
                } else {
                    fs.writeFileSync(cachedGzFilePath, zlib.gzipSync(srcFile, gzipOptions))
                    current++
                }
                fs.copyFileSync(cachedGzFilePath, srcFilePath + ".gz")
            }
            logger.info(`Processed static assets in ${(performance.now() - start).toFixed(1)}ms.`)
            logger.info(`${current} just compressed, ${cached} copied from cache.`)
        }
    }
} satisfies AstroIntegration