/*
-- Purpose: High-performance Vanilla JS UI components (TiltedCard, MagnetButton, BlurText, ScrollReveal).
-- Runs on: Client (Browser)
-- Location: /react-bits-vanilla.js
-- Dependencies: None
-- Public API: initReactBits(root), destroyReactBits()
*/

(() => {
  class TiltedCard {
    constructor(element) {
      this.element = element;
      this.inner = this.element?.querySelector('.tilted-card-inner');
      this.rect = null;
      this.pointerX = 0;
      this.pointerY = 0;
      this.rafId = null;
      this.isActive = false;
      this.controller = new AbortController();

      if (!this.element || !this.inner) return;
      this.bindEvents();
    }

    bindEvents() {
      const { signal } = this.controller;

      this.element.addEventListener('mouseenter', (event) => {
        this.rect = this.element.getBoundingClientRect();
        this.isActive = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        this.inner.style.transition = 'transform 100ms ease-out';
        this.requestUpdate();
      }, { signal });

      this.element.addEventListener('mousemove', (event) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        this.requestUpdate();
      }, { signal, passive: true });

      this.element.addEventListener('mouseleave', () => {
        this.isActive = false;
        this.rect = null;
        this.inner.style.transition = 'transform 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }, { signal });
    }

    requestUpdate() {
      if (this.rafId !== null) return;

      this.rafId = window.requestAnimationFrame(() => {
        this.rafId = null;
        if (!this.isActive || !this.rect || !this.inner) return;

        const x = this.pointerX - this.rect.left;
        const y = this.pointerY - this.rect.top;

        const centerX = this.rect.width / 2;
        const centerY = this.rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        this.inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });
    }

    destroy() {
      this.controller.abort();
      if (this.rafId !== null) {
        window.cancelAnimationFrame(this.rafId);
      }
    }
  }

  class MagnetButton {
    constructor(element) {
      this.element = element;
      this.rect = null;
      this.pointerX = 0;
      this.pointerY = 0;
      this.rafId = null;
      this.isActive = false;
      this.controller = new AbortController();

      if (!this.element) return;
      this.element.style.transition = 'transform 320ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      this.bindEvents();
    }

    bindEvents() {
      const { signal } = this.controller;

      this.element.addEventListener('mouseenter', (event) => {
        this.rect = this.element.getBoundingClientRect();
        this.isActive = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        this.requestUpdate();
      }, { signal });

      this.element.addEventListener('mousemove', (event) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        this.requestUpdate();
      }, { signal, passive: true });

      this.element.addEventListener('mouseleave', () => {
        this.isActive = false;
        this.rect = null;
        this.element.style.transition = 'transform 320ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.element.style.transform = 'translate3d(0, 0, 0)';
      }, { signal });
    }

    requestUpdate() {
      if (this.rafId !== null) return;

      this.rafId = window.requestAnimationFrame(() => {
        this.rafId = null;
        if (!this.isActive || !this.rect || !this.element) return;

        const centerX = this.rect.width / 2;
        const centerY = this.rect.height / 2;
        const x = this.pointerX - this.rect.left - centerX;
        const y = this.pointerY - this.rect.top - centerY;

        this.element.style.transition = 'transform 80ms linear';
        this.element.style.transform = `translate3d(${x * 0.25}px, ${y * 0.25}px, 0)`;
      });
    }

    destroy() {
      this.controller.abort();
      if (this.rafId !== null) {
        window.cancelAnimationFrame(this.rafId);
      }
    }
  }

  class BlurText {
    constructor(element) {
      this.element = element;
      if (!this.element || this.element.dataset.blurTextInit === 'true') return;

      const text = this.element.textContent || '';
      this.element.textContent = '';

      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.opacity = '0';
        span.style.filter = 'blur(12px)';
        span.style.transform = 'translate3d(0, 14px, 0)';
        span.style.display = 'inline-block';
        span.style.willChange = 'transform';
        span.style.transition = 'opacity 560ms ease, filter 560ms ease, transform 560ms cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        span.style.transitionDelay = `${index * 0.045}s`;
        this.element.appendChild(span);
      });

      this.element.dataset.blurTextInit = 'true';

      window.requestAnimationFrame(() => {
        window.setTimeout(() => this.animateIn(), 40);
      });
    }

    animateIn() {
      if (!this.element) return;
      const spans = this.element.querySelectorAll('span');
      spans.forEach((span) => {
        span.style.opacity = '1';
        span.style.filter = 'blur(0px)';
        span.style.transform = 'translate3d(0, 0, 0)';
      });
    }
  }

  class ScrollReveal {
    constructor(root = document) {
      this.root = root;
      this.observer = null;
      this.init();
    }

    init() {
      if (!('IntersectionObserver' in window)) return;

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          this.observer?.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      this.root.querySelectorAll('.scroll-reveal').forEach((el) => {
        this.observer?.observe(el);
      });
    }

    destroy() {
      this.observer?.disconnect();
    }
  }

  let instances = [];

  function initReactBits(root = document) {
    const created = [];

    root.querySelectorAll('.tilted-card').forEach((el) => {
      if (!el) return;
      created.push(new TiltedCard(el));
    });

    root.querySelectorAll('.magnet-btn').forEach((el) => {
      if (!el) return;
      created.push(new MagnetButton(el));
    });

    root.querySelectorAll('.blur-text').forEach((el) => {
      if (!el) return;
      created.push(new BlurText(el));
    });

    if (root.querySelector('.scroll-reveal')) {
      created.push(new ScrollReveal(root));
    }

    instances = created;
    return created;
  }

  function destroyReactBits() {
    instances.forEach((instance) => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    });
    instances = [];
  }

  window.TiltedCard = TiltedCard;
  window.MagnetButton = MagnetButton;
  window.BlurText = BlurText;
  window.ScrollReveal = ScrollReveal;
  window.initReactBits = initReactBits;
  window.destroyReactBits = destroyReactBits;
})();
