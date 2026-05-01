var TMPL = document.createElement("template");
TMPL.innerHTML = `
<style>
  :host { display: block; font-family: Arial, sans-serif; position: relative; box-sizing: border-box; }
  .dt-wrapper { width: 100%; height: 100%; overflow: auto; box-sizing: border-box; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }

  thead tr { background: var(--header-color, #1a73e8); }
  thead th {
    color: var(--header-text-color, #ffffff);
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
    position: fixed;
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
<div class="dt-wrapper">
  <table id="dt-table">
    <thead><tr id="dt-header"></tr></thead>
    <tbody id="dt-body"></tbody>
  </table>
  <div class="dt-empty" id="dt-empty">Nenhum dado disponível</div>
</div>
<div class="dt-dropdown-list hidden" id="dt-dropdown"></div>
`;

class DropdownTableWidget extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(TMPL.content.cloneNode(true));

    this._dropdownDimensions = [];
    this._selectedCellData = {};
    this._activeFilters = {};
    this._activeCell = null;
    this._metadata = null;
    this._data = null;

    this._onDocClick = this._closeDropdown.bind(this);
  }

  connectedCallback() { document.addEventListener("click", this._onDocClick); }
  disconnectedCallback() { document.removeEventListener("click", this._onDocClick); }

  // ─── SAC Lifecycle ────────────────────────────────────────────
  onCustomWidgetReady() { this._loadBinding(); }
  onCustomWidgetBeforeUpdate(c) {}
  onCustomWidgetAfterUpdate(c) { this._loadBinding(); }
  onCustomWidgetResize(w, h) { this.style.width = w + "px"; this.style.height = h + "px"; }
  onCustomWidgetDestroy() { document.removeEventListener("click", this._onDocClick); }

  // ─── Binding ──────────────────────────────────────────────────
  _loadBinding() {
    try {
      var b = this.myDataBinding;
      if (!b || !b.metadata || !b.data) return;
      this._metadata = b.metadata;
      this._data = b.data;
      this._render();
    } catch(e) { console.error("DropdownTable _loadBinding:", e); }
  }

  // ─── Properties ───────────────────────────────────────────────
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
  set width(v) { this.style.width = v + "px"; }
  set height(v) { this.style.height = v + "px"; }

  // ─── Methods ──────────────────────────────────────────────────
  setDropdownDimensions(v) { this.dropdownDimensions = v; }
  getDropdownDimensions() { return this.dropdownDimensions; }
  getSelectedCellData() { return JSON.stringify(this._selectedCellData); }
  getActiveFilters() { return JSON.stringify(this._activeFilters); }
  clearAllFilters() {
    this._activeFilters = {};
    this._applyFilters();
    this._render();
  }

  // ─── Render ───────────────────────────────────────────────────
  _render() {
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
    var measures   = this._metadata.feeds.mainStructureMembers
      ? this._metadata.feeds.mainStructureMembers.values
      : (this._metadata.feeds.measures ? this._metadata.feeds.measures.values : []);

    // ── Header ───────────────────────────────────────────────────
    for (var i = 0; i < dimensions.length; i++) {
      var th = document.createElement("th");
      th.textContent = dimensions[i].description || dimensions[i].id;
      headerRow.appendChild(th);
    }
    for (var j = 0; j < measures.length; j++) {
      var thm = document.createElement("th");
      thm.textContent = measures[j].description || measures[j].id;
      thm.style.textAlign = "right";
      headerRow.appendChild(thm);
    }

    // ── Collect unique members — exclude only root node (isCollapsed:true) ──
    // In SAC ALL hierarchy nodes have isNode:true including children.
    // Root node is identified by isCollapsed:true on first occurrence per dim.
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

    var dimMembers = {};
    for (var d = 0; d < dimensions.length; d++) {
      dimMembers["dimensions_" + d] = {};
    }
    for (var r = 0; r < this._data.length; r++) {
      var row = this._data[r];
      for (var d2 = 0; d2 < dimensions.length; d2++) {
        var dk = "dimensions_" + d2;
        var cell = row[dk];
        // Include all members except the root node
        if (cell && cell.id && cell.id !== dimRootIds[dk]) {
          dimMembers[dk][cell.id] = cell.label || cell.id;
        }
      }
    }

    // ── Rows — skip root node rows only ──────────────────────────
    for (var ri = 0; ri < this._data.length; ri++) {
      var rowData   = this._data[ri];
      var firstCell = rowData["dimensions_0"] || {};

      // Skip only root node rows
      if (firstCell.id && firstCell.id === dimRootIds["dimensions_0"]) { continue; }

      var tr = document.createElement("tr");
      tr.dataset.rowIndex = ri;

      // Dimension cells
      for (var di = 0; di < dimensions.length; di++) {
        var dim   = dimensions[di];
        var dk2   = "dimensions_" + di;
        var td    = document.createElement("td");
        var cData = rowData[dk2] || {};
        var cLbl  = cData.label || cData.id || "";
        var cId   = cData.id || "";

        var isDrop = this._dropdownDimensions.length === 0
          || this._dropdownDimensions.indexOf(dk2) !== -1
          || this._dropdownDimensions.indexOf(dim.id) !== -1;

        if (isDrop) {
          var opts  = [];
          var mems  = dimMembers[dk2];
          var mkeys = Object.keys(mems);
          for (var ki = 0; ki < mkeys.length; ki++) {
            opts.push({ value: mkeys[ki], label: mems[mkeys[ki]] });
          }
          this._buildDropdownCell(td, ri, dk2, cLbl, cId, opts);
        } else {
          var sp = document.createElement("span");
          sp.className = "cell-plain";
          sp.textContent = cLbl;
          td.appendChild(sp);
        }
        tr.appendChild(td);
      }

      // Measure cells
      for (var mi = 0; mi < measures.length; mi++) {
        var mk  = "measures_" + mi;
        var tdm = document.createElement("td");
        var spm = document.createElement("span");
        spm.className = "cell-plain";
        spm.style.textAlign = "right";
        var mv  = rowData[mk];
        spm.textContent = mv ? (mv.formatted || mv.raw || "") : "";
        tdm.appendChild(spm);
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

    for (var i = 0; i < options.length; i++) {
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
      })(options[i]);
    }

    // Position below cell, flip if near edge
    var rect  = cellEl.getBoundingClientRect();
    var listW = Math.max(rect.width, 160);
    var left  = rect.left;
    var top   = rect.bottom + 2;

    if (left + listW > window.innerWidth - 8) { left = window.innerWidth - listW - 8; }
    var listH = Math.min(options.length * 36 + 8, 220);
    if (top + listH > window.innerHeight - 8) { top = rect.top - listH - 2; }

    list.style.left     = left  + "px";
    list.style.top      = top   + "px";
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

    // Write-back to SAC planning model
    try {
      var binding    = this.myDataBinding;
      var rowData    = this._data[rowIndex];
      var dimensions = this._metadata.feeds.dimensions.values;

      if (binding && binding.setValueState) {
        var cellAddress = {};

        // Build full dimensional context for this row
        for (var di = 0; di < dimensions.length; di++) {
          var dk   = "dimensions_" + di;
          var cell = rowData[dk] || {};
          if (cell.id) { cellAddress[dimensions[di].id] = cell.id; }
        }

        // Override the changed dimension with new member
        var dimIdx = parseInt(dimensionId.replace("dimensions_", ""), 10);
        if (!isNaN(dimIdx) && dimensions[dimIdx]) {
          cellAddress[dimensions[dimIdx].id] = memberId;
        }

        binding.setValueState(cellAddress, function(err) {
          if (!err) { self._loadBinding(); }
        });
      } else {
        // Fallback: apply as filter
        this._activeFilters[dimensionId] = memberId;
        this._applyFilters();
        this._render();
      }
    } catch(e) {
      console.error("DropdownTable write-back error:", e);
      this._activeFilters[dimensionId] = memberId;
      this._applyFilters();
      this._render();
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
