import { Component as PreactComponent, createRef, type JSX } from "preact"
import { css } from "astro:emotion"
import { Component, WorldContext } from "./component.ts"
import { Board } from "./Game.tsx"
import * as Icons from "./Icons.tsx"
import { ClientWorld } from "game/client.ts"
import { Store } from "game/store.ts"
import type { Entity } from "game/entity.ts"
import { ExitPresence } from "./ExitPresence.tsx"

export class GameUI extends PreactComponent {
    
    state: Entity<"Connection">
    
    world: ClientWorld
    
    constructor() {
        super()
        const url = new URL(location.href)
        url.protocol = url.protocol.replace("http", "ws")
        url.pathname = "/connect"
        const websocket = new WebSocket(url)
        const world = this.world = new ClientWorld(websocket)
        this.state = world.spawnEntity({ Connection: "pending" })
        Store.listen(this.state, this)
    }
    
    // called when the this.state entity is updated
    handleEvent() {
        this.forceUpdate()
    }
    
    componentWillUnmount() {
        Store.stopListening(this.state, this)
    }
    
    render() {
        const { Connection } = this.state
        return <WorldContext.Provider value={this.world}>
            <ExitPresence timeout={300}>{
                Connection === "pending" ? <TitleScreen connecting/> :
                Connection === "connected" ? <TitleScreen/> :
                Connection === "ready" ? <WaitingForOpponentScreen/> :
                Connection === "ingame" ? <Board/> : <></>
            }</ExitPresence>
            <ColorMixer class={css`place-self: end;`}/>
        </WorldContext.Provider>
    }
}

class ColorMixer extends Component<JSX.HTMLAttributes<HTMLDivElement>> {

    colorWheelDialogRef = createRef<HTMLDialogElement>()

    switchLightDark() {
        document.documentElement.toggleAttribute("data-dark")
    }

    toggleColorWheel() {
        const dialog = this.colorWheelDialogRef.current
        if (dialog?.open) dialog.close()
        else dialog?.show()
    }

    onColorWheelThumbMove = ({ x, y }: PointerEvent) => {
        const rect = this.colorWheelDialogRef.current!.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const radians = Math.atan2(centerY - y, x - centerX);
        ColorMixer.#updatedBaseHue = Math.round(90 - (180 / Math.PI) * radians)
        requestAnimationFrame(ColorMixer.#updateBaseHue)
    }

    static #updatedBaseHue: number | undefined = undefined

    static #updateBaseHue() {
        /**
         * This check ensures that multiple invocations of this function
         * within the same frame result in only one update to `document`.
         */
        if (ColorMixer.#updatedBaseHue) {
            document.documentElement.style.setProperty("--base-hue", String(ColorMixer.#updatedBaseHue))
            ColorMixer.#updatedBaseHue = undefined
        }
    }

    render() {
        return <div {...this.props} class={[this.props.class, css`
            display: grid;
            grid:
                "a b"
                "c d";
            margin: 1rem;
        `].filter(Boolean).join(" ")}>
            <ColorMixerButton class={css`grid-area: d;`} Icon={Icons.Palette} onClick={this.toggleColorWheel}/>
            <dialog ref={this.colorWheelDialogRef} class={css`
                grid-area: a;
                position: static;
                width: 10rem;
                height: 10rem;
                background: var(--primary-container);
                outline: solid 0.25rem var(--primary);
                transition-property: background, outline, scale, translate;
                transition-duration: 250ms;
                &[open] {
                    display: grid;
                }
                place-items: center;
                border: none;
                margin: 0;
                padding: 0;
                @starting-style {
                    scale: 0.75;
                    translate: 3rem 3rem;
                }
            `}>
                <div class={css`
                    grid-area: 1 / 1;
                    pointer-events: none;
                    height: 80%;
                    width: 80%;
                    background: conic-gradient(in oklch longer hue, oklch(0.7 0.15 0),oklch(0.7 0.15 360));
                    mask-image: radial-gradient(circle farthest-side at center, transparent 36%, white 38%, white 98%, transparent 100%);
                `}/>
                <ColorMixerButton class={css`grid-area: 1/1;`} Icon={Icons.InvertColors} onClick={this.switchLightDark}/>
                <GrabbableRangeInput onMove={this.onColorWheelThumbMove} class={css`
                    grid-area: 1 / 1;
                    --size: 2.5rem;
                    background: transparent;
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
                `}/>
            </dialog>
        </div>
    }
}

interface ColorMixerButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
    Icon: typeof Icons[keyof typeof Icons]
}

class ColorMixerButton extends Component<ColorMixerButtonProps> {
    render() {
        return <button {...this.props} class={[this.props.class, css`
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
        `].filter(Boolean).join(" ")}>
            <this.props.Icon class={css`
                height: 2rem;
                width: 2rem;
                fill: var(--fill);
                transition: fill 250ms;
            `}/>
        </button>
    }
}

interface GrabbableRangeInputProps extends JSX.HTMLAttributes<HTMLInputElement> {
    onMove(event: PointerEvent): unknown
}

class GrabbableRangeInput extends Component<GrabbableRangeInputProps> {
    #ref = createRef<HTMLInputElement>()
    #ac: AbortController | undefined = undefined
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
            document.addEventListener("pointermove", this, options)
            document.addEventListener("pointerup", this, options)
            document.addEventListener("pointercancel", this, options)
            document.addEventListener("pointerleave", this, options)
            input.toggleAttribute("data-grabbing", true)
        } else if (
            type === "pointerup" ||
            type === "pointercancel" ||
            type === "pointerleave"
        ) {
            this.#ac?.abort()
            this.#ac = undefined
            input.toggleAttribute("data-grabbing", false)
        } else if (type === "pointermove") {
            this.props.onMove(event)
        }
    }
    render() {
        return <input {...this.props} type="range" ref={this.#ref}/>
    }
}

