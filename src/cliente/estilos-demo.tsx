import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './ipade-ds/tokens.css';
import './ipade-ds/base.css';
import './ipade-ds/components.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function SeccionDemo({ titulo, children, superficie }: {
  titulo: string;
  children: React.ReactNode;
  superficie?: string;
}) {
  return (
    <section style={{ background: superficie, padding: '48px 0' }}>
      <div className="ipd-container">
        <h2 className="ipd-h3" style={{ marginBottom: '32px' }}>{titulo}</h2>
        {children}
      </div>
    </section>
  );
}

function Demo() {
  return (
    <div style={{ background: 'var(--ipd-superficie-fondo)' }}>
      <header style={{ background: 'var(--ipd-bg-brand)', color: 'var(--ipd-text-on-brand)', padding: '48px 0' }}>
        <div className="ipd-container">
          <p className="ipd-overline" style={{ color: 'var(--ipd-color-gold-400)', marginBottom: '12px' }}>IPADE Design System v2.0</p>
          <h1 className="ipd-h1" style={{ color: 'inherit' }}>Catálogo de estilos</h1>
          <p style={{ color: 'var(--ipd-color-navy-200)', marginTop: '8px', maxWidth: '48ch' }}>
            Verificación visual de tokens, tipografía, superficies, elevación y componentes rediseñados.
          </p>
        </div>
      </header>

      {/* Superficies */}
      <SeccionDemo titulo="Superficies con temperatura">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {[
            { nombre: 'superficie-fondo', valor: '#F7F9FC', variable: '--ipd-superficie-fondo' },
            { nombre: 'superficie-1', valor: '#FFFFFF', variable: '--ipd-superficie-1' },
            { nombre: 'superficie-2', valor: '#F2F5F9', variable: '--ipd-superficie-2' },
            { nombre: 'superficie-3', valor: '#E8EDF4', variable: '--ipd-superficie-3' },
          ].map(s => (
            <div key={s.nombre} style={{
              background: `var(${s.variable})`,
              borderRadius: 'var(--ipd-radius-superficie)',
              boxShadow: 'var(--ipd-elev-1)',
              padding: '24px',
            }}>
              <p className="ipd-body" style={{ fontWeight: 500 }}>{s.nombre}</p>
              <code className="cifra" style={{ fontFamily: 'var(--ipd-font-mono)', fontSize: 'var(--ipd-size-xs)', color: 'var(--ipd-text-tertiary)' }}>{s.valor}</code>
            </div>
          ))}
        </div>
      </SeccionDemo>

      {/* Radios */}
      <SeccionDemo titulo="Vocabulario de radio" superficie="var(--ipd-superficie-1)">
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { nombre: 'control (8px)', radio: 'var(--ipd-radius-control)', ancho: '120px', alto: '48px' },
            { nombre: 'superficie (14px)', radio: 'var(--ipd-radius-superficie)', ancho: '200px', alto: '120px' },
            { nombre: 'pill (999px)', radio: 'var(--ipd-radius-pill)', ancho: '140px', alto: '40px' },
          ].map(r => (
            <div key={r.nombre} style={{ textAlign: 'center' }}>
              <div style={{
                width: r.ancho,
                height: r.alto,
                background: 'var(--ipd-superficie-2)',
                borderRadius: r.radio,
                boxShadow: 'var(--ipd-elev-1)',
                marginBottom: '12px',
              }} />
              <p className="ipd-caption">{r.nombre}</p>
            </div>
          ))}
        </div>
      </SeccionDemo>

      {/* Elevacion */}
      <SeccionDemo titulo="Cinco niveles de elevación">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
          {[0, 1, 2, 3, 4].map(n => (
            <div key={n} style={{
              background: 'var(--ipd-superficie-1)',
              borderRadius: 'var(--ipd-radius-superficie)',
              boxShadow: `var(--ipd-elev-${n})`,
              padding: '32px 24px',
              textAlign: 'center',
            }}>
              <p className="ipd-h4">elev-{n}</p>
              <p className="ipd-caption" style={{ marginTop: '4px' }}>
                {['contorno', 'descanso', 'hover', 'flotante', 'modal'][n]}
              </p>
            </div>
          ))}
        </div>
      </SeccionDemo>

      {/* Tipografia */}
      <SeccionDemo titulo="Escala tipográfica" superficie="var(--ipd-superficie-1)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>display-1 · Source Serif 4 · tracking-display</p>
            <p className="ipd-display-1">Análisis Causal</p>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>display-2 · Source Serif 4 · tracking-display</p>
            <p className="ipd-display-2">Decisión Estratégica</p>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>h1 · Source Serif 4 · tracking-heading</p>
            <h1 className="ipd-h1">Método del Caso Interactivo</h1>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>h2 · Source Serif 4 · tracking-heading</p>
            <h2 className="ipd-h2">Diagnóstico Financiero</h2>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>h3 · Source Serif 4 · tracking-subheading</p>
            <h3 className="ipd-h3">Intervención del Participante</h3>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>h4 · Source Serif 4 · tracking-title</p>
            <h4 className="ipd-h4">Resultado Operativo Neto</h4>
          </div>
          <hr className="ipd-divider" />
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>h5 · Inter · tracking-body</p>
            <h5 className="ipd-h5">Indicadores Clave de Rendimiento</h5>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>h6 · Inter · tracking-body</p>
            <h6 className="ipd-h6">Panel de información complementaria</h6>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>lead</p>
            <p className="ipd-lead">La simulación evalúa decisiones bajo incertidumbre en un entorno de análisis causal con retroalimentación inmediata.</p>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>body (md) / body-sm / caption</p>
            <p className="ipd-body">Texto base a 16px con interlineado relajado. Números tabulares: <span className="cifra">1,234,567.89</span></p>
            <p className="ipd-body-sm" style={{ marginTop: '8px' }}>Texto secundario a 14px. «El análisis confirma la hipótesis planteada.»</p>
            <p className="ipd-caption" style={{ marginTop: '8px' }}>Pie de dato a 12px. Última actualización: 14:32:07</p>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>overline / eyebrow</p>
            <p className="ipd-overline">Programa Ejecutivo</p>
            <p className="ipd-eyebrow" style={{ marginTop: '8px' }}>Sección académica</p>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '4px' }}>mono · IBM Plex Mono · tabular-nums</p>
            <p style={{ fontFamily: 'var(--ipd-font-mono)', fontSize: 'var(--ipd-size-lg)' }} className="cifra">$2,847,391.00</p>
            <p style={{ fontFamily: 'var(--ipd-font-mono)', fontSize: 'var(--ipd-size-md)' }} className="cifra">ROE: 18.47% | WACC: 12.3%</p>
          </div>
        </div>
      </SeccionDemo>

      {/* Botones */}
      <SeccionDemo titulo="Botones">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Variantes</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <button className="ipd-btn ipd-btn--primary">Primario</button>
              <button className="ipd-btn ipd-btn--secondary">Secundario</button>
              <button className="ipd-btn ipd-btn--tertiary">Terciario</button>
              <button className="ipd-btn ipd-btn--danger">Peligro</button>
              <button className="ipd-btn ipd-btn--accent">Acento</button>
              <button className="ipd-btn ipd-btn--ghost">Fantasma</button>
            </div>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Tamaños</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <button className="ipd-btn ipd-btn--primary ipd-btn--sm">Pequeño</button>
              <button className="ipd-btn ipd-btn--primary">Normal</button>
              <button className="ipd-btn ipd-btn--primary ipd-btn--lg">Grande</button>
            </div>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Estados</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <button className="ipd-btn ipd-btn--primary" disabled>Deshabilitado</button>
              <button className="ipd-btn ipd-btn--secondary" disabled>Deshabilitado</button>
              <button className="ipd-btn ipd-btn--primary" data-loading="true">Cargando...</button>
            </div>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Bloque completo</p>
            <button className="ipd-btn ipd-btn--primary ipd-btn--block">Confirmar consultoría</button>
          </div>
        </div>
      </SeccionDemo>

      {/* Tema oscuro botones */}
      <SeccionDemo titulo="Botones en superficie oscura" superficie="var(--ipd-bg-brand)">
        <div className="ipd-theme-dark" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button className="ipd-btn ipd-btn--primary">Primario (invertido)</button>
          <button className="ipd-btn ipd-btn--secondary">Secundario (borde)</button>
          <button className="ipd-btn ipd-btn--tertiary">Terciario</button>
        </div>
      </SeccionDemo>

      {/* Campos */}
      <SeccionDemo titulo="Campos de formulario" superficie="var(--ipd-superficie-1)">
        <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="ipd-field">
            <label className="ipd-label">Nombre del equipo <span className="ipd-label__required">*</span></label>
            <input className="ipd-input" type="text" placeholder="Ej. Águilas Reales" />
            <span className="ipd-help">Máximo 40 caracteres.</span>
          </div>
          <div className="ipd-field">
            <label className="ipd-label">Hipótesis causal</label>
            <textarea className="ipd-textarea" placeholder="Describa su análisis causal..." />
          </div>
          <div className="ipd-field">
            <label className="ipd-label">Área de diagnóstico</label>
            <select className="ipd-select">
              <option>Seleccione...</option>
              <option>Finanzas</option>
              <option>Mercadotecnia</option>
              <option>Operaciones</option>
            </select>
          </div>
          <div className="ipd-field">
            <label className="ipd-label">Campo con error</label>
            <input className="ipd-input" type="text" aria-invalid="true" defaultValue="abc" />
            <span className="ipd-error">El valor ingresado no es válido.</span>
          </div>
          <div className="ipd-field">
            <label className="ipd-label">Campo deshabilitado</label>
            <input className="ipd-input" type="text" disabled defaultValue="Sólo lectura" />
          </div>
          <div className="ipd-field">
            <div className="ipd-choice">
              <input type="checkbox" id="c1" defaultChecked />
              <span>Acepto las condiciones de participación</span>
            </div>
            <div className="ipd-choice">
              <input type="radio" name="r" id="r1" defaultChecked />
              <span>Opción A: Incrementar inversión</span>
            </div>
            <div className="ipd-choice">
              <input type="radio" name="r" id="r2" />
              <span>Opción B: Mantener posición</span>
            </div>
          </div>
        </div>
      </SeccionDemo>

      {/* KPI Cards */}
      <SeccionDemo titulo="Tarjetas KPI">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
          <div className="ipd-kpi-card">
            <span className="ipd-kpi-card__label">Ingresos netos</span>
            <span className="ipd-kpi-card__value">$2.84M</span>
            <span className="ipd-kpi-card__delta ipd-kpi-card__delta--up">+12.4%</span>
            <div className="ipd-kpi-card__spark" style={{ background: 'var(--ipd-superficie-2)', borderRadius: '4px' }} />
          </div>
          <div className="ipd-kpi-card">
            <span className="ipd-kpi-card__label">Satisfacción</span>
            <span className="ipd-kpi-card__value">87.2%</span>
            <span className="ipd-kpi-card__delta ipd-kpi-card__delta--down">-3.1%</span>
            <div className="ipd-kpi-card__spark" style={{ background: 'var(--ipd-superficie-2)', borderRadius: '4px' }} />
          </div>
          <div className="ipd-kpi-card">
            <span className="ipd-kpi-card__label">ROE</span>
            <span className="ipd-kpi-card__value">18.47%</span>
            <span className="ipd-kpi-card__delta ipd-kpi-card__delta--flat">0.0%</span>
          </div>
          <div className="ipd-kpi-card">
            <span className="ipd-kpi-card__label">Consultas restantes</span>
            <span className="ipd-kpi-card__value">3</span>
          </div>
        </div>
      </SeccionDemo>

      {/* Tabla densa */}
      <SeccionDemo titulo="Tabla de datos densos" superficie="var(--ipd-superficie-1)">
        <div className="ipd-data-table-wrap">
          <table className="ipd-data-table">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Participantes</th>
                <th style={{ textAlign: 'right' }}>Ingresos</th>
                <th style={{ textAlign: 'right' }}>Margen</th>
                <th style={{ textAlign: 'right' }}>NPS</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Águilas Reales</td>
                <td>6</td>
                <td className="num">$2,847,391</td>
                <td className="num">18.4%</td>
                <td className="num">72</td>
                <td><span className="ipd-badge ipd-badge--success">Activo</span></td>
              </tr>
              <tr>
                <td>Leones de Montaña</td>
                <td>5</td>
                <td className="num">$1,923,455</td>
                <td className="num">14.2%</td>
                <td className="num">68</td>
                <td><span className="ipd-badge ipd-badge--success">Activo</span></td>
              </tr>
              <tr aria-selected="true">
                <td>Halcones del Norte</td>
                <td>6</td>
                <td className="num">$3,102,780</td>
                <td className="num">21.7%</td>
                <td className="num">81</td>
                <td><span className="ipd-badge ipd-badge--accent">Líder</span></td>
              </tr>
              <tr>
                <td>Jaguares del Sur</td>
                <td>4</td>
                <td className="num">$987,120</td>
                <td className="num">8.3%</td>
                <td className="num">45</td>
                <td><span className="ipd-badge ipd-badge--warning">En riesgo</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="ipd-h5" style={{ marginTop: '32px', marginBottom: '16px' }}>Variante compacta</h3>
        <div className="ipd-data-table-wrap">
          <table className="ipd-data-table ipd-data-table--compact">
            <thead>
              <tr>
                <th>Variable</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right' }}>Delta</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Tasa de retención</td><td className="num">92.3%</td><td className="num">+1.2%</td></tr>
              <tr><td>Costo de adquisición</td><td className="num">$4,280</td><td className="num">-8.7%</td></tr>
              <tr><td>Ticket promedio</td><td className="num">$12,450</td><td className="num">+3.4%</td></tr>
            </tbody>
          </table>
        </div>
      </SeccionDemo>

      {/* Badges y alertas */}
      <SeccionDemo titulo="Etiquetas y alertas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Badges</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span className="ipd-badge">Neutral</span>
              <span className="ipd-badge ipd-badge--brand">Marca</span>
              <span className="ipd-badge ipd-badge--accent">Acento</span>
              <span className="ipd-badge ipd-badge--success">Éxito</span>
              <span className="ipd-badge ipd-badge--warning">Advertencia</span>
              <span className="ipd-badge ipd-badge--danger">Peligro</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div className="ipd-alert ipd-alert--info">
              <div className="ipd-alert__body"><div className="ipd-alert__title">Información</div>La siguiente fase comienza en 5 minutos.</div>
            </div>
            <div className="ipd-alert ipd-alert--success">
              <div className="ipd-alert__body"><div className="ipd-alert__title">Correcto</div>Su consultoría fue registrada con éxito.</div>
            </div>
            <div className="ipd-alert ipd-alert--warning">
              <div className="ipd-alert__body"><div className="ipd-alert__title">Atención</div>Quedan únicamente 2 consultas disponibles.</div>
            </div>
            <div className="ipd-alert ipd-alert--danger">
              <div className="ipd-alert__body"><div className="ipd-alert__title">Error</div>No fue posible procesar la intervención solicitada.</div>
            </div>
          </div>
        </div>
      </SeccionDemo>

      {/* Tarjetas */}
      <SeccionDemo titulo="Tarjetas" superficie="var(--ipd-superficie-1)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="ipd-card ipd-card--interactive">
            <div className="ipd-card__media" />
            <div className="ipd-card__body">
              <span className="ipd-card__meta">Finanzas corporativas</span>
              <h3 className="ipd-card__title"><a href="#!">Análisis de Estructura de Capital</a></h3>
              <p className="ipd-card__excerpt">Evaluación del apalancamiento óptimo considerando el costo promedio ponderado de capital.</p>
              <div className="ipd-card__footer">
                <span className="ipd-badge ipd-badge--brand">Caso activo</span>
              </div>
            </div>
          </div>
          <div className="ipd-card">
            <div className="ipd-card__body">
              <span className="ipd-card__meta">Mercadotecnia</span>
              <h3 className="ipd-card__title">Estrategia de Posicionamiento</h3>
              <p className="ipd-card__excerpt">Diagnóstico del embudo de conversión y propuesta de intervención en puntos críticos.</p>
            </div>
          </div>
          <div className="ipd-program-card">
            <span className="ipd-overline" style={{ color: 'var(--ipd-color-gold-400)' }}>Programa ejecutivo</span>
            <h3 className="ipd-program-card__title">Dirección Estratégica Avanzada</h3>
            <p className="ipd-program-card__desc">Formación para la alta dirección en análisis causal y toma de decisiones.</p>
          </div>
        </div>
      </SeccionDemo>

      {/* Tooltip */}
      <SeccionDemo titulo="Globo de ayuda (tooltip)">
        <div style={{ position: 'relative', minHeight: '200px' }}>
          <div className="ipd-tooltip" style={{ position: 'relative', display: 'inline-block' }}>
            <p className="ipd-tooltip__title">Panel de diagnóstico</p>
            <p className="ipd-tooltip__text">
              Aquí se muestran los indicadores principales del equipo. Cada valor se actualiza en tiempo real conforme avanzan las fases del caso.
            </p>
            <div className="ipd-tooltip__actions">
              <span className="ipd-tooltip__step">2 / 7</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ipd-btn ipd-btn--tertiary ipd-btn--sm">Anterior</button>
                <button className="ipd-btn ipd-btn--primary ipd-btn--sm">Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      </SeccionDemo>

      {/* Modal */}
      <SeccionDemo titulo="Modal (estático)" superficie="var(--ipd-superficie-1)">
        <div style={{
          maxWidth: '560px',
          background: 'var(--ipd-superficie-1)',
          borderRadius: 'var(--ipd-radius-superficie)',
          boxShadow: 'var(--ipd-elev-4)',
          overflow: 'hidden',
        }}>
          <div className="ipd-modal__header">
            <h3 style={{
              fontFamily: 'var(--ipd-font-display)',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: 'var(--ipd-tracking-subheading)',
            }}>
              Confirmar consultoría
            </h3>
          </div>
          <div className="ipd-modal__body">
            <p>¿Está seguro de solicitar la consultoría de Análisis Financiero? Esta acción consumirá una de sus 3 consultas restantes.</p>
          </div>
          <div className="ipd-modal__footer">
            <button className="ipd-btn ipd-btn--secondary">Cancelar</button>
            <button className="ipd-btn ipd-btn--primary">Confirmar</button>
          </div>
        </div>
      </SeccionDemo>

      {/* Tabs y acordeon */}
      <SeccionDemo titulo="Pestañas y acordeón">
        <div style={{ maxWidth: '600px' }}>
          <div className="ipd-tabs__list" role="tablist">
            <button className="ipd-tabs__tab" role="tab" aria-selected="true">Resumen</button>
            <button className="ipd-tabs__tab" role="tab" aria-selected="false">Diagnóstico</button>
            <button className="ipd-tabs__tab" role="tab" aria-selected="false">Intervención</button>
          </div>
          <div className="ipd-tabs__panel">
            <p className="ipd-body">Contenido de la pestaña seleccionada con información del caso.</p>
          </div>
        </div>
        <div style={{ maxWidth: '600px', marginTop: '32px' }}>
          <div className="ipd-accordion">
            <div className="ipd-accordion__item">
              <details>
                <summary className="ipd-accordion__trigger">¿Qué es el análisis causal?</summary>
                <div className="ipd-accordion__panel">
                  <p className="ipd-body-sm">El análisis causal es una metodología que busca identificar las relaciones causa-efecto entre variables de un sistema complejo.</p>
                </div>
              </details>
            </div>
            <div className="ipd-accordion__item">
              <details>
                <summary className="ipd-accordion__trigger">¿Cuántas consultas tengo disponibles?</summary>
                <div className="ipd-accordion__panel">
                  <p className="ipd-body-sm">Cada equipo inicia con un número limitado de consultas que varía según la configuración del profesor.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </SeccionDemo>

      {/* Estados */}
      <SeccionDemo titulo="Estados de carga y vacío" superficie="var(--ipd-superficie-1)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px' }}>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Barra de progreso indeterminada</p>
            <div className="ipd-progress-bar">
              <div className="ipd-progress-bar__fill" />
            </div>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Esqueleto de carga</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="ipd-skeleton" style={{ width: '60%', height: '20px' }} />
              <div className="ipd-skeleton" style={{ width: '100%', height: '14px' }} />
              <div className="ipd-skeleton" style={{ width: '80%', height: '14px' }} />
            </div>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Estado vacío</p>
            <div className="ipd-empty" style={{ background: 'var(--ipd-superficie-fondo)', borderRadius: 'var(--ipd-radius-superficie)' }}>
              <p className="ipd-empty__title">Sin datos disponibles</p>
              <p className="ipd-empty__desc">Aún no se han registrado intervenciones para este equipo en la fase actual.</p>
              <button className="ipd-btn ipd-btn--secondary ipd-btn--sm" style={{ marginTop: '8px' }}>Actualizar</button>
            </div>
          </div>
        </div>
      </SeccionDemo>

      {/* Stats */}
      <SeccionDemo titulo="Contador de cifras" superficie="var(--ipd-bg-brand)">
        <div className="ipd-stats ipd-theme-dark">
          <div>
            <p className="ipd-stat__value">60+</p>
            <p className="ipd-stat__label">Años de trayectoria</p>
          </div>
          <div>
            <p className="ipd-stat__value">50K</p>
            <p className="ipd-stat__label">Egresados</p>
          </div>
          <div>
            <p className="ipd-stat__value">#1</p>
            <p className="ipd-stat__label">En Latinoamérica</p>
          </div>
          <div>
            <p className="ipd-stat__value">97%</p>
            <p className="ipd-stat__label">Satisfacción</p>
          </div>
        </div>
      </SeccionDemo>

      {/* Anillo de foco */}
      <SeccionDemo titulo="Anillo de foco" superficie="var(--ipd-superficie-1)">
        <p className="ipd-body-sm" style={{ marginBottom: '16px', color: 'var(--ipd-text-secondary)' }}>
          Usa Tab para navegar y verificar el anillo dorado de 2px con offset.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <button className="ipd-btn ipd-btn--primary">Botón primario</button>
          <button className="ipd-btn ipd-btn--secondary">Botón secundario</button>
          <input className="ipd-input" type="text" placeholder="Campo de texto" style={{ maxWidth: '240px' }} />
          <a href="#!" className="ipd-link">Enlace de ejemplo</a>
        </div>
      </SeccionDemo>

      {/* Paginacion y breadcrumb */}
      <SeccionDemo titulo="Navegación auxiliar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Migas de pan</p>
            <nav className="ipd-breadcrumb" aria-label="Ubicación">
              <ol>
                <li><a href="#!">Inicio</a></li>
                <li><a href="#!">Simulador</a></li>
                <li><span aria-current="page">Fase 3</span></li>
              </ol>
            </nav>
          </div>
          <div>
            <p className="ipd-caption" style={{ marginBottom: '12px' }}>Paginación</p>
            <nav className="ipd-pagination">
              <a href="#!">Ant.</a>
              <a href="#!">1</a>
              <span aria-current="page">2</span>
              <a href="#!">3</a>
              <a href="#!">4</a>
              <a href="#!">Sig.</a>
            </nav>
          </div>
        </div>
      </SeccionDemo>

      {/* Timeline */}
      <SeccionDemo titulo="Cronología" superficie="var(--ipd-superficie-1)">
        <div className="ipd-timeline" style={{ maxWidth: '500px' }}>
          <div className="ipd-timeline__item">
            <p className="ipd-timeline__year">Fase 1</p>
            <p className="ipd-body-sm" style={{ marginTop: '4px', color: 'var(--ipd-text-secondary)' }}>Lectura del caso y diagnóstico inicial. Identificación de variables clave.</p>
          </div>
          <div className="ipd-timeline__item">
            <p className="ipd-timeline__year">Fase 2</p>
            <p className="ipd-body-sm" style={{ marginTop: '4px', color: 'var(--ipd-text-secondary)' }}>Análisis financiero y consultas especializadas. Formulación de hipótesis.</p>
          </div>
          <div className="ipd-timeline__item">
            <p className="ipd-timeline__year">Fase 3</p>
            <p className="ipd-body-sm" style={{ marginTop: '4px', color: 'var(--ipd-text-secondary)' }}>Intervención estratégica y presentación de resultados finales.</p>
          </div>
        </div>
      </SeccionDemo>

      {/* Tabla institucional */}
      <SeccionDemo titulo="Tabla institucional">
        <div style={{ overflowX: 'auto' }}>
          <table className="ipd-table">
            <caption>Comparativo de programas ejecutivos 2026</caption>
            <thead>
              <tr>
                <th>Programa</th>
                <th>Duración</th>
                <th style={{ textAlign: 'right' }}>Inversión</th>
                <th>Modalidad</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>AD-2</td><td>11 meses</td><td style={{ textAlign: 'right', fontFamily: 'var(--ipd-font-mono)' }}>$480,000</td><td>Presencial</td></tr>
              <tr><td>MEDEX</td><td>18 meses</td><td style={{ textAlign: 'right', fontFamily: 'var(--ipd-font-mono)' }}>$720,000</td><td>Presencial</td></tr>
              <tr><td>D-1</td><td>8 meses</td><td style={{ textAlign: 'right', fontFamily: 'var(--ipd-font-mono)' }}>$340,000</td><td>Mixta</td></tr>
            </tbody>
          </table>
        </div>
      </SeccionDemo>

      {/* Testimonial */}
      <SeccionDemo titulo="Testimonio" superficie="var(--ipd-superficie-1)">
        <div className="ipd-testimonial" style={{ maxWidth: '700px' }}>
          <div className="ipd-testimonial__avatar" style={{ background: 'var(--ipd-superficie-2)' }} />
          <div>
            <blockquote className="ipd-testimonial__quote">
              «La simulación de análisis causal transformó la forma en que nuestro equipo directivo aborda los problemas complejos de la organización.»
            </blockquote>
            <p className="ipd-testimonial__author">María González Fernández</p>
            <p className="ipd-testimonial__role">Directora de Operaciones, Grupo Industrial</p>
          </div>
        </div>
      </SeccionDemo>

      {/* Footer */}
      <footer style={{
        background: 'var(--ipd-color-navy-900)',
        color: 'var(--ipd-color-navy-200)',
        padding: '48px 0 24px',
        marginTop: '48px',
      }}>
        <div className="ipd-container">
          <p style={{ fontSize: 'var(--ipd-size-xs)' }}>
            IPADE Design System v2.0 — Catálogo generado automáticamente. Todos los componentes usan exclusivamente tokens nuevos.
          </p>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
