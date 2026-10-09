import { DEFAULT_FILTERS, DEFAULT_SECTION } from "./constants.js";

/**
 * Estado central de la aplicación: una única fuente de verdad.
 * Cualquier módulo se suscribe para re-renderizarse cuando cambie.
 */

const initialTable = { sortKey: "date", sortDir: "desc", page: 1, pageSize: 10 };

let state = {
    movements: [],
    categories: [],
    subcategories: [],
    paymentMethods: [],
    filters: { ...DEFAULT_FILTERS },
    ui: { table: { ...initialTable } },
    activeSection: DEFAULT_SECTION,
    navigationParams: {},
    status: "idle",
    error: null,
};

const listeners = new Set();

export function getState() {
    return state;
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function emit() {
    for (const listener of listeners) listener(state);
}

export function setState(partial) {
    state = { ...state, ...partial };
    emit();
    return state;
}

export function setFilters(partial) {
    const filters = { ...state.filters, ...partial };
    return setState({ filters, ui: { ...state.ui, table: { ...state.ui.table, page: 1 } } });
}

export function setTable(partial) {
    return setState({ ui: { ...state.ui, table: { ...state.ui.table, ...partial } } });
}
