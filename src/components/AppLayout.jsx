import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { ToastProvider } from "../context/ToastProvider";

/** Marco de las pantallas con el diseño nuevo (sin el header ni el footer viejos). */
export function AppLayout() {
    const { pathname } = useLocation();
    const { errorCarga, reintentarCarga } = useAppData();

    // Cada pantalla arranca arriba, como en una app.
    useEffect(() => {
        // instant: App.css pone scroll-behavior smooth en html y la animación se corta.
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [pathname]);

    return (
        <div className="app">
            <ToastProvider>
                {errorCarga ? <ErrorDeCarga onRetry={reintentarCarga} /> : <Outlet />}
            </ToastProvider>
        </div>
    );
}

/** Con sesión abierta, si no llegaron sus datos: mejor decirlo que mostrar la cuenta vacía. */
function ErrorDeCarga({ onRetry }) {
    return (
        <div className="ui-screen">
            <div className="ui-body ui-body--wide" style={{ justifyContent: "center" }}>
                <div className="ui-card ui-card--lg">
                    <span className="ui-card__title">No pudimos cargar lo tuyo</span>
                    <span className="ui-card__text">
                        Lo que construiste está a salvo. Revisá tu conexión y probá de nuevo.
                    </span>
                    <button type="button" className="ui-btn ui-btn--inline" onClick={onRetry}>Reintentar</button>
                </div>
            </div>
        </div>
    );
}
