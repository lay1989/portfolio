/**
 * Throttles a function to execute at most once every limit milliseconds,
 * ensuring both the initial call and the final call are handled.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The limit in milliseconds.
 * @returns {Function} The throttled function.
 */
export function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
        const context = this;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                func.apply(context, args);
                lastRan = Date.now();
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Debounces a function to delay its execution until delay milliseconds have elapsed.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        const context = this;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}
