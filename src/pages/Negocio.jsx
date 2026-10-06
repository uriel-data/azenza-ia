import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BottomSheet } from "../components/BottomSheet";
import { Loader } from "../components/Loader";
import { TabBar } from "../components/TabBar";
import { useAppData } from "../context/AppDataContext";
import { useToast } from "../context/ToastContext";
import { MODULOS, TOTAL_BASES } from "../data/modulos";
import { useUsoConsultor } from "../hooks/useUsoConsultor";
import { fechaRelativa } from "../utils/fechas";

// Tu negocio: una tarjeta por cada módulo terminado. Los módulos que vienen leen de acá.
export function Negocio() {
    const { listo, construidos, editarTarjeta } = useAppData();
    const avisar = useToast();
    const navigate = useNavigate();
    const [uso] = useUsoConsultor();
    // Tarjeta en edición: { id, nombre, filas } o null.
    const [edicion, setEdicion] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    if (!listo) return <Loader />;

    const modulos = MODULOS.filter((modulo) => construidos[modulo.id]);
    const nombre = construidos.perfil?.valores?.nombre;

    const editar = (modulo) => {
        setError("");
        setEdicion({ id: modulo.id, nombre: modulo.nombre, filas: construidos[modulo.id].filas.map((fila) => ({ ...fila })) });
    };

    const cambiarFila = (indice, texto) =>
        setEdicion((anterior) => ({
            ...anterior,
            filas: anterior.filas.map((fila, i) => (i === indice ? { ...fila, texto } : fila)),
        }));

    const guardar = async () => {
        setGuardando(true);
        setError("");

        try {
            await editarTarjeta(edicion.id, edicion.filas);
            setEdicion(null);
            avisar("Actualizado. Lo que usa esta tarjeta ya lo lee.");
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="ui-screen ui-fade">
            <div className="ui-body ui-body--tabbed ui-body--tight" style={{ paddingTop: 20 }}>
                <div className="ui-stack ui-stack--xs">
                    <img src="/img/logo-azenza.svg" alt="Azenza" className="ui-logo ui-logo--sm" />
                    <span className="ui-eyebrow" style={{ marginTop: 16 }}>Tu negocio</span>
                    <h1 className="ui-title ui-title--lg">{nombre || "Lo que construiste"}</h1>
                </div>

                {modulos.length === 0 ? (
                    <div className="ui-card ui-card--lg" style={{ padding: 20 }}>
                        <span className="ui-card__title">Todavía no hay nada acá</span>
                        <span className="ui-card__text" style={{ color: "var(--ui-text-body)" }}>
                            Cada módulo que terminás deja una tarjeta con lo que escribiste: tu cliente, tu propuesta,
                            tus precios. Todo en un solo lugar, y lo podés descargar.
                        </span>
                        <Link to="/ruta" className="ui-btn ui-btn--inline" style={{ marginTop: 4 }}>Ir a mi ruta</Link>
                    </div>
                ) : (
                    <>
                        <div className="ui-stack">
                            <p className="ui-lead" style={{ fontSize: 16 }}>
                                <b style={{ fontWeight: 800, color: "var(--ui-teal)" }}>{modulos.length} de las {TOTAL_BASES}</b> bases,
                                por escrito. Cada módulo que terminás suma su tarjeta acá, y los que vienen la leen.
                            </p>
                            <button
                                type="button"
                                className="ui-row-link"
                                style={{ background: "transparent", borderRadius: 18, padding: "14px 18px" }}
                                onClick={() => navigate("/negocio/imprimir")}
                            >
                                <span className="ui-stack ui-stack--xs" style={{ flex: 1, gap: 2 }}>
                                    <span style={{ fontSize: 15.5, fontWeight: 800, color: "var(--ui-teal)" }}>Descargar todo en PDF</span>
                                    <span className="ui-small" style={{ fontSize: 13.5 }}>
                                        Para mostrárselo a un socio, a un contador o a un banco.
                                    </span>
                                </span>
                                <span className="ui-chevron" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="ui-card ui-card--lg ui-card--soft">
                            <div className="ui-chips" style={{ alignItems: "center", gap: 10 }}>
                                <span className="ui-ia ui-ia--tag">IA</span>
                                <span className="ui-eyebrow">Consultor IA · opcional</span>
                            </div>
                            <span className="ui-card__title">Preguntale algo sobre tu negocio</span>
                            <span className="ui-card__text" style={{ fontSize: 15 }}>
                                Responde con lo que guardaste acá. No pone notas ni escribe por vos.
                            </span>
                            <div className="ui-card__row" style={{ marginTop: 4 }}>
                                <Link to="/consultor" className="ui-btn ui-btn--inline" style={{ flex: "none", height: 46, fontSize: 15.5, whiteSpace: "nowrap" }}>
                                    Hacer una pregunta
                                </Link>
                                {uso?.activo && (
                                    <span className="ui-small" style={{ fontSize: 13, textAlign: "right" }}>
                                        {uso.quedan} de {uso.limite} consultas disponibles hoy
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="ui-stack">
                            {modulos.map((modulo) => {
                                const { filas, guardadoAt } = construidos[modulo.id];

                                return (
                                    <article key={modulo.id} className="ui-card ui-card--lg" style={{ gap: 12 }}>
                                        <div className="ui-field__head" style={{ alignItems: "flex-start" }}>
                                            <div className="ui-stack ui-stack--xs" style={{ gap: 2 }}>
                                                <span className="ui-card__label">Etapa {modulo.etapa}</span>
                                                <h2 className="ui-stage__name">{modulo.nombre}</h2>
                                            </div>
                                            <button type="button" className="ui-chip-btn" onClick={() => editar(modulo)}>
                                                Editar
                                            </button>
                                        </div>
                                        {filas.map((fila, i) => (
                                            <div key={i} className="ui-card-row">
                                                <span className="ui-card__label ui-card__label--teal">{fila.etiqueta}</span>
                                                <span style={{ fontSize: 15.5, lineHeight: 1.45, textWrap: "pretty" }}>{fila.texto}</span>
                                            </div>
                                        ))}
                                        <span className="ui-note">Actualizado {fechaRelativa(guardadoAt)}</span>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <TabBar />

            {edicion && (
                <BottomSheet onClose={() => setEdicion(null)} labelledBy="edicion-titulo">
                    <div className="ui-stack ui-stack--xs" style={{ flex: "none", padding: "18px 24px 8px", gap: 6 }}>
                        <span className="ui-eyebrow">Editar tarjeta</span>
                        <h2 id="edicion-titulo" className="ui-sheet__title">{edicion.nombre}</h2>
                    </div>
                    <div className="ui-sheet__scroll">
                        {edicion.filas.map((fila, i) => (
                            <label key={i} className="ui-field">
                                <span className="ui-field__label">{fila.etiqueta}</span>
                                <textarea
                                    className="ui-textarea"
                                    rows={3}
                                    style={{ minHeight: 88, borderRadius: 14, padding: "12px 14px", lineHeight: 1.45 }}
                                    value={fila.texto}
                                    onChange={(e) => cambiarFila(i, e.target.value)}
                                />
                            </label>
                        ))}
                        <p className="ui-small" style={{ fontSize: 13.5 }}>Los módulos que usan esta tarjeta leen la versión nueva.</p>
                    </div>
                    <div className="ui-footer ui-footer--wide" style={{ position: "static" }}>
                        {error && <p className="ui-footer__error" role="alert">{error}</p>}
                        <button type="button" className="ui-btn" disabled={guardando} onClick={guardar}>
                            {guardando ? "Guardando…" : "Guardar cambios"}
                        </button>
                        <button type="button" className="ui-link-btn" onClick={() => setEdicion(null)}>Cancelar</button>
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
