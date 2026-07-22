/* =============================================
   BEST HO3 — App JS
   bestho3.com
   ============================================= */

(function () {
  'use strict';

  /* --- Navigation --- */
  var nav = document.getElementById('main-nav');

  /* --- Hamburger menu --- */
  var hamburger = document.getElementById('hamburger');
  var navLinks  = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    /* Close on link click */
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
    /* Close on outside click */
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- FAQ accordion --- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      /* Close all */
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
      });
      /* Toggle current */
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
  /* --- Reusable motion layer --- */
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = motionPreference.matches;
  var hero = document.querySelector('.hero');
  var motionTargets = document.querySelectorAll('[data-motion], .reveal');

  /* Give every group a predictable stagger without page-specific selectors. */
  document.querySelectorAll('[data-motion-group]').forEach(function (group) {
    var groupItems = Array.prototype.filter.call(
      group.querySelectorAll('[data-motion], .reveal'),
      function (item) { return item.closest('[data-motion-group]') === group; }
    );
    groupItems.forEach(function (item, index) {
      item.style.setProperty('--motion-order', index);
    });
  });

  if (hero) {
    if (reducedMotion) {
      hero.classList.add('is-loaded');
    } else {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          hero.classList.add('is-loaded');
        });
      });
    }
  }

  function showMotionTarget(el) {
    el.classList.add('is-visible');
    /* Keep the original reveal API working on all guide pages. */
    el.classList.add('visible');
  }

  if (!reducedMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          showMotionTarget(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

    motionTargets.forEach(function (el) { observer.observe(el); });
  } else {
    motionTargets.forEach(showMotionTarget);
  }

  /* Navigation, page progress, and section scenes share one animation-frame loop. */
  var progressBar = document.getElementById('scroll-progress-bar');
  var scenes = document.querySelectorAll('[data-scroll-scene]');
  var ticking = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateScrollEffects() {
    ticking = false;
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var pageProgress = scrollable > 0 ? window.scrollY / scrollable : 0;

    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }

    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + clamp(pageProgress, 0, 1).toFixed(4) + ')';
    }

    if (reducedMotion) return;

    scenes.forEach(function (scene) {
      var rect = scene.getBoundingClientRect();
      var sceneProgress;

      if (scene.id === 'main') {
        sceneProgress = clamp(-rect.top / Math.max(rect.height * 0.8, 1), 0, 1);
      } else {
        sceneProgress = clamp(
          (window.innerHeight * 0.72 - rect.top) / Math.max(rect.height * 0.86, 1),
          0,
          1
        );
      }

      scene.style.setProperty('--scene-progress', sceneProgress.toFixed(4));
      scene.style.setProperty('--scene-eased-progress', (sceneProgress * sceneProgress * (3 - 2 * sceneProgress)).toFixed(4));

      if (scene.id === 'main') {
        scene.classList.toggle('is-scrolling', rect.bottom > 0 && rect.top < window.innerHeight);
        scene.classList.toggle('is-cue-hidden', sceneProgress > 0.7 || rect.bottom <= 0);
      }

      var marketCards = scene.querySelectorAll('.market-card');
      if (marketCards.length && rect.top < window.innerHeight && rect.bottom > 0) {
        var activeIndex = Math.min(
          marketCards.length - 1,
          Math.floor(sceneProgress * marketCards.length)
        );
        marketCards.forEach(function (card, index) {
          card.classList.toggle('is-active', index === activeIndex);
        });
      }
    });
  }

  function requestScrollUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrollEffects);
    }
  }

  updateScrollEffects();
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) requestScrollUpdate();
  });
  if (motionPreference.addEventListener) {
    motionPreference.addEventListener('change', function (event) {
      reducedMotion = event.matches;
      if (reducedMotion) {
        motionTargets.forEach(showMotionTarget);
        if (hero) hero.classList.add('is-loaded');
      }
      requestScrollUpdate();
    });
  }

  /* --- Smooth nav offset for fixed header --- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;
      var target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
      var top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

})();
