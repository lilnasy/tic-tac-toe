import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component, type Attributes, type Events } from "./component.ts"
import { Board } from "./Board.tsx"
import type { ClientWorld } from "game/world.client.ts"
import { createRef } from "preact"
import { getKeyframesForChildren } from "./animation.ts"
import * as Symbols from "./Symbols.tsx"
import { ActionButton } from "./ActionButton.tsx"

export function Game(props: Extract<ClientWorld.State, { connected: "togame" }>) {
    
    const { game } = props

    return <game-container class={css`
        display: grid;
        --board-size: min(100dvw, calc(100dvh - 6rem));
        grid-template-rows: 6rem var(--board-size);
        width: var(--board-size);
    `}>
        <GameStatusHeader game={props}/>
        <Board/>
        { game.state === "draw" && <GameEndDialog draw/> }
        { game.state === "victory" && <GameEndDialog victory={game.winner}/> }
    </game-container>
}

namespace GameStatusHeader {
    export interface Props {
        class?: string
        game: Extract<ClientWorld.State, { connected: "togame" }>
    }
}

class GameStatusHeader extends Component<GameStatusHeader.Props, { editing: boolean }> {
    
    #ref = createRef<HTMLElement>()

    state = { editing: false }

    componentDidMount() {
        const element = this.#ref.current!
        const elementRect = element.getBoundingClientRect()
        const parentRect = element.parentElement!.getBoundingClientRect()
        const centerY = parentRect.top + parentRect.height / 2 - elementRect.height / 2
        const showProminentlyInTheCenter = {
            gridTemplateAreas: '"avatar avatar" "name edit"',
            gridTemplateColumns: "auto 0",
            scale: "1.5",
            translate: `0 ${centerY}px`
        }
        /**
         * eased, quick at the start, slow at the end
         */
        const easing = "cubic-bezier(0.3, 0, 0, 1)"

        element.animate([
            { ...showProminentlyInTheCenter, translate: `-5rem ${centerY}px`, opacity: 0 },
            showProminentlyInTheCenter,
        ], {
            duration: 500,
            easing
        }).finished.then(_ => {
            const keyframes = getKeyframesForChildren(element, showProminentlyInTheCenter)
            for (let i = 0; i < element.children.length; i++) {
                element.children[i].animate([keyframes[i], {}], {
                    composite: "add",
                    delay: 1500,
                    fill: "backwards",
                    duration: 2000,
                    easing
                })
            }
        })
    }

    handleEvent(event: Events.button.click | Events.input.keyDown | Events.input.focusOut) {
        if (event instanceof MouseEvent) {
            this.setState({ editing: true })
        } else if (event instanceof KeyboardEvent) {
            if (event.key === "Enter")
                this.setState({ editing: false })
            else if (event.key === "Escape") {
                this.setState({ editing: false })
            }
        } else if (event instanceof FocusEvent) {
            this.setState({ editing: false })
        }
    }

    render(props: typeof this.props, state: typeof this.state) {
        const { player: { animal } } = props.game
        return <game-status
            data-editing={state.editing ? "" : null}
            ref={this.#ref}
            class={cx(props.class, css`
                display: grid;
                grid-template-areas: "avatar gap name gap2 edit";
                grid-template-columns: auto 1rem auto 0 auto;
                place-items: center;
                place-self: start center;
                text-align: center;
                padding: 1rem 2rem;
                z-index: var(--z-game-status);
                &:is(:hover, :focus-within):not([data-editing]) {
                    grid-template-columns: auto 1rem auto 1rem auto;
                }
            `)}
        >
            <div aria-hidden class={css`
                grid-area: 1 / 1 / -1 / -1;
                height: 100%;
                width: 100%;
                background-color: var(--secondary-container);
                padding: 1rem 2rem;
                border-radius: 1rem;
                transition-property: background-color, color;
                transition-duration: 250ms;
            `}/>
            <div data-flip={animal.facingLeft ? "" : null} class={css`
                grid-area: avatar;
                color-scheme: light;
                background-color: var(--surface);
                width: 4rem;
                aspect-ratio: 1;
                clip-path: circle();
                font-size: 2rem;
                transition-property: background-color;
                transition-duration: 250ms;
                &[data-flip] {
                    scale: -1 1;
                }
            `}>{animal.emoji}</div>
            {
                state.editing
                ? <input
                    type="text"
                    value={animal.name}
                    ref={input => input?.focus()}
                    maxLength={20}
                    onKeyDown={this}
                    onFocusOut={this}
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
            <Symbols.Button
                icon="edit"
                label="Change Name"
                colors="on-surface"
                style="outline"
                size="small"
                disabled={state.editing}
                onClick={this}
                class={css`
                    grid-area: edit;
                    overflow: hidden;
                    opacity: 0;
                    width: 0;
                    padding: 0;
                    outline-width: 0;
                    transition-property: var(--transition-properties), opacity, width;
                    :is(:hover, :focus-within):not([data-editing]) > & {
                        opacity: revert-layer;
                        width: revert-layer;
                        outline-width: revert-layer;
                        padding: revert-layer;
                    }
                `}
            />
        </game-status>
    }
}

namespace GameEndDialog {
    export type Props = { class?: string } & (
        | { draw: true, victory?: undefined }
        | { draw?: undefined, victory: "X" | "O" }
    )
}

class GameEndDialog extends Component<GameEndDialog.Props> {

    handleEvent(event: Events.button.click) {
        if (event.currentTarget.dataset.playAgain) {
            this.update("RequestRematch")
        }
    }

    render(props: typeof this.props) {
        return <PopUp class={props.class}>
            <p>{ props.draw ? "Draw" : "You Win!" }</p>
            <ActionButton data-play-again secondary onClick={this}>Play Again</ActionButton>
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
            z-index: var(--z-pop-up);
            border-radius: 1rem;
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