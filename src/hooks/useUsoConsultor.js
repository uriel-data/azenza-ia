import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

/**
 * Cuántas consultas al Consultor IA le quedan hoy: { activo, limite, usadas, quedan }.
 * null mientras carga, si es invitado o si no se pudo consultar.
 */
export function useUsoConsultor() {
    const { user } = useAuth();
    const [uso, setUso] = useState(null);
    const userId = user?.id;

    useEffect(() => {
        if (!userId) return;

        let activo = true;

        api("/consultor/uso")
            .then((data) => {
                if (activo) setUso(data.uso);
            })
            .catch((error) => console.error("No se pudo consultar el uso del Consultor:", error));

        return () => {
            activo = false;
        };
    }, [userId]);

    return [userId ? uso : null, setUso];
}
