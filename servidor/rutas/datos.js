// Lo de cada cuenta: punto de partida (y re-mediciones), módulos construidos, pausas,
// y la importación de lo que hizo como invitado.

import { VERSION_CATALOGO } from "../../src/data/conceptos.js";
import { consulta, transaccion, una } from "../db.js";
import { DATOS_INVALIDOS, ErrorHttp, json, leerJson } from "../http.js";
import {
    fechaDelNavegador,
    limpiarFilas,
    limpiarPausa,
    limpiarRespuestas,
    limpiarValores,
    moduloValido,
    respondioTodo,
} from "../validar.js";

// Re-medirse tiene sentido cada tanto: con esto alcanza y sobra.
const MAX_MEDICIONES = 50;
const MAX_IMPORTAR = 1024 * 1024;

const medicionPublica = (fila) => ({
    id: fila.id,
    version: fila.version,
    creadaAt: fila.creada_at,
    completadaAt: fila.completada_at,
    respuestas: fila.respuestas,
});

const COLUMNAS_MEDICION = "id, version, creada_at, completada_at, respuestas";

/** Todo lo de la cuenta, en un solo pedido. */
export async function datos(req, { usuario }) {
    const [mediciones, modulos] = await transaccion([
        [`SELECT ${COLUMNAS_MEDICION} FROM mediciones WHERE usuario_id = $1 ORDER BY creada_at`, [usuario.id]],
        ["SELECT modulo, valores, filas, guardado_at, pausa FROM modulos_usuario WHERE usuario_id = $1", [usuario.id]],
    ]);

    const construidos = {};
    const pausados = {};
    for (const fila of modulos) {
        if (fila.guardado_at) construidos[fila.modulo] = { valores: fila.valores, filas: fila.filas, guardadoAt: fila.guardado_at };
        if (fila.pausa) pausados[fila.modulo] = fila.pausa;
    }

    return json(200, {
        completadas: mediciones.filter((m) => m.completada_at).map(medicionPublica),
        abierta: mediciones.filter((m) => !m.completada_at).map(medicionPublica)[0] ?? null,
        construidos,
        pausados,
    });
}

// ─── Punto de partida ───────────────────────────────────────────────

/** Guarda lo respondido hasta ahora (reemplaza el borrador, o lo crea). */
export async function guardarBorrador(req, { usuario }) {
    const { respuestas } = await leerJson(req);
    const limpias = limpiarRespuestas(respuestas);
    if (!limpias) throw new ErrorHttp(400, DATOS_INVALIDOS);

    const { cantidad } = await una(
        "SELECT count(*)::int AS cantidad FROM mediciones WHERE usuario_id = $1 AND completada_at IS NOT NULL",
        [usuario.id]
    );
    if (cantidad >= MAX_MEDICIONES) throw new ErrorHttp(429, "Ya rehiciste tu punto de partida muchas veces.");

    const fila = await una(
        `INSERT INTO mediciones (usuario_id, version, respuestas) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id) WHERE completada_at IS NULL
         DO UPDATE SET respuestas = EXCLUDED.respuestas, version = EXCLUDED.version
         RETURNING ${COLUMNAS_MEDICION}`,
        [usuario.id, VERSION_CATALOGO, JSON.stringify(limpias)]
    );

    return json(200, { medicion: medicionPublica(fila) });
}

/** Cierra el borrador: pasa al historial. Tiene que tener las 8 respuestas. */
export async function completarBorrador(req, { usuario }) {
    const borrador = await una("SELECT respuestas FROM mediciones WHERE usuario_id = $1 AND completada_at IS NULL", [usuario.id]);

    if (!borrador) throw new ErrorHttp(404, "No hay un punto de partida abierto.");
    if (!respondioTodo(borrador.respuestas)) throw new ErrorHttp(400, "Faltan preguntas por responder.");

    const fila = await una(
        `UPDATE mediciones SET completada_at = now()
          WHERE usuario_id = $1 AND completada_at IS NULL
          RETURNING ${COLUMNAS_MEDICION}`,
        [usuario.id]
    );

    return json(200, { medicion: medicionPublica(fila) });
}

// ─── Módulos ────────────────────────────────────────────────────────

const moduloDe = ([id]) => {
    const modulo = moduloValido(id);
    if (!modulo) throw new ErrorHttp(404, "Ese módulo no existe.");
    return modulo;
};

/** Guarda lo construido (al terminar el ejercicio o editar la tarjeta) y saca la pausa. */
export async function guardarModulo(req, { usuario, params }) {
    const modulo = moduloDe(params);
    const cuerpo = await leerJson(req);
    const valores = limpiarValores(cuerpo.valores);
    const filas = limpiarFilas(cuerpo.filas);
    if (!valores || !filas) throw new ErrorHttp(400, DATOS_INVALIDOS);

    const fila = await una(
        `INSERT INTO modulos_usuario (usuario_id, modulo, valores, filas, guardado_at, pausa)
         VALUES ($1, $2, $3, $4, now(), NULL)
         ON CONFLICT (usuario_id, modulo) DO UPDATE
            SET valores = EXCLUDED.valores, filas = EXCLUDED.filas, guardado_at = now(), pausa = NULL, actualizado_at = now()
         RETURNING valores, filas, guardado_at`,
        [usuario.id, modulo.id, JSON.stringify(valores), JSON.stringify(filas)]
    );

    return json(200, { valores: fila.valores, filas: fila.filas, guardadoAt: fila.guardado_at });
}

