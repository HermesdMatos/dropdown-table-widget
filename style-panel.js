var STYLE_PANEL_TMPL = document.createElement("template");
STYLE_PANEL_TMPL.innerHTML = `
<style>
  :host { display: block; font-family: Arial, sans-serif; font-size: 13px; color: #333; }
  .section { margin-bottom: 16px; }
  .section-title {
    font-weight: 700;
    font-size: 13px;
    padding: 8px 0 6px 0;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
  }
  .section-title .chevron {
    display: inline-block;
    width: 10px;
    height: 10px;
    transition: transform 0.15s;
  }
  .section-title.collapsed .chevron { transform: rotate(-90deg); }
  .section-body { padding: 0 2px; }
  .section-body.hidden { display: none; }

  .field { margin-bottom: 10px; }
  .field label {
    display: block;
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }
  .field select, .field input[type="text"], .field input[type="number"] {
    width: 100%;
    height: 28px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0 8px;
    font-size: 12px;
    box-sizing: border-box;
    background: #fff;
  }
  .field select:focus, .field input:focus {
    outline: none;
    border-color: #1a73e8;
  }

  .field-row { display: flex; gap: 8px; }
  .field-row .field { flex: 1; }

  .color-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #ccc;
    border-radius: 3px;
    cursor: pointer;
    padding: 2px;
    box-sizing: border-box;
    background: #fff;
    position: relative;
  }
  .color-btn input[type="color"] {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .color-swatch {
    width: 100%;
    height: 100%;
    border-radius: 2px;
    pointer-events: none;
  }
  .field-color-row { display: flex; align-items: center; gap: 8px; }
  .field-color-row .color-btn { flex-shrink: 0; }
  .field-color-row select { flex: 1; }

  .toggle-row { display: flex; gap: 4px; }
  .toggle-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s;
  }
  .toggle-btn.active { background: #e8f0fe; border-color: #1a73e8; color: #1a73e8; }
  .toggle-btn:hover { background: #f1f3f4; }
</style>

<div class="section" id="sec-font">
  <div class="section-title" id="sec-font-title">
    <span class="chevron">▼</span>
    <span>Fonte</span>
  </div>
  <div class="section-body" id="sec-font-body">
    <div class="field-row">
      <div class="field">
        <label>Fonte:</label>
        <select id="fontFamily">
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Helvetica Neue', sans-serif">Helvetica</option>
          <option value="'72', Arial, sans-serif">72-Web</option>
          <option value="'Roboto', sans-serif">Roboto</option>
          <option value="'Open Sans', sans-serif">Open Sans</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>
      </div>
      <div class="field" style="max-width:80px">
        <label>Tamanho:</label>
        <select id="fontSize">
          <option value="11">11</option>
          <option value="12">12</option>
          <option value="13" selected>13</option>
          <option value="14">14</option>
          <option value="15">15</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
        </select>
      </div>
      <div class="field" style="max-width:48px">
        <label>Cor:</label>
        <div class="color-btn" id="colorBtn-text">
          <div class="color-swatch" id="colorSwatch-text" style="background:#333333"></div>
          <input type="color" id="color-text" value="#333333">
        </div>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Estilo da fonte:</label>
        <select id="fontWeight">
          <option value="normal">Padrão</option>
          <option value="bold">Negrito</option>
          <option value="italic">Itálico</option>
          <option value="bold italic">Negrito + Itálico</option>
        </select>
      </div>
      <div class="field">
        <label>Estilo do texto:</label>
        <div class="toggle-row">
          <button class="toggle-btn" id="btn-underline" title="Sublinhado"><u>U</u></button>
          <button class="toggle-btn" id="btn-strikethrough" title="Riscado"><s>S</s></button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="section" id="sec-table">
  <div class="section-title" id="sec-table-title">
    <span class="chevron">▼</span>
    <span>Propriedades tabela</span>
  </div>
  <div class="section-body" id="sec-table-body">
    <div class="field">
      <label>Template:</label>
      <select id="template">
        <option value="light">Padrão</option>
        <option value="dark">Escuro</option>
        <option value="minimal">Minimalista</option>
      </select>
    </div>
    <div class="field">
      <label>Preenchimento de cor para células editáveis:</label>
      <div class="color-btn" id="colorBtn-editable">
        <div class="color-swatch" id="colorSwatch-editable" style="background:#fffbe6"></div>
        <input type="color" id="color-editable" value="#fffbe6">
      </div>
    </div>
    <div class="field">
      <label>Preenchimento de cor para header:</label>
      <div class="color-btn" id="colorBtn-header">
        <div class="color-swatch" id="colorSwatch-header" style="background:#1a73e8"></div>
        <input type="color" id="color-header" value="#1a73e8">
      </div>
    </div>
    <div class="field">
      <label>Altura da linha:</label>
      <select id="rowHeight">
        <option value="32">Compacta (32px)</option>
        <option value="36" selected>Padrão (36px)</option>
        <option value="44">Confortável (44px)</option>
        <option value="52">Espaçosa (52px)</option>
      </select>
    </div>
    <div class="field">
      <label>Largura da coluna:</label>
      <select id="colWidth">
        <option value="auto" selected>Redimensionamento automático</option>
        <option value="120">Fixa - Pequena (120px)</option>
        <option value="160">Fixa - Média (160px)</option>
        <option value="200">Fixa - Grande (200px)</option>
      </select>
    </div>
    <div class="field">
      <label>Exibir unidade/moedas:</label>
      <select id="showUnit">
        <option value="none" selected>Padrão</option>
        <option value="prefix">Prefixo (R$)</option>
        <option value="suffix">Sufixo (BRL)</option>
      </select>
    </div>
  </div>
</div>
`;

