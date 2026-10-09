import { query, withTransaction, pool } from "./db.js";

/**
 * Capa de acceso a datos (PostgreSQL).
 * La base de datos está 100% en español (tablas, columnas y valores
 * 'INGRESO'/'GASTO'); aquí se traduce al contrato en inglés/camelCase
 * que espera el frontend, para que ApiDataService pueda entregar los
 * datos sin transformación.
 */

const toDbTipo = (type) => (type === "INCOME" ? "INGRESO" : "GASTO");
const fromDbTipo = (tipo) => (tipo === "INGRESO" ? "INCOME" : "EXPENSE");

const MOVEMENT_COLUMNS =
    "id, tipo, to_char(fecha, 'YYYY-MM-DD') AS fecha, monto, categoria_id, subcategoria_id, descripcion, metodo_pago, nota, creado_en, actualizado_en";

const rowToMovement = (row) => ({
    id: row.id,
    type: fromDbTipo(row.tipo),
    date: row.fecha,
    amount: Number(row.monto),
    categoryId: row.categoria_id ?? null,
    subcategoryId: row.subcategoria_id ?? null,
    description: row.descripcion ?? "",
    paymentMethod: row.metodo_pago ?? null,
    note: row.nota ?? "",
    metaId: row.meta_id ? String(row.meta_id) : null,
    createdAt: row.creado_en,
    updatedAt: row.actualizado_en,
});

const rowToCategory = (row) => ({
    id: row.id,
    name: row.nombre,
    createdAt: row.creado_en,
});

const rowToSubcategory = (row) => ({
    id: row.id,
    categoryId: row.categoria_id,
    name: row.nombre,
});

const rowToPaymentMethod = (row) => ({
    id: row.id,
    name: row.nombre,
});

/* ---------------------------- Movimientos ---------------------------- */

export async function getMovements() {
    const { rows } = await query(`SELECT ${MOVEMENT_COLUMNS} FROM movimientos ORDER BY fecha DESC, creado_en DESC`);
    return rows.map(rowToMovement);
}

export async function createMovement(input, conn = pool) {
    const params = [
        toDbTipo(input.type),
        input.date,
        Number(input.amount),
        input.categoryId ?? null,
        input.subcategoryId ?? null,
        input.description ?? "",
        input.paymentMethod ?? null,
        input.note ?? "",
        input.metaId ?? null,
    ];
    const { rows } = await conn.query(
        `INSERT INTO movimientos
            (tipo, fecha, monto, categoria_id, subcategoria_id, descripcion, metodo_pago, nota, meta_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${MOVEMENT_COLUMNS}`,
        params,
    );
    return rowToMovement(rows[0]);
}

export async function createMovements(inputs) {
    return withTransaction(async (client) => {
        const created = [];
        for (const input of inputs) created.push(await createMovement(input, client));
        return created;
    });
}

export async function updateMovement(id, changes, conn = pool) {
    const { rows } = await conn.query(
        `UPDATE movimientos
         SET tipo = $2, fecha = $3, monto = $4, categoria_id = $5,
             subcategoria_id = $6, descripcion = $7, metodo_pago = $8, nota = $9, meta_id = $10
         WHERE id = $1
         RETURNING ${MOVEMENT_COLUMNS}`,
        [
            id,
            toDbTipo(changes.type),
            changes.date,
            Number(changes.amount),
            changes.categoryId ?? null,
            changes.subcategoryId ?? null,
            changes.description ?? "",
            changes.paymentMethod ?? null,
            changes.note ?? "",
            changes.metaId ?? null,
        ],
    );
    if (!rows[0]) {
        const error = new Error(`Movimiento no encontrado: ${id}`);
        error.status = 404;
        throw error;
    }
    return rowToMovement(rows[0]);
}

export async function deleteMovement(id, conn = pool) {
    const { rows } = await conn.query("DELETE FROM movimientos WHERE id = $1 RETURNING id", [id]);
    if (!rows[0]) {
        const error = new Error(`Movimiento no encontrado: ${id}`);
        error.status = 404;
        throw error;
    }
    return { id: rows[0].id };
}

/* ---------------------------- Categorías ---------------------------- */

export async function getCategories() {
    const { rows } = await query("SELECT id, nombre, creado_en FROM categorias ORDER BY nombre");
    return rows.map(rowToCategory);
}

