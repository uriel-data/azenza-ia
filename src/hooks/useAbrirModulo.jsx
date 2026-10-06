import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../components/BottomSheet";
import { useAppData } from "../context/AppDataContext";
import { MODULO } from "../data/modulos";

/**
 * Abre un módulo desde la ruta, el diagnóstico o el final de otro módulo. Si usa lo
 * que construyen otros que todavía no hizo, primero lo sugiere en una hoja (sin
 * bloquear: puede abrirlo igual). Los que todavía no están disponibles muestran
 * "Muy pronto".
 *
 * Devuelve { abrir(id), hojaDeRequisitos }: la hoja (de requisitos o de "Muy pronto")
 * hay que renderizarla.
 */
export function useAbrirModulo() {
    const { construidos, pausados } = useAppData();
    const navigate = useNavigate();
    const [requisitos, setRequisitos] = useState(null);
    const [pronto, setPronto] = useState(null);

    const ir = useCallback((id) => {
        setRequisitos(null);
        navigate(`/modulo/${id}`);
    }, [navigate]);

    const abrir = useCallback((id) => {
        const modulo = MODULO[id];

        if (modulo.pronto) {
            setPronto(id);
            return;
        }

        const faltan = (modulo.requisitos ?? []).filter((requisito) => !construidos[requisito]);

        if (faltan.length && !construidos[id] && !pausados[id]) {
            setRequisitos({ id, faltan });
            return;
        }

        ir(id);
    }, [construidos, pausados, ir]);

    const cerrar = useCallback(() => {
        setRequisitos(null);
        setPronto(null);
    }, []);

    const hojaDePronto = pronto && (
        <BottomSheet onClose={cerrar} labelledBy="pronto-titulo">
            <div className="ui-sheet__body">
                <div className="ui-stack ui-stack--md">
                    <span className="ui-eyebrow">Muy pronto</span>
                    <h2 id="pronto-titulo" className="ui-sheet__title">{MODULO[pronto].nombre}</h2>
                    <p className="ui-lead" style={{ fontSize: 16 }}>{MODULO[pronto].aviso}</p>
                </div>
                <button type="button" className="ui-btn" onClick={cerrar}>Entendido</button>
            </div>
        </BottomSheet>
    );

    const hojaDeRequisitos = requisitos && (
        <BottomSheet onClose={cerrar} labelledBy="requisitos-titulo">
            <div className="ui-sheet__body">
                <div className="ui-stack ui-stack--md">
                    <span className="ui-eyebrow">Antes de empezar</span>
                    <h2 id="requisitos-titulo" className="ui-sheet__title">
                        {MODULO[requisitos.id].nombre} usa lo que construís en{" "}
                        {requisitos.faltan.map((id) => MODULO[id].nombre).join(" y ")}
                    </h2>
                    <p className="ui-lead" style={{ fontSize: 16 }}>
                        Te conviene hacerlo primero: así este módulo llega precargado con lo tuyo. Si lo necesitás
                        ya, abrilo igual.
                    </p>
                </div>
                <div className="ui-stack ui-stack--xs" style={{ gap: 2 }}>
                    <button type="button" className="ui-btn" onClick={() => ir(requisitos.faltan[0])}>
                        Empezar por {MODULO[requisitos.faltan[0]].nombre}
                    </button>
                    <button type="button" className="ui-link-btn" onClick={() => ir(requisitos.id)}>
                        Abrir {MODULO[requisitos.id].nombre} igual
                    </button>
                </div>
            </div>
        </BottomSheet>
    );

    return { abrir, hojaDeRequisitos: hojaDeRequisitos || hojaDePronto };
}
