(function () {
  'use strict';

  function initSection(section) {
    var track = section.querySelector('[data-hcl-track]');
    if (!track) return;

    var prevBtn = section.querySelector('[data-hcl-prev]');
    var nextBtn = section.querySelector('[data-hcl-next]');
    var dotsWrap = section.querySelector('[data-hcl-dots]');
    var cards = Array.prototype.slice.call(track.querySelectorAll('[data-hcl-card]'));
    var autoplayEnabled = section.getAttribute('data-autoplay') === 'true';
    var autoplaySpeed = parseInt(section.getAttribute('data-autoplay-speed'), 10) || 4000;

    if (!cards.length) return;

    var dots = [];
    if (dotsWrap) {
      cards.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'hcl-dot';
        dot.setAttribute('aria-label', 'Go to category ' + (i + 1));
        dot.addEventListener('click', function () {
          pauseAutoplay();
          scrollToCard(i);
        });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    function getCardStep() {
      var card = cards[0];
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || 0);
      return card.getBoundingClientRect().width + gap;
    }

    function getActiveIndex() {
      var step = getCardStep();
      if (!step) return 0;
      return Math.round(track.scrollLeft / step);
    }

    function updateActiveUI() {
      var idx = getActiveIndex();
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === idx);
      });
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 4;
      if (nextBtn) {
        var maxScroll = track.scrollWidth - track.clientWidth;
        nextBtn.disabled = track.scrollLeft >= maxScroll - 4;
      }
    }

    function scrollToCard(index) {
      var step = getCardStep();
      track.scrollTo({ left: step * index, behavior: 'smooth' });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        pauseAutoplay();
        var idx = Math.max(0, getActiveIndex() - 1);
        scrollToCard(idx);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        pauseAutoplay();
        var idx = Math.min(cards.length - 1, getActiveIndex() + 1);
        scrollToCard(idx);
      });
    }

    var scrollDebounce;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(updateActiveUI, 80);
    });

    var isDown = false;
    var startX, scrollStart, moved;

    track.addEventListener('mousedown', function (e) {
      isDown = true;
      moved = false;
      track.classList.add('is-dragging');
      startX = e.pageX;
      scrollStart = track.scrollLeft;
      pauseAutoplay();
    });

    window.addEventListener('mouseup', function () {
      isDown = false;
      track.classList.remove('is-dragging');
    });

    track.addEventListener('mouseleave', function () {
      isDown = false;
      track.classList.remove('is-dragging');
    });

    track.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      var dx = e.pageX - startX;
      if (Math.abs(dx) > 5) moved = true;
      track.scrollLeft = scrollStart - dx;
    });

    track.addEventListener('click', function (e) {
      if (moved) {
        e.preventDefault();
        moved = false;
      }
    }, true);

    track.addEventListener('touchstart', pauseAutoplay, { passive: true });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') {
        pauseAutoplay();
        scrollToCard(Math.min(cards.length - 1, getActiveIndex() + 1));
      } else if (e.key === 'ArrowLeft') {
        pauseAutoplay();
        scrollToCard(Math.max(0, getActiveIndex() - 1));
      }
    });

    var autoplayTimer = null;
    var isInView = false;
    var resumeTimer = null;

    function advanceAutoplay() {
      var currentCards = track.querySelectorAll('[data-hcl-card]');
      if (!currentCards.length) return;

      var maxScroll = track.scrollWidth - track.clientWidth;

      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollToCard(getActiveIndex() + 1);
      }
    }

    function startAutoplay() {
      if (!autoplayEnabled) return;
      if (autoplayTimer) return;
      autoplayTimer = setInterval(advanceAutoplay, autoplaySpeed);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function pauseAutoplay() {
      stopAutoplay();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        if (isInView) startAutoplay();
      }, 3500);
    }

    section.addEventListener('mouseenter', stopAutoplay);
    section.addEventListener('mouseleave', function () {
      if (isInView) startAutoplay();
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isInView = entry.isIntersecting;
          if (isInView) {
            startAutoplay();
          } else {
            stopAutoplay();
          }
        });
      }, { threshold: 0.1 });
      io.observe(section);
    } else {
      isInView = true;
      startAutoplay();
    }

    updateActiveUI();
    window.addEventListener('resize', updateActiveUI);
  }

  function initAll() {
    var sections = document.querySelectorAll('[data-hcl-section]');
    sections.forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector('[data-hcl-section]');
    if (section) initSection(section);
  });

})();
