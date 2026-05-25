// dropdown-table-widget.js — v2.10.31
// Changelog:
//   v2.10.31 — Adiciona getDataSource() para compatibilidade com padrão SAC
//              dropdowntable_1.getDataSource().setDimensionFilter(...) agora funciona
//   v2.10.1 — Fix context menu position, campo hierarquia no modal, dimensionRealId no payload
//   v2.10.0 — Context menu + modal "Adicionar membro" + eventos SAC

var TMPL = document.createElement("template");
TMPL.innerHTML = `
<style>
  :host { display: block; font-family: Arial, sans-serif; position: relative; box-sizing: border-box; }
  .dt-wrapper { width: 100%; height: 100%; overflow: auto; box-sizing: border-box; position: relative; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }

  thead tr { background: var(--header-color, #1a73e8); }
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

  .dt-title {
    padding: 8px 12px 6px 12px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }
  .dt-title.hidden { display: none; }

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
  <div class="dt-wrapper" id="dt-wrapper">
  <table id="dt-table">
    <thead><tr id="dt-header"></tr></thead>
    <tbody id="dt-body"></tbody>
  </table>
  <div class="dt-empty" id="dt-empty">Nenhum dado disponível</div>
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

    // Context menu state
    this._ctxTarget = null; // {rowIndex, dimensionId, memberId, memberLabel, dimensionName}

    this._onDocClick    = this._closeDropdown.bind(this);
    this._onDocCtxClose = this._closeCtxMenu.bind(this);
  }

  connectedCallback() {
    document.addEventListener("click", this._onDocClick);
    document.addEventListener("click", this._onDocCtxClose);
    this._bindContextMenu();
    this._bindModal();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onDocClick);
    document.removeEventListener("click", this._onDocCtxClose);
  }

  // ─── SAC Lifecycle ────────────────────────────────────────────
  onCustomWidgetReady() { this._loadBinding(); }
  onCustomWidgetBeforeUpdate(c) {}
  onCustomWidgetAfterUpdate(changedProperties) {
    if (changedProperties && "myDataBinding" in changedProperties) {
      var dataBinding = changedProperties.myDataBinding;
      if (dataBinding && dataBinding.state === "success") {
        this._processDataBinding(dataBinding);
        return;
      }
    }
    if (changedProperties && "childrenBinding" in changedProperties) {
      this._processChildrenBinding();
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
  }

  // ─── Binding ──────────────────────────────────────────────────
  _loadBinding() {
    try {
      var b = this.myDataBinding;
      if (!b || !b.metadata || !b.data) return;
      if (b.state && b.state !== "success") return;
      this._processDataBinding(b);
    } catch(e) { console.error("DropdownTable _loadBinding:", e); }
  }

  _processDataBinding(dataBinding) {
    try {
      if (!dataBinding || !dataBinding.metadata || !dataBinding.data) return;

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
          var mkeys = Object.keys(measMeta);
          for (var mk = 0; mk < mkeys.length; mk++) {
            measValues.push(measMeta[mkeys[mk]]);
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

      this._metadata = meta;
      this._metadata._dimLabels = dimLabels;
      this._metadata._mesLabels = mesLabels;
      this._metadata._measCount = mesLabels.length;
      this._data = dataBinding.data;

      this._processChildrenBinding();
      this._render();
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
      this._applyDynamicStyles();
      this._render();
    } catch(e) { console.error("applyStyleConfig error:", e); }
  }

  set dropdownOptions(v) {
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
    } catch(e) { console.error("dropdownOptions set error:", e); }
  }

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
      this._render();
    } catch(e) { console.error("setRowValues error:", e); }
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
        measures.push({ id: mv2, description: "" });
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

    // ── Dropdown options from binding ────────────────────────────
    var dimOptions = {};
    for (var d = 0; d < dimensions.length; d++) {
      dimOptions["dimensions_" + d] = [];
    }

    try {
      var binding = this.myDataBinding;
      for (var dm = 0; dm < dimensions.length; dm++) {
        var dk = "dimensions_" + dm;
        var dimId = dimensions[dm].id;
        var members = binding.getDimensionMembers(dimId);
        if (members && members.length > 0) {
          for (var mx = 0; mx < members.length; mx++) {
            var mem = members[mx];
            if (mem && mem.id && mem.parentId) {
              dimOptions[dk].push({ value: mem.id, label: mem.description || mem.id });
            }
          }
        }
      }
    } catch(e) {
      var dimRootIds = {};
      for (var dr = 0; dr < dimensions.length; dr++) {
        dimRootIds["dimensions_" + dr] = null;
        for (var rr = 0; rr < this._data.length; rr++) {
          var cr = this._data[rr]["dimensions_" + dr];
          if (cr && cr.isCollapsed === true && dimRootIds["dimensions_" + dr] === null) {
            dimRootIds["dimensions_" + dr] = cr.id;
            break;
          }
        }
      }
      for (var r = 0; r < this._data.length; r++) {
        var row = this._data[r];
        for (var d2 = 0; d2 < dimensions.length; d2++) {
          var dkf = "dimensions_" + d2;
          var cell = row[dkf];
          if (cell && cell.id && cell.id !== dimRootIds[dkf]) {
            var exists = false;
            for (var ex = 0; ex < dimOptions[dkf].length; ex++) {
              if (dimOptions[dkf][ex].value === cell.id) { exists = true; break; }
            }
            if (!exists) {
              dimOptions[dkf].push({ value: cell.id, label: cell.label || cell.id });
            }
          }
        }
      }
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

    for (var rl = 0; rl < this._data.length; rl++) {
      var rlCell = this._data[rl]["dimensions_0"] || {};
      if (!rlCell.id || rendered[rlCell.id]) continue;

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

        if (self2._localSelections && self2._localSelections[ri] && self2._localSelections[ri][dk2]) {
          cData = self2._localSelections[ri][dk2];
        }

        var cLbl = cData.label || cData.id || "";
        var cId  = cData.id || "";
        // ID original do binding (para highlight correto ao abrir dropdown)
        var bindingId = (rowData[dk2] || {}).id || "";

        // Aplica valor do rowValuesMap se disponível
        if (self2._rowValuesMap && dk2 !== "dimensions_0") {
          var dim0Cell = rowData["dimensions_0"] || {};
          var contaId  = dim0Cell.id || "";
          if (contaId !== "" && self2._rowValuesMap[contaId]) {
            var parts = self2._rowValuesMap[contaId].split("|");
            var dimIdx2 = parseInt(dk2.replace("dimensions_", ""), 10);
            if (dimIdx2 === 1 && parts[1] !== "") {
              cId  = parts[1];
              bindingId = parts[1];
              // Extrai label do ID: "[DIM].[HIER].&[LABEL]" → "LABEL"
              var lm = parts[1].match(/\.&\[([^\]]+)\]$/);
              if (lm) { cLbl = lm[1]; }
            }
            if (dimIdx2 === 2 && parts[2] !== "") {
              cId  = parts[2];
              bindingId = parts[2];
              var lm2 = parts[2].match(/\.&\[([^\]]+)\]$/);
              if (lm2) { cLbl = lm2[1]; }
            }
            if (dimIdx2 === 3 && parts[3] !== "") {
              cId  = parts[3];
              bindingId = parts[3];
              var lm3 = parts[3].match(/\.&\[([^\]]+)\]$/);
              if (lm3) { cLbl = lm3[1]; }
            }
          }
        }

        // Se isNode:true e label existe, já temos o valor correto
        // Se label está vazio, tenta extrair do ID
        if (!cLbl && cId) {
          var idClean = cId.match(/\.&\[([^\]]+)\]$/);
          if (idClean) { cLbl = idClean[1]; }
        }

        var isDrop = di2 !== 0 && (
          self2._dropdownDimensions.length === 0
          || self2._dropdownDimensions.indexOf(dk2) !== -1
          || self2._dropdownDimensions.indexOf(dim2.id) !== -1
        );

        var hasChildrenInBinding = self2._childrenFromBinding &&
          self2._childrenFromBinding[dk2] &&
          self2._childrenFromBinding[dk2][cId] &&
          self2._childrenFromBinding[dk2][cId].length > 0;
        var cellHasChildren = hasChildren[dk2][cId] ||
          (childrenByParent[dk2] && childrenByParent[dk2][cId] && childrenByParent[dk2][cId].length > 0) ||
          hasChildrenInBinding;
        // Força dropdown quando rowValuesMap tem valor para essa linha/dimensão
        var hasRowValueMap = false;
        if (self2._rowValuesMap && dk2 !== "dimensions_0") {
          var dim0CellCheck = rowData["dimensions_0"] || {};
          var contaIdCheck  = dim0CellCheck.id || "";
          if (contaIdCheck !== "" && self2._rowValuesMap[contaIdCheck]) {
            hasRowValueMap = true;
          }
        }

        if (isDrop && !cellHasChildren && !hasRowValueMap) { isDrop = false; }

        var opts = [];
        if (self2._dropdownOptions && self2._dropdownOptions[dk2]) {
          opts = self2._dropdownOptions[dk2];
        } else if (self2._childrenFromBinding && self2._childrenFromBinding[dk2] && self2._childrenFromBinding[dk2][cId]) {
          opts = self2._childrenFromBinding[dk2][cId];
        } else if (childrenByParent[dk2] && childrenByParent[dk2][cId]) {
          opts = childrenByParent[dk2][cId];
        }
        if (isDrop && (!opts || opts.length === 0) && !hasRowValueMap) { isDrop = false; }

        if (isDrop) {
          self2._buildDropdownCell(td, ri, dk2, cLbl, bindingId || cId, opts);
        } else {
          // dimensions_0 — plain cell WITH right-click context menu
          var sp = document.createElement("span");
          sp.className = "cell-plain";
          sp.textContent = cLbl;
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
        if (self2._localMeasures && self2._localMeasures[ri] && self2._localMeasures[ri][mk2] !== undefined) {
          mvVal = self2._localMeasures[ri][mk2];
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

        (function(inputEl, rowIdx, measureKey, measureId, rowD) {
          inputEl.addEventListener("change", function() {
            var newVal = parseFloat(inputEl.value.replace(",", "."));
            if (isNaN(newVal)) { newVal = 0; }
            if (!self2._localMeasures) { self2._localMeasures = {}; }
            if (!self2._localMeasures[rowIdx]) { self2._localMeasures[rowIdx] = {}; }
            self2._localMeasures[rowIdx][measureKey] = newVal;
            try {
              var b = self2.myDataBinding;
              if (b && b.setValueState) {
                var addr = {};
                var dims3 = self2._metadata.feeds.dimensions.values;
                for (var x = 0; x < dims3.length; x++) {
                  var dc = rowD["dimensions_" + x] || {};
                  if (dc.id) { addr[dims3[x].id] = dc.id; }
                }
                addr[measureId] = newVal;
                b.setValueState(addr, function(err) {
                  if (!err) {
                    if (self2._localMeasures && self2._localMeasures[rowIdx]) {
                      delete self2._localMeasures[rowIdx][measureKey];
                    }
                    self2._loadBinding();
                  }
                });
              }
            } catch(e3) { console.error("Measure write-back:", e3); }
          });
        })(input, ri, mk2, measures[mi2].id || mk2, rowData);

        tdm.appendChild(input);
        tr.appendChild(tdm);
      }

      tbody.appendChild(tr);
    };

    for (var ri2 = 0; ri2 < renderList.length; ri2++) {
      var item = renderList[ri2];
      if (item.type === "header") {
        var trH = document.createElement("tr");
        var tdH = document.createElement("td");
        tdH.colSpan = totalCols;
        tdH.style.cssText = "font-weight:700;background:#f0f4ff;color:#1a3a6e;padding:0 16px;line-height:" + self2._rowHeight + "px;font-size:12px;text-transform:uppercase;border-bottom:1px solid #d0d8f0;letter-spacing:0.5px;";
        tdH.textContent = item.label;
        trH.appendChild(tdH);
        tbody.appendChild(trH);
      } else if (item.type === "subheader") {
        var trSH = document.createElement("tr");
        var tdSH = document.createElement("td");
        tdSH.colSpan = totalCols;
        tdSH.style.cssText = "font-weight:600;background:#e8f0fe;color:#1a3a6e;padding:0 24px;line-height:" + self2._rowHeight + "px;font-size:12px;text-transform:uppercase;border-bottom:1px solid #d0d8f0;";
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
    });

    td.appendChild(wrapper);
  }

  _openDropdown(cellEl, rowIndex, dimensionId, currentId, options) {
    var self = this;
    this._closeDropdown();
    if (!options || options.length === 0) return;

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

    var listH = Math.min(filteredOptions.length * 36 + 8, 220);
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

    this._selectedCellData = {
      row: rowIndex,
      dimensionId: dimensionId,
      memberId: memberId,
      memberLabel: memberLabel
    };

    if (!this._localSelections) { this._localSelections = {}; }
    if (!this._localSelections[rowIndex]) { this._localSelections[rowIndex] = {}; }
    this._localSelections[rowIndex][dimensionId] = { id: memberId, label: memberLabel };

    var cellWrapper = this._activeCell;
    if (cellWrapper) {
      var valSpan = cellWrapper.querySelector(".cell-value");
      if (valSpan) {
        valSpan.textContent = memberLabel;
        valSpan.className = "cell-value";
      }
      cellWrapper._currentId = memberId;
    }

    try {
      var binding    = this.myDataBinding;
      var rowData    = this._data[rowIndex];
      var dimensions = this._metadata.feeds.dimensions.values;

      if (binding && binding.setValueState) {
        var cellAddress = {};
        for (var di = 0; di < dimensions.length; di++) {
          var dk   = "dimensions_" + di;
          var cell = rowData[dk] || {};
          if (cell.id) { cellAddress[dimensions[di].id] = cell.id; }
        }
        var dimIdx = parseInt(dimensionId.replace("dimensions_", ""), 10);
        if (!isNaN(dimIdx) && dimensions[dimIdx]) {
          cellAddress[dimensions[dimIdx].id] = memberId;
        }
        binding.setValueState(cellAddress, function(err) {
          if (!err) { self._loadBinding(); }
        });
      }
    } catch(e) {
      console.error("DropdownTable write-back error:", e);
    }

    this.dispatchEvent(new CustomEvent("onDropdownChanged", {
      bubbles: true, composed: true, detail: this._selectedCellData
    }));
  }

  _applyFilters() {
    try {
      var binding = this.myDataBinding;
      if (!binding || !this._metadata) return;
      var dimensions = this._metadata.feeds.dimensions.values;
      for (var i = 0; i < dimensions.length; i++) {
        try { binding.removeDimensionFilter(dimensions[i].id); } catch(e) {}
      }
      var keys = Object.keys(this._activeFilters);
      for (var k = 0; k < keys.length; k++) {
        var mid = this._activeFilters[keys[k]];
        if (mid) { binding.setDimensionFilter(keys[k], [mid]); }
      }
    } catch(e) { console.error("DropdownTable _applyFilters:", e); }
  }
}

customElements.define("dropdowntable-widget", DropdownTableWidget);

