import { Component as PreactComponent, createRef } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { ClientWorld, type WorldData } from "game/world.client.ts"
import * as Store from "game/store.ts"
import { Component, WorldContext, type Events } from "./component.ts"
import { Game } from "./Game.tsx"
import { ExitPresence, type AnimatesOut } from "./ExitPresence.ts"
import { ColorMixer } from "./ColorMixer.tsx"
import * as Symbols from "./Symbols.tsx"
import { ActionButton } from "./ActionButton.tsx"

export function GameUISSR() {
    return <TitleScreen loading/>
}

export class GameUI extends PreactComponent {
    
    #world = ClientWorld.connect()

    componentDidMount() {
        Store.listen(this.#world.state, this)
    }

    componentWillUnmount() {
        Store.stopListening(this.#world.state, this)
    }
    
    // called when one of the stores used in render() gets updated
    handleEvent(event: Event) {
        if (event.type === "update") this.forceUpdate()
    }

    render() {
        const { state } = this.#world

        return <WorldContext.Provider value={this.#world}>
            <ExitPresence timeout={1000}>{
                state.connected === "connecting" ? <TitleScreen connecting/> :
                state.connected === "disconnected"  ? <TitleScreen/> :
                state.connected === "connectingtoworld" ? <TitleScreen connecting="toworld"/> :
                state.connected === "tolobby" ? <TitleScreen/> :
                state.connected === "toworld" ? <WaitingForOpponentScreen world={state.world.name}/> :
                state.connected === "togame" ? <Game {...state}/> : <></>
            }</ExitPresence>
            <ColorMixer class={css`place-self: end;`}/>
        </WorldContext.Provider>
    }
}

namespace TitleScreen {
    export interface Props {
        class?: string
        connecting?: true | "toworld"
        loading?: true
    }
}

class TitleScreen extends Component<TitleScreen.Props> implements AnimatesOut {
    
    handleEvent(event: Events.button.click) {
        if (event.currentTarget.dataset.new) {
            this.update("NewWorld")
        } else if (event.currentTarget.dataset.join) {
            const worldName = prompt("Enter world name")
            if (typeof worldName !== "string") return
            this.update("JoinWorld", { world: worldName.replace(" ", "-") })
        }
    }

    componentWillLeave(leave: () => void) {
        const upwards: Keyframe[] = [{}, { translate: "0 -10rem" }]
        const downwards: Keyframe[] = [{}, { translate: "0 5rem" } ]
        const fadeOut: Keyframe[] = [{}, { opacity: 0 }]
        
        // to prevent visual noise, we animate differently when in a loading state
        const leaveQuickly = this.props.connecting || this.props.loading
        
        if (!leaveQuickly) {
            const options = {
                duration: 750,
                // elastic in, ease out
                easing: "cubic-bezier(0.75, -0.75, 0.25, 1)"
            } as const satisfies KeyframeAnimationOptions

            for (const h1 of this.#titleText) {
                const element: HTMLHeadingElement = (h1 as any)._dom
                element.animate(upwards, options)
            }
            
            for (const button of this.#buttons) {
                const element: HTMLButtonElement = (button as any)._dom
                element.animate(downwards, options)
            }
        }

        const container = this.#base.current
        const animation = container!.animate(fadeOut, { duration: leaveQuickly ? 250 : 500 })
        animation.finished.then(leave)
    }

    #base = createRef<HTMLDivElement>()

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
    `}>{
        this.props.loading ? "loading" :
        this.props.connecting === true ? "connecting" :
        `connecting to world '${this.props.connecting?.replace("-", " ")}'`
    }</p>

    #buttons = [
        <ActionButton data-new onClick={this} primary>New Game</ActionButton>,
        <ActionButton data-join onClick={this} secondary>Join</ActionButton>
    ]

    render(props: typeof this.props) {
        return <title-screen class={cx(props.class, css`
            display: grid;
            transition: opacity 250ms;
        `)} ref={this.#base}>
            <h1 class={css`contain: strict;`}>TIC TAC TOE</h1>
            {this.#titleText}
            {props.loading || props.connecting ? this.#connecting : this.#buttons}
        </title-screen>
    }
}

namespace WaitingForOpponentScreen {
    export interface Props {
        class?: string
        world: WorldData["name"]
    }
}

class WaitingForOpponentScreen extends Component<WaitingForOpponentScreen.Props> {
    
    copy() {
        navigator.clipboard.writeText(this.props.world.replace(" ", "-"))
    }
    
    share() {
        navigator.share({
            title: "Tic Tac Toe",
            url: location.href
        }).catch(() => {})
    }

    render(props: typeof this.props) {
        return <waiting-screen class={cx(props.class, css`
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
        `)}>
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
                &:has(> *:nth-child(2)):not(:has(> *:nth-child(3))) {
                    grid-template-columns: auto 1fr;
                }
                &:has(> *:nth-child(3)) {
                    grid-template-columns: auto 1fr 1fr;
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
                `}>{props.world.replace("-", " ")}</h6>
                {"clipboard" in navigator && <Symbols.Button
                    icon="content_copy"
                    colors="on-secondary-container"
                    style="outline"
                    size="medium"
                    onClick={this.copy}
                />}
                {"share" in navigator && <Symbols.Button
                    icon="ios_share"
                    colors="on-secondary-container"
                    style="outline"
                    size="medium"
                    onClick={this.share}
                />}
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
        </waiting-screen>
    }
}
