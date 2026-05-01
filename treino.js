
const KEY = 'treino-samuel-v3';
function load() { try { return JSON.parse(localStorage.getItem(KEY)||'{}'); } catch(e) { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e) {} }
let S = load();
if (!S.checks)  S.checks  = {};
if (!S.weights) S.weights = {};
if (!S.day)     S.day     = 'a';

// ---- migracao: limpa imagens salvas no formato antigo (dentro de S.images) ----
// Versoes anteriores guardavam base64 dentro do objeto S, ocupando espaco indevidamente.
if (S.images) {
  delete S.images;
  save(S);
}
// Remove quaisquer chaves antigas de outras versoes do arquivo que possam existir
try {
  const staleKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    // Remove chaves de versoes anteriores do treino (v1, v2) que nao sejam do formato atual
    if (k && k.startsWith('treino-') && !k.startsWith('treino-samuel-v3') && !k.startsWith('treino-img-')) {
      staleKeys.push(k);
    }
  }
  staleKeys.forEach(k => localStorage.removeItem(k));
} catch(e) {}

// ---- tabs ----
const tabs = document.querySelectorAll('.tab');
const days = document.querySelectorAll('.day');
function activateDay(d) {
  tabs.forEach(t => t.classList.toggle('on', t.dataset.day===d));
  days.forEach(el => el.classList.toggle('on', el.id==='day-'+d));
  S.day = d; save(S); updateProgress();
}
tabs.forEach(t => t.addEventListener('click', () => {
  activateDay(t.dataset.day);
  window.scrollTo({top:0,behavior:'smooth'});
}));

// ---- checkboxes ----
document.querySelectorAll('.ex-check').forEach(cb => {
  const id = cb.dataset.id;
  if (S.checks[id]) { cb.checked = true; cb.closest('.ex').classList.add('done'); }
  cb.addEventListener('change', e => {
    e.target.closest('.ex').classList.toggle('done', e.target.checked);
    if (e.target.checked) S.checks[id] = 1; else delete S.checks[id];
    save(S); updateProgress();
  });
});

// ---- weight inputs ----
document.querySelectorAll('.weight-input').forEach(inp => {
  const id = inp.dataset.id;
  if (S.weights[id]) inp.value = S.weights[id];
  let t;
  inp.addEventListener('input', e => {
    const v = e.target.value.trim();
    if (v) S.weights[id] = v; else delete S.weights[id];
    save(S);
    const el = document.getElementById('ws-'+id);
    if (el) { el.textContent = 'salvo'; el.classList.add('show');
              clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 1500); }
  });
});

// ---- armazenamento de imagens com compressao via canvas ----
// IndexedDB nao funciona em file:// no Android Chrome.
// Solucao: comprimir/redimensionar via canvas antes de salvar no localStorage.
const IMG_PREFIX = 'treino-img-';
const MAX_DIM = 600;   // px maximo (lado maior)
const QUALITY = 0.75;  // qualidade JPEG para imagens estaticas

function compressImage(dataUrl, callback) {
  // GIFs animados nao podem ser comprimidos via canvas (perde animacao).
  // Para GIF: salva como esta (ja deve ser pequeno o suficiente).
  if (dataUrl.startsWith('data:image/gif')) {
    callback(dataUrl);
    return;
  }
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
      else       { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', QUALITY));
  };
  img.onerror = () => callback(dataUrl); // fallback sem compressao
  img.src = dataUrl;
}

function saveImage(exId, dataUrl) {
  try {
    localStorage.setItem(IMG_PREFIX + exId, dataUrl);
    return true;
  } catch(e) {
    // Espaco insuficiente mesmo apos compressao
    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(IMG_PREFIX)) used += (localStorage.getItem(k)||'').length;
      }
    } catch(_) {}
    const mb = (used/1024/1024).toFixed(1);
    alert('Nao foi possivel salvar. Espaco insuficiente. Imagens salvas: ~' + mb + ' MB. Dica: remova a imagem de outro exercicio antes de adicionar esta.');
    return false;
  }
}

function loadImage(exId) {
  try { return localStorage.getItem(IMG_PREFIX + exId); } catch(e) { return null; }
}

function deleteImage(exId) {
  try { localStorage.removeItem(IMG_PREFIX + exId); } catch(e) {}
}

function applyCustomImage(exId, dataUrl) {
  const wrap = document.getElementById('imgwrap-' + exId);
  if (!wrap) return;
  let img = document.getElementById('img-' + exId);

  if (!img || img.tagName === 'DIV') {
    // Placeholder ou ausente -- cria novo <img>
    const newImg = document.createElement('img');
    newImg.className = 'ex-img';
    newImg.id = 'img-' + exId;
    newImg.alt = '';
    newImg.dataset.default = (img && img.dataset.default) || '';
    if (img) wrap.replaceChild(newImg, img);
    else wrap.insertBefore(newImg, wrap.firstChild);
    img = newImg;
  }

  // Aplica a imagem
  img.src = dataUrl;
  img.style.display = '';
  img.style.objectFit = dataUrl.startsWith('data:image/gif') ? 'contain' : '';

  // Mostra botao restaurar
  const resetBtn = document.querySelector('.img-reset[data-ex-id="' + exId + '"]');
  if (resetBtn) resetBtn.style.display = 'inline-flex';
}

