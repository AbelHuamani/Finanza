import { MOVEMENT_TYPES, TABLE_PAGE_SIZES } from "../constants.js";
import { paginate, sortMovements } from "../domain/filters.js";
import { setTable } from "../state.js";
import { escapeHtml, qs } from "../utils/dom.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDate } from "../utils/dates.js";
import { optionsHtml } from "../components/forms.js";

const EDIT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const DELETE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';

export function mount() {
    const section = qs("#section-movimientos");
    if (!section) return;

    section.addEventListener("click", (event) => {
        const sortHeader = event.target.closest("[data-sort]");
        if (sortHeader) {
            const key = sortHeader.dataset.sort;
            const current = getTableState();
            const sortDir = current.sortKey === key && current.sortDir === "desc" ? "asc" : "desc";
            setTable({ sortKey: key, sortDir });
            return;
        }

        const pageButton = event.target.closest("[data-page]");
        if (pageButton) {
            setTable({ page: Number(pageButton.dataset.page) });
        }
    });

    section.addEventListener("change", (event) => {
        const sizeSelect = event.target.closest("[data-page-size]");
        if (sizeSelect) setTable({ pageSize: Number(sizeSelect.value), page: 1 });
    });
}

let tableState = { sortKey: "date", sortDir: "desc", page: 1, pageSize: 10 };

function getTableState() {
    return tableState;
}

export function render(state, movements) {
    tableState = state.ui.table;
    const sorted = sortMovements(movements, state.ui.table);
    const page = paginate(sorted, state.ui.table.page, state.ui.table.pageSize);

    const categoryNames = new Map(state.categories.map((item) => [item.id, item.name]));
    const methodNames = new Map(state.paymentMethods.map((item) => [item.id, item.name]));

    const tbody = qs("#movementsBody");
    if (tbody) {
        tbody.innerHTML = page.items.length
            ? page.items.map((movement) => rowHtml(movement, categoryNames, methodNames)).join("")
            : `<tr><td colspan="7" class="table-empty">No hay movimientos para los filtros seleccionados.</td></tr>`;
    }

    const count = qs("#movementsCount");
    if (count) count.textContent = `${page.total} movimiento${page.total === 1 ? "" : "s"}`;

    renderPagination(page);

    qs("#movementsTable")?.querySelectorAll("th[data-sort]").forEach((th) => {
        const isActive = th.dataset.sort === state.ui.table.sortKey;
        th.setAttribute("aria-sort", isActive ? (state.ui.table.sortDir === "asc" ? "ascending" : "descending") : "none");
    });

    const sizeSelect = qs("[data-page-size]");
    if (sizeSelect && document.activeElement !== sizeSelect) sizeSelect.value = String(state.ui.table.pageSize);
}

function rowHtml(movement, categoryNames, methodNames) {
    const isIncome = movement.type === MOVEMENT_TYPES.INCOME;
    const typeLabel = isIncome ? "Ingreso" : "Gasto";
    const badgeClass = isIncome ? "badge--income" : "badge--expense";
    const amountClass = isIncome ? "amount--income" : "amount--expense";
    const sign = isIncome ? "+" : "−";
    const category = isIncome ? "—" : categoryNames.get(movement.categoryId) ?? "Sin categoría";
    const method = isIncome ? "—" : methodNames.get(movement.paymentMethod) ?? "Sin método";

    return `<tr>
        <td data-label="Fecha">${formatDate(movement.date)}</td>
        <td data-label="Tipo"><span class="badge ${badgeClass}">${typeLabel}</span></td>
        <td data-label="Categoría">${escapeHtml(category)}</td>
        <td data-label="Descripción">${escapeHtml(movement.description || "—")}</td>
        <td data-label="Monto" class="amount ${amountClass}">${sign} ${formatCurrency(movement.amount)}</td>
        <td data-label="Método">${escapeHtml(method)}</td>
        <td class="row-actions">
            <button class="btn btn--icon btn--ghost" type="button" data-action="edit-movement" data-movement-id="${movement.id}" aria-label="Editar movimiento">${EDIT_ICON}</button>
            <button class="btn btn--icon btn--ghost btn--danger" type="button" data-action="delete-movement" data-movement-id="${movement.id}" aria-label="Eliminar movimiento">${DELETE_ICON}</button>
        </td>
    </tr>`;
}

function renderPagination(page) {
    const container = qs("#movementsPagination");
    if (!container) return;

    if (page.total === 0) {
        container.innerHTML = "";
        return;
    }

    const sizeOptions = optionsHtml(
        TABLE_PAGE_SIZES.map((size) => ({ value: size, label: `${size} por página` })),
        page.pageSize,
    );

    container.innerHTML = `
        <div class="pagination__info">
            Página ${page.page} de ${page.totalPages}
        </div>
        <div class="pagination__controls">
            <button class="btn btn--ghost" type="button" data-page="${page.page - 1}" ${page.page <= 1 ? "disabled" : ""}>Anterior</button>
            <button class="btn btn--ghost" type="button" data-page="${page.page + 1}" ${page.page >= page.totalPages ? "disabled" : ""}>Siguiente</button>
            <select data-page-size aria-label="Movimientos por página">${sizeOptions}</select>
        </div>`;
}
