import { getPeriodRange, isWithin } from "../utils/dates.js";

/**
 * Filtrado puro de movimientos. La UI solo cambia `filters` en el estado
 * y todos los módulos consumen el resultado de esta función.
 */

export function applyFilters(movements, filters, reference = new Date()) {
    const range = getPeriodRange(filters.period, reference, { from: filters.from, to: filters.to });
    const search = String(filters.search ?? "").trim().toLowerCase();

    return movements.filter((movement) => {
        if (!isWithin(movement.date, range)) return false;
        if (filters.type !== "all" && movement.type !== filters.type) return false;
        if (filters.categoryId && movement.categoryId !== filters.categoryId) return false;
        if (filters.paymentMethod && movement.paymentMethod !== filters.paymentMethod) return false;
        if (search) {
            const haystack = `${movement.description} ${movement.note} ${movement.amount}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
}

export function sortMovements(movements, { sortKey = "date", sortDir = "desc" } = {}) {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...movements].sort((a, b) => {
        if (sortKey === "amount") return (a.amount - b.amount) * factor;
        if (sortKey === "type") return a.type.localeCompare(b.type) * factor;
        return String(a.date).localeCompare(String(b.date)) * factor;
    });
}

export function paginate(items, page = 1, pageSize = 10) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    const start = (current - 1) * pageSize;
    return {
        items: items.slice(start, start + pageSize),
        page: current,
        pageSize,
        totalPages,
        total: items.length,
    };
}
