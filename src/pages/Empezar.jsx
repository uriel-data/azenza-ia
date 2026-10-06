import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";

const ULTIMA = 2;

// Onboarding: el problema antes que la herramienta (Prioridad 2 del brief).
export function Empezar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [slide, setSlide] = useState(location.state?.slide ?? 0);
    const inicioDelGesto = useRef(null);

    const siguiente = () => setSlide((actual) => Math.min(ULTIMA, actual + 1));
    const anterior = () => setSlide((actual) => Math.max(0, actual - 1));

    const alSoltar = (e) => {
        if (inicioDelGesto.current === null) return;

        const distancia = e.clientX - inicioDelGesto.current;
        inicioDelGesto.current = null;

        if (distancia < -40) siguiente();
        else if (distancia > 40) anterior();
    };

    return (
        <div className="ui-screen ui-in">
            <div className="ui-topbar ui-topbar--split">
                <BackButton onClick={() => (slide > 0 ? anterior() : navigate("/"))} />
                {slide < ULTIMA && (
                    <Link to="/ruta" className="ui-link-btn ui-link-btn--muted">Saltar</Link>
                )}
            </div>

            <div
                className="ui-carousel"
                onPointerDown={(e) => { inicioDelGesto.current = e.clientX; }}
                onPointerUp={alSoltar}
                onPointerCancel={() => { inicioDelGesto.current = null; }}
            >
                <div className="ui-carousel__track" style={{ transform: `translateX(-${slide * 33.3333}%)` }}>
                    <section className="ui-carousel__slide" inert={slide !== 0} aria-hidden={slide !== 0}>
                        <h1 className="ui-title">Dos negocios del mismo rubro, con el mismo producto.</h1>
                        <div className="ui-compare">
                            <div className="ui-stack">
                                <img src="/img/negocio-a.webp" alt="Perfil de Instagram del negocio A" className="ui-illus" style={{ height: 170 }} />
                                <span className="ui-section-title" style={{ fontSize: 15 }}>Negocio A</span>
                                <div className="ui-stack ui-stack--sm">
                                    <span className="ui-bullet">Sabe a quién le vende</span>
                                    <span className="ui-bullet">Sabe cuánto gana en cada venta</span>
                                    <span className="ui-bullet">Sabe qué contar en sus redes</span>
                                </div>
                            </div>
                            <div className="ui-stack">
                                <img src="/img/negocio-b.webp" alt="Perfil de Instagram del negocio B" className="ui-illus" style={{ height: 170 }} />
                                <span className="ui-section-title" style={{ fontSize: 15 }}>Negocio B</span>
                                <div className="ui-stack ui-stack--sm">
                                    <span className="ui-bullet ui-bullet--off">Le vende a “todos”</span>
                                    <span className="ui-bullet ui-bullet--off">Pone los precios a ojo</span>
                                    <span className="ui-bullet ui-bullet--off">Publica cuando se acuerda</span>
                                </div>
                            </div>
                        </div>
                        <span className="ui-note">Los dos son ejemplos inventados.</span>
                    </section>

                    <section className="ui-carousel__slide" inert={slide !== 1} aria-hidden={slide !== 1}>
                        <h1 className="ui-title">La diferencia no es el producto, es la base.</h1>
                        <img src="/img/un-anio-despues.webp" alt="Los dos negocios, un año después" className="ui-illus" style={{ height: 180 }} />
                        <div className="ui-timeline">
                            <div className="ui-timeline__row">
                                <span />
                                <span style={{ color: "var(--ui-teal)" }}>Negocio A</span>
                                <span>Negocio B</span>
                            </div>
                            <div className="ui-timeline__row">
                                <span className="ui-timeline__when">A los 3 meses</span>
                                <span>Sus clientas vuelven y la recomiendan.</span>
                                <span style={{ color: "var(--ui-text-soft)" }}>Vende, pero no sabe si gana.</span>
                            </div>
                            <div className="ui-timeline__row">
                                <span className="ui-timeline__when">Al año</span>
                                <span>Sube precios sin miedo y puede delegar.</span>
                                <span style={{ color: "var(--ui-text-soft)" }}>Trabaja más y le queda lo mismo.</span>
                            </div>
                        </div>
                    </section>

                    <section className="ui-carousel__slide" inert={slide !== 2} aria-hidden={slide !== 2}>
                        <h1 className="ui-title">Acá aprendés a construir esa base, haciendo.</h1>
                        <img src="/img/construir.webp" alt="Una emprendedora escribiendo su plan" className="ui-illus" style={{ height: 210 }} />
                        <div className="ui-stack ui-stack--lg">
                            <div className="ui-numbered"><span className="ui-num">1</span><span>Cada módulo termina con algo tuyo, por escrito.</span></div>
                            <div className="ui-numbered"><span className="ui-num">2</span><span>Sin jerga: cada término viene con su explicación.</span></div>
                            <div className="ui-numbered"><span className="ui-num">3</span><span>Gratis, a tu ritmo. Pausás cuando quieras.</span></div>
                        </div>
                    </section>
                </div>
            </div>

            <div className="ui-footer ui-footer--plain ui-footer--wide">
                <div className="ui-dots" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className={`ui-dots__dot${i === slide ? " ui-dots__dot--on" : ""}`} />
                    ))}
                </div>
                {slide < ULTIMA ? (
                    <button type="button" className="ui-btn" onClick={siguiente}>Siguiente</button>
                ) : (
                    <>
                        <Link to="/punto-de-partida" className="ui-btn">Empezar por mi punto de partida</Link>
                        <Link to="/ruta" className="ui-link-btn">Saltar</Link>
                    </>
                )}
            </div>
        </div>
    );
}
