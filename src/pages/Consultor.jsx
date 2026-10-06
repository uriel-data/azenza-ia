import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { Loader } from "../components/Loader";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { CRITERIOS_GENERICOS, MODULO } from "../data/modulos";
import { useUsoConsultor } from "../hooks/useUsoConsultor";
import { api } from "../utils/api";

const SUGERENCIAS = [
    "¿Qué publico esta semana?",
    "¿Cómo le explico mi precio a una clienta que dice que es caro?",
    "¿Qué me conviene hacer primero?",
];

const MAX_PREGUNTA = 500;

/**
 * Consultor IA. Con ?modulo=id revisa lo que construyó en ese módulo; sin él, responde
 * una pregunta libre sobre Tu negocio. Lo responde el backend con OpenAI, con un límite
 * diario por usuario. Nunca pone notas ni reescribe por el usuario.
 */
export function Consultor() {
    const { user, cargando } = useAuth();
    const { listo, construidos } = useAppData();
    const [params] = useSearchParams();
    const moduloId = params.get("modulo");
    const modulo = moduloId ? MODULO[moduloId] : null;

    if (moduloId && (!modulo || (listo && !construidos[moduloId]))) return <Navigate to="/negocio" replace />;
    if (cargando || (user && !listo)) return <Loader />;

    // key: pasar de una revisión a una pregunta (misma ruta) arranca de cero.
    return <PantallaConsultor key={moduloId ?? "pregunta"} modulo={modulo} esInvitado={!user} construidos={construidos} />;
}

