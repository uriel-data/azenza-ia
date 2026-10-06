import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { OptionCard } from "../components/OptionCard";
import { QuestionTopBar } from "../components/QuestionTopBar";
import { useAppData } from "../context/AppDataContext";
import { useToast } from "../context/ToastContext";
import { entradasConTexto, esRespuestaValida, respuestaVacia } from "../data/puntoDePartida";
import { useAvanzarPregunta } from "../hooks/useAvanzarPregunta";

// Se monta de nuevo en cada pregunta, así el error y la animación de entrada no
// pasan de una a otra.
export function Pregunta() {
    const { numero } = useParams();
    return <PantallaPregunta key={numero} numero={Number(numero)} />;
}

function PantallaPregunta({ numero }) {
    const { catalogo, listo, esInvitado, borrador, cambiarRespuesta } = useAppData();
    const avisar = useToast();
    const navigate = useNavigate();

    const conceptos = catalogo?.conceptos ?? [];
    const concepto = conceptos[numero - 1];
    const total = conceptos.length;
    const { avanzar, guardando, error } = useAvanzarPregunta(numero, total);

    if (!listo) return <Loader />;

    if (!concepto) return <Navigate to="/punto-de-partida" replace />;

    const { clave } = concepto;
    const respuesta = borrador[clave] ?? respuestaVacia();
    const valida = esRespuestaValida(respuesta);
    const varias = concepto.permiteVarias;

    const editarEntrada = (indice, texto) =>
        cambiarRespuesta(clave, (anterior) => ({
            ...anterior,
            entradas: anterior.entradas.map((actual, i) => (i === indice ? texto : actual)),
        }));

    const agregarEntrada = () =>
        cambiarRespuesta(clave, (anterior) => ({
            ...anterior,
            entradas: anterior.entradas.length < catalogo.maxRespuestas ? [...anterior.entradas, ""] : anterior.entradas,
        }));

    const quitarEntrada = (indice) =>
        cambiarRespuesta(clave, (anterior) => {
            const entradas = anterior.entradas.filter((_, i) => i !== indice);
            return { ...anterior, entradas: entradas.length ? entradas : [""], principal: 0 };
        });

    const seguir = () => {
        if (!valida || guardando) return;

        const conTexto = entradasConTexto(respuesta);

        // Con varias respuestas, antes de guardar elige cuál es la principal.
        if (varias && respuesta.opcion === 3 && conTexto.length >= 2) {
            cambiarRespuesta(clave, (anterior) => ({
                ...anterior,
                entradas: conTexto,
                principal: Math.min(Math.max(anterior.principal, 0), conTexto.length - 1),
            }));
            navigate(`/punto-de-partida/pregunta/${numero}/principal`);
            return;
        }

        avanzar();
    };

    const seguirDespues = () => {
        if (esInvitado) {
            navigate("/");
            avisar("Tus respuestas quedan en este dispositivo. Seguís cuando quieras.");
        } else {
            navigate("/ruta");
            avisar("Guardamos tus respuestas. Seguís cuando quieras.");
        }
    };

    return (
        <div className="ui-screen">
            <QuestionTopBar
                numero={numero}
                total={total}
                onBack={() => navigate(numero > 1 ? `/punto-de-partida/pregunta/${numero - 1}` : "/punto-de-partida")}
                onLater={seguirDespues}
            />

            <div className="ui-body ui-in">
                <div className="ui-stack">
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 10px" }}>
                        <h1 className="ui-title" id="pregunta-titulo">{concepto.titulo}</h1>
                        <span className="ui-term">{concepto.nombreTecnico}</span>
                    </div>
                    <p className="ui-lead">{concepto.explicacion}</p>
                </div>

                <div className="ui-options" role="radiogroup" aria-labelledby="pregunta-titulo">
                    {[1, 2, 3].map((opcion) => (
                        <OptionCard
                            key={opcion}
                            selected={respuesta.opcion === opcion}
                            onSelect={() => cambiarRespuesta(clave, { opcion })}
                        >
                            {catalogo.opciones[opcion]}
                        </OptionCard>
                    ))}
                </div>

                {respuesta.opcion === 3 && (
                    <div className="ui-stack ui-stack--md ui-in">
                        <span className="ui-field__label" id="campo-titulo">{concepto.campo.pregunta}</span>
                        {varias && (
                            <span className="ui-small" style={{ marginTop: -4 }}>
                                Si son varios, escribí hasta {catalogo.maxRespuestas}. Después elegís uno principal.
                            </span>
                        )}

                        {respuesta.entradas.map((texto, i) => (
                            <div key={i} className="ui-stack ui-stack--xs">
                                <textarea
                                    className="ui-textarea"
                                    rows={3}
                                    value={texto}
                                    maxLength={catalogo.maxCaracteres}
                                    placeholder={i === 0 ? `Ej: ${concepto.campo.ejemplo}` : "Otro más"}
                                    aria-labelledby="campo-titulo"
                                    onChange={(e) => editarEntrada(i, e.target.value)}
                                />
                                {respuesta.entradas.length > 1 && (
                                    <button
                                        type="button"
                                        className="ui-link-btn ui-link-btn--muted ui-link-btn--sm"
                                        style={{ alignSelf: "flex-end", height: 32, fontSize: 14 }}
                                        onClick={() => quitarEntrada(i)}
                                    >
                                        Quitar
                                    </button>
                                )}
                            </div>
                        ))}

                        {varias && respuesta.entradas.length < catalogo.maxRespuestas && (
                            <button type="button" className="ui-add" onClick={agregarEntrada}>+ Agregar otro</button>
                        )}
                    </div>
                )}
            </div>

            <div className="ui-footer">
                {error && <p className="ui-footer__error" role="alert">{error}</p>}
                <button type="button" className="ui-btn" disabled={!valida || guardando} onClick={seguir}>
                    {guardando ? "Guardando…" : numero === total ? "Ver mi resultado" : "Siguiente"}
                </button>
            </div>
        </div>
    );
}