/** Deja el ejercicio en pausa, sin tocar lo que ya hubiera construido antes. */
export async function pausarModulo(req, { usuario, params }) {
    const modulo = moduloDe(params);
    const pausa = limpiarPausa(await leerJson(req));
    if (!pausa) throw new ErrorHttp(400, DATOS_INVALIDOS);

    await consulta(
        `INSERT INTO modulos_usuario (usuario_id, modulo, pausa) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id, modulo) DO UPDATE SET pausa = EXCLUDED.pausa, actualizado_at = now()`,
        [usuario.id, modulo.id, JSON.stringify(pausa)]
    );

    return json(200, { ok: true });
}

// ─── Lo del invitado ────────────────────────────────────────────────

/**
 * Pasa a la cuenta lo que hizo sin cuenta. Cada parte (punto de partida, módulos) se
 * importa solo si la cuenta no tenía nada de eso: si ya tenía, gana la cuenta.
 * Body: { medicion: { respuestas, completa, fecha } | null, modulos: { construidos, pausados } | null }.
 */
export async function importar(req, { usuario }) {
    const cuerpo = await leerJson(req, { maximo: MAX_IMPORTAR });
    let medicion = null;
    let modulos = [];

    if (cuerpo.medicion) {
        const respuestas = limpiarRespuestas(cuerpo.medicion.respuestas);
        if (!respuestas || Object.keys(respuestas).length === 0) throw new ErrorHttp(400, DATOS_INVALIDOS);

        // Una medición "completa" del invitado tiene que estar completa de verdad.
        const completa = cuerpo.medicion.completa === true && respondioTodo(respuestas);
        medicion = { respuestas, completadaAt: completa ? fechaDelNavegador(cuerpo.medicion.fecha) : null };
    }

    if (cuerpo.modulos) {
        const { construidos = {}, pausados = {} } = cuerpo.modulos;
        if (typeof construidos !== "object" || typeof pausados !== "object" || !construidos || !pausados) {
            throw new ErrorHttp(400, DATOS_INVALIDOS);
        }

        for (const id of new Set([...Object.keys(construidos), ...Object.keys(pausados)])) {
            if (!moduloValido(id)) continue;

            let valores = null;
            let filas = null;
            let guardadoAt = null;
            if (construidos[id]) {
                valores = limpiarValores(construidos[id].valores);
                filas = limpiarFilas(construidos[id].filas);
                if (!valores || !filas) throw new ErrorHttp(400, DATOS_INVALIDOS);
                guardadoAt = fechaDelNavegador(construidos[id].guardadoAt);
            }

            const pausa = pausados[id] ? limpiarPausa(pausados[id]) : null;
            if (pausados[id] && !pausa) throw new ErrorHttp(400, DATOS_INVALIDOS);

            modulos.push({ modulo: id, valores, filas, guardado_at: guardadoAt, pausa });
        }
    }

    const consultas = [];

    if (medicion) {
        consultas.push([
            `INSERT INTO mediciones (usuario_id, version, respuestas, creada_at, completada_at)
             SELECT $1, $2, $3, coalesce($4, now()), $4
              WHERE NOT EXISTS (SELECT 1 FROM mediciones WHERE usuario_id = $1)
             RETURNING id`,
            [usuario.id, VERSION_CATALOGO, JSON.stringify(medicion.respuestas), medicion.completadaAt],
        ]);
    }

    if (modulos.length) {
        consultas.push([
            `INSERT INTO modulos_usuario (usuario_id, modulo, valores, filas, guardado_at, pausa)
             SELECT $1, m.modulo, m.valores, m.filas, m.guardado_at, m.pausa
               FROM jsonb_to_recordset($2::jsonb)
                    AS m(modulo varchar, valores jsonb, filas jsonb, guardado_at timestamptz, pausa jsonb)
              WHERE NOT EXISTS (SELECT 1 FROM modulos_usuario WHERE usuario_id = $1)
             RETURNING modulo`,
            [usuario.id, JSON.stringify(modulos)],
        ]);
    }

    // Antes de todo, un candado por usuario: si llegan dos importaciones juntas (dos
    // pestañas), la segunda espera y ve lo que guardó la primera.
    const resultados = consultas.length
        ? await transaccion([["SELECT pg_advisory_xact_lock(hashtext($1))", [`importar:${usuario.id}`]], ...consultas])
        : [];

    const [, ...filas] = resultados;
    const importoMedicion = medicion ? filas.shift().length > 0 : false;
    const importoModulos = modulos.length ? filas.shift().length > 0 : false;

    return json(200, { medicion: importoMedicion, modulos: importoModulos });
}
