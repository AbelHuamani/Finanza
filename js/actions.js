import { DEFAULT_FILTERS } from "./constants.js";
import { dataService } from "./services/dataService.js";
import { getState, setState } from "./state.js";
import { showToast } from "./components/toast.js";

/**
 * Acciones de aplicación: orquestan dataService + estado.
 * Los módulos de UI llaman a estas funciones; nunca a dataService directo
 * para escrituras (así el estado siempre queda consistente).
 */

export async function addMovement(input) {
    const created = await dataService.createMovement(input);
    setState({ movements: [...getState().movements, created] });
    return created;
}

export async function claimMeta(metaId, movementInput) {
    const { movement, meta, notificacion } = await dataService.reclamarMeta(metaId, movementInput);
    setState({ movements: [...getState().movements, movement] });
    return { movement, meta, notificacion };
}

export async function addMovements(inputs) {
    const created = await dataService.createMovements(inputs);
    setState({ movements: [...getState().movements, ...created] });
    return created;
}

export async function editMovement(id, changes) {
    const updated = await dataService.updateMovement(id, changes);
    setState({ movements: getState().movements.map((movement) => (movement.id === id ? updated : movement)) });
    return updated;
}

export async function removeMovement(id) {
    await dataService.deleteMovement(id);
    setState({ movements: getState().movements.filter((movement) => movement.id !== id) });
}

export async function addCategory(input) {
    const created = await dataService.createCategory(input);
    setState({ categories: [...getState().categories, created] });
    showToast("Categoría creada correctamente.");
    return created;
}

export async function addSubcategory(input) {
    const created = await dataService.createSubcategory(input);
    setState({ subcategories: [...getState().subcategories, created] });
    showToast("Subcategoría creada correctamente.");
    return created;
}

export function resetFilters() {
    setState({ filters: { ...DEFAULT_FILTERS } });
}
