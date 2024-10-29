import { css } from "astro:emotion"
import { Component, type Attributes } from "./component.ts"

export class Line extends Component<Attributes.svg.line> {
    render(props: typeof this.props) {
        return <line {...props} class={css`
            fill: none;
            stroke: var(--primary);
            stroke-linecap: round;
            stroke-width: var(--line-size);
        `}/>
    }
}