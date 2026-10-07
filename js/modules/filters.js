import { PERIOD_OPTIONS } from "../constants.js";
import { resetFilters } from "../actions.js";
import { setFilters } from "../state.js";
import { qs } from "../utils/dom.js";
import { optionsHtml } from "../components/forms.js";

let signature = "";
let searchTimer = null;

const TYPE_OPTIONS = [
    { value: "all", label: "Todos" },
    { value: "INCOME", label: "Ingresos" },
    { value: "EXPENSE", label: "Gastos" },
];

export function mount() {
    const bar = qs("#filterBar");
    if (!bar) return;

    bar.addEventListener("change", (event) => {
        const field = event.target.closest("[data-filter]");
        if (!field) return;
        const key = field.dataset.filter;
        const value = field.value;
        if (key === "period") setFilters({ period: value || "all" });
        else if (key === "type") setFilters({ type: value || "all" });
        else if (key === "categoryId" || key === "paymentMethod") setFilters({ [key]: value || null });
        else if (key === "from" || key === "to") setFilters({ [key]: value || null });
    });

    bar.addEventListener("input", (event) => {
        const field = event.target.closest("[data-filter='search']");
        if (!field) return;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => setFilters({ search: field.value }), 250);
    });

    bar.addEventListener("click", (event) => {
        if (event.target.closest("[data-filter-reset]")) {
            const current = qs("[data-filter='search']");
            if (current) current.value = "";
            resetFilters();
        }
    });
}

export function render(state) {
    const bar = qs("#filterBar");
    if (!bar) return;
    bar.hidden = state.activeSection === "categorias";

    const nextSignature = `${state.categories.map((item) => item.id).join(",")}|${state.paymentMethods
        .map((item) => item.id)
        .join(",")}`;

    if (nextSignature !== signature) {
        signature = nextSignature;
        bar.innerHTML = template(state);
        bar.querySelector("[data-filter='search']").value = state.filters.search;
    }

    syncValues(bar, state);
}

function syncValues(bar, state) {
    const { filters } = state;
    bar.querySelectorAll("[data-filter]").forEach((field) => {
        if (document.activeElement === field) return;
        const key = field.dataset.filter;
        if (key === "search") return;
        if (key in filters) field.value = filters[key] ?? "";
    });
    const custom = bar.querySelector("[data-custom-range]");
    if (custom) custom.hidden = filters.period !== "custom";
}

function template(state) {
    const { filters, categories, paymentMethods } = state;
    return `
        <div class="filterbar__row">
            <div class="field field--inline">
                <label class="field__label" for="filter-period">Período</label>
                <select id="filter-period" data-filter="period">${optionsHtml(PERIOD_OPTIONS, filters.period)}</select>
            </div>
            <div class="field field--inline">
                <label class="field__label" for="filter-type">Tipo</label>
                <select id="filter-type" data-filter="type">${optionsHtml(TYPE_OPTIONS, filters.type)}</select>
            </div>
            <div class="field field--inline">
                <label class="field__label" for="filter-category">Categoría</label>
                <select id="filter-category" data-filter="categoryId">${optionsHtml(categories, filters.categoryId, "Todas")}</select>
            </div>
            <div class="field field--inline">
                <label class="field__label" for="filter-method">Método de pago</label>
                <select id="filter-method" data-filter="paymentMethod">${optionsHtml(paymentMethods, filters.paymentMethod, "Todos")}</select>
            </div>
            <div class="field field--inline field--grow">
                <label class="field__label" for="filter-search">Buscar</label>
                <input id="filter-search" type="search" data-filter="search" placeholder="Descripción, nota o monto" />
            </div>
            <button class="btn btn--ghost filterbar__reset" type="button" data-filter-reset>Limpiar</button>
        </div>
        <div class="filterbar__row filterbar__row--range" data-custom-range hidden>
            <div class="field field--inline">
                <label class="field__label" for="filter-from">Desde</label>
                <input id="filter-from" type="date" data-filter="from" />
            </div>
            <div class="field field--inline">
                <label class="field__label" for="filter-to">Hasta</label>
                <input id="filter-to" type="date" data-filter="to" />
            </div>
        </div>`;
}
