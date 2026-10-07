import { calculateTotals, groupByMonth, groupExpenseByCategory } from "../domain/calculations.js";
import { formatCurrency, formatPercent } from "../utils/currency.js";
import { monthShortLabel } from "../utils/dates.js";
import { renderBars, renderDoughnut, renderLines } from "../components/charts.js";
import { qs } from "../utils/dom.js";

export function render(state, movements) {
    const totals = calculateTotals(movements);

    setKpi("income", formatCurrency(totals.income));
    setKpi("expense", formatCurrency(totals.expense));
    setKpi("balance", formatCurrency(totals.balance));
    setKpi("savings", formatCurrency(totals.savings));
    setKpi("savings-rate", formatPercent(totals.savingsRate, 0));

    qs('[data-kpi="balance"]')?.classList.toggle("kpi--negative", totals.balance < 0);
    qs('[data-kpi="savings"]')?.classList.toggle("kpi--negative", totals.savings < 0);

    const byMonth = groupByMonth(movements);
    const labels = byMonth.map((entry) => monthShortLabel(entry.month));

    qs("#chartIncomeExpense").innerHTML = renderBars({
        labels,
        series: [
            { name: "Ingresos", color: "var(--c-income)", values: byMonth.map((entry) => entry.income) },
            { name: "Gastos", color: "var(--c-expense)", values: byMonth.map((entry) => entry.expense) },
        ],
        label: "Ingresos versus gastos por mes",
    });

    qs("#chartEvolution").innerHTML = renderLines({
        labels,
        series: [
            { name: "Ingresos", color: "var(--c-income)", values: byMonth.map((entry) => entry.income) },
            { name: "Gastos", color: "var(--c-expense)", values: byMonth.map((entry) => entry.expense) },
        ],
        label: "Evolución mensual de ingresos y gastos",
    });

    qs("#chartSavings").innerHTML = renderLines({
        labels,
        series: [{ name: "Ahorro", color: "var(--c-accent)", values: byMonth.map((entry) => entry.balance) }],
        label: "Evolución del ahorro",
        area: true,
    });

    const byCategory = groupExpenseByCategory(movements, state.categories).slice(0, 8);
    qs("#chartCategories").innerHTML = renderDoughnut(byCategory, {
        label: "Gastos por categoría",
        total: totals.expense,
    });
}

function setKpi(key, value) {
    const node = qs(`[data-kpi-value="${key}"]`);
    if (node) node.textContent = value;
}
