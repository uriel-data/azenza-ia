// Respuestas y lectura de pedidos. La API solo habla JSON y nunca se cachea.

const MAX_CUERPO = 64 * 1024;

/** Un error que se le puede mostrar al usuario tal cual, con su status HTTP. */
export class ErrorHttp extends Error {
    constructor(status, mensaje, extra = {}) {
        super(mensaje);
        this.status = status;
        this.extra = extra;
    }
}

export const json = (status, datos, cabeceras = {}) =>
    new Response(JSON.stringify(datos), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            ...cabeceras,
        },
    });

export const DATOS_INVALIDOS = "Lo que llegó no tiene la forma esperada. Recargá la página e intentá de nuevo.";

/** El cuerpo del pedido como objeto JSON. Rechaza otros tipos de contenido y cuerpos grandes. */
export async function leerJson(req) {
    const tipo = req.headers.get("content-type") ?? "";
    if (!tipo.toLowerCase().startsWith("application/json")) throw new ErrorHttp(415, DATOS_INVALIDOS);

    const largo = Number(req.headers.get("content-length") ?? 0);
    if (largo > MAX_CUERPO) throw new ErrorHttp(413, "Lo que mandaste es demasiado largo.");

    const texto = await req.text();
    if (texto.length > MAX_CUERPO) throw new ErrorHttp(413, "Lo que mandaste es demasiado largo.");

    let datos;
    try {
        datos = JSON.parse(texto || "{}");
    } catch {
        throw new ErrorHttp(400, DATOS_INVALIDOS);
    }

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new ErrorHttp(400, DATOS_INVALIDOS);
    return datos;
}

/**
 * Los pedidos que cambian algo tienen que venir de la propia app. Junto con la cookie
 * SameSite=Lax y el Content-Type JSON (que fuerza un preflight desde otro origen),
 * cierra la puerta a CSRF.
 */
export function verificarOrigen(req) {
    const origen = req.headers.get("origin");
    if (!origen || origen !== new URL(req.url).origin) throw new ErrorHttp(403, "Pedido no permitido.");
}