function clearCustomImage(exId) {
  const wrap = document.getElementById('imgwrap-' + exId);
  const img  = document.getElementById('img-' + exId);
  const resetBtn = document.querySelector('.img-reset[data-ex-id="' + exId + '"]');
  if (!img || !wrap) return;
  const def = img.dataset.default || '';
  if (def) {
    img.src = def;
    img.style.objectFit = '';
  } else {
    const ph = document.createElement('div');
    ph.className = 'ex-img-placeholder';
    ph.id = 'img-' + exId;
    ph.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Sem imagem padrao</span>';
    wrap.replaceChild(ph, img);
  }
  if (resetBtn) resetBtn.style.display = 'none';
  deleteImage(exId);
}

// Carrega imagens salvas ao abrir (sincrono -- aparece imediatamente)
document.querySelectorAll('[id^="imgwrap-"]').forEach(wrap => {
  const exId = wrap.id.replace('imgwrap-', '');
  const saved = loadImage(exId);
  if (saved) applyCustomImage(exId, saved);
});

// File input handler
document.querySelectorAll('.img-file-input').forEach(inp => {
  inp.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const exId = inp.dataset.exId;

    if (file.size > 10000000) {
      alert('Arquivo muito grande (max. ~7 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      if (!dataUrl || !dataUrl.startsWith('data:')) {
        alert('Erro ao ler o arquivo.');
        return;
      }
      applyCustomImage(exId, dataUrl);
      const ok = saveImage(exId, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
});

// Restore button handler
document.querySelectorAll('.img-reset').forEach(btn => {
  const exId = btn.dataset.exId;
  if (loadImage(exId)) btn.style.display = 'inline-flex';
  btn.addEventListener('click', () => {
    if (confirm('Restaurar imagem original?')) clearCustomImage(exId);
  });
});

// ---- video link editing ----
if (!S.videos) S.videos = {};

// Apply saved custom video URLs on startup
Object.entries(S.videos).forEach(([exId, url]) => {
  const link = document.getElementById('vlink-' + exId);
  const inp  = document.querySelector('.video-url-input[data-ex-id="' + exId + '"]');
  if (link) { link.href = url; }
  if (inp)  { inp.value = url; }
});

// Open edit row
document.querySelectorAll('.video-edit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const exId = btn.dataset.exId;
    document.getElementById('vedit-' + exId).style.display = 'flex';
    const inp = document.querySelector('.video-url-input[data-ex-id="' + exId + '"]');
    if (inp) { inp.focus(); inp.select(); }
  });
});

// Save video URL
document.querySelectorAll('.video-save-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const exId = btn.dataset.exId;
    const inp  = document.querySelector('.video-url-input[data-ex-id="' + exId + '"]');
    const link = document.getElementById('vlink-' + exId);
    if (!inp || !link) return;
    const val = inp.value.trim();
    if (val) {
      link.href = val;
      S.videos[exId] = val;
      save(S);
    }
    document.getElementById('vedit-' + exId).style.display = 'none';
  });
});

// Cancel edit
document.querySelectorAll('.video-cancel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const exId = btn.dataset.exId;
    // Restore input to current saved value
    const link = document.getElementById('vlink-' + exId);
    const inp  = document.querySelector('.video-url-input[data-ex-id="' + exId + '"]');
    if (link && inp) inp.value = link.href;
    document.getElementById('vedit-' + exId).style.display = 'none';
  });
});

// ---- reset day checks ----
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Resetar marcacoes de conclusao deste dia?\n(Cargas e imagens sao mantidas.)')) return;
  const d = S.day;
  document.querySelectorAll('#day-'+d+' .ex-check').forEach(cb => {
    cb.checked = false; cb.closest('.ex').classList.remove('done');
    delete S.checks[cb.dataset.id];
  });
  save(S); updateProgress();
});

// ---- progress ----
function updateProgress() {
  const d = S.day, el = document.getElementById('day-'+d);
  if (!el) return;
  const total = el.querySelectorAll('.ex-check').length;
  const done  = el.querySelectorAll('.ex-check:checked').length;
  document.getElementById('prog-txt').textContent  = done+' / '+total+' concluidos';
  document.getElementById('prog-fill').style.width = total ? (done/total*100)+'%' : '0%';
}

// ---- init ----
activateDay(S.day);
