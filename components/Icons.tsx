/**
 * Material symbols reproduced under Apache License 2.0
 */
import { Component, type Attributes } from "./component.ts"

export class Palette extends Component<Attributes.SVG> {
    render(props: typeof this.props) {
        return <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 -960 960 960"
            {...props}
        >
            <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z"/>
        </svg>
    }
}

export class InvertColors extends Component<Attributes.SVG> {
    render(props: typeof this.props) {
        return <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 -960 960 960"
            {...props}
        >
            <path d="M480-120q-133 0-226.5-92.5T160-436q0-66 25-122t69-100l226-222 226 222q44 44 69 100t25 122q0 131-93.5 223.5T480-120Zm0-80v-568L310-600q-35 33-52.5 74.5T240-436q0 97 70 166.5T480-200Z"/>
        </svg>
    }
}

export class Check extends Component<Attributes.SVG> {
    render(props: typeof this.props) {
        return <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            {...props}
        >
            <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
        </svg>
    }
}
