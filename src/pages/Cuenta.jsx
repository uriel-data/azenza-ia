import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { BottomSheet } from "../components/BottomSheet";
import { Loader } from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const POLITICA = "https://azenza.com.ar/privacidad/#azenza-ia";

// Tu cuenta: quién sos, cerrar sesión y borrar la cuenta (con todo lo construido).
export function Cuenta() {
    const { user, cargando, logout, borrarCuenta } = useAuth();
    const avisar = useToast();
    const navigate = useNavigate();
    const [borrando, setBorrando] = useState(false);
    const [password, setPassword] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");

    if (cargando) return <Loader />;
    if (!user) return <Navigate to="/login" replace state={{ from: "/cuenta" }} />;

    const salir = async () => {
        await logout();
        navigate("/", { replace: true });
        avisar("Cerraste sesión. Lo tuyo queda guardado en tu cuenta.");
    };

    const confirmarBorrado = async (e) => {
        e.preventDefault();
        if (!password) {
            setError("Escribí tu contraseña para confirmar.");
            return;
        }

        setEnviando(true);
        setError("");

        try {
            await borrarCuenta(password);
            navigate("/", { replace: true });
            avisar("Borramos tu cuenta y todo lo que tenía.");
        } catch (err) {
            setError(err.message);
            setEnviando(false);
        }
    };

    const cerrarHoja = () => {
        setBorrando(false);
        setPassword("");
        setError("");
    };

    return (
        <div className="ui-screen ui-in">
            <div className="ui-topbar">
                <BackButton onClick={() => navigate("/ruta")} />
            </div>

            <div className="ui-body ui-body--wide">
                <div className="ui-stack ui-stack--xs">
                    <span className="ui-eyebrow">Tu cuenta</span>
                    <h1 className="ui-title ui-title--lg">{user.nombre}</h1>
                    <p className="ui-lead">{user.email}</p>
                </div>

                <div className="ui-card ui-card--lg">
                    <span className="ui-card__text">
                        Tu punto de partida, lo que construiste y tus pausas quedan guardados en tu cuenta: podés seguir
                        desde cualquier dispositivo.
                    </span>
                    <button type="button" className="ui-btn ui-btn--inline" onClick={salir}>Cerrar sesión</button>
                </div>

                <div className="ui-stack ui-stack--sm">
                    <a className="ui-link-btn ui-link-btn--start" href={POLITICA} target="_blank" rel="noopener noreferrer">
                        Política de privacidad
                    </a>
                    <button type="button" className="ui-link-btn ui-link-btn--start ui-link-btn--danger" onClick={() => setBorrando(true)}>
                        Borrar mi cuenta
                    </button>
                </div>
            </div>

            {borrando && (
                <BottomSheet onClose={cerrarHoja} labelledBy="borrar-titulo">
                    <form className="ui-sheet__body" onSubmit={confirmarBorrado} noValidate>
                        <div className="ui-stack ui-stack--md">
                            <span className="ui-eyebrow">Borrar mi cuenta</span>
                            <h2 id="borrar-titulo" className="ui-sheet__title">¿Seguro? No se puede deshacer.</h2>
                            <p className="ui-lead">
                                Se borran tu cuenta, tu punto de partida y todo lo que construiste. Si querés guardarlo,
                                antes descargalo en PDF desde Tu negocio.
                            </p>
                            <label className="ui-field" htmlFor="borrar-password">
                                <span className="ui-field__label">Tu contraseña, para confirmar</span>
                                <input
                                    id="borrar-password"
                                    className="ui-input"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </label>
                            {error && <p className="ui-footer__error" role="alert">{error}</p>}
                        </div>
                        <div className="ui-stack ui-stack--xs">
                            <button type="submit" className="ui-btn ui-btn--danger" disabled={enviando}>
                                {enviando ? "Borrando…" : "Borrar mi cuenta"}
                            </button>
                            <button type="button" className="ui-link-btn" onClick={cerrarHoja}>Cancelar</button>
                        </div>
                    </form>
                </BottomSheet>
            )}
        </div>
    );
}
