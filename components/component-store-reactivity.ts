import { options } from "preact"
import { Store } from "game/store.ts"

// @ts-expect-error
const { _render, _rendered, unmount } = options

// @ts-expect-error
options._render = vnode => {
    const { _component } = vnode
    if (_component?.handleEvent && _component._tracked !== true) {
        _component._tracked = true
        Store.track()
    } 
    _render?.(vnode)
}

// @ts-expect-error
options._rendered = vnode => {
    let { _component } = vnode, tracked
    if (_component._tracked === true) {
        tracked = Store.untrack()
        if (tracked) {
            _component._tracked = tracked
            for (const store of tracked) {
                Store.listen(store as any, _component)
            }
        }
    }
    _rendered?.(vnode)
}

options.unmount = vnode => {
    // @ts-expect-error
    let { _component } = vnode, tracked = _component?._tracked
    if (tracked && tracked instanceof Set) {
        for (const store of tracked) {
            Store.stopListening(store, _component)
        }
    }
    unmount?.(vnode)
}
