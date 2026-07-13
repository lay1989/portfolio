/**
 * Dynamic components injection and page-specific interactive logic.
 */

import { submitContactForm } from './api.js';

/**
 * Attaches the AJAX submit handler to the contact form.
 * @returns {void}
 */
export function initContactForm() {
    /** @type {HTMLFormElement | null} */
    const contactForm = document.querySelector("#contact-form");
    if (contactForm) {
        // Prevent duplicate listener in case script runs twice
        const newForm = /** @type {HTMLFormElement} */ (contactForm.cloneNode(true));
        if (contactForm.parentNode) {
            contactForm.parentNode.replaceChild(newForm, contactForm);
        }

        newForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(newForm);
            const statusEl = document.getElementById("contact-status");
            const submitBtn = newForm.querySelector("#submit-btn");
            const originalBtnText = submitBtn ? submitBtn.textContent : "";
            
            // Clear status first
            if (statusEl) {
                statusEl.className = "hidden text-sm font-medium rounded-lg p-4 mt-4";
                statusEl.textContent = "";
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Sending...";
            }

            submitContactForm(formData)
            .then((response) => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                if (response.ok) {
                    if (statusEl) {
                        statusEl.textContent = "Thank you! Your message has been sent successfully.";
                        statusEl.className = "text-sm font-medium rounded-lg p-4 mt-4 bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 dark:bg-emerald-100 dark:text-emerald-800 dark:border-emerald-200 block transition-all duration-300 ease-out-expo";
                    }
                    newForm.reset();
                } else {
                    if (statusEl) {
                        statusEl.textContent = "Form submission failed. Please try again.";
                        statusEl.className = "text-sm font-medium rounded-lg p-4 mt-4 bg-red-950/30 text-red-400 border border-red-900/50 dark:bg-red-100 dark:text-red-800 dark:border-red-200 block transition-all duration-300 ease-out-expo";
                    }
                }
            })
            .catch((error) => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
                if (statusEl) {
                    statusEl.textContent = error.message || error || "An error occurred. Please try again.";
                    statusEl.className = "text-sm font-medium rounded-lg p-4 mt-4 bg-red-950/30 text-red-400 border border-red-900/50 dark:bg-red-100 dark:text-red-800 dark:border-red-200 block transition-all duration-300 ease-out-expo";
                }
            });
        });
    }
}

/**
 * Initializes the paginated loading logic for home page projects using IntersectionObserver.
 * @returns {void}
 */
export function initLoadMoreProjects() {
    /** @type {HTMLElement | null} */
    const loadMoreContainer = document.querySelector('#load-more-container');
    /** @type {HTMLElement | null} */
    const projectsContainer = document.querySelector('#projects-container');

    if (loadMoreContainer && projectsContainer) {
        let currentIndex = 3;
        const projectsPerLoad = 3;
        /** @type {NodeListOf<HTMLElement>} */
        const allProjects = projectsContainer.querySelectorAll('.project-item');
        const totalProjects = allProjects.length;

        // Hide the button visually but keep container for observing
        const btn = loadMoreContainer.querySelector('button');
        if (btn) btn.style.display = 'none';

        let observer;

        const showProjects = () => {
            let index = 0;
            for (const project of allProjects) {
                if (index < currentIndex) {
                    project.classList.remove('hidden');
                } else {
                    project.classList.add('hidden');
                }
                index++;
            }

            if (currentIndex >= totalProjects && loadMoreContainer) {
                loadMoreContainer.style.display = 'none';
                if (observer) observer.disconnect();
            }

            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        };

        // Initial setup
        showProjects();

        observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && currentIndex < totalProjects) {
                currentIndex += projectsPerLoad;
                showProjects();
            }
        }, { rootMargin: '100px' });

        observer.observe(loadMoreContainer);
    }
}
