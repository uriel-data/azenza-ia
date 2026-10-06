import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";

/**
 * Guarda lo respondido hasta la pregunta `numero` y pasa a la siguiente, o cierra el
 * punto de partida si era la última. La usan la pregunta y la pantalla de elegir
 * la respuesta principal.
 */
export function useAvanzarPregunta(numero, total) {
    const { guardarRespuesta, completar } = useAppData();
    const navigate = useNavigate();
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const avanzar = async () => {
        setGuardando(true);
        setError("");

        try {
            await guardarRespuesta();

            if (numero < total) {
                navigate(`/punto-de-partida/pregunta/${numero + 1}`);
            } else {
                await completar();
                navigate("/punto-de-partida/resultado", { replace: true });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    return { avanzar, guardando, error, limpiarError: () => setError("") };
}
