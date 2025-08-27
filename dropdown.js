(function () {
  function $id(id) { return document.getElementById(id); }
  function placeMenuFixed(btn, menu) {
    if (!btn || !menu) return;
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.classList.remove('gp-visible');
    menu.classList.add('gp-hidden');
    menu.style.position = 'fixed';
    menu.style.left = '0';
    menu.style.top = '0';
    menu.style.width = 'auto';
    menu.style.maxWidth = 'none';
    menu.style.display = 'block';
    const intrinsicW = Math.ceil(menu.scrollWidth || 180);
    const maxW = Math.max(0, window.innerWidth - 16);
    const finalW = Math.min(intrinsicW, maxW);
    menu.style.width = finalW + 'px';
    menu.style.maxHeight = (window.innerHeight - 32) + 'px';
    menu.style.overflowY = 'auto';
    const rect = btn.getBoundingClientRect();
    let left = rect.right - finalW;
    let top = rect.bottom + 8;
    left = Math.max(8, Math.min(left, window.innerWidth - finalW - 8));
    const willBeBottom = top + menu.offsetHeight <= window.innerHeight - 8;
    if (!willBeBottom) {
      top = Math.max(8, rect.top - menu.offsetHeight - 8);
    }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    requestAnimationFrame(function () {
      menu.classList.remove('gp-hidden');
      menu.classList.add('gp-visible');
    });
  }
  function openMenu(btn, menu) {
    placeMenuFixed(btn, menu);
    menu.setAttribute('data-gp-open', 'true');
    btn.setAttribute('aria-expanded', 'true');
    const first = menu.querySelector('[role="menuitem"], a, button');
    if (first && typeof first.focus === 'function') first.focus();
  }
  function closeMenu(btn, menu) {
    if (!menu) return;
    menu.removeAttribute('data-gp-open');
    btn && btn.setAttribute('aria-expanded', 'false');
    menu.classList.remove('gp-visible');
    menu.classList.add('gp-hidden');
    menu.style.width = '';
    menu.style.maxHeight = '';
  }
  function initAvatarDropdown() {
    const btn = $id('avatarBtn');
    const menu = $id('avatarMenu');
    function onceAdd(el, ev, fn) {
      if (!el) return;
      if (!el._gp_listened) el._gp_listened = {};
      if (el._gp_listened[ev]) return;
      el.addEventListener(ev, fn);
      el._gp_listened[ev] = true;
    }
    if (btn && menu) {
      onceAdd(btn, 'click', function (e) {
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const isOpen = menu.getAttribute('data-gp-open') === 'true';
        if (isOpen) closeMenu(btn, menu);
        else openMenu(btn, menu);
      });
    }
    onceAdd(document, 'click', function (e) {
      if (menu && menu.getAttribute('data-gp-open') === 'true') {
        if (!menu.contains(e.target) && !(btn && btn.contains(e.target))) closeMenu(btn, menu);
      }
    });
    onceAdd(document, 'keydown', function (e) {
      if (e.key === 'Escape') {
        if (menu && menu.getAttribute('data-gp-open') === 'true') closeMenu(btn, menu);
      }
    });
    onceAdd(window, 'resize', function () {
      if (menu && menu.getAttribute('data-gp-open') === 'true') placeMenuFixed(btn, menu);
    });
    onceAdd(window, 'scroll', function () {
      if (menu && menu.getAttribute('data-gp-open') === 'true') placeMenuFixed(btn, menu);
    });
    const top = document.querySelector('.gp-topnav');
    if (top) {
      top.style.pointerEvents = 'auto';
      Array.from(top.querySelectorAll('*')).forEach(el => { el.style.pointerEvents = 'auto'; });
    }
  }
  try { initAvatarDropdown(); } catch (e) { /* ignore */ }
  const mo = new MutationObserver(function () {
    if (document.getElementById('avatarBtn')) {
      initAvatarDropdown();
    }
  });
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAvatarDropdown);
  else setTimeout(initAvatarDropdown, 0);
})();
