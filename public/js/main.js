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
    if (this.ids.days === 'ipo-days') {
      const offerContainer = document.getElementById('offer-countdown');
      if (offerContainer) {
        offerContainer.innerHTML = '<p class="countdown-expired">IPO OFFER HAS CLOSED</p>';
      }
    } else if (this.ids.days === 'ipo2-days') {
      const listingContainer = document.getElementById('listing-countdown');
      if (listingContainer) {
        listingContainer.innerHTML = '<p class="countdown-expired">IPO LISTING IS OPEN</p>';
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------
  // UPDATE IPO DATES:
  // Format: 'YYYY-MM-DDTHH:MM:SS'
  // -------------------------------------------------------
  // IPO offer closing timer
  new CountdownTimer('2026-02-24T17:00:00', {
    days:  'ipo-days',
    hours: 'ipo-hours',
    mins:  'ipo-mins',
    secs:  'ipo-secs'
  });

  // IPO listing opens timer
  new CountdownTimer('2026-03-10T09:31:00', {
    days:  'ipo2-days',
    hours: 'ipo2-hours',
    mins:  'ipo2-mins',
    secs:  'ipo2-secs'
  });
});

// ==========================================
// Scroll Down Arrow
// ==========================================
function initScrollDownArrow() {
  const arrow = document.getElementById('scroll-down-arrow');
  if (!arrow) return;

  // Hide arrow on scroll
  function toggleArrow() {
    if (window.scrollY > 50) {
      arrow.classList.add('hide');
    } else {
      arrow.classList.remove('hide');
    }
  }
  window.addEventListener('scroll', toggleArrow);
  toggleArrow();

  // Scroll to next section on click
  arrow.addEventListener('click', () => {
    const nextSection = document.querySelector('.welcome-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

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

// Initialize Everything

document.addEventListener('DOMContentLoaded', () => {
  
  const heroCarousel = document.querySelector('.hero-carousel');
  if (heroCarousel) {
    new Carousel(heroCarousel);
  }
  
  initSmoothScroll();
  
  initScrollDownArrow();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Carousel
  };
}