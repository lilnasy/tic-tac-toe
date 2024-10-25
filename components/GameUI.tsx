import { Component as PreactComponent, createRef, type JSX } from "preact"
import cx from "clsx/lite"
import { css } from "@acab/ecsstatic"
import { Component, WorldContext, type Attributes } from "./component.ts"
import { Board } from "./Game.tsx"
import * as Icons from "./Icons.tsx"
import { ClientWorld } from "game/world.client.ts"
import { Store } from "game/store.ts"
import { ExitPresence } from "./ExitPresence.tsx"

export function GameUISSR() {
    return <TitleScreen loading/>
}

export class GameUI extends PreactComponent {
    
    #world: ClientWorld
    
    constructor() {
        super()
        const url = new URL(location.href)
        url.protocol = url.protocol.replace("http", "ws")
        url.pathname = "/connect"
        this.#world = new ClientWorld(new WebSocket(url))
    }
    
    // called when the this.state entity is updated
    handleEvent() {
        this.forceUpdate()
    }
    
    render() {
        const Connection = Store.get(this.#world.state, "Connection")
        const Game = Store.get(this.#world.state, "Game")
        return <WorldContext.Provider value={this.#world}>
            <ExitPresence  timeout={1000}>{
                // true ? <><Board/><VictoryDialog/></> :
                Connection === "connecting" ? <TitleScreen connecting/> :
                Connection === "connected" ? <TitleScreen/> :
                Connection === "waiting" ? <WaitingForOpponentScreen/> :
                Connection === "ingame" ?
                    <>
                        <Board/>
                        {
                            Game === "draw" ? <DrawDialog/> :
                            Game === "victory" ? <VictoryDialog/> : <></>
                        }
                    </> : <></>
            }</ExitPresence>
            <ColorMixer class={css`place-self: end;`}/>
        </WorldContext.Provider>
    }
}

class ColorMixer extends Component<Attributes<"div">> {

    #colorWheelDialogRef = createRef<HTMLDialogElement>()

    #switchLightDark() {
        document.body.toggleAttribute("data-switch-color-scheme")
    }

    toggleColorWheel() {
        const dialog = this.#colorWheelDialogRef.current
        if (dialog?.open) dialog.close()
        else dialog?.show()
    }

    updateHue(event: PointerEvent) {
        /**
         * Schedule updating of hue for later to ensure that multiple
         * multiple pointer events dispatched in the same frame result
         * in only one update to `document`.
         */
        if (this.#pointer === undefined) requestAnimationFrame(this.#updateHue)
        this.#pointer = event
    }

    #pointer: PointerEvent | undefined

    #updateHue = () => {
        if (!this.#pointer) return
        const rect = this.#colorWheelDialogRef.current!.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const { x , y } = this.#pointer!
        const radians = Math.atan2(centerY - y, x - centerX);
        const updatedBaseHue = Math.round(90 - (180 / Math.PI) * radians)
        document.documentElement.style.setProperty("--base-hue", String(updatedBaseHue))
        this.#pointer = undefined
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
                background: var(--primary-container);
                outline: solid 0.25rem var(--primary);
                transition-property: background, outline, scale, translate;
                transition-duration: 250ms;
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
                <ColorMixerButton class={css`grid-area: 1/1;`} Icon={Icons.InvertColors} onClick={this.#switchLightDark}/>
                <input type="range" ref={input => new RangeInputController(input!, this, "updateHue")} class={css`
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

interface ColorMixerButtonProps extends Attributes<"button"> {
    Icon: typeof Icons[keyof typeof Icons]
}

class ColorMixerButton extends Component<ColorMixerButtonProps> {
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
            <props.Icon class={css`
                height: 2rem;
                width: 2rem;
                fill: var(--fill);
                transition: fill 250ms;
            `}/>
        </button>
    }
}

class RangeInputController<Method extends string, Receiver extends Record<Method, (e: PointerEvent) => unknown>> {
    #element: HTMLInputElement
    #receiver: Receiver
    #method: Method
    #ac: AbortController | undefined
    constructor(element: HTMLInputElement, receiver: Receiver, method: Method) {
        element.addEventListener("pointerdown", this)
        this.#element = element
        this.#receiver = receiver
        this.#method = method
    }
    handleEvent(event: Event) {
        if (event instanceof PointerEvent === false) return
        const input = this.#element
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
        } else if (type === "pointermove") {
            this.#receiver[this.#method](event)
        }
    }
}

interface TitleScreenProps {
    connecting?: true
    loading?: true
}

class TitleScreen extends Component<TitleScreenProps> {
    
    new() {
        this.send("NewWorld")
    }

    join() {
        const worldName = prompt("Enter world name")
        if (typeof worldName !== "string") return
        this.send("JoinWorld", { world: worldName.replace(" ", "-") })
    }

    #titleText = ["TIC", "TAC", "TOE"].map((text, i) => <h1 class={css`
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

    #connecting = <p class={css`
        height: 8rem;
        margin: 0;
        text-align: center;
        color: var(--primary);
        transition: opacity 250ms 250ms;
        @starting-style { opacity: 0; }
        &:after {
            display: inline-block;
            width: 0;
            animation: ellipsis linear 3s infinite;
            content: "";
        }
    `}>{this.props.loading ? "loading" : "connecting"}</p>

    #buttons = [
        <ActionButton onClick={this.new} primary>New Game</ActionButton>,
        <ActionButton onClick={this.join} secondary>Join</ActionButton>
    ]

    #base = createRef<HTMLDivElement>()

    componentWillLeave(leave: () => void) {        
        // we dont want to spend too much time in animations if
        // a shared link to a world was opened, in which case,
        // the buttons will not even have been rendered yet
        const leaveQuickly = this.props.connecting || this.props.loading
        if (!leaveQuickly) {
            for (const h1 of this.#titleText) {
                const element: HTMLHeadingElement = (h1 as any)._dom
                element.animate([{}, { translate: "0 -10rem" }], { duration: 1000, easing: "cubic-bezier(0.5, -0.5, 0.25, 1)" })
            }
            for (const button of this.#buttons) {
                const element: HTMLButtonElement = (button as any)._dom
                element.animate([{}, { translate: "0 5rem" } ], { duration: 1000, easing: "cubic-bezier(0.5, -0.5, 0.25, 1)" })
            }
        }
        const div = this.#base.current
        const animation = div!.animate([{}, { opacity: 0 }], { duration: leaveQuickly ? 250 : 750 })
        animation.finished.then(leave)
    }

    shouldComponentUpdate() {
        return true
    }

    render(props: typeof this.props) {
        return <div class={css`
            display: grid;
            transition: opacity 250ms;
        `} ref={this.#base}>
            <h1 class={css`contain: strict;`}>TIC TAC TOE</h1>
            {this.#titleText}
            {props.loading || props.connecting ? this.#connecting : this.#buttons}
        </div>
    }
}

class WaitingForOpponentScreen extends Component<Attributes<"p">> {
    render(props: typeof this.props) {
        return <p {...props} class={cx(props.class, css`
            color: var(--primary);
            transition: opacity 250ms 250ms;
            @starting-style { opacity: 0; }
            &:after {
                display: inline-block;
                width: 0;
                animation: ellipsis linear 3s infinite;
                content: "";
            }
        `)}>waiting for the other player</p>
    }
}

class DrawDialog extends Component {
    render() {
        return <PopUp>
            <p>Draw</p>
            <ActionButton secondary>Play Again</ActionButton>
        </PopUp>
    }
}

class VictoryDialog extends Component {
    render() {
        return <PopUp>
            <p>You Win</p>
            <ActionButton secondary>Play Again</ActionButton>
        </PopUp>
    }
}

class PopUp extends Component<Attributes<"dialog">> {
    #ref = createRef<HTMLDialogElement>()
    componentDidMount() {
        this.#ref.current?.showModal()
    }
    componentWillUnmount() {
        this.#ref.current?.close()
    }
    render(props: typeof this.props) {
        return <dialog {...props} ref={this.#ref} class={css`
            &[open] {
                display: grid;
            }
            place-items: center;
            width: min(20rem, 100dvw);
            background: var(--secondary-container);
            color: var(--on-secondary-container);
            transition-property: opacity, translate;
            transition-duration: 1s;
            @starting-style {
                opacity: 0;
                translate: 0 4rem;
            }
            &::backdrop {
                background: light-dark(oklch(20% 0 0 / .2), oklch(90% 0 0 / .3));
                backdrop-filter: blur(0.5rem);
                transition: background 1s, backdrop-filter 250ms;
                @starting-style {
                    background: transparent;
                    backdrop-filter: blur(0);
                }
            }
        `}/>
    }
}

interface ButtonProps extends Attributes<"button"> {
    primary?: true
    secondary?: true
}

class ActionButton extends Component<ButtonProps> {
    #ref = createRef<HTMLButtonElement>()
    componentDidMount() {
        this.#ref.current?.addEventListener("click", this)
    }
    handleEvent(event: JSX.TargetedMouseEvent<HTMLButtonElement>) {
        event.currentTarget.animate(
            [{}, { scale: 0.9 }, {}],
            { duration: 250, easing: "cubic-bezier(0.5, 0.5, 0.5, 1.5)" }
        )
    }
    render({ primary, secondary, ...props }: typeof this.props) {
        return <button {...props} ref={this.#ref} class={cx(props.class, css`
            font-family: inherit;
            font-size: inherit;
            height: 3rem;
            width: 8rem;
            border-radius: 1.5rem;
            margin: 0.5rem;
            line-height: 3.4rem;
            border: none;
            transition: background 250ms, color 250ms, opacity 1s, outline-color 250ms, outline-style 250ms, outline-offset 250ms, scale 250ms;
            outline: dashed 0.25rem;
            outline-offset: -0.25rem;
            &:hover, &:active, &:focus-visible {
                outline-offset: 0.25rem;
            }
            &:focus-visible {
                outline-style: solid;
            }
            &:not([disabled]) {
                cursor: pointer;
                &:hover {
                    scale: 1.1;
                }
            }
            @starting-style { opacity: 0; }
        `, primary && css`
            background: var(--primary);
            outline-color: var(--primary);
            color: var(--on-primary);
        `, secondary && css`
            background: var(--secondary);
            outline-color: var(--secondary);
            color: var(--on-secondary);
        `)}/>
    }
}
