// dropdown-table-widget.js — v2.13.0
// Changelog:
//   v2.13.0  — Feature: dropdowns sem script — dimensões marcadas no painel (modo explícito),
//              valuesBinding (Builder) substitui setRowValues/tabela espelho, getMembers() da
//              DataSource como fonte extra de opções, modo diagnóstico no console
//              Fix: save não reenvia linhas já salvas (seleções viram _savedSelections)
//              Fix: deduplicação e fingerprint consideram todas as medidas/dimensões
//   v2.12.0  — Fix: parse numerico pt-BR (1.593,95 / 1.500); pendingChanges com valor canonico
//              Fix: onSaveRequested inclui linhas alteradas por dropdown (chave de _localSelections)
//              Fix: troca de contexto volta a limpar estado local apos o primeiro save
//              Fix: dt-empty oculto de fato; cellAlign aplicado; revert de placeholder
//              Fix: pendingChanges sem duplicatas (A→B→C colapsa em A→C)
//              Refactor: endereco da linha centralizado em _buildRowAddrObj; remove codigo morto
//              Fix: escopo isolado (IIFE) e tag configuravel via ?tag= na URL — permite carregar
//                   duas versoes na mesma pagina (ex: PROD + DEV) sem "already declared"
//   v2.11.25 — Fix: dt-empty hidden por padrao
//   v2.11.24 — Fix: input focus restaurado; Delete funciona em selecao multipla
//   v2.11.23 — Feature: loading spinner overlay durante carregamento do binding
//   v2.11.22 — Feature: save button label configurável via style panel
//   v2.11.21 — Feature: save button cores configuráveis via style panel
//   v2.11.20 — Feature: group header e subheader cores configuráveis via style panel
//   v2.11.19 — Fix: remove changed-cell do render; cor so aplicada em acao do usuario

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
  :host { display: block; font-family: Arial, sans-serif; position: relative; box-sizing: border-box; }
  .dt-wrapper { width: 100%; height: 100%; overflow: auto; box-sizing: border-box; position: relative; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }

  thead tr { background: var(--header-color, #1a73e8); }

  .dt-group-header td { background: var(--group-header-bg, #f0f4ff) !important; color: var(--group-header-color, #1a3a6e) !important; }
  .dt-subheader td { background: var(--subheader-bg, #e8f0fe) !important; color: var(--subheader-color, #1a3a6e) !important; }
  thead th {
    color: var(--header-text-color, #ffffff);
    background: var(--header-color, #1a73e8);
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    border: 1px solid rgba(255,255,255,0.2);
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  tbody tr { border-bottom: 1px solid #e0e0e0; }
  tbody tr:hover td { background: var(--hover-row-color, #f5f5f5); }
  tbody td {
    padding: 0;
    color: var(--table-text-color, #333333);
    border-right: 1px solid #e0e0e0;
    height: 36px;
    vertical-align: middle;
    background: #fff;
  }

  .cell-plain {
    padding: 0 12px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 36px;
  }

  .cell-dropdown {
    position: relative;
    display: flex;
    align-items: center;
    height: 36px;
    cursor: pointer;
    user-select: none;
    box-sizing: border-box;
  }
  .cell-dropdown:hover { background: rgba(26,115,232,0.06); }
  .cell-dropdown.active { outline: 2px solid #1a73e8; outline-offset: -2px; }
  .cell-value {
    flex: 1;
    padding: 0 28px 0 12px;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--table-text-color, #333333);
  }
  .cell-value.empty { color: #aaa; font-style: italic; }
  .cell-arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    pointer-events: none;
    color: #888;
  }

  .dt-dropdown-list {
    position: absolute;
    background: #ffffff;
    border: 1px solid #dadce0;
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    z-index: 99999;
    min-width: 160px;
    max-height: 220px;
    overflow-y: auto;
    padding: 4px 0;
  }
  .dt-dropdown-list.hidden { display: none; }
  .dt-dropdown-item {
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
    color: #333;
    white-space: nowrap;
  }
  .dt-dropdown-item:hover { background: #f1f3f4; }
  .dt-dropdown-item.selected {
    background: var(--dropdown-highlight-color, #e8f0fe);
    color: #1a73e8;
    font-weight: 600;
  }

  .dt-loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    gap: 12px;
  }
  .dt-loading-overlay.hidden { display: none; }
  .dt-spinner {
    width: 36px;
    height: 36px;
    border: 4px solid #e0e0e0;
    border-top-color: #1a73e8;
    border-radius: 50%;
    animation: dt-spin 0.7s linear infinite;
  }
  @keyframes dt-spin {
    to { transform: rotate(360deg); }
  }
  .dt-loading-text {
    font-size: 13px;
    color: #555;
    font-family: Arial, sans-serif;
  }
  .dt-title {
    padding: 8px 12px 6px 12px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }
  .dt-title.hidden { display: none; }

  .dt-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 6px 12px;
    flex-shrink: 0;
  }
  .dt-toolbar.hidden { display: none; }
  .dt-save-btn {
    background: var(--save-btn-bg, #1a73e8);
    color: var(--save-btn-color, #fff);
    border: none;
    border-radius: 4px;
    padding: 7px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: Arial, sans-serif;
  }
  .dt-save-btn:hover { background: var(--save-btn-hover-bg, #1557b0); }
  .dt-save-btn:active { background: #0e4191; }
  .dt-empty { padding: 16px; color: #888; text-align: center; font-size: 13px; }

  /* Avisos de regra de negócio */
  .dt-notice { margin: 0 12px 6px 12px; padding: 7px 12px; border-radius: 4px; font-size: 12px; flex-shrink: 0; }
  .dt-notice.hidden { display: none; }
  .dt-notice.warn  { background: #fff4e5; color: #8a4b00; border-left: 3px solid #f29900; }
  .dt-notice.error { background: #fdecea; color: #a52714; border-left: 3px solid #e53935; }
  .dt-notice.info  { background: #e8f0fe; color: #1a3a6e; border-left: 3px solid #1a73e8; }
  tbody tr.dt-row-failed td { background: #fdecea !important; }
  tbody tr.dt-row-failed td:first-child { box-shadow: inset 3px 0 0 #e53935; }
  input.dt-locked { background: #f1f3f4 !important; color: #888 !important; cursor: not-allowed !important; }
  .dt-multi-combo { color: #c26401; font-weight: 700; margin-left: 6px; cursor: help; }
  .dt-empty.hidden { display: none; }
  .dt-measure-cell-selected {
    outline: 2px solid #1a73e8 !important;
    outline-offset: -2px;
    background: #e8f0fe !important;
  }
  .changed-cell {
    background: #fff3cd !important;
    border: 1px solid #ffc107 !important;
  }
  .changed-cell input,
  .changed-cell .cell-dropdown,
  .changed-cell .cell-plain {
    background: #fff3cd !important;
  }

  .dt-outer { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; box-sizing: border-box; }
  .dt-wrapper { width: 100%; flex: 1; overflow: auto; box-sizing: border-box; position: relative; }

  /* ── Context Menu ─────────────────────────────────────────────── */
  .dt-ctx-menu {
    position: absolute;
    background: #1e2530;
    border: 1px solid #3a4250;
    border-radius: 4px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.35);
    z-index: 999999;
    min-width: 200px;
    padding: 4px 0;
    font-size: 13px;
  }
  .dt-ctx-menu.hidden { display: none; }
  .dt-ctx-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    color: #e8eaf0;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
  }
  .dt-ctx-item:hover { background: #1a73e8; color: #fff; }
  .dt-ctx-item svg { flex-shrink: 0; opacity: 0.85; }
  .dt-ctx-separator { height: 1px; background: #3a4250; margin: 4px 0; }

  /* ── Add Member Modal ─────────────────────────────────────────── */
  .dt-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 9999998;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dt-modal-backdrop.hidden { display: none; }
  .dt-modal {
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.28);
    width: 420px;
    max-width: 95vw;
    font-family: Arial, sans-serif;
    overflow: hidden;
  }
  .dt-modal-header {
    background: #1a73e8;
    color: #fff;
    padding: 14px 20px;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dt-modal-body { padding: 20px; }
  .dt-modal-info {
    background: #e8f0fe;
    border-left: 3px solid #1a73e8;
    padding: 9px 13px;
    font-size: 12px;
    color: #1a3a6e;
    border-radius: 3px;
    margin-bottom: 16px;
  }
  .dt-modal-field { margin-bottom: 14px; }
  .dt-modal-field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #555;
    margin-bottom: 5px;
  }
  .dt-modal-field input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;
  }
  .dt-modal-field input:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.15); }
  .dt-modal-field input.error { border-color: #e53935; }
  .dt-modal-error { font-size: 11px; color: #e53935; margin-top: 4px; display: none; }
  .dt-modal-error.visible { display: block; }
  .dt-modal-footer {
    padding: 12px 20px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .dt-btn {
    padding: 8px 18px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    outline: none;
  }
  .dt-btn-cancel { background: #f1f3f4; color: #444; }
  .dt-btn-cancel:hover { background: #e2e5e9; }
  .dt-btn-confirm { background: #1a73e8; color: #fff; }
  .dt-btn-confirm:hover { background: #1557b0; }
  .dt-btn-confirm:disabled { background: #b0c8f5; cursor: not-allowed; }
</style>
<div class="dt-outer" id="dt-outer">
  <div class="dt-title hidden" id="dt-title"></div>
  <div class="dt-notice hidden" id="dt-notice"></div>
  <div class="dt-toolbar hidden" id="dt-toolbar">
    <button class="dt-save-btn" id="dt-save-btn">Salvar</button>
  </div>
  <div class="dt-wrapper" id="dt-wrapper">
  <table id="dt-table">
    <thead><tr id="dt-header"></tr></thead>
    <tbody id="dt-body"></tbody>
  </table>
  <div class="dt-empty hidden" id="dt-empty">Nenhum dado disponível</div>
  <div class="dt-loading-overlay hidden" id="dt-loading-overlay">
    <div class="dt-spinner"></div>
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

<!-- Add Member Modal -->
<div class="dt-modal-backdrop hidden" id="dt-modal-backdrop">
  <div class="dt-modal" id="dt-modal">
    <div class="dt-modal-header">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="white" stroke-width="1.5"/><path d="M5 8h6M8 5v6" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
      Adicionar membro
    </div>
    <div class="dt-modal-body">
      <div class="dt-modal-info">
        O novo membro será criado permanentemente na dimensão do modelo de planejamento.
      </div>
      <div class="dt-modal-field">
        <label for="dt-input-id">ID do membro <span style="color:#e53935">*</span></label>
        <input id="dt-input-id" type="text" placeholder="Ex: CONTA_001" autocomplete="off" />
        <div class="dt-modal-error" id="dt-error-id">ID do membro é obrigatório.</div>
      </div>
      <div class="dt-modal-field">
        <label for="dt-input-desc">Descrição <span style="color:#e53935">*</span></label>
        <input id="dt-input-desc" type="text" placeholder="Ex: Nova conta de despesa" autocomplete="off" />
        <div class="dt-modal-error" id="dt-error-desc">Descrição é obrigatória.</div>
      </div>
      <div class="dt-modal-field">
        <label for="dt-input-parent">Hierarquia (parentId)</label>
        <input id="dt-input-parent" type="text" placeholder="Ex: MULTAS_CONTRATUAIS" autocomplete="off" />
        <div style="font-size:11px;color:#888;margin-top:3px;">ID do nó pai na hierarquia. Deixe vazio para raiz.</div>
      </div>
    </div>
    <div class="dt-modal-footer">
      <button class="dt-btn dt-btn-cancel" id="dt-modal-cancel">Cancelar</button>
      <button class="dt-btn dt-btn-confirm" id="dt-modal-confirm">Criar</button>
    </div>
  </div>
</div>
`;

class DropdownTableWidget extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(TMPL.content.cloneNode(true));

    this._dropdownDimensions = [];
    this._dropdownOptions = {};
    this._selectedCellData = {};
    this._previousCellData = {};
    this._activeFilters = {};
    this._activeCell = null;
    this._metadata = null;
    this._data = null;
    this._localSelections = {};
    this._localMeasures = {};
    this._measureLabels = [];
    this._lastAddMemberRequest = {};
    this._deleteMemberId          = "";
    this._deleteMemberDimensionId = "";
    this._rowValuesMap = {};
    this._selectedCells  = []; // [{rowIndex, measureKey, tdEl}]
    this._selAnchor      = null; // {rowIndex, measureKey}
    this._isDragging     = false;
    this._skipHighlightRenders = 0;
    this._skipUntil = 0;
    this._selectionRowIndex = {}; // {dim0Id: rowIndex} da ultima selecao de dropdown
    this._savedSelections = {};   // seleções já salvas — mantêm o visual até o modelo atualizar
    this._autoRowValuesMap = null; // montado a partir do valuesBinding
    this._rowValueLabels = {};
    this._valuesLeaves = {};
    this._dsMembers = {};
    this._dsMembersRequested = false;
    this._explicitDropdownDims = []; // styleConfig.dropdownDimensions (painel)
    this._debugMode = false;
    this._emptyDefaultLabel = "NÃO APLICAVEL"; // membro inicial quando a célula não tem valor
    // Regras de gravação (painel → Gravação) — substituem a lógica do script onSaveRequested
    this._writeHierarchies = {}; // {DIM: "HIERARQUIA"} da tabela usada no setUserInput
    // {DIM: ["CLIENTE", ...]} membros que gravam 0 em todas as medidas (padrão: responsabilidade do cliente)
    this._noValueMembers = { RESPONSABILIDADE: ["CLIENTE"] };
    this._deleteValue = "0";     // valor enviado para "apagar" — setUserInput recusa vazio (Preenchimento obrigatório)
    this._writes = [];           // lista montada por getWriteCount()
    this._availableDimensions = "[]";
    this._dataFingerprint = undefined;
    this._oldRowAddrStr = "";
    this._newRowAddrStr = "";
    this._changedValue = "";
    this._pendingChanges = [];
    this._localData = {};
    this._originalData = {};

    // Style properties
    this._rowHeight        = 36;
    this._colWidth         = "auto";
    this._fontFamily       = "Arial, sans-serif";
    this._fontSize         = "13px";
    this._fontWeight       = "normal";
    this._fontStyle        = "normal";
    this._textDecoration   = "none";
    this._editableCellColor = "#fffbe6";
    this._showUnit         = "none";
    this._tableTitle       = "";
    this._titleColor       = "#1a73e8";
    this._titleSize        = "16px";
    this._headerAlign      = "left";
    this._cellAlign        = "left";
    this._titleAlign       = "left";

    this._showSaveButton = true;

    // Context menu state
    this._ctxTarget = null; // {rowIndex, dimensionId, memberId, memberLabel, dimensionName}

    this._onDocClick    = this._closeDropdown.bind(this);
    this._onDocCtxClose = this._closeCtxMenu.bind(this);
    this._onDocMouseUp  = function() { this._isDragging = false; }.bind(this);
  }

  connectedCallback() {
    document.addEventListener("click", this._onDocClick);
    document.addEventListener("click", this._onDocCtxClose);
    document.addEventListener("mouseup", this._onDocMouseUp);
    this._bindContextMenu();
    this._bindModal();
    this._bindSelectionKeys();
    this._bindSaveButton();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onDocClick);
    document.removeEventListener("click", this._onDocCtxClose);
    document.removeEventListener("mouseup", this._onDocMouseUp);
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
  onCustomWidgetBeforeUpdate(c) {}
  onCustomWidgetAfterUpdate(changedProperties) {
    if (changedProperties && "myDataBinding" in changedProperties) {
      var dataBinding = changedProperties.myDataBinding;
      if (dataBinding && dataBinding.state !== "success") {
        this._showLoading();
        return;
      }
      if (dataBinding && dataBinding.state === "success") {
        this._processDataBinding(dataBinding);
        return;
      }
    }
    if (changedProperties && ("childrenBinding" in changedProperties || "valuesBinding" in changedProperties)) {
      this._processChildrenBinding();
      this._processValuesBinding();
      this._render();
      return;
    }
    // Detecta mudança de filtro externo via setDimensionFilter()
    if (changedProperties && ("dimensionFilterId" in changedProperties || "dimensionFilterMembers" in changedProperties)) {
      this._applyExternalFilter();
      return;
    }
    this._loadBinding();
  }
  onCustomWidgetResize(w, h) { this.style.width = w + "px"; this.style.height = h + "px"; }
  onCustomWidgetDestroy() {
    document.removeEventListener("click", this._onDocClick);
    document.removeEventListener("click", this._onDocCtxClose);
    document.removeEventListener("mouseup", this._onDocMouseUp);
  }

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
      if (!dataBinding || !dataBinding.metadata || !dataBinding.data) return;

      // Detecta troca de contexto comparando IDs de todas as linhas
      // (todas as dimensões e medidas de cada linha)
      var newFingerprint = "";
      if (dataBinding.data && dataBinding.data.length > 0) {
        for (var fpi = 0; fpi < dataBinding.data.length; fpi++) {
          var fpRow = dataBinding.data[fpi];
          for (var fpk in fpRow) {
            var fpCell = fpRow[fpk] || {};
            if (fpk.indexOf("dimensions_") === 0) {
              newFingerprint = newFingerprint + (fpCell.id || "") + ";";
            } else if (fpk.indexOf("measures_") === 0) {
              newFingerprint = newFingerprint + (fpCell.raw !== undefined ? String(fpCell.raw) : (fpCell.formattedValue || "")) + ";";
            }
          }
          newFingerprint = newFingerprint + "|";
        }
      }
      // Janela pós-save: protege no máximo 2 bindings e 15s após clearPendingChanges
      var inSaveWindow = this._skipHighlightRenders > 0 && Date.now() < this._skipUntil;
      if (this._skipHighlightRenders > 0) { this._skipHighlightRenders--; }
      if (this._dataFingerprint !== undefined && this._dataFingerprint !== newFingerprint) {
        if (!inSaveWindow) {
          // Troca real de contexto (ex: mudança de cliente) — limpa estado local
          var discarded = (this._pendingChanges || []).length;
          if (discarded > 0) {
            this._showNotice(discarded + (discarded === 1 ? " alteração não salva foi descartada" : " alterações não salvas foram descartadas") + " na troca de contexto.", "warn");
            var discardedSelf = this;
            Promise.resolve().then(function() {
              discardedSelf.dispatchEvent(new CustomEvent("onPendingChangesDiscarded", {
                bubbles: true, composed: true, detail: { count: discarded }
              }));
            });
          }
          this._failedRows        = {};
          this._localSelections   = {};
          this._localMeasures     = {};
          this._pendingChanges    = [];
          this._localData         = {};
          this._originalData      = {};
          this._selectionRowIndex = {};
          this._savedSelections   = {};
          this._debugLog("Troca de contexto detectada — estado local limpo");
        }
      }
      this._dataFingerprint = newFingerprint;

      var meta = dataBinding.metadata;
      var dimLabels = [];
      var mesLabels = [];

      // ── Dimension labels — follow PlanifyIT pattern ──
      var dims = meta.feeds ? meta.feeds.dimensions : null;
      var dimValues = dims ? dims.values : [];
      for (var di = 0; di < dimValues.length; di++) {
        var dv = dimValues[di];
        var firstRow = dataBinding.data[0];
        var firstCell = firstRow ? firstRow["dimensions_" + di] : null;
        var dimLabel = "";
        if (firstCell && firstCell.parentId) {
          var m = firstCell.parentId.match(/^\[([^\]]+)\]/);
          if (m) { dimLabel = m[1].replace(/_/g, " "); }
        }
        if (!dimLabel && firstCell && firstCell.id) {
          var m4 = firstCell.id.match(/^\[([^\]]+)\]/);
          if (m4) { dimLabel = m4[1].replace(/_/g, " "); }
        }
        if (!dimLabel && firstCell && firstCell.label && firstCell.isCollapsed) {
          dimLabel = firstCell.label;
        }
        if (!dimLabel) {
          if (typeof dv === "object") {
            dimLabel = dv.description || dv.label || dv.id || ("Dim " + di);
          } else {
            dimLabel = "Dim " + di;
          }
        }
        dimLabels.push(dimLabel);
      }

      // ── Measure labels ──
      var measMeta = meta.mainStructureMembers || (meta.feeds && meta.feeds.measures) || null;
      var measValues = [];
      if (measMeta) {
        if (Array.isArray(measMeta)) {
          measValues = measMeta;
        } else if (measMeta.values) {
          measValues = measMeta.values;
        } else if (typeof measMeta === "object") {
          for (var mk in measMeta) {
            if (measMeta[mk] !== undefined) { measValues.push(measMeta[mk]); }
          }
        }
      }

      for (var mi = 0; mi < measValues.length; mi++) {
        var mv = measValues[mi];
        var mesLabel = "";
        if (this._measureLabels && this._measureLabels[mi]) {
          mesLabel = this._measureLabels[mi];
        } else if (typeof mv === "object" && mv !== null) {
          mesLabel = mv.label || mv.description || mv.id || ("Med " + mi);
        } else {
          mesLabel = "Med " + mi;
        }
        mesLabels.push(mesLabel);
      }

      // Build _mesIds: real technical IDs for measures (separate from display labels)
      var mesIds = [];
      for (var mii = 0; mii < measValues.length; mii++) {
        var miv = measValues[mii];
        if (typeof miv === "string") { mesIds.push(miv); }
        else if (miv && miv.id) { mesIds.push(miv.id); }
        else { mesIds.push("measures_" + mii); }
      }

      this._metadata = meta;
      this._metadata._dimLabels = dimLabels;
      this._metadata._mesLabels = mesLabels;
      this._metadata._mesIds    = mesIds;
      this._metadata._measCount = mesLabels.length;
      this._data = dataBinding.data;

      // Nós de hierarquia vistos no binding (isNode/isCollapsed ou pai de outra célula) — nunca são opção.
      // As demais células (membros gravados, ex: "Anual", "RH") viram opção de último recurso.
      this._bindingNodeIds = {};
      var leafCandidates = {};
      for (var nr = 0; nr < dataBinding.data.length; nr++) {
        for (var nk in dataBinding.data[nr]) {
          var ncell = dataBinding.data[nr][nk];
          if (nk.indexOf("dimensions_") !== 0 || nk === "dimensions_0" || !ncell || !ncell.id) { continue; }
          if (!this._bindingNodeIds[nk]) { this._bindingNodeIds[nk] = {}; }
          if (ncell.isNode === true || ncell.isCollapsed === true) { this._bindingNodeIds[nk][ncell.id] = true; }
          if (ncell.parentId) { this._bindingNodeIds[nk][ncell.parentId] = true; }
          if (!leafCandidates[nk]) { leafCandidates[nk] = {}; }
          leafCandidates[nk][ncell.id] = ncell.label || this._cleanMemberId(ncell.id);
        }
      }
      this._bindingLeaves = {};
      for (var lk in leafCandidates) {
        this._bindingLeaves[lk] = {};
        for (var lid in leafCandidates[lk]) {
          if (this._bindingNodeIds[lk][lid] || this._cleanMemberId(lid) === "#") { continue; }
          this._bindingLeaves[lk][lid] = leafCandidates[lk][lid];
        }
      }

      this._debugLog("myDataBinding", {
        dimensions: meta.dimensions, feeds: meta.feeds, mainStructureMembers: meta.mainStructureMembers,
        rows: dataBinding.data.length, firstRows: dataBinding.data.slice(0, 3)
      });

      this._processChildrenBinding();
      this._processValuesBinding();
      this._publishAvailableDimensions();
      this._render();
      this._hideLoading();
      this._loadDataSourceMembers();
    } catch(e) { console.error("DropdownTable _processDataBinding:", e); }
  }

  _processChildrenBinding() {
    try {
      var cb = this.childrenBinding;
      if (!cb || !cb.data || cb.data.length === 0) return;
      if (!this._metadata) return;

      var dims = this._metadata.feeds.dimensions.values;
      this._childrenFromBinding = {};

      for (var di = 0; di < dims.length; di++) {
        var dk = "dimensions_" + di;
        this._childrenFromBinding[dk] = {};
        for (var r = 0; r < cb.data.length; r++) {
          var cell = cb.data[r][dk];
          if (cell && cell.id && cell.parentId) {
            var pid = cell.parentId;
            if (!this._childrenFromBinding[dk][pid]) {
              this._childrenFromBinding[dk][pid] = [];
            }
            var exists = false;
            for (var ex = 0; ex < this._childrenFromBinding[dk][pid].length; ex++) {
              if (this._childrenFromBinding[dk][pid][ex].value === cell.id) { exists = true; break; }
            }
            if (!exists) {
              this._childrenFromBinding[dk][pid].push({ value: cell.id, label: cell.label || cell.id });
            }
          }
        }
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
      if (!vb || !vb.data || !this._metadata || !this._metadata.feeds) { return; }
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
    // Último recurso: membros gravados vistos no valuesBinding e no binding principal (sem nós)
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
    if (!this._defaultMemberCache) { this._defaultMemberCache = {}; }
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
      var labels = this._metadata._dimLabels || [];
      var list = [];
      for (var i = 0; i < count; i++) {
        var key = "dimensions_" + i;
        list.push({ key: key, id: this._dimRealId(key), label: labels[i] || this._dimRealId(key) });
      }
      var str = JSON.stringify(list);
      if (str === this._availableDimensions) { return; }
      this._availableDimensions = str;
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        bubbles: true, composed: true,
        detail: { properties: { availableDimensions: str } }
      }));
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
              if (clean === "#" || /root/i.test(clean) || self._isNodeId(t.key, mem.id, null)) { continue; }
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
  set styleConfig(v) {
    try { this.applyStyleConfig(v); } catch(e) { console.error("styleConfig set error:", e); }
  }

  applyStyleConfig(v) {
    try {
      var cfg = typeof v === "string" ? JSON.parse(v) : v;
      if (cfg.headerColor)       { this.style.setProperty("--header-color", cfg.headerColor); }
      if (cfg.headerTextColor)   { this.style.setProperty("--header-text-color", cfg.headerTextColor); }
      if (cfg.hoverRowColor)     { this.style.setProperty("--hover-row-color", cfg.hoverRowColor); }
      if (cfg.tableTextColor)    { this.style.setProperty("--table-text-color", cfg.tableTextColor); }
      if (cfg.editableCellColor) { this._editableCellColor = cfg.editableCellColor; }
      if (cfg.rowHeight)         { this._rowHeight = cfg.rowHeight; }
      if (cfg.colWidth)          { this._colWidth = cfg.colWidth; }
      if (cfg.fontFamily)        { this._fontFamily = cfg.fontFamily; }
      if (cfg.fontSize)          { this._fontSize = cfg.fontSize; }
      if (cfg.fontWeight)        { this._fontWeight = cfg.fontWeight; }
      if (cfg.fontStyle)         { this._fontStyle = cfg.fontStyle; }
      if (cfg.textDecoration)    { this._textDecoration = cfg.textDecoration; }
      if (cfg.showUnit)          { this._showUnit = cfg.showUnit; }
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
      if (cfg.groupHeaderBg    !== undefined) { this.style.setProperty("--group-header-bg",    cfg.groupHeaderBg); }
      if (cfg.groupHeaderColor !== undefined) { this.style.setProperty("--group-header-color", cfg.groupHeaderColor); }
      if (cfg.subheaderBg      !== undefined) { this.style.setProperty("--subheader-bg",       cfg.subheaderBg); }
      if (cfg.subheaderColor   !== undefined) { this.style.setProperty("--subheader-color",    cfg.subheaderColor); }
      if (cfg.saveBtnBg        !== undefined) { this.style.setProperty("--save-btn-bg",       cfg.saveBtnBg); }
      if (cfg.saveBtnColor     !== undefined) { this.style.setProperty("--save-btn-color",    cfg.saveBtnColor); }
      if (cfg.saveBtnHoverBg   !== undefined) { this.style.setProperty("--save-btn-hover-bg", cfg.saveBtnHoverBg); }
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
  set pendingChanges(v) {
    // Eco do próprio propertiesChanged: mantém os objetos (rowIndex/noMove não vão na string)
    if (typeof v === "string" && v === this._serializePendingChanges(this._pendingChanges)) { return; }
    if (typeof v === "string") {
      this._pendingChanges = this._parsePendingChangesString(v);
    } else if (Array.isArray(v)) {
      this._pendingChanges = v;
    } else {
      this._pendingChanges = [];
    }
  }

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
    if (!this._memberLabelIndex) { this._memberLabelIndex = {}; }
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
  clearPendingChanges() {
    // Gravações que falharam (setWriteResult(i, false)) continuam pendentes e destacadas
    var keepSources = {};
    var writes = this._writes || [];
    for (var wi = 0; wi < writes.length; wi++) {
      if (!writes[wi].failed) { continue; }
      for (var si = 0; si < writes[wi].sources.length; si++) { keepSources[writes[wi].sources[si]] = true; }
    }
    var kept = [];
    var keptRows = {}; // chave da linha (id de dimensions_0) → true
    for (var pi = 0; pi < (this._pendingChanges || []).length; pi++) {
      if (!keepSources[pi]) { continue; }
      var keptChange = this._pendingChanges[pi];
      kept.push(keptChange);
      var keptRowData = this._data && keptChange.rowIndex !== undefined ? this._data[keptChange.rowIndex] : null;
      keptRows[keptRowData ? ((keptRowData["dimensions_0"] || {}).id || String(keptChange.rowIndex)) : String(keptChange.rowIndex)] = true;
    }
    this._writes = [];
    this._failedRows = keptRows;
    if (kept.length > 0) {
      this._showNotice(kept.length + (kept.length === 1 ? " alteração não foi gravada" : " alterações não foram gravadas") + " — as linhas destacadas continuam pendentes. Corrija e salve de novo.", "error");
    }

    this._pendingChanges = kept;
    if (kept.length === 0) {
      this._localData = {};
      this._originalData = {};
    }
    // Save confirmado: seleções viram "salvas" (só visual/endereço até o modelo atualizar)
    // e saem do rastreio de alterações — o próximo save não reenvia estas linhas.
    if (!this._savedSelections) { this._savedSelections = {}; }
    var stillLocal = {};
    for (var sk in this._localSelections) {
      if (keptRows[sk]) { stillLocal[sk] = this._localSelections[sk]; continue; }
      if (!this._savedSelections[sk]) { this._savedSelections[sk] = {}; }
      for (var sd in this._localSelections[sk]) { this._savedSelections[sk][sd] = this._localSelections[sk][sd]; }
    }
    this._localSelections = stillLocal;
    var stillMeasures = {};
    for (var lm in this._localMeasures) {
      var lmRow = this._data && this._data[lm] ? ((this._data[lm]["dimensions_0"] || {}).id || String(lm)) : String(lm);
      if (keptRows[lmRow]) { stillMeasures[lm] = this._localMeasures[lm]; }
    }
    this._localMeasures = stillMeasures;
    this._selectionRowIndex = {};
    this._skipHighlightRenders = 2; // protege até 2 bindings após save...
    this._skipUntil = Date.now() + 15000; // ...dentro de 15s
    // Reseta cor de todas as células alteradas para transparente (cor natural da tabela)
    var changedCells = this.shadowRoot.querySelectorAll(".changed-cell");
    for (var cc = 0; cc < changedCells.length; cc++) {
      changedCells[cc].classList.remove("changed-cell");
      changedCells[cc].style.background = "transparent";
      changedCells[cc].style.border = "";
    }
    this.dispatchEvent(new CustomEvent("propertiesChanged", {
      bubbles: true, composed: true,
      detail: { properties: { pendingChanges: this._serializePendingChanges(this._pendingChanges) } }
    }));
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
  clearMeasureInput() {
    var rowIdx = parseInt(this._measureChangeRowIndex || "0", 10);
    var measureKey = "measures_0";
    if (this._measureChangeMeasureId !== "") {
      var measFeed = this._metadata ? (this._metadata.feeds.mainStructureMembers || this._metadata.feeds.measures) : null;
      var measValues = measFeed ? measFeed.values : [];
      for (var cx = 0; cx < measValues.length; cx++) {
        var mv = measValues[cx];
        var mid = (typeof mv === "string") ? mv : (mv.id || mv.feedKey || "measures_" + cx);
        if (mid === this._measureChangeMeasureId) { measureKey = "measures_" + cx; break; }
      }
    }
    if (this._localMeasures && this._localMeasures[rowIdx]) {
      delete this._localMeasures[rowIdx][measureKey];
    }
    // Limpa o input diretamente no DOM sem re-renderizar (evita loop)
    var rows = this.shadowRoot.querySelectorAll("tbody tr[data-row-index='" + rowIdx + "']");
    for (var ri = 0; ri < rows.length; ri++) {
      var inputs = rows[ri].querySelectorAll("input");
      var mIdx = parseInt(measureKey.replace("measures_", ""), 10);
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
  set rowHeight(v) { this._rowHeight = parseInt(v, 10) || 36; this._render(); }
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
  getDeleteMemberIdClean() {
    var raw = this._deleteMemberId || "";
    if (raw === "") { return ""; }
    // Extrai ID do formato [DIM].[HIER].&[ID] ou [DIM].&[ID]
    var match = raw.match(/\.&\[([^\]]+)\]$/);
    if (match) { return match[1]; }
    // Fallback: retorna o raw se não tiver o padrão
    return raw;
  }
  getDeleteMemberDimensionId() { return this._deleteMemberDimensionId || ""; }
  getNewMemberId()          { return this.getAttribute("data-new-member-id")     || ""; }
  getNewMemberDescription() { return this.getAttribute("data-new-member-desc")   || ""; }
  getNewMemberParentId()    { return this.getAttribute("data-new-member-parent") || ""; }
  getNewMemberDimensionId() { return this.getAttribute("data-new-member-dim")    || ""; }
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
    if (this._localMeasures && this._localMeasures[rowIndex] && this._localMeasures[rowIndex][measureKey] !== undefined) {
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
  _getMeasureIdByKey(measureKey) {
    var fallback = measureKey || "measures_0";
    var mIdx = parseInt(fallback.replace("measures_", ""), 10);
    // Tenta resolver pelo mainStructureMembers direto (sem feeds) primeiro
    if (this._metadata && this._metadata.mainStructureMembers) {
      var msmKeys = [];
      for (var msmK in this._metadata.mainStructureMembers) { msmKeys.push(msmK); }
      if (!isNaN(mIdx) && mIdx < msmKeys.length) {
        var msmEntry = this._metadata.mainStructureMembers[msmKeys[mIdx]];
        if (msmEntry && msmEntry.id) { return msmEntry.id; }
        if (typeof msmEntry === "string") { return msmEntry; }
      }
    }
    var measFeed = this._metadata ? (this._metadata.feeds.mainStructureMembers || this._metadata.feeds.measures) : null;
    var measValues = measFeed ? measFeed.values : [];
    var mv = !isNaN(mIdx) ? measValues[mIdx] : null;
    if (mv) { return typeof mv === "string" ? mv : (mv.id || fallback); }
    // Fallback 1: _mesIds — IDs tecnicos reais das medidas
    if (this._metadata && this._metadata._mesIds && this._metadata._mesIds[mIdx] && this._metadata._mesIds[mIdx].indexOf("measures_") === -1) {
      return this._metadata._mesIds[mIdx];
    }
    // Fallback 2: _mesLabels
    if (this._metadata && this._metadata._mesLabels && this._metadata._mesLabels[mIdx]) {
      return this._metadata._mesLabels[mIdx];
    }
    return fallback;
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
    if (this._originalData && this._originalData[rowKey] !== undefined) {
      return this._originalData[rowKey];
    }
    return "";
  }
  _setLocalCellValue(addrStr, measureId, value) {
    var rowKey = this._createRowKey(addrStr, measureId);
    if (!this._localData) { this._localData = {}; }
    this._localData[rowKey] = {
      value: value,
      changed: true
    };
    return rowKey;
  }
  _getFirstChangedMeasureKey(rowIndex) {
    if (this._localMeasures && this._localMeasures[rowIndex]) {
      for (var fck in this._localMeasures[rowIndex]) { return fck; }
    }
    return "measures_0";
  }
  _addPendingChange(change) {
    if (!this._pendingChanges) { this._pendingChanges = []; }
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
  _parsePendingChangesString(value) {
    var result = [];
    if (!value || typeof value !== "string") { return result; }
    var records = value.split("###");
    for (var ri = 0; ri < records.length; ri++) {
      var record = records[ri];
      if (!record) { continue; }
      var parts = record.split("§");
      if (parts.length < 4) { continue; }
      result.push({
        oldAddr: parts[0],
        newAddr: parts[1],
        value: parts[2],
        measureId: parts[3]
      });
    }
    return result;
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
  getActiveFilters() { return JSON.stringify(this._activeFilters); }

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

  // Permite que o script SAC aplique filtro de dimensão diretamente no binding
  // Ex: dropdowntable_1.setDimensionFilter("Date", "2024.01")
  // ou: dropdowntable_1.setDimensionFilter("Date", ["2024.01","2024.02"])
  // Compatibilidade com padrão SAC: widget.getDataSource().setDimensionFilter(...)
  getDataSource() {
    return this.myDataBinding;
  }

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

  _bindSelectionKeys() {
    var self = this;
    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    if (!wrapper) { return; }

    wrapper.setAttribute("tabindex", "0");

    wrapper.addEventListener("keydown", function(e) {
      // Delete — dispara evento com células selecionadas
      if (e.key === "Delete" && self._selectedCells.length > 0) {
        e.preventDefault();
        var cells = [];
        for (var sc = 0; sc < self._selectedCells.length; sc++) {
          cells.push({
            rowIndex:   self._selectedCells[sc].rowIndex,
            measureKey: self._selectedCells[sc].measureKey
          });
        }
        self.dispatchEvent(new CustomEvent("onCellsDeleteRequested", {
          bubbles: true, composed: true,
          detail: { cells: cells }
        }));
        self._clearSelection();
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
    var menu = this.shadowRoot.getElementById("dt-ctx-menu");

    this.shadowRoot.getElementById("ctx-add-member").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      self._openAddMemberModal();
    });

    this.shadowRoot.getElementById("ctx-filter-member").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      if (self._ctxTarget) {
        self.dispatchEvent(new CustomEvent("onFilterMemberRequested", {
          bubbles: true, composed: true,
          detail: {
            action: "filterMember",
            rowIndex:      self._ctxTarget.rowIndex,
            dimensionId:   self._ctxTarget.dimensionId,
            dimensionName: self._ctxTarget.dimensionName,
            memberId:      self._ctxTarget.memberId,
            memberLabel:   self._ctxTarget.memberLabel
          }
        }));
      }
    });

    this.shadowRoot.getElementById("ctx-filter").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      if (self._ctxTarget) {
        self.dispatchEvent(new CustomEvent("onFilterMemberRequested", {
          bubbles: true, composed: true,
          detail: {
            action: "filter",
            rowIndex:      self._ctxTarget.rowIndex,
            dimensionId:   self._ctxTarget.dimensionId,
            dimensionName: self._ctxTarget.dimensionName,
            memberId:      self._ctxTarget.memberId,
            memberLabel:   self._ctxTarget.memberLabel
          }
        }));
      }
    });

    this.shadowRoot.getElementById("ctx-exclude-member").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      if (self._ctxTarget) {
        var target = self._ctxTarget;
        var rawId = target.memberId || "";
        // Extrai ID limpo do formato [DIM].[HIER].&[ID]
        var cleanId = rawId;
        var match = rawId.match(/\.&\[([^\]]+)\]$/);
        if (match) { cleanId = match[1]; }

        // Extrai ID real da dimensão do metadata
        var dimRealId = target.dimensionRealId || "";
        if (!dimRealId || dimRealId.indexOf("dimensions_") !== -1) {
          try {
            var dimMeta2 = self._metadata && self._metadata.dimensions
              ? self._metadata.dimensions[target.dimensionId] : null;
            if (dimMeta2 && dimMeta2.id) { dimRealId = dimMeta2.id; }
          } catch(ex2) {}
        }

        self._deleteMemberId          = cleanId;
        self._deleteMemberDimensionId = dimRealId;

        self.dispatchEvent(new CustomEvent("propertiesChanged", {
          bubbles: true, composed: true,
          detail: {
            properties: {
              deleteMemberId:          self._deleteMemberId,
              deleteMemberDimensionId: self._deleteMemberDimensionId
            }
          }
        }));

        Promise.resolve().then(function() {
          self.dispatchEvent(new CustomEvent("onDeleteMemberRequested", {
            bubbles: true, composed: true,
            detail: {
              action:          "excludeMember",
              rowIndex:        target.rowIndex,
              dimensionId:     target.dimensionId,
              dimensionRealId: target.dimensionRealId,
              dimensionName:   target.dimensionName,
              memberId:        cleanId,
              memberLabel:     target.memberLabel
            }
          }));
        });
      }
    });

    this.shadowRoot.getElementById("ctx-exclude").addEventListener("mousedown", function(e) {
      e.stopPropagation();
      self._closeCtxMenu();
      if (self._ctxTarget) {
        self.dispatchEvent(new CustomEvent("onExcludeRowRequested", {
          bubbles: true, composed: true,
          detail: {
            action: "exclude",
            rowIndex:      self._ctxTarget.rowIndex,
            dimensionId:   self._ctxTarget.dimensionId,
            dimensionName: self._ctxTarget.dimensionName,
            memberId:      self._ctxTarget.memberId,
            memberLabel:   self._ctxTarget.memberLabel
          }
        }));
      }
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
      var idVal     = inputId.value.trim();
      var descVal   = inputDesc.value.trim();
      var parentVal = inputParent.value.trim();
      var valid     = true;

      if (idVal === "") {
        inputId.classList.add("error");
        errorId.classList.add("visible");
        valid = false;
      }
      if (descVal === "") {
        inputDesc.classList.add("error");
        errorDesc.classList.add("visible");
        valid = false;
      }
      if (!valid) { return; }

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
      self._selectedCellData     = payload;

      // Salva atributos no elemento host
      self.setAttribute("data-new-member-id",     idVal);
      self.setAttribute("data-new-member-desc",   descVal);
      self.setAttribute("data-new-member-parent", parentVal);
      self.setAttribute("data-new-member-dim",    realDimId);
      self.setAttribute("data-last-add-member",   JSON.stringify(payload));

      // Notifica SAC de TODOS os campos de uma vez via propertiesChanged
      self.dispatchEvent(new CustomEvent("propertiesChanged", {
        bubbles: true, composed: true,
        detail: {
          properties: {
            selectedCellData:     JSON.stringify(payload),
            lastAddMemberRequest: JSON.stringify(payload),
            newMemberId:          idVal,
            newMemberDescription: descVal,
            newMemberParentId:    parentVal
          }
        }
      }));

      self._closeModal();

      // Microtask garante que SAC processou propertiesChanged antes do evento
      Promise.resolve().then(function() {
        self.dispatchEvent(new CustomEvent("onAddMemberRequested", {
          bubbles: true, composed: true,
          detail: payload
        }));
      });
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

    backdrop.classList.remove("hidden");
    setTimeout(function() { inputId.focus(); }, 50);
  }

  _closeModal() {
    var backdrop = this.shadowRoot.getElementById("dt-modal-backdrop");
    backdrop.classList.add("hidden");
  }

  // ─── Save Button ──────────────────────────────────────────────
  _bindSaveButton() {
    var self = this;
    var btn = this.shadowRoot.getElementById("dt-save-btn");
    if (!btn) { return; }
    btn.addEventListener("click", function() {
      var changedData = self._buildChangedData();
      self._debugLog("Salvar", { pendingChanges: self._serializePendingChanges(self._pendingChanges), changedData: changedData });
      self.dispatchEvent(new CustomEvent("propertiesChanged", {
        bubbles: true, composed: true,
        detail: { properties: { pendingChanges: self._serializePendingChanges(self._pendingChanges) } }
      }));
      Promise.resolve().then(function() {
        self.dispatchEvent(new CustomEvent("onSaveRequested", {
          bubbles: true, composed: true,
          detail: changedData
        }));
      });
    });
  }

  _buildChangedData() {
    var result = [];
    if (!this._metadata || !this._data) { return result; }
    var dims = this._metadata.feeds.dimensions.values;
    var measFeed = this._metadata.feeds.mainStructureMembers || this._metadata.feeds.measures;
    var measValues = measFeed ? measFeed.values : [];

    var changedRows = {};
    // Coleta linhas com _localSelections (chave = id de dimensions_0 → resolve o rowIndex)
    if (this._localSelections) {
      for (var lsKey in this._localSelections) {
        var lsRow = this._findRowIndexByDim0(lsKey);
        if (lsRow !== -1) { changedRows[lsRow] = true; }
      }
    }
    // Coleta linhas com _localMeasures (chave = rowIndex)
    if (this._localMeasures) {
      for (var msi2 in this._localMeasures) { changedRows[msi2] = true; }
    }

    for (var ri in changedRows) {
      var rowIdx = parseInt(ri, 10);
      var rowData = this._data[rowIdx];
      if (!rowData) { continue; }

      var addrObj = this._buildRowAddrObj(rowIdx, null, true);
      var addrStr = this._serializeAddrObj(addrObj);

      // Medidas alteradas
      var measures = {};
      if (this._localMeasures && this._localMeasures[rowIdx]) {
        for (var mkey in this._localMeasures[rowIdx]) {
          var mIdx = parseInt(mkey.replace("measures_", ""), 10);
          var mv = measValues[mIdx];
          var mId = mv ? (typeof mv === "string" ? mv : (mv.id || mkey)) : mkey;
          measures[mId] = this._localMeasures[rowIdx][mkey];
        }
      }

      result.push({ rowIndex: rowIdx, addrStr: addrStr, measures: measures, address: addrObj });
    }
    return result;
  }

  // ─── Dynamic Styles ───────────────────────────────────────────
  _applyDynamicStyles() {
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
    this._defaultMemberCache = {}; // opções podem ter mudado (binding, getMembers, painel)
    this._memberLabelIndex = {};
    var headerRow = this.shadowRoot.getElementById("dt-header");
    var tbody     = this.shadowRoot.getElementById("dt-body");
    var emptyMsg  = this.shadowRoot.getElementById("dt-empty");
    var titleEl   = this.shadowRoot.getElementById("dt-title");

    // Renderiza título
    if (titleEl) {
      if (this._tableTitle) {
        titleEl.textContent    = this._tableTitle;
        titleEl.style.color    = this._titleColor  || "#1a73e8";
        titleEl.style.fontSize = this._titleSize   || "16px";
        titleEl.style.textAlign = this._titleAlign || "left";
        titleEl.classList.remove("hidden");
      } else {
        titleEl.classList.add("hidden");
      }
    }

    // Renderiza toolbar
    var toolbarEl = this.shadowRoot.getElementById("dt-toolbar");
    if (toolbarEl) {
      if (this._showSaveButton) { toolbarEl.classList.remove("hidden"); }
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
    var measFeed   = this._metadata.feeds.mainStructureMembers || this._metadata.feeds.measures;
    var measValues = measFeed ? measFeed.values : [];
    var measures   = [];
    for (var mvi = 0; mvi < measValues.length; mvi++) {
      var mv2 = measValues[mvi];
      if (typeof mv2 === "string") {
        // Tenta resolver o ID real da medida do mainStructureMembers
        var realMeasId = mv2;
        if (this._metadata.mainStructureMembers && this._metadata.mainStructureMembers[mv2]) {
          realMeasId = this._metadata.mainStructureMembers[mv2].id || mv2;
        }
        measures.push({ id: realMeasId, description: "", feedKey: mv2 });
      } else {
        measures.push(mv2);
      }
    }

    var dimLabels = this._metadata._dimLabels || [];
    var mesLabels = this._metadata._mesLabels || [];

    if (dimLabels.length === 0) {
      for (var dfl = 0; dfl < dimensions.length; dfl++) { dimLabels.push("Dim " + dfl); }
    }
    if (mesLabels.length === 0) {
      for (var mfl = 0; mfl < measures.length; mfl++) {
        mesLabels.push((this._measureLabels && this._measureLabels[mfl]) || "Med " + mfl);
      }
    }

    // ── Header ──────────────────────────────────────────────────
    for (var i = 0; i < dimLabels.length; i++) {
      var th = document.createElement("th");
      th.textContent = dimLabels[i];
      th.style.minWidth  = this._colWidth === "auto" ? "120px" : this._colWidth + "px";
      th.style.textAlign = this._headerAlign || "left";
      headerRow.appendChild(th);
    }
    for (var j = 0; j < mesLabels.length; j++) {
      var thm = document.createElement("th");
      thm.textContent = mesLabels[j];
      thm.style.textAlign = this._headerAlign || "right";
      thm.style.minWidth  = this._colWidth === "auto" ? "100px" : this._colWidth + "px";
      headerRow.appendChild(thm);
    }

    // ── Children map ─────────────────────────────────────────────
    var childrenByParent = {};
    var hasChildren = {};
    for (var cbd = 0; cbd < dimensions.length; cbd++) {
      var cbdk = "dimensions_" + cbd;
      childrenByParent[cbdk] = {};
      hasChildren[cbdk] = {};
      for (var cbr = 0; cbr < this._data.length; cbr++) {
        var cbCell = this._data[cbr][cbdk];
        if (cbCell && cbCell.id && cbCell.parentId) {
          var pid = cbCell.parentId;
          if (!childrenByParent[cbdk][pid]) { childrenByParent[cbdk][pid] = []; }
          var alreadyIn = false;
          for (var chi = 0; chi < childrenByParent[cbdk][pid].length; chi++) {
            if (childrenByParent[cbdk][pid][chi].value === cbCell.id) { alreadyIn = true; break; }
          }
          if (!alreadyIn) {
            childrenByParent[cbdk][pid].push({ value: cbCell.id, label: cbCell.label || cbCell.id });
          }
          hasChildren[cbdk][pid] = true;
        }
      }
    }

    // ── Build render list ────────────────────────────────────────
    var idToRow = {};
    for (var im = 0; im < this._data.length; im++) {
      var imCell = this._data[im]["dimensions_0"] || {};
      if (imCell.id) { idToRow[imCell.id] = im; }
    }

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
      var brSaved = this._savedSelections && this._savedSelections[brCell.id];
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

    var totalCols = dimensions.length + measures.length;
    var self2 = this;

    // Mouse drag selection
    var wrapper2 = self2.shadowRoot.getElementById("dt-wrapper");
    if (wrapper2 && !wrapper2._selBound) {
      wrapper2._selBound = true;

      wrapper2.addEventListener("mousedown", function(e) {
        var td = e.target.closest("td.dt-mcell");
        if (!td) { return; }
        // Não previne default se clicou diretamente no input — deixa o foco funcionar
        if (e.target.tagName === "INPUT") { self2._clearSelection(); return; }
        e.preventDefault();
        self2._clearSelection();
        self2._isDragging  = true;
        var ri2 = parseInt(td.getAttribute("data-row-index"), 10);
        var mk3 = td.getAttribute("data-measure-key");
        self2._selAnchor   = { rowIndex: ri2, measureKey: mk3 };
        self2._selectCell(ri2, mk3, td);
        wrapper2.focus();
      });

      wrapper2.addEventListener("mouseover", function(e) {
        if (!self2._isDragging) { return; }
        var td = e.target.closest("td.dt-mcell");
        if (!td) { return; }
        var ri3 = parseInt(td.getAttribute("data-row-index"), 10);
        var mk4 = td.getAttribute("data-measure-key");
        self2._selectRange(self2._selAnchor.rowIndex, self2._selAnchor.measureKey, ri3, mk4);
      });
      // mouseup global fica em connectedCallback (_onDocMouseUp)
    }

    var renderRow = function(ri) {
      var rowData = self2._data[ri];
      var tr = document.createElement("tr");
      tr.dataset.rowIndex = ri;
      tr.style.height = self2._rowHeight + "px";

      var firstDimCell = rowData["dimensions_0"] || {};
      var isParentRow = firstDimCell.isCollapsed === true;
      if (isParentRow) {
        tr.style.background = "#e8f0fe";
        tr.style.fontWeight = "600";
      }

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
          var cellHasChildren = hasChildren[dk2][cId] || hasChildren[dk2][bindingId]
            || self2._isNodeId(dk2, cId, childrenByParent) || self2._isNodeId(dk2, bindingId, childrenByParent)
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
          var multiCombo = di2 === 0 && self2._multiComboAccounts ? self2._multiComboAccounts[cId] : 0;
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

      // Measure cells
      for (var mi2 = 0; mi2 < measures.length; mi2++) {
        var mk2  = "measures_" + mi2;
        var tdm  = document.createElement("td");
        tdm.style.padding = "0";
        tdm.classList.add("dt-mcell");
        tdm.setAttribute("data-row-index", ri);
        tdm.setAttribute("data-measure-key", "measures_" + mi2);
        var measureId2 = self2._getMeasureIdByKey(mk2);
        var visualAddrStr = self2._buildRowAddrStr(ri, null, true);
        var measureRowKey = self2._createRowKey(visualAddrStr, measureId2);
        var mv2  = rowData[mk2];
        var mvVal = "";
        if (mv2) {
          if (mv2.formattedValue !== undefined && mv2.formattedValue !== null && String(mv2.formattedValue) !== "") {
            mvVal = String(mv2.formattedValue);
          } else if (mv2.formatted !== undefined && mv2.formatted !== null && String(mv2.formatted) !== "" && mv2.formatted !== "NaN") {
            mvVal = String(mv2.formatted);
            // Remove sufixos de unidade SAC (ex: "13,00c" → "13,00", "1.593,95BRL" → "1.593,95")
            mvVal = mvVal.replace(/[a-zA-Z]+$/, "").trim();
          } else if (mv2.raw !== null && mv2.raw !== undefined && String(mv2.raw) !== "NaN" && String(mv2.raw) !== "null") {
            mvVal = String(mv2.raw);
          }
        }
        if (!self2._originalData) { self2._originalData = {}; }
        if (self2._originalData[measureRowKey] === undefined) {
          self2._originalData[measureRowKey] = mvVal;
        }
        if (self2._localData && self2._localData[measureRowKey]) {
          mvVal = self2._localData[measureRowKey].value;
        }
        var input = document.createElement("input");
        input.type = "text";
        input.value = mvVal;
        input.style.cssText = "width:100%;height:" + self2._rowHeight + "px;border:none;background:transparent;text-align:center;padding:0 12px;font-size:13px;color:var(--table-text-color,#333);box-sizing:border-box;outline:none;cursor:pointer;";

        input.addEventListener("focus", function(e) {
          e.target.style.background = self2._editableCellColor || "#fffbe6";
          e.target.style.outline = "2px solid #1a73e8";
          e.target.style.cursor = "text";
        });
        input.addEventListener("blur", function(e) {
          e.target.style.background = "transparent";
          e.target.style.outline = "none";
          e.target.style.cursor = "pointer";
        });
        input.addEventListener("keydown", function(e) {
          // Delete com células selecionadas — dispara evento e não apaga o input focado
          if (e.key === "Delete" && self2._selectedCells && self2._selectedCells.length > 1) {
            e.preventDefault();
            var cells = [];
            for (var sc = 0; sc < self2._selectedCells.length; sc++) {
              cells.push({ rowIndex: self2._selectedCells[sc].rowIndex, measureKey: self2._selectedCells[sc].measureKey });
            }
            self2.dispatchEvent(new CustomEvent("onCellsDeleteRequested", { bubbles: true, composed: true, detail: { cells: cells } }));
            self2._clearSelection();
            return;
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            var allInputs = Array.from(self2.shadowRoot.querySelectorAll("tbody input, tbody .cell-dropdown"));
            var idx = allInputs.indexOf(e.target);
            if (idx === -1) { return; }
            // Calcula número de colunas
            var row = e.target.closest("tr");
            var allCells = row ? Array.from(row.querySelectorAll("input, .cell-dropdown")) : [];
            var colCount = allCells.length;
            var nextIdx = idx;
            if (e.key === "ArrowDown")  { nextIdx = idx + colCount; }
            if (e.key === "ArrowUp")    { nextIdx = idx - colCount; }
            if (e.key === "ArrowRight") { nextIdx = idx + 1; }
            if (e.key === "ArrowLeft")  { nextIdx = idx - 1; }
            if (nextIdx >= 0 && nextIdx < allInputs.length) {
              allInputs[nextIdx].focus();
            }
          }
        });

        (function(inputEl, rowIdx, measureKey, measureId, rowD) {
          inputEl.addEventListener("change", function() {
            var rawInputValue = inputEl.value;
            var newVal = self2._parseLocaleNumber(rawInputValue);
            if (isNaN(newVal)) { newVal = 0; }
            // Valor canônico para o SAC; input vazio continua indo vazio
            var pendingVal = rawInputValue.trim() === "" ? "" : String(newVal);
            if (!self2._localMeasures) { self2._localMeasures = {}; }
            if (!self2._localMeasures[rowIdx]) { self2._localMeasures[rowIdx] = {}; }
            self2._localMeasures[rowIdx][measureKey] = newVal;

            // Endereço: dimensões do binding, sobrepostas por rowValuesMap e _localSelections
            var rowAddrObj = self2._buildRowAddrObj(rowIdx, null, true);
            var addrStr    = self2._serializeAddrObj(rowAddrObj);
            var addrObj    = {};
            var dims3      = self2._metadata.feeds.dimensions.values;
            for (var x = 0; x < dims3.length; x++) {
              var dc = rowD["dimensions_" + x] || {};
              if (dc.id) {
                var dimRealId3 = "dimensions_" + x;
                if (self2._metadata.dimensions && self2._metadata.dimensions["dimensions_" + x]) {
                  dimRealId3 = self2._metadata.dimensions["dimensions_" + x].id || dimRealId3;
                }
                addrObj[dimRealId3] = dc.id;
              }
            }
            for (var rak in rowAddrObj) { addrObj[rak] = rowAddrObj[rak]; }
            self2._setLocalCellValue(addrStr, measureId, rawInputValue);
            if (inputEl.parentElement) { inputEl.parentElement.classList.add("changed-cell"); }

            // Salva payload para o script SAC
            self2._measureChangeValue     = String(newVal);
            self2._changedValue           = rawInputValue;
            self2._measureChangeMeasureId = measureId;
            self2._measureChangeRowIndex  = String(rowIdx);
            self2._measureChangeAddrStr   = addrStr;
            self2._oldRowAddrStr          = addrStr;
            self2._newRowAddrStr          = addrStr;
            self2._addPendingChange({
              type: "measure",
              rowIndex: rowIdx,
              oldAddr: addrStr,
              newAddr: addrStr,
              value: pendingVal,
              measureId: measureId
            });

            // Notifica SAC via propertiesChanged
            self2.dispatchEvent(new CustomEvent("propertiesChanged", {
              bubbles: true, composed: true,
              detail: {
                properties: {
                  measureChangeValue:     String(newVal),
                  changedValue:           rawInputValue,
                  measureChangeMeasureId: measureId,
                  measureChangeRowIndex:  String(rowIdx),
                  measureChangeAddrStr:   addrStr,
                  pendingChanges:         self2._serializePendingChanges(self2._pendingChanges)
                }
              }
            }));

            // Dispara evento onMeasureChanged via microtask
            Promise.resolve().then(function() {
              self2.dispatchEvent(new CustomEvent("onMeasureChanged", {
                bubbles: true, composed: true,
                detail: {
                  rowIndex:  rowIdx,
                  measureId: measureId,
                  value:     newVal,
                  address:   addrObj
                }
              }));
            });
          });
        })(input, ri, mk2, measures[mi2].id || mk2, rowData);

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
        tdH.style.cssText = "font-weight:700;padding:0 16px;line-height:" + self2._rowHeight + "px;font-size:12px;text-transform:uppercase;border-bottom:1px solid #d0d8f0;letter-spacing:0.5px;";
        trH.classList.add("dt-group-header");
        tdH.textContent = item.label;
        trH.appendChild(tdH);
        tbody.appendChild(trH);
      } else if (item.type === "subheader") {
        var trSH = document.createElement("tr");
        var tdSH = document.createElement("td");
        tdSH.colSpan = totalCols;
        tdSH.style.cssText = "font-weight:600;padding:0 24px;line-height:" + self2._rowHeight + "px;font-size:12px;text-transform:uppercase;border-bottom:1px solid #d0d8f0;";
        trSH.classList.add("dt-subheader");
        tdSH.textContent = item.label;
        trSH.appendChild(tdSH);
        tbody.appendChild(trSH);
      } else {
        renderRow(item.rowIndex);
      }
    }
  }

  // ─── Dropdown cell ────────────────────────────────────────────
  _buildDropdownCell(td, rowIndex, dimensionId, currentLabel, currentId, options) {
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
    arrow.innerHTML = '<svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    wrapper.appendChild(valueSpan);
    wrapper.appendChild(arrow);

    wrapper.addEventListener("click", function(e) {
      e.stopPropagation();
      var effectiveId = wrapper._currentId !== undefined ? wrapper._currentId : currentId;
      self._openDropdown(wrapper, rowIndex, dimensionId, effectiveId, options);
    });
    wrapper.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wrapper.click(); }
      if (e.key === "Escape") self._closeDropdown();
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        var allCells = Array.from(self.shadowRoot.querySelectorAll("tbody input, tbody .cell-dropdown"));
        var idx = allCells.indexOf(wrapper);
        if (idx === -1) { return; }
        var row = wrapper.closest("tr");
        var rowCells = row ? Array.from(row.querySelectorAll("input, .cell-dropdown")) : [];
        var colCount = rowCells.length;
        var nextIdx = idx;
        if (e.key === "ArrowDown")  { nextIdx = idx + colCount; }
        if (e.key === "ArrowUp")    { nextIdx = idx - colCount; }
        if (e.key === "ArrowRight") { nextIdx = idx + 1; }
        if (e.key === "ArrowLeft")  { nextIdx = idx - 1; }
        if (nextIdx >= 0 && nextIdx < allCells.length) {
          self._closeDropdown();
          allCells[nextIdx].focus();
        }
      }
    });

    td.appendChild(wrapper);
  }

  _openDropdown(cellEl, rowIndex, dimensionId, currentId, options) {
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
      if (val.indexOf("root") !== -1 || val.indexOf("].&[root]") !== -1) { continue; }
      filteredOptions.push(opt);
    }
    if (filteredOptions.length === 0) {
      var emptyItem = document.createElement("div");
      emptyItem.className = "dt-dropdown-item";
      emptyItem.style.cssText = "color:#999;font-style:italic;cursor:default;";
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

    var listH = Math.min(Math.max(filteredOptions.length, 1) * 36 + 8, 220);
    if (cellRect.bottom + listH > window.innerHeight - 8) {
      top = cellRect.top - wrapperRect.top + wrapper.scrollTop - listH - 2;
    }

    list.style.position = "absolute";
    list.style.left     = left + "px";
    list.style.top      = top  + "px";
    list.style.minWidth = listW + "px";

    setTimeout(function() {
      document.addEventListener("click", self._onDocClick, { once: true });
    }, 0);
  }

  _closeDropdown() {
    var list = this.shadowRoot.getElementById("dt-dropdown");
    if (list) { list.classList.add("hidden"); list.innerHTML = ""; }
    if (this._activeCell) { this._activeCell.classList.remove("active"); this._activeCell = null; }
  }

  // ─── Select & write-back ──────────────────────────────────────
  _selectValue(rowIndex, dimensionId, memberId, memberLabel) {
    var self = this;

    this._previousCellData = JSON.parse(JSON.stringify(this._selectedCellData));
    this._selectedCellData = {
      row: rowIndex,
      dimensionId: dimensionId,
      memberId: memberId,
      memberLabel: memberLabel
    };

    this._oldRowAddrStr = this._buildRowAddrStr(rowIndex, null, true);
    this._changedValue = this._getRowMeasureValue(rowIndex);
    var changedMeasureKey = this._getFirstChangedMeasureKey(rowIndex);
    var changedMeasureId = this._getMeasureIdByKey(changedMeasureKey);

    if (!this._localSelections) { this._localSelections = {}; }
    // Usa dimensions_0 id como chave para sobreviver a reordenação do binding
    var rowData0 = this._data && this._data[rowIndex] ? this._data[rowIndex] : {};
    var dim0Key = (rowData0["dimensions_0"] || {}).id || String(rowIndex);
    if (!this._localSelections[dim0Key]) { this._localSelections[dim0Key] = {}; }
    // Resolve technical member ID (prefer full member id like [DIM].[HIER].&[ID])
    var technicalId = memberId;
    // If incoming value looks like a simple label (no .&[ ), try to resolve from known option sources
    if (!technicalId || technicalId.indexOf(".&[") === -1) {
      // Try explicit dropdownOptions first
      try {
        if (this._dropdownOptions && this._dropdownOptions[dimensionId]) {
          var dopts = this._dropdownOptions[dimensionId];
          for (var di = 0; di < dopts.length; di++) {
            var o = dopts[di];
            if ((o.label && o.label === memberLabel) || (o.value && o.value === memberId)) {
              if (o.value && o.value.indexOf(".&[") !== -1) { technicalId = o.value; break; }
            }
          }
        }
      } catch(e) {}
      // Try children from binding (flatten groups) — sem Object.keys()
      if ((!technicalId || technicalId.indexOf(".&[") === -1) && this._childrenFromBinding && this._childrenFromBinding[dimensionId]) {
        for (var cbKey in this._childrenFromBinding[dimensionId]) {
          if (technicalId && technicalId.indexOf(".&[") !== -1) { break; }
          var arr = this._childrenFromBinding[dimensionId][cbKey] || [];
          for (var a = 0; a < arr.length; a++) {
            var ao = arr[a];
            if ((ao.label && ao.label === memberLabel) || (ao.value && ao.value === memberId)) {
              if (ao.value && ao.value.indexOf(".&[") !== -1) { technicalId = ao.value; break; }
            }
          }
        }
      }
    }

    // Fix: se technicalId ainda nao tem formato tecnico, tenta construir a partir do metadata da dimensao
    if (!technicalId || technicalId.indexOf(".&[") === -1) {
      var dimMetaEntry = this._metadata && this._metadata.dimensions ? this._metadata.dimensions[dimensionId] : null;
      if (dimMetaEntry && dimMetaEntry.id) {
        var dimRealKey = dimMetaEntry.id;
        var hierKey = dimMetaEntry.hierarchies && dimMetaEntry.hierarchies[0] ? dimMetaEntry.hierarchies[0].id : (dimRealKey + "_H1");
        // Usa memberId como label (é o ID real), só cai no memberLabel se memberId parecer um label de display
        var idForLabel = memberId || memberLabel;
        // Se memberId já tem formato técnico parcial, extrai só o label
        var labelMatch2 = idForLabel ? idForLabel.match(/\.&\[([^\]]+)\]$/) : null;
        if (labelMatch2) { idForLabel = labelMatch2[1]; }
        technicalId = "[" + dimRealKey + "].[" + hierKey + "].&[" + idForLabel + "]";
      }
    }

    // Block placeholder/invalid selections — do not persist or mount address
    var placeholders = ["RESPONSAVEL", "Periodos", "FONTE", "Selecionar...", "RESPONSABILIDADE", "FONTE", "PERIODICIDADE", "DESCRICAO_DA_CONTA"];
    var isPlaceholder = false;
    for (var ph = 0; ph < placeholders.length; ph++) {
      if ((memberLabel && memberLabel === placeholders[ph]) || (memberId && memberId === placeholders[ph]) || (technicalId && technicalId === placeholders[ph])) { isPlaceholder = true; break; }
    }
    var cellWrapper = this._activeCell;
    if (isPlaceholder) {
      // Revert displayed value to previous value if available
      if (cellWrapper) {
        var prevLabel = (this._previousCellData && this._previousCellData.memberLabel) ? this._previousCellData.memberLabel : "Selecionar...";
        var valSpan2 = cellWrapper.querySelector(".cell-value");
        if (valSpan2) { valSpan2.textContent = prevLabel; }
        cellWrapper._currentId = this._previousCellData && this._previousCellData.memberId ? this._previousCellData.memberId : "";
        cellWrapper.classList.remove("changed-cell");
      }
      return;
    }

    // Persist selection using technical id
    this._localSelections[dim0Key][dimensionId] = { id: technicalId, label: memberLabel };
    if (!this._selectionRowIndex) { this._selectionRowIndex = {}; }
    this._selectionRowIndex[dim0Key] = rowIndex;

    if (cellWrapper) {
      var valSpan = cellWrapper.querySelector(".cell-value");
      if (valSpan) {
        valSpan.textContent = memberLabel;
        valSpan.className = "cell-value";
      }
      cellWrapper._currentId = technicalId;
      cellWrapper.classList.add("changed-cell");
    }

    // Endereço completo da linha com a nova seleção (prioridade máxima para a dimensão atual)
    var dropAddrStr = this._buildRowAddrStr(rowIndex, { dimensionId: dimensionId, memberId: technicalId }, true);
    this._newRowAddrStr = dropAddrStr;
    var pendingMeasureKeys = [];
    var pendingMeasFeed = this._metadata ? (this._metadata.feeds.mainStructureMembers || this._metadata.feeds.measures) : null;
    var pendingMeasValues = pendingMeasFeed ? pendingMeasFeed.values : [];
    if (pendingMeasValues.length > 0) {
      for (var pm = 0; pm < pendingMeasValues.length; pm++) { pendingMeasureKeys.push("measures_" + pm); }
    } else {
      pendingMeasureKeys.push(changedMeasureKey);
    }
    // Move só as medidas que têm valor. Linha sem nenhum valor: registra só a escolha (grava o
    // "apagar" na combinação nova para guardá-la) sem zerar a combinação antiga, que não existe.
    var movedAny = false;
    var firstMeasureId = "";
    // Destino é um membro sem valor (ex: CLIENTE): todas as medidas gravam 0, inclusive as vazias
    this._memberLabelIndex = {};
    var targetObj = this._buildRowAddrObj(rowIndex, { dimensionId: dimensionId, memberId: technicalId }, true);
    var targetPairs = [];
    for (var tk in targetObj) { targetPairs.push({ dim: tk, member: targetObj[tk] }); }
    var noValueTarget = this._isNoValueAddress(targetPairs);
    for (var pmk = 0; pmk < pendingMeasureKeys.length; pmk++) {
      var pendingMeasureKey = pendingMeasureKeys[pmk];
      var pendingMeasureId = this._getMeasureIdByKey(pendingMeasureKey);
      if (pmk === 0) { firstMeasureId = pendingMeasureId; }
      // Usa _getRowMeasureValue como fonte primária (binding direto) — mais confiável que _originalData
      var currentValue = this._getRowMeasureValue(rowIndex, pendingMeasureKey);
      // Fallback: _originalData via oldRowAddrStr
      if (currentValue === "") { currentValue = this._toCanonicalNumber(this._getCurrentLocalValue(this._oldRowAddrStr, pendingMeasureId)); }
      if (currentValue === "") {
        if (noValueTarget) {
          this._addPendingChange({
            type: "dropdown", rowIndex: rowIndex, noMove: true,
            oldAddr: this._oldRowAddrStr, newAddr: this._newRowAddrStr,
            value: "", measureId: pendingMeasureId
          });
          movedAny = true;
        }
        continue;
      }
      this._setLocalCellValue(this._newRowAddrStr, pendingMeasureId, currentValue);
      this._addPendingChange({
        type: "dropdown",
        rowIndex: rowIndex,
        oldAddr: this._oldRowAddrStr,
        newAddr: this._newRowAddrStr,
        value: currentValue,
        measureId: pendingMeasureId
      });
      if (!movedAny) {
        this._changedValue = currentValue;
        changedMeasureId = pendingMeasureId;
      }
      movedAny = true;
    }
    if (!movedAny && firstMeasureId) {
      this._addPendingChange({
        type: "dropdown",
        rowIndex: rowIndex,
        noMove: true,
        oldAddr: this._oldRowAddrStr,
        newAddr: this._newRowAddrStr,
        value: "",
        measureId: firstMeasureId
      });
      this._changedValue = "";
      changedMeasureId = firstMeasureId;
    }
    // Responsabilidade CLIENTE trava/mostra 0; sair de tudo NÃO APLICÁVEL libera as medidas
    this._applyRowLock(rowIndex);
    this._measureChangeValue = String(this._changedValue || "");
    this._measureChangeMeasureId = changedMeasureId;
    this._measureChangeRowIndex = String(rowIndex);
    this._measureChangeAddrStr = dropAddrStr;

    // Notifica SAC via propertiesChanged antes do evento
    this.dispatchEvent(new CustomEvent("propertiesChanged", {
      bubbles: true, composed: true,
      detail: {
        properties: {
          selectedCellData: JSON.stringify(this._selectedCellData),
          changedValue: this._changedValue,
          measureChangeValue: String(this._changedValue || ""),
          measureChangeMeasureId: changedMeasureId,
          measureChangeRowIndex: String(rowIndex),
          measureChangeAddrStr: dropAddrStr,
          pendingChanges: this._serializePendingChanges(this._pendingChanges)
        }
      }
    }));

    Promise.resolve().then(function() {
      self.dispatchEvent(new CustomEvent("onDropdownChanged", {
        bubbles: true, composed: true, detail: self._selectedCellData
      }));
    });
  }

}

if (!customElements.get(DT_TAG)) {
  customElements.define(DT_TAG, DropdownTableWidget);
}

})();

// v2.13.0
