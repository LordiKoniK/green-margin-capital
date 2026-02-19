// ==========================================
// SERVICES PAGE - ADVANCED ANIMATIONS
// ==========================================

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Add staggered delay based on service index
            setTimeout(() => {
                entry.target.classList.add('aos-animate');
                
                // Trigger badge animations inside this service
                const badges = entry.target.querySelectorAll('.highlight-badge');
                badges.forEach((badge, badgeIndex) => {
                    const delay = badge.dataset.delay || (badgeIndex * 100);
                    setTimeout(() => {
                        badge.classList.add('badge-visible');
                    }, parseInt(delay));
                });
            }, index * 150);
        }
    });
}, observerOptions);

// ==========================================
// ADVANCED CIRCLE ANIMATIONS
// ==========================================
function initCircleParallax() {
    const showcases = document.querySelectorAll('.service-showcase');
    
    showcases.forEach(showcase => {
        const circles = showcase.querySelectorAll('.circle-image');
        
        // Mouse move parallax effect
        showcase.addEventListener('mousemove', (e) => {
            const rect = showcase.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            circles.forEach((circle, index) => {
                const depth = (index + 1) * 0.1;
                const moveX = x * depth;
                const moveY = y * depth;
                
                circle.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
        
        // Reset on mouse leave
        showcase.addEventListener('mouseleave', () => {
            circles.forEach(circle => {
                circle.style.transform = '';
            });
        });
    });
}

// ==========================================
// SMOOTH BADGE REVEALS
// ==========================================
function initBadgeAnimations() {
    const badges = document.querySelectorAll('.highlight-badge');
    
    badges.forEach((badge, index) => {
        // Set initial state
        badge.style.opacity = '0';
        badge.style.transform = 'translateX(-30px)';
        badge.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    });
}

// Add visible class styling via JS
const style = document.createElement('style');
style.textContent = `
    .highlight-badge.badge-visible {
        opacity: 1 !important;
        transform: translateX(0) !important;
    }
`;
document.head.appendChild(style);

// ==========================================
// ICON ROTATION ON SCROLL
// ==========================================
function initIconRotation() {
    const icons = document.querySelectorAll('.service-icon-large');
    
    window.addEventListener('scroll', () => {
        icons.forEach(icon => {
            const rect = icon.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const scrollProgress = (windowHeight - rect.top) / windowHeight;
            
            if (scrollProgress > 0 && scrollProgress < 1) {
                const rotation = scrollProgress * 360;
                icon.style.transform = `rotate(${rotation}deg)`;
            }
        });
    });
}

// ==========================================
// CIRCLE ZOOM ON VIEW
// ==========================================
function initCircleZoom() {
    const circleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const circles = entry.target.querySelectorAll('.circle-image');
                circles.forEach((circle, index) => {
                    setTimeout(() => {
                        circle.style.opacity = '1';
                        circle.style.transform = '';
                    }, index * 200);
                });
            }
        });
    }, { threshold: 0.2 });
    
    document.querySelectorAll('.circle-images').forEach(group => {
        const circles = group.querySelectorAll('.circle-image');
        circles.forEach(circle => {
            circle.style.opacity = '0';
            circle.style.transform = 'scale(0.5)';
            circle.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });
        circleObserver.observe(group);
    });
}

// ==========================================
// TECH CALLOUT PULSE ANIMATION
// ==========================================
function initTechCalloutPulse() {
    const callouts = document.querySelectorAll('.tech-callout');
    
    callouts.forEach(callout => {
        let pulseInterval;
        
        const startPulse = () => {
            pulseInterval = setInterval(() => {
                callout.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    callout.style.transform = 'scale(1)';
                }, 200);
            }, 2000);
        };
        
        const stopPulse = () => {
            clearInterval(pulseInterval);
            callout.style.transform = 'scale(1)';
        };
        
        callout.style.transition = 'transform 0.3s ease';
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startPulse();
                } else {
                    stopPulse();
                }
            });
        });
        
        observer.observe(callout);
    });
}

// ==========================================
// BADGE HOVER EFFECTS
// ==========================================
function initBadgeHoverEffects() {
    const badges = document.querySelectorAll('.highlight-badge');
    
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            // Slightly move other badges in same group
            const siblings = Array.from(this.parentElement.children).filter(el => el !== this);
            siblings.forEach(sibling => {
                sibling.style.transform = 'scale(0.98)';
                sibling.style.opacity = '0.7';
            });
        });
        
        badge.addEventListener('mouseleave', function() {
            const siblings = Array.from(this.parentElement.children).filter(el => el !== this);
            siblings.forEach(sibling => {
                sibling.style.transform = '';
                sibling.style.opacity = '';
            });
        });
    });
}

// ==========================================
// DECORATIVE ELEMENT ROTATION
// ==========================================
function initDecorationRotation() {
    const decorations = document.querySelectorAll('.visual-decoration');
    
    window.addEventListener('scroll', () => {
        decorations.forEach(decoration => {
            const rect = decoration.getBoundingClientRect();
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.1;
            
            decoration.style.transform = `rotate(${rate}deg)`;
        });
    });
}

// ==========================================
// RIPPLE EFFECT ON BUTTONS
// ==========================================
function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn-animated');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            this.appendChild(ripple);
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Add ripple CSS
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// ==========================================
// INITIALIZE ALL ANIMATIONS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Basic setup - DON'T hide sections, let CSS handle initial state
    initBadgeAnimations();

    // Observe elements for scroll animations
    const animatedElements = document.querySelectorAll('[data-aos]');
    animatedElements.forEach(el => observer.observe(el));

    // Advanced interactions
    setTimeout(() => {
        initCircleParallax();
        initMagneticButtons();
        initCircleZoom();
        initTechCalloutPulse();
        initBadgeHoverEffects();
        initDecorationRotation();
        initRippleEffect();

        // Mark that JS has loaded (move to end)
        document.documentElement.classList.add('js-loaded');
    }, 100);
});

// ==========================================
// PERFORMANCE OPTIMIZATION
// ==========================================
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            // Scroll-based animations handled here
            ticking = false;
        });
        ticking = true;
    }
});