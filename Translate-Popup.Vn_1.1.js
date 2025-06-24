// ==UserScript==
// @name         Bôi Đen + Dịch Tiếng Việt (Popup)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Dịch nhanh đoạn văn bản được bôi đen sang Tiếng Việt ngay trên trang.
// @author       Phan Đình Thuyết
// @match        http://*/*
// @match        https://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// @updateURL    https://github.com/thuyetabd/Boi-Den-Dich-Tieng-Viet/raw/main/Translate-Popup.Vn.js
// @downloadURL  https://github.com/thuyetabd/Boi-Den-Dich-Tieng-Viet/raw/main/Translate-Popup.Vn.js
// ==/UserScript==

(() => {
  'use strict';

  /* ---------- Styles ---------- */
  GM_addStyle(`
    #qt-icon{position:absolute;z-index:2147483646;cursor:pointer;font-size:18px;padding:4px 7px;background:#fff3;border:1px solid #555;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.4);user-select:none;display:none}
    #qt-icon:hover{background:#fff6}
    #qt-popup{position:absolute;z-index:2147483647;min-width:260px;max-width:460px;max-height:360px;padding:14px 18px 18px;background:#111;border:1px solid #444;border-radius:8px;box-shadow:0 8px 18px rgba(0,0,0,.6);font:600 16px/1.5 "Segoe UI",sans-serif;color:#f5f5f5;overflow:auto;display:none;opacity:0;transform:translateY(10px) scale(.96);transition:opacity .25s,transform .25s}
    #qt-popup.show{opacity:1;transform:translateY(0) scale(1)}
    #qt-close{position:absolute;top:6px;right:10px;font-size:22px;cursor:pointer;color:#eee;user-select:none}
    #qt-close:hover{color:#ff6b6b}
    .qt-loading{color:#aaa;font-style:italic}
    .qt-error{color:#ff6b6b;font-weight:bold}
    .qt-text{white-space:pre-wrap;word-wrap:break-word}
  `);

  /* ---------- State ---------- */
  let icon, popup, content, selectedText = '';

  /* ---------- Helpers ---------- */
  const escapeHtml = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

  const translate = (text, cb) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`,
      onload: r => {
        if (r.status !== 200) return cb(new Error(r.status));
        try {
          const data = JSON.parse(r.responseText);
          cb(null, data[0].map(s => s[0]).join(''));
        } catch (e) { cb(e); }
      },
      onerror: cb, ontimeout: () => cb(new Error('timeout'))
    });
  };

  /* ---------- UI ---------- */
  const ensureIcon = () => {
    if (icon) return;
    icon = document.createElement('div');
    icon.id = 'qt-icon';
    icon.textContent = '🌐';
    document.body.appendChild(icon);
    icon.onclick = e => { e.stopPropagation(); if (selectedText) openPopup(); hideIcon(); };
  };

  const ensurePopup = () => {
    if (popup) return;
    popup = document.createElement('div');
    popup.id = 'qt-popup';
    const close = document.createElement('span');
    close.id = 'qt-close';
    close.textContent = '×';
    close.onclick = closePopup;
    content = document.createElement('div');
    popup.append(close, content);
    document.body.appendChild(popup);
  };

  const showIcon = (x, y) => { ensureIcon(); icon.style.left = x+'px'; icon.style.top = y+'px'; icon.style.display = 'block'; };
  const hideIcon = () => { if (icon) icon.style.display = 'none'; };

  const openPopup = () => {
    ensurePopup();
    const rect = icon.getBoundingClientRect();
    const x = rect.right + window.scrollX + 10;
    const y = rect.bottom + window.scrollY + 10;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.display = 'block';
    requestAnimationFrame(() => popup.classList.add('show'));
    render();
  };

  const closePopup = () => {
    if (!popup) return;
    popup.classList.remove('show');
    setTimeout(() => { popup.style.display = 'none'; }, 250);
  };

  const render = () => {
    content.innerHTML = '<span class="qt-loading">Đang dịch...</span>';
    translate(selectedText, (err, res) => {
      content.innerHTML = err || !res
        ? '<span class="qt-error">Không thể dịch.</span>'
        : `<span class="qt-text">${escapeHtml(res)}</span>`;
    });
  };

  /* ---------- Events ---------- */
  document.addEventListener('mouseup', e => {
    if (icon?.contains(e.target) || popup?.contains(e.target)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const txt = sel.toString().trim();
      if (txt) {
        selectedText = txt;
        const r = sel.getRangeAt(0).getBoundingClientRect();
        showIcon(r.right + window.scrollX + 5, r.bottom + window.scrollY + 5);
      } else if (!popup?.contains(e.target)) hideIcon();
    });
  });

  document.addEventListener('mousedown', e => {
    if (!icon?.contains(e.target) && !popup?.contains(e.target)) {
      hideIcon();
      closePopup();
    }
  });
})(); 