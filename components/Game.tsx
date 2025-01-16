import cx from "clsx/lite"
import { create } from "canvas-confetti"
import { css } from "astro:emotion"
import { effect, Signal, signal } from "@preact/signals-core"
import type { ClientWorldState } from "game/world.client.ts"
import type { PlayerData } from "game/player.ts"
import * as Animal from "game/animals.ts"
import { Component, type Events } from "./component.ts"
import { Board } from "./Board.tsx"
import { ActionButton } from "./ActionButton.tsx"
import { IconButton } from "./IconButton.tsx"

export function Game({ state, ...props }: {
    class?: string
    state: Extract<ClientWorldState, { connected: "togame" }>
}) {
    const { game } = state
    return <game-container class={cx(props.class, css`
        display: grid;
        --board-size: min(100dvw, calc(100dvh - 6rem));
        grid: 
            "player opponent" 6rem
            "board board" var(--board-size);
        column-gap: 1rem;
        width: var(--board-size);
        transition: opacity 250ms;
        @starting-style {
            opacity: 0;
        }
    `)}>
        <PlayerCard player={state.player} placeAvatar="left" onTurnText="Your Turn" editable/>
        <PlayerCard player={state.opponent} placeAvatar="right" onTurnText="Their Turn"/>
        <Board class={css`grid-area: board;`}/>
        { game.state === "draw" && <GameEndDialog draw/> }
        { game.state === "victory" && <GameEndDialog winner={
            game.winningSign === state.player.sign
                ? state.player
                : state.opponent
        }/> }
    </game-container>
}

