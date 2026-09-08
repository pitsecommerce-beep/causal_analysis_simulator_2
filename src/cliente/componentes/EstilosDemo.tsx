import { useState } from 'react';

export function EstilosDemo() {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div style={{
      background: 'var(--ipd-superficie-fondo)',
      minHeight: '100vh',
      padding: 'var(--ipd-space-8)',
      fontFamily: 'var(--ipd-font-sans)',
    }}>
      <header style={{ maxWidth: 1100, margin: '0 auto var(--ipd-space-10)' }}>
        <h1 style={{
          fontFamily: 'var(--ipd-font-display)',
          fontSize: 'var(--ipd-size-4xl)',
          fontWeight: 600,
          letterSpacing: 'var(--ipd-tracking-heading)',
          color: 'var(--ipd-text-primary)',
        }}>
          Design System v2 — Componentes
        </h1>
        <p style={{
          fontSize: 'var(--ipd-size-md)',
          color: 'var(--ipd-text-secondary)',
          marginTop: 'var(--ipd-space-2)',
        }}>
          Simulador de Analisis Causal · ETF Bank
        </p>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--ipd-space-12)' }}>

        {/* --- 6.6 Botones --- */}
        <Seccion titulo="6.6 · Botones" id="botones">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ipd-space-4)', alignItems: 'center' }}>
            <button className="ipd-btn-sim ipd-btn-sim--primario">Primario</button>
            <button className="ipd-btn-sim ipd-btn-sim--secundario">Secundario</button>
            <button className="ipd-btn-sim ipd-btn-sim--terciario">Terciario</button>
            <button className="ipd-btn-sim ipd-btn-sim--peligro">Peligro</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ipd-space-4)', alignItems: 'center', marginTop: 'var(--ipd-space-4)' }}>
            <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--sm">Pequeno</button>
            <button className="ipd-btn-sim ipd-btn-sim--primario">Normal</button>
            <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--lg">Grande</button>
            <button className="ipd-btn-sim ipd-btn-sim--primario" disabled>Deshabilitado</button>
          </div>
          <div style={{ marginTop: 'var(--ipd-space-4)', maxWidth: 320 }}>
            <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--bloque">Bloque completo</button>
          </div>
        </Seccion>

        {/* --- 6.1 KPI Cards --- */}
        <Seccion titulo="6.1 · Tarjetas KPI" id="kpi">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--ipd-space-5)' }}>
            <div className="ipd-kpi">
              <div className="ipd-kpi__encabezado">
                <span className="ipd-kpi__etiqueta">NPS</span>
                <span className="ipd-kpi__icono">📊</span>
              </div>
              <span className="ipd-kpi__valor">72</span>
              <span className="ipd-kpi__tendencia ipd-kpi__tendencia--positiva">↑ +8</span>
              <div className="ipd-kpi__sparkline" style={{ background: 'linear-gradient(90deg, var(--ipd-color-navy-200) 0%, var(--ipd-color-navy-400) 100%)', borderRadius: 4 }} />
            </div>

            <div className="ipd-kpi">
              <div className="ipd-kpi__encabezado">
                <span className="ipd-kpi__etiqueta">Quejas</span>
                <span className="ipd-kpi__icono">📋</span>
              </div>
              <span className="ipd-kpi__valor">1,247</span>
              <span className="ipd-kpi__tendencia ipd-kpi__tendencia--negativa">↑ +312</span>
              <div className="ipd-kpi__sparkline" style={{ background: 'linear-gradient(90deg, var(--ipd-color-danger-100) 0%, var(--ipd-color-danger-600) 100%)', borderRadius: 4 }} />
            </div>

            <div className="ipd-kpi">
              <div className="ipd-kpi__encabezado">
                <span className="ipd-kpi__etiqueta">Creditos</span>
                <span className="ipd-kpi__icono">💰</span>
              </div>
              <span className="ipd-kpi__valor">$4.2M</span>
              <span className="ipd-kpi__tendencia ipd-kpi__tendencia--neutra">→ 0%</span>
            </div>

            <div className="ipd-kpi">
              <div className="ipd-kpi__encabezado">
                <span className="ipd-kpi__etiqueta">Tiempo</span>
                <span className="ipd-kpi__icono">⏱</span>
              </div>
              <span className="ipd-kpi__valor">23:41</span>
              <span className="ipd-kpi__tendencia ipd-kpi__tendencia--neutra">de 50:00</span>
            </div>
          </div>
        </Seccion>

        {/* --- 6.2 Tarjeta de consulta --- */}
        <Seccion titulo="6.2 · Tarjetas de consulta" id="consulta">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--ipd-space-5)' }}>
            <div className="ipd-consulta">
              <div className="ipd-consulta__hipotesis">
                La caida del NPS se debe a tiempos de espera en sucursal
              </div>
              <div className="ipd-consulta__herramientas">
                <button className="ipd-consulta__herramienta ipd-consulta__herramienta--activa" title="Encuesta">📋</button>
                <button className="ipd-consulta__herramienta" title="Entrevista">🎤</button>
                <button className="ipd-consulta__herramienta" title="Datos">📊</button>
                <button className="ipd-consulta__herramienta" title="Observacion">👁</button>
              </div>
              <div className="ipd-consulta__pie">
                <span className="ipd-consulta__creditos">3 creditos</span>
                <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--sm">Ejecutar</button>
              </div>
            </div>

            <div className="ipd-consulta ipd-consulta--seleccionada">
              <div className="ipd-consulta__hipotesis">
                El problema radica en la capacitacion del personal nuevo
              </div>
              <div className="ipd-consulta__herramientas">
                <button className="ipd-consulta__herramienta" title="Encuesta">📋</button>
                <button className="ipd-consulta__herramienta ipd-consulta__herramienta--activa" title="Entrevista">🎤</button>
              </div>
              <div className="ipd-consulta__pie">
                <span className="ipd-consulta__creditos ipd-consulta__creditos--bajo">1 credito</span>
                <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--sm">Ejecutar</button>
              </div>
            </div>

            <div className="ipd-consulta" style={{ opacity: 0.6 }}>
              <div className="ipd-consulta__hipotesis">
                Sin creditos disponibles
              </div>
              <div className="ipd-consulta__herramientas">
                <button className="ipd-consulta__herramienta" disabled title="Encuesta">📋</button>
              </div>
              <div className="ipd-consulta__pie">
                <span className="ipd-consulta__creditos ipd-consulta__creditos--agotado">0 creditos</span>
                <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--sm" disabled>Ejecutar</button>
              </div>
            </div>
          </div>
        </Seccion>

        {/* --- 6.3 Tabla densa --- */}
        <Seccion titulo="6.3 · Tabla de datos densa" id="tabla">
          <div className="ipd-tabla-densa">
            <div className="ipd-tabla-densa__scroll">
              <table>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>NPS</th>
                    <th>Quejas</th>
                    <th>Tiempo espera</th>
                    <th>Satisfaccion</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ene 2024</td>
                    <td className="ipd-tabla-densa__mono">72</td>
                    <td className="ipd-tabla-densa__mono">1,247</td>
                    <td className="ipd-tabla-densa__mono">14.2 min</td>
                    <td className="ipd-tabla-densa__mono">68%</td>
                    <td><span className="ipd-badge ipd-badge--warning">En riesgo</span></td>
                  </tr>
                  <tr className="ipd-tabla-densa__fila--seleccionada">
                    <td>Feb 2024</td>
                    <td className="ipd-tabla-densa__mono">65</td>
                    <td className="ipd-tabla-densa__mono">1,583</td>
                    <td className="ipd-tabla-densa__mono">18.7 min</td>
                    <td className="ipd-tabla-densa__mono">61%</td>
                    <td><span className="ipd-badge ipd-badge--danger">Critico</span></td>
                  </tr>
                  <tr>
                    <td>Mar 2024</td>
                    <td className="ipd-tabla-densa__mono">69</td>
                    <td className="ipd-tabla-densa__mono">1,102</td>
                    <td className="ipd-tabla-densa__mono">12.1 min</td>
                    <td className="ipd-tabla-densa__mono">70%</td>
                    <td><span className="ipd-badge ipd-badge--success">Estable</span></td>
                  </tr>
                  <tr>
                    <td>Abr 2024</td>
                    <td className="ipd-tabla-densa__mono">74</td>
                    <td className="ipd-tabla-densa__mono">890</td>
                    <td className="ipd-tabla-densa__mono">10.4 min</td>
                    <td className="ipd-tabla-densa__mono">75%</td>
                    <td><span className="ipd-badge ipd-badge--success">Estable</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Seccion>

        {/* --- 6.4 Tooltip guía --- */}
        <Seccion titulo="6.4 · Tooltip guia (tour)" id="tooltip">
          <div style={{ position: 'relative', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className="ipd-btn-sim ipd-btn-sim--secundario"
              onClick={() => setTooltipVisible(!tooltipVisible)}
            >
              {tooltipVisible ? 'Ocultar tooltip' : 'Mostrar tooltip'}
            </button>
            {tooltipVisible && (
              <div className="ipd-tooltip-guia ipd-tooltip-guia--arriba" style={{ top: -10, left: '50%', transform: 'translate(-50%, -100%)' }}>
                <div className="ipd-tooltip-guia__flecha" />
                <div className="ipd-tooltip-guia__paso">Paso 2 de 5</div>
                <div className="ipd-tooltip-guia__titulo">Selecciona una herramienta</div>
                <div className="ipd-tooltip-guia__texto">
                  Cada herramienta tiene un costo en creditos. Elige la que mejor se adapte a tu hipotesis.
                </div>
                <div className="ipd-tooltip-guia__acciones">
                  <button className="ipd-btn-sim ipd-btn-sim--terciario ipd-btn-sim--sm">Anterior</button>
                  <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--sm">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </Seccion>

        {/* --- 6.5 Modal --- */}
        <Seccion titulo="6.5 · Modal del simulador" id="modal">
          <div style={{
            padding: 'var(--ipd-space-8)',
            background: 'var(--ipd-superficie-2)',
            borderRadius: 'var(--ipd-radius-superficie)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div style={{
              maxWidth: 560,
              width: '100%',
              borderRadius: 'var(--ipd-radius-superficie)',
              boxShadow: 'var(--ipd-elev-4)',
              background: 'var(--ipd-superficie-1)',
              overflow: 'hidden',
            }}>
              <div className="ipd-modal-sim__encabezado" style={{ padding: 'var(--ipd-space-6) var(--ipd-space-6) 0' }}>
                <span className="ipd-modal-sim__titulo">Confirmar intervencion</span>
                <button className="ipd-modal-sim__cerrar">✕</button>
              </div>
              <div className="ipd-modal-sim__cuerpo" style={{ padding: 'var(--ipd-space-5) var(--ipd-space-6)' }}>
                <p>Estas a punto de ejecutar la intervencion &quot;Capacitacion intensiva&quot;. Esto consumira 3 creditos de tu presupuesto.</p>
              </div>
              <div className="ipd-modal-sim__pie" style={{ padding: 'var(--ipd-space-4) var(--ipd-space-6) var(--ipd-space-6)' }}>
                <button className="ipd-btn-sim ipd-btn-sim--terciario">Cancelar</button>
                <button className="ipd-btn-sim ipd-btn-sim--primario">Confirmar</button>
              </div>
            </div>
          </div>
        </Seccion>

        {/* --- Login card --- */}
        <Seccion titulo="Extra · Tarjeta de login" id="login">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="ipd-login">
              <h2 className="ipd-login__titulo">ETF Bank</h2>
              <p className="ipd-login__subtitulo">Simulador de Analisis Causal</p>
              <div style={{ marginTop: 'var(--ipd-space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--ipd-space-4)' }}>
                <div className="ipd-field">
                  <label className="ipd-label">Codigo de sala</label>
                  <input className="ipd-input" placeholder="ABC123" style={{ fontFamily: 'var(--ipd-font-mono)', letterSpacing: '0.1em' }} />
                </div>
                <div className="ipd-field">
                  <label className="ipd-label">Correo electronico</label>
                  <input className="ipd-input" type="email" placeholder="tu.correo@ejemplo.com" />
                </div>
                <button className="ipd-btn-sim ipd-btn-sim--primario ipd-btn-sim--bloque ipd-btn-sim--lg" style={{ marginTop: 'var(--ipd-space-2)' }}>
                  Unirse a la sesion
                </button>
              </div>
            </div>
          </div>
        </Seccion>

        {/* --- Tokens visuales --- */}
        <Seccion titulo="Tokens · Elevacion" id="elevacion">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--ipd-space-5)' }}>
            {[0, 1, 2, 3, 4].map(n => (
              <div key={n} style={{
                padding: 'var(--ipd-space-6)',
                background: 'var(--ipd-superficie-1)',
                borderRadius: 'var(--ipd-radius-superficie)',
                boxShadow: `var(--ipd-elev-${n})`,
                textAlign: 'center',
              }}>
                <span style={{ fontFamily: 'var(--ipd-font-mono)', fontSize: 'var(--ipd-size-sm)', color: 'var(--ipd-text-secondary)' }}>
                  elev-{n}
                </span>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Tokens · Superficies" id="superficies">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--ipd-space-5)' }}>
            {[
              { nombre: 'superficie-fondo', variable: 'var(--ipd-superficie-fondo)' },
              { nombre: 'superficie-1', variable: 'var(--ipd-superficie-1)' },
              { nombre: 'superficie-2', variable: 'var(--ipd-superficie-2)' },
              { nombre: 'superficie-3', variable: 'var(--ipd-superficie-3)' },
            ].map(s => (
              <div key={s.nombre} style={{
                padding: 'var(--ipd-space-6)',
                background: s.variable,
                borderRadius: 'var(--ipd-radius-superficie)',
                boxShadow: 'var(--ipd-elev-1)',
                textAlign: 'center',
              }}>
                <span style={{ fontFamily: 'var(--ipd-font-mono)', fontSize: 'var(--ipd-size-xs)', color: 'var(--ipd-text-secondary)' }}>
                  {s.nombre}
                </span>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Tokens · Radio" id="radio">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ipd-space-5)', alignItems: 'center' }}>
            {[
              { nombre: 'control (8px)', radio: 'var(--ipd-radius-control)' },
              { nombre: 'superficie (14px)', radio: 'var(--ipd-radius-superficie)' },
              { nombre: 'pill (999px)', radio: 'var(--ipd-radius-pill)' },
            ].map(r => (
              <div key={r.nombre} style={{
                width: 120,
                height: 80,
                background: 'var(--ipd-superficie-1)',
                borderRadius: r.radio,
                boxShadow: 'var(--ipd-elev-1)',
                display: 'grid',
                placeItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--ipd-font-mono)', fontSize: 'var(--ipd-size-2xs)', color: 'var(--ipd-text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>
                  {r.nombre}
                </span>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Aparicion escalonada" id="escalonada">
          <div className="ipd-escalonar" style={{ display: 'flex', gap: 'var(--ipd-space-4)' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="ipd-kpi" style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                <span className="ipd-kpi__etiqueta">Item {n}</span>
                <span className="ipd-kpi__valor">{n * 10}</span>
              </div>
            ))}
          </div>
        </Seccion>
      </main>

      <footer style={{ textAlign: 'center', padding: 'var(--ipd-space-12) 0 var(--ipd-space-8)', color: 'var(--ipd-text-tertiary)', fontSize: 'var(--ipd-size-xs)' }}>
        IPADE Design System v2 · Simulador de Analisis Causal
      </footer>
    </div>
  );
}

function Seccion({ titulo, id, children }: { titulo: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 'var(--ipd-space-8)' }}>
      <h2 style={{
        fontFamily: 'var(--ipd-font-display)',
        fontSize: 'var(--ipd-size-xl)',
        fontWeight: 600,
        letterSpacing: 'var(--ipd-tracking-title)',
        color: 'var(--ipd-text-brand)',
        marginBottom: 'var(--ipd-space-5)',
        paddingBottom: 'var(--ipd-space-3)',
        borderBottom: '2px solid var(--ipd-border-brand)',
      }}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}
