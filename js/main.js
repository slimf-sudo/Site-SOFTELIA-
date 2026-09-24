/* ==========================================================================
   SOFTELIA — scripts (vanilla JS, sans dépendance)
   ========================================================================== */
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Header : ombre au scroll ---------- */
const header = document.querySelector('.header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- Menu hamburger ---------- */
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
if (burger && menu) {
  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  burger.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); burger.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header__bar')) setOpen(false);
  });
}

/* ---------- Apparition au scroll ---------- */
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- Compteurs animés ---------- */
const fmt = new Intl.NumberFormat('fr-FR');
const counters = document.querySelectorAll('[data-target]');
const renderCount = (el, n) => {
  el.textContent = (el.dataset.prefix || '') + fmt.format(n) + (el.dataset.suffix || '');
};
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = Number(el.dataset.target);
      const t0 = performance.now();
      const duration = 1600;
      const step = (t) => {
        const p = Math.min((t - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        renderCount(el, Math.round(end * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => { renderCount(el, 0); io.observe(el); });
} else {
  counters.forEach((el) => renderCount(el, Number(el.dataset.target)));
}

/* ---------- Onglets (expertises) ---------- */
document.querySelectorAll('[data-tabs]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (e.key in keys) {
        e.preventDefault();
        select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
});

/* ---------- Carrousel (missions) ---------- */
document.querySelectorAll('[data-carousel]').forEach((root) => {
  const slides = [...root.querySelectorAll('.slide')];
  const dotsWrap = root.querySelector('.carousel__dots');
  const counter = root.querySelector('.carousel__counter');
  const viewport = root.querySelector('.carousel__viewport');
  let i = 0;

  const dots = slides.map((s, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'carousel__dot';
    b.setAttribute('aria-label', `Mission ${k + 1} : ${s.dataset.label || ''}`.trim());
    b.addEventListener('click', () => show(k));
    dotsWrap.appendChild(b);
    return b;
  });

  function show(n, updateHash = true) {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.hidden = k !== i; });
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    if (counter) counter.textContent = `${i + 1} / ${slides.length}`;
    if (updateHash && slides[i].id) history.replaceState(null, '', `#${slides[i].id}`);
  }

  root.querySelector('.prev').addEventListener('click', () => show(i - 1));
  root.querySelector('.next').addEventListener('click', () => show(i + 1));
  root.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });

  // Swipe mobile
  let x0 = null;
  viewport.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 50) show(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  });

  // Liens externes vers une mission (ex. missions.html#veolia-crm)
  const openFromHash = () => {
    const k = slides.findIndex((s) => `#${s.id}` === location.hash);
    if (k >= 0) {
      show(k, false);
      root.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = slides.findIndex((s) => s.id === btn.dataset.goto);
      if (k < 0) return;
      show(k);
      root.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  show(0, false);
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
});

/* ---------- Année du copyright ---------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
