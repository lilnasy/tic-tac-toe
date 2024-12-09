import cx from "clsx/lite"
import { css } from "astro:emotion"
import { signal } from "lib/signal-decorator.ts"
import { Component, type Attributes, type Events } from "./component.ts"
import { Board } from "./Board.tsx"
import type { ClientWorld } from "game/world.client.ts"
import { createRef } from "preact"
import { getKeyframesForChildren } from "./animation.ts"
import * as Symbols from "./Symbols.tsx"
import { ActionButton } from "./ActionButton.tsx"
import type { PlayerData } from "game/player.ts"

export namespace Game {
    export interface Props {
        class?: string
        state: Extract<ClientWorld.State, { connected: "togame" }>
    }
}

export function Game({ state, ...props }: Game.Props) {
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
        { game.state === "victory" && <GameEndDialog victory={game.winner}/> }
    </game-container>
}

namespace PlayerCard {
    export type Props = {
        class?: string
        editable?: true
        onTurnText: PlayerBadge.Props["onTurnText"]
        placeAvatar: "left" | "right"
        player: PlayerData.WithSign
    }
}

class PlayerCard extends Component<PlayerCard.Props> {
    
    @signal accessor #editing = false

    #onKeyDown = (event: Events.input.keyDown) => {
        if (event.key === "Enter" || event.key === "Escape") {
            this.#editing = false
        }
    }

    render(props: typeof this.props) {
        const { editable, player } = props
        const { animal } = player
        return <player-card
            data-editable={editable}
            data-editing={this.#editing}
            data-place-avatar={props.placeAvatar}
            class={cx(props.class, css`
                display: grid;
                place-items: center;
                text-align: center;
                padding: 1rem;
                filter: var(--drop-shadow);
                &[data-place-avatar=left] {
                    grid-template-areas: "avatar gap name gap2 edit";
                    grid-template-columns: auto 1rem auto 0rem auto;
                }
                &[data-place-avatar=right] {
                    grid-template-areas: "edit gap2 name gap avatar";
                    grid-template-columns: auto 0rem auto 1rem auto;
                }
                &[data-editable]:is(:hover, :focus-within):not([data-editing]) {
                    grid-template-columns: auto 1rem auto 1rem auto;
                }
            `)}
        >
            <div aria-hidden class={css`
                grid-area: 1 / 1 / -1 / -1;
                height: 100%;
                width: 100%;
                background-color: var(--secondary-container);
                padding: 1rem;
                border-radius: 1rem;
                transition-property: background-color, color;
                transition-duration: 250ms;
            `}/>
            <div data-facing-left={animal.facingLeft} class={css`
                grid-area: avatar;
                color-scheme: light;
                background-color: var(--surface);
                width: 4rem;
                aspect-ratio: 1;
                clip-path: circle();
                font-size: 2rem;
                transition-property: background-color;
                transition-duration: 250ms;
                [data-left] > &[data-facing-left] {
                    scale: -1 1;
                }
            `}>{animal.emoji}
            </div>
            <PlayerBadge onTurnText={props.onTurnText} sign={player.sign} class={css`grid-area: avatar;`}/>
            {
                this.#editing
                ? <input
                    type="text"
                    value={animal.name}
                    ref={input => input?.focus()}
                    maxLength={20}
                    onKeyDown={this.#onKeyDown}
                    onFocusOut={() => this.#editing = false}
                    class={css`
                        grid-area: name;
                        background-color: transparent;
                        font-family: inherit;
                        font-size: inherit;
                        border: none;
                        text-align: center;
                        field-sizing: content;
                    `}
                ></input>
                : <p class={css`
                    grid-area: name;
                    color: var(--on-surface);
                    margin: 0;
                    transition: color 250ms;
                `}>{animal.name}</p>
            }
            {
                editable && <Symbols.Button
                    icon="edit"
                    label="Change Name"
                    on-surface
                    outline
                    small
                    disabled={this.#editing}
                    onClick={() => this.#editing = true}
                    class={css`
                        grid-area: edit;
                        overflow: hidden;
                        opacity: 0;
                        width: 0;
                        padding: 0;
                        outline-color: transparent;
                        transition-property: var(--transition-properties), opacity, outline-color, padding, width;
                        :is(:hover, :focus-within):not([data-editing]) > & {
                            opacity: revert-layer;
                            width: revert-layer;
                            outline-color: revert-layer;
                            padding: revert-layer;
                        }
                    `}
                />
            }
        </player-card>
    }
}


namespace PlayerBadge {
    export type Props = {
        class?: string
        onTurnText: "Your Turn" | "Their Turn"
        sign: "X" | "O"
    }
}

class PlayerBadge extends Component<PlayerBadge.Props> {
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
                filter: var(--drop-shadow-small);
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

namespace GameEndDialog {
    export type Props = { class?: string } & (
        | { draw: true, victory?: undefined }
        | { draw?: undefined, victory: "X" | "O" }
    )
}

class GameEndDialog extends Component<GameEndDialog.Props> {
    render(props: typeof this.props) {
        return <PopUp class={props.class}>
            <p>{ props.draw ? "Draw" : "You Win!" }</p>
            <ActionButton secondary onClick={() => this.update("RequestRematch")}>Play Again</ActionButton>
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
        return <dialog {...props} ref={this.#ref} class={cx(props.class, css`
            &[open] {
                display: grid;
            }
            place-items: center;
            width: min(20rem, 100dvw);
            background: var(--secondary-container);
            color: var(--on-secondary-container);
            border: none;
            border-radius: 1rem;
            filter: var(--drop-shadow) var(--drop-shadow);
            transition-property: opacity, translate;
            transition-duration: 1s;
            @starting-style {
                opacity: 0;
                translate: 0 4rem;
            }
            &::backdrop {
                background: light-dark(
                    oklch(20% 0 0 / .2),
                    oklch(90% 0 0 / .3)
                );
                backdrop-filter: blur(0.5rem);
                transition: background 1s, backdrop-filter 250ms;
                @starting-style {
                    background: transparent;
                    backdrop-filter: blur(0);
                }
            }
        `)}/>
    }
}