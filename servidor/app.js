// Router de la API. Todas las rutas /api/* entran por acá (netlify/functions/api.mjs).

import { ErrorHttp, json, verificarOrigen } from "./http.js";
import { exigirUsuario } from "./sesion.js";
import * as cuenta from "./rutas/cuenta.js";
import * as datos from "./rutas/datos.js";
import * as consultor from "./rutas/consultor.js";

// [método, patrón, manejador, { conCuenta }]. Los grupos del patrón llegan en params.
// El manejador recibe (req, { params, ip, usuario }) y devuelve un Response.
// conCuenta: exige sesión (si no, 401) y pasa el usuario.
const RUTAS = [
    ["GET", /^\/api\/salud$/, async () => json(200, { ok: true })],

    ["GET", /^\/api\/cuenta$/, cuenta.sesion],
    ["POST", /^\/api\/cuenta\/registro$/, cuenta.registro],
    ["POST", /^\/api\/cuenta\/entrar$/, cuenta.entrar],
    ["POST", /^\/api\/cuenta\/salir$/, cuenta.salir],
    ["POST", /^\/api\/cuenta\/borrar$/, cuenta.borrar],

    ["GET", /^\/api\/datos$/, datos.datos, { conCuenta: true }],
    ["PUT", /^\/api\/mediciones\/borrador$/, datos.guardarBorrador, { conCuenta: true }],
    ["POST", /^\/api\/mediciones\/borrador\/completar$/, datos.completarBorrador, { conCuenta: true }],
    ["PUT", /^\/api\/modulos\/([a-z]+)$/, datos.guardarModulo, { conCuenta: true }],
    ["PUT", /^\/api\/modulos\/([a-z]+)\/pausa$/, datos.pausarModulo, { conCuenta: true }],
    ["POST", /^\/api\/importar$/, datos.importar, { conCuenta: true }],

    ["GET", /^\/api\/consultor\/uso$/, consultor.uso, { conCuenta: true }],
    ["POST", /^\/api\/consultor\/revision$/, consultor.revision, { conCuenta: true }],
    ["POST", /^\/api\/consultor\/pregunta$/, consultor.pregunta, { conCuenta: true }],
];

const MUTAN = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function atender(req, { ip = "" } = {}) {
    const { pathname } = new URL(req.url);

    try {
        let rutaDelPath = false;

        for (const [metodo, patron, manejador, opciones = {}] of RUTAS) {
            const coincide = pathname.match(patron);
            if (!coincide) continue;

            rutaDelPath = true;
            if (metodo !== req.method) continue;

            if (MUTAN.has(req.method)) verificarOrigen(req);

            const contexto = { params: coincide.slice(1), ip };
            let setCookie;

            if (opciones.conCuenta) {
                ({ usuario: contexto.usuario, setCookie } = await exigirUsuario(req));
            }

            const respuesta = await manejador(req, contexto);
            if (setCookie) respuesta.headers.append("Set-Cookie", setCookie);
            return respuesta;
        }

        return rutaDelPath
            ? json(405, { error: "Método no permitido." })
            : json(404, { error: "No existe esa ruta." });
    } catch (error) {
        if (error instanceof ErrorHttp) return json(error.status, { error: error.message, ...error.extra });

        // El detalle queda en el log; al usuario nunca le llega un mensaje interno.
        console.error("Error en la API:", error);
        return json(500, { error: "Algo falló de nuestro lado. Probá de nuevo en un rato." });
    }
}
