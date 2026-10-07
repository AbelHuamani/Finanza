import { config } from "../config.js";
import { mockDataService } from "./mockDataService.js";
import { apiDataService } from "./apiDataService.js";

/**
 * Selector de la capa de datos.
 *
 * Cambiar de mock a PostgreSQL real = cambiar config.dataMode a "api".
 * La UI y el resto de la aplicación NO se modifican.
 */

export const dataService = config.dataMode === "api" ? apiDataService : mockDataService;
