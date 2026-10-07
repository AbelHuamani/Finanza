import {
    calculateAverageExpense,
    calculateTotals,
    findLargestExpense,
    groupByMonth,
    groupExpenseByCategory,
    mostUsedPaymentMethod,
} from "../domain/calculations.js";
import { formatCurrency, formatPercent } from "../utils/currency.js";
import { formatDate, monthLabel } from "../utils/dates.js";
import { escapeHtml, qs } from "../utils/dom.js";

export function render(state, movements) {
    const container = qs("#analyticsInsights");
    const messagesNode = qs("#analyticsMessages");
    if (!container || !messagesNode) return;

    if (!movements.length) {
        container.innerHTML = `<div class="empty-state">No hay datos suficientes para analizar con los filtros actuales.</div>`;
        messagesNode.innerHTML = "";
        return;
    }

    const totals = calculateTotals(movements);
    const topCategory = groupExpenseByCategory(movements, state.categories)[0] ?? null;
    const average = calculateAverageExpense(movements);
    const largest = findLargestExpense(movements);
    const method = mostUsedPaymentMethod(movements, state.paymentMethods);
    const byMonth = groupByMonth(movements);

    const insights = [
        {
            label: "Categoría con mayor gasto",
            value: topCategory ? topCategory.name : "—",
            hint: topCategory ? formatCurrency(topCategory.amount) : "Sin gastos",
        },
        { label: "Gasto promedio", value: formatCurrency(average), hint: "Por movimiento" },
        {
            label: "Mayor gasto individual",
            value: largest ? formatCurrency(largest.amount) : "—",
            hint: largest ? `${escapeHtml(largest.description || "Sin descripción")} · ${formatDate(largest.date)}` : "Sin gastos",
        },
        {
            label: "Método de pago más usado",
            value: method ? method.name : "—",
            hint: method ? `${method.count} gastos · ${formatCurrency(method.amount)}` : "Sin gastos",
        },
        { label: "Ahorro del período", value: formatCurrency(totals.savings), hint: `${formatPercent(totals.savingsRate, 0)} de los ingresos` },
    ];

    container.innerHTML = insights
        .map(
            (insight) => `<article class="insight card">
                <span class="insight__label">${escapeHtml(insight.label)}</span>
                <span class="insight__value">${insight.value}</span>
                <span class="insight__hint">${insight.hint}</span>
            </article>`,
        )
        .join("");

    messagesNode.innerHTML = buildMessages({ state, movements, totals, topCategory, average, largest, method, byMonth })
        .map((message) => `<li class="message">${message}</li>`)
        .join("");
}

function buildMessages({ state, totals, topCategory, average, largest, method, byMonth }) {
    const messages = [];

    if (topCategory) {
        messages.push(
            `Gastaste <strong>${formatCurrency(topCategory.amount)}</strong> en <strong>${escapeHtml(
                topCategory.name,
            )}</strong>, el ${formatPercent(topCategory.share, 0)} de tus gastos.`,
        );
    }

    if (average > 0) {
        messages.push(`Tu gasto promedio por movimiento es de <strong>${formatCurrency(average)}</strong>.`);
    }

    if (largest) {
        messages.push(
            `Tu mayor gasto fue <strong>${formatCurrency(largest.amount)}</strong> en "${escapeHtml(
                largest.description || "sin descripción",
            )}" (${formatDate(largest.date)}).`,
        );
    }

    if (method) {
        messages.push(`Usaste <strong>${escapeHtml(method.name)}</strong> en ${method.count} gastos.`);
    }

    if (totals.income > 0) {
        if (totals.savings >= 0) {
            messages.push(
                `Ahorraste <strong>${formatCurrency(totals.savings)}</strong> en el período (${formatPercent(
                    totals.savingsRate,
                    0,
                )} de tus ingresos).`,
            );
        } else {
            messages.push(
                `En el período gastaste <strong>${formatCurrency(-totals.savings)}</strong> más de lo que ingresó.`,
            );
        }
    }

    if (byMonth.length >= 2) {
        const previous = byMonth[byMonth.length - 2];
        const current = byMonth[byMonth.length - 1];
        const expenseDiff = current.expense - previous.expense;
        if (Math.abs(expenseDiff) > 0.5) {
            const direction = expenseDiff > 0 ? "más" : "menos";
            messages.push(
                `En <strong>${monthLabel(current.month)}</strong> gastaste ${formatCurrency(
                    Math.abs(expenseDiff),
                )} ${direction} que en ${monthLabel(previous.month)}.`,
            );
        }
    }

    return messages;
}
