/**
 * ============================================================================
 * MPDs — Marco Prado Design System v1.0 (Runtime & Motion Controller)
 * ============================================================================
 * Zero-dependency JS controller:
 * - Scroll Reveal (Blur-Up Gemini + Architectural Reveal + Masked Text)
 * - Flashlight Spotlight Cursor Tracking (--mouse-x / --mouse-y)
 * - Interactive 3-Card Deck Switcher (prev/next + keyboard)
 * - Toast Notification System
 * - Copy Token Utility
 * ============================================================================
 */
(function (root) {
  'use strict';

  const MPDs = {
    version: '1.0.0',

    init() {
      this.initHeaderLoad();
      this.initScrollObserver();
      this.initFlashlightCards();
      this.initDeckSwitchers();
      this.initDismissibleAlerts();
      this.initCopyTokens();
    },

    /* 1. Sticky Header Entrance */
    initHeaderLoad() {
      const header = document.querySelector('.mpds-header');
      if (!header) return;
      requestAnimationFrame(() => {
        setTimeout(() => header.classList.add('is-loaded'), 80);
      });
    },

    /* 2. IntersectionObserver for Blur-Up, Reveal & Masked Text */
    initScrollObserver() {
      const targets = document.querySelectorAll('.mpds-animate-on-scroll, .mpds-reveal, .mpds-text-mask, [data-mpds-reveal]');
      if (!targets.length) return;

      if (!('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: '0px 0px -24px 0px' }
      );

      targets.forEach((el) => io.observe(el));
    },

    /* Replay helper for motion showcase demos */
    replayMotion(containerSelector) {
      const rootEl = document.querySelector(containerSelector);
      if (!rootEl) return;
      const items = rootEl.querySelectorAll('.mpds-animate-on-scroll, .mpds-reveal, .mpds-text-mask');
      items.forEach((el) => {
        el.classList.remove('is-visible');
        if (el.classList.contains('mpds-animate-on-scroll')) {
          el.style.animation = 'none';
          void el.offsetWidth;
          el.style.animation = '';
        }
      });
      requestAnimationFrame(() => {
        setTimeout(() => {
          items.forEach((el) => el.classList.add('is-visible'));
        }, 60);
      });
    },

    /* 3. Gemini Flashlight / Spotlight Mouse Tracking */
    initFlashlightCards() {
      const cards = document.querySelectorAll('.mpds-flashlight');
      cards.forEach((card) => {
        if (card.__mpdsFlashBound) return;
        card.__mpdsFlashBound = true;
        card.addEventListener('pointermove', (ev) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${ev.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${ev.clientY - rect.top}px`);
        });
      });
    },

    /* 4. Gemini 3-Card Deck Switcher */
    initDeckSwitchers() {
      const decks = document.querySelectorAll('[data-mpds-deck]');
      decks.forEach((deck) => {
        const cards = Array.from(deck.querySelectorAll('.mpds-deck-card'));
        if (cards.length === 0) return;

        let activeIndex = 0;
        const counterEl = deck.querySelector('[data-mpds-deck-counter]');

        const syncPositions = () => {
          const total = cards.length;
          cards.forEach((card, idx) => {
            const offset = (idx - activeIndex + total) % total;
            card.setAttribute('data-pos', String(offset));
            card.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
          });
          if (counterEl) {
            counterEl.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
          }
        };

        const step = (dir) => {
          activeIndex = (activeIndex + dir + cards.length) % cards.length;
          syncPositions();
        };

        deck.querySelectorAll('[data-mpds-deck-prev]').forEach((btn) =>
          btn.addEventListener('click', () => step(-1))
        );
        deck.querySelectorAll('[data-mpds-deck-next]').forEach((btn) =>
          btn.addEventListener('click', () => step(1))
        );

        syncPositions();
      });
    },

    /* 5. Dismissible Alerts */
    initDismissibleAlerts() {
      document.querySelectorAll('.mpds-alert-close').forEach((btn) => {
        btn.addEventListener('click', () => {
          const alertEl = btn.closest('.mpds-alert');
          if (!alertEl) return;
          alertEl.style.opacity = '0';
          alertEl.style.transform = 'translateY(-6px)';
          setTimeout(() => alertEl.remove(), 240);
        });
      });
    },

    /* 6. Toast Notifications */
    toast(message, icon = 'solar:check-circle-linear') {
      let stack = document.getElementById('mpdsToastStack');
      if (!stack) {
        stack = document.createElement('div');
        stack.id = 'mpdsToastStack';
        stack.className = 'mpds-toast-stack';
        document.body.appendChild(stack);
      }

      const item = document.createElement('div');
      item.className = 'mpds-toast';
      item.innerHTML = `<iconify-icon icon="${icon}" style="font-size:1.1rem;"></iconify-icon><span>${message}</span>`;
      stack.appendChild(item);

      setTimeout(() => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(8px)';
        item.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        setTimeout(() => item.remove(), 260);
      }, 2800);
    },

    /* 7. Copy Color/Spacing Token on Click */
    initCopyTokens() {
      document.querySelectorAll('[data-mpds-copy]').forEach((el) => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          const val = el.getAttribute('data-mpds-copy');
          if (!val) return;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(val).catch(() => {});
          }
          MPDs.toast(`Token copiado: ${val}`, 'solar:copy-linear');
        });
      });
    }
  };

  root.MPDs = MPDs;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MPDs.init());
  } else {
    MPDs.init();
  }
})(window);
