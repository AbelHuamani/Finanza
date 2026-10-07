import { APP_ACTIONS, MOVEMENT_TYPES } from "../constants.js";
import { addMovement, addMovements, editMovement, removeMovement } from "../actions.js";
import { getState } from "../state.js";
import { openModal, setFieldErrors } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { field, optionsHtml } from "../components/forms.js";
import { escapeHtml } from "../utils/dom.js";
import { formatDate, todayISO } from "../utils/dates.js";
import { formatCurrency } from "../utils/currency.js";
import { validateMovement } from "../domain/validators.js";
import { openIncomeForm } from "./income.js";

const TRASH_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';

export function mount() {
    document.addEventListener("app:action", (event) => {
        const { action, id } = event.detail;
        const state = getState();

        if (action === APP_ACTIONS.NEW_EXPENSE) return openExpenseForm();
        if (action === APP_ACTIONS.NEW_BULK_EXPENSE) return openBulkExpenseForm();

        if (action === APP_ACTIONS.EDIT_MOVEMENT) {
            const movement = state.movements.find((item) => item.id === id);
            if (!movement) return;
            if (movement.type === MOVEMENT_TYPES.INCOME) openIncomeForm(movement);
            else openExpenseForm(movement);
            return;
        }

        if (action === APP_ACTIONS.DELETE_MOVEMENT) {
            const movement = state.movements.find((item) => item.id === id);
            if (movement) openDeleteConfirm(movement);
        }
    });
}

/* -------------------- Gasto individual -------------------- */

