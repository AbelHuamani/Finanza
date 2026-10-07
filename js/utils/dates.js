/**
 * Utilidades de fecha centralizadas.
 * Almacenamiento: "YYYY-MM-DD" (sin zona horaria).
 * Visualización: "DD/MM/YYYY".
 */

const MONTHS = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function parseISODate(iso) {
    const [year, month, day] = String(iso).split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}

export function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export const todayISO = () => toISODate(new Date());

export function formatDate(iso) {
    const date = parseISODate(iso);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
}

export const getMonthKey = (iso) => String(iso).slice(0, 7);
export const getYear = (iso) => String(iso).slice(0, 4);

export function monthLabel(monthKey) {
    const [year, month] = String(monthKey).split("-").map(Number);
    return `${MONTHS[(month || 1) - 1]} ${year}`;
}

export function monthShortLabel(monthKey) {
    const [year, month] = String(monthKey).split("-").map(Number);
    return `${MONTHS_SHORT[(month || 1) - 1]} ${String(year).slice(2)}`;
}

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
export const startOfYear = (date) => new Date(date.getFullYear(), 0, 1);
export const endOfYear = (date) => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

export function startOfWeek(date) {
    const start = startOfDay(date);
    const offset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - offset);
    return start;
}

export function endOfWeek(date) {
    const end = startOfWeek(date);
    end.setDate(end.getDate() + 6);
    return endOfDay(end);
}

export function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function getPeriodRange(period, reference = new Date(), custom = {}) {
    switch (period) {
        case "today":
            return { from: startOfDay(reference), to: endOfDay(reference) };
        case "this-week":
            return { from: startOfWeek(reference), to: endOfWeek(reference) };
        case "this-month":
            return { from: startOfMonth(reference), to: endOfMonth(reference) };
        case "last-month": {
            const previous = addMonths(reference, -1);
            return { from: startOfMonth(previous), to: endOfMonth(previous) };
        }
        case "last-3-months":
            return { from: startOfMonth(addMonths(reference, -2)), to: endOfMonth(reference) };
        case "last-6-months":
            return { from: startOfMonth(addMonths(reference, -5)), to: endOfMonth(reference) };
        case "this-year":
            return { from: startOfYear(reference), to: endOfYear(reference) };
        case "custom":
            return {
                from: custom.from ? startOfDay(parseISODate(custom.from)) : null,
                to: custom.to ? endOfDay(parseISODate(custom.to)) : null,
            };
        case "all":
        default:
            return { from: null, to: null };
    }
}

export function isWithin(iso, range) {
    if (!range || (!range.from && !range.to)) return true;
    const date = startOfDay(parseISODate(iso));
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
}

export function compareISO(a, b) {
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}
