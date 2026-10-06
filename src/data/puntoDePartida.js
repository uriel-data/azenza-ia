// Lógica del punto de partida que no depende de React. El resultado y la ruta se
// arman acá (y no en el backend) porque un invitado también tiene que verlos.
//
// Forma de una respuesta en el frontend:
//   { opcion: 1 | 2 | 3 | null, entradas: string[], principal: number }
// principal es el índice dentro de las entradas con texto, o -1 si eligió
// "Todavía no sabría cuál elegir".

import { MODULO, MODULOS } from "./modulos";

export const respuestaVacia = () => ({ opcion: null, entradas: [""], principal: 0 });

export const entradasConTexto = (respuesta) =>
    (respuesta?.entradas ?? []).map((texto) => texto.trim()).filter(Boolean);

export const esRespuestaValida = (respuesta) =>
    Boolean(respuesta?.opcion) && (respuesta.opcion !== 3 || entradasConTexto(respuesta).length > 0);

/** Eligió "lo tengo" con varias respuestas y no pudo elegir una principal. */
export const quedoSinPrincipal = (respuesta) =>
    respuesta?.opcion === 3 && respuesta.principal === -1 && entradasConTexto(respuesta).length > 1;

export const textoPrincipal = (respuesta) => {
    if (respuesta?.opcion !== 3 || quedoSinPrincipal(respuesta)) return "";

    const entradas = entradasConTexto(respuesta);
    return entradas[respuesta.principal] ?? entradas[0] ?? "";
};

export const cantidadRespondidas = (respuestas, conceptos) =>
    conceptos.filter((concepto) => esRespuestaValida(respuestas[concepto.clave])).length;

// ─── Conversión con el formato del backend ───────────────────────

/** Lo que espera PUT /nivelacion/:id/respuestas/:concepto y POST /nivelacion/importar. */
export const aFormatoApi = (respuesta) => {
    if (respuesta.opcion !== 3) return { opcion: respuesta.opcion };

    const entradas = entradasConTexto(respuesta);
    const principal = entradas.length > 1 && !quedoSinPrincipal(respuesta)
        ? Math.min(Math.max(respuesta.principal, 0), entradas.length - 1)
        : null;

    return { opcion: 3, respuestas: entradas, principal };
};

/** Una respuesta guardada en el servidor ({ opcion, nivel, texto, secundarios }). */
export const desdeFormatoApi = ({ opcion, texto, secundarios = [] }) => {
    if (opcion !== 3) return { opcion, entradas: [""], principal: 0 };
    if (texto) return { opcion, entradas: [texto, ...secundarios], principal: 0 };
    return { opcion, entradas: secundarios.length ? secundarios : [""], principal: -1 };
};

/** Una medición del servidor ({ id, creadaAt, completadaAt, respuestas: { concepto: ... } }), en el formato del frontend. */
export const medicionALocal = (medicion) => ({
    id: medicion.id,
    fecha: medicion.completadaAt ?? medicion.creadaAt,
    respuestas: Object.fromEntries(
        Object.entries(medicion.respuestas).map(([concepto, respuesta]) => [concepto, desdeFormatoApi(respuesta)])
    ),
});

// ─── Resultado ───────────────────────────────────────────────────

/**
 * Lo que ve el usuario al terminar. Nunca muestra niveles ni puntajes: lo que ya
 * tiene claro, un único próximo paso (el módulo del primer concepto que le falta)
 * y el resto del camino.
 */
export const armarResultado = (respuestas, conceptos) => {
    const claro = [];
    const pendientes = [];

    for (const concepto of conceptos) {
        const respuesta = respuestas[concepto.clave];

        if (respuesta?.opcion === 3) {
            const sinPrincipal = quedoSinPrincipal(respuesta);

            claro.push({
                clave: concepto.clave,
                termino: concepto.nombreTecnico,
                texto: sinPrincipal ? entradasConTexto(respuesta).join(" · ") : textoPrincipal(respuesta),
                sinPrincipal,
            });
        } else {
            pendientes.push(concepto);
        }
    }

    const [proximo, ...resto] = pendientes;

    return {
        claro,
        proximo: proximo ? { concepto: proximo, modulo: MODULO[proximo.modulo] } : null,
        resto,
    };
};

// ─── Ruta ────────────────────────────────────────────────────────

/**
 * Orden sugerido de los módulos: primero los de los conceptos que todavía no tiene
 * definidos (en el orden del catálogo), después el resto en el orden de las etapas.
 * Sin punto de partida, es el orden de las etapas.
 */
export const armarRuta = (respuestas, conceptos, construidos) => {
    const prioritarios = [];

    if (respuestas) {
        for (const concepto of conceptos) {
            const respuesta = respuestas[concepto.clave];

            if (respuesta?.opcion && respuesta.opcion !== 3 && !prioritarios.includes(concepto.modulo)) {
                prioritarios.push(concepto.modulo);
            }
        }
    }

    const orden = [
        ...prioritarios,
        ...MODULOS.map((modulo) => modulo.id).filter((id) => !prioritarios.includes(id)),
    ].filter((id) => !MODULO[id].pronto);

    return {
        orden,
        prioritarios,
        siguiente: orden.find((id) => !construidos[id]) ?? null,
    };
};