export async function createCategory({ name }) {
    const { rows } = await query(
        "INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre, creado_en",
        [name],
    );
    return rowToCategory(rows[0]);
}

/* ---------------------------- Subcategorías ---------------------------- */

export async function getSubcategories(categoryId = null) {
    const where = categoryId ? "WHERE categoria_id = $1" : "";
    const params = categoryId ? [categoryId] : [];
    const { rows } = await query(
        `SELECT id, categoria_id, nombre, creado_en FROM subcategorias ${where} ORDER BY nombre`,
        params,
    );
    return rows.map(rowToSubcategory);
}

export async function createSubcategory({ categoryId, name }) {
    const { rows } = await query(
        "INSERT INTO subcategorias (categoria_id, nombre) VALUES ($1, $2) RETURNING id, categoria_id, nombre, creado_en",
        [categoryId, name],
    );
    return rowToSubcategory(rows[0]);
}

/* ---------------------------- Métodos de pago ---------------------------- */

export async function getPaymentMethods() {
    const { rows } = await query("SELECT id, nombre, creado_en FROM metodos_pago ORDER BY nombre");
    return rows.map(rowToPaymentMethod);
}

export async function createPaymentMethod({ name }) {
    const { rows } = await query(
        "INSERT INTO metodos_pago (nombre) VALUES ($1) RETURNING id, nombre, creado_en",
        [name],
    );
    return rowToPaymentMethod(rows[0]);
}

/* ---------------------------- Metas de ahorro ---------------------------- */

const rowToMeta = (row) => ({
    id: row.id,
    nombre: row.nombre,
    montoObjetivo: Number(row.monto_objetivo),
    categoriaId: row.categoria_id ? String(row.categoria_id) : null,
    categoria: row.categoria ?? '',
    descripcion: row.descripcion ?? '',
    prioridad: row.prioridad ?? 'MEDIA',
    estado: row.estado ?? 'ACTIVA',
    activa: row.activa,
    alcanzada: row.alcanzada,
    fechaAlcanzada: row.fecha_alcanzada ?? null,
    reclamadaEn: row.reclamada_en ?? null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
});

const META_COLUMNS = 'id, nombre, monto_objetivo, categoria_id, categoria, descripcion, prioridad, estado, activa, alcanzada, fecha_alcanzada, reclamada_en, creado_en, actualizado_en';

export async function getMetas() {
    const { rows } = await query(`SELECT ${META_COLUMNS} FROM metas_ahorro WHERE activa = true ORDER BY creado_en DESC`);
    return rows.map(rowToMeta);
}

export async function createMeta(input) {
    const { rows } = await query(
        `INSERT INTO metas_ahorro (nombre, monto_objetivo, categoria_id, descripcion, prioridad)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${META_COLUMNS}`,
        [input.nombre, input.montoObjetivo, input.categoriaId ?? null, input.descripcion ?? '', input.prioridad ?? 'MEDIA']
    );
    return rowToMeta(rows[0]);
}

export async function updateMeta(id, changes) {
    const fields = [];
    const params = [id];
    let i = 2;
    if (changes.nombre !== undefined) { fields.push(`nombre = $${i++}`); params.push(changes.nombre); }
    if (changes.montoObjetivo !== undefined) { fields.push(`monto_objetivo = $${i++}`); params.push(changes.montoObjetivo); }
    if (changes.categoriaId !== undefined) { fields.push(`categoria_id = $${i++}`); params.push(changes.categoriaId); }
    if (changes.descripcion !== undefined) { fields.push(`descripcion = $${i++}`); params.push(changes.descripcion); }
    if (changes.prioridad !== undefined) { fields.push(`prioridad = $${i++}`); params.push(changes.prioridad); }
    if (changes.estado !== undefined) { fields.push(`estado = $${i++}`); params.push(changes.estado); }
    if (changes.activa !== undefined) { fields.push(`activa = $${i++}`); params.push(changes.activa); }
    if (changes.alcanzada !== undefined) { fields.push(`alcanzada = $${i++}`); params.push(changes.alcanzada); }
    if (changes.fechaAlcanzada !== undefined) { fields.push(`fecha_alcanzada = $${i++}`); params.push(changes.fechaAlcanzada); }
    if (changes.reclamadaEn !== undefined) { fields.push(`reclamada_en = $${i++}`); params.push(changes.reclamadaEn); }
    if (!fields.length) throw new Error('No hay campos para actualizar.');
    const { rows } = await query(
        `UPDATE metas_ahorro SET ${fields.join(', ')} WHERE id = $1 RETURNING ${META_COLUMNS}`,
        params
    );
    if (!rows[0]) { const error = new Error(`Meta no encontrada: ${id}`); error.status = 404; throw error; }
    return rowToMeta(rows[0]);
}

