const PAGE_TRANSITION_SELECTOR = '.mornai-page-transition';

let installed = false;

export const installMornaiNavigationPolish = () => {
  if (installed || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  installed = true;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const observer = new MutationObserver(() => {
    const page = document.querySelector(PAGE_TRANSITION_SELECTOR);
    if (!page) return;

    window.requestAnimationFrame(scrollToTop);
  });

  observer.observe(document.getElementById('root') || document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('pageshow', scrollToTop, { passive: true });
  window.addEventListener('beforeunload', scrollToTop, { passive: true });
};
