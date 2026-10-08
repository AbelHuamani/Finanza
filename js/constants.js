export const DEFAULT_SECTION = "dashboard";

export const SECTIONS = [
    { id: "dashboard", label: "Dashboard", title: "Dashboard", subtitle: "Resumen de tus finanzas" },
    { id: "movimientos", label: "Movimientos", title: "Movimientos", subtitle: "Historial de ingresos y gastos" },
    { id: "analisis", label: "Análisis", title: "Análisis", subtitle: "Observaciones sobre tus finanzas" },
    { id: "categorias", label: "Categorías", title: "Categorías", subtitle: "Categorías y subcategorías" },
    { id: "metas", label: "Metas", title: "Metas de Ahorro", subtitle: "Sigue el progreso hacia tus objetivos" },
];

export const APP_ACTIONS = {
    NEW_INCOME: "new-income",
    NEW_EXPENSE: "new-expense",
    NEW_BULK_EXPENSE: "new-bulk-expense",
    EDIT_MOVEMENT: "edit-movement",
    DELETE_MOVEMENT: "delete-movement",
    NEW_META: "new-meta",
    DELETE_META: "delete-meta",
};

export const MOVEMENT_TYPES = {
    INCOME: "INCOME",
    EXPENSE: "EXPENSE",
};

export const DEFAULT_FILTERS = {
    period: "all",
    type: "all",
    categoryId: null,
    paymentMethod: null,
    search: "",
    from: null,
    to: null,
};

export const PERIOD_OPTIONS = [
    { value: "all", label: "Todos los períodos" },
    { value: "today", label: "Hoy" },
    { value: "this-week", label: "Esta semana" },
    { value: "this-month", label: "Este mes" },
    { value: "last-month", label: "Mes anterior" },
    { value: "last-3-months", label: "Últimos 3 meses" },
    { value: "last-6-months", label: "Últimos 6 meses" },
    { value: "this-year", label: "Este año" },
    { value: "custom", label: "Rango personalizado" },
];

export const TABLE_PAGE_SIZES = [10, 25, 50];

export const CURRENCY = {
    code: "PEN",
    locale: "es-PE",
};

export const META_CATEGORIES = [
    'Tecnología', 'Vehículo', 'Viaje', 'Educación',
    'Emergencia', 'Hogar', 'Salud', 'Otro'
];
