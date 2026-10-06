import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppDataContext } from "./AppDataContext";
import { useAuth } from "./AuthContext";
import { api } from "../utils/api";
import {
    CONCEPTOS,
    MAX_CARACTERES_RESPUESTA,
    MAX_RESPUESTAS_LISTADAS,
    OPCIONES,
    OPCIONES_CORTAS,
    VERSION_CATALOGO,
} from "../data/conceptos";
import {
    aFormatoApi,
    esRespuestaValida,
    medicionALocal,
    respuestaVacia,
} from "../data/puntoDePartida";

// Lo que hace un invitado vive solo en su navegador. Al registrarse o entrar se
// importa a su cuenta y se borra de acá. Lo de una cuenta nunca se guarda en el
// navegador: viene siempre del servidor.
const CLAVE_INVITADO = "azenza.invitado.v1";

// Las preguntas del punto de partida. Son las mismas que valida el servidor: las dos
// partes importan data/conceptos.js.
const CATALOGO = {
    version: VERSION_CATALOGO,
    maxCaracteres: MAX_CARACTERES_RESPUESTA,
    maxRespuestas: MAX_RESPUESTAS_LISTADAS,
    opciones: OPCIONES,
    opcionesCortas: OPCIONES_CORTAS,
    conceptos: CONCEPTOS,
};

const leer = (clave) => {
    try {
        return JSON.parse(localStorage.getItem(clave));
    } catch {
        return null;
    }
};

const escribir = (clave, valor) => {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
        // Sin almacenamiento (modo privado, cuota llena): la app sigue andando en memoria.
    }
};

const borrar = (clave) => {
    try {
        localStorage.removeItem(clave);
    } catch {
        // Ídem.
    }
};

const borradorVacio = () => ({ medicionId: null, respuestas: {} });

// dueno: id del usuario al que pertenecen los datos, o null si son del invitado.
// Evita que, en el render en que cambia la sesión, se guarden en el navegador los
// datos de una cuenta como si fueran del invitado.
const datosVacios = (dueno = null) => ({
    dueno,
    borrador: borradorVacio(),
    historial: [],
    construidos: {},
    pausados: {},
});

const datosDeInvitado = () => {
    const guardados = leer(CLAVE_INVITADO);
    return { ...datosVacios(), ...guardados, dueno: null };
};

/** Las respuestas válidas, en el formato que espera el servidor. */
const respuestasParaApi = (respuestas) =>
    Object.fromEntries(
        Object.entries(respuestas ?? {})
            .filter(([, respuesta]) => esRespuestaValida(respuesta))
            .map(([clave, respuesta]) => [clave, aFormatoApi(respuesta)])
    );

/** El punto de partida del invitado, en el formato de POST /importar. */
const puntoDePartidaPendiente = (invitado) => {
    const ultima = invitado?.historial?.at(-1);
    const respuestas = respuestasParaApi(ultima?.respuestas ?? invitado?.borrador?.respuestas);

    if (Object.keys(respuestas).length === 0) return null;

    return { respuestas, completa: Boolean(ultima), fecha: ultima?.fecha ?? null };
};

/** Módulos del invitado, en el formato de POST /importar. */
const modulosPendientes = (invitado) => {
    const construidos = invitado?.construidos ?? {};
    const pausados = invitado?.pausados ?? {};

    if (!Object.keys(construidos).length && !Object.keys(pausados).length) return null;
    return { construidos, pausados };
};

/** Todo lo de una cuenta, en un solo pedido. */
const pedirDatosDeCuenta = () => api("/datos");

const mensajeDeError = (error) =>
    error.status === 401
        ? "Tu sesión se cerró. Volvé a entrar para guardar."
        : error.message;

