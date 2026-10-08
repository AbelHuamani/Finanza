DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS subcategorias CASCADE;
DROP TABLE IF EXISTS metodos_pago CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS notificaciones_meta CASCADE;
DROP TABLE IF EXISTS metas_ahorro CASCADE;

-- ------------------------------------------------------------
--  Tablas (id entero autoincremental)
-- ------------------------------------------------------------

CREATE TABLE categorias (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre     text NOT NULL UNIQUE,
    creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subcategorias (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id  integer NOT NULL REFERENCES categorias (id) ON DELETE CASCADE,
    nombre        text NOT NULL,
    creado_en     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (categoria_id, nombre)
);

CREATE TABLE metodos_pago (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre     text NOT NULL UNIQUE,
    creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movimientos (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo             text NOT NULL CHECK (tipo IN ('INGRESO', 'GASTO')),
    fecha            date NOT NULL,
    monto            numeric(12, 2) NOT NULL CHECK (monto > 0),
    categoria_id     integer REFERENCES categorias (id) ON DELETE RESTRICT,
    subcategoria_id  integer REFERENCES subcategorias (id) ON DELETE SET NULL,
    descripcion      text NOT NULL DEFAULT '',
    metodo_pago      integer REFERENCES metodos_pago (id) ON DELETE RESTRICT,
    nota             text NOT NULL DEFAULT '',
    creado_en        timestamptz NOT NULL DEFAULT now(),
    actualizado_en   timestamptz NOT NULL DEFAULT now(),
    -- Un ingreso no tiene categoría, subcategoría ni método de pago.
    CONSTRAINT movimientos_forma_ingreso CHECK (
        tipo = 'GASTO'
        OR (categoria_id IS NULL AND subcategoria_id IS NULL AND metodo_pago IS NULL)
    ),
    -- Un gasto siempre tiene categoría y método de pago.
    CONSTRAINT movimientos_forma_gasto CHECK (
        tipo = 'INGRESO'
        OR (categoria_id IS NOT NULL AND metodo_pago IS NOT NULL)
    )
);

CREATE INDEX movimientos_fecha_idx ON movimientos (fecha DESC);
CREATE INDEX movimientos_tipo_idx ON movimientos (tipo);
CREATE INDEX movimientos_categoria_idx ON movimientos (categoria_id);
CREATE INDEX movimientos_metodo_idx ON movimientos (metodo_pago);
CREATE INDEX subcategorias_categoria_idx ON subcategorias (categoria_id);

-- actualizado_en automático
CREATE OR REPLACE FUNCTION fijar_actualizado_en() RETURNS trigger AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movimientos_actualizado_en
    BEFORE UPDATE ON movimientos
    FOR EACH ROW
    EXECUTE FUNCTION fijar_actualizado_en();

INSERT INTO metodos_pago (nombre) 
VALUES 
    ('Efectivo'),
    ('Yape');

-- ------------------------------------------------------------
--  Metas de Ahorro
-- ------------------------------------------------------------

CREATE TABLE metas_ahorro (
    id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre            text NOT NULL,
    monto_objetivo    numeric(12,2) NOT NULL CHECK (monto_objetivo > 0),
    categoria         text NOT NULL DEFAULT '',
    descripcion       text NOT NULL DEFAULT '',
    activa            boolean NOT NULL DEFAULT true,
    alcanzada         boolean NOT NULL DEFAULT false,
    fecha_alcanzada   date,
    creado_en         timestamptz NOT NULL DEFAULT now(),
    actualizado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX metas_ahorro_activa_idx ON metas_ahorro (activa);
CREATE INDEX metas_ahorro_alcanzada_idx ON metas_ahorro (alcanzada);

CREATE TRIGGER metas_ahorro_actualizado_en
    BEFORE UPDATE ON metas_ahorro
    FOR EACH ROW
    EXECUTE FUNCTION fijar_actualizado_en();

-- ------------------------------------------------------------
--  Notificaciones de metas alcanzadas
-- ------------------------------------------------------------

CREATE TABLE notificaciones_meta (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    meta_id     integer NOT NULL REFERENCES metas_ahorro (id) ON DELETE CASCADE,
    mensaje     text NOT NULL,
    leida       boolean NOT NULL DEFAULT false,
    creado_en   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT notificaciones_meta_meta_id_unique UNIQUE (meta_id)
);

CREATE INDEX notificaciones_meta_leida_idx ON notificaciones_meta (leida);

