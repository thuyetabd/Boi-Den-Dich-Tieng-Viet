// ==UserScript==
// @name         Bôi Đen + Dịch Tiếng Việt
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Select text → click globe icon → instant Vietnamese translation in a stylish popup.
// @author       Phan Đình Thuyết
// @match        http://*/*
// @match        https://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// ==/UserScript==

(() => {
  'use strict';

  /* ---------------- CSS ---------------- */
  GM_addStyle(`
    #qt-icon {
      position: absolute;
      z-index: 2147483646;
      cursor: pointer;
      font-size: 18px;
      padding: 4px 7px;
      background:#fff3;
      backdrop-filter: blur(4px);
      border: 1px solid #555;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,.4);
      user-select:none;
      display:none;
      transition:background .2s;
    }
    #qt-icon:hover{background:#fff6;}

    #qt-popup{
      position:absolute;
      z-index:2147483647;
      min-width:260px;max-width:460px;
      max-height:360px;min-height:90px;
      padding:14px 18px 18px;
      background-image:linear-gradient(145deg,#1b1b1b 0%,#111 100%);
      border:1px solid #444;border-radius:8px;
      box-shadow:0 8px 18px rgba(0,0,0,.6);
      font:600 16px/1.5 "Segoe UI",sans-serif;
      color:#f5f5f5;
      overflow:auto;display:none;opacity:0;
      transform:translateY(10px) scale(.96);
      transition:opacity .25s ease,transform .25s ease;
    }
    #qt-popup.show{opacity:1;transform:translateY(0) scale(1);}

    #qt-close{
      position:absolute;top:6px;right:10px;
      font-size:22px;cursor:pointer;color:#eee;
      user-select:none;transition:color .2s;
    }
    #qt-close:hover{color:#ff6b6b;}

    .qt-loading{color:#aaa;font-style:italic;}
    .qt-error{color:#ff6b6b;font-weight:bold;}
    .qt-text{white-space:pre-wrap;word-wrap:break-word;}
  `);

  /* ---------------- State ---------------- */
  let icon, popup, contentArea, selectedText='';

  /* ---------------- Helpers ---------------- */
  const escapeHtml = s => s.replace(/[&<>"]|'/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  const translate = (text, cb) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    GM_xmlhttpRequest({method:'GET',url,onload:r=>{
      if(r.status===200){
        try{
          const data=JSON.parse(r.responseText);
          const t=data[0].map(seg=>seg[0]).join('');
          cb(null,t||null);
        }catch(e){cb(e);}
      }else cb(new Error(r.status));
    },onerror:e=>cb(e),ontimeout:()=>cb(new Error('timeout'))});
  };

  /* ---------------- UI creation ---------------- */
  const ensureIcon=()=>{
    if(icon)return;icon=document.createElement('div');
    icon.id='qt-icon';icon.textContent='🌐';document.body.appendChild(icon);
    icon.onmousedown=e=>e.stopPropagation();
    icon.onclick=e=>{e.stopPropagation();if(selectedText)openPopup();hideIcon();};
  };

  const ensurePopup=()=>{
    if(popup)return;popup=document.createElement('div');popup.id='qt-popup';
    const close=document.createElement('span');close.id='qt-close';close.textContent='×';close.onclick=closePopup;
    contentArea=document.createElement('div');popup.append(close,contentArea);document.body.appendChild(popup);
    popup.onmousedown=e=>e.stopPropagation();
  };

  /* ---------------- Icon ---------------- */
  const showIcon=(x,y)=>{ensureIcon();icon.style.left=x+'px';icon.style.top=y+'px';icon.style.display='block';};
  const hideIcon=()=>{icon&& (icon.style.display='none');};

  /* ---------------- Popup ---------------- */
  const openPopup=()=>{
    ensurePopup();
    const rect=icon.getBoundingClientRect();
    const estW=parseInt(getComputedStyle(popup).maxWidth)||320;
    const estH=parseInt(getComputedStyle(popup).maxHeight)||220;
    let x=rect.right+window.scrollX+10,y=rect.bottom+window.scrollY+10;
    const vw=window.innerWidth+window.scrollX,vh=window.innerHeight+window.scrollY,vl=window.scrollX,vt=window.scrollY;
    if(x+estW>vw){x=rect.left+window.scrollX-estW-10;if(x<vl)x=vl+6;}
    if(y+estH>vh){y=rect.top+window.scrollY-estH-10;if(y<vt)y=vt+6;}
    popup.style.left=x+'px';popup.style.top=y+'px';popup.style.display='block';
    requestAnimationFrame(()=>popup.classList.add('show'));
    renderTranslation();
  };
  const closePopup=()=>{
    if(!popup)return;popup.classList.remove('show');setTimeout(()=>popup.style.display='none',250);
  };

  const renderTranslation=()=>{
    contentArea.innerHTML='<span class="qt-loading">Đang dịch...</span>';
    translate(selectedText,(err,res)=>{
      if(err||!res){contentArea.innerHTML='<span class="qt-error">Không thể dịch.</span>';return;}
      contentArea.innerHTML=`<span class="qt-text">${escapeHtml(res)}</span>`;
    });
  };

  /* ---------------- Selection handling ---------------- */
  document.addEventListener('mouseup',e=>{
    if(icon&&icon.contains(e.target)||popup&&popup.contains(e.target))return;
    setTimeout(()=>{
      const sel=window.getSelection();const txt=sel.toString().trim();
      if(txt){selectedText=txt;const r=sel.getRangeAt(0).getBoundingClientRect();showIcon(r.right+window.scrollX+5,r.bottom+window.scrollY+5);}else if(!popup||!popup.contains(e.target)){hideIcon();}
    },0);
  });
  document.addEventListener('mousedown',e=>{if(!(icon&&icon.contains(e.target))&&!(popup&&popup.contains(e.target))){hideIcon();closePopup();}});

})();
