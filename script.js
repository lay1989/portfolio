// Initialize Lucide Icons
lucide.createIcons();

// Theme Toggle Logic
const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn'); // Changed to querySelectorAll
const htmlElement = document.documentElement;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    if (savedTheme === 'dark') {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }
} else {
    htmlElement.classList.remove('dark');
}

function toggleTheme() {
    htmlElement.classList.toggle('dark');
    const isDark = htmlElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Attach listeners to all theme toggle buttons
themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', toggleTheme);
});


// Mobile Menu Logic
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLinks = mobileMenu.querySelectorAll('a');
const hamburger = document.querySelector('.hamburger');

if(mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('flex');
        hamburger.classList.toggle('active');
    });
}

mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
        hamburger.classList.remove('active');
    });
});


// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('nav-scrolled');
        // Fix for navbar background color in light/dark mode when scrolled using inline styles or specific class logic
        if(htmlElement.classList.contains('dark')) {
            navbar.style.backgroundColor = 'rgba(8, 8, 8, 0.8)';
        } else {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        }
    } else {
        navbar.classList.remove('nav-scrolled');
        navbar.style.backgroundColor = 'transparent';
    }
});

// Scroll Reveal Animation
const revealElements = document.querySelectorAll('.reveal');

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


// Form submission
const form = document.getElementById("contact-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  
  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString(),
  })
  .then(() => {
    // Show your success UI/Message here
    alert("Success!");
  })
  .catch((error) => alert(error));
});

// Load More Projects Logic
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const projectsContainer = document.getElementById('projects-container');

if(loadMoreBtn && projectsContainer) {
    let currentIndex = 3; // Start showing 3 projects
    const projectsPerLoad = 3;
    const allProjects = projectsContainer.querySelectorAll('.project-item');
    const totalProjects = allProjects.length;

    function showProjects() {
        let visibleCount = 0;
        allProjects.forEach((project, index) => {
            if(index < currentIndex) {
                project.style.display = 'block';
                visibleCount++;
            } else {
                project.style.display = 'none';
            }
        });

        // Hide "Load More" button if all projects are visible
        if(currentIndex >= totalProjects) {
            loadMoreContainer.style.display = 'none';
        }

        // Re-initialize lucide icons for newly visible projects
        lucide.createIcons();
    }

    loadMoreBtn.addEventListener('click', () => {
        currentIndex += projectsPerLoad;
        showProjects();
    });

    // Initial setup - hide all projects initially, then show first 3
    allProjects.forEach((project, index) => {
        project.style.display = 'none';
    });
    showProjects();
}
