(function() {
    // Tag padrao "dropdowntable-styling"; sobrescrito por ?tag=... na URL do script (JSON DEV)
    var STYLING_TAG = "dropdowntable-styling";
    try {
        var stScript = document.currentScript;
        var stTagMatch = stScript && stScript.src ? stScript.src.match(/[?&]tag=([a-z0-9-]+)/i) : null;
        if (stTagMatch) { STYLING_TAG = stTagMatch[1].toLowerCase(); }
    } catch(e) {}

    var template = document.createElement("template");
    template.innerHTML = `
        <style>
            /* Painel no visual SAP Horizon */
            :host {
                display: block; padding: 12px;
                font-family: '72', '72full', Arial, Helvetica, sans-serif; font-size: 14px; color: #1d2d3e;
            }
            fieldset {
                border: 1px solid #e5e5e5;
                border-radius: 12px;
                padding: 12px;
                margin: 0 0 12px 0;
                background: #ffffff;
            }
            legend { font-weight: 700; font-size: 14px; padding: 0 6px; color: #1d2d3e; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 4px; vertical-align: middle; font-size: 14px; color: #556b82; }
            input[type="text"], select, textarea {
                width: 100%;
                height: 32px;
                padding: 0 8px;
                border: none;
                border-radius: 4px;
                background: #ffffff;
                box-shadow: inset 0 0 0 1px #bcc3ca, inset 0 -1px 0 0 #556b81;
                box-sizing: border-box;
                font-family: inherit;
                font-size: 14px;
                color: #1d2d3e;
                outline: none;
            }
            input[type="text"]:hover, select:hover, textarea:hover { box-shadow: inset 0 0 0 1px #0064d9; }
            input[type="text"]:focus, select:focus, textarea:focus { box-shadow: inset 0 0 0 2px #0070f2; }
            input[type="color"] {
                width: 36px;
                height: 32px;
                padding: 2px;
                border: 1px solid #bcc3ca;
                border-radius: 4px;
                background: #ffffff;
                cursor: pointer;
            }
            .color-row { display: flex; align-items: center; gap: 6px; }
            .color-input { flex-grow: 1; }
            .apply-button, .reset-button {
                width: 100%;
                height: 36px;
                margin-top: 8px;
                border-radius: 8px;
                font-family: inherit;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
            }
            .apply-button { background: #0070f2; border: 1px solid #0070f2; color: #ffffff; }
            .apply-button:hover { background: #0064d9; border-color: #0064d9; }
            .reset-button { background: #ffffff; border: 1px solid #bcc3ca; color: #0064d9; }
            .reset-button:hover { background: #eaecee; }

            /* Alignment buttons = SegmentedButton */
            .align-group { margin-top: 4px; }
            .align-label { font-size: 12px; color: #556b82; margin-bottom: 4px; display: block; }
            .align-btns {
                display: inline-grid;
                grid-template-columns: repeat(3, 36px);
                border: 1px solid #bcc3ca;
                border-radius: 8px;
                overflow: hidden;
            }
            .align-btn {
                width: 36px;
                height: 30px;
                border: none;
                border-right: 1px solid #bcc3ca;
                background: #ffffff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            }
            .align-btn:last-child { border-right: none; }
            .align-btn:hover { background: #eaecee; }
            .align-btn.active { background: #ebf8ff; }
            .align-btn.active svg { stroke: #0064d9; }
            .align-btn svg { stroke: #556b82; }

            /* Dropdowns */
            .dd-hint { font-size: 12px; color: #556b82; margin-bottom: 8px; }
            .dd-dims { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
            .dd-check { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #1d2d3e; }
            .dd-check input { width: 16px; height: 16px; accent-color: #0070f2; }
            .dd-empty { font-size: 12px; color: #556b82; font-style: italic; }
            .rule-box { height: auto; padding: 6px 8px; font-family: monospace; font-size: 12px; margin-bottom: 8px; resize: vertical; }
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
                            <input id="style_title_color" type="text" class="color-input" value="#1d2d3e">
                            <input id="style_title_color_picker" type="color" value="#1d2d3e">
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
                <legend>Cores (padrão SAP Horizon)</legend>
                <table>
                    <tr>
                        <td>Fundo do cabeçalho</td>
                        <td class="color-row">
                            <input id="style_header_color" type="text" class="color-input" value="#ffffff">
                            <input id="style_header_color_picker" type="color" value="#ffffff">
                        </td>
                    </tr>
                    <tr>
                        <td>Texto do cabeçalho</td>
                        <td class="color-row">
                            <input id="style_header_text_color" type="text" class="color-input" value="#1d2d3e">
                            <input id="style_header_text_color_picker" type="color" value="#1d2d3e">
                        </td>
                    </tr>
                    <tr>
                        <td>Células selecionadas</td>
                        <td class="color-row">
                            <input id="style_selected_row_color" type="text" class="color-input" value="#ebf8ff">
                            <input id="style_selected_row_color_picker" type="color" value="#ebf8ff">
                        </td>
                    </tr>
                    <tr>
                        <td>Linha sob o mouse</td>
                        <td class="color-row">
                            <input id="style_hover_row_color" type="text" class="color-input" value="#eaecee">
                            <input id="style_hover_row_color_picker" type="color" value="#eaecee">
                        </td>
                    </tr>
                    <tr>
                        <td>Texto da tabela</td>
                        <td class="color-row">
                            <input id="style_table_text_color" type="text" class="color-input" value="#1d2d3e">
                            <input id="style_table_text_color_picker" type="color" value="#1d2d3e">
                        </td>
                    </tr>
                    <tr>
                        <td>Célula em edição</td>
                        <td class="color-row">
                            <input id="style_editable_color" type="text" class="color-input" value="#ffffff">
                            <input id="style_editable_color_picker" type="color" value="#ffffff">
                        </td>
                    </tr>
                    <tr>
                        <td>Fundo do grupo</td>
                        <td class="color-row">
                            <input id="style_group_header_bg" type="text" class="color-input" value="#f5f6f7">
                            <input id="style_group_header_bg_picker" type="color" value="#f5f6f7">
                        </td>
                    </tr>
                    <tr>
                        <td>Texto do grupo</td>
                        <td class="color-row">
                            <input id="style_group_header_color" type="text" class="color-input" value="#1d2d3e">
                            <input id="style_group_header_color_picker" type="color" value="#1d2d3e">
                        </td>
                    </tr>
                    <tr>
                        <td>Fundo do subgrupo</td>
                        <td class="color-row">
                            <input id="style_subheader_bg" type="text" class="color-input" value="#ffffff">
                            <input id="style_subheader_bg_picker" type="color" value="#ffffff">
                        </td>
                    </tr>
                    <tr>
                        <td>Texto do subgrupo</td>
                        <td class="color-row">
                            <input id="style_subheader_color" type="text" class="color-input" value="#1d2d3e">
                            <input id="style_subheader_color_picker" type="color" value="#1d2d3e">
                        </td>
                    </tr>
                    <tr>
                        <td>Botão Salvar</td>
                        <td class="color-row">
                            <input id="style_save_btn_bg" type="text" class="color-input" value="#0070f2">
                            <input id="style_save_btn_bg_picker" type="color" value="#0070f2">
                        </td>
                    </tr>
                    <tr>
                        <td>Texto do botão Salvar</td>
                        <td class="color-row">
                            <input id="style_save_btn_color" type="text" class="color-input" value="#ffffff">
                            <input id="style_save_btn_color_picker" type="color" value="#ffffff">
                        </td>
                    </tr>
                    <tr>
                        <td>Botão Salvar (mouse)</td>
                        <td class="color-row">
                            <input id="style_save_btn_hover_bg" type="text" class="color-input" value="#0064d9">
                            <input id="style_save_btn_hover_bg_picker" type="color" value="#0064d9">
                        </td>
                    </tr>
                    <tr>
                        <td>Rótulo do botão Salvar</td>
                        <td><input id="style_save_btn_label" type="text" placeholder="Salvar"></td>
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
                                <option value="'72', '72full', Arial, Helvetica, sans-serif" selected>72 (SAP Fiori)</option>
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="'Helvetica Neue', sans-serif">Helvetica</option>
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
                                <option value="13px">13</option>
                                <option value="14px" selected>14</option>
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
                                <option value="32" selected>Compacta — Fiori (32px)</option>
                                <option value="36">Média (36px)</option>
                                <option value="44">Confortável — Fiori Cozy (44px)</option>
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

            <fieldset>
                <legend>Dropdowns (validação de dados)</legend>
                <div class="dd-hint">Marque as dimensões que viram lista de seleção em cada linha. Nenhuma marcada = comportamento antigo (por script).</div>
                <div id="dd_dims" class="dd-dims"></div>
                <table>
                    <tr>
                        <td>Valor inicial (sem valor gravado)</td>
                        <td><input id="style_empty_default" type="text" value="NÃO APLICAVEL" placeholder="vazio = Selecionar..."></td>
                    </tr>
                </table>
                <label class="dd-check"><input type="checkbox" id="style_debug_mode"> Modo diagnóstico (logs no console)</label>
            </fieldset>

            <fieldset>
                <legend>Gravação (Salvar)</legend>
                <div class="dd-hint">Hierarquias da tabela usada no setUserInput — uma por linha: DIMENSAO=HIERARQUIA</div>
                <textarea id="style_write_hierarchies" class="rule-box" rows="4" placeholder="PERIODICIDADE=Periodos_H1"></textarea>
                <div class="dd-hint">Membros que gravam 0 em todas as medidas (trava a linha) — DIMENSAO=MEMBRO1;MEMBRO2. Vazio = RESPONSABILIDADE=CLIENTE</div>
                <textarea id="style_no_value_members" class="rule-box" rows="2" placeholder="RESPONSABILIDADE=CLIENTE">RESPONSABILIDADE=CLIENTE</textarea>
                <table>
                    <tr>
                        <td>Valor para apagar</td>
                        <td><input id="style_delete_value" type="text" value="0" placeholder="0"></td>
                    </tr>
                </table>
            </fieldset>

            <button type="button" id="reset_horizon" class="reset-button">Restaurar padrão SAP Horizon</button>
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
            this._groupHeaderBgInput     = this._shadowRoot.getElementById("style_group_header_bg");
            this._groupHeaderBgPicker    = this._shadowRoot.getElementById("style_group_header_bg_picker");
            this._groupHeaderColorInput  = this._shadowRoot.getElementById("style_group_header_color");
            this._groupHeaderColorPicker = this._shadowRoot.getElementById("style_group_header_color_picker");
            this._subheaderBgInput       = this._shadowRoot.getElementById("style_subheader_bg");
            this._subheaderBgPicker      = this._shadowRoot.getElementById("style_subheader_bg_picker");
            this._subheaderColorInput    = this._shadowRoot.getElementById("style_subheader_color");
            this._subheaderColorPicker   = this._shadowRoot.getElementById("style_subheader_color_picker");
            this._saveBtnBgInput         = this._shadowRoot.getElementById("style_save_btn_bg");
            this._saveBtnBgPicker        = this._shadowRoot.getElementById("style_save_btn_bg_picker");
            this._saveBtnColorInput      = this._shadowRoot.getElementById("style_save_btn_color");
            this._saveBtnColorPicker     = this._shadowRoot.getElementById("style_save_btn_color_picker");
            this._saveBtnHoverBgInput    = this._shadowRoot.getElementById("style_save_btn_hover_bg");
            this._saveBtnHoverBgPicker   = this._shadowRoot.getElementById("style_save_btn_hover_bg_picker");
            this._saveBtnLabelInput      = this._shadowRoot.getElementById("style_save_btn_label");
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

            // Dropdowns
            this._ddDimsContainer = this._shadowRoot.getElementById("dd_dims");
            this._debugModeInput  = this._shadowRoot.getElementById("style_debug_mode");
            this._emptyDefaultInput = this._shadowRoot.getElementById("style_empty_default");
            this._writeHierInput    = this._shadowRoot.getElementById("style_write_hierarchies");
            this._noValueInput      = this._shadowRoot.getElementById("style_no_value_members");
            this._deleteValueInput  = this._shadowRoot.getElementById("style_delete_value");
            this._availableDims   = [];  // [{key, id, label}] publicado pelo widget
            this._ddSelected      = [];  // IDs reais das dimensões marcadas
            this._renderDropdownDims();

            this._connectColorPickers();
            this._connectAlignButtons();
            this._shadowRoot.getElementById("reset_horizon").addEventListener("click", this._restoreHorizon.bind(this));
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
                [this._groupHeaderBgInput,    this._groupHeaderBgPicker],
                [this._groupHeaderColorInput, this._groupHeaderColorPicker],
                [this._subheaderBgInput,      this._subheaderBgPicker],
                [this._subheaderColorInput,   this._subheaderColorPicker],
                [this._saveBtnBgInput,        this._saveBtnBgPicker],
                [this._saveBtnColorInput,     this._saveBtnColorPicker],
                [this._saveBtnHoverBgInput,   this._saveBtnHoverBgPicker],
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

        // Preenche cores, fonte e densidade com o padrão SAP Horizon (compacto).
        // Não mexe em Dropdowns nem Gravação. O usuário confirma com "Aplicar".
        _restoreHorizon() {
            var self = this;
            var colors = [
                [this._titleColorInput,       this._titleColorPicker,       "#1d2d3e"],
                [this._headerColorInput,      this._headerColorPicker,      "#ffffff"],
                [this._headerTextColorInput,  this._headerTextColorPicker,  "#1d2d3e"],
                [this._selectedRowColorInput, this._selectedRowColorPicker, "#ebf8ff"],
                [this._hoverRowColorInput,    this._hoverRowColorPicker,    "#eaecee"],
                [this._tableTextColorInput,   this._tableTextColorPicker,   "#1d2d3e"],
                [this._editableColorInput,    this._editableColorPicker,    "#ffffff"],
                [this._groupHeaderBgInput,    this._groupHeaderBgPicker,    "#f5f6f7"],
                [this._groupHeaderColorInput, this._groupHeaderColorPicker, "#1d2d3e"],
                [this._subheaderBgInput,      this._subheaderBgPicker,      "#ffffff"],
                [this._subheaderColorInput,   this._subheaderColorPicker,   "#1d2d3e"],
                [this._saveBtnBgInput,        this._saveBtnBgPicker,        "#0070f2"],
                [this._saveBtnColorInput,     this._saveBtnColorPicker,     "#ffffff"],
                [this._saveBtnHoverBgInput,   this._saveBtnHoverBgPicker,   "#0064d9"]
            ];
            colors.forEach(function(c) { c[0].value = c[2]; c[1].value = c[2]; });
            this._fontFamilySelect.value = "'72', '72full', Arial, Helvetica, sans-serif";
            this._fontSizeSelect.value   = "14px";
            this._fontWeightSelect.value = "normal";
            this._rowHeightSelect.value  = "32";
            this._colWidthSelect.value   = "auto";
            this._titleSizeSelect.value  = "16px";
            ["header", "cell", "title"].forEach(function(g) { self._setAlignActive(g, "left"); });
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
                            editableCellColor:   this._editableColorInput.value,
                            groupHeaderBg:       this._groupHeaderBgInput.value,
                            groupHeaderColor:    this._groupHeaderColorInput.value,
                            subheaderBg:         this._subheaderBgInput.value,
                            subheaderColor:      this._subheaderColorInput.value,
                            saveBtnBg:           this._saveBtnBgInput.value,
                            saveBtnColor:        this._saveBtnColorInput.value,
                            saveBtnHoverBg:      this._saveBtnHoverBgInput.value,
                            saveBtnLabel:        this._saveBtnLabelInput.value,
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
                            titleAlign:        this._titleAlign,
                            dropdownDimensions: this._ddSelected.slice(),
                            debugMode:          this._debugModeInput.checked,
                            emptyDefaultLabel:  this._emptyDefaultInput.value,
                            writeHierarchies:   this._writeHierInput.value,
                            noValueMembers:     this._noValueInput.value,
                            deleteValue:        this._deleteValueInput.value
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
                if (cfg.colWidth)          { this._colWidthSelect.value = cfg.colWidth; }
                if (cfg.editableCellColor) { this._editableColorInput.value = cfg.editableCellColor; this._editableColorPicker.value = cfg.editableCellColor; }
                if (cfg.groupHeaderBg)    { this._groupHeaderBgInput.value = cfg.groupHeaderBg; this._groupHeaderBgPicker.value = cfg.groupHeaderBg; }
                if (cfg.groupHeaderColor) { this._groupHeaderColorInput.value = cfg.groupHeaderColor; this._groupHeaderColorPicker.value = cfg.groupHeaderColor; }
                if (cfg.subheaderBg)      { this._subheaderBgInput.value = cfg.subheaderBg; this._subheaderBgPicker.value = cfg.subheaderBg; }
                if (cfg.subheaderColor)   { this._subheaderColorInput.value = cfg.subheaderColor; this._subheaderColorPicker.value = cfg.subheaderColor; }
                if (cfg.saveBtnBg)       { this._saveBtnBgInput.value = cfg.saveBtnBg; this._saveBtnBgPicker.value = cfg.saveBtnBg; }
                if (cfg.saveBtnColor)    { this._saveBtnColorInput.value = cfg.saveBtnColor; this._saveBtnColorPicker.value = cfg.saveBtnColor; }
                if (cfg.saveBtnHoverBg)  { this._saveBtnHoverBgInput.value = cfg.saveBtnHoverBg; this._saveBtnHoverBgPicker.value = cfg.saveBtnHoverBg; }
                if (cfg.saveBtnLabel)    { this._saveBtnLabelInput.value = cfg.saveBtnLabel; }
                if (cfg.headerAlign)  { this._setAlignActive("header", cfg.headerAlign); }
                if (cfg.cellAlign)    { this._setAlignActive("cell",   cfg.cellAlign); }
                if (cfg.titleAlign)   { this._setAlignActive("title",  cfg.titleAlign); }
                if (Array.isArray(cfg.dropdownDimensions)) { this._ddSelected = cfg.dropdownDimensions.slice(); this._renderDropdownDims(); }
                if (cfg.debugMode !== undefined) { this._debugModeInput.checked = !!cfg.debugMode; }
                if (cfg.emptyDefaultLabel !== undefined) { this._emptyDefaultInput.value = cfg.emptyDefaultLabel; }
                if (cfg.writeHierarchies !== undefined)  { this._writeHierInput.value = cfg.writeHierarchies; }
                if (cfg.noValueMembers !== undefined)    { this._noValueInput.value = cfg.noValueMembers; }
                if (cfg.deleteValue !== undefined)       { this._deleteValueInput.value = cfg.deleteValue; }
            } catch(ex) {}
        }

        // Lista de dimensões publicada pelo widget a partir do binding
        get availableDimensions() { return JSON.stringify(this._availableDims); }
        set availableDimensions(v) {
            try {
                var list = typeof v === "string" ? JSON.parse(v || "[]") : v;
                this._availableDims = Array.isArray(list) ? list : [];
            } catch(ex) { this._availableDims = []; }
            this._renderDropdownDims();
        }

        _renderDropdownDims() {
            var self = this;
            var box = this._ddDimsContainer;
            if (!box) { return; }
            box.innerHTML = "";
            // dimensions_0 são as linhas (contas) — nunca vira dropdown
            var dims = this._availableDims.filter(function(d) { return d && d.key !== "dimensions_0"; });
            // Dimensões marcadas que ainda não chegaram do binding continuam visíveis
            this._ddSelected.forEach(function(id) {
                if (!dims.some(function(d) { return d.id === id; })) { dims.push({ key: "", id: id, label: id }); }
            });
            if (dims.length === 0) {
                var empty = document.createElement("div");
                empty.className = "dd-empty";
                empty.textContent = "Vincule dados ao widget (Builder) para listar as dimensões.";
                box.appendChild(empty);
                return;
            }
            dims.forEach(function(d) {
                var label = document.createElement("label");
                label.className = "dd-check";
                var cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = self._ddSelected.indexOf(d.id) !== -1;
                cb.addEventListener("change", function() {
                    var idx = self._ddSelected.indexOf(d.id);
                    if (cb.checked && idx === -1) { self._ddSelected.push(d.id); }
                    if (!cb.checked && idx !== -1) { self._ddSelected.splice(idx, 1); }
                });
                label.appendChild(cb);
                label.appendChild(document.createTextNode(" " + (d.label || d.id) + (d.label && d.label !== d.id ? " (" + d.id + ")" : "")));
                box.appendChild(label);
            });
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

    if (!customElements.get(STYLING_TAG)) {
        customElements.define(STYLING_TAG, DropdownTableStyling);
    }
})();
