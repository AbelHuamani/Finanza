import { APP_ACTIONS, DEFAULT_SECTION, SECTIONS } from "./constants.js";
import { dataService } from "./services/dataService.js";
import { getState, setState, subscribe } from "./state.js";
import { applyFilters } from "./domain/filters.js";
import { qs, qsa } from "./utils/dom.js";
import { initNotifications } from "./components/notifications.js";
import * as filtersModule from "./modules/filters.js";
import * as dashboardModule from "./modules/dashboard.js";
import * as transactionsModule from "./modules/transactions.js";
import * as analyticsModule from "./modules/analytics.js";
import * as categoriesModule from "./modules/categories.js";
import * as incomeModule from "./modules/income.js";
import * as expensesModule from "./modules/expenses.js";
import * as metasModule from "./modules/metas.js";

const dom = {
    title: qs("#pageTitle"),
    subtitle: qs("#pageSubtitle"),
    sections: qsa(".section"),
    navLinks: qsa("[data-section]"),
    actionMenu: qs("#actionMenu"),
    backdrop: qs("#backdrop"),
    actionsToggle: qs("[data-toggle-actions]"),
};

const sectionsById = new Map(SECTIONS.map((section) => [section.id, section]));

function sectionFromHash() {
    const hash = window.location.hash.replace("#", "");
    const [id, queryString] = hash.split("?");
    return {
        id: sectionsById.has(id) ? id : DEFAULT_SECTION,
        params: parseQueryString(queryString),
    };
}

function parseQueryString(queryString) {
    if (!queryString) return {};
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

function renderNav(id) {
    for (const link of dom.navLinks) {
        if (link.dataset.section === id) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
}

function renderSection(id) {
    for (const section of dom.sections) {
        section.hidden = section.id !== `section-${id}`;
    }
}

function renderHeading(section) {
    dom.title.textContent = section.title;
    if (dom.subtitle) dom.subtitle.textContent = section.subtitle;
    document.title = `Finanza — ${section.title}`;
}

export function navigate(id, { updateHash = true, params = {} } = {}) {
    const section = sectionsById.get(id);
    if (!section) return;

    const queryString = Object.keys(params).length > 0
        ? '?' + new URLSearchParams(params).toString()
        : '';
    const fullHash = `#${id}${queryString}`;

    if (updateHash && window.location.hash !== fullHash) {
        window.location.hash = fullHash;
        return;
    }

    closeActionMenu();
    renderSection(id);
    renderNav(id);
    renderHeading(section);
    setState({ activeSection: id, navigationParams: params });
    window.scrollTo({ top: 0, behavior: "auto" });

    // Dispatch event for modules to react to navigation with params
    document.dispatchEvent(new CustomEvent('app:navigate', {
        detail: { section: id, params }
    }));
}

function openActionMenu() {
    if (!dom.actionMenu) return;
    dom.actionMenu.hidden = false;
    if (dom.backdrop) dom.backdrop.hidden = false;
    dom.actionsToggle?.setAttribute("aria-expanded", "true");
}

function closeActionMenu() {
    if (!dom.actionMenu || dom.actionMenu.hidden) return;
    dom.actionMenu.hidden = true;
    if (dom.backdrop) dom.backdrop.hidden = true;
    dom.actionsToggle?.setAttribute("aria-expanded", "false");
}

function toggleActionMenu() {
    if (dom.actionMenu?.hidden) openActionMenu();
    else closeActionMenu();
}

function setupNavigation() {
    document.addEventListener("click", (event) => {
        const link = event.target.closest("[data-section]");
        if (!link) return;
        event.preventDefault();
        navigate(link.dataset.section);
    });

    window.addEventListener("hashchange", () => {
        const { id, params } = sectionFromHash();
        navigate(id, { updateHash: false, params });
    });
}

function setupActions() {
    document.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-action]");
        if (actionButton) {
            closeActionMenu();
            document.dispatchEvent(
                new CustomEvent("app:action", {
                    detail: { action: actionButton.dataset.action, id: actionButton.dataset.movementId ?? null },
                }),
            );
            return;
        }

        if (event.target.closest("[data-toggle-actions]")) {
            toggleActionMenu();
            return;
        }

        if (event.target === dom.backdrop) closeActionMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeActionMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024) closeActionMenu();
    });
}

function renderApp() {
    const state = getState();
    const filtered = applyFilters(state.movements, state.filters);
    filtersModule.render(state);
    dashboardModule.render(state, filtered);
    transactionsModule.render(state, filtered);
    analyticsModule.render(state, filtered);
    categoriesModule.render(state, filtered);
    metasModule.render(state);
}

function mountModules() {
    filtersModule.mount();
    transactionsModule.mount();
    categoriesModule.mount();
    incomeModule.mount();
    expensesModule.mount();
    metasModule.mount();
}

async function loadInitialData() {
    setState({ status: "loading", error: null });

    try {
        const [movements, categories, subcategories, paymentMethods] = await Promise.all([
            dataService.getMovements(),
            dataService.getCategories(),
            dataService.getSubcategories(),
            dataService.getPaymentMethods(),
        ]);

        setState({ movements, categories, subcategories, paymentMethods, status: "ready" });
        // Inicializar notificaciones ANTES de disparar app:data-ready
        // para que estén listas cuando loadMetas() las necesite
        await initNotifications();
        document.dispatchEvent(new CustomEvent("app:data-ready"));
        logDataSummary();
    } catch (error) {
        setState({ status: "error", error: error.message });
        console.error("[finanza] Error al cargar datos:", error);
    }
}

function logDataSummary() {
    const { movements, categories, paymentMethods } = getState();
    console.info(
        `[finanza] Listo -> ${movements.length} movimientos, ${categories.length} categorías, ${paymentMethods.length} métodos de pago.`,
    );
}

function setupDevTools() {
    window.finanza = Object.freeze({
        state: Object.freeze({ getState, subscribe, setState }),
        dataService,
    });
}

function init() {
    setupNavigation();
    setupActions();
    setupDevTools();
    mountModules();
    subscribe(renderApp);
    navigate(sectionFromHash(), { updateHash: false });
    renderApp();
    loadInitialData();
}

init();
