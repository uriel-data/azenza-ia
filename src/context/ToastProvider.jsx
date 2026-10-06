import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContext } from "./ToastContext";

const DURACION_MS = 2800;

export function ToastProvider({ children }) {
    const [mensaje, setMensaje] = useState(null);
    const timerRef = useRef(null);

    const avisar = useCallback((texto) => {
        clearTimeout(timerRef.current);
        setMensaje(texto);
        timerRef.current = setTimeout(() => setMensaje(null), DURACION_MS);
    }, []);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <ToastContext.Provider value={avisar}>
            {children}
            <div className="ui-toast" role="status" aria-live="polite">
                {mensaje && <span key={mensaje} className="ui-toast__text">{mensaje}</span>}
            </div>
        </ToastContext.Provider>
    );
}
