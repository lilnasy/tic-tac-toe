/**
 * Throttle a function to limit its execution rate
 * 
 * 
 * Creates a throttled function that limits calls to the original function
 * to at most once every wait milliseconds. It guarantees execution after
 * the final invocation and maintains the last context (this) and arguments.
 * 
 * @param callback - The function to be throttled.
 * @param wait - The number of milliseconds to wait between calls.
 * @returns A throttled function.
 */
export function throttle<T extends (...args: any[]) => any>(callback: T, wait: number) {
	let timeoutId: ReturnType<typeof setTimeout>
	let lastCallTime = 0

	function apply(this_: ThisParameterType<T>, arguments_: Parameters<T>) {
		lastCallTime = Date.now()
		callback.apply(this_, arguments_)
	}

	return function throttled(this: ThisParameterType<T>, ...arguments_: Parameters<T>) {
		clearTimeout(timeoutId)

		const timeSinceLastCall = Date.now() - lastCallTime
		const delayForNextCall = wait - timeSinceLastCall

		if (delayForNextCall <= 0) {
			apply(this, arguments_)
		} else {
			timeoutId = setTimeout(apply, delayForNextCall, this, arguments_)
		}
	} 
}
