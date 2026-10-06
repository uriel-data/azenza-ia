import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { OptionCard } from "../components/OptionCard";
import { QuestionTopBar } from "../components/QuestionTopBar";
import { useAppData } from "../context/AppDataContext";
import { entradasConTexto } from "../data/puntoDePartida";
import { useAvanzarPregunta } from "../hooks/useAvanzarPregunta";

// Solo en las preguntas que aceptan varias respuestas, cuando escribió más de una.
export function ElegirPrincipal() {
    const { catalogo, listo, borrador, cambiarRespuesta } = useAppData();
    const navigate = useNavigate();
    const numero = Number(useParams().numero);

    const conceptos = catalogo?.conceptos ?? [];
    const concepto = conceptos[numero - 1];
    const { avanzar, guardando, error } = useAvanzarPregunta(numero, conceptos.length);

    if (!listo) return <Loader />;

    const respuesta = concepto && borrador[concepto.clave];
    const entradas = entradasConTexto(respuesta);

    if (!concepto?.permiteVarias || respuesta?.opcion !== 3 || entradas.length < 2) {
        return <Navigate to={concepto ? `/punto-de-partida/pregunta/${numero}` : "/punto-de-partida"} replace />;
    }

    const elegir = (principal) => cambiarRespuesta(concepto.clave, { principal });

    return (
        <div className="ui-screen">
            <QuestionTopBar
                numero={numero}
                total={conceptos.length}
                onBack={() => navigate(`/punto-de-partida/pregunta/${numero}`)}
            />

            <div className="ui-body ui-in">
                <div className="ui-stack">
                    <span className="ui-eyebrow">Elegí lo principal</span>
                    <h1 className="ui-title" id="eleccion-titulo">{concepto.eleccion.titulo}</h1>
                    <p className="ui-lead">{concepto.eleccion.explicacion}</p>
                </div>

                <div className="ui-options" role="radiogroup" aria-labelledby="eleccion-titulo">
                    {entradas.map((texto, i) => (
                        <OptionCard key={i} compact selected={respuesta.principal === i} onSelect={() => elegir(i)}>
                            {texto}
                        </OptionCard>
                    ))}
                    <OptionCard compact selected={respuesta.principal === -1} onSelect={() => elegir(-1)}>
                        {concepto.eleccion.sinElegir}
                    </OptionCard>
                </div>
            </div>

            <div className="ui-footer">
                {error && <p className="ui-footer__error" role="alert">{error}</p>}
                <button type="button" className="ui-btn" disabled={guardando} onClick={avanzar}>
                    {guardando ? "Guardando…" : "Seguir"}
                </button>
            </div>
        </div>
    );
}
