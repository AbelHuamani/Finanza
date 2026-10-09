BEGIN;

-- ============================================================
-- 1. TABLAS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias (
    id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre    text NOT NULL UNIQUE,
    creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subcategorias (
    id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id integer NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    nombre       text NOT NULL,
    creado_en    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (categoria_id, nombre)
);

CREATE TABLE IF NOT EXISTS metodos_pago (
    id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre    text NOT NULL UNIQUE,
    creado_en timestamptz NOT NULL DEFAULT now()
);

-- metas_ahorro debe crearse antes que movimientos
CREATE TABLE IF NOT EXISTS metas_ahorro (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          text NOT NULL,
    monto_objetivo  numeric(12,2) NOT NULL
        CONSTRAINT metas_ahorro_monto_objetivo_check CHECK (monto_objetivo > 0),

    -- Columna antigua, conservada temporalmente
    categoria       text,

    categoria_id    integer
        CONSTRAINT metas_ahorro_categoria_id_fkey
        REFERENCES categorias(id) ON DELETE SET NULL,

    descripcion     text NOT NULL DEFAULT '',

    prioridad       text NOT NULL DEFAULT 'MEDIA'
        CONSTRAINT metas_ahorro_prioridad_check
        CHECK (prioridad IN ('URGENTE', 'MEDIA', 'BAJA')),

    estado          text NOT NULL DEFAULT 'ACTIVA'
        CONSTRAINT metas_ahorro_estado_check
        CHECK (estado IN ('ACTIVA', 'ALCANZADA', 'RECLAMADA', 'ELIMINADA')),

    activa          boolean NOT NULL DEFAULT true,
    alcanzada       boolean NOT NULL DEFAULT false,
    fecha_alcanzada date,
    reclamada_en    timestamptz,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo             text NOT NULL CHECK (tipo IN ('INGRESO', 'GASTO')),
    fecha            date NOT NULL,
    monto            numeric(12,2) NOT NULL CHECK (monto > 0),
    categoria_id     integer REFERENCES categorias(id) ON DELETE RESTRICT,
    subcategoria_id  integer REFERENCES subcategorias(id) ON DELETE SET NULL,
    descripcion      text NOT NULL DEFAULT '',
    metodo_pago      integer REFERENCES metodos_pago(id) ON DELETE RESTRICT,
    nota             text NOT NULL DEFAULT '',
    meta_id          integer
        CONSTRAINT movimientos_meta_id_fkey
        REFERENCES metas_ahorro(id) ON DELETE SET NULL,
    creado_en        timestamptz NOT NULL DEFAULT now(),
    actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notificaciones_meta (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    meta_id     integer NOT NULL
        REFERENCES metas_ahorro(id) ON DELETE CASCADE,
    mensaje     text NOT NULL,
    tipo        text NOT NULL DEFAULT 'META_ALCANZADA'
        CONSTRAINT notificaciones_meta_tipo_check
        CHECK (
            tipo IN (
                'META_ALCANZADA',
                'OPORTUNIDAD_DISPONIBLE',
                'PROGRESO_PARCIAL',
                'META_RECLAMADA'
            )
        ),
    leida       boolean NOT NULL DEFAULT false,
    creado_en   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT notificaciones_meta_meta_id_tipo_unique
        UNIQUE (meta_id, tipo)
);

-- ============================================================
-- 2. COMPLETAR COLUMNAS EN BASES EXISTENTES
-- ============================================================

ALTER TABLE metas_ahorro
    ADD COLUMN IF NOT EXISTS categoria text,
    ADD COLUMN IF NOT EXISTS categoria_id integer,
    ADD COLUMN IF NOT EXISTS prioridad text DEFAULT 'MEDIA',
    ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ACTIVA',
    ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS alcanzada boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS fecha_alcanzada date,
    ADD COLUMN IF NOT EXISTS reclamada_en timestamptz,
    ADD COLUMN IF NOT EXISTS creado_en timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS actualizado_en timestamptz DEFAULT now();

ALTER TABLE movimientos
    ADD COLUMN IF NOT EXISTS meta_id integer,
    ADD COLUMN IF NOT EXISTS creado_en timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS actualizado_en timestamptz DEFAULT now();

ALTER TABLE notificaciones_meta
    ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'META_ALCANZADA';

-- ============================================================
-- 3. MIGRAR DATOS EXISTENTES
-- ============================================================

UPDATE metas_ahorro
SET prioridad = 'MEDIA'
WHERE prioridad IS NULL
   OR prioridad NOT IN ('URGENTE', 'MEDIA', 'BAJA');

UPDATE metas_ahorro
SET estado = CASE
    WHEN estado = 'RECLAMADA' THEN 'RECLAMADA'
    WHEN COALESCE(activa, false) = false THEN 'ELIMINADA'
    WHEN COALESCE(alcanzada, false) = true THEN 'ALCANZADA'
    ELSE 'ACTIVA'
END;

UPDATE metas_ahorro m
SET categoria_id = c.id
FROM categorias c
WHERE m.categoria_id IS NULL
  AND NULLIF(BTRIM(m.categoria), '') IS NOT NULL
  AND LOWER(BTRIM(c.nombre)) = LOWER(BTRIM(m.categoria));

UPDATE notificaciones_meta
SET tipo = 'META_ALCANZADA'
WHERE tipo IS NULL
   OR BTRIM(tipo) = ''
   OR tipo NOT IN (
       'META_ALCANZADA',
       'OPORTUNIDAD_DISPONIBLE',
       'PROGRESO_PARCIAL',
       'META_RECLAMADA'
   );

-- ============================================================
-- 4. ASEGURAR RESTRICCIONES
-- ============================================================

ALTER TABLE metas_ahorro
    ALTER COLUMN prioridad SET DEFAULT 'MEDIA',
    ALTER COLUMN prioridad SET NOT NULL,
    ALTER COLUMN estado SET DEFAULT 'ACTIVA',
    ALTER COLUMN estado SET NOT NULL;

ALTER TABLE notificaciones_meta
    ALTER COLUMN tipo SET DEFAULT 'META_ALCANZADA',
    ALTER COLUMN tipo SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'metas_ahorro'::regclass
          AND conname = 'metas_ahorro_categoria_id_fkey'
    ) THEN
        ALTER TABLE metas_ahorro
        ADD CONSTRAINT metas_ahorro_categoria_id_fkey
        FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'movimientos'::regclass
          AND conname = 'movimientos_meta_id_fkey'
    ) THEN
        ALTER TABLE movimientos
        ADD CONSTRAINT movimientos_meta_id_fkey
        FOREIGN KEY (meta_id)
        REFERENCES metas_ahorro(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'metas_ahorro'::regclass
          AND conname = 'metas_ahorro_prioridad_check'
    ) THEN
        ALTER TABLE metas_ahorro
        ADD CONSTRAINT metas_ahorro_prioridad_check
        CHECK (prioridad IN ('URGENTE', 'MEDIA', 'BAJA'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'metas_ahorro'::regclass
          AND conname = 'metas_ahorro_estado_check'
    ) THEN
        ALTER TABLE metas_ahorro
        ADD CONSTRAINT metas_ahorro_estado_check
        CHECK (estado IN ('ACTIVA', 'ALCANZADA', 'RECLAMADA', 'ELIMINADA'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'notificaciones_meta'::regclass
          AND conname = 'notificaciones_meta_tipo_check'
    ) THEN
        ALTER TABLE notificaciones_meta
        ADD CONSTRAINT notificaciones_meta_tipo_check
        CHECK (
            tipo IN (
                'META_ALCANZADA',
                'OPORTUNIDAD_DISPONIBLE',
                'PROGRESO_PARCIAL',
                'META_RECLAMADA'
            )
        );
    END IF;
END $$;

-- ============================================================
-- 5. REEMPLAZAR UNIQUE(meta_id) POR UNIQUE(meta_id, tipo)
-- ============================================================

ALTER TABLE notificaciones_meta
DROP CONSTRAINT IF EXISTS notificaciones_meta_meta_id_unique;

DO $$
DECLARE
    restriccion record;
BEGIN
    FOR restriccion IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = c.conkey[1]
        WHERE c.conrelid = 'notificaciones_meta'::regclass
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND a.attname = 'meta_id'
    LOOP
        EXECUTE format(
            'ALTER TABLE notificaciones_meta DROP CONSTRAINT %I',
            restriccion.conname
        );
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'notificaciones_meta'::regclass
          AND conname = 'notificaciones_meta_meta_id_tipo_unique'
    ) THEN
        ALTER TABLE notificaciones_meta
        ADD CONSTRAINT notificaciones_meta_meta_id_tipo_unique
        UNIQUE (meta_id, tipo);
    END IF;
END $$;

-- ============================================================
-- 6. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS subcategorias_categoria_idx
    ON subcategorias(categoria_id);

CREATE INDEX IF NOT EXISTS movimientos_fecha_idx
    ON movimientos(fecha DESC);

CREATE INDEX IF NOT EXISTS movimientos_tipo_idx
    ON movimientos(tipo);

CREATE INDEX IF NOT EXISTS movimientos_categoria_idx
    ON movimientos(categoria_id);

CREATE INDEX IF NOT EXISTS movimientos_metodo_idx
    ON movimientos(metodo_pago);

CREATE INDEX IF NOT EXISTS movimientos_meta_idx
    ON movimientos(meta_id);

CREATE INDEX IF NOT EXISTS metas_ahorro_activa_idx
    ON metas_ahorro(activa);

CREATE INDEX IF NOT EXISTS metas_ahorro_alcanzada_idx
    ON metas_ahorro(alcanzada);

CREATE INDEX IF NOT EXISTS metas_ahorro_categoria_idx
    ON metas_ahorro(categoria_id);

CREATE INDEX IF NOT EXISTS metas_ahorro_prioridad_idx
    ON metas_ahorro(prioridad);

CREATE INDEX IF NOT EXISTS metas_ahorro_estado_idx
    ON metas_ahorro(estado);

CREATE INDEX IF NOT EXISTS notificaciones_meta_leida_idx
    ON notificaciones_meta(leida);

CREATE INDEX IF NOT EXISTS notificaciones_meta_tipo_idx
    ON notificaciones_meta(tipo);

-- ============================================================
-- 7. FUNCIÓN Y TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION fijar_actualizado_en()
RETURNS trigger AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'movimientos'::regclass
          AND tgname = 'movimientos_actualizado_en'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER movimientos_actualizado_en
        BEFORE UPDATE ON movimientos
        FOR EACH ROW
        EXECUTE FUNCTION fijar_actualizado_en();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'metas_ahorro'::regclass
          AND tgname = 'metas_ahorro_actualizado_en'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER metas_ahorro_actualizado_en
        BEFORE UPDATE ON metas_ahorro
        FOR EACH ROW
        EXECUTE FUNCTION fijar_actualizado_en();
    END IF;
END $$;

-- ============================================================
-- 8. DATOS INICIALES
-- ============================================================

INSERT INTO metodos_pago(nombre)
SELECT datos.nombre
FROM (
    VALUES ('Efectivo'), ('Yape')
) AS datos(nombre)
WHERE NOT EXISTS (
    SELECT 1
    FROM metodos_pago mp
    WHERE mp.nombre = datos.nombre
);

COMMIT;

select * from categorias;