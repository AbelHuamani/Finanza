import { MOVEMENT_TYPES } from "../constants.js";

/**
 * Datos mock (temporales).
 * Única fuente de datos ficticios del proyecto. La UI nunca debe importar
 * este archivo directamente: siempre pasa por services/dataService.js.
 */

export const MOCK_CATEGORIES = [
    { id: "cat-food", name: "Alimentación", type: "EXPENSE", active: true, createdAt: "2026-01-01" },
    { id: "cat-transport", name: "Transporte", type: "EXPENSE", active: true, createdAt: "2026-01-01" },
 ];

export const MOCK_SUBCATEGORIES = [
    { id: "sub-food-breakfast", categoryId: "cat-food", name: "Desayuno", active: true },
    { id: "sub-food-lunch", categoryId: "cat-food", name: "Almuerzo", active: true },
];

export const MOCK_PAYMENT_METHODS = [
    { id: "pm-cash", name: "Efectivo", active: true },
    { id: "pm-yape", name: "Yape", active: true },
];

function buildMovements() {
    const movements = [];
    let sequence = 0;

    const nextId = () => `mov-${String(++sequence).padStart(3, "0")}`;
    const timestamp = (date, hour) => `${date}T${hour}:00:00.000Z`;

    const addIncome = (date, amount, description, note = "") => {
        movements.push({
            id: nextId(),
            type: MOVEMENT_TYPES.INCOME,
            date,
            amount,
            categoryId: null,
            subcategoryId: null,
            description,
            paymentMethod: null,
            note,
            createdAt: timestamp(date, "09"),
            updatedAt: timestamp(date, "09"),
        });
    };

    const addExpense = (date, amount, categoryId, description, paymentMethod, subcategoryId = null, note = "") => {
        movements.push({
            id: nextId(),
            type: MOVEMENT_TYPES.EXPENSE,
            date,
            amount,
            categoryId,
            subcategoryId,
            description,
            paymentMethod,
            note,
            createdAt: timestamp(date, "12"),
            updatedAt: timestamp(date, "12"),
        });
    };


    return movements;
}

export const MOCK_MOVEMENTS = buildMovements();
