/**
 * Configuración de la aplicación.
 *
 * dataMode determina la capa de datos:
 *   - "api" : backend/API -> PostgreSQL (por defecto, vinculado).
 *   - "mock": datos ficticios en memoria (solo demostración).
 *
 * Se puede forzar por URL:  index.html?data=mock
 * o recordarlo en localStorage con la clave "finanza:dataMode".
 */

function detectDataMode() {
    if (typeof window === "undefined") return "api";
    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get("data");
        if (fromUrl === "api" || fromUrl === "mock") return fromUrl;
        const stored = window.localStorage.getItem("finanza:dataMode");
        if (stored === "api" || stored === "mock") return stored;
    } catch {
        /* localStorage no disponible */
    }
    return "api";
}

export const config = {
    dataMode: detectDataMode(),
    apiBaseUrl: "/api",
};
