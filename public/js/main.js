// ==========================================
// Navigation Functionality
// ==========================================

class Navigation {
  constructor() {
    this.navbar = document.querySelector('.navbar');
    this.mobileToggle = document.querySelector('.mobile-menu-toggle');
    this.navMenu = document.querySelector('.nav-menu');
    this.navLinks = document.querySelectorAll('.nav-menu a');
    
    this.init();
  }
  
  init() {
    // Mobile menu toggle
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
    }
    
    // Close mobile menu when clicking a link
    this.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.closeMobileMenu();
        }
      });
    });
    
    // Highlight active page
    this.highlightActivePage();
    
    // Scroll effects
    this.handleScroll();
    window.addEventListener('scroll', () => this.handleScroll());
    
    // Close mobile menu on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeMobileMenu();
      }
    });
  }
  
  toggleMobileMenu() {
    this.navMenu.classList.toggle('active');
    this.animateMobileToggle();
  }
  
  closeMobileMenu() {
    this.navMenu.classList.remove('active');
    this.resetMobileToggle();
  }
  
  animateMobileToggle() {
    const spans = this.mobileToggle.querySelectorAll('span');
    if (this.navMenu.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translateY(10px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translateY(-10px)';
    } else {
      this.resetMobileToggle();
    }
  }
  
  resetMobileToggle() {
    const spans = this.mobileToggle.querySelectorAll('span');
    spans.forEach(span => {
      span.style.transform = '';
      span.style.opacity = '';
    });
  }
  
  highlightActivePage() {
    const currentPath = window.location.pathname;
    this.navLinks.forEach(link => {
      const linkPath = new URL(link.href).pathname;
      if (currentPath === linkPath || (currentPath === '/' && linkPath === '/')) {
        link.classList.add('active');
      }
    });
  }
  
  handleScroll() {
    if (window.scrollY > 100) {
      this.navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else {
      this.navbar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    }
  }
}

// ==========================================
// Carousel/Slider Functionality
// ==========================================

class Carousel {
  constructor(element) {
    // Always use the parent .hero-carousel as the root for queries
    this.carousel = element.closest('.hero-carousel') || element;
    this.slides = this.carousel.querySelectorAll('.carousel-slide');
    this.dots = this.carousel.querySelectorAll('.carousel-dot');
    this.prevBtn = this.carousel.querySelector('.carousel-prev');
    this.nextBtn = this.carousel.querySelector('.carousel-next');
    this.currentSlide = 0;
    this.autoPlayInterval = null;
    this.init();
  }
  
  init() {
    if (this.slides.length === 0) return;
    
    // Show first slide
    this.showSlide(0);
    
    // Navigation buttons
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.previousSlide());
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.nextSlide());
    }
    
    // Dots navigation
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.showSlide(index));
    });
    
    // Auto play
    this.startAutoPlay();
    
    // Pause on hover
    this.carousel.addEventListener('mouseenter', () => this.stopAutoPlay());
    this.carousel.addEventListener('mouseleave', () => this.startAutoPlay());
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.previousSlide();
      if (e.key === 'ArrowRight') this.nextSlide();
    });
  }
  
  showSlide(index) {
    // Hide all slides
    this.slides.forEach(slide => {
      slide.classList.remove('active');
      slide.style.opacity = '0';
    });
    
    // Remove active from all dots
    this.dots.forEach(dot => dot.classList.remove('active'));
    
    // Show current slide
    this.currentSlide = index;
    this.slides[this.currentSlide].classList.add('active');
    this.slides[this.currentSlide].style.opacity = '1';
    
    // Activate current dot
    if (this.dots[this.currentSlide]) {
      this.dots[this.currentSlide].classList.add('active');
    }
  }
  
  nextSlide() {
    let next = this.currentSlide + 1;
    if (next >= this.slides.length) {
      next = 0;
    }
    this.showSlide(next);
  }
  
  previousSlide() {
    let prev = this.currentSlide - 1;
    if (prev < 0) {
      prev = this.slides.length - 1;
    }
    this.showSlide(prev);
  }
  
  startAutoPlay() {
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => this.nextSlide(), 5000);
  }
  
  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }
}

