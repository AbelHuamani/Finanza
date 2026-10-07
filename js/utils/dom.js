export const qs = (selector, scope = document) => scope.querySelector(selector);

export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export const on = (target, type, handler, options) => target.addEventListener(type, handler, options);

export function delegate(root, selector, type, handler) {
    root.addEventListener(type, (event) => {
        const match = event.target.closest(selector);
        if (match && root.contains(match)) handler(event, match);
    });
}

const HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
