// Camada didática sobre a NEXORA. Missão 04 inclusa.
(function () {
  'use strict';

  const STATE = {
    open: false,
    tab: 'investigar',
    networkLog: [],
    challengeSolved: false,
  };

  // ── Fetch interceptor ────────────────────────────────────
  const originalFetch = window.fetch;
  try {
    window.fetch = async function (...args) {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input.url;
      const method = (init?.method ||
        (typeof input === 'object' && input.method) || 'GET').toUpperCase();
      const startedAt = performance.now();
      const entry = { method, url, status: null, duration: 0,
        requestBody: init?.body || null, error: null };
      try {
        const res = await originalFetch.apply(this, args);
        entry.status = res.status;
        entry.duration = performance.now() - startedAt;
        STATE.networkLog.push(entry);
        if (STATE.networkLog.length > 50) STATE.networkLog.shift();
        renderNetworkLog();
        return res;
      } catch (e) {
        entry.error = e.message;
        entry.duration = performance.now() - startedAt;
        STATE.networkLog.push(entry);
        renderNetworkLog();
        throw e;
      }
    };
  } catch (e) {
    console.warn('[missão 03] fetch interceptor falhou:', e);
  }

  // ── FAB + painel ─────────────────────────────────────────
  function createFAB() {
    if (document.getElementById('mission-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'mission-fab';
    btn.className = 'mission-fab';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir modo missão');
    btn.innerHTML = '<span aria-hidden="true">🎓</span><span class="fab-label">Modo missão</span>';
    btn.addEventListener('click', openPanel);
    document.body.appendChild(btn);
  }

  function createPanel() {
    if (document.getElementById('mission-panel')) return;
    const overlay = document.createElement('div');
    overlay.id = 'mission-overlay';
    overlay.className = 'mission-overlay';
    overlay.addEventListener('click', closePanel);

    const panel = document.createElement('aside');
    panel.id = 'mission-panel';
    panel.className = 'mission-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Modo missão');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="mission-panel-head">
        <div>
          <p class="mission-eyebrow">🎓 Missão 03 + 04</p>
          <h2>Investigar a NEXORA</h2>
        </div>
        <button class="mission-close" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="mission-tabs" role="tablist">
        <button role="tab" data-tab="investigar" aria-selected="true">03.1</button>
        <button role="tab" data-tab="diagnosticar" aria-selected="false">03.2</button>
        <button role="tab" data-tab="implementar" aria-selected="false">03.3</button>
        <button role="tab" data-tab="comprovar" aria-selected="false">03.4</button>
        <button role="tab" data-tab="criar" aria-selected="false">04 ★</button>
      </div>
      <div class="mission-tab-content" id="mission-content"></div>
      <div class="mission-footer">
        <a href="#catalogo" class="mission-link" id="mission-back">Voltar à loja</a>
        <span class="mission-hint">A loja continua funcionando.</span>
      </div>
    `;
    panel.querySelector('.mission-close').addEventListener('click', closePanel);
    panel.querySelectorAll('[role="tab"]').forEach(t => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
    });
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    document.getElementById('mission-back')?.addEventListener('click', closePanel);
  }

  function openPanel() {
    STATE.open = true;
    document.getElementById('mission-overlay')?.classList.add('show');
    const panel = document.getElementById('mission-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('show');
    }
    renderTab();
    setTimeout(() => {
      panel?.querySelector('[role="tab"][aria-selected="true"]')?.focus();
    }, 250);
  }

  function closePanel() {
    STATE.open = false;
    document.getElementById('mission-overlay')?.classList.remove('show');
    const panel = document.getElementById('mission-panel');
    if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('show');
    }
    document.getElementById('mission-fab')?.focus();
  }

  function switchTab(name) {
    STATE.tab = name;
    document.querySelectorAll('[role="tab"]').forEach(t => {
      t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false');
    });
    renderTab();
  }

  function renderTab() {
    const c = document.getElementById('mission-content');
    if (!c) return;
    ({
      investigar: renderInvestigar,
      diagnosticar: renderDiagnosticar,
      implementar: renderImplementar,
      comprovar: renderComprovar,
      criar: renderCriar,
    })[STATE.tab]?.(c);
  }

  // ═════ 03.1 ═══════════════════════════════════════════════
  function renderInvestigar(root) {
    root.innerHTML = `
      <p class="mission-lead">
        Cada requisição que a loja faz aparece aqui em tempo real. Use isso para
        <strong>investigar</strong>: URL, método, corpo enviado e resposta.
      </p>
      <div class="hint-box">
        <strong>Desafio:</strong> use os filtros da loja, observe quantas
        requisições aparecem. Depois copie uma como <code>cURL</code>.
      </div>
      <div class="mission-actions">
        <button type="button" data-action="fire">GET /api/shop/products</button>
        <button type="button" data-action="clear">Limpar log</button>
      </div>
      <h3 class="mission-h3">Log de rede (${STATE.networkLog.length})</h3>
      <div id="mission-network-log" class="mission-network-log"></div>
    `;
    root.querySelector('[data-action="fire"]')?.addEventListener('click', () => fetch('/api/shop/products'));
    root.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
      STATE.networkLog = [];
      renderInvestigar(root);
    });
    renderNetworkLog();
  }

  function renderNetworkLog() {
    const box = document.getElementById('mission-network-log');
    if (!box) return;
    if (!STATE.networkLog.length) {
      box.innerHTML = '<p class="mission-muted">Nenhuma requisição ainda.</p>';
      return;
    }
    box.innerHTML = STATE.networkLog.slice().reverse().map((e) => {
      const cls = e.error ? 'err' : e.status < 400 ? 'ok' : 'warn';
      const summary = e.error ? 'erro de rede' : `HTTP ${e.status} · ${Math.round(e.duration)}ms`;
      const curl = `curl -X ${e.method} "${location.origin}${e.url}"`
        + (e.requestBody ? ` -H "Content-Type: application/json" -d '${e.requestBody}'` : '');
      return `
        <details class="mission-req ${cls}">
          <summary>
            <span class="req-method">${esc(e.method)}</span>
            <span class="req-url">${esc(e.url)}</span>
            <span class="req-status">${summary}</span>
          </summary>
          <div class="req-body">
            ${e.requestBody ? `<p class="mission-small"><strong>Enviado:</strong></p><pre>${esc(e.requestBody)}</pre>` : ''}
            <p class="mission-small"><strong>cURL equivalente:</strong></p>
            <pre>${esc(curl)}</pre>
          </div>
        </details>`;
    }).join('');
  }

  // ═════ 03.2 · predict-observe ═════════════════════════════
  const DIAG = {
    sort: {
      label: 'GET /api/shop/products?sort=banana',
      url: '/api/shop/products?sort=banana',
      correct: 400,
      explain: 'A ordenação é validada no servidor. Valor inválido retorna 400 — o servidor respondeu, não é falha de rede.',
    },
    '404': {
      label: 'GET /api/shop/products/9999',
      url: '/api/shop/products/9999',
      correct: 404,
      explain: 'Produto não existe → 404. O `fetch` NÃO lança erro. Você precisa checar `res.ok`.',
    },
  };

  function renderDiagnosticar(root) {
    root.innerHTML = `
      <p class="mission-lead">
        <strong>Preveja antes de executar.</strong> Escolha o status HTTP que você
        espera, depois execute para ver o real.
      </p>
      ${Object.entries(DIAG).map(([key, cfg]) => `
        <div class="predict" data-key="${key}">
          <p class="predict-q"><code>${esc(cfg.label)}</code> — qual status?</p>
          <div class="predict-options">
            <button type="button" data-v="200">200</button>
            <button type="button" data-v="400">400</button>
            <button type="button" data-v="404">404</button>
            <button type="button" data-v="500">500</button>
          </div>
          <div class="predict-fb" aria-live="polite"></div>
        </div>
      `).join('')}
    `;

    root.querySelectorAll('.predict').forEach(el => {
      const cfg = DIAG[el.dataset.key];
      let predicted = null, executed = false;

      el.querySelectorAll('[data-v]').forEach(btn => {
        btn.addEventListener('click', () => {
          predicted = Number(btn.dataset.v);
          execute();
        });
      });

      async function execute() {
        if (executed) return;
        executed = true;
        el.querySelectorAll('[data-v]').forEach(b => b.disabled = true);
        try {
          const res = await fetch(cfg.url);
          el.querySelectorAll('[data-v]').forEach(b => {
            const v = Number(b.dataset.v);
            if (v === cfg.correct) b.classList.add('correct');
            else if (v === predicted) b.classList.add('wrong');
          });
          const gotIt = predicted === cfg.correct;
          const fb = el.querySelector('.predict-fb');
          fb.className = 'predict-fb ' + (gotIt ? 'ok' : 'warn');
          fb.innerHTML = `<p><strong>${gotIt ? '✓ Acertou' : '✗ Errou'}</strong>
            — status real: <strong>HTTP ${res.status}</strong></p>
            <p>${esc(cfg.explain)}</p>`;
        } catch (e) {
          el.querySelector('.predict-fb').innerHTML =
            `<p class="mission-error">Erro: ${esc(e.message)}</p>`;
        }
      }
    });
  }

  // ═════ 03.3 · editor de código ════════════════════════════
  const STARTER = `async function validarCarrinho(items) {
  // items = [{ id, quantity }, ...]
  // TODO: POST para "/api/shop/cart/validate" com { items }
  // TODO: se a resposta NÃO for ok, lançar Error com a mensagem do servidor
  // TODO: se for ok, retornar o body (total, items, message)

  const res = await fetch("/api/shop/cart/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  // ... complete abaixo
  const data = await res.json();
  return data;
}`;

  function renderImplementar(root) {
    root.innerHTML = `
      <p class="mission-lead">
        <strong>Implemente a função.</strong> Ela precisa fazer a chamada POST,
        tratar erros e devolver o resultado. Testes confirmam.
      </p>
      <div class="hint-box">
        <strong>Contrato:</strong><br>
        <code>validarCarrinho([{id:101, quantity:2}])</code> → objeto com <code>total</code> correto.<br>
        <code>validarCarrinho([{id:9999, quantity:1}])</code> → <strong>lança</strong> <code>Error</code>.
      </div>
      <label for="challenge-code" class="mission-small"><strong>Código</strong></label>
      <textarea id="challenge-code" class="code-editor" spellcheck="false"
        aria-label="Editor de código">${esc(STARTER)}</textarea>
      <div class="mission-actions">
        <button type="button" id="challenge-run" class="mission-button primary">Executar testes →</button>
        <button type="button" id="challenge-reset">Resetar</button>
      </div>
      <div id="challenge-results" role="status" aria-live="polite">
        <p class="mission-muted">Aguardando execução.</p>
      </div>
    `;
    const ta = root.querySelector('#challenge-code');
    root.querySelector('#challenge-reset').addEventListener('click', () => {
      ta.value = STARTER;
      root.querySelector('#challenge-results').innerHTML =
        '<p class="mission-muted">Código resetado.</p>';
    });
    root.querySelector('#challenge-run').addEventListener('click', async () => {
      const out = root.querySelector('#challenge-results');
      out.innerHTML = '<p class="mission-muted">Executando...</p>';
      const results = await runChallenge(ta.value);
      renderChallengeResults(out, results);
    });
  }

  async function runChallenge(code) {
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
    let fn = null, compileErr = null;
    const origLog = console.log;
    console.log = () => {};
    try {
      const src = code + '\nreturn typeof validarCarrinho === "function" ? validarCarrinho : null;';
      fn = await new AsyncFn(src)();
    } catch (e) { compileErr = e; }
    finally { console.log = origLog; }

    if (compileErr) {
      return [{ name: 'código compila', passed: false, detail: compileErr.message }];
    }
    if (typeof fn !== 'function') {
      return [{ name: 'função validarCarrinho existe', passed: false,
                detail: 'não encontrei function validarCarrinho' }];
    }

    const tests = [
      {
        name: '2× teclado (101) → R$ 499,80',
        async run() {
          const r = await fn([{ id: 101, quantity: 2 }]);
          if (!r || typeof r.total !== 'number') throw new Error('retorno sem total');
          if (Math.abs(r.total - 499.80) > 0.01)
            throw new Error(`total veio ${r.total}`);
        },
      },
      {
        name: 'teclado + mouse (101+102) → R$ 409,80',
        async run() {
          const r = await fn([{ id: 101, quantity: 1 }, { id: 102, quantity: 1 }]);
          if (!r || typeof r.total !== 'number') throw new Error('retorno sem total');
          if (Math.abs(r.total - 409.80) > 0.01)
            throw new Error(`total veio ${r.total}`);
        },
      },
      {
        name: 'id 9999 → lança erro com mensagem',
        async run() {
          try { await fn([{ id: 9999, quantity: 1 }]); }
          catch (e) {
            if (!e.message || !/existe|not.?found|9999/i.test(e.message))
              throw new Error(`mensagem fraca: "${e.message}"`);
            return;
          }
          throw new Error('não lançou erro');
        },
      },
      {
        name: '999 monitores → lança erro de estoque',
        async run() {
          try { await fn([{ id: 104, quantity: 999 }]); }
          catch (e) {
            if (!e.message || !/estoque|stock|insuficiente/i.test(e.message))
              throw new Error(`mensagem fraca: "${e.message}"`);
            return;
          }
          throw new Error('não lançou erro');
        },
      },
    ];

    const results = [];
    for (const t of tests) {
      try { await t.run(); results.push({ name: t.name, passed: true }); }
      catch (e) { results.push({ name: t.name, passed: false, detail: e.message }); }
    }
    return results;
  }

  function renderChallengeResults(out, results) {
    const okCount = results.filter(r => r.passed).length;
    const allOk = okCount === results.length;
    out.innerHTML = `
      <div class="test-results">
        ${results.map(r => `
          <div class="test-row ${r.passed ? 'pass' : 'fail'}">
            <span class="icon">${r.passed ? '✓' : '✗'}</span>
            <div>
              <div>${esc(r.name)}</div>
              ${r.detail ? `<div class="detail">${esc(r.detail)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ${allOk
        ? '<div class="success-banner"><strong>✓ Desafio cumprido!</strong></div>'
        : `<p class="mission-warn">${okCount}/${results.length} passaram. Ajuste e tente de novo.</p>`}
    `;
    if (allOk && !STATE.challengeSolved) {
      STATE.challengeSolved = true;
      const tab = document.querySelector('[data-tab="comprovar"]');
      if (tab) tab.style.color = '#065f46';
    }
  }

  // ═════ 03.4 · ataques ═════════════════════════════════════
  const ATK = {
    price: { label: 'Preço R$ 0,01 por unidade', body: { items: [{ id: 101, quantity: 2, price: 0.01 }] }, correct: 200,
      explanation: 'Servidor aceitou (200) mas ignorou o preço. Recalculou com o preço oficial: R$ 499,80.' },
    stock: { label: '999 monitores (estoque 5)', body: { items: [{ id: 104, quantity: 999 }] }, correct: 409,
      explanation: '409 Conflict. Estoque insuficiente. O servidor informa a quantidade disponível.' },
    unknown: { label: 'Produto 9999', body: { items: [{ id: 9999, quantity: 1 }] }, correct: 404,
      explanation: '404 Not Found. Recurso não existe no catálogo.' },
  };

  function renderComprovar(root) {
    root.innerHTML = `
      <p class="mission-lead">
        <strong>Auditoria:</strong> preveja o status antes de cada ataque.
      </p>
      ${Object.entries(ATK).map(([key, cfg]) => `
        <div class="predict" data-atk="${key}">
          <p class="predict-q">
            <strong>${esc(cfg.label)}</strong><br>
            <small class="mission-small">Payload:</small>
            <code style="font-size:11px;word-break:break-all">${esc(JSON.stringify(cfg.body))}</code>
          </p>
          <div class="predict-options">
            <button type="button" data-v="200">200</button>
            <button type="button" data-v="400">400</button>
            <button type="button" data-v="404">404</button>
            <button type="button" data-v="409">409</button>
          </div>
          <div class="predict-fb" aria-live="polite"></div>
        </div>
      `).join('')}
    `;

    root.querySelectorAll('.predict').forEach(el => {
      const cfg = ATK[el.dataset.atk];
      let predicted = null, executed = false;
      el.querySelectorAll('[data-v]').forEach(btn => {
        btn.addEventListener('click', () => {
          predicted = Number(btn.dataset.v);
          execute();
        });
      });
      async function execute() {
        if (executed) return;
        executed = true;
        el.querySelectorAll('[data-v]').forEach(b => b.disabled = true);
        try {
          const res = await fetch('/api/shop/cart/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg.body),
          });
          const body = await res.json();
          el.querySelectorAll('[data-v]').forEach(b => {
            const v = Number(b.dataset.v);
            if (v === cfg.correct) b.classList.add('correct');
            else if (v === predicted) b.classList.add('wrong');
          });
          const gotIt = predicted === cfg.correct;
          const fb = el.querySelector('.predict-fb');
          fb.className = 'predict-fb ' + (gotIt ? 'ok' : 'warn');
          let extra = '';
          if (el.dataset.atk === 'price' && res.ok) {
            extra = `<p>Servidor calculou: <strong>R$ ${Number(body.total).toFixed(2)}</strong></p>`;
          }
          fb.innerHTML = `<p><strong>${gotIt ? '✓ Acertou' : '✗ Errou'}</strong>
            — status real: <strong>HTTP ${res.status}</strong></p>
            <p>${esc(cfg.explanation)}</p>${extra}`;
        } catch (e) {
          el.querySelector('.predict-fb').innerHTML =
            `<p class="mission-error">Erro: ${esc(e.message)}</p>`;
        }
      }
    });
  }

  // ═════ 04 · criar página ══════════════════════════════════
  const STEPS = [
    {
      n: 1,
      title: 'Entenda o ponto de partida',
      where: 'Navegador + aba 03.1',
      goal: 'A loja em /ecommerce lista produtos. Cada um tem id, name, price, stock.',
      acceptance: 'Você abriu "Ver JSON" num card e viu o id 101.',
      hint: 'Clique em Ver JSON. O id aparece no topo.',
    },
    {
      n: 2,
      title: 'Crie o template templates/produto.html',
      where: 'Novo arquivo templates/produto.html',
      goal: 'Renderiza imagem, nome, categoria, descrição, preço e estoque.',
      acceptance: 'O arquivo existe e contém um <h1> ou <h2> com o nome do produto.',
      hint: 'Pode ser SSR (Jinja2, {% extends "base.html" %}) ou SPA (JS com fetch). Recomendamos SSR.',
    },
    {
      n: 3,
      title: 'Crie a rota GET /produto/<int:product_id>',
      where: 'integration.py — dentro de register_ecommerce_routes',
      goal: 'Busca o produto pelo id. Se existe, renderiza. Se não existe, 404 ou página de erro.',
      acceptance: '/produto/101 → 200. /produto/9999 → 404 ou mensagem.',
      hint: 'Use @app.get("/produto/<int:product_id>"). Reaproveite _find_product.',
    },
    {
      n: 4,
      title: 'Ligue o card da loja à página',
      where: 'static/ecommerce/ecommerce.js',
      goal: 'Clique num card → vai para /produto/<id>.',
      acceptance: 'Clicar no Teclado Orion leva a /produto/101.',
      hint: 'Adicione um link (<a href>) ou um clique com window.location.href.',
    },
    {
      n: 5,
      title: 'Teste manualmente',
      where: 'Navegador',
      goal: 'Abrir /produto/101 e /produto/9999 diretamente.',
      acceptance: '101 mostra dados. 9999 mostra mensagem amigável (não traceback).',
      hint: 'Se 9999 der erro 500 (traceback), você esqueceu de tratar "não existe".',
    },
    {
      n: 6,
      title: 'Valide automaticamente',
      where: 'Este painel, botão abaixo',
      goal: 'Os 6 checks precisam ficar verdes.',
      acceptance: 'Todos os checks passam.',
      hint: 'Se um falhar, leia o detalhe — geralmente aponta o problema exato.',
    },
  ];

  function renderCriar(root) {
    root.innerHTML = `
      <p class="mission-lead">
        <strong>Missão 04 — Criar a página de detalhes do produto.</strong>
        Você vai modificar o próprio código da aplicação. Sem solução pronta:
        os passos abaixo dizem <em>o que</em> fazer e <em>onde</em>, mas não
        <em>como</em>. O botão "Validar" roda 6 testes no servidor.
      </p>
      <div class="hint-box">
        <strong>Critério de sucesso:</strong> um cliente da loja clica num
        produto e vê uma página dedicada com imagem, descrição, preço e
        estoque. Produtos que não existem mostram mensagem amigável (não
        traceback). A validação é <strong>feita pelo servidor</strong>, não
        pelo navegador.
      </div>
      <div class="steps-list">
        ${STEPS.map(s => `
          <div class="step" data-n="${s.n}">
            <div class="step-head">
              <span class="step-number">${s.n}</span>
              <div class="step-title">
                <strong>${esc(s.title)}</strong>
                <p class="step-meta">${esc(s.where)}</p>
              </div>
            </div>
            <p class="step-goal">${esc(s.goal)}</p>
            <p class="step-accept"><strong>Critério:</strong> ${esc(s.acceptance)}</p>
            <details class="step-hint">
              <summary>Ver pista</summary>
              <p>${esc(s.hint)}</p>
            </details>
          </div>
        `).join('')}
      </div>
      <div class="mission-actions">
        <button type="button" id="mission-04-validate" class="mission-button primary">
          Validar missão →
        </button>
      </div>
      <div id="mission-04-results" role="status" aria-live="polite">
        <p class="mission-muted">Aguardando validação.</p>
      </div>
    `;
    root.querySelector('#mission-04-validate').addEventListener('click', () => validarMissao04(root));
  }

  async function validarMissao04(root) {
    const out = root.querySelector('#mission-04-results');
    const btn = root.querySelector('#mission-04-validate');
    btn.disabled = true;
    out.innerHTML = '<p class="mission-muted">Rodando 6 testes no servidor...</p>';

    try {
      const res = await fetch('/api/mission/validate-4', { method: 'POST' });
      const body = await res.json();

      out.innerHTML = `
        <div class="test-results">
          ${body.checks.map(c => `
            <div class="test-row ${c.passed ? 'pass' : 'fail'}">
              <span class="icon">${c.passed ? '✓' : '✗'}</span>
              <div>
                <div>${esc(c.name)}</div>
                ${c.detail ? `<div class="detail">${esc(c.detail)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${body.complete
          ? `<div class="success-banner">
               <strong>✓ Missão 04 concluída!</strong>
               ${body.passed}/${body.total} checks. Você criou uma página nova
               com rota, template e link — o mesmo padrão de qualquer aplicação real.
             </div>`
          : `<p class="mission-warn">
               ${body.passed}/${body.total} checks passaram.
               Ajuste o que falhou e clique em Validar de novo.
             </p>`}
      `;
    } catch (e) {
      out.innerHTML = `<p class="mission-error">Erro: ${esc(e.message)}</p>`;
    } finally {
      btn.disabled = false;
    }
  }

  // ── Util ─────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Boot ─────────────────────────────────────────────────
  function init() {
    createFAB();
    createPanel();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && STATE.open) closePanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
