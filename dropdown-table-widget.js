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
    // Follow PlanifyIT pattern — check changedProperties for binding update
    if (changedProperties && "myDataBinding" in changedProperties) {
      var dataBinding = changedProperties.myDataBinding;
      if (dataBinding && dataBinding.state === "success") {
        this._processDataBinding(dataBinding);
        return;
      }
    }
    // Fallback to direct binding
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
      this._render();
    } catch(e) { console.error("DropdownTable _processDataBinding:", e); }
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

    // ── Collect unique row keys from first dimension only ────────
    // Show one row per unique member of dimensions_0, ignore other dims
    var rowKeys = {};
    var rowOrder = [];
    for (var r2 = 0; r2 < this._data.length; r2++) {
      var c0 = this._data[r2]["dimensions_0"] || {};
      if (c0.id && !rowKeys[c0.id] && c0.isCollapsed !== true) {
        rowKeys[c0.id] = { label: c0.label || c0.id, rowIndex: r2 };
        rowOrder.push(c0.id);
      }
    }

    // ── Rows — one per unique dimensions_0 member ────────────────
    for (var ro = 0; ro < rowOrder.length; ro++) {
      var rowKey  = rowOrder[ro];
      var rowInfo = rowKeys[rowKey];
      var ri      = rowInfo.rowIndex;
      var rowData = this._data[ri];

      var tr = document.createElement("tr");
      tr.dataset.rowIndex = ri;
      tr.style.height = this._rowHeight + "px";

      // Dimension cells
      for (var di = 0; di < dimensions.length; di++) {
        var dim   = dimensions[di];
        var dk2   = "dimensions_" + di;
        var td    = document.createElement("td");
        var cData = rowData[dk2] || {};

        // Apply local selection if available (overrides binding data)
        if (this._localSelections && this._localSelections[ri] && this._localSelections[ri][dk2]) {
          cData = this._localSelections[ri][dk2];
        }

        var cLbl  = cData.label || cData.id || "";
        var cId   = cData.id || "";

        var isDrop = this._dropdownDimensions.length === 0
          || this._dropdownDimensions.indexOf(dk2) !== -1
          || this._dropdownDimensions.indexOf(dim.id) !== -1;

        if (isDrop) {
          // Use manually set options if available, otherwise fall back to binding data
          var opts = (this._dropdownOptions && this._dropdownOptions[dk2])
            ? this._dropdownOptions[dk2]
            : dimOptions[dk2];
          this._buildDropdownCell(td, ri, dk2, cLbl, cId, opts);
        } else {
          var sp = document.createElement("span");
          sp.className = "cell-plain";
          sp.textContent = cLbl;
          td.appendChild(sp);
        }
        tr.appendChild(td);
      }

      // Measure cells — editable input
      for (var mi = 0; mi < measures.length; mi++) {
        var mk  = "measures_" + mi;
        var tdm = document.createElement("td");
        tdm.style.padding = "0";

        var mv  = rowData[mk];
        // Follow PlanifyIT: formattedValue || formatted || raw
        var mvVal = "";
        if (mv) {
          if (mv.formattedValue !== undefined) { mvVal = mv.formattedValue; }
          else if (mv.formatted !== undefined && mv.formatted !== "") { mvVal = mv.formatted; }
          else if (mv.raw !== null && mv.raw !== undefined) { mvVal = String(mv.raw); }
        }

        // Check local measure edits
        if (this._localMeasures && this._localMeasures[ri] && this._localMeasures[ri][mk] !== undefined) {
          mvVal = this._localMeasures[ri][mk];
        }

        var input = document.createElement("input");
        input.type = "text";
        input.value = mvVal;
        input.style.cssText = "width:100%;height:36px;border:none;background:transparent;text-align:right;padding:0 12px;font-size:13px;color:var(--table-text-color,#333);box-sizing:border-box;outline:none;cursor:pointer;";

        input.addEventListener("focus", function(e) {
          e.target.style.background = self._editableCellColor || "#fffbe6";
          e.target.style.outline = "2px solid #1a73e8";
          e.target.style.cursor = "text";
        });
        input.addEventListener("blur", function(e) {
          e.target.style.background = "transparent";
          e.target.style.outline = "none";
          e.target.style.cursor = "pointer";
        });

        (function(inputEl, rowIdx, measureKey, measureId, dimData) {
          inputEl.addEventListener("change", function() {
            var newVal = parseFloat(inputEl.value.replace(",", "."));
            if (isNaN(newVal)) { newVal = 0; }

            // Store locally
            if (!self._localMeasures) { self._localMeasures = {}; }
            if (!self._localMeasures[rowIdx]) { self._localMeasures[rowIdx] = {}; }
            self._localMeasures[rowIdx][measureKey] = newVal;

            // Write-back to SAC
            try {
              var b = self.myDataBinding;
              if (b && b.setValueState) {
                var addr = {};
                var dims = self._metadata.feeds.dimensions.values;
                for (var x = 0; x < dims.length; x++) {
                  var dc = dimData["dimensions_" + x] || {};
                  if (dc.id) { addr[dims[x].id] = dc.id; }
                }
                addr[measureId] = newVal;
                b.setValueState(addr, function(err) {
                  if (!err) {
                    if (self._localMeasures && self._localMeasures[rowIdx]) {
                      delete self._localMeasures[rowIdx][measureKey];
                    }
                    self._loadBinding();
                  }
                });
              }
            } catch(e) { console.error("Measure write-back error:", e); }
          });
        })(input, ri, mk, measures[mi].id, rowData);

        tdm.appendChild(input);
        tr.appendChild(tdm);
      }

      tbody.appendChild(tr);
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
