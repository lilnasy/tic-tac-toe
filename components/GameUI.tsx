import { Component as PreactComponent, createRef, type JSX } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { ClientWorld } from "game/world.client.ts"
import { Store } from "game/store.ts"
import { Component, WorldContext, type Attributes } from "./component.ts"
import { Board } from "./Game.tsx"
import { ExitPresence } from "./ExitPresence.tsx"
import { ColorMixer } from "./ColorMixer.tsx"
import * as Icon from "./Icons.tsx"

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
        const { state } = this.#world
        Store.get(state, "connection")
        return <WorldContext.Provider value={this.#world}>
            <ExitPresence  timeout={1000}>{
                state.connection === "connecting" ? <TitleScreen connecting/> :
                state.connection === "disconnected" ? <TitleScreen connecting/> :
                state.connection === "ingame" ?
                    state.game.state === "inlobby" ? <TitleScreen/> :
                    state.game.state === "waiting" ? <WaitingForOpponentScreen name={state.game.world.name}/> :
                    state.game.state === "active" ? <Board/> :
                    state.game.state === "draw" ? <><Board/><GameEndDialog draw/></> :
                    state.game.state === "victory" ? <><Board/><GameEndDialog victory={state.game.winner}/></> : <></>
                : <></>
            }</ExitPresence>
            <ColorMixer class={css`place-self: end;`}/>
        </WorldContext.Provider>
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

namespace WaitingForOpponentScreen {
    export interface Props {
        name: string
    }
}

class WaitingForOpponentScreen extends Component<WaitingForOpponentScreen.Props> {
    copy() {
        navigator.clipboard.writeText(this.props.name.replace(" ", "-"))
    }
    share() {
        navigator.share({
            title: "Tic Tac Toe",
            url: location.href
        }).catch(() => {})
    }
    render({ name }: typeof this.props) {
        return <div class={css`
            display: grid;
            place-items: center;
            grid-template-areas:
                "a b c"
                "d d d"
                "e f g";
            grid-template-columns: 1fr 16rem 1fr;
            row-gap: 1rem;
            transition: opacity 250ms 250ms;
            @starting-style { opacity: 0; }
        `}>
            <p class={css`
                grid-area: b;
                color: var(--primary);
                transition: color 250ms;
                margin: 0;
                text-align: center;
                line-height: 120%;
            `}>Share this code with a friend to play against them.</p>
            <div class={css`
                grid-area: d;
                display: grid;
                place-items: center;
                &:has(> *:nth-child(3)) {
                    grid-template-columns: auto 1fr 1fr;
                }
                &:has(> *:nth-child(2)) {
                    grid-template-columns: auto 1fr;
                }
                column-gap: 1rem;
                border-radius: 1rem;
                padding: 1rem;
                outline: 2px solid var(--on-secondary-container);
                background-color: var(--secondary-container);
                color: var(--on-secondary-container);
                transition: outline-color 250ms, background-color 250ms;
            `}>
                <h6 class={css`
                    text-align: center;
                    font-size: 3rem;
                    font-weight: inherit;
                    margin: 0;
                    transition: color 250ms;
                `}>{name.replace("-", " ")}</h6>
                {/** @ts-expect-error */ navigator.clipboard && <Icon.Button outline on-secondary-container class={css`--icon-size: 1.5rem;`} onClick={this.copy}><Icon.Copy/></Icon.Button>}
                {navigator.share && <Icon.Button outline on-secondary-container class={css`--icon-size: 1.5rem;`} onClick={this.share}><Icon.Share/></Icon.Button>} 
            </div>
            <p class={css`
                grid-area: f;
                color: var(--primary);
                margin: 0;
                transition: color 250ms;
                &:after {
                    display: inline-block;
                    width: 0;
                    animation: ellipsis linear 3s infinite;
                    content: "";
                }
            `}>waiting for the other player</p>
        </div>
    }
}

namespace GameEndDialog {
    export type Props = 
        | { draw: true, victory?: undefined }
        | { draw?: undefined, victory: "X" | "O" }
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
            border-radius: 1rem;
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
