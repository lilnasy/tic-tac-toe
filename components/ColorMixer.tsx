import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component } from "./component.ts"
import { IconButton } from "./IconButton.tsx"
import { get } from "lib/indexed-kv.ts"

export class ColorMixer extends Component<{ class?: string }> {

    current: HTMLDialogElement | null = null

    #openDialog = (event: Event) => {
        event.stopPropagation()
        const dialog = this.current!
        dialog.show()
        dialog.previousElementSibling?.setAttribute("aria-expanded", "true")
        const options = { passive: true }
        addEventListener("click", this, options)
        addEventListener("keydown", this, options)
        dialog.addEventListener("focusout", this, options)
    }

    handleEvent(event: Event) {
        const dialog = this.current!
        const target = event.target
        if (event.type === "click" && target) {
            if (target === dialog || (target instanceof Node && dialog.contains(target))) {
                // keep open
            } else {
                // light dismiss
                this.#closeDialog()
            }
        } else if (event instanceof KeyboardEvent && event.key === "Escape") {
            this.#closeDialog()
        } else if (event instanceof FocusEvent) {
            const focusReceiver = event.relatedTarget
            if (
                focusReceiver === null ||
                focusReceiver instanceof Node === false ||
                dialog.contains(focusReceiver) === false
            ) {
                this.#closeDialog()
            }
        }
    }

    #closeDialog = () => {
        const dialog = this.current!
        dialog.close()
        dialog.previousElementSibling?.setAttribute("aria-expanded", "false")
        removeEventListener("click", this)
        removeEventListener("keydown", this)
        dialog.removeEventListener("focusout", this)
    }

    #switchScheme = async () => {
        await this.update("UpdateColors", { scheme: "switch" })
        await this.update("SyncColors")
    }

    render(props: typeof this.props) {
        return <color-mixer class={css`display: contents;`}>
            <IconButton
                icon="palette"
                aria-label="Show color mixer"
                filled-on-hover
                primary
                large
                onClick={this.#openDialog}
                class={props.class}
            />
            <dialog ref={this} class={cx(props.class, css`
                position: static;
                &[open] {
                    display: grid;
                }                
                grid-template:
                    "wheel wheel" 9rem
                    "switch close";
                place-items: center;
                width: 10rem;
                contain: paint;
                gap: 0.5rem;
                background-color: var(--secondary-container);
                border: none;
                padding: 0.5rem;
                --reveal: 15rem;
                clip-path: circle(var(--reveal) at 85% 88%);
                border-radius: 1rem;
                filter: var(--drop-shadow);
                will-change: filter;
                transition-behavior: allow-discrete;
                transition-duration: 250ms;
                transition-property: background-color, clip-path, display, filter;
                @starting-style {
                    --reveal: 0;
                }
                &:not([open])  {
                    --reveal: 0;
                }
            `)}>
                <div aria-hidden class={css`
                    grid-area: wheel;
                    pointer-events: none;
                    width: 8rem;
                    aspect-ratio: 1;
                    background-image: conic-gradient(
                        in oklch longer hue,
                        oklch(0.7 0.15 0),
                        oklch(0.7 0.15 360)
                    );
                    mask-image: radial-gradient(
                        circle farthest-side at center,
                        transparent 36%,
                        white 38%,
                        white 98%,
                        transparent 100%
                    );
                `}/>
                <HueWheelThumb aria-label="Hue wheel" class={css`grid-area: wheel;`}/>
                <IconButton
                    aria-label="Hue wheel"
                    primary
                    outline
                    small
                    onClick={this.#switchScheme}
                    class={css`
                        grid-area: switch;
                        container-type: size;
                        contain: paint;
                        width: 6.75rem;
                        --down: 0 65cqh;
                        --up: 0 -65cqh;
                        & > span {
                            grid-area: 1 / 1;
                        }
                        & > label {
                            grid-area: 1 / 2;
                            justify-self: end;
                        }
                        & > :is(label, span) {
                            transition: display, translate;
                            transition-behavior: allow-discrete;
                            transition-duration: 250ms;
                        }
                        @starting-style {
                            & > [data-if-light] {
                                translate: var(--down);
                            }
                            & > [data-if-dark] {
                                translate: var(--up);
                            }
                        }
                        :root[data-light] & > [data-if-dark] {
                            display: none;
                            translate: var(--up);
                        }
                        :root[data-dark] & > [data-if-light] {
                            display: none;
                            translate: var(--down);
                        }
                        :root:not([data-light]):not([data-dark]) & {
                            @media (prefers-color-scheme: dark) {
                                & > [data-if-light] {
                                    display: none;
                                    translate: var(--down);
                                }
                            }
                            @media (prefers-color-scheme: light) {
                                & > [data-if-dark] {
                                    display: none;
                                    translate: var(--up);
                                }
                            }
                        }
                    `}
                >
                    <span data-if-dark aria-hidden>light_mode</span>
                    <label data-if-dark>Light Mode</label>
                    <span data-if-light aria-hidden>dark_mode</span>
                    <label data-if-light>Dark Mode</label>
                </IconButton>
                <IconButton
                    icon="close"
                    aria-label="Close color mixer"
                    filled-on-hover
                    primary
                    small
                    onClick={this.#closeDialog}
                    class={css`
                        grid-area: close;
                        & > span {
                            font-size: 1.5rem;
                        }
                    `}
                />
            </dialog>
        </color-mixer>
    }
}


class HueWheelThumb extends Component<{ class?: string }> {

    current: HTMLInputElement | null = null

    componentDidMount() {
        const input = this.current!
        const hue = document.documentElement.style.getPropertyValue("--base-hue")
        if (hue) input.value = hue
        if (import.meta.env.DEV) {
            get("color.hue").then(hue => {
                if (typeof hue === "number" && 0 <= hue && hue <= 359) {
                    input.value = String(hue)
                }
            })
        }
        input.addEventListener("input", this)
        input.addEventListener("change", this)
        input.addEventListener("pointerdown", this)
        input.addEventListener("touchstart", this)
    }

    handleEvent(event: Event) {
        const input = this.current!
        const { type } = event
        if (type === "input") {
            let { value } = input
            /** Clockwise wraparound */
            if (value === "360") input.value = value = "0"
            /** Counter-clockwise wraparound */
            else if (value === "-5") input.value = value = "355"
            this.update("UpdateColors", { hue: Number.parseInt(value) })
        } else if (type === "change") {
            this.update("SyncColors")
        } else if (type === "touchstart") {
            /** prevent touch actions (native back/forward gestures) */
            event.preventDefault()
        } else if (event instanceof PointerEvent) {
            if (type === "pointerdown" && event.buttons === 1) {
                /** prevent input events on pointermove and change event on pointerup */
                event.preventDefault()
                input.addEventListener("pointermove", this, { passive: true })
                input.addEventListener("pointerup", this, { passive: true })
                input.setPointerCapture(event.pointerId)
            } else if (type === "pointermove") {
                const wheelImage = input.previousElementSibling!.getBoundingClientRect()
                const centerX = wheelImage.left + wheelImage.width / 2
                const centerY = wheelImage.top + wheelImage.height / 2
                const { x , y } = event
                const hueRadians = Math.atan2(centerY - y, x - centerX);
                const hueAngle = 90 - Math.round(180 * hueRadians / Math.PI)
                const hue = hueAngle < 0 ? hueAngle + 360 : hueAngle
                input.value = String(hue)
                this.update("UpdateColors", { hue })
            } else if (type === "pointerup") {
                input.removeEventListener("pointermove", this)
                input.removeEventListener("pointerup", this)
                input.releasePointerCapture(event.pointerId)
                this.update("SyncColors")
            }
        }
    }

    render(props: typeof this.props) {
        /**
         * There is a step value of 5 to make it easier to
         * control the hue using keyboard. Lower values would
         * result in movement taking too long.
         * 
         * On mouse and touch interactions, the step value is
         * irrelevant because the default behavior is overriden.
         */
        return <input {...props} type="range" min="-5" defaultValue="0" max="360" step="5" ref={this} class={cx(props.class, css`
            --wheel-size: 8rem;
            --thumb-size: 2.5rem;
            --max-translate: calc(var(--wheel-size) / 2 - var(--thumb-size) / 2);
            --inner-ring-offset: -0.25rem;
            margin: initial;
            background: initial;
            width: var(--thumb-size);
            aspect-ratio: 1;
            translate:
                calc(sin(var(--base-hue) * 1deg) * var(--max-translate))
                calc(cos(var(--base-hue) * 1deg) * var(--max-translate) * -1);
            rotate: calc(var(--base-hue) * 1deg);
            border-radius: 50%;
            outline: var(--primary) solid 0.25rem;
            outline-offset: -0.25rem;
            transition: outline-offset 250ms;
            &:focus-within {
                outline-offset: initial;
                --inner-ring-offset: -0.5rem;
            }
            &:not(:active) {
                cursor: grab;
            }
            &:active  {
                cursor: grabbing;
            }
            &, &::-webkit-slider-container, &::-webkit-slider-runnable-track, &::-webkit-slider-thumb {
                appearance: none;
            }
            &::-webkit-slider-thumb {
                background: initial;
                outline: var(--primary) solid 0.25rem;
                outline-offset: var(--inner-ring-offset);
                border-radius: 50%;
                width: var(--thumb-size);
                aspect-ratio: 1;
                transition: outline-offset 250ms;
            }
            /**
             * Vendor-specific selectors are used in separate rules because
             * not only do they fail to match in a non-supported browser, they
             * are deemed completely invalid syntax-wise during parsing.
             * 
             * For example, on encountering ::-moz-* in a selector list, chrome
             * throws away the entire rule, even if other selectors could match.
             */
            &::-moz-range-progress, &::-moz-range-track, &::-moz-range-thumb {
                appearance: none;
            }
            &::-moz-range-thumb {
                background: initial;
                outline: var(--primary) solid 0.25rem;
                outline-offset: var(--inner-ring-offset);
                border-radius: 50%;
                width: var(--thumb-size);
                height: var(--thumb-size);
                transition: outline-offset 250ms;
                border: initial;
            }
        `)}/>
    }
}
