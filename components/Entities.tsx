import { css } from "astro:emotion"
import type { Entity } from "game/entity.ts"
import { Store } from "game/store.ts"
import { Component, type Attributes } from "./component.ts"

export class EntitiesView extends Component<{ entities?: Set<Entity> }> {
    render({ entities }: typeof this.props) {
        if (!entities) return this.world.Entities
        return <>{
            entities
            .values()
            .filter((e): e is Entity<"View"> => e.View)
            .map(e => <e.View entity={e}/>)
            .toArray()
        }</>
    }
}

interface SquareProps {
    entity: Entity<"Place">
}

export class Square extends Component<SquareProps> {

    mark() {
        this.update("Mark", { place: this.props.entity.Place })
    }

    render({ entity }: typeof this.props) {
        const Marked = Store.get(entity, "Marked")
        const Sign = Store.get(this.world.state, "Sign")
        const Turn = Store.get(this.world.state, "Turn")
        const { Place } = entity 
        
        const disabled = Marked !== undefined || Sign !== Turn
        
        return <button
            class={css`
                font-family: inherit;
                background-color: initial;
                border: initial;
                padding: initial;
                color: var(--primary);
                font-size: min(7rem, 19dvh, 19dvw);
                height: var(--square-size);
                width: var(--square-size);
                &:not([disabled]) { cursor: pointer; }
            `}
            style={{
                gridRow: Math.ceil(Place / 3),
                gridColumn: ((Place - 1) % 3) + 1
            }}
            onClick={this.mark}
            disabled={disabled}
        >{Marked || null}</button>
    }
}

interface StrikethroughProps {
    entity: Entity<"Line">
}

export class Strikethrough extends Component<StrikethroughProps> {
    render(props: typeof this.props) {
        const line = Store.get(props.entity, "Line")
        if (line === null) return <></>
        const [ a, b, c ] = line
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
