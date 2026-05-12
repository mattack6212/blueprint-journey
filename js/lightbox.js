(function () {
  'use strict';

  var lightbox, backdrop, img, closeBtn, lastFocused;

  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'edu-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Enlarged infographic');

    backdrop = document.createElement('div');
    backdrop.className = 'edu-lightbox__backdrop';

    img = document.createElement('img');
    img.className = 'edu-lightbox__image';
    img.alt = '';

    closeBtn = document.createElement('button');
    closeBtn.className = 'edu-lightbox__close';
    closeBtn.setAttribute('aria-label', 'Close enlarged infographic');
    closeBtn.innerHTML = '&times;';

    lightbox.appendChild(backdrop);
    lightbox.appendChild(img);
    lightbox.appendChild(closeBtn);
    document.body.appendChild(lightbox);

    backdrop.addEventListener('click', closeLightbox);
    closeBtn.addEventListener('click', closeLightbox);
    img.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('edu-lightbox--open')) {
        closeLightbox();
      }
    });
  }

  function openLightbox(src, alt, trigger) {
    lastFocused = trigger;
    img.src = src;
    img.alt = alt || '';
    document.body.style.overflow = 'hidden';
    lightbox.classList.add('edu-lightbox--open');
    closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('edu-lightbox--open');
    document.body.style.overflow = '';
    if (lastFocused) {
      lastFocused.focus();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildLightbox();
    var infographics = document.querySelectorAll('.edu-infographics img');
    infographics.forEach(function (el) {
      el.addEventListener('click', function () {
        openLightbox(el.src, el.alt, el);
      });
    });
  });
})();
