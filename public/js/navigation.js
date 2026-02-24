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

// Initialize Navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
  });
} else {
  new Navigation();
}