interface TitleScreenProps extends JSX.HTMLAttributes<HTMLDivElement> {
    connecting?: true
}

class TitleScreen extends Component<TitleScreenProps> {
    
    new() {
        this.world.update("NewWorld", true)
    }

    join() {
        const worldName = prompt("Enter world name")
        if (typeof worldName !== "string") return
        this.world.update("JoinWorld", { world: worldName.replace(" ", "-") })
    }

    titleText = ["TIC", "TAC", "TOE"].map((text, i) => <h1 class={css`
        font-weight: 400;
        font-size: 5rem;
        text-align: center;
        color: var(--primary);
        line-height: 5rem;
        margin: 0;
        pointer-events: none;
        transition:
            color 250ms,
            translate 1s var(--stagger),
            opacity 1s var(--stagger);
        @starting-style {
            translate: 0 3rem;
            opacity: 0;
        }
    `} aria-hidden style={{ "--stagger": `${i * 250}ms` }}>{text}</h1>)

    connecting = <p class={css`
        height: 8rem;
        margin: 0;
        font-size: 2rem;
        color: var(--primary);
        transition: opacity 250ms 250ms;
        @starting-style { opacity: 0; }
        &:after {
            display: inline-block;
            width: 0;
            animation: ellipsis linear 3s infinite;
            content: "";
        }
    `}>connecting</p>

    buttons = [
        { children: "New Game", onClick: this.new, "data-primary": true },
        { children: "Join", onClick: this.join, "data-secondary": true }
    ].map(props => <button {...props} class={css`
        font-family: inherit;
        height: 3rem;
        width: 8rem;
        font-size: 2rem;
        border-radius: 1.5rem;
        margin: 0.5rem;
        line-height: 3.4rem;
        border: none;
        transition: background 250ms, color 250ms, opacity 1s, scale 250ms;
        &[data-primary] {
            background: var(--primary);
            color: var(--on-primary);
        }
        &[data-secondary] {
            background: var(--secondary);
            color: var(--on-secondary);
        }
        &:not([disabled]) { cursor: pointer; }
        &:not([disabled]):hover { scale: 1.1; }
        @starting-style { opacity: 0; }
    `}></button>)

    #base = createRef<HTMLDivElement>()

    componentWillLeave(leave: () => void) {
        const div = this.#base.current
        div?.toggleAttribute("data-leaving", true)
        div?.addEventListener("transitionend", leave, { once: true })
    }

    shouldComponentUpdate() {
        return true
    }

    render() {
        return <div {...this.props} class={[this.props.class, css`
            display: grid;
            transition: opacity 250ms;
            &[data-leaving] {
                opacity: 0;
            }
        `].filter(Boolean).join(" ")} ref={this.#base}>
            <h1 class={css`contain: strict;`}>TIC TAC TOE</h1>
            {this.titleText}
            {this.props.connecting ? this.connecting : this.buttons}
        </div>
    }
}

class WaitingForOpponentScreen extends Component<JSX.HTMLAttributes<HTMLParagraphElement>> {
    render() {
        return <p {...this.props} class={[this.props.class, css`
            font-size: 2rem;
            color: var(--primary);
            transition: opacity 250ms 250ms;
            @starting-style { opacity: 0; }
            &:after {
                display: inline-block;
                width: 0;
                animation: ellipsis linear 3s infinite;
                content: "";
            }
        `].filter(Boolean).join(" ")}>waiting for the other player</p>
    }
}