export async function deleteMeta(id) {
    const { rows } = await query('UPDATE metas_ahorro SET activa = false WHERE id = $1 RETURNING id', [id]);
    if (!rows[0]) { const error = new Error(`Meta no encontrada: ${id}`); error.status = 404; throw error; }
    return { id: rows[0].id };
}

/* ------------------------- Notificaciones de metas ------------------------- */

const rowToNotificacion = (row) => ({
    id: row.id,
    metaId: row.meta_id,
    mensaje: row.mensaje,
    tipo: row.tipo ?? 'META_ALCANZADA',
    leida: row.leida,
    creadoEn: row.creado_en,
});

/**
 * Marca una meta como alcanzada e inserta la notificación en una sola transacción.
 * Si la meta ya estaba alcanzada, solo garantiza que exista la notificación.
 * Nunca crea notificaciones duplicadas (UNIQUE meta_id, tipo).
 */
export async function alcanzarMeta(id) {
    return withTransaction(async (client) => {
        // Leer la meta con FOR UPDATE para evitar condición de carrera
        const { rows: metaRows } = await client.query(
            `SELECT ${META_COLUMNS} FROM metas_ahorro WHERE id = $1 AND activa = true FOR UPDATE`,
            [id]
        );
        if (!metaRows[0]) {
            const error = new Error(`Meta no encontrada: ${id}`);
            error.status = 404;
            throw error;
        }
        const meta = rowToMeta(metaRows[0]);

        // Actualizar solo si aún no estaba alcanzada
        if (!meta.alcanzada) {
            await client.query(
                `UPDATE metas_ahorro SET alcanzada = true, fecha_alcanzada = CURRENT_DATE WHERE id = $1`,
                [id]
            );
            meta.alcanzada = true;
            meta.fechaAlcanzada = new Date().toISOString().slice(0, 10);
        }

        // Insertar notificación (ON CONFLICT: si ya existe, no hacer nada)
        const mensaje = `¡Meta alcanzada! Has cumplido la meta: "${meta.nombre}".`;
        await client.query(
            `INSERT INTO notificaciones_meta (meta_id, mensaje, tipo)
             VALUES ($1, $2, 'META_ALCANZADA')
             ON CONFLICT ON CONSTRAINT notificaciones_meta_meta_id_tipo_unique DO NOTHING`,
            [id, mensaje]
        );

        // Devolver la notificación (nueva o existente)
        const { rows: notifRows } = await client.query(
            `SELECT id, meta_id, mensaje, tipo, leida, creado_en
             FROM notificaciones_meta WHERE meta_id = $1 AND tipo = 'META_ALCANZADA'`,
            [id]
        );

        return {
            meta,
            notificacion: notifRows[0] ? rowToNotificacion(notifRows[0]) : null,
        };
    });
}

/**
 * Reclama una meta: crea un movimiento de gasto asociado y actualiza el estado de la meta.
 * Operación idempotente dentro de una transacción.
 */
