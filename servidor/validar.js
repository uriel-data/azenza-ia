// Validación y limpieza de lo que manda el navegador. El frontend también valida, pero
// eso es comodidad: el que cuenta es este. Todo texto libre pasa por limpiarTextoUsuario
// porque después lo puede leer el Consultor IA.

import { CONCEPTOS, MAX_CARACTERES_RESPUESTA, MAX_RESPUESTAS_LISTADAS } from "../src/data/conceptos.js";
import { MODULO } from "../src/data/modulos.js";

// Caracteres de control (Cc) y de formato (Cf): incluye zero-width, marcas y overrides
// de dirección, soft hyphen y BOM. Se dejan pasar tab, salto de línea y retorno.
const INVISIBLES = /(?![\t\n\r])[\p{Cc}\p{Cf}]/gu;

/**
 * Normaliza un texto libre del usuario:
 * - Unicode NFKC: unifica variantes visuales (por ejemplo "＜" pasa a "<").
 * - Quita caracteres de control e invisibles.
 * - Quita "<" y ">": nadie puede abrir ni cerrar delimitadores en lo que lee la IA.
 * - Unifica saltos de línea, colapsa espacios y recorta.
 * Devuelve null si no es un string.
 */
export function limpiarTextoUsuario(valor) {
    if (typeof valor !== "string") return null;

    return valor
        .normalize("NFKC")
        .replace(INVISIBLES, "")
        .replace(/[<>]/g, "")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

const esObjeto = (valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);

// ─── Punto de partida ───────────────────────────────────────────────

const CONCEPTO = Object.fromEntries(CONCEPTOS.map((concepto) => [concepto.clave, concepto]));

/**
 * Una respuesta: { opcion, respuestas?, principal? } → { opcion, nivel, texto, secundarios }.
 * Reglas:
 * - Opciones 1 y 2: sin texto; el nivel es la opción.
 * - Opción 3 con una sola respuesta: esa es la principal (nivel 3).
 * - Opción 3 con varias y una elegida: esa es la principal; el resto, contexto (nivel 3).
 * - Opción 3 con varias y sin elegir ("Todavía no sabría cuál elegir"): nivel 2, sin
 *   decírselo; se guardan todas.
 * Devuelve null si no tiene la forma esperada.
 */
export function limpiarRespuesta(clave, cuerpo) {
    const concepto = CONCEPTO[clave];
    if (!concepto || !esObjeto(cuerpo)) return null;

    const opcion = cuerpo.opcion;
    if (![1, 2, 3].includes(opcion)) return null;
    if (opcion !== 3) return { opcion, nivel: opcion, texto: null, secundarios: [] };

    if (!Array.isArray(cuerpo.respuestas)) return null;
    const textos = cuerpo.respuestas.map(limpiarTextoUsuario);
    if (textos.some((texto) => texto === null || texto.length > MAX_CARACTERES_RESPUESTA)) return null;

    const limpias = textos.filter(Boolean);
    const maximo = concepto.permiteVarias ? MAX_RESPUESTAS_LISTADAS : 1;
    if (limpias.length === 0 || limpias.length > maximo) return null;

    if (limpias.length === 1) return { opcion, nivel: 3, texto: limpias[0], secundarios: [] };

    if (cuerpo.principal === null || cuerpo.principal === undefined) {
        return { opcion, nivel: 2, texto: null, secundarios: limpias };
    }

    const indice = cuerpo.principal;
    if (!Number.isInteger(indice) || indice < 0 || indice >= limpias.length) return null;

    return { opcion, nivel: 3, texto: limpias[indice], secundarios: limpias.filter((_, i) => i !== indice) };
}

/** { concepto: respuesta } (puede ser parcial). Devuelve el objeto limpio o null. */
export function limpiarRespuestas(respuestas) {
    if (!esObjeto(respuestas)) return null;

    const limpias = {};
    for (const [clave, respuesta] of Object.entries(respuestas)) {
        const limpia = limpiarRespuesta(clave, respuesta);
        if (!limpia) return null;
        limpias[clave] = limpia;
    }
    return limpias;
}

export const respondioTodo = (respuestas) => CONCEPTOS.every((concepto) => respuestas[concepto.clave]);

// ─── Módulos ────────────────────────────────────────────────────────

// Topes generosos: alcanzan para el módulo más largo (Lean Canvas, 8 campos) y frenan
// a quien quiera guardar cualquier cosa.
const MAX_CAMPOS = 40;
const MAX_FILAS = 12;
const MAX_TEXTO = 2000;
const MAX_ETIQUETA = 80;
const MAX_PASO = 40;
const CLAVE = /^[a-zA-Z0-9_]{1,30}$/;
const PROFUNDIDADES = ["A", "B", "C"];

/** El módulo, si existe y se puede construir (no los "Muy pronto"). */
export const moduloValido = (id) => (Object.hasOwn(MODULO, id) && !MODULO[id].pronto ? MODULO[id] : null);

/** Los valores del ejercicio: { campo: texto | número }. */
export function limpiarValores(valores) {
    if (!esObjeto(valores)) return null;

    const entradas = Object.entries(valores);
    if (entradas.length > MAX_CAMPOS) return null;

    const limpios = {};
    for (const [clave, valor] of entradas) {
        if (!CLAVE.test(clave)) return null;
        if (valor === null || valor === undefined) continue;

        if (typeof valor === "number") {
            if (!Number.isFinite(valor) || Math.abs(valor) > 1e12) return null;
            limpios[clave] = valor;
            continue;
        }

        const texto = limpiarTextoUsuario(valor);
        if (texto === null || texto.length > MAX_TEXTO) return null;
        limpios[clave] = texto;
    }
    return limpios;
}

/** La tarjeta de Tu negocio: [{ etiqueta, texto, clave? }]. */
export function limpiarFilas(filas) {
    if (!Array.isArray(filas) || filas.length === 0 || filas.length > MAX_FILAS) return null;

    const limpias = [];
    for (const fila of filas) {
        if (!esObjeto(fila)) return null;

        const etiqueta = limpiarTextoUsuario(fila.etiqueta);
        const texto = limpiarTextoUsuario(fila.texto);
        if (!etiqueta || etiqueta.length > MAX_ETIQUETA || texto === null || texto.length > MAX_TEXTO) return null;

        const limpia = { etiqueta, texto };
        if (fila.clave !== undefined && fila.clave !== null) {
            if (typeof fila.clave !== "string" || !CLAVE.test(fila.clave)) return null;
            limpia.clave = fila.clave;
        }
        limpias.push(limpia);
    }
    return limpias;
}

/** { paso, profundidad, valores } del ejercicio que quedó a medias. */
export function limpiarPausa(pausa) {
    if (!esObjeto(pausa)) return null;

    const valores = limpiarValores(pausa.valores ?? {});
    if (!Number.isInteger(pausa.paso) || pausa.paso < 0 || pausa.paso > MAX_PASO) return null;
    if (!PROFUNDIDADES.includes(pausa.profundidad) || !valores) return null;

    return { paso: pausa.paso, profundidad: pausa.profundidad, valores };
}

/** Una fecha que manda el navegador: si no es válida o es futura, ahora. */
export function fechaDelNavegador(valor) {
    const fecha = new Date(valor ?? NaN);
    const ahora = new Date();
    return Number.isNaN(fecha.getTime()) || fecha > ahora ? ahora : fecha;
}
