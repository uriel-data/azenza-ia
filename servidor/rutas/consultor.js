// Consultor IA: revisión de un módulo y pregunta libre, con dos topes diarios.
//
// - Por usuario: CONSULTOR_LIMITE_USUARIO por día (3).
// - Global: CONSULTOR_TOPE_GLOBAL por día entre todos, para no pasarse de la cuota
//   gratuita de Gemini. Si se alcanza, el Consultor avisa y todo lo demás sigue andando.
// - CONSULTOR_ACTIVO=false lo apaga sin deploy (también se apaga si falta la key).
// El día es el de Argentina (UTC-3, sin horario de verano), no el del servidor.

import { CRITERIOS_GENERICOS, MODULOS } from "../../src/data/modulos.js";
import { consulta, transaccion } from "../db.js";
import { ErrorHttp, json, leerJson } from "../http.js";
import { ErrorGemini, preguntar, revisar } from "../gemini.js";
import { limpiarTextoUsuario, moduloValido } from "../validar.js";

const MAX_PREGUNTA = 500;
const DESFASE_ARGENTINA_MS = 3 * 60 * 60 * 1000;

const entero = (valor, porDefecto) => {
    const numero = Number.parseInt(valor ?? "", 10);
    return Number.isInteger(numero) && numero >= 0 ? numero : porDefecto;
};

const config = () => ({
    activo: process.env.CONSULTOR_ACTIVO !== "false" && Boolean(process.env.GEMINI_API_KEY),
    limite: entero(process.env.CONSULTOR_LIMITE_USUARIO, 3),
    tope: entero(process.env.CONSULTOR_TOPE_GLOBAL, 20),
});

/** Las 0 h de hoy en Argentina, como instante UTC. */
export function inicioDelDiaEnArgentina(ahora = new Date()) {
    const local = new Date(ahora.getTime() - DESFASE_ARGENTINA_MS);
    local.setUTCHours(0, 0, 0, 0);
    return new Date(local.getTime() + DESFASE_ARGENTINA_MS);
}

const CONTAR = `SELECT
    (SELECT count(*)::int FROM consultas_ia WHERE usuario_id = $1 AND creada_at >= $2) AS usadas,
    (SELECT count(*)::int FROM consultas_ia WHERE creada_at >= $2) AS globales`;

const usoDesde = ({ usadas, globales }, { activo, limite, tope }) => {
    const agotadoGlobal = globales >= tope;
    return { activo, limite, usadas, quedan: agotadoGlobal ? 0 : Math.max(0, limite - usadas), agotadoGlobal };
};

async function usoDeHoy(usuarioId) {
    const [fila] = await consulta(CONTAR, [usuarioId, inicioDelDiaEnArgentina()]);
    return usoDesde(fila, config());
}

const APAGADO = "El Consultor está apagado por ahora. Todo lo demás sigue funcionando igual.";
const SIN_CUPO = "Ya usaste las consultas de hoy. Mañana tenés más; mientras, tus módulos funcionan igual.";
const SIN_CUPO_GLOBAL = "El Consultor ya respondió todas las consultas que puede por hoy. Mañana vuelve; mientras, todo lo demás funciona igual.";
const SATURADO = "El Consultor está con mucha demanda. Probá de nuevo en unos minutos: no se descontó la consulta.";
const FALLA = "No pudimos conectar con el Consultor. Lo que construiste está a salvo y no se descontó la consulta; probá de nuevo en un rato.";

/**
 * Reserva una consulta si quedan los dos cupos. Con un candado global, para que dos
 * pedidos simultáneos no se pasen del tope. Devuelve el id reservado y el uso.
 */
async function reservar(usuarioId, tipo, modulo = null) {
    const cfg = config();
    if (!cfg.activo) throw new ErrorHttp(503, APAGADO, { uso: { ...cfg, usadas: 0, quedan: 0, agotadoGlobal: false } });

    const desde = inicioDelDiaEnArgentina();
    const [, insertadas, [conteo]] = await transaccion([
        ["SELECT pg_advisory_xact_lock(hashtext('consultor-ia'))"],
        [
            `INSERT INTO consultas_ia (usuario_id, tipo, modulo)
             SELECT $1, $2, $3
              WHERE (SELECT count(*) FROM consultas_ia WHERE usuario_id = $1 AND creada_at >= $4) < $5
                AND (SELECT count(*) FROM consultas_ia WHERE creada_at >= $4) < $6
             RETURNING id`,
            [usuarioId, tipo, modulo, desde, cfg.limite, cfg.tope],
        ],
        [CONTAR, [usuarioId, desde]],
    ]);

    const uso = usoDesde(conteo, cfg);
    if (!insertadas.length) throw new ErrorHttp(429, uso.agotadoGlobal ? SIN_CUPO_GLOBAL : SIN_CUPO, { uso });

    return { id: insertadas[0].id, uso };
}

