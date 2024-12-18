import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component } from "./component.ts"
import * as Symbols from "./Symbols.tsx"
import { get } from "lib/indexed-kv.ts"

export class ColorMixer extends Component<{ class?: string }> {

    current: HTMLDialogElement | null = null

    #openDialog = (event: Event) => {
        event.stopPropagation()
        this.current?.show()
        this.current?.previousElementSibling?.setAttribute("aria-expanded", "true")
        addEventListener("click", this.#lightDismiss, { passive: true })
        addEventListener("keydown", this.#lightDismiss, { passive: true })
    }

    #lightDismiss = (event: Event) => {
        const dialog = this.current
        const target = event.target
        if (event.type === "click") {
            if (target && dialog && (target === dialog || (target instanceof Node && dialog.contains(target)))) return
            this.#closeDialog()
        } else if (event instanceof KeyboardEvent && event.key === "Escape") {
            this.#closeDialog()
        }
    }

    #closeDialog = () => {
        this.current?.close()
        this.current?.previousElementSibling?.setAttribute("aria-expanded", "false")
        removeEventListener("click", this.#lightDismiss)
    }

    #switchScheme = async () => {
        await this.update("UpdateColors", { scheme: "switch" })
        await this.update("SyncColors")
    }

    render(props: typeof this.props) {
        return <color-mixer class={css`display: contents;`}>
            <Symbols.Button
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
                <HueWheelInput aria-label="Hue wheel" class={css`grid-area: wheel;`}/>
                <Symbols.Button primary outline small onClick={this.#switchScheme} class={css`
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
                `}>
                    <span data-if-dark aria-hidden>light_mode</span>
                    <label data-if-dark>Light Mode</label>
                    <span data-if-light aria-hidden>dark_mode</span>
                    <label data-if-light>Dark Mode</label>
                </Symbols.Button>
                <Symbols.Button
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


class HueWheelInput extends Component<{ class?: string }> {

    current: HTMLInputElement | null = null

    componentDidMount() {
        const input = this.current!
        const options = { passive: true }
        const hue = document.documentElement.style.getPropertyValue("--base-hue")
        if (hue) input.value = hue
        if (import.meta.env.DEV) {
            get("color.hue").then(hue => {
                if (typeof hue === "number" && 0 <= hue && hue <= 359) {
                    input.value = String(hue)
                }
            })
        }
        input.addEventListener("input", this, options)
        input.addEventListener("change", this, options)
    }

    handleEvent(event: Event) {
        const input = this.current!
        const { type } = event
        if (type === "input") {
            let { value } = input
            if (value === "360") {
                /**
                 * Clockwise wraparound
                 */
                input.value = value = "0"
            } else if (value === "-4") {
                /**
                 * Counter-clockwise wraparound
                 */
                input.value = value = "356"
            }
            this.update("UpdateColors", { hue: Number.parseInt(value) })
        } else if (type === "change") {
            this.update("SyncColors")
        }
    }

    render(props: typeof this.props) {
        return <input
            {...props}
            type="range"
            min="-4"
            max="360"
            step="4"
            ref={this}
            class={cx(props.class, css`
            --wheel-size: 8rem;
            --thumb-size: 2.5rem;
            --hollow-mask: radial-gradient(
                circle farthest-side at center,
                transparent 74%,
                white 76%
            );
            outline: initial;
            margin: initial;
            background: initial;
            width: var(--wheel-size);
            transform:
                translate(var(--track-translate))
                rotate(calc(var(--base-hue) * 1deg))
                translate(var(--track-counter-translate), 0)
                scaleX(var(--widen-track));
            /**
             * Widening the track prevents pointer issues as the track
             * moves around underneath the pointer, which would cause
             * the input value to oscillate on every pointer movement.
             */
            --widen-track: 4;
            --max-track-translate: calc(var(--wheel-size) / 2 - var(--thumb-size) / 2);
            /**
             * At 0 degrees, the thumb will be on the left of the track.
             * At 360 degrees, it will be on the right.
             * It should appear in the center, so a "counter-translate"
             * is applied on the track to make the thumb appear in the
             * center. The transform moves the track to the right at 0
             * degrees, and to the left at 360 degrees.
             */
            --track-counter-translate: calc(
                (var(--base-hue) / 180 - 1) *
                var(--widen-track) *
                var(--max-track-translate) * -1
            );
            --track-translate:
                calc(sin(var(--base-hue) * 1deg) * var(--max-track-translate)),
                calc(cos(var(--base-hue) * 1deg) * var(--max-track-translate) * -1);
            &, &::-webkit-slider-container, &::-webkit-slider-runnable-track, &::-webkit-slider-thumb {
                appearance: none;
            }
            &::-webkit-slider-thumb {
                background-color: var(--primary);
                mask-image: var(--hollow-mask);
                border-radius: 50%;
                width: var(--thumb-size);
                aspect-ratio: 1;
                transition: background-color 250ms;
                scale: calc(1 / var(--widen-track)) 1;
            }
            &:not(:active)::-webkit-slider-thumb {
                cursor: grab;
            }
            &:active::-webkit-slider-thumb  {
                cursor: grabbing;
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
                border: initial;
                background-color: var(--primary);
                mask-image: var(--hollow-mask);
                border-radius: 50%;
                width: var(--thumb-size);
                height: var(--thumb-size);
                transition: background-color 250ms;
                scale: calc(1 / var(--widen-track)) 1;
            }
            &:not(:active)::-moz-range-thumb {
                cursor: grab;
            }
            &:active::-moz-range-thumb  {
                cursor: grabbing;
            }
        `)}/>
    }
}
