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
  .cell-plain { padding: 0 12px; }
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

  /* Dropdown list */
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

    this._tableData = [];
    this._tableColumns = [];
    this._dropdownColumns = [];
    this._selectedCellData = {};
    this._activeDropdown = null;
    this._activeCell = null;

    this._closeDropdownBound = this._closeDropdown.bind(this);
  }

  // ─── Lifecycle ────────────────────────────────────────────────
  connectedCallback() {
    document.addEventListener("click", this._closeDropdownBound);
    this._applyColors();
    this._render();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._closeDropdownBound);
  }

  // ─── SAC property accessors ───────────────────────────────────
  set tableData(val) {
    try { this._tableData = JSON.parse(val); } catch { this._tableData = []; }
    this._render();
  }
  get tableData() { return JSON.stringify(this._tableData); }

  set tableColumns(val) {
    try { this._tableColumns = JSON.parse(val); } catch { this._tableColumns = []; }
    this._render();
  }
  get tableColumns() { return JSON.stringify(this._tableColumns); }

  set dropdownColumns(val) {
    try { this._dropdownColumns = JSON.parse(val); } catch { this._dropdownColumns = []; }
    this._render();
  }
  get dropdownColumns() { return JSON.stringify(this._dropdownColumns); }

  get selectedCellData() { return JSON.stringify(this._selectedCellData); }
  set selectedCellData(val) {
    try { this._selectedCellData = JSON.parse(val); } catch { this._selectedCellData = {}; }
  }

  // Color properties
  set headerColor(v) { this.style.setProperty("--header-color", v); }
  set headerTextColor(v) { this.style.setProperty("--header-text-color", v); }
  set selectedRowColor(v) { this.style.setProperty("--selected-row-color", v); }
  set hoverRowColor(v) { this.style.setProperty("--hover-row-color", v); }
  set tableTextColor(v) { this.style.setProperty("--table-text-color", v); }
  set dropdownHighlightColor(v) { this.style.setProperty("--dropdown-highlight-color", v); }
  set width(v) { this.style.width = v + "px"; }
  set height(v) { this.style.height = v + "px"; }

  // ─── SAC Methods ──────────────────────────────────────────────
  setTableData(data) { this.tableData = data; }
  getTableData() { return this.tableData; }
  setTableColumns(columns) { this.tableColumns = columns; }
  getTableColumns() { return this.tableColumns; }
  setDropdownColumns(config) { this.dropdownColumns = config; }
  getDropdownColumns() { return this.dropdownColumns; }
  getSelectedCellData() { return this.selectedCellData; }
  clearAllSelections() {
    this._selectedCellData = {};
    this._render();
  }

  // ─── Rendering ────────────────────────────────────────────────
  _applyColors() {
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

  _getDropdownConfig(columnKey) {
    return this._dropdownColumns.find(d => d.columnKey === columnKey) || null;
  }

  _render() {
    const headerRow = this.shadowRoot.getElementById("dt-header");
    const tbody = this.shadowRoot.getElementById("dt-body");
    const emptyMsg = this.shadowRoot.getElementById("dt-empty");

    headerRow.innerHTML = "";
    tbody.innerHTML = "";

    const cols = this._tableColumns;
    const rows = this._tableData;

    if (cols.length === 0 || rows.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    // Header
    cols.forEach(col => {
      const th = document.createElement("th");
      th.textContent = col.label || col.key;
      if (col.width) th.style.width = col.width;
      headerRow.appendChild(th);
    });

    // Rows
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      tr.dataset.rowIndex = rowIndex;

      cols.forEach(col => {
        const td = document.createElement("td");
        const ddConfig = this._getDropdownConfig(col.key);

        if (ddConfig) {
          this._buildDropdownCell(td, row, rowIndex, col.key, ddConfig);
        } else {
          const span = document.createElement("span");
          span.className = "cell-plain";
          span.textContent = row[col.key] !== undefined ? row[col.key] : "";
          td.appendChild(span);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  _buildDropdownCell(td, row, rowIndex, columnKey, ddConfig) {
    const wrapper = document.createElement("div");
    wrapper.className = "cell-dropdown";
    wrapper.tabIndex = 0;

    const valueSpan = document.createElement("span");
    const currentVal = row[columnKey];
    valueSpan.className = "cell-value" + (currentVal ? "" : " empty");
    valueSpan.textContent = currentVal || (ddConfig.placeholder || "Selecionar...");

    const arrow = document.createElement("span");
    arrow.className = "cell-arrow";
    arrow.innerHTML = `<svg viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;

    wrapper.appendChild(valueSpan);
    wrapper.appendChild(arrow);

    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      this._openDropdown(wrapper, rowIndex, columnKey, ddConfig, currentVal);
    });

    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._openDropdown(wrapper, rowIndex, columnKey, ddConfig, currentVal);
      }
      if (e.key === "Escape") this._closeDropdown();
    });

    td.appendChild(wrapper);
  }

  _openDropdown(cellEl, rowIndex, columnKey, ddConfig, currentVal) {
    this._closeDropdown();

    const options = ddConfig.options || [];
    if (options.length === 0) return;

    cellEl.classList.add("active");
    this._activeCell = cellEl;

    const list = this.shadowRoot.getElementById("dt-dropdown");
    list.innerHTML = "";
    list.classList.remove("hidden");

    options.forEach(opt => {
      const optVal = typeof opt === "object" ? opt.value : opt;
      const optLabel = typeof opt === "object" ? opt.label : opt;

      const item = document.createElement("div");
      item.className = "dt-dropdown-item" + (optVal === currentVal ? " selected" : "");
      item.textContent = optLabel;

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this._selectValue(rowIndex, columnKey, optVal);
        this._closeDropdown();
      });

      list.appendChild(item);
    });

    // Position below the cell
    const rect = cellEl.getBoundingClientRect();
    list.style.left = rect.left + "px";
    list.style.top = (rect.bottom + 2) + "px";
    list.style.minWidth = rect.width + "px";

    this._activeDropdown = list;

    // Close on outside click (deferred to avoid immediate close)
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
    this._activeDropdown = null;
  }

  _selectValue(rowIndex, columnKey, value) {
    // Update internal data
    if (this._tableData[rowIndex]) {
      this._tableData[rowIndex][columnKey] = value;
    }

    // Store selected cell info for SAC Script to read
    this._selectedCellData = {
      row: rowIndex,
      column: columnKey,
      value: value,
      rowData: this._tableData[rowIndex]
    };

    // Re-render to reflect new value
    this._render();

    // Fire SAC event
    this.dispatchEvent(new CustomEvent("onDropdownChanged", {
      detail: this._selectedCellData,
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define("dropdown-table-widget", DropdownTableWidget);
