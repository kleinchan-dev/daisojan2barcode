// ==UserScript==
// @name        ダイソー JANバーコード表示
// @namespace   daisojan2barcode
// @version     1.0.0
// @description ダイソーのネットショップ(単品買い・まとめ買い)の商品ページのJANコードをバーコード(EAN-13)で表示します
// @author      klein chan
// @homepageURL https://kleinchan-dev.github.io/daisojan2barcode/
// @supportURL  https://github.com/kleinchan-dev/daisojan2barcode/issues
// @updateURL   https://kleinchan-dev.github.io/daisojan2barcode/daisojan2barcode.user.js
// @downloadURL https://kleinchan-dev.github.io/daisojan2barcode/daisojan2barcode.user.js
// @match       https://jp.daisonet.com/products/*
// @match       https://jpbulk.daisonet.com/products/*
// @run-at      document-idle
// @require     https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js#sha256=UuAyU0w/mJdq2Vy4wguvgO0MyD1CWQYCqM8dsW4uIu0=
// @noframes
// @grant       none
// ==/UserScript==

(function () {
  'use strict';

  const BARCODE_ID = 'daiso-jan-barcode';

  function isValidEan13(code) {
    if (!/^\d{13}$/.test(code)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10 === Number(code[12]);
  }

  function digitsFrom(text) {
    if (typeof text !== 'string') return null;
    const m = text.trim().match(/^\d{13}$/);
    return m ? m[0] : null;
  }

  function janFromDom() {
    const el = document.querySelector('.product-meta__sku-number');
    return el ? digitsFrom(el.textContent) : null;
  }

  function janFromJsonLd() {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(s.textContent);
        if (data && typeof data.gtin13 === 'string') {
          const d = digitsFrom(data.gtin13);
          if (d) return d;
        }
      } catch (e) {
        /* ignore malformed json */
      }
    }
    return null;
  }

  function janFromUrl() {
    const m = location.pathname.match(/\/products\/(\d{13})/);
    return m ? m[1] : null;
  }

  function extractJan() {
    const candidates = [janFromDom(), janFromJsonLd(), janFromUrl()];
    for (const c of candidates) {
      if (c && isValidEan13(c)) return c;
    }
    return null;
  }

  function removeBarcode() {
    const existing = document.getElementById(BARCODE_ID);
    if (existing) existing.remove();
  }

  function renderBarcode(jan) {
    if (typeof JsBarcode !== 'function') return;

    const anchor =
      document.querySelector('.product-meta__reference') ||
      document.querySelector('.product-form__info-list');
    if (!anchor) return;

    const existing = document.getElementById(BARCODE_ID);
    if (existing) {
      if (existing.dataset.jan === jan && anchor.contains(existing)) return;
      existing.remove();
    }

    const box = document.createElement('div');
    box.id = BARCODE_ID;
    box.dataset.jan = jan;
    box.style.cssText =
      'margin-top:8px;line-height:0;width:max-content;max-width:100%;overflow-x:auto;-webkit-user-select:none;user-select:none;';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.appendChild(svg);

    try {
      JsBarcode(svg, jan, {
        format: 'EAN13',
        width: 2,
        height: 56,
        displayValue: true,
        font: 'monospace',
        fontSize: 14,
        margin: 4,
        background: '#ffffff',
        lineColor: '#111111'
      });
    } catch (e) {
      return;
    }

    anchor.appendChild(box);
  }

  let timer = null;

  function update() {
    const jan = extractJan();
    if (jan) {
      renderBarcode(jan);
    } else {
      removeBarcode();
    }
  }

  function scheduleUpdate() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(update, 200);
  }

  function start() {
    new MutationObserver(scheduleUpdate).observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
