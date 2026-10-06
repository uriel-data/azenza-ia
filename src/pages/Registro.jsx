import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const POLITICA = "https://azenza.com.ar/privacidad/#azenza-ia";

export function Registro() {
    const [campos, setCampos] = useState({ nombre: "", email: "", password: "" });
    const [acepta, setAcepta] = useState(false);
    const [errores, setErrores] = useState({});
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    const { registrar } = useAuth();
    const { puntoDePartida, vincularInvitado } = useAppData();
    const avisar = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Si llegó acá por querer entrar a una ruta protegida, volvemos ahí.
    const destino = location.state?.from || "/ruta";

    const cambiar = (campo) => (e) => {
        setCampos((anteriores) => ({ ...anteriores, [campo]: e.target.value }));
        setErrores((anteriores) => ({ ...anteriores, [campo]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const nuevos = {};
        if (!campos.nombre.trim()) nuevos.nombre = "Escribí tu nombre.";
        if (!EMAIL_REGEX.test(campos.email.trim())) nuevos.email = "Revisá el email: parece que falta algo.";
        if (campos.password.length < MIN_PASSWORD) nuevos.password = `Usá al menos ${MIN_PASSWORD} caracteres.`;
        if (!acepta) nuevos.acepta = "Para crear tu cuenta, aceptá la política de privacidad.";

        if (Object.keys(nuevos).length) {
            setErrores(nuevos);
            return;
        }

        setEnviando(true);

        try {
            const user = await registrar({
                nombre: campos.nombre.trim(),
                email: campos.email.trim(),
                password: campos.password,
                aceptaPrivacidad: true,
            });
            const { importado, completo } = await vincularInvitado(user.id);
            const nombre = user.nombre.split(/\s+/)[0];

            navigate(destino, { replace: true });
            avisar(
                completo ? `Listo, ${nombre}. Guardamos tu punto de partida.`
                    : importado ? `Listo, ${nombre}. Tu trabajo quedó guardado.`
                        : `Listo, ${nombre}. Tu cuenta está creada.`
            );
        } catch (err) {
            setError(err.message);
            setEnviando(false);
        }
    };

    const volver = () => (location.key !== "default" ? navigate(-1) : navigate("/"));

    const campo = (id, etiqueta, props) => (
        <label className="ui-field" htmlFor={`registro-${id}`}>
            <span className="ui-field__label">{etiqueta}</span>
            <input
                id={`registro-${id}`}
                className="ui-input"
                value={campos[id]}
                onChange={cambiar(id)}
                aria-invalid={Boolean(errores[id])}
                aria-describedby={errores[id] ? `registro-${id}-error` : undefined}
                {...props}
            />
            {errores[id] && <span id={`registro-${id}-error`} className="ui-field__error">{errores[id]}</span>}
        </label>
    );

    return (
        <form className="ui-screen ui-in" onSubmit={handleSubmit} noValidate>
            <div className="ui-topbar">
                <BackButton onClick={volver} />
            </div>

            <div className="ui-body ui-body--wide">
                <div className="ui-stack">
                    {location.state?.motivo === "modulo" ? (
                        <h1 className="ui-title ui-title--md">Creá tu cuenta para guardar lo que construiste</h1>
                    ) : puntoDePartida ? (
                        <>
                            <span className="ui-eyebrow">Tu punto de partida está listo</span>
                            <h1 className="ui-title ui-title--md">
                                Creá tu cuenta para guardar tu punto de partida y seguir cuando quieras
                            </h1>
                        </>
                    ) : (
                        <h1 className="ui-title ui-title--md">Creá tu cuenta para guardar lo que hagas y seguir cuando quieras</h1>
                    )}
                    <p className="ui-lead" style={{ fontSize: 16, color: "var(--ui-text-soft)" }}>Tres datos, nada más.</p>
                </div>

                <div className="ui-stack ui-stack--lg">
                    {campo("nombre", "Nombre", { autoComplete: "given-name", placeholder: "Cómo te llamás", maxLength: 80 })}
                    {campo("email", "Email", { type: "email", autoComplete: "email", placeholder: "tu@email.com", maxLength: 160 })}
                    {campo("password", "Contraseña", { type: "password", autoComplete: "new-password", placeholder: `Al menos ${MIN_PASSWORD} caracteres` })}
                </div>

                <div className="ui-stack ui-stack--xs">
                    <label className="ui-check" htmlFor="registro-acepta">
                        <input
                            id="registro-acepta"
                            type="checkbox"
                            checked={acepta}
                            onChange={(e) => {
                                setAcepta(e.target.checked);
                                setErrores((anteriores) => ({ ...anteriores, acepta: null }));
                            }}
                            aria-invalid={Boolean(errores.acepta)}
                            aria-describedby={errores.acepta ? "registro-acepta-error" : undefined}
                        />
                        <span>
                            Leí y acepto la{" "}
                            <a href={POLITICA} target="_blank" rel="noopener noreferrer">política de privacidad</a>.
                        </span>
                    </label>
                    {errores.acepta && <span id="registro-acepta-error" className="ui-field__error">{errores.acepta}</span>}
                </div>

                <p className="ui-small" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    Guardamos tus datos y los de tu negocio solo para que puedas seguir, según la Ley 25.326 de
                    Protección de Datos Personales. Podés borrar tu cuenta cuando quieras.
                </p>
            </div>

            <div className="ui-footer ui-footer--wide">
                {error && <p className="ui-footer__error" role="alert">{error}</p>}
                <button type="submit" className="ui-btn" disabled={enviando}>
                    {enviando ? "Creando tu cuenta…" : "Crear cuenta y guardar"}
                </button>
                <Link to="/login" state={location.state} className="ui-link-btn">Ya tengo cuenta</Link>
            </div>
        </form>
    );
}
