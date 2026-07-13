// Mock the browser environment
global.window = {
    lucide: {
        createIcons: () => {}
    },
    location: {
        pathname: '/'
    }
};

global.document = {
    readyState: 'complete',
    addEventListener: () => {},
    getElementById: (id) => {
        return null;
    },
    querySelector: (selector) => {
        if (selector === '#load-more-container') {
            return {
                querySelector: () => ({ style: {} }),
                style: {}
            };
        }
        if (selector === '#projects-container') {
            return {
                querySelectorAll: () => [
                    { classList: { remove: () => {}, add: () => {} } },
                    { classList: { remove: () => {}, add: () => {} } }
                ] // 2 projects
            };
        }
        return null;
    }
};

global.IntersectionObserver = class {
    constructor(cb, options) {
        this.cb = cb;
    }
    observe() {}
    disconnect() {}
};

async function test() {
    try {
        const { initLoadMoreProjects } = await import('../../src/components.js');
        initLoadMoreProjects();
        console.log("SUCCESS: Pagination init succeeded!");
    } catch (err) {
        console.error("FAILURE: Pagination init failed with error:\n", err);
    }
}

test();
