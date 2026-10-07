import { MOVEMENT_TYPES } from "../constants.js";
import {
    MOCK_CATEGORIES,
    MOCK_MOVEMENTS,
    MOCK_PAYMENT_METHODS,
    MOCK_SUBCATEGORIES,
} from "../data/mockData.js";

/**
 * Implementación de la capa de datos con datos mock en memoria.
 * Mantiene los mismos métodos y firma async que ApiDataService para que
 * la UI no sepa de dónde vienen los datos.
 */

const clone = (value) =>
    typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const LATENCY_MS = 120;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();

function createSeed() {
    return {
        movements: clone(MOCK_MOVEMENTS),
        categories: clone(MOCK_CATEGORIES),
        subcategories: clone(MOCK_SUBCATEGORIES),
        paymentMethods: clone(MOCK_PAYMENT_METHODS),
    };
}

let database = createSeed();

function nextId(prefix, items) {
    const highest = items.reduce((max, item) => {
        const numeric = Number.parseInt(String(item.id).replace(/\D/g, ""), 10);
        return Number.isNaN(numeric) ? max : Math.max(max, numeric);
    }, 0);
    return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

function normalizeMovement(input) {
    const isExpense = input.type !== MOVEMENT_TYPES.INCOME;
    const timestamp = nowIso();
    return {
        id: input.id ?? nextId("mov", database.movements),
        type: isExpense ? MOVEMENT_TYPES.EXPENSE : MOVEMENT_TYPES.INCOME,
        date: input.date,
        amount: Number(input.amount),
        categoryId: isExpense ? input.categoryId ?? null : null,
        subcategoryId: isExpense ? input.subcategoryId ?? null : null,
        description: input.description ?? "",
        paymentMethod: isExpense ? input.paymentMethod ?? null : null,
        note: input.note ?? "",
        createdAt: input.createdAt ?? timestamp,
        updatedAt: timestamp,
    };
}

export const mockDataService = {
    async getMovements() {
        await wait();
        return clone(database.movements);
    },

    async getCategories() {
        await wait();
        return clone(database.categories);
    },

    async getSubcategories(categoryId = null) {
        await wait();
        const list = categoryId
            ? database.subcategories.filter((sub) => sub.categoryId === categoryId)
            : database.subcategories;
        return clone(list);
    },

    async getPaymentMethods() {
        await wait();
        return clone(database.paymentMethods);
    },

    async createMovement(input) {
        await wait();
        const movement = normalizeMovement(input);
        database.movements.push(movement);
        return clone(movement);
    },

    async createMovements(inputs) {
        await wait();
        const created = [];
        for (const input of inputs) {
            const movement = normalizeMovement(input);
            database.movements.push(movement);
            created.push(movement);
        }
        return clone(created);
    },

    async updateMovement(id, changes) {
        await wait();
        const index = database.movements.findIndex((movement) => movement.id === id);
        if (index === -1) throw new Error(`Movimiento no encontrado: ${id}`);
        const updated = { ...database.movements[index], ...changes, id, updatedAt: nowIso() };
        database.movements[index] = updated;
        return clone(updated);
    },

    async deleteMovement(id) {
        await wait();
        const index = database.movements.findIndex((movement) => movement.id === id);
        if (index === -1) throw new Error(`Movimiento no encontrado: ${id}`);
        database.movements.splice(index, 1);
        return { id };
    },

    async createCategory(input) {
        await wait();
        const category = {
            id: nextId("cat", database.categories),
            name: input.name,
            type: input.type ?? MOVEMENT_TYPES.EXPENSE,
            active: input.active ?? true,
            createdAt: nowIso(),
        };
        database.categories.push(category);
        return clone(category);
    },

    async createSubcategory(input) {
        await wait();
        const subcategory = {
            id: nextId("sub", database.subcategories),
            categoryId: input.categoryId,
            name: input.name,
            active: input.active ?? true,
        };
        database.subcategories.push(subcategory);
        return clone(subcategory);
    },

    async createPaymentMethod(input) {
        await wait();
        const method = {
            id: nextId("pm", database.paymentMethods),
            name: input.name,
            active: input.active ?? true,
        };
        database.paymentMethods.push(method);
        return clone(method);
    },

    async reset() {
        await wait();
        database = createSeed();
    },
};
