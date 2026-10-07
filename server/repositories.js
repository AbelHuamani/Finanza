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
    ];
    const { rows } = await conn.query(
        `INSERT INTO movimientos
            (tipo, fecha, monto, categoria_id, subcategoria_id, descripcion, metodo_pago, nota)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
             subcategoria_id = $6, descripcion = $7, metodo_pago = $8, nota = $9
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
