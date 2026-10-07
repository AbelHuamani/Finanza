-- ============================================================
--  Finanza · Consultas en español usadas por server/repositories.js
--  Referencia/documentación: no se ejecuta de forma autónoma.
--  El esquema y los datos se crean con db/schema.sql.
-- ============================================================

-- ------------------------ Movimientos ------------------------

-- nombre: listarMovimientos
SELECT id, tipo, to_char(fecha, 'YYYY-MM-DD') AS fecha, monto,
       categoria_id, subcategoria_id, descripcion, metodo_pago, nota,
       creado_en, actualizado_en
FROM movimientos
ORDER BY fecha DESC, creado_en DESC;

-- nombre: obtenerMovimiento
SELECT id, tipo, to_char(fecha, 'YYYY-MM-DD') AS fecha, monto,
       categoria_id, subcategoria_id, descripcion, metodo_pago, nota,
       creado_en, actualizado_en
FROM movimientos
WHERE id = $1;

-- nombre: insertarMovimiento
INSERT INTO movimientos
    (tipo, fecha, monto, categoria_id, subcategoria_id, descripcion, metodo_pago, nota)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, tipo, to_char(fecha, 'YYYY-MM-DD') AS fecha, monto,
          categoria_id, subcategoria_id, descripcion, metodo_pago, nota,
          creado_en, actualizado_en;

-- nombre: insertarMovimientosMasivo
-- Implementación: un insertarMovimiento por fila, dentro de una transacción.

-- nombre: actualizarMovimiento
UPDATE movimientos
SET tipo = $2,
    fecha = $3,
    monto = $4,
    categoria_id = $5,
    subcategoria_id = $6,
    descripcion = $7,
    metodo_pago = $8,
    nota = $9
WHERE id = $1
RETURNING id, tipo, to_char(fecha, 'YYYY-MM-DD') AS fecha, monto,
          categoria_id, subcategoria_id, descripcion, metodo_pago, nota,
          creado_en, actualizado_en;

-- nombre: eliminarMovimiento
DELETE FROM movimientos WHERE id = $1 RETURNING id;

-- ------------------------ Categorías ------------------------

-- nombre: listarCategorias
SELECT id, nombre, creado_en FROM categorias ORDER BY nombre;

-- nombre: insertarCategoria
INSERT INTO categorias (nombre)
VALUES ($1)
RETURNING id, nombre, creado_en;

-- ------------------------ Subcategorías ------------------------

-- nombre: listarSubcategorias
SELECT id, categoria_id, nombre, creado_en FROM subcategorias ORDER BY nombre;

-- nombre: listarSubcategoriasPorCategoria
SELECT id, categoria_id, nombre, creado_en
FROM subcategorias
WHERE categoria_id = $1
ORDER BY nombre;

-- nombre: insertarSubcategoria
INSERT INTO subcategorias (categoria_id, nombre)
VALUES ($1, $2)
RETURNING id, categoria_id, nombre, creado_en;

-- ------------------------ Métodos de pago ------------------------

-- nombre: listarMetodosPago
SELECT id, nombre, creado_en FROM metodos_pago ORDER BY nombre;

-- nombre: insertarMetodoPago
INSERT INTO metodos_pago (nombre)
VALUES ($1)
RETURNING id, nombre, creado_en;
