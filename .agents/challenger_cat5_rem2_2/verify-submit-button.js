const fs = require('fs');
const path = require('path');

// Mock browser environment
const mockWindow = {
  location: {
    pathname: '/',
    protocol: 'http:',
    includes(val) { return this.pathname.includes(val); },
    endsWith(val) { return this.pathname.endsWith(val); }
  },
  lucide: {
    createIcons() {}
  }
};

class MockElement {
  constructor(tag, id = '', textContent = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.textContent = textContent;
    this.disabled = false;
    this.className = '';
    this.listeners = {};
    this.parentNode = {
      replaceChild: (newChild, oldChild) => {
        // Mock replacement behavior
        this.replacedWith = newChild;
      }
    };
    this.children = [];
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  querySelector(selector) {
    if (selector === '#submit-btn') {
      return this.submitBtn;
    }
    return null;
  }

  cloneNode(deep) {
    const clone = new MockElement(this.tagName, this.id, this.textContent);
    clone.submitBtn = this.submitBtn;
    clone.parentNode = this.parentNode;
    return clone;
  }

  reset() {
    this.resetCalled = true;
  }
}

const mockDocument = {
  readyState: 'complete',
  contactForm: null,
  statusEl: null,
  submitBtn: null,
  getElementById(id) {
    if (id === 'contact-form') return this.contactForm;
    if (id === 'contact-status') return this.statusEl;
    return null;
  }
};

// Set globals
global.window = mockWindow;
global.document = mockDocument;

// Mock FormData and URLSearchParams
global.FormData = class {
  constructor(form) {
    this.form = form;
  }
};
global.URLSearchParams = class {
  constructor(data) {
    this.data = data;
  }
  toString() {
    return 'mock-form-data';
  }
};

let fetchResolver;
let fetchRejecter;
global.fetch = () => {
  return new Promise((resolve, reject) => {
    fetchResolver = resolve;
    fetchRejecter = reject;
  });
};

async function testSubmitButton() {
  console.log('Testing contact form submit double submission prevention...');

  // Initialize elements
  const contactForm = new MockElement('form', 'contact-form');
  const submitBtn = new MockElement('button', 'submit-btn', 'Submit Message');
  const statusEl = new MockElement('div', 'contact-status');

  contactForm.submitBtn = submitBtn;
  mockDocument.contactForm = contactForm;
  mockDocument.statusEl = statusEl;

  // Import components.js
  const components = await import('../../src/components.js');
  components.initContactForm();

  // The form is replaced during initContactForm to avoid duplicate listeners.
  // Retrieve the cloned/replaced form that has the actual event listener attached.
  const activeForm = contactForm.replacedWith;
  if (!activeForm) {
    throw new Error('Form was not correctly replaced/cloned.');
  }

  const submitCallbacks = activeForm.listeners['submit'];
  if (!submitCallbacks || submitCallbacks.length === 0) {
    throw new Error('No submit event listener attached to the replaced form.');
  }

  // Verify initial state
  console.log(`Initial button state: disabled=${submitBtn.disabled}, text="${submitBtn.textContent}"`);
  if (submitBtn.disabled !== false) {
    throw new Error('Submit button should be enabled initially');
  }

  // Trigger submit event
  const mockEvent = {
    preventDefault: () => {}
  };
  
  // Execute submit callback
  submitCallbacks[0](mockEvent);

  // Verify transition state (during simulated network request)
  console.log(`During fetch state: disabled=${submitBtn.disabled}, text="${submitBtn.textContent}"`);
  if (submitBtn.disabled !== true) {
    throw new Error('Submit button should be disabled during active fetch');
  }
  if (submitBtn.textContent !== 'Sending...') {
    throw new Error('Submit button text should change to "Sending..." during active fetch');
  }

  // Resolve fetch to simulate success
  fetchResolver({
    ok: true,
    status: 200
  });

  // Wait for promises to run down
  await new Promise(resolve => setTimeout(resolve, 10));

  // Verify end state (success path)
  console.log(`After successful fetch: disabled=${submitBtn.disabled}, text="${submitBtn.textContent}"`);
  if (submitBtn.disabled !== false) {
    throw new Error('Submit button should be re-enabled after success');
  }
  if (submitBtn.textContent !== 'Submit Message') {
    throw new Error('Submit button text should be restored after success');
  }
  if (!activeForm.resetCalled) {
    throw new Error('Form reset should be called on successful submit');
  }

  // Test error path
  console.log('Testing error/reject path...');
  submitCallbacks[0](mockEvent); // Trigger submit again
  
  if (submitBtn.disabled !== true || submitBtn.textContent !== 'Sending...') {
    throw new Error('Submit button did not lock on second submit');
  }

  // Reject fetch
  fetchRejecter(new Error('Network error'));

  await new Promise(resolve => setTimeout(resolve, 10));

  console.log(`After failed fetch: disabled=${submitBtn.disabled}, text="${submitBtn.textContent}"`);
  if (submitBtn.disabled !== false) {
    throw new Error('Submit button should be re-enabled after error');
  }
  if (submitBtn.textContent !== 'Submit Message') {
    throw new Error('Submit button text should be restored after error');
  }

  console.log('✅ ALL SUBMIT BUTTON VERIFICATIONS PASSED.');
}

testSubmitButton().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
