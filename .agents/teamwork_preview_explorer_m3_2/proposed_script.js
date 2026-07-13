// Theme Toggle Core Logic (must be global for state and toggling)
const htmlElement = document.documentElement;

function toggleTheme() {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        htmlElement.classList.add('light');
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.classList.add('dark');
        htmlElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    }
}

// Helper: Rewrite links for SPA-like navigation in a static site
function rewriteLinks(container, isHome) {
    if (!container) return;
    const links = container.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            if (isHome) {
                // For Homepage: convert `./index.html#about` to `#about`
                if (href.includes('index.html#')) {
                    const hash = href.split('#')[1];
                    link.setAttribute('href', `#${hash}`);
                } else if (href === './index.html' || href === 'index.html' || href === '/index.html') {
                    link.setAttribute('href', '#');
                }
            } else {
                // For subpages: convert absolute `/index.html` to `./index.html` to prevent hosting breakage
                if (href.startsWith('/index.html')) {
                    link.setAttribute('href', `.${href}`);
                } else if (href.startsWith('/blog.html')) {
                    link.setAttribute('href', `.${href}`);
                }
            }
        }
    });
}

// Helper: Highlight the active page link
function highlightActivePage(navbar) {
    if (!navbar) return;
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);

    const isBlog = filename === 'blog.html' || filename.startsWith('blog-');

    const updateActiveStyles = (link) => {
        const href = link.getAttribute('href');
        if (isBlog && href && href.includes('blog.html')) {
            link.classList.add('text-primary');
            link.classList.remove('text-muted-foreground');
        }
    };

    navbar.querySelectorAll('.nav-links-desktop a').forEach(updateActiveStyles);
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(updateActiveStyles);
    }
}

// Function to initialize all header & footer dynamic behaviors
function initializeComponents() {
    const isHomePage = window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/index.html') || 
                       window.location.pathname === '' || 
                       !window.location.pathname.includes('.html');

    const navbar = document.getElementById('navbar');
    const footer = document.querySelector('footer');

    // 1. Rewrite links based on context
    rewriteLinks(navbar, isHomePage);
    rewriteLinks(footer, isHomePage);

    // 2. Active Page Highlighting
    highlightActivePage(navbar);

    // 3. Attach listeners to theme toggle buttons
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    themeToggleBtns.forEach(btn => {
        btn.removeEventListener('click', toggleTheme); // Prevent duplicate listeners
        btn.addEventListener('click', toggleTheme);
    });

    // 4. Mobile Menu Logic
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburger = document.querySelector('.hamburger');

    if (mobileMenuBtn && mobileMenu) {
        // Prevent duplicate listener in case it runs twice
        const newMobileMenuBtn = mobileMenuBtn.cloneNode(true);
        mobileMenuBtn.parentNode.replaceChild(newMobileMenuBtn, mobileMenuBtn);

        newMobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('flex');
            const currentHamburger = document.querySelector('.hamburger');
            if (currentHamburger) currentHamburger.classList.toggle('active');
        });

        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('flex');
                const currentHamburger = document.querySelector('.hamburger');
                if (currentHamburger) currentHamburger.classList.remove('active');
            });
        });
    }

    // 5. Back to Top Button Logic
    const backToTopBtn = document.getElementById('back-to-top-btn');
    if (backToTopBtn) {
        // Prevent duplicate listeners
        const newBackToTopBtn = backToTopBtn.cloneNode(true);
        backToTopBtn.parentNode.replaceChild(newBackToTopBtn, backToTopBtn);

        newBackToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Show/hide button on scroll
        const toggleBackToTop = () => {
            if (window.scrollY > 300) {
                newBackToTopBtn.classList.remove('hidden');
            } else {
                newBackToTopBtn.classList.add('hidden');
            }
        };
        window.removeEventListener('scroll', toggleBackToTop);
        window.addEventListener('scroll', toggleBackToTop);
        toggleBackToTop(); // Initial check
    }

    // 6. Initialize Lucide Icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

// Main fetch and injection architecture
async function injectComponents() {
    // Check if we are running in file:// protocol (local file)
    // Fetch API is restricted by CORS on file://, so we fallback to static HTML
    if (window.location.protocol === 'file:') {
        console.warn('Running via file:// protocol. Dynamic component injection skipped, using fallback static HTML.');
        initializeComponents();
        return;
    }

    try {
        const [headerRes, footerRes] = await Promise.all([
            fetch('./components/header.html'),
            fetch('./components/footer.html')
        ]);

        if (headerRes.ok) {
            const headerHTML = await headerRes.text();
            const navbar = document.getElementById('navbar');
            if (navbar) navbar.innerHTML = headerHTML;
        } else {
            console.error('Failed to load header component. Using fallback HTML.');
        }

        if (footerRes.ok) {
            const footerHTML = await footerRes.text();
            const footer = document.querySelector('footer');
            if (footer) footer.innerHTML = footerHTML;
        } else {
            console.error('Failed to load footer component. Using fallback HTML.');
        }
    } catch (err) {
        console.error('Error fetching components. Using fallback HTML.', err);
    } finally {
        // Initialize interactive behaviors on either injected or fallback HTML
        initializeComponents();
    }
}

// Start injection on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectComponents);
} else {
    injectComponents();
}

// Navbar Scroll Effect (applied to whatever navbar wrapper is present)
const navbarWrapper = document.getElementById('navbar');
if (navbarWrapper) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbarWrapper.classList.add('nav-scrolled');
        } else {
            navbarWrapper.classList.remove('nav-scrolled');
        }
    });
}

// Scroll Reveal Animation (same as original)
const revealElements = document.querySelectorAll('.reveal');
if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    revealElements.forEach(el => revealObserver.observe(el));
}

// Form submission (with safety check for non-homepages)
const form = document.getElementById("contact-form");
if (form) {
    // Prevent duplicate listener in case script runs twice
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(newForm);
        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString(),
        })
        .then(() => {
            alert("Success!");
        })
        .catch((error) => alert(error));
    });
}

// Load More Projects Logic (same as original, with elements checks)
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const projectsContainer = document.getElementById('projects-container');

if (loadMoreBtn && projectsContainer) {
    let currentIndex = 3;
    const projectsPerLoad = 3;
    const allProjects = projectsContainer.querySelectorAll('.project-item');
    const totalProjects = allProjects.length;

    function showProjects() {
        allProjects.forEach((project, index) => {
            if (index < currentIndex) {
                project.style.display = 'block';
            } else {
                project.style.display = 'none';
            }
        });

        if (currentIndex >= totalProjects && loadMoreContainer) {
            loadMoreContainer.style.display = 'none';
        }

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // Prevent duplicate listener
    const newLoadMoreBtn = loadMoreBtn.cloneNode(true);
    loadMoreBtn.parentNode.replaceChild(newLoadMoreBtn, loadMoreBtn);

    newLoadMoreBtn.addEventListener('click', () => {
        currentIndex += projectsPerLoad;
        showProjects();
    });

    allProjects.forEach((project, index) => {
        project.style.display = 'none';
    });
    showProjects();
}
