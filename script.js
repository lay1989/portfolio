// DOM elements
const loadingScreen = document.getElementById('loading-screen');
const scrollProgress = document.getElementById('scroll-progress');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

// Loading screen
window.addEventListener('load', () => {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1500);
});

// Scroll progress bar
function updateScrollProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / scrollHeight) * 100;
    scrollProgress.style.width = `${scrollPercent}%`;
}

window.addEventListener('scroll', updateScrollProgress);

// Dark mode toggle
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'enabled') {
    document.documentElement.classList.add('dark');
}

darkModeToggle.addEventListener('click', toggleDarkMode);

// Mobile menu toggle
mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when clicking on links
const mobileNavLinks = mobileMenu.querySelectorAll('a');
mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });
});

// Smooth scrolling for navigation links
const navLinks = document.querySelectorAll('a[href^="#"]');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.offsetTop;
            const offsetPosition = elementPosition - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

// Observe all scroll-animate elements
const scrollElements = document.querySelectorAll('.scroll-animate');
scrollElements.forEach(el => {
    observer.observe(el);
});

// Staggered animation for cards
const animateCards = () => {
    const cards = document.querySelectorAll('.scroll-animate');
    cards.forEach((card, index) => {
        if (card.classList.contains('animate')) {
            card.style.animationDelay = `${index * 0.1}s`;
        }
    });
};

// Apply staggered animations
setTimeout(animateCards, 1000);

// Contact form handling
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    // Show loading state
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    // Simulate form submission (replace with actual API call)
    setTimeout(() => {
        formMessage.classList.remove('hidden');
        formMessage.className = 'mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        formMessage.textContent = `Thank you, ${name}! Your message has been sent. I'll get back to you within 24 hours.`;
        
        // Reset form
        contactForm.reset();
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Hide message after 5 seconds
        setTimeout(() => {
            formMessage.classList.add('hidden');
        }, 5000);
    }, 2000);
});

// Active navigation highlighting
function highlightActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.pageYOffset >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('text-primary-600', 'dark:text-primary-400');
        link.classList.add('text-gray-600', 'dark:text-gray-300');
        
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.remove('text-gray-600', 'dark:text-gray-300');
            link.classList.add('text-primary-600', 'dark:text-primary-400');
        }
    });
}

window.addEventListener('scroll', highlightActiveNavigation);

// Performance optimization: Throttle scroll events
let ticking = false;

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            updateScrollProgress();
            highlightActiveNavigation();
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', onScroll);

// Keyboard navigation accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
});

// Add focus management for accessibility
const focusableElements = document.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
);

// Lazy loading for images
const lazyImages = document.querySelectorAll('img[loading="lazy"]');

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => {
        img.classList.add('lazy');
        imageObserver.observe(img);
    });
}

// Preload critical images
const criticalImages = [
    'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=600'
];

criticalImages.forEach(src => {
    const img = new Image();
    img.src = src;
});

// Initialize animations on page load
document.addEventListener('DOMContentLoaded', () => {
    // Add subtle entrance animations
    const hero = document.querySelector('#home .scroll-animate');
    if (hero) {
        setTimeout(() => {
            hero.classList.add('animate');
        }, 500);
    }
    
    // Initialize scroll progress
    updateScrollProgress();
    
    // Set initial navigation state
    highlightActiveNavigation();
});

// Enhanced error handling
window.addEventListener('error', (e) => {
    console.error('An error occurred:', e.error);
});

// Service Worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered:', registration))
        //     .catch(registrationError => console.log('SW registration failed:', registrationError));
    });
}