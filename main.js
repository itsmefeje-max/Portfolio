/* -- Indicating what the script is for: Logic for Shiny Text, Mobile Interactions, Animations, and Clean URLs */

// 1. SHINY TEXT (Logo) - Defensive Initialization
document.addEventListener('DOMContentLoaded', () => {
  const logoText = document.querySelector('#nav-logo-text');
  
  // Safety check: Ensure ShinyText loaded correctly before initializing
  if (logoText && typeof ShinyText !== 'undefined') {
    new ShinyText(logoText, {
      text: "Itsmefeje", 
      speed: 3,
      color: '#b5b5b5',
      shineColor: '#ffffff',
      pauseOnHover: true
    });
  }
});

// 2. SCROLL REVEAL - Optimized Observer
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      observer.unobserve(entry.target); // Memory cleanup once revealed
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// 3. SPOTLIGHT MOUSE & TOUCH TRACKING - Hardware Accelerated (RAF)
document.querySelectorAll('.spotlight-card').forEach(card => {
  let ticking = false; // Used to debounce rapid event firing

  // Desktop
  card.addEventListener('mousemove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Mobile
  card.addEventListener('touchmove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          card.style.setProperty('--mouse-x', `${touch.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${touch.clientY - rect.top}px`);
          card.classList.add('touch-active');
        } else {
          card.classList.remove('touch-active');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  card.addEventListener('touchend', () => {
    setTimeout(() => card.classList.remove('touch-active'), 500);
  });
});

// 4. MOBILE MENU, STATE MANAGEMENT & YEAR
const mobileBtn = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

// Helper function to handle menu state and accessibility
const toggleMobileMenu = (forceClose = false) => {
  if (!mobileBtn || !navLinks) return;
  
  const isOpen = navLinks.classList.contains('active');
  
  if (isOpen || forceClose) {
    navLinks.classList.remove('active');
    mobileBtn.classList.remove('open');
    mobileBtn.setAttribute('aria-expanded', 'false'); // A11y update
  } else if (!forceClose) {
    navLinks.classList.add('active');
    mobileBtn.classList.add('open');
    mobileBtn.setAttribute('aria-expanded', 'true'); // A11y update
  }
};

if (mobileBtn) {
  mobileBtn.addEventListener('click', () => toggleMobileMenu(false));
}

const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// 5. CLEAN URL HANDLING & SMOOTH SCROLLING
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // Close mobile menu safely if it's open
      toggleMobileMenu(true);

      // Handle Section Links (e.g. #about)
      if (href && href.length > 1) { 
        const targetId = href.substring(1); 
        const section = document.getElementById(targetId);
        
        if (section) {
          e.preventDefault(); 
          
          // Respect user OS preferences for reduced motion
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          section.scrollIntoView({ 
            behavior: prefersReducedMotion ? 'auto' : 'smooth' 
          });
        }
      }
    });
  });
});
