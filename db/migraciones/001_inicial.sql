-- Esquema inicial de Azenza IA. Corre una sola vez (ver scripts/migraciones.mjs).
-- Las fechas van en timestamptz (UTC); el "día" del Consultor se calcula en hora argentina.

-- ─── Cuentas ────────────────────────────────────────────────────────

CREATE TABLE usuarios (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        varchar(80)  NOT NULL,
    -- Siempre en minúsculas: es el identificador para entrar.
    email         varchar(160) NOT NULL UNIQUE,
    -- scrypt$N$r$p$sal$hash (ver servidor/seguridad.js). Nunca sale del servidor.
    password_hash text         NOT NULL,
    -- Cuándo aceptó la política de privacidad (Ley 25.326).
    acepto_privacidad_at timestamptz NOT NULL,
    creado_at     timestamptz  NOT NULL DEFAULT now()
);

-- Una fila por sesión abierta. Del token solo se guarda su SHA-256: si alguien lee
-- la base, no puede usar las sesiones.
CREATE TABLE sesiones (
    token_hash char(64)    PRIMARY KEY,
    usuario_id uuid        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    creada_at  timestamptz NOT NULL DEFAULT now(),
    vence_at   timestamptz NOT NULL
);

CREATE INDEX sesiones_usuario_idx ON sesiones (usuario_id);
CREATE INDEX sesiones_vence_idx ON sesiones (vence_at);

-- Intentos fallidos de entrar y registros por IP, para limitarlos. En la base y no en
-- memoria: en serverless cada invocación puede ser una instancia nueva.
-- clave: SHA-256 del email o de la IP (no se guardan en claro).
CREATE TABLE intentos (
    id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo      varchar(20) NOT NULL,
    clave     char(64)    NOT NULL,
    creado_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX intentos_busqueda_idx ON intentos (tipo, clave, creado_at);

-- ─── Punto de partida ───────────────────────────────────────────────

-- Cada vez que hace el cuestionario. Re-medir = una medición nueva, nunca editar una
-- completada. La que tiene completada_at NULL es el borrador (como mucho una por usuario).
-- respuestas: { concepto: { opcion, nivel, texto, secundarios } }, validadas en el
-- servidor contra src/data/conceptos.js. El nivel solo define profundidades: nunca
-- se le muestra al usuario.
CREATE TABLE mediciones (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    uuid        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    version       smallint    NOT NULL,
    respuestas    jsonb       NOT NULL DEFAULT '{}'::jsonb,
    creada_at     timestamptz NOT NULL DEFAULT now(),
    completada_at timestamptz
);

CREATE INDEX mediciones_usuario_idx ON mediciones (usuario_id, completada_at);
CREATE UNIQUE INDEX mediciones_un_borrador_idx ON mediciones (usuario_id) WHERE completada_at IS NULL;

-- ─── Módulos de la ruta ─────────────────────────────────────────────

-- Lo construido en cada módulo y, si lo dejó a medias, dónde quedó.
-- valores: lo que escribió, campo por campo. filas: la tarjeta de Tu negocio
-- ([{ etiqueta, texto, clave? }]); el Consultor IA lee de acá.
-- pausa: { paso, profundidad, valores } o NULL.
CREATE TABLE modulos_usuario (
    usuario_id     uuid        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    modulo         varchar(30) NOT NULL,
    valores        jsonb,
    filas          jsonb,
    guardado_at    timestamptz,
    pausa          jsonb,
    actualizado_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, modulo)
);

-- ─── Consultor IA ───────────────────────────────────────────────────

-- Una fila por consulta, para los dos topes diarios (por usuario y global). No guarda
-- ni la pregunta ni la respuesta. Se reserva antes de llamar a la IA y se borra si
-- falla. Al borrar una cuenta queda sin usuario: sigue contando para el tope global.
CREATE TABLE consultas_ia (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id uuid        REFERENCES usuarios (id) ON DELETE SET NULL,
    tipo       varchar(20) NOT NULL,
    modulo     varchar(30),
    creada_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consultas_ia_creada_idx ON consultas_ia (creada_at);
CREATE INDEX consultas_ia_usuario_idx ON consultas_ia (usuario_id, creada_at);