export function openExpenseForm(movement = null) {
    const editing = Boolean(movement);
    const state = getState();
    const value = {
        description: movement?.description ?? "",
        amount: movement?.amount ?? "",
        categoryId: movement?.categoryId ?? null,
        subcategoryId: movement?.subcategoryId ?? null,
        paymentMethod: movement?.paymentMethod ?? state.paymentMethods[0]?.id ?? null,
        date: movement?.date ?? todayISO(),
        note: movement?.note ?? "",
    };

    const body = `<div class="form-grid">
        ${field({
            label: "¿Qué compraste?",
            name: "description",
            control: `<input id="field-description" data-field="description" name="description" type="text" maxlength="120" placeholder="Pasaje, almuerzo, recarga..." value="${escapeHtml(
                value.description,
            )}" />`,
        })}
        ${field({
            label: "Monto (S/)",
            name: "amount",
            control: `<input id="field-amount" data-field="amount" name="amount" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" value="${escapeHtml(
                value.amount,
            )}" />`,
        })}
        ${field({
            label: "Categoría",
            name: "categoryId",
            control: `<select id="field-categoryId" data-field="categoryId" name="categoryId">${optionsHtml(
                state.categories,
                value.categoryId,
                "Selecciona una categoría",
            )}</select>`,
        })}
        ${subcategoryField(state, value.categoryId, value.subcategoryId)}
        ${field({
            label: "Método de pago",
            name: "paymentMethod",
            control: `<select id="field-paymentMethod" data-field="paymentMethod" name="paymentMethod">${optionsHtml(
                state.paymentMethods,
                value.paymentMethod,
                "Selecciona un método",
            )}</select>`,
        })}
        ${field({
            label: "Fecha",
            name: "date",
            control: `<input id="field-date" data-field="date" name="date" type="date" value="${escapeHtml(value.date)}" />`,
        })}
        ${field({
            label: "Observación (opcional)",
            name: "note",
            control: `<input id="field-note" data-field="note" name="note" type="text" maxlength="200" value="${escapeHtml(
                value.note,
            )}" />`,
        })}
    </div>`;

    openModal({
        title: editing ? "Editar gasto" : "Registrar gasto",
        bodyHTML: body,
        submitLabel: editing ? "Guardar cambios" : "Registrar gasto",
        size: "md",
        onReady: (overlay) => {
            const categorySelect = overlay.querySelector('[data-field="categoryId"]');
            categorySelect.addEventListener("change", () => {
                const current = overlay.querySelector("#subcategoryField");
                if (current) current.outerHTML = subcategoryField(getState(), categorySelect.value, null);
            });
        },
        onSubmit: async (overlay) => {
            const input = readExpenseForm(overlay);
            const { errors } = validateMovement(input, getState());
            if (!setFieldErrors(overlay, errors)) return false;

            if (editing) {
                await editMovement(movement.id, input);
                showToast("Gasto actualizado correctamente.");
            } else {
                await addMovement(input);
                showToast("Gasto registrado correctamente.");
            }
            return true;
        },
    });
}

function subcategoryField(state, categoryId, selectedId) {
    const subcategories = state.subcategories.filter((sub) => sub.categoryId === categoryId);
    const options = optionsHtml(subcategories, selectedId, subcategories.length ? "Sin subcategoría" : "—");
    return `<div class="field" id="subcategoryField">
        <label class="field__label" for="field-subcategoryId">Subcategoría (opcional)</label>
        <select id="field-subcategoryId" data-field="subcategoryId" name="subcategoryId" ${
            subcategories.length ? "" : "disabled"
        }>${options}</select>
        <p class="field__error" data-field-error></p>
    </div>`;
}

function readExpenseForm(overlay) {
    const value = (name) => overlay.querySelector(`[data-field="${name}"]`)?.value ?? "";
    return {
        type: MOVEMENT_TYPES.EXPENSE,
        description: value("description").trim(),
        amount: value("amount"),
        categoryId: value("categoryId") || null,
        subcategoryId: value("subcategoryId") || null,
        paymentMethod: value("paymentMethod") || null,
        date: value("date"),
        note: value("note").trim(),
    };
}

/* -------------------- Gastos masivos -------------------- */

export function openBulkExpenseForm() {
    const state = getState();
    const body = `<div class="bulk">
        <p class="bulk__hint">Registra varios gastos y guárdalos en una sola operación. La suma se calcula automáticamente.</p>
        <div class="bulk__head" aria-hidden="true">
            <span>Fecha</span><span>Descripción</span><span>Categoría</span><span>Método</span><span>Monto</span><span></span>
        </div>
        <div class="bulk__rows" id="bulkRows">${bulkRowHtml(state)}${bulkRowHtml(state)}</div>
        <div class="bulk__actions">
            <button type="button" class="btn btn--ghost" data-bulk-add>+ Agregar fila</button>
            <div class="bulk__total">Total: <strong data-bulk-total>${formatCurrency(0)}</strong></div>
        </div>
    </div>`;

    openModal({
        title: "Registrar gastos masivos",
        bodyHTML: body,
        size: "lg",
        submitLabel: "Guardar gastos",
        onReady: (overlay) => {
            const rows = overlay.querySelector("#bulkRows");
            overlay.querySelector("[data-bulk-add]").addEventListener("click", () => {
                rows.insertAdjacentHTML("beforeend", bulkRowHtml(getState()));
                rows.lastElementChild.querySelector('[data-bulk="description"]').focus();
            });
            overlay.addEventListener("click", (event) => {
                const removeButton = event.target.closest("[data-bulk-remove]");
                if (removeButton) {
                    removeButton.closest("[data-bulk-row]").remove();
                    updateBulkTotal(overlay);
                }
            });
            overlay.addEventListener("input", () => updateBulkTotal(overlay));
            updateBulkTotal(overlay);
        },
        onSubmit: async (overlay) => {
            const rowElements = [...overlay.querySelectorAll("[data-bulk-row]")];
            const valid = [];
            const invalid = [];

            for (const rowElement of rowElements) {
                const input = readBulkRow(rowElement);
                const { errors } = validateMovement(input, getState());
                const message = Object.values(errors)[0] ?? "";
                const errorNode = rowElement.querySelector("[data-bulk-error]");
                rowElement.classList.toggle("bulk-row--invalid", Boolean(message));
                if (errorNode) errorNode.textContent = message;
                if (message) invalid.push(rowElement);
                else valid.push({ input, rowElement });
            }

            if (!valid.length) {
                showToast("No hay gastos válidos para guardar.", "error");
                return false;
            }

            await addMovements(valid.map((item) => item.input));
            valid.forEach((item) => item.rowElement.remove());

            if (invalid.length) {
                showToast(
                    `Se guardaron ${valid.length} gasto(s). Corrige ${invalid.length} fila(s) con errores.`,
                    "info",
                    5000,
                );
                updateBulkTotal(overlay);
                return false;
            }

            showToast(`${valid.length} gasto(s) registrado(s) correctamente.`);
            return true;
        },
    });
}

function bulkRowHtml(state) {
    return `<div class="bulk-row" data-bulk-row>
        <input type="date" data-bulk="date" value="${todayISO()}" aria-label="Fecha" />
        <input type="text" data-bulk="description" placeholder="Descripción" aria-label="Descripción" />
        <select data-bulk="categoryId" aria-label="Categoría">${optionsHtml(
            state.categories,
            null,
            "Categoría",
        )}</select>
        <select data-bulk="paymentMethod" aria-label="Método de pago">${optionsHtml(
            state.paymentMethods,
            state.paymentMethods[0]?.id ?? null,
        )}</select>
        <input type="number" data-bulk="amount" step="0.01" min="0" inputmode="decimal" placeholder="0.00" aria-label="Monto" />
        <button type="button" class="btn btn--icon btn--ghost btn--danger" data-bulk-remove aria-label="Eliminar fila">${TRASH_ICON}</button>
        <p class="bulk-row__error" data-bulk-error></p>
    </div>`;
}

function readBulkRow(rowElement) {
    const value = (name) => rowElement.querySelector(`[data-bulk="${name}"]`)?.value ?? "";
    return {
        type: MOVEMENT_TYPES.EXPENSE,
        date: value("date"),
        description: value("description").trim(),
        categoryId: value("categoryId") || null,
        subcategoryId: null,
        paymentMethod: value("paymentMethod") || null,
        amount: value("amount"),
        note: "",
    };
}

function updateBulkTotal(overlay) {
    const total = [...overlay.querySelectorAll('[data-bulk="amount"]')].reduce((sum, input) => {
        const amount = Number(input.value);
        return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0);
    const node = overlay.querySelector("[data-bulk-total]");
    if (node) node.textContent = formatCurrency(total);
}

/* -------------------- Eliminación -------------------- */

export function openDeleteConfirm(movement) {
    const isIncome = movement.type === MOVEMENT_TYPES.INCOME;
    openModal({
        title: isIncome ? "Eliminar ingreso" : "Eliminar gasto",
        bodyHTML: `<p class="confirm-text">¿Seguro que deseas eliminar este movimiento?</p>
            <p class="confirm-detail">${formatDate(movement.date)} · ${escapeHtml(
            movement.description || "Sin descripción",
        )} · ${formatCurrency(movement.amount)}</p>`,
        submitLabel: "Eliminar",
        submitVariant: "danger",
        size: "sm",
        onSubmit: async () => {
            await removeMovement(movement.id);
            showToast("Movimiento eliminado.", "info");
            return true;
        },
    });
}
