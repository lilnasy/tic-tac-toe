import { css } from "astro:emotion"
import type { Entity } from "game/entity.ts"
import { Store } from "game/store.ts"
import { Component } from "./component.ts"
import { Line } from "./Line.tsx"

export class EntitiesView extends Component {
    componentDidMount() {
        this.world.EntitiesView = this
    }
    componentWillUnmount() {
        this.world.EntitiesView = undefined
    }
    render() {
        return <>{
            this.world.entities
            .values()
            .filter(isVisibleEntity)
            .map(renderEntity)
            .toArray()
        }</>
    }
}

function isVisibleEntity(entity: Entity): entity is Entity<"View"> {
    return entity.View !== undefined
}

function renderEntity(entity: Entity<"View">) {
    if (entity.View === "Square") return <Square entity={entity}/>
    if (entity.View === "Strikethrough") return <Strikethrough entity={entity}/>
}

interface ViewProps {
    entity: Entity
}

export class Square extends Component<ViewProps> {

    mark() {
        const { Place: place } = this.props.entity
        if (place) this.update("Mark", { place })
        else console.error(new Error("The entity provided to the Square View does not have the required states", { cause: this.props.entity }))
    }

    render({ entity }: typeof this.props) {
        const { state } = this.world
        const Marked = Store.get(entity, "Marked")
        const { Place } = entity as Entity<"Place">
        
        Store.get(state, "connection")
        const playable = Marked === undefined &&
            ((state.connection === "ingame" &&
                state.game.state === "active")
                ? state.game.player.sign === state.game.turn
                : false)

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
            disabled={!playable}
        >{Marked || null}</button>
    }
}

export class Strikethrough extends Component<ViewProps> {
    render(props: typeof this.props) {
        const line = Store.get(props.entity, "Line")
        if (line === null || line === undefined) return <></>
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
