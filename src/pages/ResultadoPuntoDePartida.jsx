import { Link, Navigate } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useAppData } from "../context/AppDataContext";
import { armarResultado } from "../data/puntoDePartida";
import { fechaCorta } from "../utils/fechas";

// Textos fijos: nada de esto lo genera la IA, así se controla el tono. Nunca muestra
// niveles ni puntajes.
export function ResultadoPuntoDePartida() {
    const { catalogo, listo, esInvitado, historial, puntoDePartida } = useAppData();

    if (!listo) return <Loader />;

    if (!puntoDePartida) return <Navigate to="/punto-de-partida" replace />;

    const { claro, proximo, resto } = armarResultado(puntoDePartida.respuestas, catalogo.conceptos);
    const remedicion = !esInvitado && historial.length >= 2;

    return (
        <div className="ui-screen ui-in">
            <div className="ui-body ui-body--loose" style={{ paddingTop: 28 }}>
                <div className="ui-stack ui-stack--md">
                    <span className="ui-eyebrow">Tu punto de partida · {fechaCorta(puntoDePartida.fecha)}</span>
                    <h1 className="ui-title ui-title--lg">Acá estás hoy.</h1>
                    <p className="ui-lead">No es una nota: es lo que contaste, ordenado.</p>
                </div>

                <section className="ui-stack ui-stack--md">
                    <h2 className="ui-section-title">Lo que ya tenés claro</h2>
                    {claro.length > 0 ? (
                        claro.map((item) => (
                            <div key={item.clave} className="ui-card" style={{ borderRadius: 18, padding: 16, gap: 6 }}>
                                <span className="ui-card__label ui-card__label--teal">{item.termino}</span>
                                <span className="ui-quote">“{item.texto}”</span>
                                {item.sinPrincipal && (
                                    <span className="ui-small" style={{ fontSize: 13.5, color: "var(--ui-text-muted)" }}>
                                        Todavía no elegiste uno principal. Lo vemos en el módulo.
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="ui-small" style={{ fontSize: 15.5, lineHeight: 1.5 }}>
                            Todavía no escribiste ninguno. Lo vas a ir construyendo, módulo a módulo.
                        </p>
                    )}
                </section>

                {proximo && (
                    <section className="ui-stack ui-stack--md">
                        <h2 className="ui-section-title">Tu próximo paso</h2>
                        <div className="ui-card ui-card--dark" style={{ borderRadius: 22 }}>
                            <span className="ui-card__label">
                                {proximo.concepto.nombreTecnico} · {proximo.concepto.titulo}
                            </span>
                            <span className="ui-card__big" style={{ fontSize: 24, lineHeight: 1.15 }}>{proximo.modulo.nombre}</span>
                            <span style={{ fontSize: 14.5, color: "var(--ui-on-teal-soft)" }}>
                                Unos {proximo.modulo.minutos} minutos
                            </span>
                        </div>
                    </section>
                )}

                {resto.length > 0 && (
                    <section className="ui-stack ui-stack--md">
                        <h2 className="ui-section-title">Lo que vamos a ir trabajando</h2>
                        <div className="ui-list" style={{ padding: "4px 16px", borderRadius: 18 }}>
                            {resto.map((concepto) => (
                                <div key={concepto.clave} className="ui-list__item ui-list__item--stack">
                                    <span className="ui-list__item-title">{concepto.nombreTecnico}</span>
                                    <span className="ui-small">{concepto.titulo}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <div className="ui-footer">
                {remedicion ? (
                    <>
                        <Link to="/diagnostico" className="ui-btn">Ver mi antes y después</Link>
                        <Link to="/ruta" className="ui-link-btn">Volver a mi ruta</Link>
                    </>
                ) : esInvitado ? (
                    <>
                        <Link to="/registro" className="ui-btn">Guardar mi punto de partida</Link>
                        <Link to="/ruta" className="ui-link-btn">Seguir sin cuenta</Link>
                    </>
                ) : (
                    <Link to="/ruta" className="ui-btn">Ir a mi ruta</Link>
                )}
            </div>
        </div>
    );
}
