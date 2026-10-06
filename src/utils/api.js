// La API vive en el mismo sitio (/api, Netlify Functions): la cookie de sesión es del
// mismo origen y no hace falta configurar ninguna URL.

const ERROR_DE_RED = "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";

/**
 * fetch a la API. Si la respuesta no es OK lanza un Error con el mensaje del servidor,
 * su status y el resto de lo que haya mandado (por ejemplo, el uso del Consultor).
 */
export async function api(ruta, { method = "GET", body } = {}) {
    let response;

    try {
        response = await fetch(`/api${ruta}`, {
            method,
            credentials: "same-origin",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        const error = new Error(ERROR_DE_RED);
        error.status = 0;
        throw error;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error || "Ocurrió un error inesperado. Intentá de nuevo.");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}
