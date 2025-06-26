// ==UserScript==
// @name         Dịch Từ Bôi Đen
// @namespace    https://tampermonkey.net/
// @version      1.3
// @description  Dịch nhanh văn bản bôi đen
// @author       Phan Đình Thuyết
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      translate.googleapis.com
// @connect      generativelanguage.googleapis.com
// @downloadURL  https://github.com/thuyetabd/Boi-Den-Dich-Tieng-Viet
// @updateURL   https://github.com/thuyetabd/Boi-Den-Dich-Tieng-Viet
// ==/UserScript==

(() => {
  'use strict';

  /* ---------------- Config ---------------- */
  const LANG_PRESET = [
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
  ];
  const GEMINI_MODELS = [
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.0-flash-live-001',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
  ];

  /* ---------------- State ---------------- */
  let icon, popup, content;
  let selectedText = GM_getValue('lastSel', '');
  let targetLang = GM_getValue('lang', 'vi');
  let useGemini = GM_getValue('useGemini', false);
  let geminiKey = GM_getValue('geminiKey', '');
  let geminiModel = GM_getValue('geminiModel', GEMINI_MODELS[0]);

  /* ---------------- Helpers ---------------- */
  const esc = (s) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const qs = (sel, el=document) => el.querySelector(sel);

  /* ---------------- API ---------------- */
  const translateGoogle = (text, cb) => {
    GM_xmlhttpRequest({
      method:'GET',
      url:`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
      onload:r=>{
        if(r.status!==200) return cb(new Error(r.status));
        try{cb(null,JSON.parse(r.responseText)[0].map(s=>s[0]).join(''));}catch(e){cb(e);}
      },onerror:cb});
  };
  const translateGemini = (text, cb) => {
    if(!geminiKey) return cb(new Error('no_key'));
    const prompt = `Hãy dịch đoạn sau sang ngôn ngữ (ISO: ${targetLang}) một cách tự nhiên, ngắn gọn, giữ nguyên cấu trúc và không nói gì thêm:\n\n${text}`;
    GM_xmlhttpRequest({
      method:'POST',
      url:`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      headers:{'Content-Type':'application/json'},
      data:JSON.stringify({contents:[{parts:[{text:prompt}]}]}),
      onload:r=>{
        if(r.status!==200) return cb(new Error(r.status));
        try{cb(null,JSON.parse(r.responseText).candidates[0].content.parts[0].text);}catch(e){cb(e);}
      },onerror:cb});
  };
  const translate = (text,cb)=> (useGemini?translateGemini:translateGoogle)(text,cb);

  /* ---------------- Styles ---------------- */
  GM_addStyle(`
    #qt-icon{position:fixed;z-index:2147483646;cursor:pointer;font-size:18px;padding:4px 7px;background:#fff3;border:1px solid #555;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.4);user-select:none;display:none}
    #qt-icon:hover{background:#fff6}
    #qt-popup{position:fixed;z-index:2147483647;min-width:260px;max-width:460px;max-height:360px;padding:14px 18px 18px;background:#111;border:1px solid #444;border-radius:8px;box-shadow:0 8px 18px rgba(0,0,0,.6);font:600 16px/1.5 "Segoe UI",sans-serif;color:#f5f5f5;overflow:auto;display:none;opacity:0;transform:translateY(10px) scale(.96);transition:opacity .25s,transform .25s}
    #qt-popup.show{opacity:1;transform:translateY(0) scale(1)}
    #qt-close{position:absolute;top:6px;right:10px;font-size:22px;cursor:pointer;color:#eee}
    #qt-close:hover{color:#ff6b6b}
    .qt-loading{color:#aaa;font-style:italic}
    .qt-error{color:#ff6b6b;font-weight:bold}
    .qt-text{white-space:pre-wrap;word-wrap:break-word}
    /* box */
    #qt-back{position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:2147483646}
    #qt-box{background:#111;border:1px solid #444;border-radius:10px;padding:22px 28px;min-width:300px;box-shadow:0 8px 18px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:10px;color:#f5f5f5;font-family:"Segoe UI",sans-serif}
    #qt-box h3{margin:0 0 6px;font-size:18px;text-align:center}
    .qt-row{display:flex;align-items:center;gap:12px}
    .qt-row label{min-width:100px;font-size:14px;color:#ccc}
    .qt-row input,.qt-row select{flex:1;padding:6px 8px;font-size:14px;background:#222;border:1px solid #555;color:#f5f5f5;border-radius:6px}
    .qt-lang-btn{margin:6px 4px 0;padding:6px 12px;font-size:15px;border:1px solid #555;border-radius:6px;background:#222;color:#f5f5f5;cursor:pointer}
    .qt-lang-btn.active{background:#4caf50;border-color:#4caf50;color:#fff}
    #qt-save{margin-top:14px;align-self:flex-end;background:#4caf50;color:#fff;border:none;padding:8px 14px;font-size:15px;border-radius:6px;cursor:pointer}
    #qt-save:hover{background:#45a648}
  `);

  /* ---------------- UI Elements ---------------- */
  const ensureIcon = () => {
    if(icon) return; icon=document.createElement('div');icon.id='qt-icon';icon.textContent='🌐';document.body.appendChild(icon);
    icon.onclick=e=>{e.stopPropagation();if(selectedText) openPopup(); hideIcon();};
  };
  const ensurePopup = () => {
    if(popup) return; popup=document.createElement('div');popup.id='qt-popup';
    const close=document.createElement('span');close.id='qt-close';close.textContent='×';close.onclick=closePopup;
    content=document.createElement('div');popup.append(close,content);document.body.appendChild(popup);
  };
  const showIcon = (x,y)=>{ensureIcon();icon.style.left=x+'px';icon.style.top=y+'px';icon.style.display='block';};
  const hideIcon = ()=>{if(icon) icon.style.display='none';};
  const openPopup = ()=>{ensurePopup();popup.style.left=(icon.getBoundingClientRect().right+10)+'px';popup.style.top=(icon.getBoundingClientRect().bottom+10)+'px';popup.style.display='block';requestAnimationFrame(()=>popup.classList.add('show')); render();};
  const closePopup=()=>{if(!popup)return;popup.classList.remove('show');setTimeout(()=>{popup.style.display='none';},250);};
  const render = ()=>{content.innerHTML='<span class="qt-loading">Đang dịch...</span>';translate(selectedText,(e,res)=>{content.innerHTML=e||!res?'<span class="qt-error">Không thể dịch.</span>':`<span class="qt-text">${esc(res)}</span>`;});};

  /* ---------------- Settings UI ---------------- */
  let back, langButtons;
  const ensureSettings = ()=>{
    if(back) return; back=document.createElement('div');back.id='qt-back';back.style.display='none';
    const box=document.createElement('div');box.id='qt-box';back.appendChild(box);
    box.innerHTML=`<span id="qt-close-set" style="position:absolute;top:6px;right:10px;font-size:22px;cursor:pointer">×</span>
      <h3>Thiết lập dịch</h3>
      <div class="qt-row"><label>Dùng Gemini, tắt nếu không có API Key</label><input type="checkbox" id="qt-use"></div>
      <div class="qt-row"><label>API Key</label><input id="qt-key" placeholder="Gemini API key"></div>
      <div class="qt-row"><label>Model</label><select id="qt-model"></select></div>
      <hr style="width:100%;height:1px;background:#444;border:none">
      <div class="qt-row"><label>Ngôn ngữ</label><div id="qt-lang"></div></div>
      <div class="qt-row"><label>ISO khác</label><input id="qt-iso"></div>
      <button id="qt-save">Lưu</button>`;
    document.body.appendChild(back);

    // populate model
    GEMINI_MODELS.forEach(m=>{const opt=document.createElement('option');opt.value=m;opt.textContent=m;qs('#qt-model',box).appendChild(opt);});
    // populate lang buttons
    LANG_PRESET.forEach(l=>{const b=document.createElement('button');b.textContent=l.label;b.className='qt-lang-btn';b.dataset.code=l.code;qs('#qt-lang',box).appendChild(b);});

    // events
    qs('#qt-close-set',box).onclick=()=>{ back.style.display='none'; };
    back.onclick=e=>{if(e.target===back){ back.style.display='none'; }};
    qs('#qt-save',box).onclick=()=>{
      useGemini = qs('#qt-use',box).checked;
      geminiKey = qs('#qt-key',box).value.trim();
      geminiModel = qs('#qt-model',box).value;
      GM_setValue('useGemini',useGemini);
      GM_setValue('geminiKey',geminiKey);
      GM_setValue('geminiModel',geminiModel);
      GM_setValue('lang',targetLang);
      back.style.display='none';
    };
    // lang btns
    langButtons=box.querySelectorAll('.qt-lang-btn');
    const mark=()=>langButtons.forEach(b=>b.classList.toggle('active',b.dataset.code===targetLang));
    box.addEventListener('click',e=>{
      if(e.target.classList.contains('qt-lang-btn')){targetLang=e.target.dataset.code;qs('#qt-iso',box).value=targetLang;mark();}
    });
    qs('#qt-iso',box).oninput=e=>{targetLang=e.target.value.trim();mark();};

    // init values
    qs('#qt-use',box).checked=useGemini;
    qs('#qt-key',box).value=geminiKey;
    qs('#qt-model',box).value=geminiModel;
    qs('#qt-iso',box).value=targetLang;mark();
  };
  GM_registerMenuCommand('Cài đặt Dịch…',()=>{ensureSettings();back.style.display='flex';});

  /* ---------------- Events ---------------- */
  document.addEventListener('mouseup',e=>{
    if(icon?.contains(e.target)||popup?.contains(e.target)) return;
    const sel=window.getSelection();
    setTimeout(()=>{
      const txt=sel.toString().trim();
      if(txt){selectedText=txt;GM_setValue('lastSel',txt);const pad=10,w=60,h=30;let x=Math.min(e.clientX+pad,window.innerWidth-w-pad);let y=Math.min(e.clientY+30,window.innerHeight-h-30);x=Math.max(pad,x);y=Math.max(30,y);showIcon(x,y);}else hideIcon();
    });
  });
  document.addEventListener('mousedown',e=>{if(!icon?.contains(e.target)&&!popup?.contains(e.target)){hideIcon();closePopup();}});
})();
