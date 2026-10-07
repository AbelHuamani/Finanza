import { query, withTransaction } from "./db.js";

/**
 * Capa de acceso a datos (PostgreSQL).
 * Mapea filas snake_case -> objetos camelCase idénticos a los del frontend
 * para que ApiDataService pueda entregarlos sin transformación.
 */

const MOVEMENT_COLUMNS =
    "id, type, to_char(date, 'YYYY-MM-DD') AS date, amount, category_id, subcategory_id, description, payment_method, note, created_at, updated_at";

const rowToMovement = (row) => ({
    id: row.id,
    type: row.type,
    date: row.date,
    amount: Number(row.amount),
    categoryId: row.category_id ?? null,
    subcategoryId: row.subcategory_id ?? null,
    description: row.description ?? "",
    paymentMethod: row.payment_method ?? null,
    note: row.note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const rowToCategory = (row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    active: row.active,
    createdAt: row.created_at,
});

const rowToSubcategory = (row) => ({
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    active: row.active,
});

const rowToPaymentMethod = (row) => ({
    id: row.id,
    name: row.name,
    active: row.active,
});

/* ---------------------------- Movimientos ---------------------------- */

export async function getMovements() {
    const { rows } = await query(`SELECT ${MOVEMENT_COLUMNS} FROM movements ORDER BY date DESC, created_at DESC`);
    return rows.map(rowToMovement);
}

export async function createMovement(input, conn = pool) {
    const params = [
        input.type,
        input.date,
        Number(input.amount),
        input.categoryId ?? null,
        input.subcategoryId ?? null,
        input.description ?? "",
        input.paymentMethod ?? null,
        input.note ?? "",
    ];
    const { rows } = await conn.query(
        `INSERT INTO movements
            (id, type, date, amount, category_id, subcategory_id, description, payment_method, note)
         VALUES (next_movement_id(), $1, $2, $3, $4, $5, $6, $7, $8)
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
        `UPDATE movements
         SET type = $2, date = $3, amount = $4, category_id = $5,
             subcategory_id = $6, description = $7, payment_method = $8, note = $9
         WHERE id = $1
         RETURNING ${MOVEMENT_COLUMNS}`,
        [
            id,
            changes.type,
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
    const { rows } = await conn.query("DELETE FROM movements WHERE id = $1 RETURNING id", [id]);
    if (!rows[0]) {
        const error = new Error(`Movimiento no encontrado: ${id}`);
        error.status = 404;
        throw error;
    }
    return { id: rows[0].id };
}

/* ---------------------------- Categorías ---------------------------- */

export async function getCategories() {
    const { rows } = await query("SELECT id, name, type, active, created_at FROM categories ORDER BY name");
    return rows.map(rowToCategory);
}

export async function createCategory({ name, type = "EXPENSE", active = true }) {
    const { rows } = await query(
        "INSERT INTO categories (id, name, type, active) VALUES (next_category_id(), $1, $2, $3) RETURNING id, name, type, active, created_at",
        [name, type, active],
    );
    return rowToCategory(rows[0]);
}

/* ---------------------------- Subcategorías ---------------------------- */

export async function getSubcategories(categoryId = null) {
    const where = categoryId ? "WHERE category_id = $1" : "";
    const params = categoryId ? [categoryId] : [];
    const { rows } = await query(
        `SELECT id, category_id, name, active, created_at FROM subcategories ${where} ORDER BY name`,
        params,
    );
    return rows.map(rowToSubcategory);
}

export async function createSubcategory({ categoryId, name, active = true }) {
    const { rows } = await query(
        "INSERT INTO subcategories (id, category_id, name, active) VALUES (next_subcategory_id(), $1, $2, $3) RETURNING id, category_id, name, active, created_at",
        [categoryId, name, active],
    );
    return rowToSubcategory(rows[0]);
}

/* ---------------------------- Métodos de pago ---------------------------- */

export async function getPaymentMethods() {
    const { rows } = await query("SELECT id, name, active, created_at FROM payment_methods ORDER BY name");
    return rows.map(rowToPaymentMethod);
}

export async function createPaymentMethod({ name, active = true }) {
    const { rows } = await query(
        "INSERT INTO payment_methods (id, name, active) VALUES (next_payment_method_id(), $1, $2) RETURNING id, name, active, created_at",
        [name, active],
    );
    return rowToPaymentMethod(rows[0]);
}