class DropdownTableStyling extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(STYLE_PANEL_TMPL.content.cloneNode(true));
    this._widget = null;
    this._underline = false;
    this._strikethrough = false;
  }

  connectedCallback() {
    var self = this;

    // Section collapse toggles
    ["font", "table"].forEach(function(sec) {
      var title = self.shadowRoot.getElementById("sec-" + sec + "-title");
      var body  = self.shadowRoot.getElementById("sec-" + sec + "-body");
      title.addEventListener("click", function() {
        var collapsed = body.classList.toggle("hidden");
        title.classList.toggle("collapsed", collapsed);
      });
    });

    // Color pickers
    ["text", "editable", "header"].forEach(function(id) {
      var inp    = self.shadowRoot.getElementById("color-" + id);
      var swatch = self.shadowRoot.getElementById("colorSwatch-" + id);
      inp.addEventListener("input", function() {
        swatch.style.background = inp.value;
        self._applyChange();
      });
    });

    // Toggle buttons
    self.shadowRoot.getElementById("btn-underline").addEventListener("click", function() {
      self._underline = !self._underline;
      this.classList.toggle("active", self._underline);
      self._applyChange();
    });
    self.shadowRoot.getElementById("btn-strikethrough").addEventListener("click", function() {
      self._strikethrough = !self._strikethrough;
      this.classList.toggle("active", self._strikethrough);
      self._applyChange();
    });

    // Selects
    ["fontFamily","fontSize","fontWeight","template","rowHeight","colWidth","showUnit"].forEach(function(id) {
      self.shadowRoot.getElementById(id).addEventListener("change", function() {
        self._applyChange();
      });
    });
  }

  // SAC calls this to pass the widget reference
  set widget(w) {
    this._widget = w;
  }

  _getWidget() {
    // SAC injects the main widget as this.myWidget in styling components
    return this._widget || this.myWidget || null;
  }

  _getVal(id) {
    return this.shadowRoot.getElementById(id).value;
  }

  _applyChange() {
    var w = this._getWidget();
    if (!w) {
      console.warn("DropdownTable styling: no widget reference");
      return;
    }

    var fontFamily   = this._getVal("fontFamily");
    var fontSize     = this._getVal("fontSize");
    var fontWeight   = this._getVal("fontWeight");
    var colorText    = this._getVal("color-text");
    var colorHeader  = this._getVal("color-header");
    var colorEdit    = this._getVal("color-editable");
    var rowHeight    = this._getVal("rowHeight");
    var colWidth     = this._getVal("colWidth");
    var showUnit     = this._getVal("showUnit");
    var template     = this._getVal("template");

    var textDecor = [];
    if (this._underline)     textDecor.push("underline");
    if (this._strikethrough) textDecor.push("line-through");

    // Apply template presets
    var headerColor = colorHeader;
    var headerText  = "#ffffff";
    var hoverColor  = "#f5f5f5";

    if (template === "dark") {
      headerColor = "#1a1a2e";
      headerText  = "#e0e0e0";
      hoverColor  = "#2a2a3e";
    } else if (template === "minimal") {
      headerColor = "#f8f9fa";
      headerText  = "#333333";
      hoverColor  = "#f0f0f0";
    }

    // Set properties on main widget — SAC syncs declared properties automatically
    w.headerColor        = headerColor;
    w.headerTextColor    = headerText;
    w.hoverRowColor      = hoverColor;
    w.tableTextColor     = colorText;

    // Set internal style properties
    w._editableCellColor = colorEdit;
    w._rowHeight         = parseInt(rowHeight, 10);
    w._colWidth          = colWidth;
    w._fontFamily        = fontFamily;
    w._fontSize          = fontSize + "px";
    w._fontWeight        = fontWeight.indexOf("bold") !== -1 ? "bold" : "normal";
    w._fontStyle         = fontWeight.indexOf("italic") !== -1 ? "italic" : "normal";
    w._textDecoration    = textDecor.length > 0 ? textDecor.join(" ") : "none";
    w._showUnit          = showUnit;

    // Trigger re-render on main widget
    if (typeof w._applyDynamicStyles === "function") { w._applyDynamicStyles(); }
    if (typeof w._render === "function") { w._render(); }
  }
}

customElements.define("dropdowntable-styling", DropdownTableStyling);
