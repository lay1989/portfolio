// Mock global variables to simulate the browser environment
globalThis.window = globalThis;
let observerCallback = null;
let observerInstance = null;

globalThis.document = {
    querySelector: (selector) => {
        if (selector === '#load-more-container') {
            return {
                querySelector: (subSelector) => {
                    if (subSelector === 'button') {
                        return { style: {} };
                    }
                    return null;
                },
                style: {}
            };
        }
        if (selector === '#projects-container') {
            return {
                querySelectorAll: () => [
                    { classList: { remove: () => {}, add: () => {} } },
                    { classList: { remove: () => {}, add: () => {} } },
                    { classList: { remove: () => {}, add: () => {} } },
                    { classList: { remove: () => {}, add: () => {} } },
                    { classList: { remove: () => {}, add: () => {} } },
                ] // 5 projects
            };
        }
        return null;
    }
};

globalThis.IntersectionObserver = class {
    constructor(callback) {
        this.callback = callback;
        observerCallback = callback;
        observerInstance = this;
    }
    observe() {}
    disconnect() {
        console.log("SUCCESS: observer.disconnect() was successfully called from inside the closure!");
    }
};

// Import and run
import('../../src/components.js').then((module) => {
    try {
        console.log("--- Test Case 1: Initial call with 5 projects (no disconnect yet) ---");
        module.initLoadMoreProjects();
        
        console.log("--- Test Case 2: Simulating intersection trigger ---");
        if (observerCallback && observerInstance) {
            // Simulate intersection entry
            observerCallback([{ isIntersecting: true }]);
        } else {
            console.error("Observer callback or instance was not captured!");
        }
    } catch (e) {
        console.error("FAILURE:", e);
    }
}).catch((e) => {
    console.error("Import failure:", e);
});
