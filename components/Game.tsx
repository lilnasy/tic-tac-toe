import type { JSX } from "preact"
import { css } from "astro:emotion"
import { Component } from "./component.ts"
import type { Place } from "game/entity.ts"

export class Board extends Component<JSX.HTMLAttributes> {
    render() {
        return <div {...this.props} class={css`
            width: calc(var(--square-size) * 3);
            height: calc(var(--square-size) * 3);
            display: grid;
        ` + " " + (this.props.class ?? "")}>
            <CrissCrossFrame class={css`grid-area: 1 / 1 / span 3 / span 3;`}/>
            <Square class={css`grid-area: 1 / 1;`} place={1}/>
            <Square class={css`grid-area: 1 / 2;`} place={2}/>
            <Square class={css`grid-area: 1 / 3;`} place={3}/>
            <Square class={css`grid-area: 2 / 1;`} place={4}/>
            <Square class={css`grid-area: 2 / 2;`} place={5}/>
            <Square class={css`grid-area: 2 / 3;`} place={6}/>
            <Square class={css`grid-area: 3 / 1;`} place={7}/>
            <Square class={css`grid-area: 3 / 2;`} place={8}/>
            <Square class={css`grid-area: 3 / 3;`} place={9}/>
            <Strikethrough class={css`grid-area: 1 / 1 / span 3 / span 3;`}/>
        </div>
    }
}

class CrissCrossFrame extends Component<JSX.SVGAttributes> {
    render() {
        return <svg viewBox="0 0 576 576" height="576" width="576" {...this.props} xmlns="http://www.w3.org/2000/svg">
            <line x1="192" y1="16" x2="192" y2="560" class={lineStroke} />
            <line x1="384" y1="16" x2="384" y2="560" class={lineStroke} />
            <line x1="16" y1="192" x2="560" y2="192" class={lineStroke} />
            <line x1="16" y1="384" x2="560" y2="384" class={lineStroke} />
        </svg>
    }
}

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

    onClick() {
        this.world.update("Mark", { place: this.entity.Place })
    }

    render() {
        const disabled =
            this.entity.Marked !== false ||
            this.world.playerSign !== this.world.gamestate.Turn
        
        return <button
            class={css`
                background-color: initial;
                border: initial;
                padding: initial;
                color: var(--primary);
                font-size: calc(var(--square-size) * 0.75);
                height: var(--square-size);
                width: var(--square-size);
                :not([disabled]) {
                    cursor: pointer;
                };
            ` + " " + this.props.class}
            onClick={this.onClick}
            disabled={disabled}
        >{this.entity.Marked === "X" ? X : this.entity.Marked === "O" ? O : null}</button>
    }
}

export const lineStroke = css`
    fill: none;
    stroke: var(--primary);
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

class Strikethrough extends Component<JSX.SVGAttributes> {
    
    entity = this.world.spawnEntity({ Line: null })

    render() {
        if (this.entity.Line === null) return <></>
        const [ a, b, c ] = this.entity.Line
        const line = a * 100 + b * 10 + c
        return <svg viewBox="0 0 576 576" height="576" width="576" {...this.props} xmlns="http://www.w3.org/2000/svg">
            {line === 123 && <line x1="64" y1="96" x2="512" y2="96" class={lineStroke}/>}
            {line === 456 && <line x1="64" y1="288" x2="512" y2="288" class={lineStroke}/>}
            {line === 789 && <line x1="64" y1="480" x2="512" y2="480" class={lineStroke}/>}
            {line === 147 && <line x1="96" y1="64" x2="96" y2="512" class={lineStroke}/>}
            {line === 258 && <line x1="288" y1="64" x2="288" y2="512" class={lineStroke}/>}
            {line === 369 && <line x1="480" y1="64" x2="480" y2="512" class={lineStroke}/>}
            {line === 159 && <line x1="64" y1="64" x2="512" y2="512" class={lineStroke}/>}
            {line === 357 && <line x1="512" y1="64" x2="64" y2="512" class={lineStroke}/>}
        </svg>
    }
}
