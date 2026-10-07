import { escapeHtml } from "../utils/dom.js";
import { formatCompact, formatCurrency } from "../utils/currency.js";

/**
 * Gráficos en SVG nativo (sin dependencias externas).
 * Cada función devuelve HTML (SVG + leyenda) listo para inyectar.
 * Si en el futuro se necesita más potencia, solo se reescribe el interior
 * de este módulo sin tocar los demás.
 */

const PALETTE = [
    "#3757d6",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#ea580c",
    "#16a34a",
    "#ca8a04",
    "#4f46e5",
    "#0d9488",
    "#e11d48",
    "#65a30d",
    "#9333ea",
];

export const paletteColor = (index) => PALETTE[index % PALETTE.length];

const WIDTH = 680;
const HEIGHT = 300;

export function renderEmptyState(message = "No hay datos para este período.") {
    return `<div class="chart-empty">${escapeHtml(message)}</div>`;
}

function legend(series, { currency = false } = {}) {
    return `<div class="chart-legend">${series
        .map(
            (item) =>
                `<span class="legend-item"><span class="legend-swatch" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(
                    item.name,
                )}${currency ? ` — ${formatCurrency(item.value)}` : ""}</span>`,
        )
        .join("")}</div>`;
}

function gridAndAxis(max, plotH, pad, top) {
    const lines = [0, 0.25, 0.5, 0.75, 1];
    return lines
        .map((ratio) => {
            const y = top + plotH * (1 - ratio);
            return `<line class="chart-grid" x1="${pad.left}" y1="${y.toFixed(1)}" x2="${WIDTH - pad.right}" y2="${y.toFixed(
                1,
            )}"/><text class="chart-axis" x="${pad.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${formatCompact(
                max * ratio,
            )}</text>`;
        })
        .join("");
}

export function renderDoughnut(items, { label = "Distribución", total } = {}) {
    const data = items.filter((item) => item.amount > 0);
    if (!data.length) return renderEmptyState();

    const size = 240;
    const thickness = 30;
    const radius = (size - thickness) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const grandTotal = total ?? data.reduce((sum, item) => sum + item.amount, 0);
    let offset = 0;

    const segments = data
        .map((item, index) => {
            const length = grandTotal > 0 ? (item.amount / grandTotal) * circumference : 0;
            const color = paletteColor(index);
            const segment = `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-dasharray="${length.toFixed(
                2,
            )} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${center} ${center})"><title>${escapeHtml(
                item.name,
            )}: ${formatCurrency(item.amount)}</title></circle>`;
            offset += length;
            return segment;
        })
        .join("");

    const centerLabel = `<text class="chart-center-value" x="${center}" y="${center - 2}" text-anchor="middle">${formatCompact(
        grandTotal,
    )}</text><text class="chart-center-label" x="${center}" y="${center + 18}" text-anchor="middle">total</text>`;

    const svg = `<svg class="chart chart--doughnut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(
        label,
    )}" preserveAspectRatio="xMidYMid meet">${segments}${centerLabel}</svg>`;

    const legendItems = data.map((item, index) => ({ name: item.name, color: paletteColor(index), value: item.amount }));
    return `<div class="chart-row">${svg}${legend(legendItems, { currency: true })}</div>`;
}

export function renderBars({ labels = [], series = [], label = "Gráfico de barras" } = {}) {
    if (!labels.length) return renderEmptyState();

    const pad = { top: 16, right: 16, bottom: 40, left: 52 };
    const plotW = WIDTH - pad.left - pad.right;
    const plotH = HEIGHT - pad.top - pad.bottom;
    const allValues = series.flatMap((item) => item.values);
    const max = Math.max(1, ...allValues) * 1.1;

    const groupW = plotW / labels.length;
    const groupInner = groupW * 0.68;
    const barW = Math.min(30, groupInner / series.length);

    let bars = "";
    labels.forEach((labelText, groupIndex) => {
        const centerX = pad.left + groupW * groupIndex + groupW / 2;
        const startX = centerX - (barW * series.length) / 2;
        series.forEach((item, seriesIndex) => {
            const value = item.values[groupIndex] ?? 0;
            const height = (value / max) * plotH;
            const x = startX + seriesIndex * barW;
            const y = pad.top + plotH - height;
            bars += `<rect class="chart-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 3).toFixed(
                1,
            )}" height="${Math.max(0, height).toFixed(1)}" rx="3" fill="${item.color}"><title>${escapeHtml(
                labelText,
            )} · ${escapeHtml(item.name)}: ${formatCurrency(value)}</title></rect>`;
        });
        bars += `<text class="chart-axis" x="${centerX.toFixed(1)}" y="${HEIGHT - 14}" text-anchor="middle">${escapeHtml(
            labelText,
        )}</text>`;
    });

    const svg = `<svg class="chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeHtml(
        label,
    )}" preserveAspectRatio="xMidYMid meet">${gridAndAxis(max, plotH, pad, pad.top)}${bars}</svg>`;

    return `<div class="chart-row chart-row--column">${svg}${legend(series)}</div>`;
}

export function renderLines({ labels = [], series = [], label = "Gráfico de líneas", area = false } = {}) {
    if (!labels.length) return renderEmptyState();

    const pad = { top: 16, right: 20, bottom: 40, left: 52 };
    const plotW = WIDTH - pad.left - pad.right;
    const plotH = HEIGHT - pad.top - pad.bottom;
    const allValues = series.flatMap((item) => item.values);
    const maxValue = Math.max(1, ...allValues);
    const minValue = Math.min(0, ...allValues);
    const span = maxValue - minValue || 1;
    const max = maxValue * 1.1;

    const xAt = (index, count) => (count <= 1 ? pad.left + plotW / 2 : pad.left + (plotW / (count - 1)) * index);
    const yAt = (value) => pad.top + plotH * (1 - (value - minValue) / span);

    let paths = "";
    series.forEach((item) => {
        const points = item.values.map((value, index) => `${xAt(index, labels.length).toFixed(1)},${yAt(value).toFixed(1)}`);
        if (area) {
            const baseline = pad.top + plotH;
            paths += `<path class="chart-area" d="M${xAt(0, labels.length).toFixed(1)},${baseline} L${points.join(
                " L",
            )} L${xAt(labels.length - 1, labels.length).toFixed(1)},${baseline} Z" fill="${item.color}" opacity="0.12"/>`;
        }
        paths += `<polyline class="chart-line" points="${points.join(" ")}" fill="none" stroke="${item.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
        paths += item.values
            .map(
                (value, index) =>
                    `<circle class="chart-point" cx="${xAt(index, labels.length).toFixed(1)}" cy="${yAt(value).toFixed(
                        1,
                    )}" r="3" fill="${item.color}"><title>${escapeHtml(labels[index])} · ${escapeHtml(
                        item.name,
                    )}: ${formatCurrency(value)}</title></circle>`,
            )
            .join("");
    });

    const xLabels = labels
        .map(
            (text, index) =>
                `<text class="chart-axis" x="${xAt(index, labels.length).toFixed(1)}" y="${
                    HEIGHT - 14
                }" text-anchor="middle">${escapeHtml(text)}</text>`,
        )
        .join("");

    const svg = `<svg class="chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeHtml(
        label,
    )}" preserveAspectRatio="xMidYMid meet">${gridAndAxis(max, plotH, pad, pad.top)}${paths}${xLabels}</svg>`;

    return `<div class="chart-row chart-row--column">${svg}${legend(series)}</div>`;
}
