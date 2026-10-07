import { qs } from "../utils/dom.js";

const ICONS = {
    success:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
};

export function showToast(message, type = "success", duration = 3200) {
    const root = qs("#toastRoot");
    if (!root) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.innerHTML = `<span class="toast__icon">${ICONS[type] ?? ICONS.info}</span><span class="toast__message"></span>`;
    toast.querySelector(".toast__message").textContent = message;
    root.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-visible"));

    const remove = () => {
        toast.classList.remove("is-visible");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 400);
    };

    setTimeout(remove, duration);
    toast.addEventListener("click", remove);
}