class PlayerCard extends Component<{
    class?: string
    editable?: true
    onTurnText: PlayerBadge["props"]["onTurnText"]
    placeAvatar: "left" | "right"
    player: PlayerData.WithSign
}> {

    current: HTMLDialogElement | null = null

    #editing = signal(false)

    render(props: typeof this.props) {
        const { editable, player } = props
        const { animal } = player
        return <player-card
            onClick={editable && (() => this.#editing.value = true)}
            data-editable={editable}
            data-place-avatar={props.placeAvatar}
            class={cx(props.class, css`
                display: grid;
                place-items: center;
                text-align: center;
                padding: 1rem;
                filter: var(--drop-shadow);
                &[data-place-avatar=left] {
                    grid-template-areas: "avatar name";
                    grid-template-columns: auto 1fr;
                }
                &[data-place-avatar=right] {
                    grid-template-areas: "name avatar";
                    grid-template-columns: 1fr auto;
                }
                &[data-editable] {
                    cursor: pointer;
                }
            `)}
        >
            <div
                aria-hidden
                class={css`
                    grid-area: 1 / 1 / -1 / -1;
                    height: 100%;
                    width: 100%;
                    background-color: var(--secondary-container);
                    padding: 1rem;
                    border-radius: 1rem;
                    transition-property: background-color, color;
                    transition-duration: 250ms;
                `}
            />
            <div
                data-facing-left={animal.facingLeft}
                class={css`
                    grid-area: avatar;
                    color-scheme: light;
                    background-color: var(--surface);
                    width: 4rem;
                    aspect-ratio: 1;
                    clip-path: circle();
                    font-size: 2rem;
                    transition-property: background-color;
                    transition-duration: 250ms;
                    [data-place-avatar=left] > &[data-facing-left] {
                        scale: -1 1;
                    }
                `}
            >{animal.emoji} </div>
            <PlayerBadge onTurnText={props.onTurnText} sign={player.sign} class={css`grid-area: avatar;`}/>
            <p class={css`
                grid-area: name;
                color: var(--on-surface);
                margin: 0;
                transition: color 250ms;
            `}>{player.name ?? animal.name}</p>
            {editable && <EditPlayerDialog open={this.#editing} player={player}/>}
        </player-card>
    }
}

class EditPlayerDialog extends Component<{
    open: Signal<boolean>
    player: PlayerData.WithSign
}> {

    current: HTMLDialogElement | null = null

    #effect: ReturnType<typeof effect> | null = null

    componentDidMount() {
        const dialog = this.current!
        /**
         * The `props.open` signal could be bound to the `[open]` attribute,
         * but that would only allow a non-modal dialog.
         * 
         * The effect has to be set up imperatively.
         */
        this.#effect = effect(() => {
            if (this.props.open.value) {
                if (dialog.open) return
                dialog.showModal()
                const selectedAvatar = dialog.querySelector("input[name=animal]:checked")
                if (selectedAvatar) {
                    setTimeout(
                        scrollIntoViewHorizontally,
                        1000,
                        /* the input's parent label */
                        selectedAvatar.parentElement
                    )
                }
            } else if (dialog.open) {
                dialog.close()
            }
        })
        addEventListener("click", this, { passive: true })
    }

    handleEvent(event: Event) {
        const dialog = this.current!
        const target = event.target
        if (event.type === "click" && target) {
            if (target === dialog) {
                // light dismiss
                dialog.close()
            }
        }
    }

    componentWillUnmount() {
        this.#effect?.()
        removeEventListener("click", this)
    }

    /**
     * The browser may close the dialog when escape is pressed.
     * When it does, we update the signal to keep it in sync.
     */
    #onClose = (_: Events.dialog.close) => this.props.open.value = false

    #save = () => {
        const dialog = this.current!
        const nameInput = dialog.querySelector<HTMLInputElement>("input[name=name]")!
        const animalInput = dialog.querySelector<HTMLInputElement>("input[name=animal]:checked")!
        
        const name = nameInput.value || undefined
        const animal = animalInput.value
        
        this.props.open.value = false
        this.update("PlayerProfile", { name, animal })
    }

    render({ player }: typeof this.props) {
        return <dialog
            ref={this}
            onClose={this.#onClose}
            class={css`
                &[open] {
                    display: grid;
                }
                border: initial;
                cursor: initial;
                padding: 1rem;
                background-color: var(--secondary-container);
                color: var(--on-secondary-container);
                border-radius: 1rem;
                width: min(20rem, 100dvw);
                filter: var(--drop-shadow-double);
                will-change: filter;
                isolation: isolate;
                transition: display allow-discrete, opacity, overlay allow-discrete, translate;
                transition-duration: 1s;
                transition-timing-function: cubic-bezier(0.2, 1, 0, 1);
                @starting-style {
                    opacity: 0;
                    translate: 0 4rem;
                }
                &:not([open]) {
                    opacity: 0;
                    translate: 0 4rem;
                    transition-duration: 250ms;
                    transition-timing-function: initial;
                    &::backdrop {
                        background-color: transparent;
                        backdrop-filter: blur(0);
                    }
                }
                &::backdrop {
                    background-color: light-dark(
                        oklch(20% 0 0 / .2),
                        oklch(90% 0 0 / .3)
                    );
                    backdrop-filter: blur(0.5rem);
                    transition-property: background-color, backdrop-filter;
                    transition-duration: 1s;
                    transition-timing-function: cubic-bezier(0.2, 1, 0, 1);
                    @starting-style {
                        background-color: transparent;
                        backdrop-filter: blur(0);
                    }
                }
            `}
        >
            <section class={css`
                grid-area: 1 / 1;
                display: grid;
                margin-top: 1rem;
                gap: 1rem;
            `}>
                <label
                    class={css`
                        display: grid;
                        text-indent: 1rem;
                        text-align: initial;
                    `}
                >
                    Change your name
                    <input
                        type="text"
                        name="name"
                        autocomplete="text"
                        defaultValue={player.name}
                        placeholder={player.animal.name}
                        class={css`
                            border: initial;
                            outline: initial;
                            padding: initial;
                            font: inherit;
                            border-radius: 1rem;
                            height: 4rem;
                            width: 100%;
                            background-color: var(--surface);
                            color: var(--on-surface);
                            text-align: center;
                        `}
                    />
                </label>
                <label
                    onClick={preventClickTransfer}
                    class={css`
                        display: grid;
                        text-indent: 1rem;
                        text-align: initial;
                    `}
                >
                    Pick your avatar
                    <div
                        role="radiogroup"
                        onChange={scrollCheckedIntoView}
                        onClick={preventClickTransfer}
                        class={css`
                            display: grid;
                            grid-auto-flow: column;
                            grid-auto-columns: 3rem;
                            grid-template-rows: repeat(4, 3rem);
                            place-items: center;
                            overflow-x: scroll;
                            padding: 0.5rem;
                            background: var(--surface);
                            border-radius: 1rem;
                            text-indent: initial;
                        `}
                    >{
                        Animal.list.map(animal => 
                            <label
                                class={css`
                                    cursor: pointer;
                                    contain: strict;
                                    width: 3rem;
                                    height: 3rem;
                                    line-height: 3rem;
                                    text-align: center;
                                    border-radius: 0.5rem;
                                    &:has(> input:checked) {
                                        background: var(--primary-container);
                                    }
                                `}
                            >
                                {animal.emoji}
                                <input
                                    type="radio"
                                    name="animal"
                                    value={animal.emoji}
                                    defaultChecked={player.animal.emoji === animal.emoji}
                                />
                            </label>
                        )
                    }</div>
                </label>
                <ActionButton onClick={this.#save} primary class={css`place-self: center;`}>Save</ActionButton>
            </section>
            <IconButton
                icon="close"
                aria-label="Close player editor"
                filled-on-hover
                primary
                small
                onClick={e => (e.stopPropagation(), this.props.open.value = false)}
                class={css`
                    grid-area: 1 / 1;
                    justify-self: end;
                    & > span {
                        font-size: 1.5rem;
                    }
                `}
            />
        </dialog>
    }
}

/**
 * Prevents the first input element from being selected
 * when the parent label element is clicked anywhere.
 */
function preventClickTransfer(event: Events.click) {
    if (event.target === event.currentTarget) {
        event.preventDefault()
    }
}

/**
 * Scrolls the selected avatar into the center if it's visually
 * close to the edges of the horizontally-scrolling container.
 */
function scrollCheckedIntoView(event: Events.change) {
    const target = event.target!
    if (target instanceof HTMLInputElement && target.checked) {
        const label = target.parentElement!
        const labelAt = label.offsetLeft
        const { clientWidth: containerWidth, scrollLeft: containerAt } = label.parentElement!
        // consider the middle 50% of the container as the center
        const centerStart = containerAt + containerWidth * 0.25
        const centerEnd   = containerAt + containerWidth * 0.75
        if (labelAt <= centerStart || centerEnd <= labelAt) {
            label.scrollIntoView({ behavior: "smooth", inline: "center" })
        }
    }
}

function scrollIntoViewHorizontally(element: HTMLElement) {
    element.scrollIntoView({ behavior: "smooth", inline: "center" })
}

class PlayerBadge extends Component<{
    class?: string
    onTurnText: "Your Turn" | "Their Turn"
    sign: "X" | "O"
}> {
    render(props: typeof this.props) {
        const { state } = this.world
        const turn =
            state.connected === "togame" &&
            state.game.state === "active" &&
            state.game.turn
        return <player-badge
            role="status"
            data-has-turn={turn === props.sign}
            class={cx(props.class, css`
                text-transform: uppercase;
                background-color: var(--primary);
                color: var(--on-primary);
                border-radius: 1rem;
                font-size: 0.75rem;
                translate: 0 1.5rem;
                padding: 0 0.5rem;
                filter: var(--drop-shadow-subtle);
                transition: background-color, color, display, scale 500ms cubic-bezier(0.25, 2, 0.5, 1);
                transition-behavior: allow-discrete;
                transition-duration: 250ms;
                @starting-style {
                    scale: 0;
                }
                &:not([data-has-turn]) {
                    display: none;
                    scale: 0;
                    transition-timing-function: initial;
                }
        `)}>{props.onTurnText}</player-badge>
    }
}

export class GameEndDialog extends Component<
    | { draw: true, winner?: undefined }
    | { draw?: undefined, winner: PlayerData }
> {

    current: HTMLDialogElement | null = null

    componentDidMount() {
        const dialog = this.current!
        dialog.showModal()
        if (this.props.winner) {
            const canvas = dialog.lastElementChild as HTMLCanvasElement
            const confetti = create(canvas, { resize: true })
            setTimeout(() => confetti({
                decay: 0.93,
                drift: (Math.random() - 0.5) * 2,
                origin: { x: 0.5, y: 0.7 },
                particleCount: 100,
                spread: 40,
                startVelocity: 35,
            }), 500)
        }
    }

    componentWillUnmount() {
        this.current!.close()
    }

    #requestRematch = () => this.update("RequestRematch")

    render(props: typeof this.props) {
        return <dialog ref={this} class={css`
            &[open] {
                display: grid;
            }
            margin: 0;
            padding: 0;
            width: 100dvw;
            height: 100dvh;
            background-color: initial;
            max-height: initial;
            max-width: initial;
            place-items: center;
            border: none;
            &::backdrop {
                background-color: light-dark(
                    oklch(20% 0 0 / .2),
                    oklch(90% 0 0 / .3)
                );
                backdrop-filter: blur(0.5rem);
                transition-property: background-color, backdrop-filter;
                transition-duration: 1s;
                @starting-style {
                    background-color: transparent;
                    backdrop-filter: blur(0);
                }
            }
        `}>
            <section class={css`
                grid-area: 1 / 1;
                display: grid;
                place-items: center;
                width: min(20rem, 100dvw);
                padding: 2rem;
                background-color: var(--secondary-container);
                color: var(--on-secondary-container);
                border-radius: 1rem;
                filter: var(--drop-shadow-double);
                transition-property: opacity, translate;
                transition-duration: 1s;
                @starting-style {
                    opacity: 0;
                    translate: 0 4rem;
                }
            `}>
                <p>{ props.draw ? "Draw" : `${ props.winner.name ?? props.winner.animal.name } Wins!` }</p>
                <ActionButton primary onClick={this.#requestRematch}>Play Again</ActionButton>
            </section>
            <canvas class={css`
                grid-area: 1 / 1;
                isolation: isolate;
                pointer-events: none;
                width: 95%;
                height: 95%;
            `}/>
        </dialog>
    }
}
