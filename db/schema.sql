-- ============================================================
--  Finanza · Esquema PostgreSQL
--  Ejecutar:  psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS movements CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id          text PRIMARY KEY,
    name        text NOT NULL UNIQUE,
    type        text NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('INCOME', 'EXPENSE')),
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subcategories (
    id          text PRIMARY KEY,
    category_id text NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    name        text NOT NULL,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (category_id, name)
);

CREATE TABLE payment_methods (
    id          text PRIMARY KEY,
    name        text NOT NULL UNIQUE,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movements (
    id             text PRIMARY KEY,
    type           text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    date           date NOT NULL,
    amount         numeric(12, 2) NOT NULL CHECK (amount > 0),
    category_id    text REFERENCES categories (id) ON DELETE RESTRICT,
    subcategory_id text REFERENCES subcategories (id) ON DELETE SET NULL,
    description    text NOT NULL DEFAULT '',
    payment_method text REFERENCES payment_methods (id) ON DELETE RESTRICT,
    note           text NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    -- Un ingreso no tiene categoría, subcategoría ni método de pago.
    CONSTRAINT movements_income_shape CHECK (
        type = 'EXPENSE'
        OR (category_id IS NULL AND subcategory_id IS NULL AND payment_method IS NULL)
    ),
    -- Un gasto siempre tiene categoría y método de pago.
    CONSTRAINT movements_expense_shape CHECK (
        type = 'INCOME'
        OR (category_id IS NOT NULL AND payment_method IS NOT NULL)
    )
);

CREATE INDEX movements_date_idx ON movements (date DESC);
CREATE INDEX movements_type_idx ON movements (type);
CREATE INDEX movements_category_idx ON movements (category_id);
CREATE INDEX movements_payment_idx ON movements (payment_method);
CREATE INDEX subcategories_category_idx ON subcategories (category_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movements_updated_at
    BEFORE UPDATE ON movements
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
--  Generadores de id con el mismo formato que el frontend
--  (mov-145, cat-013, sub-016, pm-003).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_id(prefix text, source text) RETURNS text AS $$
DECLARE
    max_num integer;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(MAX((substring(id FROM %L))::int) FILTER (WHERE id ~ %L), 0) FROM %I',
        '^' || prefix || '-([0-9]+)$',
        '^' || prefix || '-[0-9]+$',
        source
    ) INTO max_num;
    RETURN prefix || '-' || lpad((max_num + 1)::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_movement_id() RETURNS text AS $$ SELECT next_id('mov', 'movements'); $$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION next_category_id() RETURNS text AS $$ SELECT next_id('cat', 'categories'); $$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION next_subcategory_id() RETURNS text AS $$ SELECT next_id('sub', 'subcategories'); $$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION next_payment_method_id() RETURNS text AS $$ SELECT next_id('pm', 'payment_methods'); $$ LANGUAGE sql;

COMMIT;
