import { CURRENCY } from "../constants.js";

/**
 * Formato centralizado de moneda y números (PEN).
 * Único lugar donde se decide cómo se ve el dinero.
 */

const currencyFormatter = new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
    const value = Number(amount);
    return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value, digits = 2) {
    const number = Number(value);
    return new Intl.NumberFormat(CURRENCY.locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(Number.isFinite(number) ? number : 0);
}

export function formatPercent(value, digits = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0%";
    return `${number.toFixed(digits)}%`;
}

export function formatCompact(value) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);
    if (abs >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${(number / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return String(Math.round(number));
}

export function parseAmount(value) {
    if (typeof value === "number") return value;
    const cleaned = String(value ?? "")
        .trim()
        .replace(/\s/g, "")
        .replace(/S\/?/gi, "")
        .replace(/,/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : NaN;
}