export function AppDataProvider({ children }) {
    const { user, cargando: cargandoSesion, limpiarSesion } = useAuth();
    const userId = user?.id ?? null;

    const [datos, setDatos] = useState(datosVacios);
    // false mientras se cargan los datos de la sesión actual.
    const [listo, setListo] = useState(false);
    // true si no se pudieron traer los datos de la cuenta: mejor avisar que mostrarla vacía.
    const [errorCarga, setErrorCarga] = useState(false);

    // Las acciones async leen el estado más reciente desde acá.
    const datosRef = useRef(datos);

    useEffect(() => {
        datosRef.current = datos;
    }, [datos]);

    // Cada carga desde el servidor toma un número; solo se aplica la última, para que
    // una respuesta lenta no pise datos más nuevos (por ejemplo, recién importados).
    const cargaRef = useRef(0);

    const aplicarCuenta = useCallback((dueno, { completadas, abierta, construidos, pausados }) => {
        setDatos(() => ({
            ...datosVacios(dueno),
            construidos,
            pausados,
            historial: completadas.map(medicionALocal),
            borrador: abierta
                ? { medicionId: abierta.id, respuestas: medicionALocal(abierta).respuestas }
                : borradorVacio(),
        }));
    }, []);

    const cargarDeCuenta = useCallback(async (dueno) => {
        const numero = ++cargaRef.current;
        const respuesta = await pedirDatosDeCuenta();

        if (numero === cargaRef.current) aplicarCuenta(dueno, respuesta);
    }, [aplicarCuenta]);

    // Cuando cambia la sesión se ajusta el estado en el mismo render (sin esperar a un
    // efecto): el invitado lee del navegador al instante; una cuenta queda "no lista"
    // hasta que llegan sus datos del servidor. undefined = la sesión todavía se verifica.
    const sesion = cargandoSesion ? undefined : userId;
    const [sesionCargada, setSesionCargada] = useState(undefined);

    if (sesion !== sesionCargada) {
        setSesionCargada(sesion);
        setListo(sesion === null);
        setErrorCarga(false);
        if (sesion === null) setDatos(datosDeInvitado());
    }

    useEffect(() => {
        if (!sesion) return;

        // activo evita que una respuesta llegue después de cerrar sesión o cambiar de cuenta.
        let activo = true;
        const numero = ++cargaRef.current;

        pedirDatosDeCuenta()
            .then((respuesta) => {
                if (activo && numero === cargaRef.current) aplicarCuenta(sesion, respuesta);
            })
            .catch((error) => {
                if (!activo) return;
                if (error.status === 401) {
                    limpiarSesion();
                    return;
                }
                console.error("No se pudieron cargar los datos de la cuenta:", error);
                setErrorCarga(true);
            })
            .finally(() => {
                if (activo) setListo(true);
            });

        return () => {
            activo = false;
        };
    }, [sesion, aplicarCuenta, limpiarSesion]);

    const reintentarCarga = useCallback(async () => {
        setErrorCarga(false);
        setListo(false);

        try {
            await cargarDeCuenta(userId);
        } catch (error) {
            console.error("No se pudieron cargar los datos de la cuenta:", error);
            setErrorCarga(true);
        }

        setListo(true);
    }, [cargarDeCuenta, userId]);

    useEffect(() => {
        if (listo && !userId && datos.dueno === null) {
            escribir(CLAVE_INVITADO, datos);
        }
    }, [datos, listo, userId]);

    /**
     * La llaman Registro y Login apenas se abre la sesión: pasa a la cuenta lo que
     * hizo como invitado. El servidor importa el punto de partida y los módulos solo
     * si la cuenta no tenía nada de eso: si ya tenía, gana la cuenta y lo del
     * navegador se descarta.
     */
    const vincularInvitado = useCallback(async (dueno) => {
        const invitado = leer(CLAVE_INVITADO);
        const medicion = puntoDePartidaPendiente(invitado);
        const modulos = modulosPendientes(invitado);
        let importado = false;

        if (medicion || modulos) {
            try {
                const respuesta = await api("/importar", { method: "POST", body: { medicion, modulos } });
                importado = respuesta.medicion || respuesta.modulos;
                borrar(CLAVE_INVITADO);
            } catch (error) {
                // Queda en el navegador y se reintenta la próxima vez que inicie sesión.
                console.error("No se pudo importar lo del invitado:", error);
            }
        } else {
            borrar(CLAVE_INVITADO);
        }

        try {
            await cargarDeCuenta(dueno);
        } catch (error) {
            console.error("No se pudieron cargar los datos de la cuenta:", error);
        }

        setListo(true);
        return { importado, completo: importado && Boolean(medicion?.completa) };
    }, [cargarDeCuenta]);

    // ─── Punto de partida ────────────────────────────────────────

    /** cambio: un objeto que se mezcla con la respuesta, o una función (anterior) => nueva. */
    const cambiarRespuesta = useCallback((clave, cambio) => {
        setDatos((anteriores) => {
            const actual = anteriores.borrador.respuestas[clave] ?? respuestaVacia();
            const nueva = typeof cambio === "function" ? cambio(actual) : { ...actual, ...cambio };

            return {
                ...anteriores,
                borrador: {
                    ...anteriores.borrador,
                    respuestas: { ...anteriores.borrador.respuestas, [clave]: nueva },
                },
            };
        });
    }, []);

    /**
     * Con cuenta, guarda en el servidor lo respondido hasta ahora (así se puede seguir
     * desde otro dispositivo). Como invitado ya está guardado en el navegador.
     */
    const guardarRespuesta = useCallback(async () => {
        if (!userId) return;

        try {
            const { medicion } = await api("/mediciones/borrador", {
                method: "PUT",
                body: { respuestas: respuestasParaApi(datosRef.current.borrador.respuestas) },
            });

            setDatos((anteriores) => ({
                ...anteriores,
                borrador: { ...anteriores.borrador, medicionId: medicion.id },
            }));
        } catch (error) {
            throw new Error(mensajeDeError(error));
        }
    }, [userId]);

    /** Cierra la medición: pasa al historial y el borrador queda vacío. */
    const completar = useCallback(async () => {
        if (!userId) {
            setDatos((anteriores) => ({
                ...anteriores,
                // El invitado guarda solo su última medición: el antes y después es
                // para cuentas, que son las que pueden volver a medirse.
                historial: [{ id: null, fecha: new Date().toISOString(), respuestas: anteriores.borrador.respuestas }],
                borrador: borradorVacio(),
            }));
            return;
        }

        try {
            const { medicion } = await api("/mediciones/borrador/completar", { method: "POST" });

            setDatos((anteriores) => ({
                ...anteriores,
                historial: [...anteriores.historial, medicionALocal(medicion)],
                borrador: borradorVacio(),
            }));
        } catch (error) {
            throw new Error(mensajeDeError(error));
        }
    }, [userId]);

    // ─── Módulos ─────────────────────────────────────────────────

    /** Guarda lo construido en un módulo (y saca la pausa, si había). */
    const guardarModulo = useCallback(async (id, valores, filas) => {
        let guardado = { valores, filas, guardadoAt: new Date().toISOString() };

        if (userId) {
            try {
                guardado = await api(`/modulos/${id}`, { method: "PUT", body: { valores, filas } });
            } catch (error) {
                throw new Error(mensajeDeError(error));
            }
        }

        setDatos((anteriores) => {
            const pausados = { ...anteriores.pausados };
            delete pausados[id];

            return { ...anteriores, construidos: { ...anteriores.construidos, [id]: guardado }, pausados };
        });

        return guardado;
    }, [userId]);

    /** Deja un ejercicio a medias: { paso, profundidad, valores }. */
    const pausarModulo = useCallback(async (id, pausa) => {
        if (userId) {
            try {
                await api(`/modulos/${id}/pausa`, { method: "PUT", body: pausa });
            } catch (error) {
                throw new Error(mensajeDeError(error));
            }
        }

        setDatos((anteriores) => ({ ...anteriores, pausados: { ...anteriores.pausados, [id]: pausa } }));
    }, [userId]);

    /**
     * Cambia el texto de las filas de una tarjeta. Las filas que vienen de un campo
     * (tienen clave) actualizan también ese valor, para que los módulos que lo usan
     * lean la versión nueva.
     */
    const editarTarjeta = useCallback((id, filas) => {
        const actual = datosRef.current.construidos[id];
        const valores = { ...actual.valores };

        for (const fila of filas) {
            if (fila.clave) valores[fila.clave] = fila.texto;
        }

        return guardarModulo(id, valores, filas);
    }, [guardarModulo]);

    const valor = useMemo(
        () => ({
            catalogo: CATALOGO,
            listo,
            errorCarga,
            reintentarCarga,
            esInvitado: !userId,
            borrador: datos.borrador.respuestas,
            historial: datos.historial,
            puntoDePartida: datos.historial.at(-1) ?? null,
            construidos: datos.construidos,
            pausados: datos.pausados,
            cambiarRespuesta,
            guardarRespuesta,
            completar,
            vincularInvitado,
            guardarModulo,
            pausarModulo,
            editarTarjeta,
        }),
        [
            listo, errorCarga, reintentarCarga, userId, datos, cambiarRespuesta, guardarRespuesta,
            completar, vincularInvitado, guardarModulo, pausarModulo, editarTarjeta,
        ]
    );

    return <AppDataContext.Provider value={valor}>{children}</AppDataContext.Provider>;
}
