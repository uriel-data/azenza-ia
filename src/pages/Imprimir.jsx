import { useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useAppData } from "../context/AppDataContext";
import { MODULOS } from "../data/modulos";
import { fechaCorta } from "../utils/fechas";

/**
 * Todo lo construido como documento, listo para imprimir o guardar en PDF desde el
 * diálogo del navegador. Es una pantalla más de la app (y no una ventana armada con
 * document.write) para que funcione con la CSP: estilos y fuente salen de los archivos
 * propios del sitio. Los estilos de impresión están en azenza.css (@media print).
 */
export function Imprimir() {
    const { listo, construidos } = useAppData();
    const impreso = useRef(false);

    const modulos = MODULOS.filter((modulo) => construidos[modulo.id]);
    const hay = listo && modulos.length > 0;

    // Abre el diálogo una sola vez, cuando ya cargó la fuente (si no, el PDF sale con otra).
    useEffect(() => {
        if (!hay || impreso.current) return;
        impreso.current = true;

        document.fonts.ready.then(() => window.print());
    }, [hay]);

    if (!listo) return <Loader />;
    if (!hay) return <Navigate to="/negocio" replace />;

    const nombre = construidos.perfil?.valores?.nombre || "Tu negocio";

    return (
        <div className="ui-screen ui-print">
            <div className="ui-print__bar">
                <Link to="/negocio" className="ui-link-btn">Volver a Tu negocio</Link>
                <button type="button" className="ui-btn ui-btn--inline ui-btn--small" onClick={() => window.print()}>
                    Imprimir o guardar en PDF
                </button>
            </div>

            <article className="ui-print__doc">
                <header className="ui-print__head">
                    <img src="/img/logo-azenza.svg" alt="Azenza" className="ui-logo ui-logo--sm" />
                    <h1 className="ui-print__title">{nombre}</h1>
                    <p className="ui-print__meta">Lo construido en Azenza IA · {fechaCorta(new Date())}</p>
                </header>

                {modulos.map((modulo) => {
                    const { filas, guardadoAt } = construidos[modulo.id];

                    return (
                        <section key={modulo.id} className="ui-print__section">
                            <h2 className="ui-print__name">{modulo.nombre}</h2>
                            {filas.map((fila, i) => (
                                <p key={i} className="ui-print__row">
                                    <b>{fila.etiqueta}</b>
                                    <span>{fila.texto}</span>
                                </p>
                            ))}
                            <small className="ui-print__meta">Actualizado el {fechaCorta(guardadoAt)}</small>
                        </section>
                    );
                })}
            </article>
        </div>
    );
}
