import { css } from "astro:emotion"
import cx from "clsx/lite"
import type { Attributes } from "./component.ts"

export type Props = Omit<Attributes.button, "size"> & {
    icon?: string
    label?: string
    "filled-on-hover"?: true
    outline?: true
} & (
    | { small?: true, medium?: undefined, large?: undefined }
    | { small?: undefined, medium?: true, large?: undefined }
    | { small?: undefined, medium?: undefined, large?: true }
) & (
    | { primary?: true, "on-secondary-container"?: undefined, "on-surface"?: undefined }
    | { primary?: undefined, "on-secondary-container"?: true, "on-surface"?: undefined }
    | { primary?: undefined, "on-secondary-container"?: undefined, "on-surface"?: true }
)

export function IconButton({
    icon,
    label,
    "filled-on-hover": filledOnHover,
    outline,
    primary,
    "on-secondary-container": onSecondaryContainer,
    "on-surface": onSurface,
    small,
    medium,
    large,
    ...props
}: Props) {
    return <button
        aria-label={label}
        {...props}
        data-primary={primary}
        data-on-secondary-container={onSecondaryContainer}
        data-onsurface={onSurface}
        data-filled-on-hover={filledOnHover}
        data-outline={outline}
        data-small={small}
        data-medium={medium}
        data-large={large}
        class={cx(props.class, symbolButtonClass)}>
        { icon && <span aria-hidden>{icon}</span> }
        { label && <label>{label}</label> }
        { props.children }
    </button>
}

const symbolButtonClass = css`@layer symbol {
    & {
        display: grid;
        place-items: center;
        --transition-properties: color, background-color, outline-color, padding;
        transition-property: var(--transition-properties);
        transition-duration: 250ms;
        color: var(--fg, inherit);
        background-color: var(--bg, inherit);
        border: none;
        padding: 0;
        outline: var(--outline-width, 0.25rem) solid var(--outline-color, transparent);
        outline-offset: calc(var(--outline-width, 0.25rem) * -1);
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
    &:focus-within {
        --outline-color: var(--base-color);
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
        column-gap: 0.25rem;
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
    &[data-on-secondary-container] {
        --base-color: var(--on-secondary-container);
        --on-base-color: var(--secondary-container);
    }
    &[data-filled-on-hover]{
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
        --outline-color: var(--fg);
        &:not(:focus-within) {
            --outline-width: 1px;
        }
        &:not(:hover, :focus-within) {
            --bg: transparent;
        }
        &:hover {
            --bg: light-dark(oklch(0 0 0 / 5%), oklch(1 0 0 / 10%));
        }
        &:focus-within {
            --bg: light-dark(oklch(0 0 0 / 5%), oklch(1 0 0 / 10%));
        }
    }
}`
