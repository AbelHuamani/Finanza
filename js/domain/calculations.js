import { MOVEMENT_TYPES } from "../constants.js";
import { getMonthKey, getYear } from "../utils/dates.js";

/**
 * Cálculos financieros puros (sin DOM).
 * El balance y el ahorro NUNCA se almacenan: siempre se calculan.
 */

export const isIncome = (movement) => movement.type === MOVEMENT_TYPES.INCOME;
export const isExpense = (movement) => movement.type === MOVEMENT_TYPES.EXPENSE;

export function sumIncome(movements) {
    return movements.reduce((total, movement) => (isIncome(movement) ? total + movement.amount : total), 0);
}

export function sumExpense(movements) {
    return movements.reduce((total, movement) => (isExpense(movement) ? total + movement.amount : total), 0);
}

export function calculateTotals(movements) {
    const income = sumIncome(movements);
    const expense = sumExpense(movements);
    const balance = income - expense;
    const savings = balance;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    return { income, expense, balance, savings, savingsRate };
}

export function groupByMonth(movements) {
    const map = new Map();
    for (const movement of movements) {
        const month = getMonthKey(movement.date);
        if (!map.has(month)) map.set(month, { month, income: 0, expense: 0 });
        const entry = map.get(month);
        if (isIncome(movement)) entry.income += movement.amount;
        else entry.expense += movement.amount;
    }
    return [...map.values()]
        .sort((a, b) => (a.month < b.month ? -1 : 1))
        .map((entry) => ({ ...entry, balance: entry.income - entry.expense, savings: entry.income - entry.expense }));
}

function groupExpense(movements, key, collection, fallbackName) {
    const totals = new Map();
    let grandTotal = 0;
    for (const movement of movements) {
        if (!isExpense(movement)) continue;
        const id = movement[key] ?? null;
        totals.set(id, (totals.get(id) ?? 0) + movement.amount);
        grandTotal += movement.amount;
    }
    const byId = new Map(collection.map((item) => [item.id, item]));
    return [...totals.entries()]
        .map(([id, amount]) => ({
            id,
            name: byId.get(id)?.name ?? fallbackName,
            amount,
            share: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
}

export const groupExpenseByCategory = (movements, categories) =>
    groupExpense(movements, "categoryId", categories, "Sin categoría");

export const groupExpenseBySubcategory = (movements, subcategories) =>
    groupExpense(movements, "subcategoryId", subcategories, "Sin subcategoría");

export const groupExpenseByPaymentMethod = (movements, paymentMethods) =>
    groupExpense(movements, "paymentMethod", paymentMethods, "Sin método");

export function calculateAverageExpense(movements) {
    const expenses = movements.filter(isExpense);
    if (!expenses.length) return 0;
    return sumExpense(expenses) / expenses.length;
}

export function findLargestExpense(movements) {
    return movements
        .filter(isExpense)
        .reduce((largest, movement) => (!largest || movement.amount > largest.amount ? movement : largest), null);
}

export function mostUsedPaymentMethod(movements, paymentMethods) {
    const counts = new Map();
    for (const movement of movements) {
        if (!isExpense(movement) || !movement.paymentMethod) continue;
        const entry = counts.get(movement.paymentMethod) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += movement.amount;
        counts.set(movement.paymentMethod, entry);
    }
    const byId = new Map(paymentMethods.map((item) => [item.id, item]));
    let best = null;
    for (const [id, entry] of counts.entries()) {
        if (!best || entry.count > best.count) {
            best = { id, name: byId.get(id)?.name ?? "Sin método", ...entry };
        }
    }
    return best;
}

export function yearTotals(movements, year) {
    const inYear = movements.filter((movement) => getYear(movement.date) === String(year));
    return { year: String(year), ...calculateTotals(inYear) };
}

export function availableYears(movements) {
    return [...new Set(movements.map((movement) => getYear(movement.date)))].sort();
}

/**
 * Distribuye el ahorro entre las metas según prioridad.
 * Orden: URGENTE → MEDIA → BAJA
 * Empate: creado_en ASC, id ASC
 *
 * @param {Array} metas - Array de metas con { id, montoObjetivo, prioridad, creadoEn }
 * @param {number} savings - Ahorro total (Ingresos - Gastos)
 * @returns {Array} - Metas con datos de asignación: { montoAsignado, porcentaje, montoFaltante, alcanzada, ...meta }
 */
export function calculateGoalAllocations(metas, savings) {
    const PRIORITY_ORDER = { URGENTE: 0, MEDIA: 1, BAJA: 2 };

    // Clonar metas para no mutar el original
    const sortedMetas = [...metas].sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.prioridad] - PRIORITY_ORDER[b.prioridad];
        if (priorityDiff !== 0) return priorityDiff;

        // Same priority: sort by creado_en ASC, then id ASC
        const dateA = new Date(a.creadoEn || 0).getTime();
        const dateB = new Date(b.creadoEn || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;

        return (a.id || 0) - (b.id || 0);
    });

    let remainingSavings = savings;
    const allocations = [];

    for (const meta of sortedMetas) {
        const objetivo = meta.montoObjetivo || 0;
        const asignado = Math.min(remainingSavings, objetivo);
        const faltante = Math.max(0, objetivo - asignado);
        const porcentaje = objetivo > 0 ? (asignado / objetivo) * 100 : 0;
        const alcanzada = asignado >= objetivo;

        allocations.push({
            ...meta,
            montoAsignado: asignado,
            porcentaje,
            montoFaltante: faltante,
            alcanzada,
        });

        remainingSavings -= asignado;
    }

    return allocations;
}
