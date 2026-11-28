/**
 * ============================================================================
 * Mpdownloader — Controlador de Interface (MPDs v1.0)
 * ============================================================================
 */
(function () {
  'use strict';

  const HISTORY_KEY = 'mpdownloader_history_v1';
  let selectedMode = 'standard';
  let activeEventSource = null;
  let activeEngine = null; // 'php' | 'node'

  const els = {
    form: document.getElementById('captureForm'),
    urlField: document.getElementById('urlField'),
    urlInput: document.getElementById('targetUrl'),
    urlHelper: document.getElementById('urlHelper'),
    captureBtn: document.getElementById('captureBtn'),
    captureBtnLabel: document.getElementById('captureBtnLabel'),
    serverAlert: document.getElementById('serverOfflineAlert'),
    serverStatusBadge: document.getElementById('serverStatusBadge'),
    progressPanel: document.getElementById('progressPanel'),
    progressBar: document.getElementById('progressBar'),
    progressPct: document.getElementById('progressPct'),
    progressStep: document.getElementById('progressStep'),
    progressLog: document.getElementById('progressLog'),
    resultPanel: document.getElementById('resultPanel'),
    resultTitle: document.getElementById('resultTitle'),
    resultMeta: document.getElementById('resultMeta'),
    resultStats: document.getElementById('resultStats'),
    downloadZipBtn: document.getElementById('downloadZipBtn'),
    errorPanel: document.getElementById('errorPanel'),
    errorMessage: document.getElementById('errorMessage'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    optImages: document.getElementById('optImages'),
    optFonts: document.getElementById('optFonts'),
    optScripts: document.getElementById('optScripts'),
    optReadme: document.getElementById('optReadme')
  };

  function formatBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function appendLog(line) {
    if (!els.progressLog) return;
    const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    const row = document.createElement('div');
    row.textContent = `[${ts}] ${line}`;
    els.progressLog.appendChild(row);
    els.progressLog.scrollTop = els.progressLog.scrollHeight;
  }

  function setBusy(isBusy) {
    if (!els.captureBtn) return;
    els.captureBtn.disabled = isBusy;
    if (els.captureBtnLabel) {
      els.captureBtnLabel.textContent = isBusy ? 'Capturando...' : 'Capturar Site (.ZIP)';
    }
  }

  function setMode(mode) {
    selectedMode = mode;
    document.querySelectorAll('[data-capture-mode]').forEach((btn) => {
      const active = btn.getAttribute('data-capture-mode') === mode;
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (els.optScripts) {
      els.optScripts.checked = mode !== 'fast';
    }
  }

  async function checkServerHealth() {
    if (!window.location.protocol.startsWith('http')) {
      activeEngine = null;
      updateServerStatusUI(false);
      return null;
    }
    try {
      const rPhp = await fetch('./api.php?action=health', { cache: 'no-store' });
      if (rPhp.ok) {
        const dPhp = await rPhp.json();
        if (dPhp && dPhp.ok) {
          activeEngine = 'php';
          updateServerStatusUI(true);
          return 'php';
        }
      }
    } catch (_) {}
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      if (data && data.ok) {
        activeEngine = 'node';
        updateServerStatusUI(true);
        return 'node';
      }
    } catch (_) {}
    activeEngine = null;
    updateServerStatusUI(false);
    return null;
  }

  function updateServerStatusUI(online) {
    if (els.serverAlert) {
      els.serverAlert.style.display = online ? 'none' : 'flex';
    }
    if (els.serverStatusBadge) {
      els.serverStatusBadge.innerHTML = online
        ? '<span class="mpds-status-dot"></span>Motor Offline Pronto'
        : '<span class="mpds-status-dot" style="background:var(--mpds-warning-dot); animation:none;"></span>Servidor Local Inativo';
    }
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistoryItem(summary) {
    const list = loadHistory().filter((item) => item.url !== summary.url);
    list.unshift({
      url: summary.url,
      hostname: summary.hostname,
      mode: summary.mode,
      totalFiles: summary.totalFiles,
      sizeBytes: summary.sizeBytes,
      date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    });
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 8)));
    } catch (_) {}
    renderHistory();
  }

  function renderHistory() {
    if (!els.historyList) return;
    const list = loadHistory();
    if (list.length === 0) {
      els.historyList.innerHTML = `
        <div style="padding:24px 0; color:var(--mpds-ink-muted); font-size:0.875rem;">
          Nenhuma captura realizada ainda. Informe uma URL acima para gerar seu primeiro pacote offline.
        </div>
      `;
      return;
    }

    els.historyList.innerHTML = list
      .map(
        (item) => `
      <a href="#captura" class="mpds-list-row" data-recapture-url="${item.url.replace(/"/g, '&quot;')}">
        <div>
          <span class="mpds-mono-label" style="font-size:0.65rem;">${item.date} · MODO ${item.mode.toUpperCase()} · ${item.totalFiles} ARQUIVOS · ${formatBytes(item.sizeBytes)}</span>
          <h4 class="mpds-h4" style="margin-top:4px;">${item.hostname}</h4>
          <span class="mpds-mono" style="font-size:0.74rem; color:var(--mpds-ink-muted);">${item.url}</span>
        </div>
        <iconify-icon icon="solar:restart-linear" style="font-size:1.3rem;" title="Capturar novamente"></iconify-icon>
      </a>
    `
      )
      .join('');

    els.historyList.querySelectorAll('[data-recapture-url]').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const u = row.getAttribute('data-recapture-url');
        if (els.urlInput && u) {
          els.urlInput.value = u;
          els.urlInput.focus();
          if (window.MPDs) window.MPDs.toast(`URL carregada: ${u}`, 'solar:link-minimalistic-2-linear');
        }
      });
    });
  }

  function validateUrlInput() {
    const val = (els.urlInput?.value || '').trim();
    if (!val) {
      els.urlField?.classList.add('is-error');
      if (els.urlHelper) els.urlHelper.innerHTML = '<iconify-icon icon="solar:danger-circle-linear"></iconify-icon> Informe o endereço do site (ex.: https://exemplo.com)';
      return null;
    }
    const normalized = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes('.')) throw new Error('Domínio inválido');
      els.urlField?.classList.remove('is-error');
      els.urlField?.classList.add('is-success');
      if (els.urlHelper) els.urlHelper.innerHTML = `<iconify-icon icon="solar:check-circle-linear"></iconify-icon> Alvo validado: ${parsed.hostname}`;
      return parsed.href;
    } catch (_) {
      els.urlField?.classList.remove('is-success');
      els.urlField?.classList.add('is-error');
      if (els.urlHelper) els.urlHelper.innerHTML = '<iconify-icon icon="solar:danger-circle-linear"></iconify-icon> URL inválida. Use o formato https://dominio.com';
      return null;
    }
  }

  async function startCapture(e) {
    e.preventDefault();
    const targetUrl = validateUrlInput();
    if (!targetUrl) return;

    const engine = activeEngine || await checkServerHealth();
    if (!engine) {
      if (window.MPDs) {
        window.MPDs.toast('Verifique se api.php está na pasta no cPanel ou execute node server.js localmente.', 'solar:danger-triangle-linear');
      }
      els.serverAlert?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    setBusy(true);
    els.errorPanel.style.display = 'none';
    els.resultPanel.style.display = 'none';
    els.progressPanel.style.display = 'block';
    els.progressBar.style.width = '10%';
    els.progressPct.textContent = '10%';
    els.progressStep.textContent = 'Iniciando motor de captura...';
    els.progressLog.innerHTML = '';
    appendLog(`Solicitando captura (${selectedMode} · ${engine.toUpperCase()}) para ${targetUrl}`);

    const reqPayload = {
      url: targetUrl,
      mode: selectedMode,
      options: {
        includeImages: els.optImages ? els.optImages.checked : true,
        includeFonts: els.optFonts ? els.optFonts.checked : true,
        includeScripts: els.optScripts ? els.optScripts.checked : true,
        includeReadme: els.optReadme ? els.optReadme.checked : true
      }
    };

    if (engine === 'php') {
      let fakePct = 15;
      const ticker = setInterval(() => {
        if (fakePct < 86) {
          fakePct += Math.floor(Math.random() * 7) + 3;
          if (fakePct > 86) fakePct = 86;
          els.progressBar.style.width = `${fakePct}%`;
          els.progressPct.textContent = `${fakePct}%`;
          if (fakePct > 45) els.progressStep.textContent = 'Baixando CSS, fontes e imagens...';
          if (fakePct > 72) els.progressStep.textContent = 'Empacotando arquivo .ZIP...';
        }
      }, 550);
      try {
        const res = await fetch('./api.php?action=capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload)
        });
        const summary = await res.json();
        clearInterval(ticker);
        if (!res.ok || !summary.ok) throw new Error(summary.error || 'Falha ao capturar.');
        if (Array.isArray(summary.logs)) summary.logs.forEach((l) => appendLog(l));
        setBusy(false);
        els.progressBar.style.width = '100%';
        els.progressPct.textContent = '100%';
        els.progressStep.textContent = 'Pacote offline pronto para download!';
        els.resultTitle.textContent = summary.filename;
        els.resultMeta.textContent = `${summary.url} · Modo ${summary.mode} · Concluído em ${summary.elapsedSec}s`;
        els.resultStats.innerHTML = `
          <span class="mpds-badge">${summary.totalFiles} Arquivos</span>
          <span class="mpds-badge">${formatBytes(summary.sizeBytes)}</span>
          <span class="mpds-badge">${summary.stats.css} CSS</span>
          <span class="mpds-badge">${summary.stats.js} JS</span>
          <span class="mpds-badge">${summary.stats.images} Imagens</span>
          <span class="mpds-badge">${summary.stats.fonts} Fontes</span>
        `;
        els.downloadZipBtn.href = `./${summary.downloadUrl}`;
        els.downloadZipBtn.setAttribute('download', summary.filename);
        els.resultPanel.style.display = 'block';
        saveHistoryItem(summary);
        if (window.MPDs) window.MPDs.toast(`Pacote ${summary.hostname} pronto (${formatBytes(summary.sizeBytes)})!`, 'solar:file-download-linear');
      } catch (err) {
        clearInterval(ticker);
        setBusy(false);
        els.errorMessage.textContent = err.message || 'Falha ao processar captura.';
        els.errorPanel.style.display = 'flex';
      }
      return;
    }

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao iniciar captura.');

      const jobId = data.jobId;
      const es = new EventSource(`/api/capture/${jobId}/events`);
      activeEventSource = es;

      es.addEventListener('progress', (ev) => {
        const p = JSON.parse(ev.data);
        els.progressBar.style.width = `${p.pct || 0}%`;
        els.progressPct.textContent = `${p.pct || 0}%`;
        if (p.step) els.progressStep.textContent = p.step;
        if (p.log) appendLog(p.log);
      });

      es.addEventListener('done', (ev) => {
        const summary = JSON.parse(ev.data);
        es.close();
        activeEventSource = null;
        setBusy(false);

        els.progressBar.style.width = '100%';
        els.progressPct.textContent = '100%';
        els.progressStep.textContent = 'Pacote offline pronto para download!';
        appendLog(`Concluído em ${summary.elapsedSec}s — ${summary.totalFiles} arquivos (${formatBytes(summary.sizeBytes)})`);

        els.resultTitle.textContent = summary.filename;
        els.resultMeta.textContent = `${summary.url} · Modo ${summary.mode} · Concluído em ${summary.elapsedSec}s`;
        els.resultStats.innerHTML = `
          <span class="mpds-badge">${summary.totalFiles} Arquivos</span>
          <span class="mpds-badge">${formatBytes(summary.sizeBytes)}</span>
          <span class="mpds-badge">${summary.stats.css} CSS</span>
          <span class="mpds-badge">${summary.stats.js} JS</span>
          <span class="mpds-badge">${summary.stats.images} Imagens</span>
          <span class="mpds-badge">${summary.stats.fonts} Fontes</span>
        `;
        els.downloadZipBtn.href = `/api/capture/${jobId}/download`;
        els.downloadZipBtn.setAttribute('download', summary.filename);
        els.resultPanel.style.display = 'block';

        saveHistoryItem(summary);
        if (window.MPDs) {
          window.MPDs.toast(`Pacote ${summary.hostname} pronto (${formatBytes(summary.sizeBytes)})!`, 'solar:file-download-linear');
        }
      });

      es.addEventListener('failed', (ev) => {
        const err = JSON.parse(ev.data);
        es.close();
        activeEventSource = null;
        setBusy(false);
        els.errorMessage.textContent = err.error || 'Erro desconhecido ao capturar a URL.';
        els.errorPanel.style.display = 'flex';
        appendLog(`ERRO: ${err.error}`);
      });

      es.onerror = () => {
        if (activeEventSource) {
          es.close();
          activeEventSource = null;
          setBusy(false);
        }
      };
    } catch (err) {
      setBusy(false);
      els.errorMessage.textContent = err.message || 'Falha ao conectar com o servidor local.';
      els.errorPanel.style.display = 'flex';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    checkServerHealth();
    renderHistory();
    setMode('standard');

    document.querySelectorAll('[data-capture-mode]').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.getAttribute('data-capture-mode')));
    });

    document.querySelectorAll('[data-preset-url]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (els.urlInput) {
          els.urlInput.value = btn.getAttribute('data-preset-url');
          validateUrlInput();
        }
      });
    });

    if (els.form) els.form.addEventListener('submit', startCapture);
    if (els.urlInput) {
      els.urlInput.addEventListener('input', () => {
        els.urlField?.classList.remove('is-error', 'is-success');
      });
    }
    if (els.clearHistoryBtn) {
      els.clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        if (window.MPDs) window.MPDs.toast('Histórico de capturas limpo.', 'solar:trash-bin-minimalistic-linear');
      });
    }
  });
})();
