import cx from "clsx/lite"
import { css } from "astro:emotion"
import type { SquarePosition } from "game/board.d.ts"
import { Component, type Attributes } from "./component.ts"

export function Board(props: Attributes) {
    return <xo-board {...props} class={cx(props.class, css`
        display: grid;
        container-type: size;
        grid: 1fr 1fr 1fr / 1fr 1fr 1fr;
    `)}>
        <CrissCrossFrame class={css`grid-area: 1 / 1 / span 3 / span 3;`}/>
        <BoardSquares/>
        <StrikethroughLine/>
    </xo-board>
}

function CrissCrossFrame(props: Attributes.svg) {
    return <svg {...props} viewBox="0 0 576 576" xmlns="http://www.w3.org/2000/svg">
        <Line x1="192" y1="16" x2="192" y2="560" />
        <Line x1="384" y1="16" x2="384" y2="560" />
        <Line x1="16" y1="192" x2="560" y2="192" />
        <Line x1="16" y1="384" x2="560" y2="384" />
    </svg>
}

class BoardSquares extends Component {
    render() {
        const { state } = this.world
        if (state.connected === "togame") {
            return state.board.map((square, index) => <SquareComponent square={square} place={index + 1 as SquarePosition}/>)
        }
        return null
    }
}

class SquareComponent extends Component<{ square: "X" | "O" | null, place: SquarePosition}> {
    render({ square, place }: typeof this.props) {
        const { state } = this.world
        const playerSign = state.connected === "togame" && state.game.state === "active" && state.player.sign
        const turnSign = state.connected === "togame" && state.game.state === "active" && state.game.turn

        const playable =
            square === null &&
            playerSign &&
            turnSign &&
            playerSign === turnSign

        return <button
            key={place}
            onClick={() => this.world.update("Mark", { place })}
            class={css`
                font-family: inherit;
                background-color: initial;
                border: initial;
                padding: initial;
                contain: strict;
                font-size: max(19cqh, 19cqw);
                color: var(--primary);
                transition: color 250ms;
                &:not([disabled]) {
                    cursor: pointer;
                    @media (hover: hover) and (pointer: fine) {
                        &:hover::before {
                            content: attr(data-hover-content);
                            opacity: 0.25;
                        }
                    }
                }
            `}
            style={{
                gridRow: Math.ceil(place / 3),
                gridColumn: ((place - 1) % 3) + 1
            }}
            data-hover-content={playable && playerSign}
            disabled={!playable}
        >{square || null}</button>
    }
}

class StrikethroughLine extends Component {
    render() {
        const { state } = this.world
        if (state.connected !== "togame" || state.game.state !== "victory") return null

        const [ a, b, c ] = state.game.line
        const placement = a * 100 + b * 10 + c

        return <svg
            viewBox="0 0 576 576"
            xmlns="http://www.w3.org/2000/svg"
            class={css`grid-area: 1 / 1 / span 3 / span 3;`}
        >
            {placement === 123 && <Line x1="64" y1="96" x2="512" y2="96"/>}
            {placement === 456 && <Line x1="64" y1="288" x2="512" y2="288"/>}
            {placement === 789 && <Line x1="64" y1="480" x2="512" y2="480"/>}
            {placement === 147 && <Line x1="96" y1="64" x2="96" y2="512"/>}
            {placement === 258 && <Line x1="288" y1="64" x2="288" y2="512"/>}
            {placement === 369 && <Line x1="480" y1="64" x2="480" y2="512"/>}
            {placement === 159 && <Line x1="64" y1="64" x2="512" y2="512"/>}
            {placement === 357 && <Line x1="512" y1="64" x2="64" y2="512"/>}
        </svg>
    }
}

function Line(props: Attributes.svg.line) {
    return <line {...props} class={css`
        fill: none;
        stroke: var(--primary);
        stroke-dasharray: 100%;
        stroke-dashoffset: 0%;
        stroke-linecap: round;
        stroke-width: 1rem;
        transition-duration: 500ms;
        transition-property: display, stroke, stroke-dashoffset;
        transition-timing-function: cubic-bezier(0.5, 0, 0, 1);;
        @starting-style {
            stroke-dashoffset: 100%;
        }
    `}/>
}
