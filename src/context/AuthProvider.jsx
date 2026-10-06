import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { api } from "../utils/api";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // Arranca en true: hasta que no consultamos la sesión no sabemos si hay una abierta.
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;

        api("/cuenta")
            .then((data) => {
                if (activo) setUser(data.usuario);
            })
            .catch(() => {
                if (activo) setUser(null);
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const login = useCallback(async (email, password) => {
        const { usuario } = await api("/cuenta/entrar", { method: "POST", body: { email, password } });

        setUser(usuario);
        return usuario;
    }, []);

    const registrar = useCallback(async (datos) => {
        const { usuario } = await api("/cuenta/registro", { method: "POST", body: datos });

        setUser(usuario);
        return usuario;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api("/cuenta/salir", { method: "POST" });
        } finally {
            // Pase lo que pase del lado del servidor, en el navegador la sesión se cierra.
            setUser(null);
        }
    }, []);

    const borrarCuenta = useCallback(async (password) => {
        await api("/cuenta/borrar", { method: "POST", body: { password } });
        setUser(null);
    }, []);

    /** Si el servidor responde 401 (la sesión venció), el navegador deja de considerarla abierta. */
    const limpiarSesion = useCallback(() => setUser(null), []);

    const valor = useMemo(
        () => ({ user, cargando, login, registrar, logout, borrarCuenta, limpiarSesion }),
        [user, cargando, login, registrar, logout, borrarCuenta, limpiarSesion]
    );

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
