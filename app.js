(() => {
  const form = document.getElementById('scheme-form');
  const fileInput = document.getElementById('reference-image');
  const uploadZone = document.getElementById('upload-zone');
  const uploadEmpty = document.getElementById('upload-empty');
  const uploadFilled = document.getElementById('upload-filled');
  const uploadPreview = document.getElementById('upload-preview');
  const uploadClear = document.getElementById('upload-clear');
  const notesInput = document.getElementById('reference-notes');
  const brandSel = document.getElementById('brand-pref');
  const miniSel = document.getElementById('mini-type');
  const generateBtn = document.getElementById('generate-btn');
  const quotaMeter = document.getElementById('quota-meter');

  const resultArea = document.getElementById('result-area');
  const resultLoading = document.getElementById('result-loading');
  const recipeCard = document.getElementById('recipe-card');
  const recipeEyebrow = document.getElementById('recipe-eyebrow');
  const recipeTitle = document.getElementById('recipe-title');
  const recipeSummary = document.getElementById('recipe-summary');
  const recipeZones = document.getElementById('recipe-zones');
  const recipeTime = document.getElementById('recipe-time');
  const copyBtn = document.getElementById('copy-btn');
  const saveBtn = document.getElementById('save-btn');
  const resultError = document.getElementById('result-error');

  const captureForm = document.getElementById('capture-form');
  const captureEmail = document.getElementById('capture-email');
  const captureNote = document.getElementById('capture-note');

  let pendingImageDataUrl = null;
  let lastRecipe = null;
  const FREE_LIMIT = 3;
  const QUOTA_KEY = 'pigsmith_quota_v1';

  function getQuota() {
    try {
      const raw = JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}');
      const month = new Date().toISOString().slice(0, 7);
      if (raw.month !== month) return { month, count: 0 };
      return raw;
    } catch { return { month: new Date().toISOString().slice(0, 7), count: 0 }; }
  }
  function setQuota(q) { try { localStorage.setItem(QUOTA_KEY, JSON.stringify(q)); } catch {} }
  function renderQuota() {
    const q = getQuota();
    quotaMeter.textContent = `${q.count} / ${FREE_LIMIT} free schemes used this month`;
  }
  renderQuota();

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showError('Reference image must be under 4 MB.');
      return;
    }
    const dataUrl = await readFile(file);
    pendingImageDataUrl = dataUrl;
    uploadPreview.src = dataUrl;
    uploadEmpty.hidden = true;
    uploadFilled.hidden = false;
  }

  uploadZone.addEventListener('click', (e) => {
    if (e.target === uploadClear) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  uploadClear.addEventListener('click', (e) => {
    e.stopPropagation();
    pendingImageDataUrl = null;
    fileInput.value = '';
    uploadFilled.hidden = true;
    uploadEmpty.hidden = false;
  });
  ['dragenter','dragover'].forEach(evt => uploadZone.addEventListener(evt, (e) => {
    e.preventDefault(); uploadZone.classList.add('is-drag');
  }));
  ['dragleave','drop'].forEach(evt => uploadZone.addEventListener(evt, (e) => {
    e.preventDefault(); uploadZone.classList.remove('is-drag');
  }));
  uploadZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function showError(msg) {
    resultError.textContent = msg;
    resultError.hidden = false;
    resultArea.hidden = false;
    resultLoading.hidden = true;
    recipeCard.hidden = true;
  }
  function clearError() { resultError.hidden = true; resultError.textContent = ''; }

  function renderRecipe(recipe) {
    lastRecipe = recipe;
    recipeEyebrow.textContent = recipe.eyebrow || 'Generated scheme';
    recipeTitle.textContent = recipe.title || 'Custom scheme';
    recipeSummary.textContent = recipe.summary || '';
    recipeTime.textContent = new Date().toLocaleString();
    recipeZones.innerHTML = '';

    (recipe.zones || []).forEach(zone => {
      const z = document.createElement('div');
      z.className = 'zone';
      const swatch = zone.swatch_hex || '#666';
      z.innerHTML = `
        <div class="zone-head">
          <span class="zone-swatch" style="background:${swatch}"></span>
          <h4 class="zone-title">${escapeHtml(zone.name || 'Zone')}</h4>
        </div>
        ${zone.description ? `<p class="zone-desc">${escapeHtml(zone.description)}</p>` : ''}
        <div class="zone-layers"></div>
        ${zone.technique ? `<p class="zone-technique"><strong>Technique:</strong> ${escapeHtml(zone.technique)}</p>` : ''}
      `;
      const layersHost = z.querySelector('.zone-layers');
      (zone.layers || []).forEach(layer => {
        const row = document.createElement('div');
        row.className = 'layer-row';
        const brandsHtml = (layer.brands || []).map(b =>
          `<span class="brand-chip"><strong>${escapeHtml(b.brand)}</strong>${escapeHtml(b.paint)}</span>`
        ).join('');
        row.innerHTML = `
          <div class="layer-label">${escapeHtml(layer.step || 'Layer')}</div>
          <div class="layer-detail">
            <strong>${escapeHtml(layer.name || '—')}</strong>
            ${layer.note ? `<small style="color:var(--c-muted)">${escapeHtml(layer.note)}</small>` : ''}
            <div class="layer-brands">${brandsHtml}</div>
          </div>
        `;
        layersHost.appendChild(row);
      });
      recipeZones.appendChild(z);
    });

    resultLoading.hidden = true;
    recipeCard.hidden = false;
    resultArea.hidden = false;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const quota = getQuota();
    if (quota.count >= FREE_LIMIT) {
      showError(`You've used your ${FREE_LIMIT} free schemes this month. Upgrade to Pro for unlimited schemes — see the pricing page.`);
      return;
    }

    const payload = {
      notes: (notesInput.value || '').trim(),
      brand: brandSel.value,
      mini_type: miniSel.value,
      image: pendingImageDataUrl
    };

    if (!payload.image && !payload.notes) {
      showError('Upload a reference image or describe the look you want.');
      return;
    }

    resultArea.hidden = false;
    resultLoading.hidden = false;
    recipeCard.hidden = true;
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating…';

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.zones) throw new Error('Unexpected response from server.');
      renderRecipe(data);
      const q = getQuota();
      q.count += 1;
      setQuota(q);
      renderQuota();
      window.posthog && posthog.capture && posthog.capture('scheme_generated', { brand: payload.brand, mini_type: payload.mini_type });
    } catch (err) {
      console.error(err);
      showError(`Couldn't generate that scheme. ${err.message || ''}`);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate scheme';
    }
  });

  copyBtn.addEventListener('click', async () => {
    if (!lastRecipe) return;
    const text = formatRecipeText(lastRecipe);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy recipe', 1600);
    } catch {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => copyBtn.textContent = 'Copy recipe', 1600);
    }
  });

  saveBtn.addEventListener('click', () => {
    document.getElementById('capture').scrollIntoView({ behavior: 'smooth' });
    captureEmail.focus();
  });

  function formatRecipeText(r) {
    const lines = [r.title || 'Pigsmith Scheme', '', r.summary || ''];
    (r.zones || []).forEach(z => {
      lines.push('', `## ${z.name}`);
      if (z.description) lines.push(z.description);
      (z.layers || []).forEach(l => {
        const brands = (l.brands || []).map(b => `${b.brand}: ${b.paint}`).join(' · ');
        lines.push(`- ${l.step}: ${l.name}${brands ? '  [' + brands + ']' : ''}${l.note ? ' — ' + l.note : ''}`);
      });
      if (z.technique) lines.push(`Technique: ${z.technique}`);
    });
    lines.push('', '— Generated by Pigsmith · pigsmith.majorsolutions.studio');
    return lines.join('\n');
  }

  captureForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    captureNote.style.color = '';
    captureNote.textContent = 'Saving…';
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: captureEmail.value, source: 'tool' })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      captureNote.textContent = 'Saved. Weekly scheme digest is on the way.';
      captureEmail.value = '';
      window.posthog && posthog.capture && posthog.capture('email_captured', { source: 'tool' });
    } catch (err) {
      captureNote.style.color = 'var(--c-error)';
      captureNote.textContent = 'Could not save. Try again in a moment.';
    }
  });
})();
