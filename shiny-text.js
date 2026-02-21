/* -- Indicating what the script is for: Vanilla JS Port of the ShinyText Component (Optimized & Production-Ready) */
"use strict";

class ShinyText {
  constructor(elementOrSelector, options = {}) {
    this.element = typeof elementOrSelector === 'string' 
      ? document.querySelector(elementOrSelector) 
      : elementOrSelector;

    if (!this.element) {
      console.warn('ShinyText: Element not found');
      return;
    }

    // Accessibility check: Respect OS-level reduced motion settings
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Default Config (Matching React Props)
    this.options = Object.assign({
      speed: 3,              // Animation duration in seconds
      color: '#b5b5b5',      // Base text color
      shineColor: '#ffffff', // Shine color
      spread: 120,           // Gradient spread angle
      yoyo: false,           // Ping-pong animation
      pauseOnHover: false,   // Pause when mouse is over
      direction: 'left',     // 'left' or 'right'
      disabled: prefersReducedMotion // Auto-disable if user prefers reduced motion
    }, options);

    this.isPaused = false;
    this.isVisible = false; // Tracks if element is on screen
    this.lastTime = null;
    this.elapsed = 0;
    this.animationId = null;

    // Bound methods for event listeners to allow clean removal
    this._onMouseEnter = () => { this.isPaused = true; };
    this._onMouseLeave = () => { this.isPaused = false; };
    this._animate = this.animate.bind(this);

    this.init();
  }

  init() {
    // 1. Set static CSS styles for the gradient mask
    Object.assign(this.element.style, {
      backgroundImage: `linear-gradient(${this.options.spread}deg, ${this.options.color} 0%, ${this.options.color} 35%, ${this.options.shineColor} 50%, ${this.options.color} 65%, ${this.options.color} 100%)`,
      backgroundSize: '200% auto',
      webkitBackgroundClip: 'text',
      backgroundClip: 'text',
      webkitTextFillColor: 'transparent',
      display: 'inline-block', // Required for background movement
      textDecoration: 'none',
      // Ensure initial position looks good if disabled
      backgroundPosition: '0% center' 
    });

    if (this.options.disabled) return; // Exit early if animation is disabled

    // 2. Bind Events
    if (this.options.pauseOnHover) {
      this.element.addEventListener('mouseenter', this._onMouseEnter, { passive: true });
      this.element.addEventListener('mouseleave', this._onMouseLeave, { passive: true });
    }

    // 3. Performance Optimization: Only animate when visible on screen
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isVisible = entry.isIntersecting;
        
        // Resume animation if visible and not already running
        if (this.isVisible && !this.animationId) {
          this.lastTime = performance.now();
          this.animationId = requestAnimationFrame(this._animate);
        }
      });
    }, { rootMargin: "50px" }); // Slight margin to start animating just before it enters view

    this.observer.observe(this.element);
  }

  animate(time) {
    // Halt the loop if element goes off-screen
    if (!this.isVisible || this.options.disabled) {
      this.animationId = null;
      return; 
    }

    if (!this.lastTime) this.lastTime = time;
    const delta = (time - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = time;

    // Prevent massive time jumps when switching browser tabs (delta cap)
    if (!this.isPaused && delta < 0.1) {
      this.elapsed += delta;
    }

    const duration = this.options.speed;
    // Calculate progress (0 to 1) based on speed
    // If yoyo is on, the cycle is 2x duration (forward + back)
    const cycleDuration = this.options.yoyo ? duration * 2 : duration;
    let progress = (this.elapsed % cycleDuration) / duration;

    // Handle Yoyo Logic
    if (this.options.yoyo && progress > 1) {
      progress = 2 - progress; // Map 1.x -> 0.x (decreasing)
    } else if (!this.options.yoyo && progress > 1) {
      progress = 0; // Reset
    }

    // Map progress (0 to 1) to Background Position
    let positionValue = 150 - (progress * 200); 

    if (this.options.direction === 'right') {
      positionValue = -50 + (progress * 200);
    }

    this.element.style.backgroundPosition = `${positionValue}% center`;

    // Continue loop
    this.animationId = requestAnimationFrame(this._animate);
  }

  // Garbage collection utility 
  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.observer) this.observer.disconnect();
    this.element.removeEventListener('mouseenter', this._onMouseEnter);
    this.element.removeEventListener('mouseleave', this._onMouseLeave);
  }
}
