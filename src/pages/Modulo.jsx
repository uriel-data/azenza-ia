import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { BaseCells } from "../components/BaseCells";
import { Loader } from "../components/Loader";
import { ModuleField } from "../components/ModuleField";
import { useAppData } from "../context/AppDataContext";
import { useToast } from "../context/ToastContext";
import { MODULO, TOTAL_BASES, calcularPrecio } from "../data/modulos";
import { armarRuta } from "../data/puntoDePartida";
import {
    NOMBRE_PROFUNDIDAD,
    contextoDe,
    datoDeNegocio,
    pantallaCompleta,
    pantallasDe,
    precargar,
    profundidadPara,
    valoresParaMejorar,
} from "../data/recorrido";
import { useAbrirModulo } from "../hooks/useAbrirModulo";
import { entero, pesos } from "../utils/texto";
import { fechaRelativa } from "../utils/fechas";

const EN_EJERCICIO = ["problema", "explicacion", "paso", "mejorar"];

// Se monta de nuevo en cada apertura (location.key), así "Rehacer el ejercicio"
// arranca de cero. location.state.profundidad fuerza la profundidad.
export function Modulo() {
    const { id } = useParams();
    const location = useLocation();
    const { listo } = useAppData();
    const modulo = MODULO[id];

    if (!modulo || modulo.pronto) return <Navigate to="/ruta" replace />;
    if (!listo) return <Loader />;

    return (
        <PantallaModulo
            key={`${id}-${location.key}`}
            modulo={modulo}
            profundidadForzada={location.state?.profundidad}
        />
    );
}

/**
 * Por dónde arranca: si lo dejó en pausa, ahí; si ya lo construyó, en el resultado;
 * si no, en la primera pantalla de la profundidad que le corresponde.
 */
function estadoInicial(modulo, { construidos, pausados, respuestas, profundidadForzada }) {
    const ctx = contextoDe(construidos);
    const pausa = !profundidadForzada && pausados[modulo.id];
    const profundidad = profundidadForzada || pausa?.profundidad || profundidadPara(modulo, respuestas);
    const pantallas = pantallasDe(modulo, profundidad);

    if (!pausa && !profundidadForzada && construidos[modulo.id]) {
        return {
            profundidad,
            paso: pantallas.findIndex((p) => p.tipo === "resultado"),
            valores: { ...construidos[modulo.id].valores },
            desdeConstruido: true,
        };
    }

    let valores = pausa ? { ...pausa.valores } : {};

    if (profundidad === "C" && !pausa) {
        valores = { ...valoresParaMejorar(modulo, respuestas), ...valores };
    }

    const paso = Math.min(pausa ? pausa.paso : 0, pantallas.length - 1);

    return {
        profundidad,
        paso,
        valores: precargar(modulo, pantallas[paso], valores, ctx),
        desdeConstruido: false,
    };
}

