/*
-- Purpose: Vanilla JS implementation of high-performance UI components from react-bits (TiltedCard, Magnet, ScrollReveal)
-- Runs on: Client (Browser)
-- Location: /react-bits-vanilla.js
-- Dependencies: None (Vanilla JS)
-- Public API: initReactBits()
-- Networking: N/A
-- Security: Strict DOM element validation before event binding, prevents null pointer exceptions.
-- Performance: Uses IntersectionObserver (zero scroll event listeners) and hardware-accelerated transforms (translate/rotateX/scale3d).
-- Notes: TiltedCard uses cubic-bezier transitions to replicate react-spring physics.
*/

class TiltedCard {
  constructor(element) {
    this.element = element;
    this.inner = this.element.querySelector('.tilted-card-inner');
    if (this.inner) this.bindEvents();
  }

  bindEvents() {
    this.element.addEventListener('mousemove', (e) => {
      const rect = this.element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;

      this.inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      this.inner.style.transition = 'transform 0.1s ease-out';
    });

    this.element.addEventListener('mouseleave', () => {
      this.inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      this.inner.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    });
  }
}

class MagnetButton {
  constructor(element) {
    this.element = element;
    this.element.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.bindEvents();
  }

  bindEvents() {
    this.element.addEventListener('mousemove', (e) => {
      const rect = this.element.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const x = e.clientX - rect.left - centerX;
      const y = e.clientY - rect.top - centerY;

      this.element.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      this.element.style.transition = 'transform 0.05s linear';
    });

    this.element.addEventListener('mouseleave', () => {
      this.element.style.transform = 'translate(0px, 0px)';
      this.element.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    });
  }
}

class ScrollReveal {
  constructor() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      this.observer.observe(el);
    });
  }
}

function initReactBits() {
  document.querySelectorAll('.tilted-card').forEach((el) => new TiltedCard(el));
  document.querySelectorAll('.magnet-btn').forEach((el) => new MagnetButton(el));
  new ScrollReveal();
}

document.addEventListener('DOMContentLoaded', initReactBits);
