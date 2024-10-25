import type { RefObject } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import { Component, type Attributes } from "./component.ts"
import type { Place } from "game/entity.ts"
import { Store } from "game/store.ts"

interface BoardProps extends Attributes<"div"> {
    ref?: RefObject<any>
}

export class Board extends Component<BoardProps> {
    render(props: typeof this.props) {
        return <div {...props} class={cx(props.class, css`
            width: calc(var(--square-size) * 3);
            height: calc(var(--square-size) * 3);
            display: grid;
        `)}>
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

class CrissCrossFrame extends Component<Attributes.SVG> {
    render(props: typeof this.props) {
        return <svg {...props} viewBox="0 0 576 576" class={cx(props.class, css`
            --size: calc(var(--square-size) * 3);
            width: var(--size);
            height: var(--size);
        `)} xmlns="http://www.w3.org/2000/svg">
            <Line x1="192" y1="16" x2="192" y2="560" />
            <Line x1="384" y1="16" x2="384" y2="560" />
            <Line x1="16" y1="192" x2="560" y2="192" />
            <Line x1="16" y1="384" x2="560" y2="384" />
        </svg>
    }
}

export interface SquareProps extends Attributes<"button"> {
    place: Place
}

export class Square extends Component<SquareProps> {

    entity = this.spawnEntity({
        Marked: false,
        Place: this.props.place,
        Sync: { id: `square${this.props.place}` }
    })

    mark() {
        this.send("Mark", { place: this.entity.Place })
    }

    render(props: typeof this.props) {
        const Marked = Store.get(this.entity, "Marked")
        const Sign = Store.get(this.world.state, "Sign")
        const Turn = Store.get(this.world.state, "Turn")
        
        const disabled = Marked !== false || Sign !== Turn
        
        return <button
            class={cx(props.class, css`
                font-family: inherit;
                background-color: initial;
                border: initial;
                padding: initial;
                color: var(--primary);
                font-size: min(7rem, 19dvh, 19dvw);
                height: var(--square-size);
                width: var(--square-size);
                :not([disabled]) { cursor: pointer; };
            `)}
            onClick={this.mark}
            disabled={disabled}
        >{Marked || null}</button>
    }
}

class Strikethrough extends Component<Attributes.SVG> {

    entity = this.spawnEntity({ Line: null })

    render(props: typeof this.props) {
        const line = Store.get(this.entity, "Line")
        if (line === null) return <></>
        const [ a, b, c ] = line
        const placement = a * 100 + b * 10 + c
        return <svg {...props} viewBox="0 0 576 576" xmlns="http://www.w3.org/2000/svg">
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

class Line extends Component<Attributes.SVG<"line">> {
    render(props: typeof this.props) {
        return <line {...props} class={css`
            fill: none;
            stroke: var(--primary);
            stroke-linecap: round;
            stroke-width: var(--line-size);
        `}/>
    }
}