function PantallaModulo({ modulo, profundidadForzada }) {
    const {
        catalogo, construidos, pausados, puntoDePartida, esInvitado, guardarModulo, pausarModulo, editarTarjeta,
    } = useAppData();
    const navigate = useNavigate();
    const avisar = useToast();
    const { abrir, hojaDeRequisitos } = useAbrirModulo();
    const respuestas = puntoDePartida?.respuestas ?? null;

    const [estado, setEstado] = useState(() =>
        estadoInicial(modulo, { construidos, pausados, respuestas, profundidadForzada })
    );
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    // Edición en línea de una fila del resultado: { indice, texto } o null.
    const [edicion, setEdicion] = useState(null);

    const ctx = contextoDe(construidos);
    const pantallas = pantallasDe(modulo, estado.profundidad);
    const actual = pantallas[estado.paso] ?? pantallas[0];
    const enEjercicio = EN_EJERCICIO.includes(actual.tipo);
    const construido = construidos[modulo.id];
    const pasosDelEjercicio = pantallas.filter((p) => p.tipo === "paso");
    const paso = actual.tipo === "paso" ? modulo.pasos[actual.i] : null;
    const posicion = paso ? pasosDelEjercicio.findIndex((p) => p.i === actual.i) : 0;
    const ultimoPaso = pantallas[estado.paso + 1]?.tipo === "resultado";
    const completa = pantallaCompleta(modulo, actual, estado.valores);

    const cambiarValor = (clave, valor) =>
        setEstado((anterior) => ({ ...anterior, valores: { ...anterior.valores, [clave]: valor } }));

    // ─── Navegación ──────────────────────────────────────────────

    const avanzar = async () => {
        if (!completa || guardando) return;

        if (actual.tipo === "resultado") {
            setEdicion(null);
            setEstado((anterior) => ({ ...anterior, paso: anterior.paso + 1 }));
            return;
        }

        let valores = { ...estado.valores };

        // Lo que mejoró pasa a ser el campo principal del módulo.
        if (actual.tipo === "mejorar" && modulo.clavePrincipal) {
            valores[modulo.clavePrincipal] = valores.mejorado;
        }

        const proximo = estado.paso + 1;

        if (pantallas[proximo].tipo === "resultado") {
            setGuardando(true);
            setError("");

            try {
                const guardado = await guardarModulo(modulo.id, valores, modulo.armarFilas(valores));
                valores = guardado.valores;
            } catch (err) {
                setError(err.message);
                setGuardando(false);
                return;
            }

            setGuardando(false);
            setEstado((anterior) => ({ ...anterior, paso: proximo, valores, desdeConstruido: false }));
            return;
        }

        setEstado((anterior) => ({
            ...anterior,
            paso: proximo,
            valores: precargar(modulo, pantallas[proximo], valores, ctx),
        }));
    };

    const pausar = async () => {
        // Sin nada escrito no hay nada que guardar.
        if (estado.paso === 0 && Object.keys(estado.valores).length === 0) {
            navigate("/ruta");
            return;
        }

        try {
            await pausarModulo(modulo.id, {
                paso: estado.paso,
                profundidad: estado.profundidad,
                valores: estado.valores,
            });
        } catch (err) {
            setError(err.message);
            return;
        }

        navigate("/ruta");
        avisar("Lo dejamos en pausa. Seguís cuando quieras.");
    };

    const salir = () => {
        if (estado.paso > 0 && !estado.desdeConstruido && enEjercicio) {
            pausar();
            return;
        }

        navigate("/ruta");
    };

    const atras = () => {
        if (estado.paso === 0 || estado.desdeConstruido || actual.tipo === "resultado") {
            salir();
            return;
        }

        setError("");
        setEstado((anterior) => ({ ...anterior, paso: anterior.paso - 1 }));
    };

    // El nivel no encierra: siempre se puede pasar a la versión completa o a la corta.
    const cambiarProfundidad = () => {
        const nueva = estado.profundidad === "A" ? "B" : "A";
        const nuevas = pantallasDe(modulo, nueva);
        const pasoNuevo = nueva === "A" ? 0 : Math.max(0, nuevas.findIndex((p) => p.tipo === "paso"));

        setEstado((anterior) => ({
            ...anterior,
            profundidad: nueva,
            paso: pasoNuevo,
            valores: precargar(modulo, nuevas[pasoNuevo], anterior.valores, ctx),
        }));
    };

    const rehacer = () =>
        navigate(`/modulo/${modulo.id}`, { state: { profundidad: profundidadPara(modulo, respuestas) } });

    const terminarEdicion = async () => {
        const filas = construido.filas.map((fila, i) => (i === edicion.indice ? { ...fila, texto: edicion.texto } : fila));

        try {
            await editarTarjeta(modulo.id, filas);
            setEdicion(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // ─── Lo que sigue ────────────────────────────────────────────

    const ruta = armarRuta(respuestas, catalogo?.conceptos ?? [], construidos);
    const sugerido = modulo.siguiente && !construidos[modulo.siguiente.id] ? modulo.siguiente.id : null;
    const siguienteId = sugerido ?? ruta.orden.find((id) => !construidos[id] && id !== modulo.id) ?? null;
    const siguiente = siguienteId ? MODULO[siguienteId] : null;

    const textoBoton = {
        problema: "Seguir",
        explicacion: "Hacer el ejercicio",
        paso: ultimoPaso ? "Ver mi resultado" : "Siguiente",
        mejorar: modulo.calculadora ? "Calcularlo con mis números" : "Guardar mi versión",
        resultado: "Seguir",
    }[actual.tipo];

    return (
        <div className="ui-screen">
            <div className="ui-topbar">
                <BackButton onClick={atras} />
                <div className="ui-topbar__middle">
                    <span className="ui-topbar__label">{modulo.nombre}</span>
                    {actual.tipo !== "siguiente" && (
                        <div className="ui-segs" aria-hidden="true">
                            {pantallas.filter((p) => p.tipo !== "siguiente").map((_, i) => (
                                <span key={i} className={`ui-segs__seg${i <= estado.paso ? " ui-segs__seg--on" : ""}`} />
                            ))}
                        </div>
                    )}
                </div>
                {enEjercicio && (
                    <button type="button" className="ui-link-btn ui-link-btn--sm" onClick={pausar}>Pausar</button>
                )}
            </div>

            <div key={`${estado.profundidad}-${estado.paso}`} className="ui-body ui-in" style={{ gap: 20 }}>
                {enEjercicio && modulo.problema && (
                    <div className="ui-depth">
                        <span className="ui-tag">{NOMBRE_PROFUNDIDAD[estado.profundidad]}</span>
                        <button type="button" className="ui-depth__toggle" onClick={cambiarProfundidad}>
                            {estado.profundidad === "A" ? "Ya sé qué es: versión corta" : "Ver la versión completa"}
                        </button>
                    </div>
                )}

                {actual.tipo === "problema" && (
                    <>
                        <div className="ui-stack">
                            <span className="ui-eyebrow">El problema</span>
                            <h1 className="ui-title">{modulo.problema.titulo}</h1>
                        </div>
                        <div className="ui-stack ui-stack--md">
                            <div className="ui-card">
                                <span className="ui-contrast ui-contrast--off">Un negocio sin esto</span>
                                <span style={{ fontSize: 17, lineHeight: 1.45, color: "var(--ui-text-soft)" }}>{modulo.problema.sin}</span>
                            </div>
                            <div className="ui-card ui-card--soft">
                                <span className="ui-contrast">Un negocio con esto</span>
                                <span style={{ fontSize: 17, lineHeight: 1.45, fontWeight: 600 }}>{modulo.problema.con}</span>
                            </div>
                        </div>
                        <span className="ui-note">Los dos son ejemplos inventados.</span>
                    </>
                )}

                {actual.tipo === "explicacion" && (
                    <>
                        <div className="ui-stack">
                            <div className="ui-chips" style={{ alignItems: "center" }}>
                                <span className="ui-eyebrow">El concepto</span>
                                <span className="ui-term">{modulo.explicacion.termino}</span>
                            </div>
                            <h1 className="ui-title" style={{ fontSize: 26, lineHeight: 1.15 }}>{modulo.explicacion.titulo}</h1>
                            <p className="ui-lead">{modulo.explicacion.texto}</p>
                        </div>
                        <div className="ui-card" style={{ gap: 8 }}>
                            <span className="ui-card__label">{modulo.explicacion.ejemploEtiqueta}</span>
                            <span style={{ fontSize: 17, lineHeight: 1.45 }}>{modulo.explicacion.ejemplo}</span>
                        </div>
                    </>
                )}

                {actual.tipo === "paso" && (
                    <>
                        {estado.profundidad !== "A" && pasosDelEjercicio.length > 1 && (
                            <div className="ui-method" aria-hidden="true">
                                {pasosDelEjercicio.map((p) => (
                                    <span key={p.i} className={`ui-method__step${p.i === actual.i ? " ui-method__step--on" : ""}`}>
                                        {modulo.pasos[p.i].corto}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="ui-stack ui-stack--md">
                            {estado.profundidad === "A" && pasosDelEjercicio.length > 1 && (
                                <span className="ui-eyebrow">Pregunta {posicion + 1} de {pasosDelEjercicio.length}</span>
                            )}
                            <h1 className="ui-title ui-title--md">{paso.pregunta}</h1>
                            {paso.ayuda && <p className="ui-lead" style={{ fontSize: 16 }}>{paso.ayuda}</p>}
                        </div>

                        {posicion === 0 && modulo.tarjetaContexto && ctx[modulo.tarjetaContexto.clave] && (
                            <div className="ui-card ui-card--soft" style={{ borderRadius: 18, padding: "14px 16px", gap: 4 }}>
                                <span className="ui-card__label ui-card__label--teal">{modulo.tarjetaContexto.etiqueta}</span>
                                <span style={{ fontSize: 15.5, lineHeight: 1.45 }}>{ctx[modulo.tarjetaContexto.clave]}</span>
                            </div>
                        )}

                        <div className="ui-stack" style={{ gap: 18 }}>
                            {paso.campos.map((campo) => (
                                <ModuleField
                                    key={campo.clave}
                                    campo={campo}
                                    valor={estado.valores[campo.clave]}
                                    fromNegocio={Boolean(datoDeNegocio(campo, ctx))}
                                    alto={paso.unaPagina ? 88 : 128}
                                    onChange={(valor) => cambiarValor(campo.clave, valor)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {actual.tipo === "mejorar" && (
                    <>
                        <div className="ui-stack ui-stack--md">
                            <h1 className="ui-title ui-title--md">{modulo.tituloMejorar}</h1>
                            <p className="ui-lead" style={{ fontSize: 16 }}>
                                Partimos de lo que ya escribiste. No hace falta rehacerlo: miralo con estos criterios y
                                cambiá solo lo que haga falta.
                            </p>
                        </div>
                        <div className="ui-card" style={{ padding: "16px 18px", gap: 6 }}>
                            <span className="ui-card__label">Lo que escribiste en tu punto de partida</span>
                            <span style={{ fontSize: 16.5, lineHeight: 1.45 }}>“{estado.valores.original}”</span>
                        </div>
                        <section className="ui-stack ui-stack--md">
                            <h2 className="ui-section-title">Los criterios</h2>
                            <div className="ui-grouped" style={{ borderRadius: 20 }}>
                                {modulo.criterios.map((c, i) => (
                                    <div key={c.criterio} className="ui-grouped__item ui-numbered" style={{ flexDirection: "row", padding: "14px 16px" }}>
                                        <span className="ui-num">{i + 1}</span>
                                        <span className="ui-stack ui-stack--xs" style={{ gap: 3, paddingTop: 3, fontSize: "inherit" }}>
                                            <span style={{ fontSize: 15.5, lineHeight: 1.35, fontWeight: 700 }}>{c.criterio}</span>
                                            <span className="ui-small">{c.ayuda}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <div className="ui-field">
                            <label className="ui-field__label" htmlFor="campo-mejorado">Tu versión</label>
                            <textarea
                                id="campo-mejorado"
                                className="ui-textarea"
                                rows={4}
                                style={{ minHeight: 128, lineHeight: 1.45 }}
                                value={estado.valores.mejorado ?? ""}
                                onChange={(e) => cambiarValor("mejorado", e.target.value)}
                            />
                        </div>
                    </>
                )}

                {actual.tipo === "resultado" && construido && (
                    <>
                        <div className="ui-stack ui-stack--md">
                            <span className="ui-eyebrow">Guardado en Tu negocio · {fechaRelativa(construido.guardadoAt)}</span>
                            <h1 className="ui-title ui-title--lg">{modulo.tituloResultado ?? `${modulo.nombre}, por escrito.`}</h1>
                        </div>

                        {modulo.id === "precios" && <ResultadoPrecio valores={construido.valores} />}

                        <div className="ui-stack ui-stack--md">
                            {construido.filas.map((fila, i) => (
                                <div key={i} className="ui-card" style={{ borderRadius: 18, padding: "14px 16px 16px", gap: 6 }}>
                                    <div className="ui-field__head" style={{ minHeight: 32 }}>
                                        <span className="ui-card__label ui-card__label--teal">{fila.etiqueta}</span>
                                        {edicion?.indice === i ? (
                                            <button type="button" className="ui-mini-btn ui-mini-btn--dark" onClick={terminarEdicion}>Listo</button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="ui-mini-btn"
                                                disabled={Boolean(edicion)}
                                                onClick={() => setEdicion({ indice: i, texto: fila.texto })}
                                            >
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                    {edicion?.indice === i ? (
                                        <textarea
                                            className="ui-textarea"
                                            rows={3}
                                            aria-label={fila.etiqueta}
                                            style={{ borderColor: "var(--ui-teal)", lineHeight: 1.45 }}
                                            value={edicion.texto}
                                            onChange={(e) => setEdicion({ indice: i, texto: e.target.value })}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 16.5, lineHeight: 1.45, textWrap: "pretty" }}>{fila.texto}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {esInvitado && (
                            <div className="ui-card ui-card--outline">
                                <span className="ui-card__text" style={{ color: "var(--ui-text)" }}>
                                    Lo que construiste está solo en este dispositivo.
                                </span>
                                <Link
                                    to="/registro"
                                    state={{ from: `/modulo/${modulo.id}`, motivo: "modulo" }}
                                    className="ui-btn ui-btn--inline ui-btn--small ui-btn--outline"
                                >
                                    Crear cuenta para guardar
                                </Link>
                            </div>
                        )}

                        <Link
                            to={`/consultor?modulo=${modulo.id}`}
                            className="ui-row-link"
                            style={{ textDecoration: "none", color: "inherit" }}
                        >
                            <span className="ui-stack ui-stack--xs" style={{ flex: 1 }}>
                                <span style={{ fontSize: 16, fontWeight: 800 }}>Pedir una revisión</span>
                                <span className="ui-small">
                                    Opcional. Una IA lo lee con los criterios del módulo y te sugiere mejoras.
                                </span>
                            </span>
                            <span className="ui-chevron" aria-hidden="true" />
                        </Link>

                        {estado.desdeConstruido && (
                            <button type="button" className="ui-link-btn" style={{ alignSelf: "center", fontSize: 15 }} onClick={rehacer}>
                                Rehacer el ejercicio
                            </button>
                        )}
                    </>
                )}

                {actual.tipo === "siguiente" && (
                    <>
                        <div className="ui-card ui-card--lg" style={{ gap: 14 }}>
                            <span style={{ fontSize: 17, lineHeight: 1.35, fontWeight: 600 }}>
                                Ya tenés <b style={{ fontWeight: 800, color: "var(--ui-teal)" }}>{Object.keys(construidos).length} de las {TOTAL_BASES}</b> bases
                                de tu negocio por escrito.
                            </span>
                            <BaseCells construidos={construidos} />
                        </div>

                        {siguiente ? (
                            <>
                                <div className="ui-stack ui-stack--sm" style={{ padding: "0 4px" }}>
                                    <h2 className="ui-section-title">Lo que sigue</h2>
                                    <p className="ui-lead" style={{ fontSize: 16 }}>
                                        {siguienteId === sugerido ? modulo.siguiente.porque : "Es lo que sigue en tu ruta."}
                                    </p>
                                </div>
                                <div className="ui-card ui-card--dark">
                                    <span className="ui-card__label">Tu próximo paso</span>
                                    <span className="ui-card__big">{siguiente.nombre}</span>
                                    <span className="ui-card__text">{siguiente.construye}</span>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn--light ui-btn--inline"
                                        style={{ marginTop: 8, padding: "0 22px" }}
                                        onClick={() => abrir(siguiente.id)}
                                    >
                                        Empezar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="ui-card ui-card--dark" style={{ gap: 6 }}>
                                <span style={{ fontSize: 22, fontWeight: 800 }}>Recorriste toda tu ruta.</span>
                                <span className="ui-card__text">
                                    Todo lo que construiste está en Tu negocio. Volvé a cualquier módulo cuando quieras mejorarlo.
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {actual.tipo === "siguiente" ? (
                <div className="ui-footer">
                    <Link to="/negocio" className="ui-btn ui-btn--outline">Ver Tu negocio</Link>
                    <Link to="/ruta" className="ui-link-btn">Volver a mi ruta</Link>
                </div>
            ) : (
                <div className="ui-footer">
                    {error && <p className="ui-footer__error" role="alert">{error}</p>}
                    <button type="button" className="ui-btn" disabled={!completa || guardando || Boolean(edicion)} onClick={avanzar}>
                        {guardando ? "Guardando…" : textoBoton}
                    </button>
                </div>
            )}

            {hojaDeRequisitos}
        </div>
    );
}

/** El precio sugerido, con la barra de cómo se compone. */
function ResultadoPrecio({ valores }) {
    const c = calcularPrecio(valores);
    const actual = entero(valores.actual);
    const diferencia = actual - c.costo;
    const partes = [
        ["Materiales", c.materiales, "#003333"],
        ["Tu tiempo", c.tiempo, "#2F7A72"],
        ["Otros gastos", c.otros, "#7FB3AB"],
        ["Ganancia", c.ganancia, "#CFE3DF"],
    ];

    let comparacion = "";
    if (actual > 0) {
        comparacion = diferencia < 0
            ? `Con tu precio actual (${pesos(actual)}) no llegás a cubrir lo que te cuesta: te faltan ${pesos(-diferencia)} por unidad.`
            : actual < c.precio
                ? `Con tu precio actual (${pesos(actual)}) cubrís materiales, gastos y tu hora, y te quedan ${pesos(diferencia)} de ganancia por unidad.`
                : `Tu precio actual (${pesos(actual)}) ya cubre todo y te deja ${pesos(diferencia)} por unidad.`;
    }

    return (
        <>
            <div className="ui-card ui-card--lg" style={{ padding: "20px 18px", gap: 16 }}>
                <div className="ui-stack ui-stack--sm" style={{ gap: 6 }}>
                    <span className="ui-card__label">Precio sugerido</span>
                    <span className="ui-pct__number">{pesos(c.precio)}</span>
                    <span className="ui-small" style={{ fontSize: 14.5 }}>
                        Te cuesta {pesos(c.costo)} y le sumás {c.margen}% de ganancia.
                    </span>
                </div>
                <div className="ui-bar" aria-hidden="true">
                    {partes.map(([nombre, monto, color]) => (
                        <span key={nombre} style={{ width: `${c.precio ? (monto / c.precio) * 100 : 0}%`, background: color }} />
                    ))}
                </div>
                <div className="ui-stack ui-stack--md">
                    {partes.map(([nombre, monto, color]) => (
                        <div key={nombre} className="ui-legend">
                            <span className="ui-legend__swatch" style={{ background: color }} />
                            <span style={{ flex: 1 }}>{nombre}</span>
                            <span className="ui-legend__value">{pesos(monto)}</span>
                        </div>
                    ))}
                </div>
            </div>
            {comparacion && (
                <div className="ui-card ui-card--soft" style={{ borderRadius: 18, padding: "14px 16px", fontSize: 15.5, lineHeight: 1.45 }}>
                    {comparacion}
                </div>
            )}
        </>
    );
}
