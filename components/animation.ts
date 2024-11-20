/**
 * The provided style is temporarily applied to the provided element to
 * record the changes in positioning and scaling of the children.
 * 
 * The returned keyframes can be used to animate the children.
 */
export function getKeyframesForChildren(
    rootElement: HTMLElement,
    style: Partial<CSSStyleDeclaration>,
) {
    /** The elements to generate keyframes for */
    const { children } = rootElement
    /** The natural size and position of the children elements */
    const natural: Array<DOMRect> = []
    /** The keyframes corresponding each child element */
    const keyframes: Array<{ scale: string, translate: string }> = []

    for (const elem of children) {
        natural.push(elem.getBoundingClientRect())
    }

    const naturalStyle: typeof style = {}

    for (const property in style) {
        if (style[property]) {
            naturalStyle[property] = rootElement.style[property]
            rootElement.style[property] = style[property]
        }
    }

    for (let i = 0; i < children.length; i++) {
        const [
            translateX,
            translateY,
            scaleX,
            scaleY
        ] = trackMovement(natural[i], children[i].getBoundingClientRect())
        keyframes.push({
            scale: `${scaleX} ${scaleY}`,
            translate: `${translateX}px ${translateY}px`
        })
    }
    
    for (const property in naturalStyle) {
        if (naturalStyle[property] !== undefined) {
            rootElement.style[property] = naturalStyle[property]
        }
    }

    if (rootElement.getAttribute("style") === "") {
        rootElement.removeAttribute("style")
    }

    return keyframes
}

type Movement = [
    translateX: number,
    translateY: number,
    scaleX: number,
    scaleY: number
]

function trackMovement(before: DOMRect, after: DOMRect): Movement {
    const translateX = (after.left + after.width / 2) - (before.left + before.width / 2)
    const translateY = (after.top + after.height / 2) - (before.top + before.height / 2)
    const { height, width } = before
    const scaleX = (width === 0 ? 1 : after.width / width)
    const scaleY = (height === 0 ? 1 : after.height / height)
    return [ translateX, translateY, scaleX, scaleY ]
}
