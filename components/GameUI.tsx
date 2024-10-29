import { Component as PreactComponent, createRef, type JSX } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { ClientWorld } from "game/world.client.ts"
import { Store } from "game/store.ts"
import { Component, WorldContext, type Attributes } from "./component.ts"
import { Board } from "./Game.tsx"
import * as Icons from "./Icons.tsx"
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
    
    // called when one of the stores used in render() gets updated
    handleEvent() {
        this.forceUpdate()
    }
    
    render() {
        const Connection = Store.get(this.#world.state, "Connection")
        const Game = Store.get(this.#world.state, "Game")
        return <WorldContext.Provider value={this.#world}>
            <ExitPresence  timeout={1000}>{
                Connection === "connecting" ? <TitleScreen connecting/> :
                Connection === "connected" ? <TitleScreen/> :
                Connection === "waiting" ? <WaitingForOpponentScreen/> :
                Connection === "ingame" ?
                    <>
                        <Board/>
                        {
                            Game === "draw" ? <GameEndDialog draw/> :
                            Game === "victory" ? <GameEndDialog victory/> : <></>
                        }
                    </> : <></>
            }</ExitPresence>
            <ColorMixer class={css`place-self: end;`}/>
        </WorldContext.Provider>
    }
}

class ColorMixer extends Component<Attributes.div> {

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
                background: var(--primary-container);
                outline: solid 0.25rem var(--primary);
                transition-behavior: allow-discrete;
                transition-duration: 250ms;
                transition-property: background, display, opacity, outline, scale, translate;
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
namespace TitleScreen {
    export interface Props {
        connecting?: true
        loading?: true
    }
}

class TitleScreen extends Component<TitleScreen.Props> {
    
    new() {
        this.update("NewWorld")
    }

    join() {
        const worldName = prompt("Enter world name")
        if (typeof worldName !== "string") return
        this.update("JoinWorld", { world: worldName.replace(" ", "-") })
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
                element.animate([{}, { translate: "0 -10rem" }], { duration: 750, easing: "cubic-bezier(0.75, -0.75, 0.25, 1)" })
            }
            for (const button of this.#buttons) {
                const element: HTMLButtonElement = (button as any)._dom
                element.animate([{}, { translate: "0 5rem" } ], { duration: 750, easing: "cubic-bezier(0.75, -0.75, 0.25, 1)" })
            }
        }
        const div = this.#base.current
        const animation = div!.animate([{}, { opacity: 0 }], { duration: leaveQuickly ? 250 : 500 })
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

class WaitingForOpponentScreen extends Component<Attributes.p> {
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

namespace GameEndDialog {
    export type Props = 
        | { draw: true, victory?: undefined }
        | { draw?: undefined, victory: true }
}

class GameEndDialog extends Component<GameEndDialog.Props> {
    playAgain() {
        this.update("RequestRematch")
    }
    render(props: typeof this.props) {
        return <PopUp>
            <p>{ props.draw ? "Draw" : "You Win!" }</p>
            <ActionButton secondary onClick={this.playAgain}>Play Again</ActionButton>
        </PopUp>
    }
}

class PopUp extends Component<Attributes.dialog> {
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

namespace ActionButton {
    export interface Props extends Attributes.button {
        primary?: true
        secondary?: true    
    }
}

class ActionButton extends Component<ActionButton.Props> {
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
            padding: 0;
            line-height: 170%;
            border: none;
            transition: background 250ms, color 250ms, opacity 1s, outline-color 250ms, scale 250ms;
            outline-width: 0.25rem;
            outline-offset: 0.25rem;
            &:hover, &:active {
                outline-style: dashed;
            }
            &:focus-visible {
                outline-style: solid;
            }
            &:not([disabled]) {
                cursor: pointer;
                &:hover { scale: 1.1; }
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
