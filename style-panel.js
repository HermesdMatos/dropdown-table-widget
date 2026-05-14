(function() {
    var template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host { display: block; padding: 1em; font-family: Arial, sans-serif; font-size: 13px; }
            fieldset {
                border: 1px solid #ccc;
                border-radius: 5px;
                padding: 12px;
                margin-bottom: 12px;
            }
            legend { font-weight: bold; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px; vertical-align: middle; }
            input[type="text"], select {
                width: 100%;
                padding: 5px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
                font-size: 12px;
            }
            input[type="color"] {
                width: 40px;
                height: 26px;
                padding: 0;
                border: 1px solid #ccc;
                border-radius: 4px;
                cursor: pointer;
            }
            select { height: 30px; }
            .color-row { display: flex; align-items: center; gap: 6px; }
            .color-input { flex-grow: 1; }
            .apply-button {
                background-color: #1a73e8;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                width: 100%;
                font-size: 13px;
                font-weight: 600;
            }
            .apply-button:hover { background-color: #1557b0; }

            /* Alignment buttons */
            .align-group { margin-top: 4px; }
            .align-label { font-size: 11px; color: #666; margin-bottom: 4px; display: block; }
            .align-btns {
                display: grid;
                grid-template-columns: repeat(3, 32px);
                gap: 4px;
            }
            .align-btn {
                width: 32px;
                height: 28px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: #f8f8f8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                transition: background 0.15s, border-color 0.15s;
            }
            .align-btn:hover { background: #e8f0fe; border-color: #1a73e8; }
            .align-btn.active { background: #1a73e8; border-color: #1a73e8; }
            .align-btn.active svg { stroke: #fff; }
            .align-btn svg { stroke: #555; }
        </style>
        <form id="form">
            <fieldset>
                <legend>Título da Tabela</legend>
                <table>
                    <tr>
                        <td>Título</td>
                        <td><input id="style_table_title" type="text" placeholder="Ex: Despesas 2024"></td>
                    </tr>
                    <tr>
                        <td>Cor do título</td>
                        <td class="color-row">
                            <input id="style_title_color" type="text" class="color-input" value="#1a73e8">
                            <input id="style_title_color_picker" type="color" value="#1a73e8">
                        </td>
                    </tr>
                    <tr>
                        <td>Tamanho</td>
                        <td>
                            <select id="style_title_size">
                                <option value="13px">13</option>
                                <option value="14px">14</option>
                                <option value="16px" selected>16</option>
                                <option value="18px">18</option>
                                <option value="20px">20</option>
                                <option value="24px">24</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Alinhamento</td>
                        <td>
                            <div class="align-btns" id="align_title_group">
                                <button type="button" class="align-btn active" data-align="left" data-group="title" title="Esquerda">
                                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="9" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="10" x2="11" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                </button>
                                <button type="button" class="align-btn" data-align="center" data-group="title" title="Centro">
                                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="6" x2="11" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="10" x2="12" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                </button>
                                <button type="button" class="align-btn" data-align="right" data-group="title" title="Direita">
                                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="6" x2="13" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="10" x2="13" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                </table>
            </fieldset>

            <fieldset>
                <legend>Alinhamento</legend>
                <table>
                    <tr>
                        <td>Cabeçalho</td>
                        <td>
                            <div class="align-group">
                                <div class="align-btns" id="align_header_group">
                                    <button type="button" class="align-btn active" data-align="left" data-group="header" title="Esquerda">
                                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="9" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="10" x2="11" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    </button>
                                    <button type="button" class="align-btn" data-align="center" data-group="header" title="Centro">
                                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="6" x2="11" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="10" x2="12" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    </button>
                                    <button type="button" class="align-btn" data-align="right" data-group="header" title="Direita">
                                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="6" x2="13" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="10" x2="13" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>Células</td>
                        <td>
                            <div class="align-group">
                                <div class="align-btns" id="align_cell_group">
                                    <button type="button" class="align-btn active" data-align="left" data-group="cell" title="Esquerda">
                                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="9" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="10" x2="11" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    </button>
                                    <button type="button" class="align-btn" data-align="center" data-group="cell" title="Centro">
                                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="6" x2="11" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="10" x2="12" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    </button>
                                    <button type="button" class="align-btn" data-align="right" data-group="cell" title="Direita">
                                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none"><line x1="1" y1="2" x2="13" y2="2" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="6" x2="13" y2="6" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="10" x2="13" y2="10" stroke-width="1.5" stroke-linecap="round"/></svg>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </fieldset>

            <fieldset>
                <legend>Table Appearance</legend>
                <table>
                    <tr>
                        <td>Header Background Color</td>
                        <td class="color-row">
                            <input id="style_header_color" type="text" class="color-input" value="#1a73e8">
                            <input id="style_header_color_picker" type="color" value="#1a73e8">
                        </td>
                    </tr>
                    <tr>
                        <td>Header Text Color</td>
                        <td class="color-row">
                            <input id="style_header_text_color" type="text" class="color-input" value="#ffffff">
                            <input id="style_header_text_color_picker" type="color" value="#ffffff">
                        </td>
                    </tr>
                    <tr>
                        <td>Selected Row Color</td>
                        <td class="color-row">
                            <input id="style_selected_row_color" type="text" class="color-input" value="#e8f0fe">
                            <input id="style_selected_row_color_picker" type="color" value="#e8f0fe">
                        </td>
                    </tr>
                    <tr>
                        <td>Hover Row Color</td>
                        <td class="color-row">
                            <input id="style_hover_row_color" type="text" class="color-input" value="#f5f5f5">
                            <input id="style_hover_row_color_picker" type="color" value="#f5f5f5">
                        </td>
                    </tr>
                    <tr>
                        <td>Table Text Color</td>
                        <td class="color-row">
                            <input id="style_table_text_color" type="text" class="color-input" value="#333333">
                            <input id="style_table_text_color_picker" type="color" value="#333333">
                        </td>
                    </tr>
                    <tr>
                        <td>Editable Cell Color</td>
                        <td class="color-row">
                            <input id="style_editable_color" type="text" class="color-input" value="#fffbe6">
                            <input id="style_editable_color_picker" type="color" value="#fffbe6">
                        </td>
                    </tr>
                </table>
            </fieldset>

            <fieldset>
                <legend>Fonte</legend>
                <table>
                    <tr>
                        <td>Fonte</td>
                        <td>
                            <select id="style_font_family">
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="'Helvetica Neue', sans-serif">Helvetica</option>
                                <option value="'72', Arial, sans-serif">72-Web</option>
                                <option value="'Roboto', sans-serif">Roboto</option>
                                <option value="'Open Sans', sans-serif">Open Sans</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Tamanho</td>
                        <td>
                            <select id="style_font_size">
                                <option value="11px">11</option>
                                <option value="12px">12</option>
                                <option value="13px" selected>13</option>
                                <option value="14px">14</option>
                                <option value="15px">15</option>
                                <option value="16px">16</option>
                                <option value="18px">18</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Estilo</td>
                        <td>
                            <select id="style_font_weight">
                                <option value="normal">Padrão</option>
                                <option value="bold">Negrito</option>
                            </select>
                        </td>
                    </tr>
                </table>
            </fieldset>

            <fieldset>
                <legend>Propriedades tabela</legend>
                <table>
                    <tr>
                        <td>Altura da linha</td>
                        <td>
                            <select id="style_row_height">
                                <option value="32">Compacta (32px)</option>
                                <option value="36" selected>Padrão (36px)</option>
                                <option value="44">Confortável (44px)</option>
                                <option value="52">Espaçosa (52px)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Largura da coluna</td>
                        <td>
                            <select id="style_col_width">
                                <option value="auto" selected>Redimensionamento automático</option>
                                <option value="120">Fixa - Pequena (120px)</option>
                                <option value="160">Fixa - Média (160px)</option>
                                <option value="200">Fixa - Grande (200px)</option>
                                <option value="240">Fixa - Extra Grande (240px)</option>
                            </select>
                        </td>
                    </tr>
                </table>
            </fieldset>

            <button type="button" id="apply_styles" class="apply-button">✓ Aplicar</button>
            <input type="submit" style="display:none;">
        </form>
    `;

    class DropdownTableStyling extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));

            this._form = this._shadowRoot.getElementById("form");

            // Color inputs
            this._headerColorInput       = this._shadowRoot.getElementById("style_header_color");
            this._headerColorPicker      = this._shadowRoot.getElementById("style_header_color_picker");
            this._headerTextColorInput   = this._shadowRoot.getElementById("style_header_text_color");
            this._headerTextColorPicker  = this._shadowRoot.getElementById("style_header_text_color_picker");
            this._selectedRowColorInput  = this._shadowRoot.getElementById("style_selected_row_color");
            this._selectedRowColorPicker = this._shadowRoot.getElementById("style_selected_row_color_picker");
            this._hoverRowColorInput     = this._shadowRoot.getElementById("style_hover_row_color");
            this._hoverRowColorPicker    = this._shadowRoot.getElementById("style_hover_row_color_picker");
            this._tableTextColorInput    = this._shadowRoot.getElementById("style_table_text_color");
            this._tableTextColorPicker   = this._shadowRoot.getElementById("style_table_text_color_picker");
            this._editableColorInput     = this._shadowRoot.getElementById("style_editable_color");
            this._editableColorPicker    = this._shadowRoot.getElementById("style_editable_color_picker");
            this._titleColorInput        = this._shadowRoot.getElementById("style_title_color");
            this._titleColorPicker       = this._shadowRoot.getElementById("style_title_color_picker");

            // Font + table inputs
            this._fontFamilySelect = this._shadowRoot.getElementById("style_font_family");
            this._fontSizeSelect   = this._shadowRoot.getElementById("style_font_size");
            this._fontWeightSelect = this._shadowRoot.getElementById("style_font_weight");
            this._rowHeightSelect  = this._shadowRoot.getElementById("style_row_height");
            this._colWidthSelect   = this._shadowRoot.getElementById("style_col_width");
            this._tableTitleInput  = this._shadowRoot.getElementById("style_table_title");
            this._titleSizeSelect  = this._shadowRoot.getElementById("style_title_size");

            // Alignment state
            this._headerAlign = "left";
            this._cellAlign   = "left";
            this._titleAlign  = "left";

            this._applyButton = this._shadowRoot.getElementById("apply_styles");

            this._connectColorPickers();
            this._connectAlignButtons();
            this._form.addEventListener("submit", this._submit.bind(this));
            this._applyButton.addEventListener("click", this._submit.bind(this));
        }

        _connectColorPickers() {
            var pairs = [
                [this._headerColorInput,      this._headerColorPicker],
                [this._headerTextColorInput,   this._headerTextColorPicker],
                [this._selectedRowColorInput,  this._selectedRowColorPicker],
                [this._hoverRowColorInput,     this._hoverRowColorPicker],
                [this._tableTextColorInput,    this._tableTextColorPicker],
                [this._editableColorInput,     this._editableColorPicker],
                [this._titleColorInput,        this._titleColorPicker]
            ];
            pairs.forEach(function(pair) {
                var textInput = pair[0];
                var picker    = pair[1];
                picker.addEventListener("input", function() { textInput.value = picker.value; });
                textInput.addEventListener("change", function() { picker.value = textInput.value; });
            });
        }

        _connectAlignButtons() {
            var self = this;
            var allBtns = this._shadowRoot.querySelectorAll(".align-btn");
            allBtns.forEach(function(btn) {
                btn.addEventListener("click", function() {
                    var group = btn.getAttribute("data-group");
                    var align = btn.getAttribute("data-align");
                    // Deactivate siblings in same group
                    self._shadowRoot.querySelectorAll(".align-btn[data-group='" + group + "']").forEach(function(b) {
                        b.classList.remove("active");
                    });
                    btn.classList.add("active");
                    if (group === "header") { self._headerAlign = align; }
                    else if (group === "cell") { self._cellAlign = align; }
                    else                    { self._titleAlign  = align; }
                });
            });
        }

        _submit(e) {
            e.preventDefault();
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        headerColor:       this._headerColorInput.value,
                        headerTextColor:   this._headerTextColorInput.value,
                        selectedRowColor:  this._selectedRowColorInput.value,
                        hoverRowColor:     this._hoverRowColorInput.value,
                        tableTextColor:    this._tableTextColorInput.value,
                        styleConfig: JSON.stringify({
                            editableCellColor: this._editableColorInput.value,
                            rowHeight:         parseInt(this._rowHeightSelect.value, 10),
                            colWidth:          this._colWidthSelect.value,
                            fontFamily:        this._fontFamilySelect.value,
                            fontSize:          this._fontSizeSelect.value,
                            fontWeight:        this._fontWeightSelect.value,
                            tableTitle:        this._tableTitleInput.value,
                            titleColor:        this._titleColorInput.value,
                            titleSize:         this._titleSizeSelect.value,
                            headerAlign:       this._headerAlign,
                            cellAlign:         this._cellAlign,
                            titleAlign:        this._titleAlign
                        })
                    }
                }
            }));
        }

        // Getters/setters for SAC
        get headerColor() { return this._headerColorInput.value; }
        set headerColor(v) { if (v) { this._headerColorInput.value = v; this._headerColorPicker.value = v; } }

        get headerTextColor() { return this._headerTextColorInput.value; }
        set headerTextColor(v) { if (v) { this._headerTextColorInput.value = v; this._headerTextColorPicker.value = v; } }

        get selectedRowColor() { return this._selectedRowColorInput.value; }
        set selectedRowColor(v) { if (v) { this._selectedRowColorInput.value = v; this._selectedRowColorPicker.value = v; } }

        get hoverRowColor() { return this._hoverRowColorInput.value; }
        set hoverRowColor(v) { if (v) { this._hoverRowColorInput.value = v; this._hoverRowColorPicker.value = v; } }

        get tableTextColor() { return this._tableTextColorInput.value; }
        set tableTextColor(v) { if (v) { this._tableTextColorInput.value = v; this._tableTextColorPicker.value = v; } }

        get styleConfig() { return "{}"; }
        set styleConfig(v) {
            try {
                var cfg = JSON.parse(v);
                if (cfg.tableTitle)   { this._tableTitleInput.value = cfg.tableTitle; }
                if (cfg.titleColor)   { this._titleColorInput.value = cfg.titleColor; this._titleColorPicker.value = cfg.titleColor; }
                if (cfg.titleSize)    { this._titleSizeSelect.value = cfg.titleSize; }
                if (cfg.fontFamily)   { this._fontFamilySelect.value = cfg.fontFamily; }
                if (cfg.fontSize)     { this._fontSizeSelect.value = cfg.fontSize; }
                if (cfg.fontWeight)   { this._fontWeightSelect.value = cfg.fontWeight; }
                if (cfg.rowHeight)    { this._rowHeightSelect.value = String(cfg.rowHeight); }
                if (cfg.colWidth)     { this._colWidthSelect.value = cfg.colWidth; }
                if (cfg.headerAlign)  { this._setAlignActive("header", cfg.headerAlign); }
                if (cfg.cellAlign)    { this._setAlignActive("cell",   cfg.cellAlign); }
                if (cfg.titleAlign)   { this._setAlignActive("title",  cfg.titleAlign); }
            } catch(ex) {}
        }

        _setAlignActive(group, align) {
            var self = this;
            self._shadowRoot.querySelectorAll(".align-btn[data-group='" + group + "']").forEach(function(b) {
                b.classList.remove("active");
                if (b.getAttribute("data-align") === align) { b.classList.add("active"); }
            });
            if (group === "header") { self._headerAlign = align; }
            else if (group === "cell") { self._cellAlign = align; }
            else { self._titleAlign = align; }
        }
    }

    customElements.define("dropdowntable-styling", DropdownTableStyling);
})();
