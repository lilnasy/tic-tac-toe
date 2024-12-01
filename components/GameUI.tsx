import { createRef, type RenderableProps } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { ClientWorld, type WorldData } from "game/world.client.ts"
import { Component, WorldContext } from "./component.ts"
import { Game } from "./Game.tsx"
import { ExitPresence, type AnimatesOut } from "./ExitPresence.ts"
import { ColorMixer } from "./ColorMixer.tsx"
import * as Symbols from "./Symbols.tsx"
import { ActionButton } from "./ActionButton.tsx"

export function GameUISSR() {
    return <LoadingScreen text="loading"/>
}

export function GameUI() {
    const world = ClientWorld.connect()
    return <WorldContext.Provider value={world}>
        <ScreenRouter world={world}/>
        <ColorMixer class={css`place-self: end;`}/>
    </WorldContext.Provider>
}

function ScreenRouter({ world }: { world: ClientWorld }) {

    const { state } = world

    return <ExitPresence timeout={1000}>{

        state.connected === "connecting" ?
            <LoadingScreen text="connecting"/> :

        state.connected === "disconnected" ?
            <LoadingScreen text="disconnected"/> :

        state.connected === "connectingtoworld" ?
            <LoadingScreen text={`connecting to ${state.world.name.replace("-", " ")}`}/> :

        state.connected === "tolobby" ?
            <TitleScreen/> :

        state.connected === "toworld" ?
            <WaitingForOpponentScreen world={state.world.name}/> :

        state.connected === "togame" ?
            <Game state={state}/> : <></>

    }</ExitPresence>
}

namespace LoadingScreen {
    export interface Props {
        class?: string
        text: string
    }
}

function LoadingScreen(props: RenderableProps<LoadingScreen.Props>) {
    return <loading-screen class={css`
        display: grid;
        transition: opacity 250ms;
        @starting-style {
            opacity: 0;
        }
    `}>
        <TitleText/>
        <p class={css`
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
        `}>{props.text}</p>
    </loading-screen>
}

class TitleScreen extends Component implements AnimatesOut {
    
    #container = createRef<HTMLDivElement>()

    #newWorld = () => this.update("NewWorld")

    #joinWorld = () => {
        const worldName = prompt("Enter world name")
        if (typeof worldName !== "string") return
        this.update("JoinWorld", { world: worldName.replace(" ", "-") })
    }

    componentWillLeave(leave: () => void) {
        const upwards: Keyframe[] = [{}, { translate: "0 -10rem" }]
        const downwards: Keyframe[] = [{}, { translate: "0 5rem" } ]
        const fadeOut: Keyframe[] = [{}, { opacity: 0 }]
        
        // to prevent visual noise, we animate differently when in a loading state
        const leaveQuickly = false
        const container = this.#container.current
        
        if (!leaveQuickly) {
            const options: KeyframeAnimationOptions = {
                duration: 750,
                // elastic in, ease out
                easing: "cubic-bezier(0.75, -0.75, 0.25, 1)"
            }

            for (const element of container!.querySelectorAll("h1")) {
                element.animate(upwards, options)
            }
            
            for (const button of container!.querySelectorAll("button")) {
                button.animate(downwards, options)
            }
        }

        const animation = container!.animate(fadeOut, { duration: leaveQuickly ? 250 : 500 })
        animation.finished.then(leave)
    }

    render() {
        return <title-screen class={css`
            display: grid;
            transition: opacity 250ms;
        `} ref={this.#container}>
            <TitleText/>
            <ActionButton onClick={this.#newWorld} primary>New Game</ActionButton>
            <ActionButton onClick={this.#joinWorld} secondary>Join</ActionButton>
        </title-screen>
    }
}

function TitleText() {
    return <>
        <h1 class={css`contain: strict;`}>TIC TAC TOE</h1>
        {["TIC", "TAC", "TOE"].map((text, i) =>
            <h1
                aria-hidden
                class={css`
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
                `}
                style={{ "--stagger": `${i * 250}ms` }}
            >{text}</h1>
        )}
    </>
}

namespace WaitingForOpponentScreen {
    export interface Props {
        class?: string
        world: WorldData["name"]
    }
}

class WaitingForOpponentScreen extends Component<WaitingForOpponentScreen.Props> {
    
    #copy = () =>
        navigator.clipboard.writeText(this.props.world.replace(" ", "-"))
    
    #share = () =>
        navigator.share({
            title: "Tic Tac Toe",
            url: location.href
        }).catch(() => {})

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
                    onClick={this.#copy}
                />}
                {"share" in navigator && <Symbols.Button
                    icon="ios_share"
                    colors="on-secondary-container"
                    style="outline"
                    size="medium"
                    onClick={this.#share}
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
