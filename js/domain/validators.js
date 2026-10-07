import { MOVEMENT_TYPES } from "../constants.js";
import { parseISODate } from "../utils/dates.js";

export function validateAmount(value) {
    if (value === "" || value === null || value === undefined) return "El monto es obligatorio.";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "El monto debe ser un número.";
    if (amount <= 0) return "El monto debe ser mayor que 0.";
    return null;
}

export function validateDate(value) {
    if (!value) return "La fecha es obligatoria.";
    const date = parseISODate(value);
    if (Number.isNaN(date.getTime())) return "La fecha no es válida.";
    return null;
}

export function validateMovement(input, { categories = [], subcategories = [], paymentMethods = [] } = {}) {
    const errors = {};

    const amountError = validateAmount(input.amount);
    if (amountError) errors.amount = amountError;

    const dateError = validateDate(input.date);
    if (dateError) errors.date = dateError;

    if (input.type !== MOVEMENT_TYPES.INCOME && input.type !== MOVEMENT_TYPES.EXPENSE) {
        errors.type = "Tipo de movimiento inválido.";
    }

    if (input.type === MOVEMENT_TYPES.EXPENSE) {
        const category = categories.find((item) => item.id === input.categoryId);
        if (!input.categoryId) errors.categoryId = "Selecciona una categoría.";
        else if (!category || category.active === false) errors.categoryId = "Categoría inválida.";

        const method = paymentMethods.find((item) => item.id === input.paymentMethod);
        if (!input.paymentMethod) errors.paymentMethod = "Selecciona un método de pago.";
        else if (!method || method.active === false) errors.paymentMethod = "Método de pago inválido.";

        if (input.subcategoryId) {
            const subcategory = subcategories.find((item) => item.id === input.subcategoryId);
            if (!subcategory || subcategory.categoryId !== input.categoryId) {
                errors.subcategoryId = "Subcategoría inválida.";
            }
        }

        if (!String(input.description ?? "").trim()) errors.description = "Indica qué compraste.";
    }

    return { valid: Object.keys(errors).length === 0, errors };
}
