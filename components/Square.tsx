import type { JSX } from "preact"
import { css } from "astro:emotion"
import type { Place } from "game/entity.ts"
import { Component } from "./component.ts"

export interface SquareProps extends JSX.HTMLAttributes<HTMLButtonElement> {
    place: Place
}

export class Square extends Component<SquareProps, "Place"> {

    listen = this.world.gamestate

    entity = this.world.spawnEntity({
        Marked: false,
        Place: this.props.place,
        Sync: { id: `square${this.props.place}` }
    })

    render() {
        return <button
            class={css`
                background-color: initial;
                border: initial;
                padding: initial;
                color: var(--line-color);
                font-size: calc(var(--square-size) * 0.75);
                height: var(--square-size);
                width: var(--square-size);
                :not([disabled]) {
                    cursor: pointer;
                };
            ` + " " + this.props.class}
            onClick={() => this.world.update("Mark", { place: this.entity.Place })}
            disabled={this.entity.Marked !== false || this.world.playerSign !== this.world.gamestate.Turn}
        >{this.entity.Marked === "X" ? X : this.entity.Marked === "O" ? O : null}</button>
    }
}

export const lineStroke = css`
    fill: none;
    stroke: var(--line-color);
    stroke-linecap: round;
    stroke-width: var(--line-size);
`

const X = <svg viewBox="0 0 192 192" height="192" width="192" xmlns="http://www.w3.org/2000/svg">
    <line x1={64} y1={64} x2={128} y2={128} class={lineStroke}></line>
    <line x1={128} y1={64} x2={64} y2={128} class={lineStroke}></line>
</svg>

const O = <svg viewBox="0 0 192 192" height="192" width="192" xmlns="http://www.w3.org/2000/svg">
    <circle cx={96} cy={96} r={48} class={lineStroke}></circle>
</svg>
