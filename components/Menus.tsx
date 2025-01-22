import cx from "clsx/lite"
import { css } from "astro:emotion"
import { debounce } from "remeda"
import { signal } from "lib/signal-decorator.ts"
import { ClientWorld, type WorldData } from "game/world.client.ts"
import type { CursorSync, MessageRegistry, Messages } from "game/messages.d.ts"
import type { Receiver } from "game/channel.d.ts"
import { Component, WorldContext } from "./component.ts"
import { Game } from "./Game.tsx"
import { ExitPresence, type AnimatesOut } from "./ExitPresence.ts"
import { ColorMixer } from "./ColorMixer.tsx"
import { IconButton } from "./IconButton.tsx"
import { ActionButton } from "./ActionButton.tsx"

export function MainMenuSSR() {
    return <TitleScreen nobuttons text="loading"/>
}

export function MainMenu() {
    const world = ClientWorld.connect()
    return <WorldContext.Provider value={world}>
        <ScreenRouter world={world} class={css`grid-area: 1 / 1;`}/>
        <ColorMixer class={css`grid-area: 1 / 1; place-self: end; margin: 1rem; isolation: isolate;`}/>
    </WorldContext.Provider>
}

function ScreenRouter({ world, ...props }: { class?: string, world: ClientWorld }) {

    const { state } = world

    return <ExitPresence timeout={1000}>{

        state.connected === "connecting" ?
            <TitleScreen {...props} nobuttons text="connecting"/> :

        state.connected === "disconnected" ?
            <TitleScreen {...props} nobuttons text="disconnected"/> :

        state.connected === "connectingtoworld" ?
            <TitleScreen {...props} nobuttons text={`connecting to ${state.world.name.replace("-", " ")}`}/> :

        state.connected === "tolobby" ?
            <TitleScreen {...props} cursors/> :

        state.connected === "toworld" ?
            <WaitingForOpponentScreen {...props} world={state.world.name}/> :

        state.connected === "togame" ?
            <Game {...props} state={state}/> : <></>

    }</ExitPresence>
}

class TitleScreen extends Component<{
    class?: string
    cursors?: true
} & (
    | { nobuttons: true, text: string }
    | { nobuttons?: undefined }
)> implements AnimatesOut {
    
    current: HTMLDivElement | null = null

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
        const container = this.current!
        
        if (!leaveQuickly) {
            const options: KeyframeAnimationOptions = {
                duration: 750,
                // elastic in, ease out
                easing: "cubic-bezier(0.75, -0.75, 0.25, 1)"
            }

            for (const element of container.querySelectorAll("h1")) {
                element.animate(upwards, options)
            }
            
            for (const button of container.querySelectorAll("button")) {
                button.animate(downwards, options)
            }
        }

        const animation = container!.animate(fadeOut, { duration: leaveQuickly ? 250 : 500 })
        animation.finished.then(leave)
    }

    render(props: typeof this.props) {
        return <title-screen class={cx(props.class, css`
            display: grid;
            grid-template-rows: 0;
            transition: opacity 250ms;
            @starting-style {
                opacity: 0;
            }
        `)} ref={this}>
            <TitleText/>
            {
                props.nobuttons
                    ? <p class={css`
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
                    `}>{ props.text }</p>
                    : <>
                        <ActionButton onClick={this.#newWorld} primary>New Game</ActionButton>
                        <ActionButton onClick={this.#joinWorld} secondary>Join</ActionButton>
                    </>
            }
            { props.cursors && <Cursors/> }
        </title-screen>
    }
}

class Cursors extends Component implements Receiver {

    @signal accessor #cursors: CursorSync = []

    #sendCursorMove = (event: PointerEvent) => {
        this.world.channel.send("CursorMove", [
            event.clientX - (window.innerWidth / 2),
            event.clientY - (window.innerHeight / 2)
        ])
    }

    #debounceSendCursorMove = debounce(this.#sendCursorMove, { waitMs: 50, maxWaitMs: 50 })

    componentDidMount() {
        addEventListener("pointermove", this.#debounceSendCursorMove.call)
        this.world.channel.subscribe(this)
    }

    receive<Message extends Messages>(message: Message, data: MessageRegistry[Message]) {
        if (message === "CursorSync") {
            this.#cursors = data as CursorSync
        }
    }

    componentWillUnmount() {
        removeEventListener("pointermove", this.#debounceSendCursorMove.call)
        this.world.channel.unsubscribe(this)
    }

    render() {
        return <>{
            this.#cursors.map(([ id, x, y ]) =>
                <svg
                    key={id}
                    class={css`
                        position: absolute;
                        top: 0;
                        left: 0;
                        pointer-events: none;
                        height: 1rem;
                        fill: oklch(from var(--id) 0.7 0.15 h);
                        stroke: white;
                        stroke-width: 0.25rem;
                        filter: var(--drop-shadow-subtle);
                        transition: translate 50ms;
                    `}
                    style={{
                        // derive hue from id which is also a hexadecimal number
                        "--id": `#${id.slice(0, 6)}`,
                        translate: `${x + window.innerWidth / 2}px ${y + window.innerHeight / 2}px`
                    }}
                    viewBox="0 0 32 36"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="
                        M28.7422 20.6515
                        C30.6498 20.1539 31.0119 17.6029 29.3184 16.594
                        L5.51804 2.41502
                        C3.82888 1.40872 1.76147 2.93154 2.22168 4.84316
                        L8.80478 32.1883
                        C9.27967 34.161 11.9329 34.5163 12.9105 32.7388
                        L18.0202 23.4486
                        L28.7422 20.6515
                        Z
                    "/>
                </svg>
            )
        }</>
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

class WaitingForOpponentScreen extends Component<{
    class?: string
    world: WorldData["name"]
}> implements AnimatesOut {
    
    #copy = () =>
        navigator.clipboard.writeText(this.props.world.replace(" ", "-"))
    
    #share = () =>
        navigator.share({
            title: "Tic Tac Toe",
            url: location.href
        }).catch(() => {})

    current: HTMLElement | null = null

    componentWillLeave(leave: () => void) {
        const animation = this.current!.animate(
            [{}, { opacity: 0 }],
            { duration: 250 }
        )
        animation.finished.then(leave)
    }

    render(props: typeof this.props) {
        return <waiting-screen ref={this} class={cx(props.class, css`
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
            <world-name class={css`
                grid-area: d;
                display: grid;
                place-items: center;
                &:has(> *:nth-child(3)) {
                    grid-template-areas:
                        "a a"
                        "b c";
                    & > h6:first-child {
                        grid-area: a;
                    }
                    & > *:nth-child(2) {
                        place-self: end;
                    }
                    & > *:nth-child(3) {
                        place-self: start;
                    }
                }
                gap: 1rem;
                border-radius: 1rem;
                padding: 1rem;
                filter: var(--drop-shadow);
                background-color: var(--secondary-container);
                color: var(--on-secondary-container);
                transition: background-color, color, filter;
                transition-duration: 250ms;
            `}>
                <h6 class={css`
                    font-size: 3rem;
                    font-weight: inherit;
                    margin: 0;
                    transition: color 250ms;
                `}>{props.world.replace("-", " ")}</h6>
                {"clipboard" in navigator && <IconButton
                    icon="content_copy"
                    label="Copy"
                    on-secondary-container
                    outline
                    small
                    onClick={this.#copy}
                />}
                {"share" in navigator && <IconButton
                    icon="ios_share"
                    label="Share"
                    on-secondary-container
                    outline
                    small
                    onClick={this.#share}
                />}
            </world-name>
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
