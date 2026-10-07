import { escapeHtml, qs } from "../utils/dom.js";

let activeOverlay = null;
let lastFocused = null;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function openModal({
    title,
    bodyHTML = "",
    submitLabel = "Guardar",
    cancelLabel = "Cancelar",
    size = "md",
    showSubmit = true,
    submitVariant = "primary",
    onSubmit = null,
    onReady = null,
} = {}) {
    closeModal();
    lastFocused = document.activeElement;

    const root = qs("#modalRoot");
    root.hidden = false;
    root.innerHTML = `
        <div class="modal-overlay" data-modal-overlay>
            <div class="modal modal--${escapeHtml(size)}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <form class="modal__form" novalidate>
                    <div class="modal__header">
                        <h2 class="modal__title" id="modalTitle">${escapeHtml(title ?? "")}</h2>
                        <button class="btn btn--icon btn--ghost" type="button" data-modal-close aria-label="Cerrar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="modal__body">${bodyHTML}</div>
                    <div class="modal__footer">
                        <button class="btn btn--ghost" type="button" data-modal-close>${escapeHtml(cancelLabel)}</button>
                        ${showSubmit ? `<button class="btn btn--${escapeHtml(submitVariant)}" type="submit" data-modal-submit>${escapeHtml(submitLabel)}</button>` : ""}
                    </div>
                </form>
            </div>
        </div>`;

    const overlay = root.querySelector("[data-modal-overlay]");
    activeOverlay = overlay;

    overlay.addEventListener("mousedown", (event) => {
        if (event.target === overlay) closeModal();
    });

    overlay.addEventListener("click", (event) => {
        if (event.target.closest("[data-modal-close]")) closeModal();
    });

    overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeModal();
        }
        if (event.key === "Tab") trapFocus(event, overlay);
    });

    overlay.querySelector(".modal__form").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!onSubmit) return closeModal();

        const submitButton = overlay.querySelector("[data-modal-submit]");
        submitButton?.setAttribute("disabled", "");
        submitButton?.classList.add("is-loading");

        try {
            const result = await onSubmit(overlay);
            if (result !== false) closeModal();
        } catch (error) {
            console.error("[finanza] Error en formulario:", error);
        } finally {
            submitButton?.removeAttribute("disabled");
            submitButton?.classList.remove("is-loading");
        }
    });

    document.body.classList.add("modal-open");
    if (typeof onReady === "function") onReady(overlay);

    const firstField = overlay.querySelector("input, select, textarea");
    (firstField ?? overlay.querySelector("[data-modal-submit]"))?.focus();

    return overlay;
}

export function closeModal() {
    const root = qs("#modalRoot");
    if (!root || root.hidden) return;
    root.hidden = true;
    root.innerHTML = "";
    activeOverlay = null;
    document.body.classList.remove("modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    lastFocused = null;
}

function trapFocus(event, container) {
    const focusable = [...container.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

export function setFieldErrors(overlay, errors = {}) {
    overlay.querySelectorAll("[data-field]").forEach((field) => {
        const name = field.dataset.field;
        const wrapper = field.closest(".field");
        const errorNode = wrapper?.querySelector("[data-field-error]");
        if (errors[name]) {
            wrapper?.classList.add("field--invalid");
            field.setAttribute("aria-invalid", "true");
            if (errorNode) errorNode.textContent = errors[name];
        } else {
            wrapper?.classList.remove("field--invalid");
            field.removeAttribute("aria-invalid");
            if (errorNode) errorNode.textContent = "";
        }
    });

    const firstInvalid = overlay.querySelector(".field--invalid input, .field--invalid select, .field--invalid textarea");
    firstInvalid?.focus();
    return Object.keys(errors).length === 0;
}
