const fs = require('fs');
const path = require('path');

async function testReadingProgressBar() {
    console.log('==================================================');
    console.log(' STARTING READING PROGRESS BAR EMPIRICAL TESTS');
    console.log('==================================================');

    let scrollListeners = [];
    let resizeListeners = [];

    // Mock DOM and window
    const mockWindow = {
        location: {
            pathname: '/blog-custom-websites.html'
        },
        scrollY: 0,
        addEventListener(event, handler, options) {
            if (event === 'scroll') {
                scrollListeners.push({ handler, options });
            } else if (event === 'resize' || event === 'orientationchange') {
                resizeListeners.push({ handler, options });
            }
        },
        removeEventListener(event, handler) {
            if (event === 'scroll') {
                scrollListeners = scrollListeners.filter(l => l.handler !== handler);
            } else if (event === 'resize' || event === 'orientationchange') {
                resizeListeners = resizeListeners.filter(l => l.handler !== handler);
            }
        }
    };

    const mockDocument = {
        documentElement: {
            scrollTop: 0,
            scrollHeight: 1000,
            clientHeight: 200
        },
        body: {
            appendChild: (el) => {
                mockDocument.appendedElement = el;
            }
        },
        createElement(tagName) {
            return {
                tagName: tagName.toUpperCase(),
                style: {},
                setAttribute(name, value) {
                    this[name] = value;
                }
            };
        },
        getElementById(id) {
            if (mockDocument.appendedElement && mockDocument.appendedElement.id === id) {
                return mockDocument.appendedElement;
            }
            return null;
        },
        querySelector(selector) {
            if (selector === 'article') {
                return { tagName: 'ARTICLE' };
            }
            return null;
        }
    };

    global.window = mockWindow;
    global.document = mockDocument;

    // Load throttle from utils
    const { throttle } = await import('../../src/utils.js');
    const { initReadingProgressBar } = await import('../../src/animations.js');

    // TEST 1: Initializing on a non-blog page
    mockWindow.location.pathname = '/index.html';
    mockDocument.appendedElement = null;
    scrollListeners = [];
    initReadingProgressBar(throttle);
    if (mockDocument.appendedElement === null && scrollListeners.length === 0) {
        console.log('✅ Test 1 Passed: Does not initialize on index.html');
    } else {
        console.log('❌ Test 1 Failed: Initialized progress bar on non-blog page!');
    }

    // TEST 2: Initializing on a blog page
    mockWindow.location.pathname = '/blog-custom-websites.html';
    mockDocument.appendedElement = null;
    scrollListeners = [];
    initReadingProgressBar(throttle);
    if (mockDocument.appendedElement !== null && mockDocument.appendedElement.id === 'reading-progress') {
        console.log('✅ Test 2.1 Passed: Correctly loaded and initialized on blog-custom-websites.html');
    } else {
        console.log('❌ Test 2.1 Failed: Progress bar element not created/appended!');
    }
    if (scrollListeners.length === 1) {
        console.log('✅ Test 2.2 Passed: Scroll listener registered');
    } else {
        console.log(`❌ Test 2.2 Failed: Expected 1 scroll listener, found ${scrollListeners.length}`);
    }

    // TEST 3: Scroll tracking calculation
    const bar = mockDocument.appendedElement;
    mockWindow.scrollY = 400; // scroll top = 400
    // docHeight = scrollHeight - clientHeight = 1000 - 200 = 800
    // expected percent = 400 / 800 * 100 = 50%
    
    // Let's trigger the scroll handler directly
    const scrollHandler = scrollListeners[0].handler;
    scrollHandler();
    // Since throttle is async for subsequent calls, let's wait a moment
    await new Promise(resolve => setTimeout(resolve, 150));
    
    if (bar.style.width === '50%') {
        console.log('✅ Test 3 Passed: Scroll percentage correctly calculated at 50%');
    } else {
        console.log(`❌ Test 3 Failed: Expected width to be 50%, got ${bar.style.width}`);
    }

    // TEST 4: Listener leak prevention
    // Run initialization again
    initReadingProgressBar(throttle);
    if (scrollListeners.length === 1) {
        console.log('✅ Test 4 Passed: Previous listener removed, no leak (total listener count is 1)');
    } else {
        console.log(`❌ Test 4 Failed: Memory leak! Duplicate listener found, total count: ${scrollListeners.length}`);
    }

    // TEST 5: Resizing & Orientation changes stability
    // Trigger scroll handler while docHeight changes
    mockDocument.documentElement.scrollHeight = 1200;
    mockDocument.documentElement.clientHeight = 200;
    mockWindow.scrollY = 500; // docHeight = 1000, percentage = 50%
    
    let threwError = false;
    try {
        scrollListeners[0].handler();
        await new Promise(resolve => setTimeout(resolve, 150));
    } catch (e) {
        threwError = true;
        console.error('Error during scroll update under layout shift:', e);
    }

    if (!threwError && bar.style.width === '50%') {
        console.log('✅ Test 5 Passed: Handled resizing/orientation changes correctly without throwing errors');
    } else {
        console.log(`❌ Test 5 Failed: Width is ${bar.style.width}, threwError: ${threwError}`);
    }

    console.log('==================================================');
    console.log(' TESTS COMPLETE');
    console.log('==================================================');
}

testReadingProgressBar().catch(console.error);
