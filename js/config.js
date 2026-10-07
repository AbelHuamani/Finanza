/**
 * Configuración de la aplicación.
 *
 * dataMode determina la capa de datos:
 *   - "mock": datos ficticios en memoria (fase actual).
 *   - "api" : backend/API -> PostgreSQL (fase final).
 *
 * Se puede forzar por URL:  index.html?data=api
 * o recordarlo en localStorage con la clave "finanza:dataMode".
 */

function detectDataMode() {
    if (typeof window === "undefined") return "mock";
    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get("data");
        if (fromUrl === "api" || fromUrl === "mock") return fromUrl;
        const stored = window.localStorage.getItem("finanza:dataMode");
        if (stored === "api" || stored === "mock") return stored;
    } catch {
        /* localStorage no disponible */
    }
    return "mock";
}

export const config = {
    dataMode: detectDataMode(),
    apiBaseUrl: "/api",
};
