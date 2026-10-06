// Apoyo para las pruebas: una base PGlite en memoria con las migraciones aplicadas,
// registrada como adaptador del servidor, y pedidos a la API sin servidor HTTP.
import { PGlite } from "@electric-sql/pglite";
import { usarAdaptador } from "../servidor/db.js";
import { atender } from "../servidor/app.js";
import { aplicarMigraciones } from "../scripts/migraciones.mjs";

export const ORIGEN = "https://ia.azenza.com.ar";

export async function baseDePrueba() {
    const pg = await PGlite.create();
    await aplicarMigraciones({
        ejecutar: (sql) => pg.exec(sql),
        consulta: async (sql, parametros) => (await pg.query(sql, parametros)).rows,
        log: () => {},
    });
    usarAdaptador({
        consulta: async (texto, parametros = []) => (await pg.query(texto, parametros)).rows,
        transaccion: (consultas) =>
            pg.transaction(async (tx) => {
                const resultados = [];
                for (const [texto, parametros = []] of consultas) resultados.push((await tx.query(texto, parametros)).rows);
                return resultados;
            }),
    });
    return pg;
}

/** Un cliente con su propia cookie de sesión, como un navegador. */
export function cliente({ ip = "10.0.0.1" } = {}) {
    let cookie = "";

    return async function pedir(ruta, { method = "GET", body, origen = ORIGEN, tipo = "application/json" } = {}) {
        const headers = { cookie };
        if (origen) headers.origin = origen;
        if (body !== undefined) headers["content-type"] = tipo;

        const respuesta = await atender(
            new Request(`${ORIGEN}/api${ruta}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
            { ip }
        );

        for (const linea of respuesta.headers.getSetCookie()) {
            const [par] = linea.split(";");
            cookie = /Max-Age=0/.test(linea) ? "" : par;
        }

        return { status: respuesta.status, datos: await respuesta.json(), cookies: respuesta.headers.getSetCookie() };
    };
}
