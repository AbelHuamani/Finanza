import { showToast } from "../components/toast.js";
import { optionsHtml } from "../components/forms.js";
import { addCategory, addSubcategory } from "../actions.js";
import { escapeHtml, qs } from "../utils/dom.js";
import { formatCurrency, formatPercent } from "../utils/currency.js";

export function mount() {
    const section = qs("#section-categorias");
    if (!section) return;

    section.addEventListener("submit", async (event) => {
        const form = event.target.closest("form");
        if (!form) return;
        event.preventDefault();

        if (form.id === "addCategoryForm") {
            const input = form.querySelector("[name='categoryName']");
            const name = input.value.trim();
            if (!name) {
                showToast("Escribe un nombre de categoría.", "error");
                input.focus();
                return;
            }
            await addCategory({ name });
            input.value = "";
        }

        if (form.id === "addSubcategoryForm") {
            const categoryId = form.querySelector("[name='subcategoryParent']").value;
            const input = form.querySelector("[name='subcategoryName']");
            const name = input.value.trim();
            if (!categoryId) {
                showToast("Selecciona una categoría.", "error");
                return;
            }
            if (!name) {
                showToast("Escribe un nombre de subcategoría.", "error");
                input.focus();
                return;
            }
            await addSubcategory({ categoryId, name });
            input.value = "";
        }
    });
}

export function render(state, movements) {
    const list = qs("#categoriesList");
    const parentSelect = qs("[name='subcategoryParent']");
    if (!list) return;

    const totals = new Map();
    for (const movement of movements) {
        if (movement.type !== "EXPENSE") continue;
        const entry = totals.get(movement.categoryId) ?? { amount: 0, count: 0 };
        entry.amount += movement.amount;
        entry.count += 1;
        totals.set(movement.categoryId, entry);
    }

    const grandTotal = [...totals.values()].reduce((sum, entry) => sum + entry.amount, 0);

    const categories = [...state.categories].sort(
        (a, b) => (totals.get(b.id)?.amount ?? 0) - (totals.get(a.id)?.amount ?? 0),
    );

    list.innerHTML = categories
        .map((category) => {
            const entry = totals.get(category.id) ?? { amount: 0, count: 0 };
            const share = grandTotal > 0 ? (entry.amount / grandTotal) * 100 : 0;
            const subcategories = state.subcategories.filter((sub) => sub.categoryId === category.id);
            const chips = subcategories.length
                ? `<div class="chips">${subcategories
                      .map((sub) => `<span class="chip">${escapeHtml(sub.name)}</span>`)
                      .join("")}</div>`
                : `<p class="cat-item__empty">Sin subcategorías todavía.</p>`;

            return `<article class="cat-item card">
                <div class="cat-item__head">
                    <h3 class="cat-item__name">${escapeHtml(category.name)}</h3>
                    <span class="cat-item__total">${formatCurrency(entry.amount)}</span>
                </div>
                <div class="cat-item__meta">
                    ${entry.count} movimiento${entry.count === 1 ? "" : "s"} · ${formatPercent(share, 0)} de tus gastos
                </div>
                <div class="share-bar" role="presentation"><span style="width:${share.toFixed(1)}%"></span></div>
                ${chips}
            </article>`;
        })
        .join("");

    if (parentSelect && document.activeElement !== parentSelect) {
        const current = parentSelect.value;
        parentSelect.innerHTML = optionsHtml(state.categories, current, "Selecciona categoría");
    }
}
