/* =============================================
   BEST HO3 — App JS
   bestho3.com
   ============================================= */

(function () {
  'use strict';

  /* Motion handshake: prove this script ran before any content is hidden.
     motion.css only applies opacity:0 start-states under `.js-motion`, so if
     this file fails to load or throws, the page renders fully visible. */
  document.documentElement.classList.add('js-motion');

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
      if (nav && !nav.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

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
  var storyScenes = document.querySelectorAll('[data-story-scene]');
  var ticking = false;

  if (!reducedMotion) {
    storyScenes.forEach(function (scene) { scene.classList.add('is-enhanced'); });
  }

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

    storyScenes.forEach(function (scene) {
      var rect = scene.getBoundingClientRect();
      var travel = Math.max(rect.height - window.innerHeight, 1);
      var storyProgress = clamp(-rect.top / travel, 0, 1);
      var lines = scene.querySelectorAll('[data-story-line]');

      scene.style.setProperty('--story-progress', storyProgress.toFixed(4));

      lines.forEach(function (line, index) {
        var lineStart = -0.06 + index * 0.16;
        var lineProgress = clamp((storyProgress - lineStart) / 0.18, 0, 1);
        line.style.setProperty('--story-line-opacity', (0.22 + lineProgress * 0.78).toFixed(3));
        line.style.setProperty('--story-line-y', ((1 - lineProgress) * 10).toFixed(2) + 'px');
        line.style.setProperty('--story-line-blur', ((1 - lineProgress) * 1.5).toFixed(2) + 'px');
      });

      var metaProgress = clamp((storyProgress - 0.7) / 0.14, 0, 1);
      var outcomeProgress = clamp((storyProgress - 0.82) / 0.14, 0, 1);
      var meta = scene.querySelector('[data-story-meta]');
      var outcome = scene.querySelector('[data-story-outcome]');
      var counter = scene.querySelector('[data-story-counter]');

      if (meta) meta.style.setProperty('--story-meta-progress', metaProgress.toFixed(3));
      if (outcome) outcome.style.setProperty('--story-outcome-progress', outcomeProgress.toFixed(3));
      if (counter) {
        var activeLine = Math.min(lines.length, Math.max(1, Math.floor(storyProgress * lines.length) + 1));
        counter.textContent = String(activeLine).padStart(2, '0') + ' / ' + String(lines.length).padStart(2, '0');
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
        storyScenes.forEach(function (scene) { scene.classList.remove('is-enhanced'); });
      } else {
        storyScenes.forEach(function (scene) { scene.classList.add('is-enhanced'); });
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
      window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  });

})();
