/**
 * Validación del lado del servidor.
 * Es una caja fuerte independiente de la validación del frontend:
 * aquí se rechazan peticiones malformadas antes de tocar la base de datos.
 */

const MOVEMENT_TYPES = new Set(["INCOME", "EXPENSE"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.expose = true;
    return error;
}

export function validateMovementInput(body = {}) {
    const type = body.type;
    if (!MOVEMENT_TYPES.has(type)) throw httpError(400, "Tipo de movimiento inválido.");

    const date = String(body.date ?? "");
    if (!ISO_DATE.test(date)) throw httpError(400, "La fecha debe tener formato YYYY-MM-DD.");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, "El monto debe ser mayor que 0.");

    const isExpense = type === "EXPENSE";
    const categoryId = isExpense && body.categoryId ? String(body.categoryId) : null;
    const subcategoryId = isExpense && body.subcategoryId ? String(body.subcategoryId) : null;
    const paymentMethod = isExpense && body.paymentMethod ? String(body.paymentMethod) : null;

    if (isExpense && !categoryId) throw httpError(400, "Selecciona una categoría.");
    if (isExpense && !paymentMethod) throw httpError(400, "Selecciona un método de pago.");
    if (isExpense && !String(body.description ?? "").trim()) throw httpError(400, "Indica qué compraste.");

    return {
        type,
        date,
        amount,
        categoryId,
        subcategoryId,
        paymentMethod,
        description: String(body.description ?? "").trim(),
        note: String(body.note ?? "").trim(),
    };
}

export function validateName(body = {}, field = "name") {
    const name = String(body[field] ?? "").trim();
    if (!name) throw httpError(400, `El campo "${field}" es obligatorio.`);
    if (name.length > 60) throw httpError(400, `El campo "${field}" es demasiado largo.`);
    return name;
}

export function validateMetaInput(body = {}) {
    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) throw httpError(400, 'El nombre de la meta es obligatorio.');
    if (nombre.length > 120) throw httpError(400, 'El nombre es demasiado largo (máximo 120 caracteres).');

    const montoObjetivo = Number(body.montoObjetivo);
    if (!Number.isFinite(montoObjetivo) || montoObjetivo <= 0) throw httpError(400, 'El monto objetivo debe ser mayor que 0.');

    const categoriaId = body.categoriaId ? Number(body.categoriaId) : null;
    if (categoriaId !== null && (!Number.isFinite(categoriaId) || categoriaId <= 0)) {
        throw httpError(400, 'La categoría debe ser un ID válido.');
    }

    const descripcion = String(body.descripcion ?? '').trim();

    const result = { nombre, montoObjetivo, categoriaId, descripcion };

    // Validar prioridad
    if (body.prioridad !== undefined) {
        const VALID_PRIORITIES = new Set(['URGENTE', 'MEDIA', 'BAJA']);
        const prioridad = String(body.prioridad).trim().toUpperCase();
        if (!VALID_PRIORITIES.has(prioridad)) {
            throw httpError(400, 'La prioridad debe ser URGENTE, MEDIA o BAJA.');
        }
        result.prioridad = prioridad;
    }

    // Validar estado
    if (body.estado !== undefined) {
        const VALID_STATES = new Set(['ACTIVA', 'ALCANZADA', 'RECLAMADA', 'ELIMINADA']);
        const estado = String(body.estado).trim().toUpperCase();
        if (!VALID_STATES.has(estado)) {
            throw httpError(400, 'El estado debe ser ACTIVA, ALCANZADA, RECLAMADA o ELIMINADA.');
        }
        result.estado = estado;
    }

    if (body.alcanzada !== undefined) result.alcanzada = Boolean(body.alcanzada);
    if (body.fechaAlcanzada !== undefined) result.fechaAlcanzada = body.fechaAlcanzada || null;
    if (body.activa !== undefined) result.activa = Boolean(body.activa);
    if (body.reclamadaEn !== undefined) result.reclamadaEn = body.reclamadaEn || null;

    return result;
}