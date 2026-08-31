// Motion helpers: scroll reveal, card entrance, sticky header polish.

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setupScrollHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function markRevealTargets() {
  const selectors = [
    '.section-head',
    '.discover-split',
    '.discover-block',
    '.value-item',
    '.value-grid',
    '.org-section-inner > h2',
    '.org-section-lead',
    '.org-who-grid article',
    '.org-steps li',
    '.org-benefit',
    '.org-faq-list details',
    '.page-intro',
    '.metric-card',
    '.panel-card',
    '.record-card'
  ];

  document.querySelectorAll(selectors.join(',')).forEach((el) => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });

  document.querySelectorAll('.discover-split, .value-grid, .org-who-grid, .org-benefit-rows, .org-steps, .grid').forEach((el) => {
    el.classList.add('reveal-stagger');
  });
}

function setupScrollReveal() {
  if (prefersReducedMotion()) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  markRevealTargets();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function animateEventCards(root = document) {
  if (prefersReducedMotion()) return;
  const cards = root.querySelectorAll('.event-card');
  cards.forEach((card, index) => {
    card.classList.add('is-entering');
    card.style.animationDelay = `${Math.min(index, 8) * 0.05}s`;
  });
}

function setupEventCardObserver() {
  const grids = document.querySelectorAll('#event-grid, .grid');
  if (!grids.length) return;

  grids.forEach((grid) => {
    const mo = new MutationObserver(() => {
      animateEventCards(grid);
      grid.querySelectorAll('.event-card.reveal, .event-card').forEach((card) => {
        card.classList.add('reveal', 'is-visible');
      });
    });
    mo.observe(grid, { childList: true });
    animateEventCards(grid);
  });
}

function setupSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupScrollHeader();
  setupScrollReveal();
  setupEventCardObserver();
  setupSmoothAnchors();
});
