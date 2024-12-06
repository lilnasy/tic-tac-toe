import { createRef } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component, type Attributes } from "./component.ts"
import * as Symbols from "./Symbols.tsx"


export class ColorMixer extends Component<Attributes> {

    #colorWheelDialogRef = createRef<HTMLDialogElement>()

    #switchScheme = async () => {
        await this.update("UpdateColors", { scheme: "switch" })
        await this.update("SyncColors")
    }

    #toggleColorWheel = () => {
        const dialog = this.#colorWheelDialogRef.current
        if (dialog?.open) dialog.close()
        else dialog?.show()
    }

    render(props: typeof this.props) {
        return <color-mixer {...props} class={cx(props.class, css`
            display: grid;
            grid: "a" "b";
            margin: 1rem;
            border-radius: 1rem;
            background-color: transparent;
            &:has(dialog[open]) {
                background-color: var(--secondary-container);
            }
            filter: var(--drop-shadow);
            transition-property: background-color, filter, opacity;
            transition-duration: 250ms;
            isolation: isolate;
            @starting-style { opacity: 0; }
        `)}>
            <Symbols.Button
                icon="palette"
                style="filled-on-hover"
                colors="primary"
                size="large"
                onClick={this.#toggleColorWheel}
                class={css`
                    grid-area: b;
                    place-self: end;
                    display: revert-layer;
                    color-mixer:has(dialog[open]) > & {
                        display: none;
                    }
                `}
            />
            <Symbols.Button
                icon="close"
                style="filled-on-hover"
                colors="primary"
                size="large"
                onClick={this.#toggleColorWheel}
                class={css`
                    grid-area: b;
                    place-self: end;
                    display: none;
                    color-mixer:has(dialog[open]) > & {
                        display: revert-layer;
                    }
                `}
            />
            <dialog ref={this.#colorWheelDialogRef} class={css`
                &[open] {
                    display: grid;
                }
                grid-area: a;
                position: static;
                width: 10rem;
                height: 10rem;
                background-color: transparent;
                transition-behavior: allow-discrete;
                transition-duration: 250ms;
                transition-property: background-color, display, opacity, scale, translate;
                place-items: center;
                border: none;
                margin: 0;
                padding: 0;
                @starting-style {
                    opacity: 0;
                    scale: 0.75;
                    translate: 0 3rem;
                }
                &:not([open])  {
                    opacity: 0;
                    scale: 0.75;
                    translate: 0 3rem;
                }
            `}>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Hue wheel track" class={css`
                    grid-area: 1 / 1;
                    pointer-events: none;
                    height: 8rem;
                    width: 8rem;
                    background-image: conic-gradient(in oklch longer hue, oklch(0.7 0.15 0),oklch(0.7 0.15 360));
                    mask-image: radial-gradient(circle farthest-side at center, transparent 36%, white 38%, white 98%, transparent 100%);
                `}/>
                <Symbols.Button
                    icon="invert_colors"
                    style="filled-on-hover"
                    colors="primary"
                    size="large"
                    class={css`grid-area: 1 / 1;`}
                    onClick={this.#switchScheme}
                />
                <HueWheelThumb class={css`grid-area: 1 / 1;`}/>
            </dialog>
        </color-mixer>
    }
}


class HueWheelThumb extends Component<Attributes.input> {
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
            --donut: radial-gradient(circle farthest-side at center, transparent 74%, white 76%, white 98%, transparent 100%);
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
