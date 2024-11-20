import { Component, type ComponentChild } from "preact"

interface Props {
    /**
     * The maximum duration to wait for the transition to
     * complete.
     */
    timeout?: number
    children: ComponentChild
}

/**
 * Allows child components to exit with a transition when they
 * are switched with another component.
 * 
 * The child components may specify the `componentWillLeave()`
 * callback, which is called when the component is going to be
 * removed. It is allowed upto the specified `timeout` (in ms)
 * duration to complete the visual exit transition.
 * 
 * When the argument to `componentWillLeave()` is called or
 * the timeout period elapses (whichever comes first), the
 * child is finally replaced with the incoming component.
 */
export class ExitPresence extends Component<Props> {
    
    #leavingChild: ComponentChild | undefined = undefined
    
    componentWillReceiveProps(nextProps: any): void {
        const { children, timeout = 300 } = this.props as any
        const nextChildren = nextProps.children as any
        if (children.type !== nextChildren.type) {
            const { _component } = children
            if (_component && "componentWillLeave" in _component) {
                this.#leavingChild = children
                _component.componentWillLeave(this.#leave)
                setTimeout(this.#leave, timeout)
            }
        }
    }
    
    #leave = () => {
        if (this.#leavingChild === undefined) return
        this.#leavingChild = undefined
        this.forceUpdate()
    }
    
    render() {
        return this.#leavingChild ?? this.props.children
    }
}

export interface AnimatesOut {
    componentWillLeave(leave: () => void): unknown
}