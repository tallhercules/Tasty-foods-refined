/**
 * lang.js — Tasty Foods Translation Engine
 * Fetches translations from the API once, caches in sessionStorage,
 * and applies them based on localStorage language preference.
 */

const Lang = (() => {

  let dict = { en: {}, mn: {} };
  let current = localStorage.getItem('tf_lang') || 'mn';

  async function load() {
    const cached = sessionStorage.getItem('tf_translations');
    if (cached) {
      try { dict = JSON.parse(cached); applyAll(); updateToggle(); return; }
      catch { /* fall through to fetch */ }
    }

    try {
      const res = await fetch('/api/translations');
      if (!res.ok) throw new Error('Failed to fetch translations');
      dict = await res.json();
      sessionStorage.setItem('tf_translations', JSON.stringify(dict));
      applyAll();
      updateToggle();
    } catch (err) {
      console.warn('[Lang] Could not load translations:', err.message);
    }
  }

  function t(key) {
    return dict[current]?.[key] ?? dict['en']?.[key] ?? key;
  }

  function applyAll() {
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      const val = t(key);

      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    });
  }

  function toggle() {
    current = current === 'mn' ? 'en' : 'mn';
    localStorage.setItem('tf_lang', current);
    applyAll();
    updateToggle();
    // Notify other modules that language changed
    document.dispatchEvent(new Event('langchange'));
  }

  function updateToggle() {
    const track  = document.getElementById('lang-track');
    const label  = document.getElementById('lang-label');
    const flag   = document.getElementById('lang-flag');

    if (track) track.classList.toggle('on', current === 'en');
    if (label) label.textContent = current.toUpperCase();
    if (flag)  flag.src = current === 'en'
      ? 'https://flagcdn.com/w20/gb.png'
      : 'https://flagcdn.com/w20/mn.png';
  }

  function getLang() { return current; }

  document.addEventListener('DOMContentLoaded', load);

  return { t, toggle, applyAll, getLang, load };

})();

window.Lang = Lang;
