import cx from "clsx/lite"
import { css } from "@acab/ecsstatic"
import { Component, type Attributes } from "./component.ts"
import { EntitiesView } from "./Entities.tsx"

export class Board extends Component<Attributes<"div">> {
    render(props: typeof this.props) {
        return <div {...props} class={cx(props.class, css`
            width: calc(var(--square-size) * 3);
            height: calc(var(--square-size) * 3);
            display: grid;
        `)}>
            <CrissCrossFrame class={css`grid-area: 1 / 1 / span 3 / span 3;`}/>
            <EntitiesView/>
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