// ==========================================
// IPO Countdown Timer
// ==========================================
class CountdownTimer {
  constructor(targetDateStr, ids) {
    this.targetDate = new Date(targetDateStr);
    this.ids = ids; // { days, hours, mins, secs }
    this.interval = null;
    this.init();
  }
  init() {
    // Only run if the elements exist (i.e., IPO slide is on this page)
    if (!document.getElementById(this.ids.days)) return;
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  }
  tick() {
    const now = new Date();
    const diff = this.targetDate - now;
    if (diff <= 0) {
      this.showExpired();
      clearInterval(this.interval);
      return;
    }
    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    document.getElementById(this.ids.days).textContent  = String(days).padStart(2, '0');
    document.getElementById(this.ids.hours).textContent = String(hours).padStart(2, '0');
    document.getElementById(this.ids.mins).textContent  = String(minutes).padStart(2, '0');
    document.getElementById(this.ids.secs).textContent  = String(seconds).padStart(2, '0');
  }
  showExpired() {
    const container = document.querySelector('.ipo-countdown');
    if (container) {
      container.innerHTML = '<p class="countdown-expired">THIS OFFER HAS CLOSED</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------
  // UPDATE THE IPO CLOSING DATE:
  // Change the date string below to the new closing date.
  // Format: 'YYYY-MM-DDTHH:MM:SS'
  // -------------------------------------------------------
  new CountdownTimer('2026-02-19T17:00:00', {
    days:  'ipo-days',
    hours: 'ipo-hours',
    mins:  'ipo-mins',
    secs:  'ipo-secs'
  });
});

// ==========================================
// Smooth Scroll
// ==========================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ==========================================
// Animations on Scroll
// ==========================================

class ScrollAnimations {
  constructor() {
    this.observers = [];
    this.init();
  }
  
  init() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(el => observer.observe(el));
  }
}

// ==========================================
// Form Validation
// ==========================================

class FormValidator {
  constructor(form) {
    this.form = form;
    this.init();
  }
  
  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }
  
  handleSubmit(e) {
    e.preventDefault();
    
    if (this.validateForm()) {
      this.submitForm();
    }
  }
  
  validateForm() {
    let isValid = true;
    const inputs = this.form.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        this.showError(input, 'This field is required');
        isValid = false;
      } else if (input.type === 'email' && !this.isValidEmail(input.value)) {
        this.showError(input, 'Please enter a valid email');
        isValid = false;
      } else {
        this.clearError(input);
      }
    });
    
    return isValid;
  }
  
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  showError(input, message) {
    const formGroup = input.parentElement;
    let error = formGroup.querySelector('.error-message');
    
    if (!error) {
      error = document.createElement('span');
      error.className = 'error-message';
      formGroup.appendChild(error);
    }
    
    error.textContent = message;
    input.classList.add('error');
  }
  
  clearError(input) {
    const formGroup = input.parentElement;
    const error = formGroup.querySelector('.error-message');
    
    if (error) {
      error.remove();
    }
    
    input.classList.remove('error');
  }
  
  async submitForm() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showSuccessMessage();
        this.form.reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('There was an error submitting the form. Please try again.');
    }
  }
  
  showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = 'Thank you! Your message has been sent.';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 5000);
  }
}

// ==========================================
// Initialize Everything
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  new Navigation();
  
  const heroCarousel = document.querySelector('.hero-carousel');
  if (heroCarousel) {
    new Carousel(heroCarousel);
  }
  
  initSmoothScroll();
  new ScrollAnimations();
  
  document.querySelectorAll('form').forEach(form => {
    new FormValidator(form);
  });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Navigation,
    Carousel,
    ScrollAnimations,
    FormValidator
  };
}