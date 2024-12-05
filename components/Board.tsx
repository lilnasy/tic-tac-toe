import cx from "clsx/lite"
import { css } from "astro:emotion"
import type { Entity } from "game/entity.d.ts"
import { Component, type Attributes } from "./component.ts"

export function Board(props: Attributes) {
    return <xo-board {...props} class={cx(props.class, css`
        display: grid;
        container-type: size;
    `)}>
        <CrissCrossFrame class={css`grid-area: 1 / 1 / span 3 / span 3;`}/>
        <EntitiesView/>
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

class EntitiesView extends Component {
    render() {
        return this.world.entities
            .values()
            .filter(hasView)
            .map(renderCorrespondingView)
            .toArray()
    }
}

function hasView(entity: Entity): entity is Entity<"View"> {
    return entity.View !== undefined
}

function renderCorrespondingView(entity: Entity<"View">) {
    if (entity.View === "Square") return <Square entity={entity}/>
    if (entity.View === "Strikethrough") return <Strikethrough entity={entity}/>
}

interface ViewProps {
    entity: Entity
}

class Square extends Component<ViewProps> {
    render({ entity }: typeof this.props) {
        const { state } = this.world
        const { Marked, Place } = entity as Entity<"Place">

        const playable = Marked === undefined &&
            state.connected === "togame" &&
            state.game.state === "active" &&
            state.player.sign === state.game.turn

        return <button
            class={css`
                font-family: inherit;
                background-color: initial;
                border: initial;
                padding: initial;
                contain: strict;
                color: var(--primary);
                font-size: max(19cqh, 19cqw);
                &:not([disabled]) { cursor: pointer; }
            `}
            style={{
                gridRow: Math.ceil(Place / 3),
                gridColumn: ((Place - 1) % 3) + 1
            }}
            onClick={() => this.update("Mark", { place: this.props.entity.Place! })}
            disabled={ playable === false }
        >{Marked || null}</button>
    }
}

function Strikethrough({ entity }: ViewProps) {
    if (entity.Line === undefined) return <></>
    const [ a, b, c ] = entity.Line
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

function Line(props: Attributes.svg.line) {
    return <line {...props} class={css`
        fill: none;
        stroke: var(--primary);
        stroke-linecap: round;
        stroke-width: 1rem;
        transition: stroke 250ms;
    `}/>
}
