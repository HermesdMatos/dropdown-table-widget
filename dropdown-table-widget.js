const DROPDOWN_TABLE_TEMPLATE = document.createElement("template");
DROPDOWN_TABLE_TEMPLATE.innerHTML = `
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
    z-index: 1;
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
    flex-shrink: 0;
  }
  .dt-dropdown-list {
    position: fixed;
    background: #ffffff;
    border: 1px solid #dadce0;
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 99999;
    min-width: 140px;
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
  .dt-empty {
    padding: 32px;
    text-align: center;
    color: #999;
    font-size: 13px;
  }
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
    this.shadowRoot.appendChild(DROPDOWN_TABLE_TEMPLATE.content.cloneNode(true));

    // Internal state
    this._dropdownDimensions = [];
    this._selectedCellData = {};
    this._activeFilters = {};
    this._activeCell = null;
    this._metadata = null;
    this._data = null;

    this._onDocClick = this._closeDropdown.bind(this);
  }

  connectedCallback() {
    document.addEventListener("click", this._onDocClick);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._onDocClick);
  }

  // ─── SAC Lifecycle Hooks ──────────────────────────────────────

  onCustomWidgetReady() {
    this._loadBinding();
  }

  onCustomWidgetBeforeUpdate(changedProps) {}

  onCustomWidgetAfterUpdate(changedProps) {
    this._loadBinding();
  }

  onCustomWidgetResize(width, height) {
    this.style.width = width + "px";
    this.style.height = height + "px";
  }

  onCustomWidgetDestroy() {
    document.removeEventListener("click", this._onDocClick);
  }

  // ─── Load data from SAC binding ───────────────────────────────

  _loadBinding() {
    try {
      var binding = this.myDataBinding;
      console.log("DropdownTable: binding =", binding);
      if (!binding) { console.log("DropdownTable: binding is null"); return; }
      console.log("DropdownTable: metadata =", binding.metadata);
      console.log("DropdownTable: data =", binding.data);
      console.log("DropdownTable: state =", binding.state);
      if (!binding.metadata) { console.log("DropdownTable: no metadata"); return; }
      if (!binding.data) { console.log("DropdownTable: no data"); return; }

      this._metadata = binding.metadata;
      this._data = binding.data;
      this._render();
    } catch (e) {
      console.error("DropdownTable _loadBinding error:", e);
    }
  }

  // ─── Properties ───────────────────────────────────────────────

  get dropdownDimensions() { return JSON.stringify(this._dropdownDimensions); }
  set dropdownDimensions(val) {
    try { this._dropdownDimensions = JSON.parse(val); } catch(e) { this._dropdownDimensions = []; }
    this._render();
  }

  get selectedCellData() { return JSON.stringify(this._selectedCellData); }
  set selectedCellData(val) {
    try { this._selectedCellData = JSON.parse(val); } catch(e) { this._selectedCellData = {}; }
  }

  set headerColor(v) { this.shadowRoot.host.style.setProperty("--header-color", v); }
  set headerTextColor(v) { this.shadowRoot.host.style.setProperty("--header-text-color", v); }
  set selectedRowColor(v) { this.shadowRoot.host.style.setProperty("--selected-row-color", v); }
  set hoverRowColor(v) { this.shadowRoot.host.style.setProperty("--hover-row-color", v); }
  set tableTextColor(v) { this.shadowRoot.host.style.setProperty("--table-text-color", v); }
  set dropdownHighlightColor(v) { this.shadowRoot.host.style.setProperty("--dropdown-highlight-color", v); }
  set width(v) { this.style.width = v + "px"; }
  set height(v) { this.style.height = v + "px"; }

  // ─── Public Methods ───────────────────────────────────────────

  setDropdownDimensions(val) { this.dropdownDimensions = val; }
  getDropdownDimensions() { return this.dropdownDimensions; }
  getSelectedCellData() { return JSON.stringify(this._selectedCellData); }
  getActiveFilters() { return JSON.stringify(this._activeFilters); }

  clearAllFilters() {
    this._activeFilters = {};
    this._applyFiltersToBinding();
    this._render();
  }

  // ─── Render ───────────────────────────────────────────────────

  _render() {
    var headerRow = this.shadowRoot.getElementById("dt-header");
    var tbody = this.shadowRoot.getElementById("dt-body");
    var emptyMsg = this.shadowRoot.getElementById("dt-empty");

    headerRow.innerHTML = "";
    tbody.innerHTML = "";

    if (!this._metadata || !this._data || this._data.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    var dimensions = this._metadata.feeds.dimensions.values;
    var measures = this._metadata.feeds.measures.values;

    // Header
    for (var i = 0; i < dimensions.length; i++) {
      var th = document.createElement("th");
      th.textContent = dimensions[i].description || dimensions[i].id;
      headerRow.appendChild(th);
    }
    for (var j = 0; j < measures.length; j++) {
      var thm = document.createElement("th");
      thm.textContent = measures[j].description || measures[j].id;
      headerRow.appendChild(thm);
    }

    // Collect unique members per dimension for dropdown options
    var dimMembers = {};
    for (var d = 0; d < dimensions.length; d++) {
      dimMembers[dimensions[d].id] = {};
    }
    for (var r = 0; r < this._data.length; r++) {
      var row = this._data[r];
      for (var d2 = 0; d2 < dimensions.length; d2++) {
        var dimId = dimensions[d2].id;
        var cell = row[dimId];
        if (cell && cell.id) {
          dimMembers[dimId][cell.id] = cell.label || cell.id;
        }
      }
    }

    // Rows
    for (var ri = 0; ri < this._data.length; ri++) {
      var rowData = this._data[ri];
      var tr = document.createElement("tr");

      for (var di = 0; di < dimensions.length; di++) {
        var dim = dimensions[di];
        var td = document.createElement("td");
        var cellData = rowData[dim.id] || {};
        var cellLabel = cellData.label || cellData.id || "";
        var cellId = cellData.id || "";

        var isDropdown = true; // todas as dimensões são dropdown automaticamente

        if (isDropdown) {
          var opts = [];
          var members = dimMembers[dim.id];
          var keys = Object.keys(members);
          for (var ki = 0; ki < keys.length; ki++) {
            opts.push({ value: keys[ki], label: members[keys[ki]] });
          }
          this._buildDropdownCell(td, ri, dim.id, cellLabel, cellId, opts);
        } else {
          var span = document.createElement("span");
          span.className = "cell-plain";
          span.textContent = cellLabel;
          td.appendChild(span);
        }

        tr.appendChild(td);
      }

      for (var mi = 0; mi < measures.length; mi++) {
        var mes = measures[mi];
        var tdm = document.createElement("td");
        var spanm = document.createElement("span");
        spanm.className = "cell-plain";
        var mesVal = rowData[mes.id];
        spanm.textContent = (mesVal !== undefined && mesVal !== null) ? mesVal : "";
        tdm.appendChild(spanm);
        tr.appendChild(tdm);
      }

      tbody.appendChild(tr);
    }
  }

  // ─── Dropdown cell ────────────────────────────────────────────

  _buildDropdownCell(td, rowIndex, dimensionId, currentLabel, currentId, options) {
    var self = this;
    var wrapper = document.createElement("div");
    wrapper.className = "cell-dropdown";
    wrapper.tabIndex = 0;

    var valueSpan = document.createElement("span");
    valueSpan.className = currentLabel ? "cell-value" : "cell-value empty";
    valueSpan.textContent = currentLabel || "Selecionar...";

    var arrow = document.createElement("span");
    arrow.className = "cell-arrow";
    arrow.innerHTML = '<svg viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    wrapper.appendChild(valueSpan);
    wrapper.appendChild(arrow);

    wrapper.addEventListener("click", function(e) {
      e.stopPropagation();
      self._openDropdown(wrapper, rowIndex, dimensionId, currentId, options);
    });

    wrapper.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wrapper.click(); }
      if (e.key === "Escape") { self._closeDropdown(); }
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

    var rect = cellEl.getBoundingClientRect();
    list.style.left = rect.left + "px";
    list.style.top = (rect.bottom + 2) + "px";
    list.style.minWidth = rect.width + "px";

    setTimeout(function() {
      document.addEventListener("click", self._onDocClick, { once: true });
    }, 0);
  }

  _closeDropdown() {
    var list = this.shadowRoot.getElementById("dt-dropdown");
    if (list) {
      list.classList.add("hidden");
      list.innerHTML = "";
    }
    if (this._activeCell) {
      this._activeCell.classList.remove("active");
      this._activeCell = null;
    }
  }

  _selectValue(rowIndex, dimensionId, memberId, memberLabel) {
    this._selectedCellData = {
      row: rowIndex,
      dimensionId: dimensionId,
      memberId: memberId,
      memberLabel: memberLabel
    };

    this._activeFilters[dimensionId] = memberId;
    this._applyFiltersToBinding();

    this.dispatchEvent(new CustomEvent("onDropdownChanged", {
      bubbles: true,
      composed: true,
      detail: this._selectedCellData
    }));
  }

  _applyFiltersToBinding() {
    try {
      var binding = this.myDataBinding;
      if (!binding || !this._metadata) return;

      var dimensions = this._metadata.feeds.dimensions.values;

      for (var i = 0; i < dimensions.length; i++) {
        try { binding.removeDimensionFilter(dimensions[i].id); } catch(e) {}
      }

      var keys = Object.keys(this._activeFilters);
      for (var k = 0; k < keys.length; k++) {
        var dimId = keys[k];
        var memberId = this._activeFilters[dimId];
        if (memberId) {
          binding.setDimensionFilter(dimId, [memberId]);
        }
      }
    } catch(e) {
      console.error("DropdownTable _applyFiltersToBinding error:", e);
    }
  }
}

customElements.define("dropdowntable-widget", DropdownTableWidget);