export async function reclamarMeta(id, movementInput) {
    return withTransaction(async (client) => {
        // Leer la meta con FOR UPDATE
        const { rows: metaRows } = await client.query(
            `SELECT ${META_COLUMNS} FROM metas_ahorro WHERE id = $1 FOR UPDATE`,
            [id]
        );
        if (!metaRows[0]) {
            const error = new Error(`Meta no encontrada: ${id}`);
            error.status = 404;
            throw error;
        }
        const meta = rowToMeta(metaRows[0]);

        // Verificar que la meta esté activa
        if (!meta.activa) {
            const error = new Error(`La meta ya no está activa: ${meta.estado}`);
            error.status = 400;
            throw error;
        }

        // Crear el movimiento con meta_id
        const params = [
            toDbTipo(movementInput.type),
            movementInput.date,
            Number(movementInput.amount),
            movementInput.categoryId ?? null,
            movementInput.subcategoryId ?? null,
            movementInput.description ?? "",
            movementInput.paymentMethod ?? null,
            movementInput.note ?? "",
            id,
        ];
        const { rows: movementRows } = await client.query(
            `INSERT INTO movimientos
                (tipo, fecha, monto, categoria_id, subcategoria_id, descripcion, metodo_pago, nota, meta_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING ${MOVEMENT_COLUMNS}`,
            params
        );
        const movement = rowToMovement(movementRows[0]);

        // Calcular si el gasto cubre el monto total de la meta
        const gastoTotal = Number(movementInput.amount);
        const metaCompletada = gastoTotal >= meta.montoObjetivo;

        // Actualizar la meta
        const updateFields = ['estado = $2', 'reclamada_en = $3'];
        const updateParams = [id, 'RECLAMADA', new Date().toISOString()];
        let paramIndex = 4;

        if (metaCompletada) {
            updateFields.push(`activa = $${paramIndex++}`);
            updateParams.push(false);
        } else {
            updateFields.push(`estado = $${paramIndex++}`);
            updateParams.splice(1, 1, 'ACTIVA'); // Mantener ACTIVA si es parcial
        }

        await client.query(
            `UPDATE metas_ahorro SET ${updateFields.join(', ')} WHERE id = $1`,
            updateParams
        );

        // Crear notificación
        const tipo = metaCompletada ? 'META_RECLAMADA' : 'PROGRESO_PARCIAL';
        const mensaje = metaCompletada
            ? `Has reclamado la meta: "${meta.nombre}".`
            : `Has registrado un gasto parcial para "${meta.nombre}". Faltan S/ ${(meta.montoObjetivo - gastoTotal).toFixed(2)}.`;

        await client.query(
            `INSERT INTO notificaciones_meta (meta_id, mensaje, tipo)
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT notificaciones_meta_meta_id_tipo_unique DO UPDATE
             SET mensaje = EXCLUDED.mensaje, creado_en = NOW()`,
            [id, mensaje, tipo]
        );

        // Devolver notificación
        const { rows: notifRows } = await client.query(
            `SELECT id, meta_id, mensaje, tipo, leida, creado_en
             FROM notificaciones_meta WHERE meta_id = $1 AND tipo = $2`,
            [id, tipo]
        );

        // Leer meta actualizada
        const { rows: updatedMetaRows } = await client.query(
            `SELECT ${META_COLUMNS} FROM metas_ahorro WHERE id = $1`,
            [id]
        );

        return {
            movement,
            meta: rowToMeta(updatedMetaRows[0]),
            notificacion: notifRows[0] ? rowToNotificacion(notifRows[0]) : null,
        };
    });
}

export async function getNotificaciones() {
    const { rows } = await query(
        'SELECT id, meta_id, mensaje, tipo, leida, creado_en FROM notificaciones_meta ORDER BY creado_en DESC'
    );
    return rows.map(rowToNotificacion);
}

export async function createNotificacion({ metaId, mensaje, tipo = 'META_ALCANZADA' }) {
    const { rows } = await query(
        `INSERT INTO notificaciones_meta (meta_id, mensaje, tipo)
         VALUES ($1, $2, $3)
         ON CONFLICT ON CONSTRAINT notificaciones_meta_meta_id_tipo_unique DO NOTHING
         RETURNING id, meta_id, mensaje, tipo, leida, creado_en`,
        [metaId, mensaje, tipo]
    );
    // Si el ON CONFLICT silenció la inserción, devolver la fila existente
    if (!rows[0]) {
        const existing = await query(
            'SELECT id, meta_id, mensaje, tipo, leida, creado_en FROM notificaciones_meta WHERE meta_id = $1 AND tipo = $2',
            [metaId, tipo]
        );
        return rowToNotificacion(existing.rows[0]);
    }
    return rowToNotificacion(rows[0]);
}

export async function markNotificacionesLeidas() {
    await query('UPDATE notificaciones_meta SET leida = true WHERE leida = false');
    return { ok: true };
}
