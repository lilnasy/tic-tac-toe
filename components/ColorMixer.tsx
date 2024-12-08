import { createRef } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component } from "./component.ts"
import * as Symbols from "./Symbols.tsx"


export class ColorMixer extends Component<{ class?: string }> {

    #dialogRef = createRef<HTMLDialogElement>()

    #openCloseDialog = () => {
        const dialog = this.#dialogRef.current
        if (dialog?.open) dialog.close()
        else dialog?.show()
    }

    #switchScheme = async () => {
        await this.update("UpdateColors", { scheme: "switch" })
        await this.update("SyncColors")
    }

    render(props: typeof this.props) {
        return <color-mixer class={css`display: contents;`}>
            <Symbols.Button
                icon="palette"
                filled-on-hover
                primary
                large
                onClick={this.#openCloseDialog}
                class={props.class}
            />
            <dialog ref={this.#dialogRef} class={cx(props.class, css`
                position: static;
                &[open] {
                    display: grid;
                }                
                grid-template-areas:
                    "wheel wheel"
                    "switch close";
                place-items: center;
                gap: 0.5rem;
                background-color: var(--secondary-container);
                border: none;
                padding: 0.5rem;
                --reveal: 15rem;
                clip-path: circle(var(--reveal) at 85% 88%);
                border-radius: 1rem;
                filter: var(--drop-shadow);
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
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Hue wheel track" class={css`
                    grid-area: wheel;
                    pointer-events: none;
                    width: 8rem;
                    aspect-ratio: 1;
                    margin: 0.5rem;
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
                <HueWheelThumb class={css`grid-area: wheel;`}/>
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
                    :root:not([data-light]):not([data-dark]) {
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
                    filled-on-hover
                    primary
                    small
                    onClick={this.#openCloseDialog}
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
    #ref = createRef<HTMLInputElement>()
    #ac: AbortController | undefined

    componentDidMount() {
        this.#ref.current!.addEventListener("pointerdown", this)
    }

    handleEvent(event: Event) {
        if (event instanceof PointerEvent === false) return
        const input = this.#ref.current!
        const { type } = event
        if (type === "pointerdown") {
            const ac = this.#ac ??= new AbortController
            const options = { signal: ac.signal }
            addEventListener("pointermove", this, options)
            addEventListener("pointerup", this, options)
            addEventListener("pointercancel", this, options)
            addEventListener("pointerleave", this, options)
            input.toggleAttribute("data-grabbing", true)
        } else if (
            type === "pointerup" ||
            type === "pointercancel" ||
            type === "pointerleave"
        ) {
            this.#ac?.abort()
            this.#ac = undefined
            input.toggleAttribute("data-grabbing", false)
            this.update("SyncColors")
        } else if (type === "pointermove") {
            /**
             * Schedule updating of hue for later to ensure that multiple
             * multiple pointer events dispatched in the same frame result
             * in only one update to `document`.
             */
            if (this.#pointer === undefined) requestAnimationFrame(this.#updateHue)
            this.#pointer = event
        }
    }

    #pointer: PointerEvent | undefined

    #updateHue = () => {
        if (!this.#pointer) return
        const input = this.#ref.current!
        const wheel = input.previousElementSibling!.getBoundingClientRect()
        const centerX = wheel.left + wheel.width / 2
        const centerY = wheel.top + wheel.height / 2
        const { x , y } = this.#pointer!
        const radians = Math.atan2(centerY - y, x - centerX);
        const updatedBaseHue = Math.round(90 - (180 / Math.PI) * radians)
        input.value = String(updatedBaseHue)
        this.update("UpdateColors", { hue: updatedBaseHue })
        this.#pointer = undefined
    }

    render(props: typeof this.props) {
        return <input type="range" min="0" max="360" ref={this.#ref} class={cx(props.class, css`
            --size: 2.5rem;
            --donut: radial-gradient(
                circle farthest-side at center,
                transparent 74%,
                white 76%,
                white 98%,
                transparent 100%
            );
            background: transparent;
            touch-action: none;
            translate:
                calc(sin(var(--base-hue) * 1deg) * 2.75rem)
                calc(cos(var(--base-hue) * 1deg) * -2.75rem);
            &, &::-webkit-slider-container, &::-webkit-slider-runnable-track, &::-webkit-slider-thumb {
                appearance: none;
                height: var(--size);
                width: var(--size);
            }
            &::-moz-range-progress, &::-moz-range-track, &::-moz-range-thumb {
                appearance: none;
                height: var(--size);
                width: var(--size);
            }
            &::-webkit-slider-thumb {
                position: absolute;
                background: var(--primary);
                transition: background 250ms;
                cursor: grab;
                mask-image: var(--donut);
            }
            &::-moz-range-thumb {
                position: absolute;
                background: var(--primary);
                transition: background 250ms;
                cursor: grab;
                mask-image: var(--donut);
            }
            &[data-grabbing]::-webkit-slider-thumb  {
                cursor: grabbing;
            }
            &[data-grabbing]::-moz-range-thumb {
                cursor: grabbing;
            }
        `)}/>
    }
}
