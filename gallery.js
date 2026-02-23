document.addEventListener('DOMContentLoaded', () => {
  // GSAP Entrance Animation
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.gallery-item', {
    duration: 0.8,
    y: 50,
    opacity: 0,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.gallery-grid',
      start: 'top 90%'
    }
  });

  // Lightbox Logic
  const galleryItems = document.querySelectorAll('.gallery-item img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox-content');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  let currentIndex = 0;
  const totalItems = galleryItems.length;

  // If no gallery items, stop
  if (totalItems === 0) return;

  const openLightbox = (index) => {
    currentIndex = index;
    const img = galleryItems[currentIndex];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    if (lightboxCaption) {
      lightboxCaption.textContent = img.alt;
    }
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  };

  const updateLightboxImage = () => {
    // Add fade out/in effect for smoother transition
    gsap.to(lightboxImg, { opacity: 0.5, duration: 0.1, onComplete: () => {
      const img = galleryItems[currentIndex];
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      if (lightboxCaption) {
        lightboxCaption.textContent = img.alt;
      }
      gsap.to(lightboxImg, { opacity: 1, duration: 0.2 });
    }});
  };

  const nextImage = () => {
    currentIndex = (currentIndex + 1) % totalItems;
    updateLightboxImage();
  };

  const prevImage = () => {
    currentIndex = (currentIndex - 1 + totalItems) % totalItems;
    updateLightboxImage();
  };

  // Event Listeners
  galleryItems.forEach((img, index) => {
    img.closest('.gallery-item').addEventListener('click', () => {
      openLightbox(index);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      prevImage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nextImage();
    });
  }

  // Close on background click
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content-wrapper')) {
        closeLightbox();
      }
    });

    // Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
      if (touchStartX - touchEndX > 50) {
        nextImage();
      }
      if (touchEndX - touchStartX > 50) {
        prevImage();
      }
    };
  }

  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });
});
