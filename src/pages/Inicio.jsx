import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Inicio() {
    const { user, cargando } = useAuth();

    // Con sesión abierta, el inicio es su ruta.
    if (!cargando && user) {
        return <Navigate to="/ruta" replace />;
    }

    return (
        <div className="ui-screen ui-in">
            <div className="ui-body ui-body--wide ui-body--loose">
                <img src="/img/logo-azenza.svg" alt="Azenza" className="ui-logo" />
                <img
                    src="/img/inicio.webp"
                    alt="Una emprendedora en su cocina-taller, pensando en su negocio"
                    className="ui-hero"
                />
                <div className="ui-stack ui-stack--lg">
                    <span className="ui-eyebrow">Azenza IA · para emprendedores</span>
                    <h1 className="ui-title ui-title--xl">Aprendé las bases de tu negocio, construyéndolas.</h1>
                    <p className="ui-lead">
                        Paso a paso. Cada módulo termina con algo tuyo y por escrito: a quién le vendés,
                        cuánto cobrar, qué contar.
                    </p>
                </div>
            </div>

            <div className="ui-footer ui-footer--plain ui-footer--wide">
                <Link to="/empezar" className="ui-btn">Empezar</Link>
                <Link to="/login" className="ui-link-btn">Ya tengo cuenta</Link>
                <span className="ui-footer__note">Gratis. No necesitás cuenta para empezar.</span>
            </div>
        </div>
    );
}
