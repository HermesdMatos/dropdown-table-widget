class DropdownTableWidget extends HTMLElement {
    constructor() {
        super();

        this._dropdownOptions = {};
        this._selectedCell = null;

        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                    font-family: Arial;
                }

                td, th {
                    border: 1px solid #ccc;
                    padding: 6px;
                    position: relative;
                }

                td.editable {
                    background: #fafafa;
                    cursor: pointer;
                }

                input {
                    width: 100%;
                    border: none;
                    outline: none;
                }

                select {
                    width: 100%;
                }
            </style>
            <div id="container"></div>
        `;
    }

    onCustomWidgetAfterUpdate() {
        this._render();
    }

    setDropdownOptions(optionsJson) {
        this._dropdownOptions = JSON.parse(optionsJson);
        this._render();
    }

    _getLookupOptions(dimensionName) {
        if (!this.lookupBinding || !this.lookupBinding.data) {
            return [];
        }

        return [
            ...new Set(
                this.lookupBinding.data
                    .map(row => row["dimensions_0"])
                    .filter(x => x && x.isCollapsed === false)
                    .map(x => x.label)
            )
        ];
    }

    _fireSubmit(payload) {
        this.dispatchEvent(
            new CustomEvent("onCellSubmit", {
                detail: payload
            })
        );
    }

    _render() {
        if (!this.tableBinding || !this.tableBinding.data) return;

        const data = this.tableBinding.data;
        const metadata = this.tableBinding.metadata;

        const container = this.shadowRoot.getElementById("container");

        let html = "<table>";

        html += "<tr>";

        metadata.feeds.dimensions.values.forEach(dim => {
            html += `<th>${dim.description}</th>`;
        });

        metadata.feeds.mainStructureMembers.values.forEach(measure => {
            html += `<th>${measure.label}</th>`;
        });

        html += "</tr>";

        data.forEach((row, rowIndex) => {
            html += "<tr>";

            metadata.feeds.dimensions.values.forEach((dim, i) => {
                const cell = row["dimensions_" + i];
                html += `<td>${cell?.label || ""}</td>`;
            });

            metadata.feeds.mainStructureMembers.values.forEach((measure, i) => {
                const measureKey = "measures_" + i;
                const value = row[measureKey]?.formatted || "";

                html += `
                    <td class="editable"
                        data-row="${rowIndex}"
                        data-measure="${measure.id}"
                        data-key="${measureKey}">
                        ${value}
                    </td>
                `;
            });

            html += "</tr>";
        });

        html += "</table>";

        container.innerHTML = html;

        container.querySelectorAll(".editable").forEach(cell => {
            cell.addEventListener("click", e => {
                const td = e.target;

                const currentValue = td.innerText;

                td.innerHTML = `<input value="${currentValue}" />`;

                const input = td.querySelector("input");
                input.focus();

                input.addEventListener("blur", () => {
                    const newValue = input.value;

                    td.innerHTML = newValue;

                    this._fireSubmit({
                        row: td.dataset.row,
                        measure: td.dataset.measure,
                        value: newValue
                    });
                });
            });
        });
    }
}

customElements.define("dropdowntable-widget", DropdownTableWidget);
