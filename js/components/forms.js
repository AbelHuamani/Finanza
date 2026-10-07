import { escapeHtml } from "../utils/dom.js";

export function field({ label, name, control, hint = "" }) {
    return `<div class="field">
        <label class="field__label" for="field-${escapeHtml(name)}">${escapeHtml(label)}</label>
        ${control}
        ${hint ? `<p class="field__hint">${escapeHtml(hint)}</p>` : ""}
        <p class="field__error" data-field-error></p>
    </div>`;
}

export function optionsHtml(items, selectedId = null, placeholder = null) {
    const parts = [];
    if (placeholder !== null) parts.push(`<option value="">${escapeHtml(placeholder)}</option>`);
    for (const item of items) {
        const value = item.id ?? item.value;
        const label = item.name ?? item.label;
        const selected = selectedId !== null && String(value) === String(selectedId) ? " selected" : "";
        parts.push(`<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`);
    }
    return parts.join("");
}
