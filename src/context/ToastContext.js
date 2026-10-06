import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

/** Devuelve avisar(mensaje): muestra un aviso flotante por unos segundos. */
export function useToast() {
    const contexto = useContext(ToastContext);

    if (!contexto) {
        throw new Error("useToast debe usarse dentro de un <ToastProvider>");
    }

    return contexto;
}
