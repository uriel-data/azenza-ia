// Cómo se recorre un módulo. Sin React: lo usa la pantalla del módulo.
//
// Profundidades (salen del brief, "Qué hace el sistema con el nivel medido"):
// - A, recorrido completo: el problema, el concepto y el ejercicio guiado.
// - B, versión corta: directo al ejercicio.
// - C, mejorar lo que tenés: parte de lo que escribió en el punto de partida y lo
//   revisa contra criterios. La calculadora de precios igual pide los números.
// El usuario siempre puede pasar de A a B y volver: el nivel no encierra.

import { MODULOS, calcularPrecio } from "./modulos";
import { textoPrincipal } from "./puntoDePartida";
import { capitalizar, esGenerico, pesos, sinPuntoFinal } from "../utils/texto";

export const NOMBRE_PROFUNDIDAD = {
    A: "Recorrido completo",
    B: "Versión corta",
    C: "Mejorar lo que tenés",
};

/**
 * Con qué profundidad arranca el módulo según lo que respondió en el punto de partida.
 * Si dijo que lo tiene pero lo que escribió es genérico, se trata como B (el nivel se
 * recalibra sin decírselo).
 */
export function profundidadPara(modulo, respuestas) {
    if (!modulo.concepto || !respuestas) return "A";

    const respuesta = respuestas[modulo.concepto];

    if (respuesta?.opcion === 3) {
        return !modulo.criterios || esGenerico(textoPrincipal(respuesta)) ? "B" : "C";
    }

    return respuesta?.opcion === 2 ? "B" : "A";
}

/** Las pantallas del módulo, en orden: [{ tipo, i? }]. */
export function pantallasDe(modulo, profundidad) {
    const pantallas = [];

    if (profundidad === "A" && modulo.problema) {
        pantallas.push({ tipo: "problema" }, { tipo: "explicacion" });
    }

    if (profundidad === "C") {
        pantallas.push({ tipo: "mejorar" });
    }

    if (profundidad !== "C" || modulo.calculadora) {
        modulo.pasos.forEach((_, i) => pantallas.push({ tipo: "paso", i }));
    }

    pantallas.push({ tipo: "resultado" }, { tipo: "siguiente" });
    return pantallas;
}

/** Lo que ya construyó, listo para precargar otros módulos. */
export function contextoDe(construidos) {
    const valores = (id) => construidos[id]?.valores ?? {};
    const perfil = valores("perfil");
    const propuesta = valores("propuesta");
    const precios = valores("precios");
    const caja = valores("caja");
    const objetivos = valores("objetivos");
    const calculo = construidos.precios ? calcularPrecio(precios) : null;

    return {
        cliente: valores("cliente").frase || "",
        problema: propuesta.problema || "",
        propuesta: propuesta.frase || "",
        diferencial: propuesta.diferencial || "",
        canales: perfil.canales || "",
        perfil: perfil.nombre ? `${sinPuntoFinal(perfil.nombre)} · ${sinPuntoFinal(perfil.vende)}` : "",
        precio: calculo ? String(calculo.precio) : "",
        costoVariable: calculo ? String(calculo.materiales + calculo.otros) : "",
        precioTexto: calculo ? `${sinPuntoFinal(capitalizar(precios.producto))}: ${pesos(calculo.precio)}` : "",
        costosTexto: calculo
            ? `Materiales, tiempo y otros gastos: ${pesos(calculo.costo)} por unidad`
            : caja.mayor ? `Mayor gasto: ${caja.mayor}` : "",
        metas: [objetivos.m1, objetivos.m2, objetivos.m3].filter(Boolean).join(" · "),
        faltan: MODULOS.filter((m) => !construidos[m.id] && !m.pronto && m.id !== "plan").map((m) => m.nombre),
    };
}

/** El dato de Tu negocio que precarga un campo, si hay. */
export const datoDeNegocio = (campo, ctx) => {
    if (!campo.ctx) return null;

    const dato = ctx[campo.ctx];
    const hay = Array.isArray(dato) ? dato.length > 0 : Boolean(String(dato ?? "").trim());

    return hay ? dato : null;
};

/** Completa los campos vacíos de un paso con lo que ya construyó (o el 30% de ganancia). */
export function precargar(modulo, pantalla, valores, ctx) {
    if (pantalla?.tipo !== "paso") return valores;

    const resultado = { ...valores };

    for (const campo of modulo.pasos[pantalla.i].campos) {
        if (resultado[campo.clave] !== undefined && resultado[campo.clave] !== null) continue;

        if (campo.precarga) {
            resultado[campo.clave] = campo.precarga(ctx, resultado) ?? "";
        } else if (campo.tipo === "porcentaje") {
            resultado[campo.clave] = 30;
        }
    }

    return resultado;
}

/** Si se puede avanzar desde esta pantalla con estos valores. */
export function pantallaCompleta(modulo, pantalla, valores) {
    if (pantalla.tipo === "paso") {
        const paso = modulo.pasos[pantalla.i];
        const lleno = (campo) => Boolean(String(valores[campo.clave] ?? "").trim());

        // En una sola página (canvas, propuesta comercial, plan) todo es opcional,
        // pero la tarjeta no puede quedar vacía.
        if (paso.unaPagina) return paso.campos.some(lleno);

        return paso.campos.every((campo) => campo.opcional || campo.tipo === "porcentaje" || lleno(campo));
    }

    if (pantalla.tipo === "mejorar") return Boolean(String(valores.mejorado ?? "").trim());

    return true;
}

/**
 * Valores iniciales para la versión "mejorar lo que tenés": lo que escribió en el
 * punto de partida, más lo que el módulo toma de ahí.
 */
export function valoresParaMejorar(modulo, respuestas) {
    const original = textoPrincipal(respuestas?.[modulo.concepto]);

    return {
        ...(modulo.desdePuntoDePartida?.(respuestas ?? {}) ?? {}),
        original,
        mejorado: original,
    };
}
