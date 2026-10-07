-- ============================================================
--  Finanza · Consultas parametrizadas usadas por server/repositories.js
--  Referencia/documentación: no se ejecuta de forma autónoma.
-- ============================================================

-- ------------------------ Movimientos ------------------------

-- name: listMovements
SELECT id, type, to_char(date, 'YYYY-MM-DD') AS date, amount,
       category_id, subcategory_id, description, payment_method, note,
       created_at, updated_at
FROM movements
ORDER BY date DESC, created_at DESC;

-- name: getMovement
SELECT id, type, to_char(date, 'YYYY-MM-DD') AS date, amount,
       category_id, subcategory_id, description, payment_method, note,
       created_at, updated_at
FROM movements
WHERE id = $1;

-- name: insertMovement
INSERT INTO movements
    (id, type, date, amount, category_id, subcategory_id, description, payment_method, note)
VALUES
    (next_movement_id(), $1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, type, to_char(date, 'YYYY-MM-DD') AS date, amount,
          category_id, subcategory_id, description, payment_method, note,
          created_at, updated_at;

-- name: bulkInsertMovements
-- Implementación: un insertMovement por fila, dentro de una transacción.
-- (generar ids con generate_series repite el mismo id en cada fila, por eso
--  se inserta fila por fila usando next_movement_id()).

-- name: updateMovement
UPDATE movements
SET type = $2,
    date = $3,
    amount = $4,
    category_id = $5,
    subcategory_id = $6,
    description = $7,
    payment_method = $8,
    note = $9
WHERE id = $1
RETURNING id, type, to_char(date, 'YYYY-MM-DD') AS date, amount,
          category_id, subcategory_id, description, payment_method, note,
          created_at, updated_at;

-- name: deleteMovement
DELETE FROM movements WHERE id = $1 RETURNING id;

-- ------------------------ Categorías ------------------------

-- name: listCategories
SELECT id, name, type, active, created_at FROM categories ORDER BY name;

-- name: insertCategory
INSERT INTO categories (id, name, type, active)
VALUES (next_category_id(), $1, COALESCE($2, 'EXPENSE'), COALESCE($3, true))
RETURNING id, name, type, active, created_at;

-- ------------------------ Subcategorías ------------------------

-- name: listSubcategories
SELECT id, category_id, name, active, created_at FROM subcategories ORDER BY name;

-- name: listSubcategoriesByCategory
SELECT id, category_id, name, active, created_at
FROM subcategories
WHERE category_id = $1
ORDER BY name;

-- name: insertSubcategory
INSERT INTO subcategories (id, category_id, name, active)
VALUES (next_subcategory_id(), $1, $2, COALESCE($3, true))
RETURNING id, category_id, name, active, created_at;

-- ------------------------ Métodos de pago ------------------------

-- name: listPaymentMethods
SELECT id, name, active, created_at FROM payment_methods ORDER BY name;

-- name: insertPaymentMethod
INSERT INTO payment_methods (id, name, active)
VALUES (next_payment_method_id(), $1, COALESCE($2, true))
RETURNING id, name, active, created_at;
