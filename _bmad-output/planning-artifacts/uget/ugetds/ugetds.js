/**
 * ============================================================================
 * ugetds — uGet Design System v1.0 (Runtime, Iconografia Autoral & Motion)
 * ============================================================================
 */
(function (root) {
  'use strict';

  /* 16 Ícones Vetoriais Autorais do uGet (Traço geométrico 2px rounded) */
  const UGET_ICONS = {
    'pin-uget': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.2-6.5-10.5a6.5 6.5 0 1 1 13 0c0 5.3-6.5 10.5-6.5 10.5Z"/><path d="M12 10.5h3.2"/></svg>',
    'geo-radar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 12l5.5-5.5"/></svg>',
    'bell-smart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><circle cx="18.5" cy="5.5" r="2.2" fill="#9B246D" stroke="none"/></svg>',
    'discount-tag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>',
    'member-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    'institution': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18L12 3 3 10Z"/><path d="M5 10v9M10 10v9M14 10v9M19 10v9M2 19h20"/></svg>',
    'store': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/></svg>',
    'qr-redeem': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM19 19h2M14 20h2M20 14v2"/></svg>',
    'wallet-save': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M21 12h-5a2 2 0 0 0 0 4h5v-4Z"/></svg>',
    'compass': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="16 8 14 14 8 16 10 10 16 8"/></svg>',
    'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    'verified': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 2.4h3.4v3.4L20.2 10l-2.4 2.4v3.4h-3.4L12 18.2l-2.4-2.4H6.2v-3.4L3.8 10l2.4-2.4V4.2h3.4L12 2Z"/><path d="M9 10l2 2 4-4"/></svg>',
    'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    'filter': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    'arrow-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    'chevron-brand': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter"><path d="M9 5l7 7-7 7"/></svg>'
  };

  const UgetDS = {
    version: '1.0.0',
    icons: UGET_ICONS,

    init() {
      this.renderIcons();
      this.initScrollObserver();
      this.initFlashlight();
      this.initTiltCards();
      this.initDecks();
      this.initTabs();
      this.initCopyTokens();
    },

    /* Injeta SVGs autorais em qualquer elemento [data-uget-icon="nome"] */
    renderIcons(rootEl = document) {
      rootEl.querySelectorAll('[data-uget-icon]').forEach((el) => {
        const name = el.getAttribute('data-uget-icon');
        const size = el.getAttribute('data-size') || '20';
        const svg = UGET_ICONS[name];
        if (!svg) return;
        el.innerHTML = svg;
        const svgEl = el.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('width', size);
          svgEl.setAttribute('height', size);
          svgEl.style.display = 'block';
        }
      });
    },

    /* IntersectionObserver para Blur-Up & Clip-Path Text */
    initScrollObserver() {
      const els = document.querySelectorAll('.uget-animate-on-scroll, .uget-text-mask');
      if (!els.length) return;
      if (!('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('is-visible'));
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.14 }
      );
      els.forEach((el) => io.observe(el));
    },

    replayMotion(selector) {
      const container = document.querySelector(selector);
      if (!container) return;
      const items = container.querySelectorAll('.uget-animate-on-scroll, .uget-text-mask');
      items.forEach((el) => {
        el.classList.remove('is-visible');
        if (el.classList.contains('uget-animate-on-scroll')) {
          el.style.animation = 'none';
          void el.offsetWidth;
          el.style.animation = '';
        }
      });
      requestAnimationFrame(() => {
        setTimeout(() => items.forEach((el) => el.classList.add('is-visible')), 60);
      });
    },

    /* Gemini Flashlight Spotlight */
    initFlashlight() {
      document.querySelectorAll('.uget-flashlight').forEach((card) => {
        if (card.__ugetFlash) return;
        card.__ugetFlash = true;
        card.addEventListener('pointermove', (ev) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${ev.clientX - r.left}px`);
          card.style.setProperty('--mouse-y', `${ev.clientY - r.top}px`);
        });
      });
    },

    /* Revolut-Style 3D Card Tilt */
    initTiltCards() {
      document.querySelectorAll('[data-uget-tilt]').forEach((card) => {
        if (card.__ugetTilt) return;
        card.__ugetTilt = true;
        card.addEventListener('pointermove', (ev) => {
          const r = card.getBoundingClientRect();
          const px = (ev.clientX - r.left) / r.width - 0.5;
          const py = (ev.clientY - r.top) / r.height - 0.5;
          const rx = (-py * 11).toFixed(2);
          const ry = (px * 13).toFixed(2);
          card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`;
        });
        card.addEventListener('pointerleave', () => {
          card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
        });
      });
    },

    /* Gemini 3-Card Deck Switcher */
    initDecks() {
      document.querySelectorAll('[data-uget-deck]').forEach((deck) => {
        const cards = Array.from(deck.querySelectorAll('.uget-deck-card'));
        if (!cards.length) return;
        let idx = 0;
        const counter = deck.querySelector('[data-uget-deck-counter]');
        const sync = () => {
          cards.forEach((c, i) => {
            const pos = (i - idx + cards.length) % cards.length;
            c.setAttribute('data-pos', String(pos));
          });
          if (counter) counter.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
        };
        deck.querySelectorAll('[data-uget-deck-prev]').forEach((b) =>
          b.addEventListener('click', () => { idx = (idx - 1 + cards.length) % cards.length; sync(); })
        );
        deck.querySelectorAll('[data-uget-deck-next]').forEach((b) =>
          b.addEventListener('click', () => { idx = (idx + 1) % cards.length; sync(); })
        );
        sync();
      });
    },

    /* Revolut-Style Pill Tabs + Gemini Panel Reveal */
    initTabs(rootEl = document) {
      rootEl.querySelectorAll('[data-uget-tabs]').forEach((group) => {
        if (group.__ugetTabs) return;
        group.__ugetTabs = true;
        const tabs = Array.from(group.querySelectorAll(':scope > .uget-tab-list [data-tab-target], [data-tab-target]')).filter(
          (t) => t.closest('[data-uget-tabs]') === group
        );
        const panels = Array.from(group.querySelectorAll('[data-tab-panel]')).filter(
          (p) => p.closest('[data-uget-tabs]') === group
        );
        if (!tabs.length || !panels.length) return;

        const activate = (targetId) => {
          tabs.forEach((t) => {
            const active = t.getAttribute('data-tab-target') === targetId;
            t.classList.toggle('is-active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
            t.setAttribute('tabindex', active ? '0' : '-1');
          });
          panels.forEach((p) => {
            const active = p.getAttribute('data-tab-panel') === targetId;
            p.classList.toggle('is-active', active);
            p.hidden = !active;
          });
          this.renderIcons(group);
          this.initFlashlight();
          this.initTiltCards();
        };

        tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => activate(tab.getAttribute('data-tab-target')));
          tab.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
              ev.preventDefault();
              const nextIdx = (index + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              tabs[nextIdx].focus();
              activate(tabs[nextIdx].getAttribute('data-tab-target'));
            }
          });
        });
      });
    },

    /* Smart Geo Notification Toast (Conceito Principal uGet) */
    geoNotify({ title, message, badge = '120m de você', discount = '20% OFF' }) {
      let stack = document.getElementById('ugetToastStack');
      if (!stack) {
        stack = document.createElement('div');
        stack.id = 'ugetToastStack';
        stack.className = 'uget-toast-stack';
        document.body.appendChild(stack);
      }

      const toast = document.createElement('div');
      toast.className = 'uget-geo-toast';
      toast.innerHTML = `
        <div style="width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,#6B2F8F,#9B246D); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff;">
          ${UGET_ICONS['pin-uget']}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px; flex-wrap:wrap;">
            <span style="font-size:0.72rem; font-family:var(--uget-font-mono); color:#D8B4FE; font-weight:600;">${badge}</span>
            <span style="font-size:0.68rem; padding:2px 8px; border-radius:999px; background:#9B246D; color:#fff; font-weight:700;">${discount}</span>
          </div>
          <div style="font-family:var(--uget-font-display); font-weight:700; font-size:0.88rem; margin-bottom:2px;">${title}</div>
          <div style="font-size:0.78rem; color:#CBD5E1; line-height:1.45;">${message}</div>
        </div>
      `;
      const svg = toast.querySelector('svg');
      if (svg) { svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); }
      stack.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        setTimeout(() => toast.remove(), 270);
      }, 4200);
    },

    initCopyTokens() {
      document.querySelectorAll('[data-uget-copy]').forEach((el) => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          const val = el.getAttribute('data-uget-copy');
          if (!val) return;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(val).catch(() => {});
          }
          UgetDS.geoNotify({
            title: 'Token copiado!',
            message: `${val} pronto para colar no seu CSS ou Figma.`,
            badge: 'ugetds v1.0',
            discount: 'COPIADO'
          });
        });
      });
    }
  };

  root.UgetDS = UgetDS;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UgetDS.init());
  } else {
    UgetDS.init();
  }
})(window);
