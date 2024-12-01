import { css } from "astro:emotion"
import cx from "clsx/lite"
import type { Attributes } from "./component.ts"

export namespace Button {
    export interface Props extends Omit<Attributes.button, "size"> {
        icon: string
        label?: string
        colors: "primary" | "on-secondary-container" | "on-surface"
        style: "filled-on-hover" | "outline"
        size: "small" | "medium" | "large"
    }
}

export function Button({
    icon,
    label,
    colors,
    style,
    size,
    ...props
}: Button.Props) {
    return <button
        {...props}
        data-primary={colors === "primary"}
        data-onsecondarycontainer={colors === "on-secondary-container"}
        data-onsurface={colors === "on-surface"}
        data-filledonhover={style === "filled-on-hover"}
        data-outline={style === "outline"}
        data-small={size === "small"}
        data-medium={size === "medium"}
        data-large={size === "large"}
        class={cx(props.class, symbolButtonClass)}>
        { icon && <span aria-hidden>{icon}</span> }
        { label && <label aria-hidden>{label}</label> }
    </button>
}

const symbolButtonClass = css`@layer symbol {
    & {
        display: grid;
        place-items: center;
        --transition-properties: color, background-color, outline-color, outline-width, padding;
        transition-property: var(--transition-properties);
        transition-duration: 250ms;
        color: var(--fg, inherit);
        background-color: var(--bg, inherit);
        border: none;
        padding: 0;
    }
    &:not([disabled]) {
        cursor: pointer;
    }
    &[data-small] {
        border-radius: 1rem;
        height: 2rem;
    }
    &[data-medium], &[data-large] {
        border-radius: 1.5rem;
        height: 3rem;
    }

    & > span {
        font-family: "Material Symbols Rounded";
    }
    &[data-small] > span {
        font-size: 1rem;
    }
    &[data-medium] > span {
        font-size: 1.5rem;
    }
    &[data-large] > span {
        font-size: 2rem;
    }
    
    & > label {
        font-family: "Outfit";
        font-weight: 700;
        width: max-content;
        cursor: unset;
    }
    &[data-small] > label {
        font-size: 0.75rem;
    }
    &[data-medium] > label {
        font-size: 1.5rem;
    }
    
    &:not(:has(label)) {
        aspect-ratio: 1;
    }
    &:has(label) {
        grid-template-areas: "icon label";
    }
    &[data-small]:has(label) {
        gap: 0.25rem;
        padding: 0 0.75rem;
    }

    &[data-primary] {
        --base-color: var(--primary);
        --on-base-color: var(--on-primary);
    }
    &[data-onsurface] {
        --base-color: var(--on-surface);
        --on-base-color: var(--surface);
    }
    &[data-onsecondarycontainer] {
        --base-color: var(--on-secondary-container);
        --on-base-color: var(--secondary-container);
    }
    &[data-filledonhover]{
        &:not(:hover) {
            --fg: var(--base-color);
            --bg: transparent;
        }
        &:hover {
            --fg: var(--on-base-color);
            --bg: var(--base-color);
        }
    }
    &[data-outline] {
        --fg: var(--base-color);
        outline: solid var(--base-color);
        &:not(:hover, :focus-within) {
            --bg: transparent;
            outline-width: thin;
        }
        &:hover {
            --bg: light-dark(oklch(0 0 0 / 5%), oklch(1 0 0 / 10%));
            outline-width: thin;
        }
        &:focus-within {
            --bg: light-dark(oklch(0 0 0 / 5%), oklch(1 0 0 / 10%));
            outline-width: medium;
        }
    }
}`
