import { Link } from "react-router-dom";
import { BaseCells } from "../components/BaseCells";
import { Loader } from "../components/Loader";
import { TabBar } from "../components/TabBar";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { ETAPAS, MODULO, MODULOS, TOTAL_BASES } from "../data/modulos";
import { armarRuta } from "../data/puntoDePartida";
import { useAbrirModulo } from "../hooks/useAbrirModulo";
import { diasDesde, fechaCorta, fechaRelativa } from "../utils/fechas";

// A los 60 días del primer punto de partida (o al completar una etapa) se invita a rehacerlo.
const DIAS_PARA_REMEDIR = 60;

export function Ruta() {
    const { user } = useAuth();
    const { catalogo, listo, esInvitado, historial, puntoDePartida, construidos, pausados } = useAppData();
    const { abrir, hojaDeRequisitos } = useAbrirModulo();

    if (!listo) return <Loader />;

    const ruta = armarRuta(puntoDePartida?.respuestas ?? null, catalogo?.conceptos ?? [], construidos);
    const cantidad = Object.keys(construidos).length;
    const siguiente = ruta.siguiente ? MODULO[ruta.siguiente] : null;
    const siguienteEnPausa = siguiente && pausados[siguiente.id];
    const nombre = user?.nombre.split(/\s+/)[0];

    const etapaCompleta = ETAPAS.some((etapa) =>
        MODULOS.filter((m) => m.etapa === etapa.numero && !m.pronto).every((m) => construidos[m.id])
    );
    const invitarARemedir = !esInvitado && historial.length === 1
        && (diasDesde(historial[0].fecha) >= DIAS_PARA_REMEDIR || etapaCompleta);
    const puedeComparar = historial.length >= 2 && cantidad >= 3;

    const etiqueta = (modulo) => {
        const hecho = Boolean(construidos[modulo.id]);

        if (modulo.pronto) return { texto: "Muy pronto" };
        if (modulo.id === siguiente?.id) return { texto: "Próximo", clase: "ui-tag--dark" };
        if (pausados[modulo.id]) return { texto: "En pausa" };
        if (ruta.prioritarios.includes(modulo.id) && !hecho) return { texto: "En tu ruta", clase: "ui-tag--teal" };
        if (modulo.integra && !hecho) return { texto: "Precargado" };
        return null;
    };

    return (
        <div className="ui-screen ui-fade">
            <div className="ui-body ui-body--tabbed" style={{ paddingTop: 20 }}>
                <div className="ui-greeting">
                    <div className="ui-stack ui-stack--xs">
                        <img src="/img/logo-azenza.svg" alt="Azenza" className="ui-logo ui-logo--sm" />
                        <h1 className="ui-title ui-title--lg" style={{ marginTop: 6 }}>
                            {nombre ? `Hola, ${nombre}` : "Hola"}
                        </h1>
                    </div>
                    {nombre && (
                        <Link to="/cuenta" className="ui-avatar" aria-label="Tu cuenta">
                            {nombre.charAt(0).toUpperCase()}
                        </Link>
                    )}
                </div>

                <div className="ui-card ui-card--lg" style={{ gap: 14 }}>
                    <span style={{ fontSize: 17, lineHeight: 1.35, fontWeight: 600, textWrap: "pretty" }}>
                        Ya tenés <b style={{ fontWeight: 800, color: "var(--ui-teal)" }}>{cantidad} de las {TOTAL_BASES}</b> bases
                        de tu negocio por escrito.
                    </span>
                    <BaseCells construidos={construidos} />
                </div>

                {!puntoDePartida && (
                    <div className="ui-card ui-card--lg ui-card--soft">
                        <span className="ui-card__title">Armá tu ruta</span>
                        <span className="ui-card__text">
                            Respondé 8 preguntas cortas y te mostramos por dónde te conviene empezar.
                        </span>
                        <Link to="/punto-de-partida" className="ui-btn ui-btn--inline">Hacer mi punto de partida</Link>
                    </div>
                )}

                {puntoDePartida && esInvitado && (
                    <div className="ui-card ui-card--outline">
                        <span className="ui-card__text" style={{ color: "var(--ui-text)" }}>
                            Tu ruta y lo que construyas están solo en este dispositivo.
                        </span>
                        <Link to="/registro" className="ui-btn ui-btn--inline ui-btn--small">Crear cuenta para guardar</Link>
                    </div>
                )}

                {invitarARemedir && (
                    <div className="ui-card ui-card--lg ui-card--soft">
                        <span className="ui-card__title">
                            {etapaCompleta ? "Completaste una etapa" : `Pasaron ${DIAS_PARA_REMEDIR} días`}
                        </span>
                        <span className="ui-card__text">
                            Rehacé tu punto de partida y mirá cuánto cambió desde el primer día.
                        </span>
                        <Link to="/punto-de-partida" className="ui-btn ui-btn--inline">Rehacer mi punto de partida</Link>
                    </div>
                )}

                {siguiente ? (
                    <div className="ui-card ui-card--dark">
                        <span className="ui-card__label">Tu próximo paso</span>
                        <span className="ui-card__big">{siguiente.nombre}</span>
                        <span className="ui-card__text">{siguiente.construye}</span>
                        <div className="ui-card__row">
                            <span className="ui-card__meta">
                                {siguienteEnPausa
                                    ? "En pausa · seguís donde lo dejaste"
                                    : `Unos ${siguiente.minutos} minutos · Etapa ${siguiente.etapa}`}
                            </span>
                            <button
                                type="button"
                                className="ui-btn ui-btn--light"
                                style={{ flex: "none", width: "auto", height: 48, padding: "0 22px", borderRadius: 14, fontSize: 16 }}
                                onClick={() => abrir(siguiente.id)}
                            >
                                {siguienteEnPausa ? "Seguir" : "Empezar"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="ui-card ui-card--dark" style={{ gap: 6 }}>
                        <span style={{ fontSize: 22, fontWeight: 800 }}>Recorriste toda tu ruta.</span>
                        <span className="ui-card__text">
                            Todo lo que construiste está en Tu negocio. Volvé a cualquier módulo cuando quieras mejorarlo.
                        </span>
                    </div>
                )}

                {puedeComparar && (
                    <Link to="/diagnostico" className="ui-row-link" style={{ textDecoration: "none", color: "inherit" }}>
                        <span className="ui-stack ui-stack--xs" style={{ flex: 1 }}>
                            <span style={{ fontSize: 16, fontWeight: 800 }}>Tu antes y después</span>
                            <span className="ui-small">
                                Rehiciste tu punto de partida el {fechaCorta(historial.at(-1).fecha)}. Mirá cuánto cambió
                                desde el {fechaCorta(historial[0].fecha)}.
                            </span>
                        </span>
                        <span className="ui-chevron" aria-hidden="true" />
                    </Link>
                )}

                <p className="ui-small">
                    La ruta sale de tu punto de partida. Igual podés abrir cualquier módulo, en el orden que necesites.
                </p>

                {ETAPAS.map((etapa) => {
                    const modulos = MODULOS.filter((m) => m.etapa === etapa.numero);

                    return (
                        <section key={etapa.numero} className="ui-stack ui-stack--md">
                            <div className="ui-stage__head">
                                <div className="ui-stack ui-stack--xs" style={{ gap: 2 }}>
                                    <span className="ui-card__label">Etapa {etapa.numero}</span>
                                    <h2 className="ui-stage__name">{etapa.nombre}</h2>
                                </div>
                                <span className="ui-stage__count">
                                    {modulos.filter((m) => construidos[m.id]).length} de {modulos.length}
                                </span>
                            </div>

                            <div className="ui-stage__mods">
                                {modulos.map((modulo) => {
                                    const hecho = construidos[modulo.id];
                                    const esSiguiente = modulo.id === siguiente?.id;
                                    const tag = etiqueta(modulo);

                                    return (
                                        <button key={modulo.id} type="button" className="ui-mod" onClick={() => abrir(modulo.id)}>
                                            <span
                                                className={`ui-mod__state${hecho ? " ui-mod__state--done" : esSiguiente ? " ui-mod__state--next" : ""}`}
                                                aria-hidden="true"
                                            />
                                            <span className="ui-mod__text">
                                                <span className="ui-mod__name">{modulo.nombre}</span>
                                                <span className="ui-mod__sub">
                                                    {hecho ? `Guardado ${fechaRelativa(hecho.guardadoAt)}` : modulo.construye}
                                                </span>
                                            </span>
                                            {tag && <span className={`ui-tag ${tag.clase ?? ""}`}>{tag.texto}</span>}
                                            <span className="ui-chevron ui-chevron--muted" aria-hidden="true" />
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            <TabBar />

            {hojaDeRequisitos}
        </div>
    );
}
