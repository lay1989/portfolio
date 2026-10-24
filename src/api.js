/**
 * @file api.js
 * @description Centralized API module for handling network requests.
 */

/**
 * Submits the contact form data to the backend.
 * @param {FormData} formData - The form data to submit.
 * @returns {Promise<Response>} The fetch response.
 */
export async function submitContactForm(formData) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        return await fetch('./', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString(),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}
