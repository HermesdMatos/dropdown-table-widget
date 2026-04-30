const DROPDOWN_TABLE_TEMPLATE = document.createElement("template");
DROPDOWN_TABLE_TEMPLATE.innerHTML = `
<style>
  :host { display: block; font-family: Arial, sans-serif; position: relative; }
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
  }
  tbody tr { border-bottom: 1px solid #e0e0e0; cursor: default; }
  tbody tr:hover { background: var(--hover-row-color, #f5f5f5); }
  tbody tr.selected { background: var(--selected-row-color, #e8f0fe); }
  tbody td {
    padding: 0;
    color: var(--table-text-color, #333333);
    border-right: 1px solid #e0e0e0;
    height: 36px;
    vertical-align: middle;
  }
  .cell-plain { padding: 0 12px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell-dropdown {
    position: relative;
    display: flex;
    align-items: center;
    height: 36px;
    cursor: pointer;
    user-select: none;
  }
  .cell-dropdown:hover { background: rgba(26,115,232,0.06); }
  .cell-dropdown.active { outline: 2px solid #1a73e8; outline-offset: -2px; background: rgba(26,115,232,0.06); }
  .cell-value {
    flex: 1;
    padding: 0 28px 0 12px;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-value.empty { color: #aaa; font-style: italic; }
  .cell-arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    pointer-events: none;
    color: #555;
  }
  .dt-dropdown-list {
    position: fixed;
    background: #fff;
    border: 1px solid #dadce0;
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 99999;
    min-width: 160px;
    max-height: 240px;
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
  .dt-empty { padding: 24px; text-align: center; color: #999; font-size: 13px; }
</style>
<div class="dt-wrapper">
  <table id="dt-table">
    <thead><tr id="dt-header"></tr></thead>
    <tbody id="dt-body"></tbody>
  </table>
  <div class="dt-empty hidden" id="dt-empty">Nenhum dado disponível</div>
</div>
<div class="dt-dropdown-list hidden" id="dt-dropdown"></div>
`;

class DropdownTableWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(DROPDOWN_TABLE_TEMPLATE.content.cloneNode(true));

    this._metadata = null;
    this._data = null;
    this._dropdownDimensions = [];
    this._selectedCellData = {};
    this._activeFilters = {};
    this._activeCell = null;
    this._closeDropdownBound = this._closeDropdown.bind(this);
  }

  connectedCallback() {
    document.addEventListener("click", this._closeDropdownBound);
    this._applyColorDefaults();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._closeDropdownBound);
  }

  // ─── SAC Data Binding ─────────────────────────────────────────
  // SAC calls this automatically when data binding updates
  onCustomWidgetAfterUpdate(changedProperties) {
    if (changedProperties.has("myDataBinding")) {
      this._processBinding();
    }
  }

  _processBinding() {
    try {
      const binding = this.myDataBinding;
      if (!binding) return;
      this._metadata = binding.metadata;
      this._data = binding.data;
      this._render();
    } catch (e) {
      console.error("DropdownTable: error processing binding", e);
    }
  }

  // ─── Color defaults ───────────────────────────────────────────
  _applyColorDefaults() {
    const defaults = {
      "--header-color": "#1a73e8",
      "--header-text-color": "#ffffff",
      "--selected-row-color": "#e8f0fe",
      "--hover-row-color": "#f5f5f5",
      "--table-text-color": "#333333",
      "--dropdown-highlight-color": "#e8f0fe"
    };
    Object.entries(defaults).forEach(([k, v]) => {
      if (!this.style.getPropertyValue(k)) this.style.setProperty(k, v);
    });
  }

  // ─── Properties ───────────────────────────────────────────────
  // JSON array of dimension feed IDs to render as dropdown
  // e.g. '["dimensions_1","dimensions_2"]'
  set dropdownDimensions(val) {
    try { this._dropdownDimensions = JSON.parse(val); } catch { this._dropdownDimensions = []; }
    this._render();
  }
  get dropdownDimensions() { return JSON.stringify(this._dropdownDimensions); }

  get selectedCellData() { return JSON.stringify(this._selectedCellData); }

  set headerColor(v) { this.style.setProperty("--header-color", v); }
  set headerTextColor(v) { this.style.setProperty("--header-text-color", v); }
  set selectedRowColor(v) { this.style.setProperty("--selected-row-color", v); }
  set hoverRowColor(v) { this.style.setProperty("--hover-row-color", v); }
  set tableTextColor(v) { this.style.setProperty("--table-text-color", v); }
  set dropdownHighlightColor(v) { this.style.setProperty("--dropdown-highlight-color", v); }
  set width(v) { this.style.width = v + "px"; }
  set height(v) { this.style.height = v + "px"; }

  // ─── SAC Methods ──────────────────────────────────────────────
  setDropdownDimensions(val) { this.dropdownDimensions = val; }
  getDropdownDimensions() { return this.dropdownDimensions; }
  getSelectedCellData() { return JSON.stringify(this._selectedCellData); }
  getActiveFilters() { return JSON.stringify(this._activeFilters); }

  clearAllFilters() {
    this._activeFilters = {};
    this._applyFiltersToBinding();
    this._render();
  }

  // ─── Rendering ────────────────────────────────────────────────
  _render() {
    const headerRow = this.shadowRoot.getElementById("dt-header");
    const tbody = this.shadowRoot.getElementById("dt-body");
    const emptyMsg = this.shadowRoot.getElementById("dt-empty");

    headerRow.innerHTML = "";
    tbody.innerHTML = "";

    const metadata = this._metadata;
    const data = this._data;

    if (!metadata || !data || data.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    // Dimensions and measures from SAC metadata
    const dimensions = metadata.feeds.dimensions.values;
    const measures = metadata.feeds.measures.values;

    // Build header row
    dimensions.forEach(dim => {
      const th = document.createElement("th");
      th.textContent = dim.description || dim.id;
      headerRow.appendChild(th);
    });
    measures.forEach(mes => {
      const th = document.createElement("th");
      th.textContent = mes.description || mes.id;
      headerRow.appendChild(th);
    });

    // Collect unique members per dimension for dropdown options
    const dimMembers = {};
    dimensions.forEach(dim => { dimMembers[dim.id] = {}; });
    data.forEach(row => {
      dimensions.forEach(dim => {
        const cell = row[dim.id];
        if (cell && cell.id) {
          dimMembers[dim.id][cell.id] = cell.label || cell.id;
        }
      });
    });

    // Build data rows
    data.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      tr.dataset.rowIndex = rowIndex;

      dimensions.forEach(dim => {
        const td = document.createElement("td");
        const cell = row[dim.id] || {};
        const cellLabel = cell.label || cell.id || "";
        const cellId = cell.id || "";

        const isDropdown = this._dropdownDimensions.indexOf(dim.id) !== -1;

        if (isDropdown) {
          const options = Object.entries(dimMembers[dim.id]).map(([id, label]) => ({ value: id, label: label }));
          this._buildDropdownCell(td, rowIndex, dim.id, cellLabel, cellId, options);
        } else {
          const span = document.createElement("span");
          span.className = "cell-plain";
          span.textContent = cellLabel;
          td.appendChild(span);
        }

        tr.appendChild(td);
      });

      measures.forEach(mes => {
        const td = document.createElement("td");
        const span = document.createElement("span");
        span.className = "cell-plain";
        const val = row[mes.id];
        span.textContent = (val !== undefined && val !== null) ? val : "";
        td.appendChild(span);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // ─── Dropdown cell builder ────────────────────────────────────
  _buildDropdownCell(td, rowIndex, dimensionId, currentLabel, currentId, options) {
    const wrapper = document.createElement("div");
    wrapper.className = "cell-dropdown";
    wrapper.tabIndex = 0;

    const valueSpan = document.createElement("span");
    valueSpan.className = "cell-value" + (currentLabel ? "" : " empty");
    valueSpan.textContent = currentLabel || "Selecionar...";

    const arrow = document.createElement("span");
    arrow.className = "cell-arrow";
    arrow.innerHTML = `<svg viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;

    wrapper.appendChild(valueSpan);
    wrapper.appendChild(arrow);

    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      this._openDropdown(wrapper, rowIndex, dimensionId, currentId, options);
    });

    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wrapper.click(); }
      if (e.key === "Escape") this._closeDropdown();
    });

    td.appendChild(wrapper);
  }

  _openDropdown(cellEl, rowIndex, dimensionId, currentId, options) {
    this._closeDropdown();
    if (!options || options.length === 0) return;

    cellEl.classList.add("active");
    this._activeCell = cellEl;

    const list = this.shadowRoot.getElementById("dt-dropdown");
    list.innerHTML = "";
    list.classList.remove("hidden");

    options.forEach(opt => {
      const item = document.createElement("div");
      item.className = "dt-dropdown-item" + (opt.value === currentId ? " selected" : "");
      item.textContent = opt.label;

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this._selectValue(rowIndex, dimensionId, opt.value, opt.label);
        this._closeDropdown();
      });

      list.appendChild(item);
    });

    const rect = cellEl.getBoundingClientRect();
    list.style.left = rect.left + "px";
    list.style.top = (rect.bottom + 2) + "px";
    list.style.minWidth = rect.width + "px";

    setTimeout(() => {
      document.addEventListener("click", this._closeDropdownBound, { once: true });
    }, 0);
  }

  _closeDropdown() {
    const list = this.shadowRoot.getElementById("dt-dropdown");
    list.classList.add("hidden");
    list.innerHTML = "";
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
      detail: this._selectedCellData,
      bubbles: true,
      composed: true
    }));
  }

  _applyFiltersToBinding() {
    try {
      const binding = this.myDataBinding;
      if (!binding) return;

      const dimensions = this._metadata.feeds.dimensions.values;

      // Remove all existing dimension filters
      dimensions.forEach(dim => {
        try { binding.removeDimensionFilter(dim.id); } catch (e) {}
      });

      // Re-apply active filters
      Object.entries(this._activeFilters).forEach(([dimId, memberId]) => {
        if (memberId) binding.setDimensionFilter(dimId, [memberId]);
      });
    } catch (e) {
      console.error("DropdownTable: error applying filters", e);
    }
  }
}

customElements.define("dropdown-table-widget", DropdownTableWidget);
