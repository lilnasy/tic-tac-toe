import { createRef } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component, type Attributes } from "./component.ts"
import * as Icons from "./Icons.tsx"

export class ColorMixer extends Component<Attributes.div> {

    #colorWheelDialogRef = createRef<HTMLDialogElement>()

    switchScheme() {
        document.body.toggleAttribute("data-switch-color-scheme")
        this.update("ColorsUpdated")
    }

    toggleColorWheel() {
        const dialog = this.#colorWheelDialogRef.current
        if (dialog?.open) dialog.close()
        else dialog?.show()
    }

    render(props: typeof this.props) {
        return <div {...props} class={cx(props.class, css`
            display: grid;
            grid:
                "a b"
                "c d";
            margin: 1rem;
            transition: opacity 250ms;
            @starting-style { opacity: 0; }
        `)}>
            <ColorMixerButton class={css`grid-area: d;`} Icon={Icons.Palette} onClick={this.toggleColorWheel}/>
            <dialog ref={this.#colorWheelDialogRef} class={css`
                &[open] {
                    display: grid;
                }
                grid-area: a;
                position: static;
                width: 10rem;
                height: 10rem;
                background-color: var(--primary-container);
                outline: solid 0.25rem;
                outline-color: var(--primary);
                transition-behavior: allow-discrete;
                transition-duration: 250ms;
                transition-property: background-color, display, opacity, outline-color, scale, translate;
                place-items: center;
                border: none;
                margin: 0;
                padding: 0;
                @starting-style {
                    opacity: 0;
                    scale: 0.75;
                    translate: 3rem 3rem;
                }
                &:not([open])  {
                    opacity: 0;
                    scale: 0.75;
                    translate: 3rem 3rem;
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
                <ColorMixerButton class={css`grid-area: 1 / 1;`} Icon={Icons.InvertColors} onClick={this.switchScheme}/>
                <HueWheelThumb class={css`grid-area: 1 / 1;`}/>
            </dialog>
        </div>
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
            this.update("ColorsUpdated")
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
                mask-image: radial-gradient(circle farthest-side at center, transparent 74%, white 76%, white 98%, transparent 100%);
            }
            &::-moz-range-thumb {
                position: absolute;
                background: var(--primary);
                transition: background 250ms;
                cursor: grab;
                mask-image: radial-gradient(circle farthest-side at center, transparent 74%, white 76%, white 98%, transparent 100%);
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

namespace ColorMixerButton {
    export interface Props extends Attributes.button {
        Icon: typeof Icons[keyof typeof Icons]
    }
}

class ColorMixerButton extends Component<ColorMixerButton.Props> {
    render(props: typeof this.props) {
        return <button {...props} class={cx(props.class, css`
            &:not([disabled]) {
                cursor: pointer;
            }
            &:not(:hover) {
                background: none;
                --fill: var(--primary)
            }
            &:hover {
                background: var(--primary);
                --fill: var(--on-primary);
            }
            transition: background 250ms;
            border: none;
            padding: 0;
            border-radius: 1.5rem;
            height: 3rem;
            width: 3rem;
        `)}>
            <props.Icon aria-hidden class={css`
                height: 2rem;
                width: 2rem;
                fill: var(--fill);
                transition: fill 250ms;
            `}/>
        </button>
    }
}
