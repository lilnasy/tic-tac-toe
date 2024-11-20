import { Component, createRef, type JSX } from "preact"
import cx from "clsx/lite"
import { css } from "astro:emotion"
import type { Attributes } from "./component.ts"

namespace ActionButton {
    export interface Props extends Attributes.button {
        primary?: true
        secondary?: true    
    }
}

export class ActionButton extends Component<ActionButton.Props> {
    #ref = createRef<HTMLButtonElement>()
    componentDidMount() {
        this.#ref.current!.addEventListener("click", this)
    }
    handleEvent(event: JSX.TargetedMouseEvent<HTMLButtonElement>) {
        event.currentTarget.animate(
            [{}, { scale: 0.9 }, {}],
            { duration: 250, easing: "cubic-bezier(0.5, 0.5, 0.5, 1.5)" }
        )
    }
    render({ primary, secondary, ...props }: typeof this.props) {
        return <button {...props} ref={this.#ref} class={cx(props.class, css`
            font-family: inherit;
            font-size: inherit;
            height: 3rem;
            width: 8rem;
            border-radius: 1.5rem;
            margin: 0.5rem;
            padding: 0;
            line-height: 170%;
            border: none;
            transition:
                background-color 250ms,
                color 250ms,
                opacity 1s,
                outline-color 250ms,
                scale 250ms;
            outline-width: 0.25rem;
            outline-offset: 0.25rem;
            &:hover, &:active {
                outline-style: dashed;
            }
            &:focus-visible {
                outline-style: solid;
            }
            &:not([disabled]) {
                cursor: pointer;
                &:hover { scale: 1.1; }
            }
            @starting-style { opacity: 0; }
        `, primary && css`
            background-color: var(--primary);
            outline-color: var(--primary);
            color: var(--on-primary);
        `, secondary && css`
            background-color: var(--secondary);
            outline-color: var(--secondary);
            color: var(--on-secondary);
        `)}/>
    }
}
