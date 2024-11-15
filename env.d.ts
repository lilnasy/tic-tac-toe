/// <reference path=".astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="astro-emotion/client" />

declare module 'font:*' {
    const href: string
    export default href
}
