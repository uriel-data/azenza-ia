import { Link } from "react-router-dom";
import { Loader } from "../components/Loader";
import { TabBar } from "../components/TabBar";
import { useAppData } from "../context/AppDataContext";
import { ETAPAS, MODULO, MODULOS } from "../data/modulos";
import { armarRuta, entradasConTexto, textoPrincipal } from "../data/puntoDePartida";
import { useAbrirModulo } from "../hooks/useAbrirModulo";
import { diasDesde, fechaCorta } from "../utils/fechas";
import { recortar } from "../utils/texto";

const MINIMO_CONSTRUIDOS = 3;
const DIAS_PARA_REMEDIR = 60;
const FALTANTES_VISIBLES = 4;

/** Cómo se lee una respuesta en el antes y después. */
const resumen = (respuesta, opcionesCortas) => {
    if (!respuesta?.opcion) return "—";
    if (respuesta.opcion !== 3) return opcionesCortas[respuesta.opcion];

    const texto = textoPrincipal(respuesta) || entradasConTexto(respuesta).join(" · ");
    return `Lo tengo: “${recortar(texto, 64)}”`;
};

// Diagnóstico 360°: lo construido, lo que falta y el antes y después del punto de partida.
export function Diagnostico() {
    const { catalogo, listo, historial, puntoDePartida, construidos } = useAppData();
    const { abrir, hojaDeRequisitos } = useAbrirModulo();

    if (!listo) return <Loader />;

    const conceptos = catalogo?.conceptos ?? [];
    const opcionesCortas = catalogo?.opcionesCortas ?? {};
    const cantidad = Object.keys(construidos).length;
    const abierto = cantidad >= MINIMO_CONSTRUIDOS;
    const ruta = armarRuta(puntoDePartida?.respuestas ?? null, conceptos, construidos);
    const faltan = ruta.orden.filter((id) => !construidos[id]);

    const primero = historial[0];
    const ultimo = historial.at(-1);
    const comparacion = historial.length >= 2
        ? conceptos.map((concepto) => {
            const antes = primero.respuestas[concepto.clave];
            const ahora = ultimo.respuestas[concepto.clave];

            return {
                clave: concepto.clave,
                termino: concepto.nombreTecnico,
                antes: resumen(antes, opcionesCortas),
                ahora: resumen(ahora, opcionesCortas),
                cambio: antes?.opcion !== ahora?.opcion,
            };
        })
        : [];

    return (
        <div className="ui-screen ui-fade">
            <div className="ui-body ui-body--tabbed" style={{ paddingTop: 20 }}>
                <div className="ui-stack ui-stack--xs">
                    <img src="/img/logo-azenza.svg" alt="Azenza" className="ui-logo ui-logo--sm" />
                    <h1 className="ui-title ui-title--lg" style={{ marginTop: 16 }}>Diagnóstico 360°</h1>
                    <p className="ui-lead" style={{ fontSize: 16, marginTop: 8 }}>
                        Tu negocio completo, en una vista: lo que construiste, lo que falta y cómo cambió desde el primer día.
                    </p>
                </div>

                {!abierto && (
                    <div className="ui-card ui-card--lg" style={{ padding: 20 }}>
                        <span className="ui-card__title">Se arma cuando hay con qué</span>
                        <span className="ui-card__text" style={{ color: "var(--ui-text-body)" }}>
                            Hoy tenés {cantidad} {cantidad === 1 ? "base" : "bases"} por escrito.
                            Con {MINIMO_CONSTRUIDOS}, el diagnóstico ya tiene con qué armarse.
                        </span>
                    </div>
                )}

                {abierto && (
                    <>
                        <section className="ui-stack ui-stack--md">
                            <h2 className="ui-section-title" style={{ padding: "0 4px" }}>Lo construido</h2>
                            <div className="ui-grouped">
                                {ETAPAS.map((etapa) => {
                                    const modulos = MODULOS.filter((m) => m.etapa === etapa.numero);
                                    const hechos = modulos.filter((m) => construidos[m.id]);

                                    return (
                                        <div key={etapa.numero} className="ui-grouped__item" style={{ gap: 10 }}>
                                            <div className="ui-stage__head" style={{ padding: 0 }}>
                                                <div className="ui-stack ui-stack--xs" style={{ gap: 2 }}>
                                                    <span className="ui-card__label">Etapa {etapa.numero}</span>
                                                    <span className="ui-stage__name" style={{ fontSize: 17 }}>{etapa.nombre}</span>
                                                </div>
                                                <span className="ui-stage__count">{hechos.length} de {modulos.length}</span>
                                            </div>
                                            <div className="ui-cells" aria-hidden="true">
                                                {modulos.map((m) => (
                                                    <span key={m.id} className={`ui-cells__cell${construidos[m.id] ? " ui-cells__cell--done" : ""}`} />
                                                ))}
                                            </div>
                                            <span className="ui-small">
                                                {hechos.length ? hechos.map((m) => m.nombre).join(" · ") : "Todavía nada en esta etapa"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}

                {/* El antes y después no depende de cuánto construyó: se muestra siempre. */}
                <section className="ui-stack ui-stack--md">
                    <h2 className="ui-section-title" style={{ padding: "0 4px" }}>Tu antes y después</h2>

                    {historial.length >= 2 && (
                        <>
                            <p className="ui-small" style={{ padding: "0 4px", fontSize: 15, color: "var(--ui-text-body)" }}>
                                {comparacion.filter((fila) => fila.cambio).length} de {conceptos.length} conceptos
                                cambiaron desde tu primer punto de partida.
                            </p>
                            <div className="ui-grouped">
                                <div className="ui-grouped__item ui-grouped__item--grid" style={{ gap: 8, fontSize: 13, fontWeight: 700, padding: "14px 16px 12px" }}>
                                    <span style={{ color: "var(--ui-text-muted)" }}>Antes · {fechaCorta(primero.fecha)}</span>
                                    <span style={{ color: "var(--ui-teal)" }}>Ahora · {fechaCorta(ultimo.fecha)}</span>
                                </div>
                                {comparacion.map((fila) => (
                                    <div key={fila.clave} className="ui-grouped__item" style={{ gap: 8, padding: "12px 16px 14px" }}>
                                        <span style={{ fontSize: 14.5, fontWeight: 800 }}>{fila.termino}</span>
                                        <div className="ui-compare" style={{ gap: 8 }}>
                                            <span className="ui-versus">{fila.antes}</span>
                                            <span className={`ui-versus${fila.cambio ? " ui-versus--changed" : ""}`}>{fila.ahora}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {historial.length === 1 && (
                        <>
                            <div className="ui-card ui-card--lg ui-card--soft">
                                <span className="ui-card__title">Todavía no hay un después</span>
                                <span className="ui-card__text">
                                    Te vamos a invitar a rehacerlo a los {DIAS_PARA_REMEDIR} días o al completar una etapa.
                                    Faltan {Math.max(0, DIAS_PARA_REMEDIR - diasDesde(primero.fecha))} días.
                                </span>
                                <Link to="/punto-de-partida" className="ui-btn ui-btn--inline">Rehacerlo ahora</Link>
                            </div>
                            <div className="ui-grouped">
                                <div className="ui-grouped__item ui-card__label" style={{ padding: "14px 16px 12px" }}>
                                    Tu punto de partida · {fechaCorta(primero.fecha)}
                                </div>
                                {conceptos.map((concepto) => (
                                    <div key={concepto.clave} className="ui-grouped__item" style={{ gap: 2, padding: "12px 16px" }}>
                                        <span style={{ fontSize: 14.5, fontWeight: 800 }}>{concepto.nombreTecnico}</span>
                                        <span className="ui-small">{resumen(primero.respuestas[concepto.clave], opcionesCortas)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {historial.length === 0 && (
                        <div className="ui-card ui-card--lg ui-card--soft">
                            <span className="ui-card__text">
                                Para ver cómo cambiás, primero hace falta tu punto de partida: 8 preguntas, unos 5 minutos.
                            </span>
                            <Link to="/punto-de-partida" className="ui-btn ui-btn--inline">Hacer mi punto de partida</Link>
                        </div>
                    )}
                </section>

                <section className="ui-stack ui-stack--md">
                    <h2 className="ui-section-title" style={{ padding: "0 4px" }}>Lo que falta</h2>
                    <div className="ui-grouped">
                        {faltan.slice(0, FALTANTES_VISIBLES).map((id) => (
                            <button key={id} type="button" className="ui-grouped__item ui-missing" onClick={() => abrir(id)}>
                                <span className="ui-missing__ring" aria-hidden="true" />
                                <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{MODULO[id].nombre}</span>
                                <span className="ui-chevron ui-chevron--muted" aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                    {faltan.length > FALTANTES_VISIBLES && (
                        <span className="ui-small" style={{ padding: "0 4px" }}>
                            y {faltan.length - FALTANTES_VISIBLES} más en tu ruta
                        </span>
                    )}
                </section>
            </div>

            <TabBar />
            {hojaDeRequisitos}
        </div>
    );
}
