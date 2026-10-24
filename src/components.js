/**
 * Dynamic components injection and page-specific interactive logic.
 */

import { submitContactForm } from './api.js';
import { trackContactAction } from './analytics.js';

/**
 * Attaches the AJAX submit handler to the contact form.
 * @returns {void}
 */
export function initContactForm() {
    const form = document.querySelector('#contact-form');
    if (!form || form.dataset.initialized) return;
    form.dataset.initialized = 'true';
    const status = document.getElementById('contact-status');
    const button = form.querySelector('[type="submit"]');
    let sending = false;

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || !form.reportValidity()) return;
        sending = true;
        button.disabled = true;
        button.textContent = 'Sending…';
        form.setAttribute('aria-busy', 'true');
        status.hidden = false;
        status.textContent = 'Sending your project details…';
        status.dataset.state = 'sending';
        try {
            const response = await submitContactForm(new FormData(form));
            if (!response.ok) throw new Error('Submission failed');
            status.textContent = "Thanks. Your message has been sent. I'll reply by email.";
            status.dataset.state = 'success';
            form.reset();
            trackContactAction('generate_lead');
        } catch {
            status.textContent = "Your message could not be sent. Your details are still here. Please try again or use the email link below.";
            status.dataset.state = 'error';
        } finally {
            sending = false;
            button.disabled = false;
            button.textContent = 'Send project details';
            form.removeAttribute('aria-busy');
        }
    });
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

/**
 * Initializes the blog category filter and search functionality.
 */
export function initBlogFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('blog-search');
    const postRows = document.querySelectorAll('.post-row');
    const emptyState = document.getElementById('empty-state');
    const emptyQuery = document.getElementById('empty-query');

    if (!filterBtns.length || !searchInput || !postRows.length) return;

    let currentCategory = 'All';
    let currentSearch = '';

    const filterPosts = () => {
        let visibleCount = 0;
        const searchLower = currentSearch.toLowerCase();

        postRows.forEach(row => {
            const category = row.getAttribute('data-category') || '';
            const title = (row.querySelector('.post-title')?.textContent || '').toLowerCase();
            const dek = (row.querySelector('.post-dek')?.textContent || '').toLowerCase();
            
            const matchesCategory = currentCategory === 'All' || category === currentCategory;
            const matchesSearch = !searchLower || title.includes(searchLower) || dek.includes(searchLower) || category.toLowerCase().includes(searchLower);

            if (matchesCategory && matchesSearch) {
                row.classList.remove('hidden');
                visibleCount++;
            } else {
                row.classList.add('hidden');
            }
        });

        if (visibleCount === 0) {
            emptyState.classList.remove('hidden');
            if (currentSearch) {
                emptyQuery.textContent = currentSearch;
            } else {
                emptyQuery.textContent = currentCategory !== 'All' ? currentCategory : 'any criteria';
            }
        } else {
            emptyState.classList.add('hidden');
        }
    };

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            filterBtns.forEach(b => {
                b.setAttribute('aria-pressed', 'false');
                b.classList.remove('bg-foreground', 'text-background', 'border-foreground');
                b.classList.add('border-foreground/15', 'text-muted-foreground');
            });
            const target = e.currentTarget;
            target.setAttribute('aria-pressed', 'true');
            target.classList.add('bg-foreground', 'text-background', 'border-foreground');
            target.classList.remove('border-foreground/15', 'text-muted-foreground');

            currentCategory = target.getAttribute('data-filter');
            filterPosts();
        });
    });

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        filterPosts();
    });
}
