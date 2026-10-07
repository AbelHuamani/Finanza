import { APP_ACTIONS, MOVEMENT_TYPES } from "../constants.js";
import { addMovement, editMovement } from "../actions.js";
import { getState } from "../state.js";
import { openModal, setFieldErrors } from "../components/modal.js";
import { showToast } from "../components/toast.js";
import { field } from "../components/forms.js";
import { escapeHtml } from "../utils/dom.js";
import { todayISO } from "../utils/dates.js";
import { validateMovement } from "../domain/validators.js";

export function mount() {
    document.addEventListener("app:action", (event) => {
        if (event.detail.action === APP_ACTIONS.NEW_INCOME) openIncomeForm();
    });
}

export function openIncomeForm(movement = null) {
    const editing = Boolean(movement);
    const value = {
        amount: movement?.amount ?? "",
        date: movement?.date ?? todayISO(),
        description: movement?.description ?? "",
        note: movement?.note ?? "",
    };

    const body = `<div class="form-grid">
        ${field({
            label: "Monto (S/)",
            name: "amount",
            control: `<input id="field-amount" data-field="amount" name="amount" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" value="${escapeHtml(
                value.amount,
            )}" />`,
        })}
        ${field({
            label: "Fecha",
            name: "date",
            control: `<input id="field-date" data-field="date" name="date" type="date" value="${escapeHtml(value.date)}" />`,
        })}
        ${field({
            label: "Descripción",
            name: "description",
            control: `<input id="field-description" data-field="description" name="description" type="text" maxlength="120" placeholder="Ingreso mensual" value="${escapeHtml(
                value.description,
            )}" />`,
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
        title: editing ? "Editar ingreso" : "Registrar ingreso",
        bodyHTML: body,
        submitLabel: editing ? "Guardar cambios" : "Registrar ingreso",
        size: "md",
        onSubmit: async (overlay) => {
            const input = readIncomeForm(overlay);
            const { errors } = validateMovement(input, getState());
            if (!setFieldErrors(overlay, errors)) return false;

            if (editing) {
                await editMovement(movement.id, input);
                showToast("Ingreso actualizado correctamente.");
            } else {
                await addMovement(input);
                showToast("Ingreso registrado correctamente.");
            }
            return true;
        },
    });
}

function readIncomeForm(overlay) {
    const value = (name) => overlay.querySelector(`[data-field="${name}"]`)?.value ?? "";
    return {
        type: MOVEMENT_TYPES.INCOME,
        amount: value("amount"),
        date: value("date"),
        description: value("description").trim(),
        note: value("note").trim(),
        categoryId: null,
        subcategoryId: null,
        paymentMethod: null,
    };
}