function PantallaConsultor({ modulo, esInvitado, construidos }) {
    const navigate = useNavigate();
    const [uso, setUso] = useUsoConsultor();
    // idle | cargando | listo | error
    const [estado, setEstado] = useState("idle");
    const [pregunta, setPregunta] = useState("");
    const [revision, setRevision] = useState(null);
    const [respuesta, setRespuesta] = useState("");
    const [error, setError] = useState("");

    const esRevision = Boolean(modulo);
    const volverA = esRevision ? `/modulo/${modulo.id}` : "/negocio";
    const textoVolver = esRevision ? "Volver al módulo" : "Volver a Tu negocio";
    const apagado = uso && !uso.activo;
    const sinCupo = uso?.quedan === 0;
    const criterios = modulo ? modulo.criterios ?? CRITERIOS_GENERICOS : [];

    const consultar = async () => {
        if (estado === "cargando" || sinCupo || (!esRevision && !pregunta.trim())) return;

        setEstado("cargando");
        setError("");

        try {
            if (esRevision) {
                const data = await api("/consultor/revision", { method: "POST", body: { modulo: modulo.id } });
                setRevision(data.revision);
                setUso(data.uso);
            } else {
                const data = await api("/consultor/pregunta", { method: "POST", body: { pregunta: pregunta.trim() } });
                setRespuesta(data.respuesta);
                setUso(data.uso);
            }

            setEstado("listo");
        } catch (err) {
            if (err.status === 429) {
                // Se quedó sin cupo entre que abrió la pantalla y pidió la consulta.
                setUso((anterior) => (anterior ? { ...anterior, quedan: 0 } : anterior));
                setEstado("idle");
                return;
            }

            setError(err.message);
            setEstado("error");
        }
    };

    const otraPregunta = () => {
        setPregunta("");
        setRespuesta("");
        setEstado("idle");
    };

    const quedanTexto = uso
        ? `${uso.quedan} de ${uso.limite} ${esRevision ? "revisiones" : "consultas"} disponibles hoy`
        : "";

    let boton;
    if (esInvitado) boton = null;
    else if (apagado || estado === "error") boton = { texto: textoVolver, accion: () => navigate(volverA) };
    else if (estado === "cargando") boton = { texto: "Leyendo…", deshabilitado: true };
    else if (estado === "listo") boton = esRevision
        ? { texto: "Volver al módulo", accion: () => navigate(volverA) }
        : { texto: "Hacer otra pregunta", accion: otraPregunta };
    else boton = {
        texto: esRevision ? "Pedir revisión" : "Preguntar",
        accion: consultar,
        deshabilitado: !uso || sinCupo || (!esRevision && !pregunta.trim()),
    };

    return (
        <div className="ui-screen ui-in">
            <div className="ui-topbar ui-topbar--line">
                <BackButton onClick={() => navigate(volverA)} />
                <span className="ui-ia" aria-hidden="true">IA</span>
                <div className="ui-stack ui-stack--xs" style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>Consultor IA</span>
                    <span className="ui-small" style={{ fontSize: 13 }}>Responde una IA, no una persona</span>
                </div>
            </div>

            <div className="ui-body" style={{ paddingTop: 20, gap: 18 }} aria-live="polite">
                {esInvitado && (
                    <div className="ui-card ui-card--lg" style={{ padding: 20 }}>
                        <span className="ui-card__title">Para usar el Consultor necesitás una cuenta</span>
                        <span className="ui-card__text">
                            Lee lo que guardaste en Tu negocio y te sugiere qué mejorar. Con tu cuenta, además, lo que
                            construiste queda guardado.
                        </span>
                        <Link
                            to="/registro"
                            state={{ from: esRevision ? `/consultor?modulo=${modulo.id}` : "/consultor", motivo: "modulo" }}
                            className="ui-btn ui-btn--inline"
                        >
                            Crear cuenta
                        </Link>
                    </div>
                )}

                {!esInvitado && apagado && (
                    <div className="ui-card ui-card--lg" style={{ padding: 20 }}>
                        <span className="ui-card__title">El Consultor está apagado por ahora</span>
                        <span className="ui-card__text">
                            Todo lo demás sigue funcionando igual: tus módulos, tus cálculos y Tu negocio.
                        </span>
                    </div>
                )}

                {!esInvitado && !apagado && estado === "idle" && esRevision && (
                    <>
                        <div className="ui-stack ui-stack--md">
                            <span className="ui-eyebrow">Pedir una revisión</span>
                            <h1 className="ui-title">{modulo.nombre}</h1>
                            <p className="ui-lead" style={{ fontSize: 16 }}>
                                Lee lo que construiste y te sugiere qué mejorar. No pone notas y no lo reescribe por vos.
                            </p>
                        </div>
                        <div className="ui-card" style={{ padding: "16px 18px", gap: 12 }}>
                            <span className="ui-card__label">Lo que va a leer</span>
                            {construidos[modulo.id].filas.map((fila, i) => (
                                <div key={i} className="ui-stack ui-stack--xs" style={{ gap: 3 }}>
                                    <span className="ui-card__label ui-card__label--teal">{fila.etiqueta}</span>
                                    <span style={{ fontSize: 15.5, lineHeight: 1.45 }}>{fila.texto}</span>
                                </div>
                            ))}
                        </div>
                        <div className="ui-stack ui-stack--md" style={{ padding: "0 4px" }}>
                            <span style={{ fontSize: 15, fontWeight: 800 }}>Lo mira con estos criterios</span>
                            {criterios.map((c) => (
                                <span key={c.criterio} className="ui-bullet" style={{ fontSize: 15.5, lineHeight: 1.4 }}>{c.criterio}</span>
                            ))}
                        </div>
                    </>
                )}

                {!esInvitado && !apagado && estado === "idle" && !esRevision && (
                    <>
                        <div className="ui-stack ui-stack--md">
                            <h1 className="ui-title">¿Qué querés preguntar?</h1>
                            <p className="ui-lead" style={{ fontSize: 16 }}>
                                Te responde con lo que guardaste en Tu negocio. Si le falta algo, te dice qué módulo lo construye.
                            </p>
                        </div>
                        <div className="ui-stack ui-stack--sm">
                            <span className="ui-card__label" style={{ padding: "0 4px" }}>Para arrancar</span>
                            {SUGERENCIAS.map((texto) => (
                                <button key={texto} type="button" className="ui-suggestion" onClick={() => setPregunta(texto)}>
                                    {texto}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="ui-textarea"
                            rows={3}
                            style={{ minHeight: 104, lineHeight: 1.45 }}
                            placeholder="O escribí tu pregunta"
                            aria-label="Tu pregunta"
                            maxLength={MAX_PREGUNTA}
                            value={pregunta}
                            onChange={(e) => setPregunta(e.target.value)}
                        />
                    </>
                )}

                {!esInvitado && !apagado && estado === "idle" && (
                    <>
                        {quedanTexto && <span className="ui-small" style={{ padding: "0 4px", fontSize: 13.5 }}>{quedanTexto}</span>}
                        {sinCupo && (
                            <div className="ui-card" style={{ background: "var(--ui-subtle)", borderRadius: 16, padding: "14px 16px", fontSize: 15, lineHeight: 1.45 }}>
                                Ya usaste las de hoy. Mañana tenés más; mientras, tus módulos funcionan igual.
                            </div>
                        )}
                    </>
                )}

                {estado === "cargando" && (
                    <div className="ui-stack" style={{ gap: 14 }}>
                        {esRevision
                            ? <span className="ui-small" style={{ fontSize: 15 }}>Leyendo lo que escribiste en {modulo.nombre}…</span>
                            : <div className="ui-bubble ui-bubble--mine">{pregunta}</div>}
                        <div className="ui-bubble ui-typing" role="status" aria-label="El Consultor está escribiendo">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {estado === "listo" && esRevision && revision && (
                    <div className="ui-stack ui-in" style={{ gap: 12 }}>
                        <div className="ui-stack ui-stack--sm" style={{ gap: 6, paddingBottom: 4 }}>
                            <span className="ui-eyebrow">Revisión de {modulo.nombre}</span>
                            <h1 className="ui-title" style={{ fontSize: 26, lineHeight: 1.15 }}>Lo que te sugiere</h1>
                        </div>
                        {revision.funciona && (
                            <div className="ui-card ui-card--soft" style={{ padding: "16px 18px", gap: 6 }}>
                                <span className="ui-card__label" style={{ color: "var(--ui-teal)" }}>Lo que ya funciona</span>
                                <span style={{ fontSize: 16.5, lineHeight: 1.45 }}>{revision.funciona}</span>
                            </div>
                        )}
                        {revision.mejoras.length > 0 && (
                            <>
                                <h2 className="ui-section-title" style={{ marginTop: 8, padding: "0 4px" }}>Qué podrías mejorar</h2>
                                {revision.mejoras.map((mejora, i) => (
                                    <div key={i} className="ui-card ui-numbered" style={{ flexDirection: "row", padding: 16, gap: 12 }}>
                                        <span className="ui-num">{i + 1}</span>
                                        <span className="ui-stack ui-stack--xs" style={{ gap: 4, paddingTop: 3, fontSize: "inherit" }}>
                                            <span className="ui-card__label ui-card__label--teal">{mejora.criterio}</span>
                                            <span style={{ fontSize: 16, lineHeight: 1.45 }}>{mejora.sugerencia}</span>
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                        {revision.pregunta && (
                            <div className="ui-card ui-card--outline" style={{ marginTop: 4, borderRadius: 20, gap: 6 }}>
                                <span className="ui-card__label ui-card__label--teal">Para pensar</span>
                                <span style={{ fontSize: 16.5, lineHeight: 1.45, fontWeight: 600 }}>{revision.pregunta}</span>
                            </div>
                        )}
                        <span className="ui-note" style={{ padding: "4px 4px 0", fontSize: 13.5, lineHeight: 1.45 }}>
                            Lo escribió una IA a partir de lo que guardaste. Vos decidís qué cambiar: tu texto sigue igual en Tu negocio.
                        </span>
                    </div>
                )}

                {estado === "listo" && !esRevision && (
                    <div className="ui-stack" style={{ gap: 14 }}>
                        <div className="ui-bubble ui-bubble--mine">{pregunta}</div>
                        <div className="ui-stack ui-stack--xs ui-in" style={{ alignSelf: "flex-start", maxWidth: "92%", gap: 6 }}>
                            <span className="ui-card__label ui-card__label--teal" style={{ paddingLeft: 4, fontSize: 12.5 }}>Consultor IA</span>
                            <div className="ui-bubble" style={{ maxWidth: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                                {respuesta.split(/\n+/).filter(Boolean).map((parrafo, i) => (
                                    <p key={i} style={{ fontSize: 15.5, lineHeight: 1.5 }}>{parrafo}</p>
                                ))}
                            </div>
                        </div>
                        <span className="ui-note" style={{ padding: "0 4px", fontSize: 13.5, lineHeight: 1.45 }}>
                            Respuesta de una IA, con lo que guardaste en Tu negocio.
                        </span>
                    </div>
                )}

                {estado === "error" && (
                    <div className="ui-card ui-card--lg" style={{ padding: 20 }}>
                        <span className="ui-card__title">No pudimos conectar con el Consultor</span>
                        <span className="ui-card__text">{error}</span>
                    </div>
                )}
            </div>

            {boton && (
                <div className="ui-footer">
                    <button type="button" className="ui-btn" disabled={boton.deshabilitado} onClick={boton.accion}>
                        {boton.texto}
                    </button>
                </div>
            )}
        </div>
    );
}
