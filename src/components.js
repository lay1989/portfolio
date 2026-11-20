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
            if (response.status === 429) {
                status.textContent = 'Please wait before sending another message. Your details are still here. You can also use the email link below.';
                status.dataset.state = 'error';
                return;
            }
            if (!response.ok) throw new Error('Submission failed');
            status.textContent = "Thanks. Your message has been received.";
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
 * Initializes category filtering and live text search for tools.html.
 * @returns {void}
 */
export function initToolsFilter() {
    const filterContainer = document.getElementById('tool-category-filters');
    const searchInput = document.getElementById('tool-search');
    const toolsGrid = document.getElementById('tools-grid');

    if (!toolsGrid) return;

    const cards = Array.from(toolsGrid.querySelectorAll('.tool-card'));
    if (!cards.length) return;

    let activeCategory = 'All';
    let searchQuery = '';

    const filterButtons = filterContainer ? Array.from(filterContainer.querySelectorAll('.tool-filter-btn')) : [];

    const applyFilter = () => {
        const query = searchQuery.trim().toLowerCase();
        let visibleCount = 0;

        cards.forEach((card) => {
            const category = card.dataset.category || '';
            const tags = card.dataset.tags || '';
            const title = card.querySelector('.tool-title')?.textContent || '';
            const summary = card.querySelector('.tool-summary')?.textContent || '';
            const searchableText = `${title} ${summary} ${category} ${tags}`.toLowerCase();

            const matchesCategory = activeCategory === 'All' || category.toLowerCase() === activeCategory.toLowerCase();
            const matchesSearch = !query || searchableText.includes(query);

            const isVisible = matchesCategory && matchesSearch;
            card.classList.toggle('hidden', !isVisible);
            if (isVisible) visibleCount++;
        });

        let emptyState = document.getElementById('tools-empty-state');
        if (visibleCount === 0) {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.id = 'tools-empty-state';
                emptyState.className = 'col-span-full py-16 text-center text-muted-foreground';
                emptyState.innerHTML = '<p class="text-lg font-serif">No tools match your criteria.</p><p class="text-sm mt-2">Try searching for a different keyword or category.</p>';
                toolsGrid.appendChild(emptyState);
            }
            emptyState.hidden = false;
        } else if (emptyState) {
            emptyState.hidden = true;
        }
    };

    if (filterButtons.length) {
        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterButtons.forEach((b) => {
                    b.classList.remove('bg-foreground', 'text-background');
                    b.classList.add('border-foreground/20', 'text-muted-foreground');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('bg-foreground', 'text-background');
                btn.classList.remove('border-foreground/20', 'text-muted-foreground');
                btn.setAttribute('aria-pressed', 'true');

                activeCategory = btn.dataset.filter || 'All';
                applyFilter();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            applyFilter();
        });
    }
}
