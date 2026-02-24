/* -- Core startup logic: safe initialization for UI effects and interactions. -- */

document.addEventListener('DOMContentLoaded', () => {
  const logoText = document.querySelector('#nav-logo-text');

  if (logoText && typeof window.ShinyText === 'function') {
    new window.ShinyText(logoText, {
      text: 'Itsmefeje',
      speed: 3,
      color: '#b5b5b5',
      shineColor: '#ffffff',
      pauseOnHover: true
    });
  }

  if (typeof window.initReactBits === 'function') {
    const hasReactBitsTargets = document.querySelector('.tilted-card, .magnet-btn, .blur-text, .scroll-reveal');
    if (hasReactBitsTargets) {
      window.initReactBits(document);
    }
  }

  const revealTargets = document.querySelectorAll('.reveal');
  if (revealTargets.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    revealTargets.forEach((el) => observer.observe(el));
  }

  document.querySelectorAll('.spotlight-card').forEach((card) => {
    let ticking = false;

    const updateSpotlight = (clientX, clientY) => {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
        ticking = false;
      });
    };

    card.addEventListener('mousemove', (event) => {
      updateSpotlight(event.clientX, event.clientY);
    }, { passive: true });

    card.addEventListener('touchmove', (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;

      updateSpotlight(touch.clientX, touch.clientY);
      card.classList.add('touch-active');
    }, { passive: true });

    card.addEventListener('touchend', () => {
      window.setTimeout(() => card.classList.remove('touch-active'), 500);
    });
  });

  const mobileBtn = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  const toggleMobileMenu = (forceClose = false) => {
    if (!mobileBtn || !navLinks) return;

    const isOpen = navLinks.classList.contains('active');
    if (isOpen || forceClose) {
      navLinks.classList.remove('active');
      mobileBtn.classList.remove('open');
      mobileBtn.setAttribute('aria-expanded', 'false');
      return;
    }

    navLinks.classList.add('active');
    mobileBtn.classList.add('open');
    mobileBtn.setAttribute('aria-expanded', 'true');
  };

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => toggleMobileMenu(false));
  }

  // Close mobile menu on Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleMobileMenu(true);
    }
  });

  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = String(new Date().getFullYear());
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');

      // Close mobile menu if open
      toggleMobileMenu(true);

      if (!href || href === '#') {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (href.length <= 1) return;

      const targetId = href.slice(1);
      const section = document.getElementById(targetId);
      if (!section) return;

      event.preventDefault();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });

  // Dropdown ARIA state management
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    if (!trigger) return;

    const setExpanded = (expanded) => {
      trigger.setAttribute('aria-expanded', expanded);
    };

    dropdown.addEventListener('mouseenter', () => setExpanded('true'));
    dropdown.addEventListener('mouseleave', () => setExpanded('false'));
    dropdown.addEventListener('focusin', () => setExpanded('true'));
    dropdown.addEventListener('focusout', (e) => {
      if (!dropdown.contains(e.relatedTarget)) {
        setExpanded('false');
      }
    });
  });

  // Discord Copy to Clipboard Logic
  const copyDiscord = document.getElementById('copy-discord');
  const discordVal = document.getElementById('discord-val');
  if (copyDiscord && discordVal) {
    copyDiscord.addEventListener('click', () => {
      // Remove "@ " from the text to get just the username if needed,
      // but usually the full "@ itsmefeje" or just "itsmefeje" is fine.
      // We'll copy "itsmefeje"
      const textToCopy = discordVal.textContent.replace('@ ', '').trim();

      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = discordVal.textContent;
        discordVal.textContent = 'Copied!';
        copyDiscord.style.pointerEvents = 'none'; // Prevent double clicks during feedback

        setTimeout(() => {
          discordVal.textContent = originalText;
          copyDiscord.style.pointerEvents = 'auto';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });
  }
});
