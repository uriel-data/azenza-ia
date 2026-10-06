import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    const { login } = useAuth();
    const { vincularInvitado } = useAppData();
    const avisar = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Si llegó acá por querer entrar a una ruta protegida, volvemos ahí.
    const destino = location.state?.from || "/ruta";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Completá tu email y contraseña.");
            return;
        }

        setEnviando(true);

        try {
            const user = await login(email, password);
            await vincularInvitado(user.id);

            navigate(destino, { replace: true });
            avisar(`Hola de nuevo, ${user.nombre.split(/\s+/)[0]}.`);
        } catch (err) {
            setError(err.message);
            setEnviando(false);
        }
    };

    const volver = () => (location.key !== "default" ? navigate(-1) : navigate("/"));

    return (
        <form className="ui-screen ui-in" onSubmit={handleSubmit} noValidate>
            <div className="ui-topbar">
                <BackButton onClick={volver} />
            </div>

            <div className="ui-body ui-body--wide">
                <h1 className="ui-title ui-title--lg">Hola de nuevo</h1>

                <div className="ui-stack ui-stack--lg">
                    <label className="ui-field" htmlFor="login-email">
                        <span className="ui-field__label">Email</span>
                        <input
                            id="login-email"
                            className="ui-input"
                            type="email"
                            autoComplete="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </label>
                    <label className="ui-field" htmlFor="login-password">
                        <span className="ui-field__label">Contraseña</span>
                        <input
                            id="login-password"
                            className="ui-input"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Tu contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </label>
                </div>
            </div>

            <div className="ui-footer ui-footer--wide">
                {error && <p className="ui-footer__error" role="alert">{error}</p>}
                <button type="submit" className="ui-btn" disabled={enviando}>
                    {enviando ? "Entrando…" : "Entrar"}
                </button>
                <Link to="/registro" state={location.state} className="ui-link-btn">Crear cuenta</Link>
            </div>
        </form>
    );
}