/** Si la IA falló, la consulta no cuenta. */
const liberar = (id) => consulta("DELETE FROM consultas_ia WHERE id = $1", [id]);

function errorDeIa(error) {
    // El detalle (con el mensaje de Gemini) queda en el log; al usuario, uno amable.
    console.error("Error en el Consultor IA:", error);
    if (error instanceof ErrorGemini && error.saturado) return new ErrorHttp(503, SATURADO);
    return new ErrorHttp(502, FALLA);
}

const NOMBRE_DE = Object.fromEntries(MODULOS.map((modulo) => [modulo.id, modulo.nombre]));

/**
 * Tu negocio, tal como está guardado en la base (ya limpio). El Consultor nunca lee lo
 * que mande el navegador en el momento: solo lo que la persona guardó. Sin datos de la
 * cuenta: ni nombre ni email.
 */
async function negocioDe(usuarioId) {
    const filas = await consulta(
        "SELECT modulo, filas FROM modulos_usuario WHERE usuario_id = $1 AND guardado_at IS NOT NULL",
        [usuarioId]
    );
    const orden = MODULOS.map((modulo) => modulo.id);

    return filas
        .filter((fila) => NOMBRE_DE[fila.modulo])
        .sort((a, b) => orden.indexOf(a.modulo) - orden.indexOf(b.modulo))
        .map((fila) => ({
            id: fila.modulo,
            modulo: NOMBRE_DE[fila.modulo],
            tarjeta: (fila.filas ?? []).map(({ etiqueta, texto }) => ({ etiqueta, texto })),
        }));
}

const sinId = ({ modulo, tarjeta }) => ({ modulo, tarjeta });

// ─── Rutas ──────────────────────────────────────────────────────────

export async function uso(req, { usuario }) {
    return json(200, { uso: await usoDeHoy(usuario.id) });
}

/** Body: { modulo }. Revisa lo que guardó en ese módulo. */
export async function revision(req, { usuario }) {
    const { modulo: id } = await leerJson(req);
    const modulo = moduloValido(id);
    if (!modulo) throw new ErrorHttp(404, "Ese módulo no existe.");

    const negocio = await negocioDe(usuario.id);
    const construido = negocio.find((item) => item.id === modulo.id);
    if (!construido) throw new ErrorHttp(404, "Todavía no terminaste ese módulo: no hay nada que revisar.");

    const reserva = await reservar(usuario.id, "revision", modulo.id);

    try {
        const resultado = await revisar({
            modulo: modulo.nombre,
            criterios: (modulo.criterios ?? CRITERIOS_GENERICOS).map((c) => c.criterio),
            resultado: construido.tarjeta,
            negocio: negocio.filter((item) => item.id !== modulo.id).map(sinId),
        });
        return json(200, { revision: resultado, uso: await usoDeHoy(usuario.id) });
    } catch (error) {
        await liberar(reserva.id);
        throw errorDeIa(error);
    }
}

/** Body: { pregunta }. Responde con lo que guardó en Tu negocio. */
export async function pregunta(req, { usuario }) {
    const cuerpo = await leerJson(req);
    const texto = limpiarTextoUsuario(cuerpo.pregunta);

    if (!texto) throw new ErrorHttp(400, "Escribí tu pregunta.");
    if (texto.length > MAX_PREGUNTA) throw new ErrorHttp(400, `La pregunta puede tener hasta ${MAX_PREGUNTA} caracteres.`);

    const negocio = (await negocioDe(usuario.id)).map(sinId);
    const reserva = await reservar(usuario.id, "pregunta");

    try {
        const respuesta = await preguntar({ pregunta: texto, negocio });
        return json(200, { respuesta, uso: await usoDeHoy(usuario.id) });
    } catch (error) {
        await liberar(reserva.id);
        throw errorDeIa(error);
    }
}
