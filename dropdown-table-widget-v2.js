// Dropdown Table Widget (SAP Analytics Cloud custom widget) — v2.14.0
//
// Tabela de planejamento: contas em linhas, dimensões escolhidas por dropdown (validação de
// dados), medidas editáveis e lista de gravação pronta para Table.getPlanning().setUserInput().
// Regras de negócio e configuração: ver README.md. Histórico completo: git log.
//
// Ambiente: navegador do SAC (Optimized Story Experience). Sem dependências externas.

(function() {

// Tag do custom element: padrao "dropdowntable-widget"; sobrescrito por ?tag=... na URL do script
// (o JSON DEV usa ?tag=dropdowntable-widget-dev). Deve bater com "tag" no JSON do widget.
var DT_TAG = "dropdowntable-widget";
try {
  var dtScript = document.currentScript;
  var dtTagMatch = dtScript && dtScript.src ? dtScript.src.match(/[?&]tag=([a-z0-9-]+)/i) : null;
  if (dtTagMatch) { DT_TAG = dtTagMatch[1].toLowerCase(); }
} catch(e) {}

var TMPL = document.createElement("template");
TMPL.innerHTML = `
<style>
  /* ── Tokens SAP Horizon (Fiori) ─────────────────────────────────
     As variáveis sem prefixo --sap- são as cores editáveis no painel de estilo. */
  :host {
    --sap-font: '72', '72full', Arial, Helvetica, sans-serif;
    --sap-text: #1d2d3e;
    --sap-label: #556b82;
    --sap-brand: #0070f2;
    --sap-brand-hover: #0064d9;
    --sap-border: #e5e5e5;
    --sap-header-border: #a8b2bd;
    --sap-field-border: #556b81;
    --sap-shell-bg: #f5f6f7;
    --sap-readonly-bg: #f5f6f7;
    --sap-warning: #e76500;
    --sap-warning-bg: #fff8d6;
    --sap-error: #aa0808;
    --sap-error-bg: #ffeaf4;
    --sap-info-bg: #ebf8ff;
    --sap-popover-shadow: 0 0 0.125rem 0 rgba(34,53,72,0.16), 0 0.5rem 1rem 0 rgba(34,53,72,0.16);
    --dt-row-height: 32px;
    display: block;
    font-family: var(--sap-font);
    font-size: 14px;
    color: var(--sap-text);
    position: relative;
    box-sizing: border-box;
    background: #ffffff;
  }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }

  /* ── Cabeçalho de colunas (sap.m.Table) ───────────────────────── */
  thead th {
    color: var(--header-text-color, var(--sap-text));
    background: var(--header-color, #ffffff);
    padding: 0 8px;
    height: var(--dt-row-height);
    text-align: left;
    font-weight: 700;
    font-size: 14px;
    border-bottom: 1px solid var(--sap-header-border);
    border-right: 1px solid var(--sap-border);
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  thead th:last-child { border-right: none; }

  /* ── Linhas ───────────────────────────────────────────────────── */
  tbody td {
    padding: 0;
    color: var(--table-text-color, var(--sap-text));
    border-bottom: 1px solid var(--sap-border);
    border-right: 1px solid var(--sap-border);
    height: var(--dt-row-height);
    vertical-align: middle;
    background: #ffffff;
  }
  tbody td:last-child { border-right: none; }
  tbody tr:hover td { background: var(--hover-row-color, #eaecee); }
  tbody tr.dt-parent-row td { font-weight: 700; }

  /* Grupo (ex: ASSESSORIAS) e subgrupo */
  .dt-group-cell, .dt-subgroup-cell {
    padding: 0 8px;
    height: var(--dt-row-height);
    font-size: 14px;
    white-space: nowrap;
  }
  .dt-group-header td, .dt-group-header:hover td {
    background: var(--group-header-bg, var(--sap-shell-bg)) !important;
    color: var(--group-header-color, var(--sap-text)) !important;
    font-weight: 700;
  }
  .dt-subheader td, .dt-subheader:hover td {
    background: var(--subheader-bg, #ffffff) !important;
    color: var(--subheader-color, var(--sap-text)) !important;
    font-weight: 700;
    padding-left: 24px;
  }

  .cell-plain {
    padding: 0 8px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: var(--dt-row-height);
  }

  /* ── Célula dropdown = Select do Fiori ───────────────────────── */
  .cell-dropdown {
    position: relative;
    display: flex;
    align-items: center;
    height: calc(var(--dt-row-height) - 6px);
    margin: 0 4px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    box-sizing: border-box;
    outline: none;
  }
  .cell-dropdown:hover { box-shadow: inset 0 0 0 1px var(--sap-brand-hover); background: #ffffff; }
  .cell-dropdown:focus, .cell-dropdown.active { box-shadow: inset 0 0 0 2px var(--sap-brand); background: #ffffff; }
  .cell-value {
    flex: 1;
    padding: 0 28px 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--table-text-color, var(--sap-text));
  }
  .cell-value.empty { color: var(--sap-label); font-style: italic; }
  .cell-arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    pointer-events: none;
    color: var(--sap-label);
  }
  .cell-arrow svg { width: 12px; height: 12px; display: block; }

  /* ── Célula de medida = Input do Fiori (números à direita) ───── */
  .dt-measure-input {
    width: 100%;
    height: var(--dt-row-height);
    border: none;
    background: transparent;
    text-align: right;
    padding: 0 8px;
    font-family: inherit;
    font-size: 14px;
    color: var(--table-text-color, var(--sap-text));
    box-sizing: border-box;
    outline: none;
    cursor: text;
  }
  .dt-measure-input:hover { box-shadow: inset 0 -1px 0 0 var(--sap-field-border); }
  .dt-measure-input:focus {
    background: var(--editable-cell-color, #ffffff);
    box-shadow: inset 0 0 0 2px var(--sap-brand);
    border-radius: 4px;
  }
  input.dt-locked, input.dt-locked:hover {
    background: var(--sap-readonly-bg) !important;
    color: var(--sap-label) !important;
    box-shadow: none !important;
    cursor: not-allowed !important;
  }

  /* Seleção de células, alterada, falha */
  .dt-measure-cell-selected {
    background: var(--selected-row-color, var(--sap-info-bg)) !important;
    box-shadow: inset 0 0 0 1px var(--sap-brand);
  }
  .changed-cell, .changed-cell input, .changed-cell .cell-dropdown, .changed-cell .cell-plain {
    background: var(--sap-warning-bg) !important;
  }
  .changed-cell { box-shadow: inset 3px 0 0 var(--sap-warning); }
  tbody tr.dt-row-failed td { background: var(--sap-error-bg) !important; }
  tbody tr.dt-row-failed td:first-child { box-shadow: inset 3px 0 0 var(--sap-error); }
  .dt-multi-combo { color: var(--sap-warning); font-weight: 700; margin-left: 6px; cursor: help; }
  /* Linha do subgrupo de netos: recuo sob o título do subgrupo */
  .dt-subgroup-inner { display: flex; align-items: center; padding-left: 16px; }
  .dt-subgroup-inner .cell-dropdown { flex: 1; min-width: 0; }
  .dt-subgroup-warn { margin: 0 8px 0 4px; }

  /* ── Lista do dropdown = Popover Horizon ─────────────────────── */
  .dt-dropdown-list {
    position: absolute;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: var(--sap-popover-shadow);
    z-index: 99999;
    min-width: 160px;
    max-height: 264px;
    overflow-y: auto;
    padding: 4px 0;
  }
  .dt-dropdown-list.hidden { display: none; }
  .dt-dropdown-item {
    height: 32px;
    line-height: 32px;
    padding: 0 16px;
    font-size: 14px;
    cursor: pointer;
    color: var(--sap-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dt-dropdown-item:hover { background: #eaecee; }
  .dt-dropdown-item.selected {
    background: var(--dropdown-highlight-color, var(--sap-info-bg));
    color: var(--sap-brand-hover);
    font-weight: 700;
  }
  .dt-dropdown-empty, .dt-dropdown-empty:hover { color: var(--sap-label); font-style: italic; cursor: default; background: transparent; }

  /* ── Carregando = BusyIndicator do Fiori ─────────────────────── */
  .dt-loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.72);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    gap: 10px;
  }
  .dt-loading-overlay.hidden { display: none; }
  .dt-busy { display: flex; gap: 6px; }
  .dt-busy span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--sap-brand);
    animation: dt-busy 1.2s infinite ease-in-out;
  }
  .dt-busy span:nth-child(2) { animation-delay: 0.2s; }
  .dt-busy span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dt-busy {
    0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  .dt-loading-text { font-size: 14px; color: var(--sap-label); }

  /* ── Toolbar da tabela: título à esquerda, Salvar à direita ──── */
  .dt-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 8px 0 12px;
    border-bottom: 1px solid var(--sap-border);
    flex-shrink: 0;
  }
  .dt-toolbar.hidden { display: none; }
  .dt-title {
    flex: 1;
    font-size: 16px;
    font-weight: 700;
    color: var(--sap-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dt-title.hidden { visibility: hidden; }
  .dt-save-btn {
    background: var(--save-btn-bg, var(--sap-brand));
    color: var(--save-btn-color, #ffffff);
    border: 1px solid var(--save-btn-bg, var(--sap-brand));
    border-radius: 8px;
    height: 32px;
    padding: 0 14px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .dt-save-btn:hover { background: var(--save-btn-hover-bg, var(--sap-brand-hover)); border-color: var(--save-btn-hover-bg, var(--sap-brand-hover)); }
  .dt-save-btn:active { filter: brightness(0.9); }
  .dt-save-btn:focus-visible { outline: 2px solid var(--sap-brand); outline-offset: 2px; }
  .dt-save-btn.hidden { display: none; }

  .dt-empty { padding: 16px; color: var(--sap-label); text-align: center; font-size: 14px; }
  .dt-empty.hidden { display: none; }

  /* ── Avisos = MessageStrip ───────────────────────────────────── */
  .dt-notice { margin: 8px 12px 4px 12px; padding: 8px 12px; border-radius: 8px; font-size: 14px; flex-shrink: 0; border: 1px solid; }
  .dt-notice.hidden { display: none; }
  .dt-notice.warn  { background: var(--sap-warning-bg); color: var(--sap-text); border-color: var(--sap-warning); }
  .dt-notice.error { background: var(--sap-error-bg); color: var(--sap-text); border-color: var(--sap-error); }
  .dt-notice.info  { background: var(--sap-info-bg); color: var(--sap-text); border-color: var(--sap-brand); }

  .dt-outer { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; box-sizing: border-box; }
  .dt-wrapper { width: 100%; flex: 1; overflow: auto; box-sizing: border-box; position: relative; outline: none; }

  /* ── Menu de contexto = Menu Fiori (claro) ───────────────────── */
  .dt-ctx-menu {
    position: absolute;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: var(--sap-popover-shadow);
    z-index: 999999;
    min-width: 200px;
    padding: 4px 0;
    font-size: 14px;
  }
  .dt-ctx-menu.hidden { display: none; }
  .dt-ctx-item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 32px;
    padding: 0 16px;
    color: var(--sap-text);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
  }
  .dt-ctx-item:hover { background: #eaecee; }
  .dt-ctx-item svg { flex-shrink: 0; color: var(--sap-label); }
  .dt-ctx-separator { height: 1px; background: var(--sap-border); margin: 4px 0; }

  /* ── Diálogo "Adicionar membro" = Dialog Horizon ─────────────── */
  .dt-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 9999998;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dt-modal-backdrop.hidden { display: none; }
  .dt-modal {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 0 0.125rem 0 rgba(34,53,72,0.2), 0 1rem 2rem 0 rgba(34,53,72,0.2);
    width: 440px;
    max-width: 95vw;
    font-family: var(--sap-font);
    color: var(--sap-text);
    overflow: hidden;
  }
  .dt-modal-header {
    background: #ffffff;
    color: var(--sap-text);
    height: 48px;
    padding: 0 16px;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--sap-border);
  }
  .dt-modal-header svg { color: var(--sap-brand); }
  .dt-modal-body { padding: 16px; }
  .dt-modal-info {
    background: var(--sap-info-bg);
    border: 1px solid var(--sap-brand);
    padding: 8px 12px;
    font-size: 14px;
    color: var(--sap-text);
    border-radius: 8px;
    margin-bottom: 16px;
  }
  .dt-modal-field { margin-bottom: 12px; }
  .dt-modal-field label {
    display: block;
    font-size: 14px;
    color: var(--sap-label);
    margin-bottom: 4px;
  }
  .dt-required { color: var(--sap-error); }
  .dt-modal-field input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: none;
    border-radius: 4px;
    background: #ffffff;
    box-shadow: inset 0 0 0 1px #bcc3ca, inset 0 -1px 0 0 var(--sap-field-border);
    font-family: inherit;
    font-size: 14px;
    color: var(--sap-text);
    box-sizing: border-box;
    outline: none;
  }
  .dt-modal-field input:hover { box-shadow: inset 0 0 0 1px var(--sap-brand-hover); }
  .dt-modal-field input:focus { box-shadow: inset 0 0 0 2px var(--sap-brand); }
  .dt-modal-field input.error { background: var(--sap-error-bg); box-shadow: inset 0 0 0 1px var(--sap-error), inset 0 -2px 0 0 var(--sap-error); }
  .dt-modal-hint { font-size: 12px; color: var(--sap-label); margin-top: 4px; }
  .dt-modal-error { font-size: 12px; color: var(--sap-error); margin-top: 4px; display: none; }
  .dt-modal-error.visible { display: block; }
  .dt-modal-footer {
    padding: 8px 16px;
    border-top: 1px solid var(--sap-border);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .dt-btn {
    height: 32px;
    padding: 0 14px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    outline: none;
  }
  .dt-btn:focus-visible { outline: 2px solid var(--sap-brand); outline-offset: 2px; }
  .dt-btn-cancel { background: transparent; color: var(--sap-brand-hover); }
  .dt-btn-cancel:hover { background: #eaecee; }
  .dt-btn-confirm { background: var(--sap-brand); border-color: var(--sap-brand); color: #ffffff; }
  .dt-btn-confirm:hover { background: var(--sap-brand-hover); border-color: var(--sap-brand-hover); }
  .dt-btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
  /* Botão negativo (Reject) e faixas de aviso do diálogo de exclusão */
  .dt-btn-reject { background: var(--sap-error); border-color: var(--sap-error); color: #ffffff; }
  .dt-btn-reject:hover { background: #8a0606; border-color: #8a0606; }
  .dt-btn-reject.hidden { display: none; }
  .dt-modal-header-negative svg { color: var(--sap-error); }
  .dt-confirm-member { font-size: 14px; margin-bottom: 12px; }
  .dt-confirm-member b { font-weight: 700; }
  .dt-modal-strip { padding: 8px 12px; font-size: 14px; border-radius: 8px; border: 1px solid; }
  .dt-modal-strip.warn  { background: var(--sap-warning-bg); border-color: var(--sap-warning); }
  .dt-modal-strip.error { background: var(--sap-error-bg); border-color: var(--sap-error); }
  #dt-input-id, #dt-input-desc, #dt-input-parent { text-transform: uppercase; }
</style>
<div class="dt-outer" id="dt-outer">
  <div class="dt-toolbar" id="dt-toolbar">
    <div class="dt-title hidden" id="dt-title"></div>
    <button class="dt-save-btn" id="dt-save-btn">Salvar</button>
  </div>
  <div class="dt-notice hidden" id="dt-notice"></div>
  <div class="dt-wrapper" id="dt-wrapper">
  <table id="dt-table">
    <thead><tr id="dt-header"></tr></thead>
    <tbody id="dt-body"></tbody>
  </table>
  <div class="dt-empty hidden" id="dt-empty">Nenhum dado disponível</div>
  <div class="dt-loading-overlay hidden" id="dt-loading-overlay">
    <div class="dt-busy"><span></span><span></span><span></span></div>
    <div class="dt-loading-text">Carregando...</div>
  </div>
  <div class="dt-dropdown-list hidden" id="dt-dropdown"></div>

  <!-- Context Menu — dentro do wrapper para position:absolute funcionar corretamente -->
  <div class="dt-ctx-menu hidden" id="dt-ctx-menu">
    <div class="dt-ctx-item" id="ctx-add-member">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Adicionar membro
    </div>
    <div class="dt-ctx-separator"></div>
    <div class="dt-ctx-item" id="ctx-filter-member">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Filtrar membro
    </div>
    <div class="dt-ctx-item" id="ctx-filter">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Filtrar
    </div>
    <div class="dt-ctx-separator"></div>
    <div class="dt-ctx-item" id="ctx-exclude-member">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 8h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Excluir membro
    </div>
    <div class="dt-ctx-item" id="ctx-exclude">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 8h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Excluir
    </div>
  </div>
</div>
</div><!-- /dt-outer -->

<!-- Confirmação de exclusão de membro -->
<div class="dt-modal-backdrop hidden" id="dt-confirm-backdrop">
  <div class="dt-modal" role="alertdialog" aria-labelledby="dt-confirm-title">
    <div class="dt-modal-header dt-modal-header-negative" id="dt-confirm-title">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      Excluir membro
    </div>
    <div class="dt-modal-body">
      <div class="dt-confirm-member" id="dt-confirm-member"></div>
      <div class="dt-modal-strip" id="dt-confirm-strip"></div>
    </div>
    <div class="dt-modal-footer">
      <button class="dt-btn dt-btn-cancel" id="dt-confirm-cancel">Cancelar</button>
      <button class="dt-btn dt-btn-reject" id="dt-confirm-ok">Excluir</button>
    </div>
  </div>
</div>

<!-- Add Member Modal -->
<div class="dt-modal-backdrop hidden" id="dt-modal-backdrop">
  <div class="dt-modal" id="dt-modal">
    <div class="dt-modal-header">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      Adicionar membro
    </div>
    <div class="dt-modal-body">
      <div class="dt-modal-info">
        O novo membro será criado permanentemente na dimensão do modelo de planejamento.
      </div>
      <div class="dt-modal-field">
        <label for="dt-input-id">ID do membro <span class="dt-required">*</span></label>
        <input id="dt-input-id" type="text" placeholder="Ex: CONTA_001" autocomplete="off" />
        <div class="dt-modal-error" id="dt-error-id">ID do membro é obrigatório.</div>
      </div>
      <div class="dt-modal-field">
        <label for="dt-input-desc">Descrição <span class="dt-required">*</span></label>
        <input id="dt-input-desc" type="text" placeholder="Ex: Nova conta de despesa" autocomplete="off" />
        <div class="dt-modal-error" id="dt-error-desc">Descrição é obrigatória.</div>
      </div>
      <div class="dt-modal-field">
        <label for="dt-input-parent">Grupo (pai na hierarquia)</label>
        <input id="dt-input-parent" type="text" list="dt-parent-list" placeholder="Escolha um grupo ou digite um ID" autocomplete="off" />
        <datalist id="dt-parent-list"></datalist>
        <div class="dt-modal-hint" id="dt-parent-hint">Escolha um grupo existente ou digite o ID de um pai novo. Vazio = raiz.</div>
      </div>
    </div>
    <div class="dt-modal-footer">
      <button class="dt-btn dt-btn-cancel" id="dt-modal-cancel">Cancelar</button>
      <button class="dt-btn dt-btn-confirm" id="dt-modal-confirm">Criar</button>
    </div>
  </div>
</div>
`;

// styleConfig → variável CSS do template
var CSS_VARS_IF_SET = {
  headerColor: "--header-color", headerTextColor: "--header-text-color", hoverRowColor: "--hover-row-color",
  tableTextColor: "--table-text-color", editableCellColor: "--editable-cell-color"
};
var CSS_VARS_ALWAYS = {
  groupHeaderBg: "--group-header-bg", groupHeaderColor: "--group-header-color",
  subheaderBg: "--subheader-bg", subheaderColor: "--subheader-color",
  saveBtnBg: "--save-btn-bg", saveBtnColor: "--save-btn-color", saveBtnHoverBg: "--save-btn-hover-bg"
};

class DropdownTableWidget extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(TMPL.content.cloneNode(true));

    // ── Dados do binding ──
    this._metadata = null;
    this._data = null;
    this._dimLabels = [];          // rótulos das colunas de dimensão (derivados do binding)
    this._mesLabels = [];          // rótulos das colunas de medida (derivados do binding)
    this._bindingNodeIds = {};     // {feedKey: {id: true}} nós de hierarquia vistos no binding
    this._bindingLeaves = {};      // {feedKey: {id: label}} membros gravados vistos no binding
    this._childrenFromBinding = {};// {feedKey: {parentId: [{value, label}]}} (childrenBinding)
    this._autoRowValuesMap = null; // {conta: "conta|dim1|..."} (valuesBinding)
    this._autoRowValuesMapStr = undefined;
    this._rowValueLabels = {};
    this._valuesLeaves = {};
    this._dsMembers = {};          // {feedKey: [{value, label}]} getMembers() da DataSource
    this._dsMembersRequested = false;
    this._accountIndexCache = null;
    this._defaultMemberCache = {};
    this._memberLabelIndex = {};
    this._fallbackOptionsCache = {};
    this._multiComboAccounts = {};
    this._dataFingerprint = undefined;

    // ── Configuração por script (modo legado) ──
    this._dropdownDimensions = [];
    this._dropdownOptions = {};
    this._rowValuesMap = {};
    this._measureLabels = [];

    // ── Configuração pelo painel (modo sem script) ──
    this._explicitDropdownDims = [];
    this._debugMode = false;
    this._emptyDefaultLabel = "NÃO APLICAVEL"; // membro inicial quando a célula não tem valor
    this._writeHierarchies = {};               // {DIM: "HIERARQUIA"} da tabela do setUserInput
    this._noValueMembers = { RESPONSABILIDADE: ["CLIENTE"] }; // membros que gravam 0 em todas as medidas
    this._deleteValue = "0";                   // "apagar": setUserInput recusa vazio
    this._availableDimensions = "[]";

    // ── Estado de edição ──
    this._localSelections = {};    // {conta: {feedKey: {id, label}}} seleções pendentes
    this._savedSelections = {};    // seleções já salvas, até o modelo atualizar
    this._selectionRowIndex = {};  // {conta: rowIndex} da última seleção
    this._localMeasures = {};      // {rowIndex: {measureKey: número}}
    this._localData = {};          // {endereço___medida: {value}} valor exibido no input
    this._originalData = {};
    this._pendingChanges = [];
    this._writes = [];             // lista montada por getWriteCount()
    this._writeSkipped = [];
    this._failedRows = {};
    this._saveWindowBindings = 0;  // bindings protegidos após o save (não contam como troca de contexto)
    this._saveWindowUntil = 0;
    this._saveInFlightUntil = 0;   // evita onSaveRequested duplicado (duplo clique)
    this._subgroupSelection = {};  // {subgrupo: conta escolhida} (só visualização)

    // ── Valores expostos ao script (getters / propriedades) ──
    this._selectedCellData = {};
    this._previousCellData = {};
    this._lastAddMemberRequest = {};
    this._newMemberId = "";
    this._newMemberDescription = "";
    this._newMemberParentId = "";
    this._newMemberDimensionId = "";
    this._deleteMemberId = "";
    this._deleteMemberDimensionId = "";
    this._lastMemberAction = null;
    this._oldRowAddrStr = "";
    this._newRowAddrStr = "";
    this._changedValue = "";
    this._measureChangeValue = "";
    this._measureChangeMeasureId = "";
    this._measureChangeRowIndex = "";
    this._measureChangeAddrStr = "";

    // ── Interface ──
    this._activeCell = null;
    this._ctxTarget = null;        // {rowIndex, dimensionId, dimensionRealId, memberId, memberLabel}
    this._pendingDelete = null;
    this._selectedCells = [];      // [{rowIndex, measureKey, tdEl}]
    this._selAnchor = null;
    this._isDragging = false;
    this._noticeTimer = null;
    this._uiBound = false;

    // ── Estilo (padrão SAP Horizon compacto; o painel sobrescreve) ──
    this._rowHeight         = 32;
    this._colWidth          = "auto";
    this._fontFamily        = "'72', '72full', Arial, Helvetica, sans-serif";
    this._fontSize          = "14px";
    this._fontWeight        = "normal";
    this._fontStyle         = "normal";
    this._textDecoration    = "none";
    this._tableTitle        = "";
    this._titleColor        = "#1d2d3e";
    this._titleSize         = "16px";
    this._headerAlign       = "left";
    this._cellAlign         = "left";
    this._titleAlign        = "left";
    this._showSaveButton    = true;

    this._onDocClick    = this._closeDropdown.bind(this);
    this._onDocCtxClose = this._closeCtxMenu.bind(this);
    this._onDocMouseUp  = function() { this._isDragging = false; }.bind(this);
  }

  connectedCallback() {
    document.addEventListener("click", this._onDocClick);
    document.addEventListener("click", this._onDocCtxClose);
    document.addEventListener("mouseup", this._onDocMouseUp);
    this._applyDynamicStyles();
    // O SAC pode desconectar e reconectar o elemento: os listeners do shadow DOM são ligados
    // uma única vez (antes eram duplicados, disparando eventos — ex: onSaveRequested — em dobro)
    if (this._uiBound) { return; }
    this._uiBound = true;
    this._bindContextMenu();
    this._bindModal();
    this._bindDeleteConfirm();
    this._bindSelectionKeys();
    this._bindSaveButton();
    this._bindDragSelection();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onDocClick);
    document.removeEventListener("click", this._onDocCtxClose);
    document.removeEventListener("mouseup", this._onDocMouseUp);
    if (this._noticeTimer) { clearTimeout(this._noticeTimer); this._noticeTimer = null; }
  }

  // ─── Loading Overlay ─────────────────────────────────────────
  _showLoading() {
    var el = this.shadowRoot.getElementById("dt-loading-overlay");
    if (el) { el.classList.remove("hidden"); }
  }
  _hideLoading() {
    var el = this.shadowRoot.getElementById("dt-loading-overlay");
    if (el) { el.classList.add("hidden"); }
  }

  // ─── SAC Lifecycle ────────────────────────────────────────────
  onCustomWidgetReady() { this._loadBinding(); }
  onCustomWidgetAfterUpdate(changedProperties) {
    if (changedProperties && "myDataBinding" in changedProperties) {
      var dataBinding = changedProperties.myDataBinding;
      if (dataBinding && dataBinding.state !== "success") { this._showLoading(); return; }
      if (dataBinding) { this._processDataBinding(dataBinding); return; }
    }
    if (changedProperties && ("childrenBinding" in changedProperties || "valuesBinding" in changedProperties)) {
      this._processChildrenBinding();
      this._processValuesBinding();
      this._render();
      return;
    }
    // Filtro externo via propriedades dimensionFilterId/dimensionFilterMembers
    if (changedProperties && ("dimensionFilterId" in changedProperties || "dimensionFilterMembers" in changedProperties)) {
      this._applyExternalFilter();
      return;
    }
    this._loadBinding();
  }
  onCustomWidgetResize(w, h) { this.style.width = w + "px"; this.style.height = h + "px"; }
  onCustomWidgetDestroy() { this.disconnectedCallback(); }

  // ─── Binding ──────────────────────────────────────────────────
  _loadBinding() {
    try {
      var b = this.myDataBinding;
      if (!b || !b.metadata || !b.data) { this._showLoading(); return; }
      if (b.state && b.state !== "success") { this._showLoading(); return; }
      this._processDataBinding(b);
    } catch(e) { console.error("DropdownTable _loadBinding:", e); }
  }

  _processDataBinding(dataBinding) {
    try {
      if (!dataBinding || !dataBinding.metadata || !dataBinding.data) { return; }
      var data = dataBinding.data;
      var meta = dataBinding.metadata;

      // Troca de contexto (ex: outro cliente): o conteúdo do binding mudou fora da janela pós-save
      var fingerprint = this._fingerprint(data);
      var inSaveWindow = this._saveWindowBindings > 0 && Date.now() < this._saveWindowUntil;
      if (this._saveWindowBindings > 0) { this._saveWindowBindings--; }
      if (this._dataFingerprint !== undefined && this._dataFingerprint !== fingerprint && !inSaveWindow) {
        this._resetLocalState(true);
      }
      this._dataFingerprint = fingerprint;

      this._metadata = meta;
      this._data = data;
      this._accountIndexCache = null;
      this._dimLabels = this._buildDimLabels(meta, data);
      this._mesLabels = this._buildMeasureLabels(meta);
      this._indexBindingMembers(data);

      this._debugLog("myDataBinding", {
        dimensions: meta.dimensions, feeds: meta.feeds, mainStructureMembers: meta.mainStructureMembers,
        rows: data.length, firstRows: data.slice(0, 3)
      });

      this._processChildrenBinding();
      this._processValuesBinding();
      this._publishAvailableDimensions();
      this._render();
      this._hideLoading();
      this._loadDataSourceMembers();
    } catch(e) { console.error("DropdownTable _processDataBinding:", e); }
  }

  // Hash (53 bits) de todas as dimensões e medidas: detecta troca de contexto sem guardar
  // uma string do tamanho do binding (dezenas de milhares de linhas)
  _fingerprint(data) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    var mix = function(str) {
      for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
    };
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      for (var k in row) {
        var c = row[k] || {};
        if (k.indexOf("dimensions_") === 0) { mix((c.id || "") + ";"); }
        else if (k.indexOf("measures_") === 0) { mix((c.raw !== undefined ? String(c.raw) : (c.formattedValue || "")) + ";"); }
      }
      mix("|");
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return data.length + ":" + (4294967296 * (2097151 & h2) + (h1 >>> 0));
  }

  // Descarta o estado de edição. notify: avisa e dispara onPendingChangesDiscarded se havia pendências
  _resetLocalState(notify) {
    var discarded = this._pendingChanges.length;
    if (notify && discarded > 0) {
      this._showNotice(discarded + (discarded === 1 ? " alteração não salva foi descartada" : " alterações não salvas foram descartadas") + " na troca de contexto.", "warn");
      this._emitEvent("onPendingChangesDiscarded", { count: discarded });
    }
    this._failedRows = {};
    this._localSelections = {};
    this._localMeasures = {};
    this._pendingChanges = [];
    this._localData = {};
    this._originalData = {};
    this._selectionRowIndex = {};
    this._savedSelections = {};
    this._debugLog("Troca de contexto detectada — estado local limpo");
  }

  // Rótulo de cada coluna de dimensão: nome da dimensão no ID do membro ("[PERIODICIDADE]..."),
  // senão descrição do feed
  _buildDimLabels(meta, data) {
    var labels = [];
    var values = meta.feeds && meta.feeds.dimensions ? meta.feeds.dimensions.values : [];
    var first = data[0] || {};
    for (var i = 0; i < values.length; i++) {
      var cell = first["dimensions_" + i];
      var label = "";
      var fromId = function(s) { var m = s ? String(s).match(/^\[([^\]]+)\]/) : null; return m ? m[1].replace(/_/g, " ") : ""; };
      if (cell) { label = fromId(cell.parentId) || fromId(cell.id) || (cell.isCollapsed && cell.label) || ""; }
      if (!label) {
        var dv = values[i];
        label = typeof dv === "object" && dv ? (dv.description || dv.label || dv.id) : "";
      }
      labels.push(label || ("Dim " + i));
    }
    return labels;
  }

  _measureEntries(meta) {
    var msm = meta.mainStructureMembers || (meta.feeds && meta.feeds.measures) || null;
    if (!msm) { return []; }
    if (Array.isArray(msm)) { return msm; }
    if (msm.values) { return msm.values; }
    var list = [];
    for (var k in msm) { if (msm[k] !== undefined) { list.push(msm[k]); } }
    return list;
  }

  _buildMeasureLabels(meta) {
    var entries = this._measureEntries(meta);
    var labels = [];
    for (var i = 0; i < entries.length; i++) {
      var mv = entries[i];
      labels.push(typeof mv === "object" && mv ? (mv.label || mv.description || mv.id || ("Med " + i)) : ("Med " + i));
    }
    return labels;
  }

  // Nós de hierarquia (isNode/isCollapsed ou pai de outra célula) — nunca são opção nem endereço.
  // As demais células (membros gravados, ex: "Anual", "RH") viram opção de último recurso.
  _indexBindingMembers(data) {
    var nodes = {};
    var seen = {};
    for (var r = 0; r < data.length; r++) {
      for (var k in data[r]) {
        var c = data[r][k];
        if (k.indexOf("dimensions_") !== 0 || k === "dimensions_0" || !c || !c.id) { continue; }
        if (!nodes[k]) { nodes[k] = {}; seen[k] = {}; }
        if (c.isNode === true || c.isCollapsed === true) { nodes[k][c.id] = true; }
        if (c.parentId) { nodes[k][c.parentId] = true; }
        seen[k][c.id] = c.label || this._cleanMemberId(c.id);
      }
    }
    var leaves = {};
    for (var fk in seen) {
      leaves[fk] = {};
      for (var id in seen[fk]) {
        if (!nodes[fk][id] && this._cleanMemberId(id) !== "#") { leaves[fk][id] = seen[fk][id]; }
      }
    }
    this._bindingNodeIds = nodes;
    this._bindingLeaves = leaves;
  }

  // childrenBinding (Builder): filhos de cada nó por dimensão — opções do dropdown
  _processChildrenBinding() {
    try {
      var cb = this.childrenBinding;
      this._childrenFromBinding = {};
      if (!cb || !cb.data || !this._metadata) { return; }
      var count = this._metadata.feeds.dimensions.values.length;
      for (var di = 0; di < count; di++) {
        var dk = "dimensions_" + di;
        var byParent = {};
        var seen = {};
        for (var r = 0; r < cb.data.length; r++) {
          var cell = cb.data[r][dk];
          if (!cell || !cell.id || !cell.parentId || seen[cell.parentId + "\u0000" + cell.id]) { continue; }
          seen[cell.parentId + "\u0000" + cell.id] = true;
          if (!byParent[cell.parentId]) { byParent[cell.parentId] = []; }
          byParent[cell.parentId].push({ value: cell.id, label: cell.label || cell.id });
        }
        this._childrenFromBinding[dk] = byParent;
      }
    } catch(e) { console.error("DropdownTable _processChildrenBinding:", e); }
  }

  // ─── Dropdowns sem script ─────────────────────────────────────
  // Diagnóstico: ativado pelo painel ("Modo diagnóstico") → logs no console do navegador
  _debugLog() {
    if (!this._debugMode) { return; }
    try {
      var args = ["[DropdownTable]"];
      for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }
      console.log.apply(console, args);
    } catch(e) {}
  }

  // Linha com algum valor nas medidas. Sem valor, as folhas que o SAC manda (com "Incluir
  // níveis-pai") não são valor gravado — são só combinações sem dado.
  _rowHasData(rowData) {
    for (var k in rowData) {
      if (k.indexOf("measures_") !== 0 || !rowData[k]) { continue; }
      var raw = rowData[k].raw;
      if (raw !== null && raw !== undefined && raw !== "" && !isNaN(parseFloat(raw))) { return true; }
    }
    return false;
  }

  _cleanMemberId(id) {
    var m = id ? String(id).match(/\.&\[([^\]]+)\]$/) : null;
    return m ? m[1] : (id || "");
  }

  // ID real (modelo) da dimensão de um feed: "dimensions_1" → "PERIODICIDADE"
  _dimRealId(feedKey) {
    var md = this._metadata && this._metadata.dimensions ? this._metadata.dimensions[feedKey] : null;
    return md && md.id ? md.id : feedKey;
  }

  // valuesBinding (Builder, sem código) substitui a "tabela espelho" do setRowValues:
  // linhas = conta + dimensões de dropdown no nível folha. Monta _autoRowValuesMap no mesmo
  // formato do setRowValues ("conta|dim1|dim2|..." na ordem dos feeds do binding principal).
  _processValuesBinding() {
    try {
      var vb = this.valuesBinding;
      if (!vb || !vb.data || !this._metadata || !this._metadata.feeds) {
        this._autoRowValuesMap = null;
        this._rowValueLabels = {};
        this._valuesLeaves = {};
        return;
      }
      var mainCount = this._metadata.feeds.dimensions.values.length;

      // Casa as dimensões dos dois bindings pelo ID real; sem metadata, usa a posição
      var vbKeyById = {};
      if (vb.metadata && vb.metadata.dimensions) {
        for (var vk in vb.metadata.dimensions) {
          var vmd = vb.metadata.dimensions[vk];
          if (vmd && vmd.id) { vbKeyById[vmd.id] = vk; }
        }
      }
      var vbKeys = [];
      for (var mi = 0; mi < mainCount; mi++) {
        var mainKey = "dimensions_" + mi;
        vbKeys.push(vbKeyById[this._dimRealId(mainKey)] || mainKey);
      }

      // Por conta, fica a linha com maior soma absoluta das medidas (a combinação gravada)
      var best = {};
      for (var r = 0; r < vb.data.length; r++) {
        var row = vb.data[r];
        var acc = (row[vbKeys[0]] || {}).id;
        if (!acc) { continue; }
        var val = 0;
        for (var rk in row) {
          if (rk.indexOf("measures_") === 0 && row[rk]) {
            var n = parseFloat(row[rk].raw);
            if (!isNaN(n)) { val = val + Math.abs(n); }
          }
        }
        if (!best[acc] || val > best[acc].val) { best[acc] = { row: row, val: val }; }
      }

      var map = {};
      var labels = {};
      var leaves = {};
      for (var a in best) {
        var parts = [a];
        for (var di = 1; di < mainCount; di++) {
          var cell = best[a].row[vbKeys[di]] || {};
          var cid = cell.id || "";
          if (this._cleanMemberId(cid) === "#") { cid = ""; } // não atribuído
          parts.push(cid);
          if (cid) {
            labels[cid] = cell.label || this._cleanMemberId(cid);
          }
        }
        map[a] = parts.join("|");
        map[this._cleanMemberId(a)] = map[a]; // tolera hierarquias diferentes na conta
      }
      // Membros que aparecem no valuesBinding também servem de opção (último recurso)
      for (var lr = 0; lr < vb.data.length; lr++) {
        for (var ld = 1; ld < mainCount; ld++) {
          var lcell = vb.data[lr][vbKeys[ld]] || {};
          if (!lcell.id || this._cleanMemberId(lcell.id) === "#") { continue; }
          var lkey = "dimensions_" + ld;
          if (!leaves[lkey]) { leaves[lkey] = {}; }
          leaves[lkey][lcell.id] = lcell.label || this._cleanMemberId(lcell.id);
        }
      }

      var mapStr = JSON.stringify(map);
      if (this._autoRowValuesMapStr !== undefined && mapStr !== this._autoRowValuesMapStr) {
        this._savedSelections = {}; // o modelo mudou de fato → ele passa a ser a referência
      }
      this._autoRowValuesMapStr = mapStr;
      this._autoRowValuesMap = map;
      this._rowValueLabels   = labels;
      this._valuesLeaves     = leaves;
      this._debugLog("valuesBinding", { rows: vb.data.length, vbKeys: vbKeys, sample: vb.data.slice(0, 3), autoRowValuesMap: map });
    } catch(e) { console.error("DropdownTable _processValuesBinding:", e); }
  }

  // "conta|dim1|dim2|..." — setRowValues (script) tem prioridade sobre o valuesBinding
  _getRowValuesString(accountId) {
    if (!accountId) { return ""; }
    if (this._rowValuesMap && this._rowValuesMap[accountId]) { return this._rowValuesMap[accountId]; }
    var auto = this._autoRowValuesMap;
    if (auto) { return auto[accountId] || auto[this._cleanMemberId(accountId)] || ""; }
    return "";
  }

  // Valor gravado de uma dimensão na linha → {id, label} ou null
  _getRowValue(rowData, dimIndex) {
    var str = this._getRowValuesString((rowData["dimensions_0"] || {}).id);
    if (!str) { return null; }
    var id = str.split("|")[dimIndex];
    if (!id) { return null; }
    return { id: id, label: (this._rowValueLabels && this._rowValueLabels[id]) || this._cleanMemberId(id) };
  }

  // A story ainda configura os dropdowns por script (setDropdownDimensions/setRowValues/setDropdownOptions)?
  _hasScriptDropdownConfig() {
    if (this._dropdownDimensions && this._dropdownDimensions.length > 0) { return true; }
    var k;
    for (k in (this._rowValuesMap || {})) { return true; }
    for (k in (this._dropdownOptions || {})) {
      if (this._dropdownOptions[k] && this._dropdownOptions[k].length > 0) { return true; }
    }
    return false;
  }

  // Modo explícito (sem script): dimensões marcadas no painel ou, sem nada marcado e sem
  // configuração por script, todas as dimensões depois da conta.
  // Modo legado: stories que ainda chamam as funções por script continuam como antes.
  _isExplicitDropdownMode() {
    if (this._explicitDropdownDims && this._explicitDropdownDims.length > 0) { return true; }
    return !this._hasScriptDropdownConfig();
  }

  _isDropdownDimension(feedKey, feedDimId) {
    if (feedKey === "dimensions_0") { return false; }
    if (this._explicitDropdownDims && this._explicitDropdownDims.length > 0) {
      var realId = this._dimRealId(feedKey);
      return this._explicitDropdownDims.indexOf(realId) !== -1 || this._explicitDropdownDims.indexOf(feedKey) !== -1;
    }
    if (this._isExplicitDropdownMode()) { return true; }
    return this._dropdownDimensions.length === 0
      || this._dropdownDimensions.indexOf(feedKey) !== -1
      || (feedDimId !== undefined && this._dropdownDimensions.indexOf(feedDimId) !== -1);
  }

  _isNodeId(feedKey, id, childrenByParent) {
    if (!id) { return false; }
    if (this._bindingNodeIds && this._bindingNodeIds[feedKey] && this._bindingNodeIds[feedKey][id]) { return true; }
    var cfb = this._childrenFromBinding && this._childrenFromBinding[feedKey];
    if (cfb && cfb[id] && cfb[id].length > 0) { return true; }
    var cbp = childrenByParent && childrenByParent[feedKey];
    return !!(cbp && cbp[id] && cbp[id].length > 0);
  }

  // Opções do dropdown. Prioridade: setDropdownOptions → filhos no childrenBinding →
  // getMembers() da DataSource (lista completa) → filhos no binding principal → membros vistos nos bindings
  _resolveDropdownOptions(feedKey, ids, childrenByParent) {
    if (this._dropdownOptions && this._dropdownOptions[feedKey] && this._dropdownOptions[feedKey].length > 0) {
      return this._dropdownOptions[feedKey];
    }
    var i;
    var cfb = this._childrenFromBinding && this._childrenFromBinding[feedKey];
    for (i = 0; i < ids.length; i++) {
      if (ids[i] && cfb && cfb[ids[i]] && cfb[ids[i]].length > 0) { return cfb[ids[i]]; }
    }
    if (this._dsMembers && this._dsMembers[feedKey] && this._dsMembers[feedKey].length > 0) {
      return this._dsMembers[feedKey];
    }
    var cbp = childrenByParent && childrenByParent[feedKey];
    for (i = 0; i < ids.length; i++) {
      if (ids[i] && cbp && cbp[ids[i]] && cbp[ids[i]].length > 0) { return cbp[ids[i]]; }
    }
    // Último recurso: membros gravados vistos no valuesBinding e no binding principal (sem nós).
    // Não depende da linha: calculado uma vez por render.
    var cacheKey = feedKey + (childrenByParent ? "|cbp" : "");
    if (this._fallbackOptionsCache[cacheKey]) { return this._fallbackOptionsCache[cacheKey]; }
    var opts = [];
    var seen = {};
    var sources = [this._valuesLeaves && this._valuesLeaves[feedKey], this._bindingLeaves && this._bindingLeaves[feedKey]];
    for (var s = 0; s < sources.length; s++) {
      if (!sources[s]) { continue; }
      for (var vid in sources[s]) {
        if (seen[vid] || this._isNodeId(feedKey, vid, childrenByParent)) { continue; }
        seen[vid] = true;
        opts.push({ value: vid, label: sources[s][vid] });
      }
    }
    opts.sort(function(a, b) { return String(a.label).localeCompare(String(b.label), "pt-BR"); });
    this._fallbackOptionsCache[cacheKey] = opts;
    return opts;
  }

  // "NÃO APLICÁVEL" / "Nao Aplicavel" / "NAO_APLICAVEL" → "NAOAPLICAVEL"
  _normalizeLabel(s) {
    var t = String(s || "").toUpperCase();
    try { t = t.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch(e) {}
    return t.replace(/[^A-Z0-9]/g, "");
  }

  // Membro padrão (styleConfig.emptyDefaultLabel) entre as opções da dimensão, comparando
  // descrição e ID sem acento/caixa/espaços. null se não configurado ou não encontrado.
  _getDefaultMember(feedKey, ids, childrenByParent) {
    var target = this._normalizeLabel(this._emptyDefaultLabel);
    if (!target) { return null; }
    // Cache por render (chamado por linha × dimensão); _render() o reinicia
    var cacheKey = feedKey + "|" + target + "|" + (ids || []).join("|") + (childrenByParent ? "|cbp" : "");
    if (cacheKey in this._defaultMemberCache) { return this._defaultMemberCache[cacheKey]; }
    var found = null;
    var opts = this._resolveDropdownOptions(feedKey, ids || [], childrenByParent);
    for (var i = 0; i < opts.length; i++) {
      if (this._normalizeLabel(opts[i].label) === target || this._normalizeLabel(this._cleanMemberId(opts[i].value)) === target) {
        found = opts[i];
        break;
      }
    }
    this._defaultMemberCache[cacheKey] = found;
    return found;
  }

  // Lista de dimensões do binding para o painel montar os checkboxes (sem script)
  _publishAvailableDimensions() {
    try {
      if (!this._metadata || !this._metadata.feeds) { return; }
      var count = this._metadata.feeds.dimensions.values.length;
      var labels = this._dimLabels;
      var list = [];
      for (var i = 0; i < count; i++) {
        var key = "dimensions_" + i;
        list.push({ key: key, id: this._dimRealId(key), label: labels[i] || this._dimRealId(key) });
      }
      var str = JSON.stringify(list);
      if (str === this._availableDimensions) { return; }
      this._availableDimensions = str;
      this._emitProperties({ availableDimensions: str });
    } catch(e) { console.error("DropdownTable _publishAvailableDimensions:", e); }
  }

  // getMembers() da DataSource (API de custom widget). Não traz parentId, então exclui os nós
  // conhecidos pelos bindings. Assíncrono: re-renderiza quando chega. Falha silenciosa (fallbacks).
  _loadDataSourceMembers() {
    var self = this;
    if (this._dsMembersRequested) { return; }
    if (!this._isExplicitDropdownMode() && !this._debugMode) { return; }
    var dbs = this.dataBindings;
    if (!dbs || typeof dbs.getDataBinding !== "function") {
      this._debugLog("getMembers: this.dataBindings indisponível neste tenant/story");
      return;
    }
    this._dsMembersRequested = true;
    var targets = [];
    var count = this._metadata ? this._metadata.feeds.dimensions.values.length : 0;
    for (var i = 1; i < count; i++) {
      var key = "dimensions_" + i;
      if (this._isDropdownDimension(key)) { targets.push({ key: key, id: this._dimRealId(key) }); }
    }
    Promise.resolve()
      .then(function() { return dbs.getDataBinding("myDataBinding"); })
      .then(function(db) { return db && typeof db.getDataSource === "function" ? db.getDataSource() : null; })
      .then(function(ds) {
        if (!ds || typeof ds.getMembers !== "function") {
          self._debugLog("getMembers: DataSource indisponível", ds);
          return;
        }
        return Promise.all(targets.map(function(t) {
          return Promise.resolve(ds.getMembers(t.id, { limit: 2000 })).then(function(list) {
            var opts = [];
            for (var m = 0; m < (list || []).length; m++) {
              var mem = list[m];
              if (!mem || !mem.id) { continue; }
              var clean = self._cleanMemberId(mem.id);
              if (clean === "#" || clean.toUpperCase() === "ROOT" || self._isNodeId(t.key, mem.id, null)) { continue; }
              opts.push({ value: mem.id, label: mem.description || mem.displayId || clean });
            }
            if (!self._dsMembers) { self._dsMembers = {}; }
            self._dsMembers[t.key] = opts;
            self._debugLog("getMembers(" + t.id + "): " + (list || []).length + " membros, " + opts.length + " após filtro", (list || []).slice(0, 5));
          }).catch(function(e) { self._debugLog("getMembers(" + t.id + ") falhou", e); });
        }));
      })
      .then(function() { self._render(); })
      .catch(function(e) { self._debugLog("getMembers: erro", e); });
  }

  // ─── Properties ───────────────────────────────────────────────
  get dropdownOptions() { return JSON.stringify(this._dropdownOptions || {}); }
  set styleConfig(v) { this.applyStyleConfig(v); }

  applyStyleConfig(v) {
    try {
      var cfg = typeof v === "string" ? JSON.parse(v) : v;
      // Cores do painel viram variáveis CSS. Grupo 1: vazio mantém a atual; grupo 2: vazio volta ao padrão.
      var name;
      for (name in CSS_VARS_IF_SET) { if (cfg[name]) { this.style.setProperty(CSS_VARS_IF_SET[name], cfg[name]); } }
      for (name in CSS_VARS_ALWAYS) { if (cfg[name] !== undefined) { this.style.setProperty(CSS_VARS_ALWAYS[name], cfg[name]); } }
      if (cfg.rowHeight)         { this._rowHeight = parseInt(cfg.rowHeight, 10) || 32; }
      if (cfg.colWidth)          { this._colWidth = cfg.colWidth; }
      if (cfg.fontFamily)        { this._fontFamily = cfg.fontFamily; }
      if (cfg.fontSize)          { this._fontSize = cfg.fontSize; }
      if (cfg.fontWeight)        { this._fontWeight = cfg.fontWeight; }
      if (cfg.fontStyle)         { this._fontStyle = cfg.fontStyle; }
      if (cfg.textDecoration)    { this._textDecoration = cfg.textDecoration; }
      if (cfg.tableTitle  !== undefined) { this._tableTitle  = cfg.tableTitle; }
      if (cfg.titleColor  !== undefined) { this._titleColor  = cfg.titleColor; }
      if (cfg.titleSize   !== undefined) { this._titleSize   = cfg.titleSize; }
      if (cfg.headerAlign !== undefined) { this._headerAlign = cfg.headerAlign; }
      if (cfg.titleAlign  !== undefined) { this._titleAlign  = cfg.titleAlign; }
      if (cfg.cellAlign   !== undefined) { this._cellAlign   = cfg.cellAlign; }
      if (cfg.dropdownDimensions !== undefined) {
        this._explicitDropdownDims = Array.isArray(cfg.dropdownDimensions) ? cfg.dropdownDimensions : [];
        this._dsMembersRequested = false; // dimensões mudaram → recarrega membros
      }
      if (cfg.debugMode !== undefined) { this._debugMode = !!cfg.debugMode; }
      if (cfg.emptyDefaultLabel !== undefined) { this._emptyDefaultLabel = String(cfg.emptyDefaultLabel || ""); }
      if (cfg.writeHierarchies !== undefined) { this._writeHierarchies = this._parseRuleLines(cfg.writeHierarchies, false); }
      if (cfg.noValueMembers   !== undefined) {
        var nvm = this._parseRuleLines(cfg.noValueMembers, true);
        var nvmAny = false;
        for (var nvk in nvm) { nvmAny = true; break; }
        // Campo vazio no painel = regra padrão (responsabilidade do cliente grava 0)
        this._noValueMembers = nvmAny ? nvm : { RESPONSABILIDADE: ["CLIENTE"] };
      }
      if (cfg.deleteValue      !== undefined) { this._deleteValue      = String(cfg.deleteValue); }
      if (cfg.saveBtnLabel     !== undefined) {
        var btnEl = this.shadowRoot.getElementById("dt-save-btn");
        if (btnEl) { btnEl.textContent = cfg.saveBtnLabel || "Salvar"; }
      }
      this._applyDynamicStyles();
      this._render();
    } catch(e) { console.error("applyStyleConfig error:", e); }
  }

  set dropdownOptions(v) { this.setDropdownOptions(v); }

  get availableDimensions() { return this._availableDimensions || "[]"; }
  // Publicado pelo widget para o painel; o valor persistido evita re-publicar sem mudança
  set availableDimensions(v) { if (typeof v === "string" && v !== "") { this._availableDimensions = v; } }

  get dropdownDimensions() { return JSON.stringify(this._dropdownDimensions); }
  set dropdownDimensions(v) {
    try { this._dropdownDimensions = JSON.parse(v); } catch(e) { this._dropdownDimensions = []; }
    this._render();
  }
  get selectedCellData() { return JSON.stringify(this._selectedCellData); }
  set selectedCellData(v) { try { this._selectedCellData = JSON.parse(v); } catch(e) {} }

  get lastAddMemberRequest() { return JSON.stringify(this._lastAddMemberRequest || {}); }
  set lastAddMemberRequest(v) { try { this._lastAddMemberRequest = JSON.parse(v); } catch(e) {} }

  get newMemberId()          { return this._newMemberId          || ""; }
  set newMemberId(v)          { this._newMemberId          = v || ""; }
  get newMemberDescription() { return this._newMemberDescription || ""; }
  set newMemberDescription(v) { this._newMemberDescription = v || ""; }
  get newMemberParentId()    { return this._newMemberParentId    || ""; }
  set newMemberParentId(v)    { this._newMemberParentId    = v || ""; }

  get dimensionFilterId()          { return this._dimensionFilterId || ""; }
  set dimensionFilterId(v)          { this._dimensionFilterId = v || ""; this._applyExternalFilter(); }
  get dimensionFilterMembers()     { return this._dimensionFilterMembers || ""; }
  set dimensionFilterMembers(v)    { this._dimensionFilterMembers = v || ""; this._applyExternalFilter(); }

  _applyExternalFilter() {
    try {
      var dimId   = this._dimensionFilterId;
      var members = this._dimensionFilterMembers;
      if (!dimId) { return; }

      // Tenta via myDataBinding (SAC injeta métodos dinamicamente após filtro ser adicionado no binding)
      var binding = this.myDataBinding;
      if (!binding) { return; }

      if (members === "" || members === undefined) {
        if (typeof binding.removeDimensionFilter === "function") {
          binding.removeDimensionFilter(dimId);
        }
      } else {
        var ids = typeof members === "string" ? members.split(",").map(function(s){return s.trim();}) : [members];
        if (typeof binding.setDimensionFilter === "function") {
          binding.setDimensionFilter(dimId, ids);
        }
      }
    } catch(e) { console.error("_applyExternalFilter error:", e); }
  }

  get measureChangeValue()     { return this._measureChangeValue     || ""; }
  set measureChangeValue(v)     { this._measureChangeValue     = v || ""; }
  get measureChangeMeasureId() { return this._measureChangeMeasureId || ""; }
  set measureChangeMeasureId(v) { this._measureChangeMeasureId = v || ""; }
  get measureChangeRowIndex()  { return this._measureChangeRowIndex  || ""; }
  set measureChangeRowIndex(v)  { this._measureChangeRowIndex  = v || ""; }
  get measureChangeAddrStr()   { return this._measureChangeAddrStr   || ""; }
  set measureChangeAddrStr(v)   { this._measureChangeAddrStr   = v || ""; }
  get pendingChanges() {
    return this._serializePendingChanges(this._pendingChanges);
  }
  // Somente leitura para o SAC. O valor que o SAC devolve (eco do propertiesChanged ou valor salvo
  // na story em modo de edição) não é reaplicado: evita reenviar alterações de outra sessão.
  set pendingChanges(v) { /* estado interno é a fonte da verdade */ }

  getMeasureChangeValue()     { return this._measureChangeValue     || ""; }
  getChangedValue()           { return this._changedValue           || ""; }
  getMeasureChangeMeasureId() { return this._measureChangeMeasureId || ""; }
  getMeasureChangeRowIndex()  { return this._measureChangeRowIndex  || ""; }
  getMeasureChangeAddrStr()   { return this._measureChangeAddrStr   || ""; }
  getPendingChanges()         { return this._serializePendingChanges(this._pendingChanges); }

  // ─── Gravação: lista pronta para Table.getPlanning().setUserInput() ──────────
  // Substitui a lógica do script onSaveRequested. O script só percorre a lista:
  //   var n = widget.getWriteCount();
  //   for (i < n) { sel[widget.getWriteDimensionId(i, d)] = widget.getWriteMemberId(i, d) ...;
  //                 sel["@MeasureDimension"] = widget.getWriteMeasureId(i);
  //                 Table.getPlanning().setUserInput(sel, widget.getWriteValue(i)); }

  // "DIM=VALOR" por linha. multi: VALOR com vários itens separados por ";"
  _parseRuleLines(text, multi) {
    var out = {};
    var lines = String(text || "").split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var eq = line.indexOf("=");
      if (eq <= 0) { continue; }
      var key = line.substring(0, eq).trim();
      var val = line.substring(eq + 1).trim();
      if (!key || !val) { continue; }
      if (multi) {
        var items = val.split(";");
        out[key] = [];
        for (var j = 0; j < items.length; j++) {
          if (items[j].trim()) { out[key].push(items[j].trim()); }
        }
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  // "DIM|~|[DIM].[H].&[ID]|||..." → [{dim, member}] com a hierarquia da tabela de gravação
  _addrToPairs(addrStr) {
    var pairs = [];
    var parts = String(addrStr || "").split("|||");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      var sep = p.indexOf("|~|");
      if (sep === -1) { continue; }
      var dim = p.substring(0, sep).trim();
      var mem = p.substring(sep + 3).trim();
      if (!dim || !mem) { continue; }
      var hier = this._writeHierarchies[dim];
      if (hier && mem.indexOf(".&[") !== -1) {
        mem = "[" + dim + "].[" + hier + "].&[" + this._cleanMemberId(mem) + "]";
      }
      pairs.push({ dim: dim, member: mem });
    }
    return pairs;
  }

  _pairsKey(pairs) {
    var keys = [];
    for (var i = 0; i < pairs.length; i++) { keys.push(pairs[i].dim + "=" + pairs[i].member); }
    keys.sort();
    return keys.join("|");
  }

  // Membro configurado como "não recebe valor" (ex: RESPONSABILIDADE=CLIENTE;NÃO APLICÁVEL)
  // Compara pelo ID e pela descrição do membro (o ID técnico pode não ser o texto "CLIENTE")
  _isNoValueAddress(pairs) {
    for (var i = 0; i < pairs.length; i++) {
      var rule = this._noValueMembers[pairs[i].dim];
      if (!rule) { continue; }
      var idNorm = this._normalizeLabel(this._cleanMemberId(pairs[i].member));
      var labelNorm = this._normalizeLabel(this._memberLabel(pairs[i].dim, pairs[i].member));
      for (var j = 0; j < rule.length; j++) {
        var ruleNorm = this._normalizeLabel(rule[j]);
        if (ruleNorm === idNorm || (labelNorm && ruleNorm === labelNorm)) { return true; }
      }
    }
    return false;
  }

  // Descrição de um membro (dimensão pelo ID real) a partir das opções e seleções conhecidas.
  // Índice em cache por render; a hierarquia do ID é ignorada (compara o ID limpo).
  _memberLabel(dimRealId, memberId) {
    var idx = this._memberLabelIndex[dimRealId];
    if (!idx) {
      idx = {};
      var count = this._metadata && this._metadata.feeds ? this._metadata.feeds.dimensions.values.length : 0;
      for (var i = 1; i < count; i++) {
        var key = "dimensions_" + i;
        if (this._dimRealId(key) !== dimRealId) { continue; }
        var add = function(id, label) { if (id && label) { idx[this._cleanMemberId(id)] = label; } }.bind(this);
        var opts = this._resolveDropdownOptions(key, [], null);
        for (var o = 0; o < opts.length; o++) { add(opts[o].value, opts[o].label); }
        var sources = [this._bindingLeaves && this._bindingLeaves[key], this._valuesLeaves && this._valuesLeaves[key]];
        for (var s = 0; s < sources.length; s++) { for (var sid in (sources[s] || {})) { add(sid, sources[s][sid]); } }
        var cfb = this._childrenFromBinding && this._childrenFromBinding[key];
        for (var p in (cfb || {})) { for (var c = 0; c < cfb[p].length; c++) { add(cfb[p][c].value, cfb[p][c].label); } }
        var selSets = [this._localSelections, this._savedSelections];
        for (var ss = 0; ss < selSets.length; ss++) {
          for (var acc in (selSets[ss] || {})) {
            var sel = selSets[ss][acc][key];
            if (sel) { add(sel.id, sel.label); }
          }
        }
      }
      this._memberLabelIndex[dimRealId] = idx;
    }
    return idx[this._cleanMemberId(memberId)] || "";
  }

  _buildWriteList() {
    this._memberLabelIndex = {}; // seleções novas desde o último render
    var writes = [];
    var index = {};
    var self = this;
    var required = this._metadata && this._metadata.feeds ? this._metadata.feeds.dimensions.values.length : 0;
    var skipped = [];

    // source = índice da alteração pendente que originou a gravação (para manter pendente se falhar)
    function put(pairs, measureId, value, onlyIfAbsent, source) {
      if (pairs.length < required) { skipped.push({ pairs: pairs, measureId: measureId, source: source }); return; }
      var key = measureId + "||" + self._pairsKey(pairs);
      if (index[key] !== undefined) {
        var existing = writes[index[key]];
        if (!onlyIfAbsent) { existing.value = value; }
        if (existing.sources.indexOf(source) === -1) { existing.sources.push(source); }
        return;
      }
      index[key] = writes.length;
      writes.push({ pairs: pairs, measureId: measureId, value: value, sources: [source], failed: false });
    }

    for (var i = 0; i < (this._pendingChanges || []).length; i++) {
      var ch = this._pendingChanges[i];
      var mId = ch.measureId || "";
      if (/^measures_\d+$/.test(mId)) { mId = this._getMeasureIdByKey(mId); }
      var oldPairs = this._addrToPairs(ch.oldAddr);
      var newPairs = this._addrToPairs(ch.newAddr);
      // Combinação mudou: apaga o endereço antigo (sem sobrescrever um valor novo já gravado nele).
      // noMove: a linha não tinha valor — não há o que apagar na combinação antiga.
      if (!ch.noMove && ch.oldAddr && ch.oldAddr !== ch.newAddr && oldPairs.length > 0) {
        put(oldPairs, mId, this._deleteValue, true, i);
      }
      var value = ch.value === undefined || ch.value === null ? "" : String(ch.value).trim();
      if (value === "" || this._isNoValueAddress(newPairs)) { value = this._deleteValue; }
      put(newPairs, mId, value, false, i);
    }
    this._writeSkipped = skipped;
    this._debugLog("Gravação", { writes: writes, ignoradasPorEnderecoIncompleto: skipped });
    return writes;
  }

  getWriteCount()                 { this._writes = this._buildWriteList(); return this._writes.length; }
  // Alterações que ficaram fora da gravação por endereço incompleto (falta dimensão)
  getWriteSkippedCount()          { return (this._writeSkipped || []).length; }
  // O script informa o retorno do setUserInput; o que falhar continua pendente após clearPendingChanges()
  setWriteResult(i, ok)           { if (this._writes[i]) { this._writes[i].failed = !ok; } }
  getWriteDimensionCount(i)       { var w = this._writes[i]; return w ? w.pairs.length : 0; }
  getWriteDimensionId(i, d)       { var w = this._writes[i]; return w && w.pairs[d] ? w.pairs[d].dim : ""; }
  getWriteMemberId(i, d)          { var w = this._writes[i]; return w && w.pairs[d] ? w.pairs[d].member : ""; }
  getWriteMeasureId(i)            { var w = this._writes[i]; return w ? w.measureId : ""; }
  getWriteValue(i)                { var w = this._writes[i]; return w ? w.value : ""; }
  // Chave estável da linha: ID da conta (dimensions_0) — sobrevive à reordenação do binding
  _rowKey(rowIndex) {
    var row = this._data ? this._data[rowIndex] : null;
    return (row && (row["dimensions_0"] || {}).id) || String(rowIndex);
  }

  // Chamado pelo script depois do submitData(). Gravações que falharam (setWriteResult(i, false))
  // continuam pendentes e destacadas; as demais viram "salvas" e saem do rastreio de alterações.
  clearPendingChanges() {
    var keepSources = {};
    for (var wi = 0; wi < this._writes.length; wi++) {
      if (!this._writes[wi].failed) { continue; }
      for (var si = 0; si < this._writes[wi].sources.length; si++) { keepSources[this._writes[wi].sources[si]] = true; }
    }
    var kept = [];
    var keptRows = {};
    for (var pi = 0; pi < this._pendingChanges.length; pi++) {
      if (!keepSources[pi]) { continue; }
      kept.push(this._pendingChanges[pi]);
      keptRows[this._rowKey(this._pendingChanges[pi].rowIndex)] = true;
    }
    if (kept.length > 0) {
      this._showNotice(kept.length + (kept.length === 1 ? " alteração não foi gravada" : " alterações não foram gravadas") + " — as linhas destacadas continuam pendentes. Corrija e salve de novo.", "error");
    }
    this._writes = [];
    this._failedRows = keptRows;
    this._pendingChanges = kept;
    if (kept.length === 0) {
      this._localData = {};
      this._originalData = {};
    }
    // Seleções gravadas valem como estado do modelo até o binding atualizar
    var stillLocal = {};
    for (var sk in this._localSelections) {
      if (keptRows[sk]) { stillLocal[sk] = this._localSelections[sk]; continue; }
      if (!this._savedSelections[sk]) { this._savedSelections[sk] = {}; }
      for (var sd in this._localSelections[sk]) { this._savedSelections[sk][sd] = this._localSelections[sk][sd]; }
    }
    this._localSelections = stillLocal;
    var stillMeasures = {};
    for (var lm in this._localMeasures) {
      if (keptRows[this._rowKey(lm)]) { stillMeasures[lm] = this._localMeasures[lm]; }
    }
    this._localMeasures = stillMeasures;
    this._selectionRowIndex = {};
    this._saveWindowBindings = 2;               // protege até 2 bindings após o save...
    this._saveWindowUntil = Date.now() + 15000; // ...dentro de 15s
    this._saveInFlightUntil = 0;                // libera o botão Salvar
    this._emitProperties({ pendingChanges: this._serializePendingChanges(this._pendingChanges) });
    this._render();
  }
  // Aviso no topo do widget (regras de negócio): type = "warn" | "error" | "info"
  _showNotice(text, type) {
    var el = this.shadowRoot.getElementById("dt-notice");
    if (!el) { return; }
    el.textContent = text;
    el.className = "dt-notice " + (type || "info");
    if (this._noticeTimer) { clearTimeout(this._noticeTimer); }
    this._noticeTimer = setTimeout(function() { el.classList.add("hidden"); }, type === "error" ? 15000 : 8000);
  }

  // Regras de bloqueio da linha (modo sem script):
  //  "noValue"  → alguma dimensão num membro que não recebe valor (ex: RESPONSABILIDADE=CLIENTE):
  //               medidas travadas mostrando 0 (é o que será gravado)
  //  "noDims"   → todas as dimensões de dropdown em NÃO APLICÁVEL (ou sem valor): escolha as
  //               dimensões antes de informar valores
  _getRowLockState(rowIndex) {
    if (!this._isExplicitDropdownMode() || !this._data || !this._data[rowIndex]) { return ""; }
    var addr = this._buildRowAddrObj(rowIndex, null, true);
    var pairs = [];
    for (var ak in addr) { pairs.push({ dim: ak, member: addr[ak] }); }
    if (this._isNoValueAddress(pairs)) { return "noValue"; }
    var count = this._metadata.feeds.dimensions.values.length;
    var dropdownDims = 0;
    var notApplicable = 0;
    var defaultNorm = this._normalizeLabel(this._emptyDefaultLabel);
    for (var i = 1; i < count; i++) {
      var key = "dimensions_" + i;
      if (!this._isDropdownDimension(key)) { continue; }
      dropdownDims++;
      var member = addr[this._dimRealId(key)];
      if (!member || (defaultNorm && this._normalizeLabel(this._cleanMemberId(member)) === defaultNorm)) {
        notApplicable++;
        continue;
      }
      var def = this._getDefaultMember(key, [(this._data[rowIndex][key] || {}).id], null);
      if (def && def.value === member) { notApplicable++; }
    }
    return dropdownDims > 0 && notApplicable === dropdownDims ? "noDims" : "";
  }

  // Aplica o bloqueio nas células de medida da linha (render e após troca de dropdown)
  _applyRowLock(rowIndex, trEl) {
    var tr = trEl || this.shadowRoot.querySelector('tbody tr[data-row-index="' + rowIndex + '"]');
    if (!tr) { return; }
    var state = this._getRowLockState(rowIndex);
    var inputs = tr.querySelectorAll("td.dt-mcell input");
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      if (state === "") {
        if (inp.disabled) {
          inp.disabled = false;
          inp.classList.remove("dt-locked");
          inp.title = "";
          if (inp._valueBeforeLock !== undefined) { inp.value = inp._valueBeforeLock; inp._valueBeforeLock = undefined; }
        }
        continue;
      }
      if (!inp.disabled) { inp._valueBeforeLock = inp.value; }
      inp.disabled = true;
      inp.classList.add("dt-locked");
      if (state === "noValue") {
        inp.value = this._deleteValue === "" ? "0" : this._deleteValue;
        inp.title = "Responsabilidade sem valor (ex: CLIENTE) — grava " + (this._deleteValue === "" ? "0" : this._deleteValue);
      } else {
        inp.title = "Escolha as dimensões antes de informar valores";
      }
    }
  }
  // Limpa no DOM a última medida editada (sem re-render)
  clearMeasureInput() {
    var rowIdx = parseInt(this._measureChangeRowIndex || "0", 10);
    var count = this._metadata && this._metadata.feeds.measures ? this._metadata.feeds.measures.values.length : 0;
    var mIdx = 0;
    for (var i = 0; i < count; i++) {
      if (this._getMeasureIdByKey("measures_" + i) === this._measureChangeMeasureId) { mIdx = i; break; }
    }
    if (this._localMeasures[rowIdx]) { delete this._localMeasures[rowIdx]["measures_" + mIdx]; }
    var rows = this.shadowRoot.querySelectorAll('tbody tr[data-row-index="' + rowIdx + '"]');
    for (var r = 0; r < rows.length; r++) {
      var inputs = rows[r].querySelectorAll("td.dt-mcell input");
      if (inputs[mIdx]) { inputs[mIdx].value = ""; }
    }
  }

  get deleteMemberId()          { return this._deleteMemberId          || ""; }
  set deleteMemberId(v)          { this._deleteMemberId          = v || ""; }
  get deleteMemberDimensionId() { return this._deleteMemberDimensionId || ""; }
  set deleteMemberDimensionId(v) { this._deleteMemberDimensionId = v || ""; }

  set headerColor(v) { this.style.setProperty("--header-color", v); }
  set headerTextColor(v) { this.style.setProperty("--header-text-color", v); }
  set selectedRowColor(v) { this.style.setProperty("--selected-row-color", v); }
  set hoverRowColor(v) { this.style.setProperty("--hover-row-color", v); }
  set tableTextColor(v) { this.style.setProperty("--table-text-color", v); }
  set dropdownHighlightColor(v) { this.style.setProperty("--dropdown-highlight-color", v); }
  set rowHeight(v) { this._rowHeight = parseInt(v, 10) || 32; this._applyDynamicStyles(); this._render(); }
  set colWidth(v) { this._colWidth = v; this._render(); }
  set fontFamily(v) { this._fontFamily = v; this._applyDynamicStyles(); }
  set fontSize(v) { this._fontSize = v; this._applyDynamicStyles(); }
  set width(v) { this.style.width = v + "px"; }
  set height(v) { this.style.height = v + "px"; }

  // ─── Methods ──────────────────────────────────────────────────
  setDropdownDimensions(v) { this.dropdownDimensions = v; }
  getDropdownDimensions() { return this.dropdownDimensions; }
  getLastAddMemberRequest()    { return JSON.stringify(this._lastAddMemberRequest || {}); }
  getDeleteMemberId()          { return this._deleteMemberId          || ""; }
  getDeleteMemberIdClean()      { return this._cleanMemberId(this._deleteMemberId); }
  getDeleteMemberDimensionId() { return this._deleteMemberDimensionId || ""; }
  getNewMemberId()          { return this._newMemberId; }
  getNewMemberDescription() { return this._newMemberDescription; }
  getNewMemberParentId()    { return this._newMemberParentId; }
  getNewMemberDimensionId() { return this._newMemberDimensionId; }
  getSelectedCellData() { return JSON.stringify(this._selectedCellData); }
  getPreviousCellData() { return JSON.stringify(this._previousCellData); }
  getOldRowAddrStr() {
    if (this._oldRowAddrStr) { return this._oldRowAddrStr; }
    var rowIndex = this._selectedCellData && this._selectedCellData.row !== undefined ? this._selectedCellData.row : -1;
    if (rowIndex === -1 || !this._data || !this._metadata) { return ""; }
    return this._buildRowAddrStr(rowIndex, null, false);
  }
  getNewRowAddrStr() {
    return this._newRowAddrStr || "";
  }
  _getRowMeasureValue(rowIndex, measureKey) {
    if (rowIndex === -1 || !this._data) { return ""; }
    var rowData = this._data[rowIndex];
    if (!rowData) { return ""; }

    if (!measureKey) { measureKey = "measures_0"; }
    // Checa localMeasures para essa medida específica
    if (this._localMeasures[rowIndex] && this._localMeasures[rowIndex][measureKey] !== undefined) {
      return String(this._localMeasures[rowIndex][measureKey]);
    }

    var mv = rowData[measureKey] || {};
    if (mv.raw !== null && mv.raw !== undefined && String(mv.raw) !== "NaN" && String(mv.raw) !== "null") {
      return String(mv.raw);
    }
    if (mv.value !== null && mv.value !== undefined && String(mv.value) !== "NaN" && String(mv.value) !== "null") {
      return String(mv.value);
    }
    if (mv.formattedValue !== undefined && mv.formattedValue !== null && String(mv.formattedValue) !== "") {
      return this._toCanonicalNumber(mv.formattedValue);
    }
    if (mv.formatted !== undefined && mv.formatted !== null && String(mv.formatted) !== "" && String(mv.formatted) !== "NaN") {
      return this._toCanonicalNumber(mv.formatted);
    }
    return "";
  }
  // Converte texto numérico (pt-BR ou en) em número.
  //   "1.593,95" → 1593.95 | "1,593.95" → 1593.95 | "10,5" → 10.5
  //   "1.500" → 1500 (ponto + 3 dígitos = milhar) | "10.5" → 10.5 | "" → NaN
  _parseLocaleNumber(v) {
    if (typeof v === "number") { return v; }
    var s = String(v === null || v === undefined ? "" : v).replace(/[^0-9.,\-]/g, "");
    if (s === "" || s === "-") { return NaN; }
    var lastComma = s.lastIndexOf(",");
    var lastDot   = s.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) { s = s.replace(/\./g, "").replace(",", "."); }
      else                     { s = s.replace(/,/g, ""); }
    } else if (lastComma !== -1) {
      s = s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
    } else if (lastDot !== -1) {
      var dotParts = s.split(".");
      if (dotParts.length > 2 || dotParts[1].length === 3) { s = s.replace(/\./g, ""); }
    }
    return parseFloat(s);
  }
  // Retorna o número em formato canônico ("1593.95") ou "" se não for numérico
  _toCanonicalNumber(v) {
    var n = this._parseLocaleNumber(v);
    return isNaN(n) ? "" : String(n);
  }
  // ID técnico da medida de um feed ("measures_1" → "CUSTO"). Fonte única para a edição de
  // medida, a troca de dropdown e a lista de gravação (antes havia duas lógicas diferentes).
  _getMeasureIdByKey(measureKey) {
    var key = measureKey || "measures_0";
    var idx = parseInt(key.replace("measures_", ""), 10);
    var meta = this._metadata;
    if (!meta) { return key; }
    var msm = meta.mainStructureMembers;
    if (msm) {
      var entry = msm[key];
      if (!entry && !isNaN(idx)) { entry = msm[Object.keys(msm)[idx]]; }
      if (entry && entry.id) { return entry.id; }
      if (typeof entry === "string") { return entry; }
    }
    var feed = meta.feeds && meta.feeds.measures ? meta.feeds.measures.values : [];
    var mv = !isNaN(idx) ? feed[idx] : null;
    if (mv) { return typeof mv === "string" ? mv : (mv.id || key); }
    return this._mesLabels[idx] || key;
  }
  // Resolve a chave de _localSelections (id de dimensions_0, ou rowIndex como string) para o rowIndex
  _findRowIndexByDim0(key) {
    if (!this._data) { return -1; }
    var known = this._selectionRowIndex ? this._selectionRowIndex[key] : undefined;
    if (known !== undefined && this._data[known] && ((this._data[known]["dimensions_0"] || {}).id || String(known)) === key) {
      return known;
    }
    for (var fr = 0; fr < this._data.length; fr++) {
      if (((this._data[fr]["dimensions_0"] || {}).id || String(fr)) === key) { return fr; }
    }
    return -1;
  }
  _createRowKey(addrStr, measureId) {
    return (addrStr || "") + "___" + (measureId || "");
  }
  _getCurrentLocalValue(addrStr, measureId) {
    var rowKey = this._createRowKey(addrStr, measureId);
    if (this._localData && this._localData[rowKey]) {
      return this._localData[rowKey].value;
    }
    if (this._originalData[rowKey] !== undefined) {
      return this._originalData[rowKey];
    }
    return "";
  }
  _setLocalCellValue(addrStr, measureId, value) {
    var rowKey = this._createRowKey(addrStr, measureId);
    this._localData[rowKey] = {
      value: value,
      changed: true
    };
    return rowKey;
  }
  _addPendingChange(change) {
    // Encadeia com registro existente da mesma medida cujo destino é a origem desta mudança:
    // A→B seguido de B→C vira A→C; edições repetidas na mesma célula atualizam o valor.
    for (var pi = this._pendingChanges.length - 1; pi >= 0; pi--) {
      var existing = this._pendingChanges[pi];
      if (existing.measureId === change.measureId && existing.newAddr === change.oldAddr) {
        existing.newAddr = change.newAddr;
        existing.value   = change.value;
        if (existing.oldAddr !== existing.newAddr) { existing.type = "dropdown"; }
        return;
      }
    }
    this._pendingChanges.push(change);
  }
  _serializePendingChanges(changes) {
    if (!changes || !changes.length) { return ""; }
    var result = "";
    for (var i = 0; i < changes.length; i++) {
      var item = changes[i] || {};
      if (i > 0) { result += "###"; }
      // value já chega canônico ("1593.95") — ver _parseLocaleNumber
      var val = item.value === undefined || item.value === null ? "" : String(item.value);
      result += (item.oldAddr || "") + "§" + (item.newAddr || "") + "§" + val + "§" + (item.measureId || "");
    }
    return result;
  }
  _buildRowAddrStr(rowIndex, overrideSelection, includeLocalSelections) {
    return this._serializeAddrObj(this._buildRowAddrObj(rowIndex, overrideSelection, includeLocalSelections));
  }
  _serializeAddrObj(addrObj) {
    var addrStr = "";
    for (var k in addrObj) {
      if (addrObj[k] !== undefined && addrObj[k] !== "") {
        addrStr = addrStr + k + "|~|" + addrObj[k] + "|||";
      }
    }
    return addrStr;
  }
  // Endereço da linha: dimensions_0 do binding → rowValuesMap → _localSelections → override
  _buildRowAddrObj(rowIndex, overrideSelection, includeLocalSelections) {
    if (rowIndex === -1 || !this._data || !this._metadata) { return {}; }
    var rowData = this._data[rowIndex];
    if (!rowData) { return {}; }
    var addrObj = {};
    var dim0 = rowData["dimensions_0"] || {};
    if (dim0.id) {
      var realId0 = "dimensions_0";
      if (this._metadata.dimensions && this._metadata.dimensions["dimensions_0"]) {
        realId0 = this._metadata.dimensions["dimensions_0"].id || realId0;
      }
      addrObj[realId0] = dim0.id;
    }
    // Membro gravado que o próprio binding já traz na linha (folha com parentId; nunca nó;
    // só em linha com valor — sem valor é combinação vazia, não gravação)
    var rowHasData = this._rowHasData(rowData);
    for (var bk in rowData) {
      if (!rowHasData) { break; }
      if (bk.indexOf("dimensions_") !== 0 || bk === "dimensions_0") { continue; }
      var bcell = rowData[bk] || {};
      if (bcell.id && bcell.parentId && !this._isNodeId(bk, bcell.id, null) && this._cleanMemberId(bcell.id) !== "#") {
        addrObj[this._dimRealId(bk)] = bcell.id;
      }
    }
    // Valores gravados: setRowValues (script) ou valuesBinding (Builder) — prevalecem sobre o binding
    var rvStr = this._getRowValuesString(dim0.id || "");
    if (rvStr) {
      var rparts = rvStr.split("|");
      var dimsLen = rparts.length;
      if (this._metadata.feeds && this._metadata.feeds.dimensions && this._metadata.feeds.dimensions.values) {
        dimsLen = Math.max(dimsLen, this._metadata.feeds.dimensions.values.length);
      }
      for (var rdi = 1; rdi < dimsLen; rdi++) {
        var rdk = "dimensions_" + rdi;
        var rRealId = this._metadata.dimensions && this._metadata.dimensions[rdk] ? this._metadata.dimensions[rdk].id : rdk;
        if (rparts[rdi] !== undefined && rparts[rdi] !== "") { addrObj[rRealId] = rparts[rdi]; }
      }
    }
    var brsRowData = this._data && this._data[rowIndex] ? this._data[rowIndex] : {};
    var brsKey = (brsRowData["dimensions_0"] || {}).id || String(rowIndex);
    // Seleções já salvas valem como estado do modelo até o binding atualizar
    var selSources = [this._savedSelections];
    if (includeLocalSelections) { selSources.push(this._localSelections); }
    for (var ss = 0; ss < selSources.length; ss++) {
      var src = selSources[ss] && selSources[ss][brsKey];
      if (!src) { continue; }
      for (var ldk in src) {
        var lsel = src[ldk];
        if (lsel && lsel.id && lsel.id !== "") {
          var lRealId = this._metadata.dimensions && this._metadata.dimensions[ldk] ? this._metadata.dimensions[ldk].id : ldk;
          addrObj[lRealId] = lsel.id;
        }
      }
    }
    // Dimensões de dropdown ainda sem valor: membro padrão ("NÃO APLICAVEL") — é o que a célula mostra
    if (this._isExplicitDropdownMode() && this._metadata.feeds && this._metadata.feeds.dimensions) {
      var ddCount = this._metadata.feeds.dimensions.values.length;
      for (var ddi = 1; ddi < ddCount; ddi++) {
        var ddKey = "dimensions_" + ddi;
        var ddReal = this._dimRealId(ddKey);
        if (addrObj[ddReal] || !this._isDropdownDimension(ddKey)) { continue; }
        var ddDef = this._getDefaultMember(ddKey, [(rowData[ddKey] || {}).id], null);
        if (ddDef) { addrObj[ddReal] = ddDef.value; }
      }
    }
    if (overrideSelection && overrideSelection.dimensionId) {
      var oRealId =this._metadata.dimensions && this._metadata.dimensions[overrideSelection.dimensionId] ? this._metadata.dimensions[overrideSelection.dimensionId].id : overrideSelection.dimensionId;
      addrObj[oRealId] = overrideSelection.memberId || "";
    }
    return addrObj;
  }
  getActiveFilters() { return "{}"; } // mantido por compatibilidade com o JSON (sem filtros ativos próprios)

  setDropdownOptions(v) {
    try {
      var cfg = JSON.parse(v);
      this._dropdownOptions = {};
      for (var i = 0; i < cfg.length; i++) {
        var item = cfg[i];
        var opts = [];
        for (var j = 0; j < item.options.length; j++) {
          var o = item.options[j];
          if (typeof o === "string") {
            opts.push({ value: o, label: o });
          } else {
            opts.push({ value: o.value || o.id || o, label: o.label || o.description || o.value || o });
          }
        }
        this._dropdownOptions[item.dimensionKey] = opts;
      }
      this._render();
    } catch(e) { console.error("setDropdownOptions error:", e); }
  }
  getDropdownOptions() { return JSON.stringify(this._dropdownOptions); }

  setMeasureLabels(v) {
    try { this._measureLabels = JSON.parse(v); this._render(); }
    catch(e) { console.error("setMeasureLabels error:", e); }
  }
  getMeasureLabels() { return JSON.stringify(this._measureLabels || []); }

  // Filtro no binding pelo script (ex: dropdowntable_1.setDimensionFilter("Date", "2024.01")).
  // Só atua se o objeto do binding expuser setDimensionFilter/removeDimensionFilter.
  setDimensionFilter(dimensionId, memberIds) {
    try {
      var binding = this.myDataBinding;
      if (!binding) { return; }
      var ids = Array.isArray(memberIds) ? memberIds : [memberIds];
      if (typeof binding.setDimensionFilter === "function") {
        binding.setDimensionFilter(dimensionId, ids);
      }
    } catch(e) { console.error("setDimensionFilter error:", e); }
  }

  removeDimensionFilter(dimensionId) {
    try {
      var binding = this.myDataBinding;
      if (!binding) { return; }
      if (typeof binding.removeDimensionFilter === "function") {
        binding.removeDimensionFilter(dimensionId);
      }
    } catch(e) { console.error("removeDimensionFilter error:", e); }
  }

  // Recebe mapeamento {contaId: "contaId|periodoId|fonteId|respId"} e aplica nos dropdowns
  setRowValues(v) {
    try {
      var map = JSON.parse(v);
      this._rowValuesMap = map;
      this._savedSelections = {}; // script trouxe os valores atuais do modelo
      this._debugLog("setRowValues", map);
      this._render();
    } catch(e) { console.error("setRowValues error:", e); }
  }

  // ─── Cell Selection ──────────────────────────────────────────────
  _getAllMeasureCells() {
    return Array.from(this.shadowRoot.querySelectorAll("tbody td.dt-mcell"));
  }

  _clearSelection() {
    for (var cs = 0; cs < this._selectedCells.length; cs++) {
      if (this._selectedCells[cs].tdEl) {
        this._selectedCells[cs].tdEl.classList.remove("dt-measure-cell-selected");
      }
    }
    this._selectedCells = [];
  }

  _selectCell(rowIndex, measureKey, tdEl) {
    tdEl.classList.add("dt-measure-cell-selected");
    this._selectedCells.push({ rowIndex: rowIndex, measureKey: measureKey, tdEl: tdEl });
  }

  _selectRange(anchorRow, anchorKey, endRow, endKey) {
    this._clearSelection();
    var allCells = this._getAllMeasureCells();
    if (allCells.length === 0) { return; }

    // Resolve índices de coluna das medidas
    var measureKeys = [];
    var firstRow = this.shadowRoot.querySelector("tbody tr[data-row-index]");
    if (firstRow) {
      var mCells = firstRow.querySelectorAll("td.dt-mcell");
      for (var mc = 0; mc < mCells.length; mc++) {
        measureKeys.push(mCells[mc].getAttribute("data-measure-key"));
      }
    }

    var anchorColIdx = measureKeys.indexOf(anchorKey);
    var endColIdx    = measureKeys.indexOf(endKey);
    if (anchorColIdx === -1) { anchorColIdx = 0; }
    if (endColIdx    === -1) { endColIdx    = 0; }

    var minRow = anchorRow < endRow ? anchorRow : endRow;
    var maxRow = anchorRow < endRow ? endRow     : anchorRow;
    var minCol = anchorColIdx < endColIdx ? anchorColIdx : endColIdx;
    var maxCol = anchorColIdx < endColIdx ? endColIdx    : anchorColIdx;

    for (var ci = 0; ci < allCells.length; ci++) {
      var td = allCells[ci];
      var ri = parseInt(td.getAttribute("data-row-index"), 10);
      var mk = td.getAttribute("data-measure-key");
      var colIdx = measureKeys.indexOf(mk);
      if (ri >= minRow && ri <= maxRow && colIdx >= minCol && colIdx <= maxCol) {
        this._selectCell(ri, mk, td);
      }
    }
  }

  // Seleção de células de medida arrastando o mouse (ligado uma vez em connectedCallback)
  _bindDragSelection() {
    var self = this;
    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    wrapper.addEventListener("mousedown", function(e) {
      var td = e.target.closest("td.dt-mcell");
      if (!td) { return; }
      self._clearSelection();
      // Clique direto no input: deixa o foco/edição acontecer
      if (e.target.tagName === "INPUT") { return; }
      e.preventDefault();
      self._isDragging = true;
      var row = parseInt(td.getAttribute("data-row-index"), 10);
      var key = td.getAttribute("data-measure-key");
      self._selAnchor = { rowIndex: row, measureKey: key };
      self._selectCell(row, key, td);
      wrapper.focus();
    });
    wrapper.addEventListener("mouseover", function(e) {
      if (!self._isDragging || !self._selAnchor) { return; }
      var td = e.target.closest("td.dt-mcell");
      if (!td) { return; }
      self._selectRange(self._selAnchor.rowIndex, self._selAnchor.measureKey, parseInt(td.getAttribute("data-row-index"), 10), td.getAttribute("data-measure-key"));
    });
  }

  _bindSelectionKeys() {
    var self = this;
    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    if (!wrapper) { return; }

    wrapper.setAttribute("tabindex", "0");

    wrapper.addEventListener("keydown", function(e) {
      // Delete — dispara evento com células selecionadas
      if (e.key === "Delete" && self._selectedCells.length > 0) {
        e.preventDefault();
        self._dispatchCellsDelete();
        return;
      }

      // Escape — limpa seleção
      if (e.key === "Escape") { self._clearSelection(); return; }

      // Ctrl+A — seleciona todas as células de medida
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        self._clearSelection();
        var allCells = self._getAllMeasureCells();
        for (var ac = 0; ac < allCells.length; ac++) {
          var acTd = allCells[ac];
          self._selectCell(
            parseInt(acTd.getAttribute("data-row-index"), 10),
            acTd.getAttribute("data-measure-key"),
            acTd
          );
        }
        return;
      }

      // Ctrl+Shift+Seta — expande seleção
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        if (!self._selAnchor) { return; }

        var allCells2 = self._getAllMeasureCells();
        var measureKeys2 = [];
        var firstRow2 = self.shadowRoot.querySelector("tbody tr[data-row-index]");
        if (firstRow2) {
          var mCells2 = firstRow2.querySelectorAll("td.dt-mcell");
          for (var mc2 = 0; mc2 < mCells2.length; mc2++) {
            measureKeys2.push(mCells2[mc2].getAttribute("data-measure-key"));
          }
        }

        var lastSel = self._selectedCells.length > 0 ? self._selectedCells[self._selectedCells.length - 1] : self._selAnchor;
        var curRow  = lastSel.rowIndex;
        var curCol  = measureKeys2.indexOf(lastSel.measureKey);
        if (curCol === -1) { curCol = 0; }

        var newRow = curRow;
        var newCol = curCol;
        if (e.key === "ArrowRight") { newCol = Math.min(newCol + 1, measureKeys2.length - 1); }
        if (e.key === "ArrowLeft")  { newCol = Math.max(newCol - 1, 0); }
        if (e.key === "ArrowDown")  { newRow = newRow + 1; }
        if (e.key === "ArrowUp")    { newRow = Math.max(newRow - 1, 0); }

        var newKey = measureKeys2[newCol] || lastSel.measureKey;
        self._selectRange(self._selAnchor.rowIndex, self._selAnchor.measureKey, newRow, newKey);
      }
    });
  }

  // ─── Context Menu wiring ──────────────────────────────────────
  _bindContextMenu() {
    var self = this;

    this.shadowRoot.getElementById("ctx-add-member").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      self._openAddMemberModal();
    });

    // Itens que só repassam a linha clicada ao script
    var forward = function(itemId, eventName, action) {
      self.shadowRoot.getElementById(itemId).addEventListener("mousedown", function(e) {
        e.stopPropagation();
        self._closeCtxMenu();
        if (!self._ctxTarget) { return; }
        self.dispatchEvent(new CustomEvent(eventName, {
          bubbles: true, composed: true,
          detail: {
            action:        action,
            rowIndex:      self._ctxTarget.rowIndex,
            dimensionId:   self._ctxTarget.dimensionId,
            dimensionName: self._ctxTarget.dimensionName,
            memberId:      self._ctxTarget.memberId,
            memberLabel:   self._ctxTarget.memberLabel
          }
        }));
      });
    };
    forward("ctx-filter-member", "onFilterMemberRequested", "filterMember");
    forward("ctx-filter",        "onFilterMemberRequested", "filter");
    forward("ctx-exclude",       "onExcludeRowRequested",   "exclude");

    // Excluir membro: abre a confirmação (com bloqueio por regra de negócio); o evento só sai no "Excluir"
    this.shadowRoot.getElementById("ctx-exclude-member").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      if (self._ctxTarget) { self._openDeleteConfirm(self._ctxTarget); }
    });
  }

  _openCtxMenu(e, rowIndex, dimensionId, memberId, memberLabel, dimensionRealId, cellEl) {
    e.preventDefault();
    e.stopPropagation();

    // Resolve o ID real da dimensão SAC a partir do metadata
    var resolvedDimId = dimensionRealId || "";
    if (!resolvedDimId || resolvedDimId.indexOf("dimensions_") !== -1) {
      try {
        var dimMeta = this._metadata && this._metadata.dimensions
          ? this._metadata.dimensions[dimensionId] : null;
        if (dimMeta && dimMeta.id) {
          resolvedDimId = dimMeta.id;
        }
      } catch(ex) {}
    }

    this._ctxTarget = {
      rowIndex:        rowIndex,
      dimensionId:     dimensionId,
      dimensionRealId: resolvedDimId,
      dimensionName:   resolvedDimId,
      memberId:        memberId,
      memberLabel:     memberLabel
    };

    var menu = this.shadowRoot.getElementById("dt-ctx-menu");
    menu.classList.remove("hidden");
    menu.style.left = "-9999px";
    menu.style.top  = "-9999px";

    // Posiciona relativo à célula dentro do Shadow DOM
    var wrapper  = this.shadowRoot.getElementById("dt-wrapper");
    var wRect    = wrapper.getBoundingClientRect();
    var cellRect = cellEl ? cellEl.getBoundingClientRect() : null;

    var mw = menu.offsetWidth  || 210;
    var mh = menu.offsetHeight || 200;

    var x, y;
    if (cellRect) {
      // Posiciona abaixo da célula clicada, alinhado à esquerda dela
      x = cellRect.left  - wRect.left + wrapper.scrollLeft;
      y = cellRect.bottom - wRect.top  + wrapper.scrollTop;

      // Se não cabe abaixo, abre acima
      if (cellRect.bottom + mh > window.innerHeight) {
        y = cellRect.top - wRect.top + wrapper.scrollTop - mh;
      }
      // Se não cabe à direita, alinha pela direita da célula
      if (cellRect.left + mw > window.innerWidth) {
        x = cellRect.right - wRect.left + wrapper.scrollLeft - mw;
      }
    } else {
      x = e.clientX - wRect.left + wrapper.scrollLeft;
      y = e.clientY - wRect.top  + wrapper.scrollTop;
    }

    menu.style.position = "absolute";
    menu.style.left = Math.max(0, x) + "px";
    menu.style.top  = Math.max(0, y) + "px";
  }

  _closeCtxMenu() {
    var menu = this.shadowRoot.getElementById("dt-ctx-menu");
    if (menu) { menu.classList.add("hidden"); }
    // _ctxTarget is kept until next open so modal can read it
  }

  // ─── Add Member Modal wiring ───────────────────────────────────
  _bindModal() {
    var self = this;
    var backdrop = this.shadowRoot.getElementById("dt-modal-backdrop");
    var inputId     = this.shadowRoot.getElementById("dt-input-id");
    var inputDesc   = this.shadowRoot.getElementById("dt-input-desc");
    var inputParent = this.shadowRoot.getElementById("dt-input-parent");
    var errorId     = this.shadowRoot.getElementById("dt-error-id");
    var errorDesc   = this.shadowRoot.getElementById("dt-error-desc");
    var btnCancel   = this.shadowRoot.getElementById("dt-modal-cancel");
    var btnConfirm  = this.shadowRoot.getElementById("dt-modal-confirm");

    btnCancel.addEventListener("click", function() { self._closeModal(); });

    backdrop.addEventListener("click", function(e) {
      if (e.target === backdrop) { self._closeModal(); }
    });

    inputId.addEventListener("input", function() {
      if (inputId.value !== "") {
        inputId.classList.remove("error");
        errorId.classList.remove("visible");
      }
    });
    inputDesc.addEventListener("input", function() {
      if (inputDesc.value !== "") {
        inputDesc.classList.remove("error");
        errorDesc.classList.remove("visible");
      }
    });

    btnConfirm.addEventListener("click", function() {
      // Regras que antes ficavam no script: maiúsculas, obrigatórios, formato e duplicidade do ID
      var upper     = function(s) { return String(s || "").trim().toLocaleUpperCase("pt-BR"); };
      var idVal     = upper(inputId.value);
      var descVal   = upper(inputDesc.value);
      var parentVal = upper(inputParent.value);
      var valid     = true;
      var showIdError = function(msg) {
        errorId.textContent = msg;
        inputId.classList.add("error");
        errorId.classList.add("visible");
        valid = false;
      };

      if (idVal === "") {
        showIdError("ID do membro é obrigatório.");
      } else if (!/^[A-Z0-9_.\-]+$/.test(idVal)) {
        showIdError("Use só letras sem acento, números, _ . ou - (sem espaços).");
      } else if (self._accountIndex().ids[idVal]) {
        showIdError("Já existe uma conta com o ID " + idVal + ".");
      }
      if (descVal === "") {
        inputDesc.classList.add("error");
        errorDesc.classList.add("visible");
        valid = false;
      }
      if (!valid) { return; }
      self._lastMemberAction = { type: "add", id: idVal };

      var target = self._ctxTarget || {};

      // Resolve the real SAC dimension ID from metadata (not the feed key "dimensions_0")
      var realDimId = target.dimensionRealId || target.dimensionId || "dimensions_0";

      var payload = {
        dimensionId:          target.dimensionId   || "dimensions_0",  // feed key: "dimensions_0"
        dimensionRealId:      realDimId,                                // SAC model id: "DESCRICAO_DA_CONTA"
        dimensionName:        target.dimensionName  || "",              // label for display
        newMemberId:          idVal,
        newMemberDescription: descVal,
        parentId:             parentVal,                                // manual hierarchy input
        rowIndex:             target.rowIndex !== undefined ? target.rowIndex : -1,
        contextMemberId:      target.memberId    || "",
        contextMemberLabel:   target.memberLabel || ""
      };

      self._lastAddMemberRequest = payload;
      self._newMemberId          = idVal;
      self._newMemberDescription = descVal;
      self._newMemberParentId    = parentVal;
      self._newMemberDimensionId = realDimId;
      self._selectedCellData     = payload;

      // Notifica o SAC de todos os campos de uma vez (os getters com "body" no JSON leem daqui)
      self._emitProperties({
        selectedCellData:     JSON.stringify(payload),
        lastAddMemberRequest: JSON.stringify(payload),
        newMemberId:          idVal,
        newMemberDescription: descVal,
        newMemberParentId:    parentVal
      });
      self._closeModal();
      self._emitEvent("onAddMemberRequested", payload);
    });

    inputDesc.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { inputParent.focus(); }
    });
    inputParent.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { btnConfirm.click(); }
    });
    inputId.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { inputDesc.focus(); }
    });
    // Pai digitado que não está na lista de grupos: avisa (é permitido, mas precisa existir no modelo)
    var parentHint = this.shadowRoot.getElementById("dt-parent-hint");
    var defaultHint = parentHint.textContent;
    inputParent.addEventListener("input", function() {
      var v = String(inputParent.value || "").trim().toLocaleUpperCase("pt-BR");
      var known = !v || self._accountGroups().some(function(g) { return g.id.toUpperCase() === v; });
      parentHint.textContent = known ? defaultHint : "Pai novo (fora da lista): o ID " + v + " precisa existir na hierarquia do modelo.";
      parentHint.style.color = known ? "" : "var(--sap-warning)";
    });
  }

  _openAddMemberModal() {
    var backdrop    = this.shadowRoot.getElementById("dt-modal-backdrop");
    var inputId     = this.shadowRoot.getElementById("dt-input-id");
    var inputDesc   = this.shadowRoot.getElementById("dt-input-desc");
    var inputParent = this.shadowRoot.getElementById("dt-input-parent");
    var errorId     = this.shadowRoot.getElementById("dt-error-id");
    var errorDesc   = this.shadowRoot.getElementById("dt-error-desc");

    inputId.value   = "";
    inputDesc.value = "";
    inputParent.value = "";

    // Pre-fill parentId hint from context row's group header (if available)
    if (this._ctxTarget && this._ctxTarget.rowIndex !== undefined && this._data) {
      try {
        var rowData  = this._data[this._ctxTarget.rowIndex];
        var cell     = rowData ? rowData["dimensions_0"] : null;
        // parentId format: "[DIM].&[PARENT_ID]" — extract the PARENT_ID part
        if (cell && cell.parentId) {
          var match = cell.parentId.match(/\.&\[([^\]]+)\]$/);
          if (match) { inputParent.value = match[1]; }
        }
      } catch(ex) { /* silently skip */ }
    }

    inputId.classList.remove("error");
    inputDesc.classList.remove("error");
    errorId.classList.remove("visible");
    errorDesc.classList.remove("visible");

    // Lista de grupos existentes (o campo continua aceitando um pai novo digitado)
    var dl = this.shadowRoot.getElementById("dt-parent-list");
    dl.innerHTML = "";
    this._accountGroups().forEach(function(g) {
      var opt = document.createElement("option");
      opt.value = g.id;
      if (g.label && g.label !== g.id) { opt.label = g.label; opt.textContent = g.label; }
      dl.appendChild(opt);
    });
    var parentHint = this.shadowRoot.getElementById("dt-parent-hint");
    parentHint.textContent = "Escolha um grupo existente ou digite o ID de um pai novo. Vazio = raiz.";
    parentHint.style.color = "";

    backdrop.classList.remove("hidden");
    setTimeout(function() { inputId.focus(); }, 50);
  }

  _closeModal() {
    var backdrop = this.shadowRoot.getElementById("dt-modal-backdrop");
    backdrop.classList.add("hidden");
  }

  // ─── Contas (dimensions_0): IDs, grupos e valores — base das regras de adicionar/excluir ───
  _accountIndex() {
    if (this._accountIndexCache) { return this._accountIndexCache; }
    var ids = {};      // ID limpo (maiúsculo) → true, para checar duplicidade
    var labels = {};   // ID completo → descrição
    var parents = {};  // ID completo do pai → true
    var withValues = {}; // ID completo → true se alguma linha tem medida ≠ 0
    for (var r = 0; r < (this._data || []).length; r++) {
      var row = this._data[r];
      var c = row["dimensions_0"] || {};
      if (!c.id) { continue; }
      ids[this._cleanMemberId(c.id).toUpperCase()] = true;
      if (c.label) { labels[c.id] = c.label; }
      if (c.parentId) { parents[c.parentId] = true; }
      for (var k in row) {
        if (k.indexOf("measures_") !== 0 || !row[k]) { continue; }
        var n = parseFloat(row[k].raw);
        if (!isNaN(n) && n !== 0) { withValues[c.id] = true; }
      }
    }
    this._accountIndexCache = { ids: ids, labels: labels, parents: parents, withValues: withValues };
    return this._accountIndexCache;
  }

  // Grupos existentes (contas que são pai de outras) para a lista do campo "Grupo"
  _accountGroups() {
    var idx = this._accountIndex();
    var list = [];
    for (var pid in idx.parents) {
      list.push({ id: this._cleanMemberId(pid), label: idx.labels[pid] || this._cleanMemberId(pid) });
    }
    list.sort(function(a, b) { return String(a.label).localeCompare(String(b.label), "pt-BR"); });
    return list;
  }

  // ─── Exclusão de membro: confirmação com bloqueio ─────────────
  _openDeleteConfirm(target) {
    var rawId = target.memberId || "";
    var cleanId = this._cleanMemberId(rawId);
    var dimRealId = target.dimensionRealId || "";
    if (!dimRealId || dimRealId.indexOf("dimensions_") !== -1) { dimRealId = this._dimRealId(target.dimensionId); }

    var idx = this._accountIndex();
    var blockReason = "";
    if (idx.withValues[rawId]) {
      blockReason = "Esta conta tem valores lançados neste cliente. Zere os valores e salve antes de excluir.";
    } else if (idx.parents[rawId]) {
      blockReason = "Esta conta é um grupo com subcontas. Exclua ou mova as subcontas antes.";
    }

    this._pendingDelete = blockReason ? null : { target: target, cleanId: cleanId, dimRealId: dimRealId };
    this.shadowRoot.getElementById("dt-confirm-member").innerHTML = "";
    var memberEl = this.shadowRoot.getElementById("dt-confirm-member");
    memberEl.appendChild(document.createTextNode("Conta: "));
    var b = document.createElement("b");
    b.textContent = (target.memberLabel || cleanId) + (target.memberLabel && target.memberLabel !== cleanId ? " (" + cleanId + ")" : "");
    memberEl.appendChild(b);

    var strip = this.shadowRoot.getElementById("dt-confirm-strip");
    var okBtn = this.shadowRoot.getElementById("dt-confirm-ok");
    var cancelBtn = this.shadowRoot.getElementById("dt-confirm-cancel");
    if (blockReason) {
      strip.className = "dt-modal-strip error";
      strip.textContent = blockReason;
      okBtn.classList.add("hidden");
      cancelBtn.textContent = "Fechar";
    } else {
      strip.className = "dt-modal-strip warn";
      strip.textContent = "A conta será removida do modelo para todos os clientes, versões e períodos. Esta ação não pode ser desfeita.";
      okBtn.classList.remove("hidden");
      cancelBtn.textContent = "Cancelar";
    }
    this.shadowRoot.getElementById("dt-confirm-backdrop").classList.remove("hidden");
    setTimeout(function() { (blockReason ? cancelBtn : okBtn).focus(); }, 50);
  }

  _closeDeleteConfirm() {
    this.shadowRoot.getElementById("dt-confirm-backdrop").classList.add("hidden");
  }

  _bindDeleteConfirm() {
    var self = this;
    var backdrop = this.shadowRoot.getElementById("dt-confirm-backdrop");
    this.shadowRoot.getElementById("dt-confirm-cancel").addEventListener("click", function() { self._pendingDelete = null; self._closeDeleteConfirm(); });
    backdrop.addEventListener("click", function(e) { if (e.target === backdrop) { self._pendingDelete = null; self._closeDeleteConfirm(); } });
    backdrop.addEventListener("keydown", function(e) { if (e.key === "Escape") { self._pendingDelete = null; self._closeDeleteConfirm(); } });
    this.shadowRoot.getElementById("dt-confirm-ok").addEventListener("click", function() {
      var pd = self._pendingDelete;
      self._pendingDelete = null;
      self._closeDeleteConfirm();
      if (pd) { self._dispatchDeleteMember(pd.target, pd.cleanId, pd.dimRealId); }
    });
  }

  _dispatchDeleteMember(target, cleanId, dimRealId) {
    this._deleteMemberId          = cleanId;
    this._deleteMemberDimensionId = dimRealId;
    this._lastMemberAction = { type: "delete", id: cleanId };
    this._emitProperties({ deleteMemberId: cleanId, deleteMemberDimensionId: dimRealId });
    this._emitEvent("onDeleteMemberRequested", {
      action:          "excludeMember",
      rowIndex:        target.rowIndex,
      dimensionId:     target.dimensionId,
      dimensionRealId: dimRealId,
      dimensionName:   target.dimensionName,
      memberId:        cleanId,
      memberLabel:     target.memberLabel
    });
  }

  // O script informa o retorno do createMembers/deleteMembers; o widget mostra o aviso
  setMemberResult(ok) {
    var a = this._lastMemberAction || { type: "", id: "" };
    var what = a.type === "delete" ? "excluído" : "criado";
    if (ok) {
      this._showNotice("Membro " + a.id + " " + what + " com sucesso.", "info");
    } else {
      this._showNotice("Falha: o membro " + a.id + " não foi " + what + ". Verifique permissões" + (a.type === "delete" ? "." : " e se o grupo pai existe no modelo."), "error");
    }
  }

  // ─── Save Button ──────────────────────────────────────────────
  // Um clique dispara onSaveRequested uma única vez: novos cliques são ignorados até o script
  // chamar clearPendingChanges() (ou por 10s, se o script não chamar)
  _bindSaveButton() {
    var self = this;
    this.shadowRoot.getElementById("dt-save-btn").addEventListener("click", function() {
      if (Date.now() < self._saveInFlightUntil) { return; }
      self._saveInFlightUntil = Date.now() + 10000;
      var changedData = self._buildChangedData();
      var serialized = self._serializePendingChanges(self._pendingChanges);
      self._debugLog("Salvar", { pendingChanges: serialized, changedData: changedData });
      self._emitProperties({ pendingChanges: serialized });
      self._emitEvent("onSaveRequested", changedData);
    });
  }

  // detail do onSaveRequested: linhas alteradas (seleção ou medida) com endereço e medidas.
  // As chaves de "measures" seguem o valor do feed (comportamento mantido para scripts antigos).
  _buildChangedData() {
    var result = [];
    if (!this._metadata || !this._data) { return result; }
    var feed = this._metadata.feeds.measures ? this._metadata.feeds.measures.values : [];
    var changedRows = {};
    for (var lsKey in this._localSelections) {
      var lsRow = this._findRowIndexByDim0(lsKey);
      if (lsRow !== -1) { changedRows[lsRow] = true; }
    }
    for (var lmKey in this._localMeasures) { changedRows[lmKey] = true; }

    for (var ri in changedRows) {
      var rowIdx = parseInt(ri, 10);
      if (!this._data[rowIdx]) { continue; }
      var addrObj = this._buildRowAddrObj(rowIdx, null, true);
      var measures = {};
      var local = this._localMeasures[rowIdx] || {};
      for (var mkey in local) {
        var mv = feed[parseInt(mkey.replace("measures_", ""), 10)];
        measures[mv ? (typeof mv === "string" ? mv : (mv.id || mkey)) : mkey] = local[mkey];
      }
      result.push({ rowIndex: rowIdx, addrStr: this._serializeAddrObj(addrObj), measures: measures, address: addrObj });
    }
    return result;
  }
  // ─── Dynamic Styles ───────────────────────────────────────────
  _applyDynamicStyles() {
    // Altura da linha via variável CSS (cabeçalho, células, dropdown e input usam --dt-row-height)
    this.style.setProperty("--dt-row-height", (parseInt(this._rowHeight, 10) || 32) + "px");
    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    if (wrapper) {
      wrapper.style.fontFamily    = this._fontFamily;
      wrapper.style.fontSize      = this._fontSize;
      wrapper.style.fontWeight    = this._fontWeight;
      wrapper.style.fontStyle     = this._fontStyle;
      wrapper.style.textDecoration = this._textDecoration;
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  _render() {
    var self      = this;
    // Caches por render: opções podem ter mudado (binding, getMembers, painel)
    this._defaultMemberCache = {};
    this._memberLabelIndex = {};
    this._fallbackOptionsCache = {};
    var headerRow = this.shadowRoot.getElementById("dt-header");
    var tbody     = this.shadowRoot.getElementById("dt-body");
    var emptyMsg  = this.shadowRoot.getElementById("dt-empty");
    var titleEl   = this.shadowRoot.getElementById("dt-title");

    // Renderiza título
    if (titleEl) {
      if (this._tableTitle) {
        titleEl.textContent    = this._tableTitle;
        titleEl.style.color    = this._titleColor  || "#1d2d3e";
        titleEl.style.fontSize = this._titleSize   || "16px";
        titleEl.style.textAlign = this._titleAlign || "left";
        titleEl.classList.remove("hidden");
      } else {
        titleEl.classList.add("hidden");
      }
    }

    // Renderiza toolbar
    // Toolbar Fiori: título à esquerda e Salvar à direita; some só se não houver nenhum dos dois
    var toolbarEl = this.shadowRoot.getElementById("dt-toolbar");
    var saveBtnEl = this.shadowRoot.getElementById("dt-save-btn");
    if (saveBtnEl) { saveBtnEl.classList.toggle("hidden", !this._showSaveButton); }
    if (toolbarEl) {
      if (this._showSaveButton || this._tableTitle) { toolbarEl.classList.remove("hidden"); }
      else { toolbarEl.classList.add("hidden"); }
    }

    headerRow.innerHTML = "";
    tbody.innerHTML = "";

    if (!this._metadata || !this._data || this._data.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    var dimensions = this._metadata.feeds.dimensions.values;
    var measureFeed = this._metadata.feeds.measures ? this._metadata.feeds.measures.values : [];
    var measureKeys = [];
    var measureIds = [];
    for (var mvi = 0; mvi < measureFeed.length; mvi++) {
      measureKeys.push("measures_" + mvi);
      measureIds.push(this._getMeasureIdByKey("measures_" + mvi));
    }

    // ── Cabeçalho (setMeasureLabels sobrescreve os rótulos de medida a qualquer momento) ──
    var colMin = this._colWidth === "auto" ? null : this._colWidth + "px";
    for (var i = 0; i < dimensions.length; i++) {
      var th = document.createElement("th");
      th.textContent = this._dimLabels[i] || ("Dim " + i);
      th.style.minWidth  = colMin || "120px";
      th.style.textAlign = this._headerAlign || "left";
      headerRow.appendChild(th);
    }
    for (var j = 0; j < measureKeys.length; j++) {
      var thm = document.createElement("th");
      thm.textContent = this._measureLabels[j] || this._mesLabels[j] || ("Med " + j);
      thm.style.textAlign = this._headerAlign || "right";
      thm.style.minWidth  = colMin || "100px";
      headerRow.appendChild(thm);
    }

    // ── Filhos de cada nó no binding principal (opções e detecção de nós) ──
    var childrenByParent = {};
    for (var cbd = 0; cbd < dimensions.length; cbd++) {
      var cbdk = "dimensions_" + cbd;
      var byParent = {};
      var seenChild = {};
      for (var cbr = 0; cbr < this._data.length; cbr++) {
        var cbCell = this._data[cbr][cbdk];
        if (!cbCell || !cbCell.id || !cbCell.parentId || seenChild[cbCell.parentId + "\u0000" + cbCell.id]) { continue; }
        seenChild[cbCell.parentId + "\u0000" + cbCell.id] = true;
        if (!byParent[cbCell.parentId]) { byParent[cbCell.parentId] = []; }
        byParent[cbCell.parentId].push({ value: cbCell.id, label: cbCell.label || cbCell.id });
      }
      childrenByParent[cbdk] = byParent;
    }

    // ── Lista de linhas ──
    var renderList = [];
    var rendered = {};

    // Pré-seleciona por dimensions_0.id a linha com maior soma de medidas
    // Evita exibir linha zerada (ex: CLIENTE=0) quando existe linha com valor real (ex: SAPORE=6)
    var bestRowByDim0 = {};
    var combosByAccount = {};
    for (var br = 0; br < this._data.length; br++) {
      var brCell = this._data[br]["dimensions_0"] || {};
      if (!brCell.id) { continue; }
      // Soma todas as medidas disponíveis
      var brVal = 0;
      for (var bmk in this._data[br]) {
        if (bmk.indexOf("measures_") !== 0) { continue; }
        var brMes = this._data[br][bmk];
        if (brMes) {
          var brMesVal = brMes.raw !== null && brMes.raw !== undefined ? parseFloat(brMes.raw) : 0;
          if (!isNaN(brMesVal)) { brVal = brVal + Math.abs(brMesVal); }
        }
      }
      // Com "Incluir níveis-pai" no Builder cada conta vem com a linha do nó (total >= folha) e
      // linhas de folhas — inclusive sem valor ou com 0 (o "apagar" grava 0). Prioridade:
      // linha com dado → com valor ≠ 0 → com mais folhas (o valor gravado) → combinação salva
      // nesta sessão → maior valor. Sem dado nenhum: a de menos folhas (o nó).
      var brLeaves = 0;
      var brComboKey = "";
      for (var blk in this._data[br]) {
        if (blk.indexOf("dimensions_") !== 0 || blk === "dimensions_0") { continue; }
        var blCell = this._data[br][blk] || {};
        if (blCell.id && !this._isNodeId(blk, blCell.id, null) && this._cleanMemberId(blCell.id) !== "#") {
          brLeaves++;
          brComboKey = brComboKey + blk + "=" + blCell.id + ";";
        }
      }
      var brHasData = this._rowHasData(this._data[br]);
      var brNonZero = brVal > 0;
      var brSaved = this._savedSelections[brCell.id];
      var brMatchesSaved = false;
      if (brSaved) {
        brMatchesSaved = true;
        for (var bsk in brSaved) {
          if (!brSaved[bsk] || ((this._data[br][bsk] || {}).id !== brSaved[bsk].id)) { brMatchesSaved = false; break; }
        }
      }
      // Combinações completas com valor ≠ 0 por conta (mais de uma = dado inconsistente)
      if (brNonZero && brLeaves === dimensions.length - 1) {
        if (!combosByAccount[brCell.id]) { combosByAccount[brCell.id] = {}; }
        combosByAccount[brCell.id][brComboKey] = true;
      }
      var brBest = bestRowByDim0[brCell.id];
      var brWins;
      if (brBest === undefined) { brWins = true; }
      else if (brHasData !== brBest.hasData) { brWins = brHasData; }
      else if (!brHasData) { brWins = brLeaves < brBest.leaves; }
      else if (brNonZero !== brBest.nonZero) { brWins = brNonZero; }
      else if (brLeaves !== brBest.leaves) { brWins = brLeaves > brBest.leaves; }
      else if (brMatchesSaved !== brBest.matchesSaved) { brWins = brMatchesSaved; }
      else { brWins = brVal > brBest.val; }
      if (brWins) {
        bestRowByDim0[brCell.id] = { rowIndex: br, val: brVal, leaves: brLeaves, hasData: brHasData, nonZero: brNonZero, matchesSaved: brMatchesSaved };
      }
    }
    this._multiComboAccounts = {};
    for (var mca in combosByAccount) {
      var mcaCount = 0;
      for (var mck in combosByAccount[mca]) { mcaCount++; }
      if (mcaCount > 1) { this._multiComboAccounts[mca] = mcaCount; }
    }

    for (var rl = 0; rl < this._data.length; rl++) {
      var rlCell = this._data[rl]["dimensions_0"] || {};
      if (!rlCell.id || rendered[rlCell.id]) { continue; }
      // Pula se não for a linha preferida para essa conta
      if (bestRowByDim0[rlCell.id] && bestRowByDim0[rlCell.id].rowIndex !== rl) { continue; }

      var hasPidDot = rlCell.parentId && rlCell.parentId.indexOf(".&[") !== -1;

      if (!rlCell.parentId || !hasPidDot) {
        renderList.push({ type: "header", label: rlCell.label || "", rowIndex: rl });
        rendered[rlCell.id] = true;
      } else {
        var hasKids = childrenByParent["dimensions_0"] && childrenByParent["dimensions_0"][rlCell.id] && childrenByParent["dimensions_0"][rlCell.id].length > 0;
        if (hasKids) {
          renderList.push({ type: "subheader", label: rlCell.label || "", rowIndex: rl });
          rendered[rlCell.id] = true;
        } else {
          renderList.push({ type: "row", rowIndex: rl });
          rendered[rlCell.id] = true;
        }
      }
    }

    // Subgrupos de netos (ex: FINANCEIRO > MÁQUINA DE CARTÃO > máquinas): em vez de uma linha por
    // filho, uma linha só com um dropdown para escolher qual filho visualizar (modo sem script)
    if (this._isExplicitDropdownMode()) {
      var sgChildren = {};
      var sgNested = {};
      for (var sgi = 0; sgi < renderList.length; sgi++) {
        var sgItem = renderList[sgi];
        var sgCell = this._data[sgItem.rowIndex]["dimensions_0"] || {};
        if (!sgCell.parentId) { continue; }
        if (sgItem.type === "row") {
          if (!sgChildren[sgCell.parentId]) { sgChildren[sgCell.parentId] = []; }
          sgChildren[sgCell.parentId].push(sgItem.rowIndex);
        } else if (sgItem.type === "subheader") {
          sgNested[sgCell.parentId] = true;
        }
      }
      var sgConsumed = {};
      var sgList = [];
      for (var sgj = 0; sgj < renderList.length; sgj++) {
        var sgIt = renderList[sgj];
        if (sgIt.type === "row" && sgConsumed[sgIt.rowIndex]) { continue; }
        sgList.push(sgIt);
        if (sgIt.type !== "subheader") { continue; }
        var sgId = (this._data[sgIt.rowIndex]["dimensions_0"] || {}).id;
        var sgKids = sgChildren[sgId];
        if (!sgKids || sgKids.length < 2 || sgNested[sgId]) { continue; }
        for (var sgk = 0; sgk < sgKids.length; sgk++) { sgConsumed[sgKids[sgk]] = true; }
        sgList.push({ type: "subgroupSelect", parentId: sgId, children: sgKids });
      }
      renderList = sgList;
    }

    var totalCols = dimensions.length + measureKeys.length;
    var self2 = this;

    var renderRow = function(ri) {
      var rowData = self2._data[ri];
      var tr = document.createElement("tr");
      tr.dataset.rowIndex = ri;

      var firstDimCell = rowData["dimensions_0"] || {};
      var isParentRow = firstDimCell.isCollapsed === true;
      if (isParentRow) { tr.classList.add("dt-parent-row"); }

      for (var di2 = 0; di2 < dimensions.length; di2++) {
        var dim2  = dimensions[di2];
        var dk2   = "dimensions_" + di2;
        var td    = document.createElement("td");
        var cData = rowData[dk2] || {};

        var dim0ForKey = rowData["dimensions_0"] || {};
        var rowKey0 = dim0ForKey.id || String(ri);
        var localSelection = self2._localSelections && self2._localSelections[rowKey0] ? self2._localSelections[rowKey0][dk2] : null;

        var cLbl = cData.label || cData.id || "";
        var cId  = cData.id || "";
        // ID original do binding (para highlight correto ao abrir dropdown)
        var bindingId = (rowData[dk2] || {}).id || "";

        var nodeId = bindingId; // id do binding principal (normalmente o nó pai) — base dos filhos
        var dimIdx2 = parseInt(dk2.replace("dimensions_", ""), 10);

        // Valor gravado: setRowValues (script) ou valuesBinding (Builder)
        var rowValue = dk2 !== "dimensions_0" ? self2._getRowValue(rowData, dimIdx2) : null;
        if (rowValue) {
          cId = rowValue.id;
          bindingId = rowValue.id;
          cLbl = rowValue.label;
        }

        // Seleção já salva (aguardando o modelo) e seleção local pendente têm prioridade
        var savedSelection = self2._savedSelections && self2._savedSelections[rowKey0] ? self2._savedSelections[rowKey0][dk2] : null;
        var shownSelection = localSelection || savedSelection;
        if (shownSelection) {
          cData = shownSelection;
          cLbl = cData.label || cData.id || "";
          cId = cData.id || "";
          // Preserva bindingId original — necessário para localizar children/opts
        }

        if (!cLbl && cId) {
          var idClean = cId.match(/\.&\[([^\]]+)\]$/);
          if (idClean) { cLbl = idClean[1]; }
        }

        var isDrop = di2 !== 0 && self2._isDropdownDimension(dk2, dim2.id);
        var opts = isDrop ? self2._resolveDropdownOptions(dk2, [cId, bindingId, nodeId], childrenByParent) : [];
        var hasRowValueMap = dk2 !== "dimensions_0" && self2._getRowValuesString(rowKey0) !== "";

        if (self2._isExplicitDropdownMode()) {
          // Modo explícito (painel): a dimensão marcada é dropdown em toda linha de dados.
          // Célula ainda no nó pai, sem valor gravado nem seleção → membro padrão ("NÃO APLICAVEL"),
          // ou "Selecionar..." se ele não existir nas opções
          // (folha numa linha sem valor também não é valor gravado)
          if (isDrop && !rowValue && !shownSelection && (!cId || !self2._rowHasData(rowData) || self2._isNodeId(dk2, cId, childrenByParent))) {
            // Mesma busca usada no endereço (_buildRowAddrObj): tela e gravação sempre iguais
            var defMember = self2._getDefaultMember(dk2, [nodeId], null);
            cLbl = defMember ? defMember.label : "";
            if (defMember) { cId = defMember.value; }
          }
        } else {
          // Modo legado: dropdown só onde há filhos ou valor gravado
          var cellHasChildren = self2._isNodeId(dk2, cId, childrenByParent) || self2._isNodeId(dk2, bindingId, childrenByParent)
            || self2._isNodeId(dk2, nodeId, childrenByParent);
          if (isDrop && !cellHasChildren && !hasRowValueMap) { isDrop = false; }
          if (isDrop && (!opts || opts.length === 0) && !hasRowValueMap) { isDrop = false; }
        }

        if (isDrop) {
          self2._buildDropdownCell(td, ri, dk2, cLbl, bindingId || cId, opts);
        } else {
          // dimensions_0 — plain cell WITH right-click context menu
          var sp = document.createElement("span");
          sp.className = "cell-plain";
          sp.textContent = cLbl;
          // Conta com mais de uma combinação gravada (valor ≠ 0): só uma aparece aqui
          var multiCombo = di2 === 0 ? (self2._multiComboAccounts[cId] || 0) : 0;
          if (multiCombo) {
            var badge = document.createElement("span");
            badge.className = "dt-multi-combo";
            badge.textContent = "⚠";
            badge.title = "Esta conta tem " + multiCombo + " combinações de dimensões com valor gravado; só uma aparece na tabela. Verifique e zere as demais.";
            sp.appendChild(badge);
          }
          sp.style.cursor    = "context-menu";
          sp.style.textAlign = self2._cellAlign || "left";
          sp.title = "Clique direito para opções";

          // Capture values at construction time via closure
          (function(spanEl, rowIdx, dimKey, mId, mLabel, dimRealId) {
            spanEl.addEventListener("contextmenu", function(e) {
              e.preventDefault();
              e.stopPropagation();
              self2._closeDropdown();
              self2._openCtxMenu(e, rowIdx, dimKey, mId, mLabel, dimRealId, spanEl);
            });
          })(sp, ri, dk2, cId, cLbl, dim2.id || dk2);

          td.appendChild(sp);
        }
        tr.appendChild(td);
      }

      // Células de medida. O endereço da linha é o mesmo para todas as medidas: calculado uma vez
      var visualAddrStr = self2._buildRowAddrStr(ri, null, true);
      for (var mi2 = 0; mi2 < measureKeys.length; mi2++) {
        var mk2  = measureKeys[mi2];
        var tdm  = document.createElement("td");
        tdm.className = "dt-mcell";
        tdm.setAttribute("data-row-index", ri);
        tdm.setAttribute("data-measure-key", mk2);
        var measureRowKey = self2._createRowKey(visualAddrStr, measureIds[mi2]);
        var mvVal = self2._formatMeasureCell(rowData[mk2]);
        if (self2._originalData[measureRowKey] === undefined) { self2._originalData[measureRowKey] = mvVal; }
        if (self2._localData[measureRowKey]) { mvVal = self2._localData[measureRowKey].value; }
        var input = document.createElement("input");
        input.type = "text";
        input.value = mvVal;
        input.className = "dt-measure-input"; // hover/foco pelo CSS; fundo do foco = cor de edição do painel
        input.addEventListener("keydown", function(e) {
          // Delete com várias células selecionadas: dispara o evento e não apaga o input focado
          if (e.key === "Delete" && self2._selectedCells.length > 1) {
            e.preventDefault();
            self2._dispatchCellsDelete();
            return;
          }
          self2._handleArrowNavigation(e, e.target);
        });

        (function(inputEl, rowIdx, measureKey, measureId) {
          inputEl.addEventListener("change", function() { self2._onMeasureChange(inputEl, rowIdx, measureKey, measureId); });
        })(input, ri, mk2, measureIds[mi2]);

        tdm.appendChild(input);
        tr.appendChild(tdm);
      }

      // Gravação que falhou no último save: linha destacada até salvar de novo
      if (self2._failedRows && self2._failedRows[firstDimCell.id || String(ri)]) { tr.classList.add("dt-row-failed"); }
      // Bloqueio por regra de negócio (CLIENTE → 0; tudo NÃO APLICÁVEL → sem valores)
      self2._applyRowLock(ri, tr);

      tbody.appendChild(tr);
    };

    for (var ri2 = 0; ri2 < renderList.length; ri2++) {
      var item = renderList[ri2];
      if (item.type === "header") {
        var trH = document.createElement("tr");
        var tdH = document.createElement("td");
        tdH.colSpan = totalCols;
        tdH.className = "dt-group-cell";
        trH.classList.add("dt-group-header");
        tdH.textContent = item.label;
        trH.appendChild(tdH);
        tbody.appendChild(trH);
      } else if (item.type === "subheader") {
        var trSH = document.createElement("tr");
        var tdSH = document.createElement("td");
        tdSH.colSpan = totalCols;
        tdSH.className = "dt-subgroup-cell";
        trSH.classList.add("dt-subheader");
        tdSH.textContent = item.label;
        trSH.appendChild(tdSH);
        tbody.appendChild(trSH);
      } else if (item.type === "subgroupSelect") {
        self2._renderSubgroupSelect(item, renderRow, bestRowByDim0);
      } else {
        renderRow(item.rowIndex);
      }
    }
  }

  // Linha única do subgrupo de netos: a coluna da conta vira dropdown dos filhos e o restante
  // da linha mostra dimensões e medidas do filho escolhido (só troca a visualização; nada é movido)
  _renderSubgroupSelect(item, renderRow, bestRowByDim0) {
    var self = this;
    var kids = item.children;

    // Filhos com valor ≠ 0 (para o padrão, o rótulo da lista e o alerta)
    var withValue = {};
    var withValueLabels = [];
    for (var i = 0; i < kids.length; i++) {
      var kCell = this._data[kids[i]]["dimensions_0"] || {};
      var best = bestRowByDim0[kCell.id];
      if (best && best.nonZero) { withValue[kids[i]] = true; withValueLabels.push(kCell.label || kCell.id); }
    }

    // Escolhido: o da sessão → o que tem valor → o primeiro
    var selRi = -1;
    var savedId = this._subgroupSelection[item.parentId];
    for (var s = 0; s < kids.length && selRi === -1; s++) {
      if (((this._data[kids[s]]["dimensions_0"] || {}).id) === savedId) { selRi = kids[s]; }
    }
    for (var v = 0; v < kids.length && selRi === -1; v++) {
      if (withValue[kids[v]]) { selRi = kids[v]; }
    }
    if (selRi === -1) { selRi = kids[0]; }

    renderRow(selRi);
    var tbody = this.shadowRoot.getElementById("dt-body");
    var tr = tbody.lastElementChild;
    if (!tr) { return; }
    tr.classList.add("dt-subgroup-row");

    var selCell = this._data[selRi]["dimensions_0"] || {};
    var options = [];
    for (var o = 0; o < kids.length; o++) {
      var oc = this._data[kids[o]]["dimensions_0"] || {};
      options.push({ value: oc.id, label: (oc.label || oc.id) + (withValue[kids[o]] && kids[o] !== selRi ? "  — com valor" : "") });
    }

    var td0 = tr.firstElementChild;
    td0.innerHTML = "";
    var inner = document.createElement("div");
    inner.className = "dt-subgroup-inner";
    td0.appendChild(inner);
    var wrapper = this._buildDropdownCell(inner, selRi, "dimensions_0", selCell.label || selCell.id, selCell.id, options, function(opt) {
      self._subgroupSelection[item.parentId] = opt.value;
      self._render();
    });
    wrapper.title = "Escolha qual conta deste grupo visualizar";
    // Menu de contexto (adicionar/excluir membro) continua valendo para a conta escolhida
    wrapper.addEventListener("contextmenu", function(e) {
      e.preventDefault();
      e.stopPropagation();
      self._closeDropdown();
      self._openCtxMenu(e, selRi, "dimensions_0", selCell.id, selCell.label || selCell.id, self._dimRealId("dimensions_0"), wrapper);
    });

    // Mais de um filho com valor: alerta (o esperado é um só)
    if (withValueLabels.length > 1) {
      var badge = document.createElement("span");
      badge.className = "dt-multi-combo dt-subgroup-warn";
      badge.textContent = "⚠";
      badge.title = "Mais de uma conta deste grupo tem valor: " + withValueLabels.join(", ");
      inner.appendChild(badge);
    }
  }

  // Texto exibido numa célula de medida: valor formatado do SAC (sem sufixo de unidade) ou bruto
  _formatMeasureCell(mv) {
    if (!mv) { return ""; }
    if (mv.formattedValue !== undefined && mv.formattedValue !== null && String(mv.formattedValue) !== "") {
      return String(mv.formattedValue);
    }
    if (mv.formatted !== undefined && mv.formatted !== null && String(mv.formatted) !== "" && mv.formatted !== "NaN") {
      return String(mv.formatted).replace(/[a-zA-Z]+$/, "").trim(); // "1.593,95BRL" → "1.593,95"
    }
    if (mv.raw !== null && mv.raw !== undefined && String(mv.raw) !== "NaN" && String(mv.raw) !== "null") {
      return String(mv.raw);
    }
    return "";
  }

  // Edição de uma célula de medida: registra a alteração pendente e avisa o SAC
  _onMeasureChange(inputEl, rowIdx, measureKey, measureId) {
    var self = this;
    var rawInputValue = inputEl.value;
    var newVal = this._parseLocaleNumber(rawInputValue);
    if (isNaN(newVal)) { newVal = 0; }
    // Valor canônico para o SAC; input vazio continua indo vazio
    var pendingVal = rawInputValue.trim() === "" ? "" : String(newVal);
    if (!this._localMeasures[rowIdx]) { this._localMeasures[rowIdx] = {}; }
    this._localMeasures[rowIdx][measureKey] = newVal;

    var rowAddrObj = this._buildRowAddrObj(rowIdx, null, true);
    var addrStr = this._serializeAddrObj(rowAddrObj);
    // address do evento: dimensões do binding, sobrepostas pelo endereço efetivo da linha
    var addrObj = {};
    var rowData = this._data[rowIdx] || {};
    var count = this._metadata.feeds.dimensions.values.length;
    for (var x = 0; x < count; x++) {
      var dc = rowData["dimensions_" + x] || {};
      if (dc.id) { addrObj[this._dimRealId("dimensions_" + x)] = dc.id; }
    }
    for (var rak in rowAddrObj) { addrObj[rak] = rowAddrObj[rak]; }

    this._setLocalCellValue(addrStr, measureId, rawInputValue);
    if (inputEl.parentElement) { inputEl.parentElement.classList.add("changed-cell"); }

    this._measureChangeValue     = String(newVal);
    this._changedValue           = rawInputValue;
    this._measureChangeMeasureId = measureId;
    this._measureChangeRowIndex  = String(rowIdx);
    this._measureChangeAddrStr   = addrStr;
    this._oldRowAddrStr          = addrStr;
    this._newRowAddrStr          = addrStr;
    this._addPendingChange({ type: "measure", rowIndex: rowIdx, oldAddr: addrStr, newAddr: addrStr, value: pendingVal, measureId: measureId });

    this._emitProperties({
      measureChangeValue:     String(newVal),
      changedValue:           rawInputValue,
      measureChangeMeasureId: measureId,
      measureChangeRowIndex:  String(rowIdx),
      measureChangeAddrStr:   addrStr,
      pendingChanges:         this._serializePendingChanges(this._pendingChanges)
    });
    this._emitEvent("onMeasureChanged", { rowIndex: rowIdx, measureId: measureId, value: newVal, address: addrObj });
  }

  // Setas movem o foco entre inputs e dropdowns da tabela (grade linha × coluna)
  _handleArrowNavigation(e, el) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") { return; }
    e.preventDefault();
    var all = Array.prototype.slice.call(this.shadowRoot.querySelectorAll("tbody input, tbody .cell-dropdown"));
    var idx = all.indexOf(el);
    if (idx === -1) { return; }
    var row = el.closest("tr");
    var colCount = row ? row.querySelectorAll("input, .cell-dropdown").length : 1;
    var next = idx;
    if (e.key === "ArrowDown")  { next = idx + colCount; }
    if (e.key === "ArrowUp")    { next = idx - colCount; }
    if (e.key === "ArrowRight") { next = idx + 1; }
    if (e.key === "ArrowLeft")  { next = idx - 1; }
    if (next >= 0 && next < all.length) {
      this._closeDropdown();
      all[next].focus();
    }
  }

  _dispatchCellsDelete() {
    var cells = [];
    for (var i = 0; i < this._selectedCells.length; i++) {
      cells.push({ rowIndex: this._selectedCells[i].rowIndex, measureKey: this._selectedCells[i].measureKey });
    }
    this._clearSelection();
    this.dispatchEvent(new CustomEvent("onCellsDeleteRequested", { bubbles: true, composed: true, detail: { cells: cells } }));
  }

  // propertiesChanged: o SAC atualiza as propriedades lidas pelos getters com "body" no JSON
  _emitProperties(props) {
    this.dispatchEvent(new CustomEvent("propertiesChanged", { bubbles: true, composed: true, detail: { properties: props } }));
  }

  // Evento do widget em microtask: garante que o SAC já processou o propertiesChanged anterior
  _emitEvent(name, detail) {
    var self = this;
    Promise.resolve().then(function() {
      self.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: detail }));
    });
  }

  // ─── Dropdown cell ────────────────────────────────────────────
  // onPick (opcional): ação ao escolher um item; sem ele, troca o valor da dimensão (_selectValue)
  _buildDropdownCell(td, rowIndex, dimensionId, currentLabel, currentId, options, onPick) {
    var self    = this;
    var wrapper = document.createElement("div");
    wrapper.className = "cell-dropdown";
    wrapper.tabIndex  = 0;
    // Aplica alinhamento via justify-content
    var align = self._cellAlign || "left";
    if (align === "center") { wrapper.style.justifyContent = "center"; }
    else if (align === "right") { wrapper.style.justifyContent = "flex-end"; }
    else { wrapper.style.justifyContent = "flex-start"; }

    var valueSpan = document.createElement("span");
    valueSpan.className = currentLabel ? "cell-value" : "cell-value empty";
    valueSpan.textContent = currentLabel || "Selecionar...";
    valueSpan.style.textAlign = self._cellAlign || "left";

    var arrow = document.createElement("span");
    arrow.className = "cell-arrow";
    // Chevron fino (slim-arrow-down do Fiori)
    arrow.innerHTML = '<svg viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    wrapper.appendChild(valueSpan);
    wrapper.appendChild(arrow);

    wrapper.addEventListener("click", function(e) {
      e.stopPropagation();
      var effectiveId = wrapper._currentId !== undefined ? wrapper._currentId : currentId;
      self._openDropdown(wrapper, rowIndex, dimensionId, effectiveId, options, onPick);
    });
    wrapper.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wrapper.click(); }
      if (e.key === "Escape") { self._closeDropdown(); }
      self._handleArrowNavigation(e, wrapper);
    });

    td.appendChild(wrapper);
    return wrapper;
  }

  _openDropdown(cellEl, rowIndex, dimensionId, currentId, options, onPick) {
    var self = this;
    this._closeDropdown();
    if (!options) { options = []; }

    cellEl.classList.add("active");
    this._activeCell = cellEl;

    var list = this.shadowRoot.getElementById("dt-dropdown");
    list.innerHTML = "";
    list.classList.remove("hidden");

    // Extrai ID limpo para comparação (ex: "[DIM].[HIER].&[Mensal]" → "Mensal")
    var cleanCurrentId = currentId;
    var cleanMatch = currentId ? currentId.match(/\.&\[([^\]]+)\]$/) : null;
    if (cleanMatch) { cleanCurrentId = cleanMatch[1]; }

    var filteredOptions = [];
    for (var fi = 0; fi < options.length; fi++) {
      var opt = options[fi];
      var val = (opt.value || "").toLowerCase();
      if (this._cleanMemberId(opt.value).toUpperCase() === "ROOT") { continue; }
      filteredOptions.push(opt);
    }
    if (filteredOptions.length === 0) {
      var emptyItem = document.createElement("div");
      emptyItem.className = "dt-dropdown-item dt-dropdown-empty";
      emptyItem.textContent = "Sem opções — configure o childrenBinding ou o valuesBinding";
      list.appendChild(emptyItem);
    }

    for (var i = 0; i < filteredOptions.length; i++) {
      (function(opt) {
        // Extrai ID limpo da opção para comparação
        var cleanOptId = opt.value;
        var optMatch = opt.value ? opt.value.match(/\.&\[([^\]]+)\]$/) : null;
        if (optMatch) { cleanOptId = optMatch[1]; }

        var isSelected = cleanOptId === cleanCurrentId || opt.value === currentId;
        var item = document.createElement("div");
        item.className = isSelected ? "dt-dropdown-item selected" : "dt-dropdown-item";
        item.textContent = opt.label;
        item.addEventListener("mousedown", function(e) {
          e.preventDefault();
          if (onPick) { self._closeDropdown(); onPick(opt); return; }
          self._selectValue(rowIndex, dimensionId, opt.value, opt.label);
          self._closeDropdown();
        });
        list.appendChild(item);
      })(filteredOptions[i]);
    }

    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    var wrapperRect = wrapper.getBoundingClientRect();
    var cellRect = cellEl.getBoundingClientRect();

    var listW = Math.max(cellRect.width, 160);
    var left  = cellRect.left - wrapperRect.left + wrapper.scrollLeft;
    var top   = cellRect.bottom - wrapperRect.top + wrapper.scrollTop;

    var listH = Math.min(Math.max(filteredOptions.length, 1) * 32 + 8, 264); // itens de 32px (popover Fiori)
    if (cellRect.bottom + listH > window.innerHeight - 8) {
      top = cellRect.top - wrapperRect.top + wrapper.scrollTop - listH - 2;
    }

    list.style.position = "absolute";
    list.style.left     = left + "px";
    list.style.top      = top  + "px";
    list.style.minWidth = listW + "px";

  }

  _closeDropdown() {
    var list = this.shadowRoot.getElementById("dt-dropdown");
    if (list) { list.classList.add("hidden"); list.innerHTML = ""; }
    if (this._activeCell) { this._activeCell.classList.remove("active"); this._activeCell = null; }
  }

  // ─── Troca de valor no dropdown de dimensão ───────────────────
  _selectValue(rowIndex, dimensionId, memberId, memberLabel) {
    this._previousCellData = JSON.parse(JSON.stringify(this._selectedCellData));
    this._selectedCellData = { row: rowIndex, dimensionId: dimensionId, memberId: memberId, memberLabel: memberLabel };
    this._oldRowAddrStr = this._buildRowAddrStr(rowIndex, null, true);

    var technicalId = this._resolveTechnicalId(dimensionId, memberId, memberLabel);
    var cellWrapper = this._activeCell;

    // Nó de hierarquia / placeholder (modo legado) não é seleção válida: volta o valor anterior
    if (this._isPlaceholderSelection(memberId, memberLabel, technicalId)) {
      if (cellWrapper) {
        var prev = this._previousCellData || {};
        var prevSpan = cellWrapper.querySelector(".cell-value");
        if (prevSpan) { prevSpan.textContent = prev.memberLabel || "Selecionar..."; }
        cellWrapper._currentId = prev.memberId || "";
        cellWrapper.classList.remove("changed-cell");
      }
      return;
    }

    var dim0Key = this._rowKey(rowIndex);
    if (!this._localSelections[dim0Key]) { this._localSelections[dim0Key] = {}; }
    this._localSelections[dim0Key][dimensionId] = { id: technicalId, label: memberLabel };
    this._selectionRowIndex[dim0Key] = rowIndex;

    if (cellWrapper) {
      var valSpan = cellWrapper.querySelector(".cell-value");
      if (valSpan) { valSpan.textContent = memberLabel; valSpan.className = "cell-value"; }
      cellWrapper._currentId = technicalId;
      cellWrapper.classList.add("changed-cell");
    }

    var override = { dimensionId: dimensionId, memberId: technicalId };
    var targetObj = this._buildRowAddrObj(rowIndex, override, true);
    var newAddr = this._serializeAddrObj(targetObj);
    this._newRowAddrStr = newAddr;
    var change = this._registerDropdownMove(rowIndex, this._oldRowAddrStr, newAddr, targetObj);

    // Responsabilidade CLIENTE trava/mostra 0; sair de tudo NÃO APLICÁVEL libera as medidas
    this._applyRowLock(rowIndex);

    this._changedValue           = change.value;
    this._measureChangeValue     = String(change.value || "");
    this._measureChangeMeasureId = change.measureId;
    this._measureChangeRowIndex  = String(rowIndex);
    this._measureChangeAddrStr   = newAddr;
    this._emitProperties({
      selectedCellData:       JSON.stringify(this._selectedCellData),
      changedValue:           this._changedValue,
      measureChangeValue:     this._measureChangeValue,
      measureChangeMeasureId: change.measureId,
      measureChangeRowIndex:  String(rowIndex),
      measureChangeAddrStr:   newAddr,
      pendingChanges:         this._serializePendingChanges(this._pendingChanges)
    });
    this._emitEvent("onDropdownChanged", this._selectedCellData);
  }

  // Alterações pendentes da troca de combinação. Move só as medidas que têm valor (zera a
  // combinação antiga). Linha sem valor nenhum só registra a escolha (noMove). Destino num membro
  // sem valor (ex: CLIENTE): todas as medidas vão a 0, inclusive as vazias.
  // Retorna {value, measureId} da primeira medida registrada (para measureChange*).
  _registerDropdownMove(rowIndex, oldAddr, newAddr, targetObj) {
    var targetPairs = [];
    for (var tk in targetObj) { targetPairs.push({ dim: tk, member: targetObj[tk] }); }
    this._memberLabelIndex = {};
    var noValueTarget = this._isNoValueAddress(targetPairs);

    var feedCount = this._metadata.feeds.measures ? this._metadata.feeds.measures.values.length : 0;
    var keys = [];
    for (var k = 0; k < feedCount; k++) { keys.push("measures_" + k); }
    if (keys.length === 0) {
      for (var first in (this._localMeasures[rowIndex] || {})) { keys.push(first); break; }
      if (keys.length === 0) { keys.push("measures_0"); }
    }

    var result = null;
    for (var i = 0; i < keys.length; i++) {
      var measureId = this._getMeasureIdByKey(keys[i]);
      var value = this._getRowMeasureValue(rowIndex, keys[i]);
      if (value === "") { value = this._toCanonicalNumber(this._getCurrentLocalValue(oldAddr, measureId)); }
      if (value === "") {
        if (noValueTarget) {
          this._addPendingChange({ type: "dropdown", rowIndex: rowIndex, noMove: true, oldAddr: oldAddr, newAddr: newAddr, value: "", measureId: measureId });
          if (!result) { result = { value: "", measureId: measureId }; }
        }
        continue;
      }
      this._setLocalCellValue(newAddr, measureId, value);
      this._addPendingChange({ type: "dropdown", rowIndex: rowIndex, oldAddr: oldAddr, newAddr: newAddr, value: value, measureId: measureId });
      if (!result || result.value === "") { result = { value: value, measureId: measureId }; }
    }
    if (!result) {
      var firstId = this._getMeasureIdByKey(keys[0]);
      this._addPendingChange({ type: "dropdown", rowIndex: rowIndex, noMove: true, oldAddr: oldAddr, newAddr: newAddr, value: "", measureId: firstId });
      result = { value: "", measureId: firstId };
    }
    return result;
  }

  // ID técnico do membro ([DIM].[HIER].&[ID]): valor da opção → opções/childrenBinding por
  // rótulo → montado a partir do metadata da dimensão
  _resolveTechnicalId(dimensionId, memberId, memberLabel) {
    var isTechnical = function(id) { return !!id && id.indexOf(".&[") !== -1; };
    if (isTechnical(memberId)) { return memberId; }
    var candidates = [];
    if (this._dropdownOptions[dimensionId]) { candidates.push(this._dropdownOptions[dimensionId]); }
    var cfb = this._childrenFromBinding[dimensionId] || {};
    for (var p in cfb) { candidates.push(cfb[p]); }
    for (var c = 0; c < candidates.length; c++) {
      for (var o = 0; o < candidates[c].length; o++) {
        var opt = candidates[c][o];
        if ((opt.label && opt.label === memberLabel) || (opt.value && opt.value === memberId)) {
          if (isTechnical(opt.value)) { return opt.value; }
        }
      }
    }
    var dimMeta = this._metadata && this._metadata.dimensions ? this._metadata.dimensions[dimensionId] : null;
    if (dimMeta && dimMeta.id) {
      var hier = dimMeta.hierarchies && dimMeta.hierarchies[0] ? dimMeta.hierarchies[0].id : (dimMeta.id + "_H1");
      return "[" + dimMeta.id + "].[" + hier + "].&[" + this._cleanMemberId(memberId || memberLabel) + "]";
    }
    return memberId;
  }

  // Rótulos de nós usados como placeholder no modo legado (não são membros selecionáveis)
  _isPlaceholderSelection(memberId, memberLabel, technicalId) {
    var placeholders = ["RESPONSAVEL", "Periodos", "FONTE", "Selecionar...", "RESPONSABILIDADE", "PERIODICIDADE", "DESCRICAO_DA_CONTA"];
    for (var i = 0; i < placeholders.length; i++) {
      if (memberLabel === placeholders[i] || memberId === placeholders[i] || technicalId === placeholders[i]) { return true; }
    }
    return false;
  }
}

if (!customElements.get(DT_TAG)) {
  customElements.define(DT_TAG, DropdownTableWidget);
}

})();
