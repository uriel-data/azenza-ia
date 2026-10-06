// Acceso a Postgres. En producción, Neon por HTTP (@neondatabase/serverless): cada
// consulta es un fetch, sin conexiones que mantener abiertas entre invocaciones.
// En desarrollo, el servidor de Vite registra otro adaptador (PGlite, Postgres en
// WASM) con usarAdaptador(); ver scripts/api-local.mjs.
//
// Un adaptador tiene dos métodos:
// - consulta(texto, parametros): devuelve las filas.
// - transaccion([[texto, parametros], ...]): corre todo en una transacción y
//   devuelve las filas de cada consulta, en orden. No es interactiva: las consultas
//   no pueden depender en JS del resultado de las anteriores.

import { neon } from "@neondatabase/serverless";

// En globalThis y no en una variable del módulo: en desarrollo Vite puede recargar
// este archivo y el adaptador registrado tiene que sobrevivir.
const CLAVE = Symbol.for("azenza-ia.db");

export function usarAdaptador(adaptador) {
    globalThis[CLAVE] = adaptador;
}

function adaptador() {
    if (globalThis[CLAVE]) return globalThis[CLAVE];

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");

    const sql = neon(url);

    globalThis[CLAVE] = {
        consulta: (texto, parametros = []) => sql.query(texto, parametros),
        transaccion: (consultas) => sql.transaction(consultas.map(([texto, parametros = []]) => sql.query(texto, parametros))),
    };

    return globalThis[CLAVE];
}

export const consulta = (texto, parametros) => adaptador().consulta(texto, parametros);

export const transaccion = (consultas) => adaptador().transaccion(consultas);

/** La primera fila, o null. */
export const una = async (texto, parametros) => (await consulta(texto, parametros))[0] ?? null;
