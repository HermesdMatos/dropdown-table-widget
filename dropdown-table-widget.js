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

  .dt-empty { padding: 32px; text-align: center; color: #999; font-size: 13px; }
  .dt-empty.hidden { display: none; }
</style>
<div class="dt-wrapper" id="dt-wrapper">
  <table id="dt-table">
    <thead><tr id="dt-header"></tr></thead>
    <tbody id="dt-body"></tbody>
  </table>
  <div class="dt-empty" id="dt-empty">Nenhum dado disponível</div>
  <div class="dt-dropdown-list hidden" id="dt-dropdown"></div>
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

    this._onDocClick = this._closeDropdown.bind(this);
  }

  connectedCallback() { document.addEventListener("click", this._onDocClick); }
  disconnectedCallback() { document.removeEventListener("click", this._onDocClick); }

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
    this._loadBinding();
  }
  onCustomWidgetResize(w, h) { this.style.width = w + "px"; this.style.height = h + "px"; }
  onCustomWidgetDestroy() { document.removeEventListener("click", this._onDocClick); }

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
        // Try parentId extraction first (most reliable in SAC)
        var firstRow = dataBinding.data[0];
        var firstCell = firstRow ? firstRow["dimensions_" + di] : null;
        var dimLabel = "";
        if (firstCell && firstCell.parentId) {
          var m = firstCell.parentId.match(/^\[([^\]]+)\]/);
          if (m) { dimLabel = m[1].replace(/_/g, " "); }
        }
        // Fallback: extract from cell id directly
        if (!dimLabel && firstCell && firstCell.id) {
          var m4 = firstCell.id.match(/^\[([^\]]+)\]/);
          if (m4) { dimLabel = m4[1].replace(/_/g, " "); }
        }
        // Fallback: use cell label if it's the root node label (dimension name)
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

      // ── Measure labels — follow PlanifyIT pattern ──
      // PlanifyIT uses: dataBinding.metadata.mainStructureMembers (object or array)
      var measMeta = meta.mainStructureMembers || (meta.feeds && meta.feeds.measures) || null;
      var measValues = [];
      if (measMeta) {
        if (Array.isArray(measMeta)) {
          measValues = measMeta;
        } else if (measMeta.values) {
          measValues = measMeta.values;
        } else if (typeof measMeta === "object") {
          // Object format like PlanifyIT: { "measures_0": {label, id}, ... }
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

      // ── Store processed metadata ──
      this._metadata = meta;
      this._metadata._dimLabels = dimLabels;
      this._metadata._mesLabels = mesLabels;
      this._metadata._measCount = mesLabels.length;
      this._data = dataBinding.data;

      // Process childrenBinding if available
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
    console.log("DropdownTable: styleConfig received", v);
    try {
      this.applyStyleConfig(v);
    } catch(e) { console.error("styleConfig set error:", e); }
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
  getSelectedCellData() { return JSON.stringify(this._selectedCellData); }
  getActiveFilters() { return JSON.stringify(this._activeFilters); }

  // setDropdownOptions — define opções manualmente por coluna
  // Aceita array: [{dimensionKey: "dimensions_1", options: ["Mensal","Bimestral",...]}]
  // ou com objetos: [{dimensionKey: "dimensions_1", options: [{value:"id1", label:"Mensal"},...]}]
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

  // setMeasureLabels — define nomes das medidas manualmente
  // Ex: dropdowntable_1.setMeasureLabels('["Custo","Quantidade"]')
  setMeasureLabels(v) {
    try {
      this._measureLabels = JSON.parse(v);
      this._render();
    } catch(e) { console.error("setMeasureLabels error:", e); }
  }
  getMeasureLabels() { return JSON.stringify(this._measureLabels || []); }

  clearAllFilters() {
    this._activeFilters = {};
    this._applyFilters();
    this._render();
  }

  _applyDynamicStyles() {
    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    if (wrapper) {
      wrapper.style.fontFamily   = this._fontFamily;
      wrapper.style.fontSize     = this._fontSize;
      wrapper.style.fontWeight   = this._fontWeight;
      wrapper.style.fontStyle    = this._fontStyle;
      wrapper.style.textDecoration = this._textDecoration;
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  _render() {
    var self      = this;
    var headerRow = this.shadowRoot.getElementById("dt-header");
    var tbody     = this.shadowRoot.getElementById("dt-body");
    var emptyMsg  = this.shadowRoot.getElementById("dt-empty");

    headerRow.innerHTML = "";
    tbody.innerHTML = "";

    if (!this._metadata || !this._data || this._data.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    var dimensions = this._metadata.feeds.dimensions.values;
    var measFeed   = this._metadata.feeds.mainStructureMembers || this._metadata.feeds.measures;
    // SAC measures.values can be array of strings ["measures_0","measures_1"] or array of objects
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

    // Use pre-processed labels from _processDataBinding
    var dimLabels = this._metadata._dimLabels || [];
    var mesLabels = this._metadata._mesLabels || [];

    // Fallback counts
    if (dimLabels.length === 0) {
      for (var dfl = 0; dfl < dimensions.length; dfl++) { dimLabels.push("Dim " + dfl); }
    }
    if (mesLabels.length === 0) {
      for (var mfl = 0; mfl < measures.length; mfl++) {
        mesLabels.push((this._measureLabels && this._measureLabels[mfl]) || "Med " + mfl);
      }
    }

    // ── Header ───────────────────────────────────────────────────
    for (var i = 0; i < dimLabels.length; i++) {
      var th = document.createElement("th");
      th.textContent = dimLabels[i];
      th.style.minWidth = this._colWidth === "auto" ? "120px" : this._colWidth + "px";
      headerRow.appendChild(th);
    }
    for (var j = 0; j < mesLabels.length; j++) {
      var thm = document.createElement("th");
      thm.textContent = mesLabels[j];
      thm.style.textAlign = "right";
      thm.style.minWidth = this._colWidth === "auto" ? "100px" : this._colWidth + "px";
      headerRow.appendChild(thm);
    }

    // ── Fetch dropdown options from dimension members (not from data rows) ──
    // This avoids row multiplication when dropdown dimensions are in the binding
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
            // Skip root node (no parent or id contains root marker)
            if (mem && mem.id && mem.parentId) {
              dimOptions[dk].push({ value: mem.id, label: mem.description || mem.id });
            }
          }
        }
      }
    } catch(e) {
      // Fallback: collect from data rows excluding root
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

    // ── Build children map per parentId for hierarchical dropdowns ──
    var childrenByParent = {};
    // Also track which cell IDs have children (are parents)
    var hasChildren = {}; // hasChildren[dimKey][cellId] = true

    for (var cbd = 0; cbd < dimensions.length; cbd++) {
      var cbdk = "dimensions_" + cbd;
      childrenByParent[cbdk] = {};
      hasChildren[cbdk] = {};
      for (var cbr = 0; cbr < this._data.length; cbr++) {
        var cbCell = this._data[cbr][cbdk];
        if (cbCell && cbCell.id && cbCell.parentId) {
          var pid = cbCell.parentId;
          if (!childrenByParent[cbdk][pid]) {
            childrenByParent[cbdk][pid] = [];
          }
          var alreadyIn = false;
          for (var chi = 0; chi < childrenByParent[cbdk][pid].length; chi++) {
            if (childrenByParent[cbdk][pid][chi].value === cbCell.id) { alreadyIn = true; break; }
          }
          if (!alreadyIn) {
            childrenByParent[cbdk][pid].push({ value: cbCell.id, label: cbCell.label || cbCell.id });
          }
          // Mark the parent as having children
          hasChildren[cbdk][pid] = true;
        }
      }
    }

    // ── Build grouped structure ───────────────────────────────────
    // Root-level members = those whose parentId does NOT contain ".&["
    // (they are direct children of the hierarchy root, not of another member)
    // e.g. parentId="[DESCRICAO_DA_CONTA].[Hierarquia_DESC_CONTA].&[ASSESSORIAS]" → has .&[ → NOT root
    // e.g. parentId="[DESCRICAO_DA_CONTA].[Hierarquia_DESC_CONTA].&[EXPEDIENTE]" → has .&[ → NOT root
    // Root group headers come from isCollapsed:true nodes that appear in data

    // Collect group headers: isCollapsed nodes whose parentId has .&[ (intermediate collapsed nodes)
    // AND flat group headers: nodes that ARE parents of others but not in the data themselves
    var groupHeaders = {}; // parentId string → label
    var rowParentIds = {}; // collect all parentIds seen in data

    for (var r2 = 0; r2 < this._data.length; r2++) {
      var c0 = this._data[r2]["dimensions_0"] || {};
      if (!c0.id) continue;
      if (c0.parentId) {
        // Extract the member part from parentId: ".&[LABEL]" → "LABEL"
        var pMatch0 = c0.parentId.match(/\.&\[([^\]]+)\]$/);
        if (pMatch0) {
          rowParentIds[c0.parentId] = pMatch0[1];
        }
      }
    }

    // Group rows by their immediate parentId's member label
    var groups = [];
    var groupMap = {};
    var noParentRows = [];

    for (var r3 = 0; r3 < this._data.length; r3++) {
      var c1 = this._data[r3]["dimensions_0"] || {};
      if (!c1.id) continue;

      // Skip nodes that ARE top-level group headers
      // A top-level group header = isCollapsed:true AND its parentId points to another isCollapsed node
      // In other words: skip only if it's a "section header" (its children are the main data rows)
      // We detect section headers as: isCollapsed:true AND all its children also have isCollapsed:true OR no parentId member
      // Simple rule: skip isCollapsed nodes whose parentId does NOT contain ".&[" (direct children of hierarchy root)
      if (c1.isCollapsed === true) {
        // Check if parentId points to a member (has .&[) or just to the hierarchy
        var hasMemParent = c1.parentId && c1.parentId.indexOf(".&[") !== -1;
        if (!hasMemParent) {
          // Direct child of root → this IS a section header, skip as data row
          continue;
        }
        // Otherwise: isCollapsed but has a member parent → show as row with dropdown
      }

      if (c1.parentId) {
        var pMatch1 = c1.parentId.match(/\.&\[([^\]]+)\]$/);
        if (pMatch1) {
          var gpid = c1.parentId;
          var pLabel = pMatch1[1];
          if (groupMap[gpid] === undefined) {
            groupMap[gpid] = groups.length;
            groups.push({ parentLabel: pLabel, parentId: gpid, rows: [] });
          }
          groups[groupMap[gpid]].rows.push(r3);
        } else {
          noParentRows.push(r3);
        }
      } else {
        noParentRows.push(r3);
      }
    }

    var totalCols = dimensions.length + measures.length;
    var self2 = this;

    var renderRow = function(ri) {
      var rowData = self2._data[ri];
      var tr = document.createElement("tr");
      tr.dataset.rowIndex = ri;
      tr.style.height = self2._rowHeight + "px";

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

        var isDrop = self2._dropdownDimensions.length === 0
          || self2._dropdownDimensions.indexOf(dk2) !== -1
          || self2._dropdownDimensions.indexOf(dim2.id) !== -1;

        // Only show dropdown if this cell actually HAS children in the data
        var hasChildrenInBinding = self2._childrenFromBinding &&
          self2._childrenFromBinding[dk2] &&
          self2._childrenFromBinding[dk2][cId] &&
          self2._childrenFromBinding[dk2][cId].length > 0;
        if (isDrop && !hasChildren[dk2][cId] && !hasChildrenInBinding) { isDrop = false; }

        var opts = [];
        if (self2._dropdownOptions && self2._dropdownOptions[dk2]) {
          opts = self2._dropdownOptions[dk2];
        } else if (self2._childrenFromBinding && self2._childrenFromBinding[dk2] && self2._childrenFromBinding[dk2][cId]) {
          // Use children from the secondary binding (Nível 3)
          opts = self2._childrenFromBinding[dk2][cId];
        } else if (childrenByParent[dk2] && childrenByParent[dk2][cId]) {
          opts = childrenByParent[dk2][cId];
        }
        if (isDrop && (!opts || opts.length === 0)) { isDrop = false; }

        if (isDrop) {
          self2._buildDropdownCell(td, ri, dk2, cLbl, cId, opts);
        } else {
          var sp = document.createElement("span");
          sp.className = "cell-plain";
          sp.textContent = cLbl;
          td.appendChild(sp);
        }
        tr.appendChild(td);
      }

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
        input.style.cssText = "width:100%;height:" + self2._rowHeight + "px;border:none;background:transparent;text-align:right;padding:0 12px;font-size:13px;color:var(--table-text-color,#333);box-sizing:border-box;outline:none;cursor:pointer;";

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

    // Flat rows (no grouping)
    for (var fn = 0; fn < noParentRows.length; fn++) {
      renderRow(noParentRows[fn]);
    }

    // Grouped rows with header
    for (var gi = 0; gi < groups.length; gi++) {
      var group = groups[gi];

      var trGroup = document.createElement("tr");
      trGroup.className = "dt-group-header";
      var tdGroup = document.createElement("td");
      tdGroup.colSpan = totalCols;
      tdGroup.style.cssText = "font-weight:700;background:#f0f4ff;color:#1a3a6e;padding:0 16px;line-height:" + self2._rowHeight + "px;font-size:12px;text-transform:uppercase;border-bottom:1px solid #d0d8f0;letter-spacing:0.5px;";
      tdGroup.textContent = group.parentLabel;
      trGroup.appendChild(tdGroup);
      tbody.appendChild(trGroup);

      for (var gr = 0; gr < group.rows.length; gr++) {
        renderRow(group.rows[gr]);
      }
    }
  }

  // ─── Dropdown cell ────────────────────────────────────────────
  _buildDropdownCell(td, rowIndex, dimensionId, currentLabel, currentId, options) {
    var self    = this;
    var wrapper = document.createElement("div");
    wrapper.className = "cell-dropdown";
    wrapper.tabIndex  = 0;

    var valueSpan = document.createElement("span");
    valueSpan.className = currentLabel ? "cell-value" : "cell-value empty";
    valueSpan.textContent = currentLabel || "Selecionar...";

    var arrow = document.createElement("span");
    arrow.className = "cell-arrow";
    arrow.innerHTML = '<svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    wrapper.appendChild(valueSpan);
    wrapper.appendChild(arrow);

    wrapper.addEventListener("click", function(e) {
      e.stopPropagation();
      self._openDropdown(wrapper, rowIndex, dimensionId, currentId, options);
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

    // Filter out root node — label same as dimension name or value contains "root"
    var filteredOptions = [];
    for (var fi = 0; fi < options.length; fi++) {
      var opt = options[fi];
      var lbl = (opt.label || "").toLowerCase();
      var val = (opt.value || "").toLowerCase();
      // Skip if value contains root marker or label equals dimension feed name
      if (val.indexOf("root") !== -1 || val.indexOf("].&[root]") !== -1) { continue; }
      filteredOptions.push(opt);
    }

    for (var i = 0; i < filteredOptions.length; i++) {
      (function(opt) {
        var item = document.createElement("div");
        item.className = opt.value === currentId ? "dt-dropdown-item selected" : "dt-dropdown-item";
        item.textContent = opt.label;
        item.addEventListener("mousedown", function(e) {
          e.preventDefault();
          self._selectValue(rowIndex, dimensionId, opt.value, opt.label);
          self._closeDropdown();
        });
        list.appendChild(item);
      })(filteredOptions[i]);
    }

    // Position relative to the wrapper element (not fixed to window)
    // This works correctly inside SAC iframes
    var wrapper = this.shadowRoot.getElementById("dt-wrapper");
    var wrapperRect = wrapper.getBoundingClientRect();
    var cellRect = cellEl.getBoundingClientRect();

    var listW = Math.max(cellRect.width, 160);
    var left  = cellRect.left - wrapperRect.left + wrapper.scrollLeft;
    var top   = cellRect.bottom - wrapperRect.top + wrapper.scrollTop;

    // Flip up if near bottom
    var listH = Math.min(filteredOptions.length * 36 + 8, 220);
    if (cellRect.bottom + listH > window.innerHeight - 8) {
      top = cellRect.top - wrapperRect.top + wrapper.scrollTop - listH - 2;
    }

    // Change dropdown to absolute positioning inside wrapper
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

    // Store selection locally for visual update
    if (!this._localSelections) { this._localSelections = {}; }
    if (!this._localSelections[rowIndex]) { this._localSelections[rowIndex] = {}; }
    this._localSelections[rowIndex][dimensionId] = { id: memberId, label: memberLabel };

    // Re-render immediately to show selected value
    this._render();

    // Write-back to SAC planning model in background
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
          if (!err) {
            // Clear local selection after binding confirms save
            if (self._localSelections && self._localSelections[rowIndex]) {
              delete self._localSelections[rowIndex][dimensionId];
            }
            self._loadBinding();
          }
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
