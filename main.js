// Initialize Lucide icons
lucide.createIcons();

// Set current year in footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

themeToggle.addEventListener('click', () => {
  // Toggle dark class on html element
  html.classList.toggle('dark');
  
  // Store preference in localStorage
  localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  
  // Update icon
  const icons = themeToggle.querySelectorAll('i');
  icons.forEach(icon => icon.classList.toggle('hidden'));
});

// Check for saved theme preference
if (localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  html.classList.add('dark');
  themeToggle.querySelector('.dark\\:hidden').classList.add('hidden');
  themeToggle.querySelector('.dark\\:block').classList.remove('hidden');
}

// Scroll Progress Indicator
window.addEventListener('scroll', function() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrollPercent = (scrollTop / scrollHeight) * 100;
  document.querySelector('.scroll-progress').style.width = scrollPercent + '%';
});

// Particle Network Background
const canvas = document.getElementById('particle-network');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Particle class
class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
    this.color = `rgba(139, 92, 246, ${Math.random() * 0.5 + 0.1})`;
  }
  
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    
    // Boundary check
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }
  
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  connect(particles) {
    particles.forEach(particle => {
      const distance = Math.sqrt(
        Math.pow(this.x - particle.x, 2) + 
        Math.pow(this.y - particle.y, 2)
      );
      
      if (distance < 150) {
        ctx.strokeStyle = `rgba(99, 102, 241, ${1 - distance / 150})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();
      }
    });
  }
}

// Create particles
const particles = [];
for (let i = 0; i < 80; i++) {
  particles.push(new Particle());
}

// Animation loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(particle => {
    particle.update();
    particle.draw();
    particle.connect(particles);
  });
  
  requestAnimationFrame(animate);
}

animate();

// Resize handler
window.addEventListener('resize', function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Smooth scrolling for navigation
document.querySelectorAll('[data-section]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = link.getAttribute('data-section');
    document.getElementById(sectionId).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Form submission
document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Thank you for your message! (This is a demo, no data is actually sent)');
  e.target.reset();
});

// Interactive Timeline Animation
const timelineItems = document.querySelectorAll('.timeline-item');

function checkTimelineItems() {
  timelineItems.forEach(item => {
    const itemTop = item.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;
    
    if (itemTop < windowHeight * 0.8) {
      item.style.opacity = '1';
      item.style.transform = 'translateX(0)';
    }
  });
}

// Check on load and scroll
window.addEventListener('load', checkTimelineItems);
window.addEventListener('scroll', checkTimelineItems);