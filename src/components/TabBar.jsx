import { NavLink } from "react-router-dom";

const PESTANAS = [
    { to: "/ruta", label: "Mi ruta" },
    { to: "/negocio", label: "Tu negocio" },
    { to: "/diagnostico", label: "Diagnóstico 360°" },
];

export function TabBar() {
    return (
        <nav className="ui-tabbar" aria-label="Secciones">
            {PESTANAS.map((pestana) => (
                <NavLink key={pestana.to} to={pestana.to} className="ui-tabbar__tab">
                    {pestana.label}
                </NavLink>
            ))}
        </nav>
    );
}
