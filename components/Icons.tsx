/**
 * Material symbols reproduced under Apache License 2.0
 */
import { css } from "astro:emotion"
import cx from "clsx/lite"
import { Component, type Attributes } from "./component.ts"

export namespace Button {
    export interface Props extends Attributes.button {
        filledOnHover?: true
        outline?: true
        primary?: true
        "on-secondary-container"?: true
    }
}

export class Button extends Component<Button.Props> {
    render({
        "on-secondary-container": onSecondaryContainer,
        primary = !onSecondaryContainer || undefined,
        filledOnHover,
        outline,
        ...props
    }: typeof this.props) {
        return <button {...props} class={cx(props.class, css`
            &:not([disabled]) {
                cursor: pointer;
            }
            transition-property: background-color, outline-color;
            transition-duration: 250ms;
            border: none;
            padding: 0;
            border-radius: 1.5rem;
            height: 3rem;
            width: 3rem;
        `, primary && css`
            --base-color: var(--primary);
            --on-base-color: var(--on-primary);
        `, onSecondaryContainer && css`
            --base-color: var(--on-secondary-container);
            --on-base-color: var(--secondary-container);
        `, filledOnHover && css`
            &:not(:hover) {
                background-color: transparent;
                --fill: var(--base-color)
            }
            &:hover {
                background-color: var(--base-color);
                --fill: var(--on-base-color);
            }
        `, outline && css`
            outline: 1px solid var(--base-color);
            --fill: var(--base-color);
            &:not(:hover) {
                background-color: transparent;
            }
            &:hover {
                background-color: light-dark(oklch(0 0 0 / 5%), oklch(1 0 0 / 10%));
            }
        `)}/>
    }
}

export class Palette extends Component<Attributes.svg> {
    render(props: typeof this.props) {
        return <SVG {...props}>
            <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z"/>
        </SVG>
    }
}

export class InvertColors extends Component<Attributes.svg> {
    render(props: typeof this.props) {
        return <SVG {...props}>
            <path d="M480-120q-133 0-226.5-92.5T160-436q0-66 25-122t69-100l226-222 226 222q44 44 69 100t25 122q0 131-93.5 223.5T480-120Zm0-80v-568L310-600q-35 33-52.5 74.5T240-436q0 97 70 166.5T480-200Z"/>
        </SVG>
    }
}

export class Check extends Component<Attributes.svg> {
    render(props: typeof this.props) {
        return <SVG {...props}>
            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
        </SVG>
    }
}

export class Copy extends Component<Attributes.svg> {
    render(props: typeof this.props) {
        return <SVG {...props}>
            <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/>
        </SVG>
    }
}

export class Share extends Component<Attributes.svg> {
    render(props: typeof this.props) {
        return <SVG {...props}>
            <path d="M240-40q-33 0-56.5-23.5T160-120v-440q0-33 23.5-56.5T240-640h120v80H240v440h480v-440H600v-80h120q33 0 56.5 23.5T800-560v440q0 33-23.5 56.5T720-40H240Zm200-280v-447l-64 64-56-57 160-160 160 160-56 57-64-64v447h-80Z"/>
        </SVG>
    }
}

class SVG extends Component<Attributes.svg> {
    render(props: typeof this.props) {
        return <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 -960 960 960"
            class={cx(props.class, css`
                height: var(--icon-size, 2rem);
                width: var(--icon-size, 2rem);
                fill: var(--fill, black);
                transition: fill 250ms;
            `)}
        />
    }
}
