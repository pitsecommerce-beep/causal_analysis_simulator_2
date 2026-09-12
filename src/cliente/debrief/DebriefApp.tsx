import { useState, useCallback, useRef } from 'react';
import type { DatosDebrief, EquipoDebrief, KPIsDebrief } from './tipos';
import { LogoIPADE } from '../componentes/LogoIPADE';

interface Props {
  datos: DatosDebrief;
  onSalir?: () => void;
}

const TOTAL_PANELES = 10;

const TITULOS = [
  'La brecha',
  'El veredicto causal',
  'Diagnostico contra impacto',
  'Trayectorias',
  'Que eligieron',
  'Las trampas',
  'Rigor contra resultado',
  'Ritmo de decision',
  'Detalle por equipo',
  'Puente A3',
];

const LECTURAS = [
  'Cuanto habia sobre la mesa.',
  'Esa cifra al lado del nombre es el argumento completo.',
  'Acertar el resultado no es lo mismo que entender la causa.',
  'Donde se separaron las trayectorias, y que decision lo provoco.',
  'La intervencion mas popular casi nunca es la mas rentable.',
  'Una metrica que mejora no es evidencia de que el proceso mejoro.',
  'El metodo vence al volumen.',
  'La paralisis por analisis tiene un costo medible.',
  '',
  'El A3 mide si la logica del equipo se sostiene fuera del simulador.',
];

export function DebriefApp({ datos, onSalir }: Props) {
  const [panel, setPanel] = useState(0);
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const [equipoHover, setEquipoHover] = useState<string | null>(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>(datos.equipos[0]?.nombre ?? '');
  const panelRef = useRef<HTMLDivElement>(null);

  function ir(delta: number) {
    setPanel(p => Math.max(0, Math.min(TOTAL_PANELES - 1, p + delta)));
  }

  const exportarXLSX = useCallback(async () => {
    const XLSX = await import('xlsx');
    const filas = datos.equipos.map(eq => ({
      Equipo: eq.nombre,
      Total: eq.resultado.total,
      Final: eq.resultado.final,
      Diagnostico: eq.resultado.diagnostico,
      Rigor: eq.resultado.rigor,
      Impacto: eq.resultado.impacto,
      Velocidad: eq.resultado.velocidad,
      Eficiencia: eq.resultado.eficiencia,
      Penalizaciones: eq.resultado.penalizaciones,
      Intervenciones: eq.intervenciones.map(i => i.nombre).join('; '),
      CausasEspurias: eq.diagnostico.causasEspurias.join('; '),
      VentanaCaptura: eq.diagnostico.ventanaCapturaEsCuello ? 'Si' : 'No',
      Reproceso: eq.diagnostico.reprocesoEsMecanismo ? 'Si' : 'No',
      FugaPlastico: eq.diagnostico.fugaPlastico ? 'Si' : 'No',
      SecuenciaBuro: eq.diagnostico.trabajoPerdidoBuro ? 'Si' : 'No',
      MinutoDiagnostico: eq.minutoDiagnostico,
      HipotesisEscritas: eq.hipotesisEscritas,
      CreditosUsados: eq.creditosUsados,
      PresupuestoRestante: eq.presupuestoRestante,
      T3_Ciclo: eq.historialKPIs[3]?.ventanaCapturaMediana ?? '',
      T3_Quejas: eq.historialKPIs[3]?.quejas ?? '',
      T3_Conversion: eq.historialKPIs[3]?.conversion ?? '',
      T3_Errores: eq.historialKPIs[3]?.erroresCaptura ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, 'debrief-resultados.xlsx');
  }, [datos]);

  const exportarPNG = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    if (svg) {
      const clone = svg.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const xml = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([xml], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debrief-panel-${panel + 1}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    window.print();
  }, [panel]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === ' ') ir(1);
    if (e.key === 'ArrowLeft') ir(-1);
  }

  const mejor = datos.equipos.reduce((a, b) => a.resultado.total > b.resultado.total ? a : b);

  return (
    <div
      className="debrief"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={() => ir(1)}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--ipd-color-navy-950, #00152B)',
        color: '#fff',
        fontFamily: 'var(--ipd-font-sans, Inter, sans-serif)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'e-resize',
      }}
    >
      <style>{`@media print {
        .debrief { position: static !important; overflow: visible !important; height: auto !important; }
        .debrief button { display: none !important; }
        .debrief svg { max-width: 100% !important; }
      }`}</style>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <LogoIPADE variante="blanco" alto={32} />
        <span style={{ opacity: 0.5, fontSize: 13 }}>Debrief</span>
        <span style={{ marginLeft: 'auto', opacity: 0.4, fontSize: 13, fontFamily: 'var(--ipd-font-mono, IBM Plex Mono, monospace)' }}>
          {panel + 1}/{TOTAL_PANELES}
        </span>
        <button
          onClick={e => { e.stopPropagation(); window.print(); }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          PDF
        </button>
        <button
          onClick={e => { e.stopPropagation(); exportarXLSX(); }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          XLSX
        </button>
        <button
          onClick={e => { e.stopPropagation(); exportarPNG(); }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          PNG
        </button>
        <button
          onClick={e => { e.stopPropagation(); setIndiceAbierto(!indiceAbierto); }}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          Indice
        </button>
        {onSalir && (
          <button
            onClick={e => { e.stopPropagation(); onSalir(); }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
            }}
          >
            Salir
          </button>
        )}
      </div>

      {/* Index sidebar */}
      {indiceAbierto && (
        <div style={{
          position: 'absolute', top: 50, right: 16, zIndex: 100,
          background: 'var(--ipd-color-navy-900, #001F3D)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: 12, width: 240,
        }} onClick={e => e.stopPropagation()}>
          {TITULOS.map((t, i) => (
            <button
              key={i}
              onClick={() => { setPanel(i); setIndiceAbierto(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: i === panel ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', color: '#fff', padding: '6px 8px', borderRadius: 4,
                cursor: 'pointer', fontSize: 13,
                opacity: i === panel ? 1 : 0.7,
              }}
            >
              {i + 1}. {t}
            </button>
          ))}
        </div>
      )}

      {/* Panel content */}
      <div ref={panelRef} style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '24px 48px',
        overflow: 'auto',
      }}>
        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--ipd-font-serif, "Source Serif 4", Georgia, serif)',
          fontSize: 'clamp(24px, 3vw, 42px)',
          fontWeight: 600,
          marginBottom: 8,
          textAlign: 'center',
        }}>
          {TITULOS[panel]}
        </h2>
        <p style={{
          fontSize: 'clamp(14px, 1.5vw, 18px)',
          opacity: 0.6,
          fontStyle: 'italic',
          marginBottom: 32,
          textAlign: 'center',
          maxWidth: 700,
        }}>
          {LECTURAS[panel]}
        </p>

        {/* Panel body */}
        <div style={{ width: '100%', maxWidth: 1100, flex: 1, minHeight: 0 }}>
          {panel === 0 && <PanelBrecha datos={datos} mejor={mejor} />}
          {panel === 1 && <PanelVeredicto datos={datos} />}
          {panel === 2 && <PanelDiagImpacto datos={datos} />}
          {panel === 3 && <PanelTrayectorias datos={datos} equipoHover={equipoHover} onHover={setEquipoHover} />}
          {panel === 4 && <PanelQueEligieron datos={datos} />}
          {panel === 5 && <PanelTrampas datos={datos} />}
          {panel === 6 && <PanelRigor datos={datos} />}
          {panel === 7 && <PanelRitmo datos={datos} />}
          {panel === 8 && <PanelDetalle datos={datos} seleccionado={equipoSeleccionado} onSeleccionar={setEquipoSeleccionado} />}
          {panel === 9 && <PanelA3 datos={datos} />}
        </div>
      </div>

      {/* Navigation dots */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8,
        padding: '12px 0 16px',
        flexShrink: 0,
      }} onClick={e => e.stopPropagation()}>
        {Array.from({ length: TOTAL_PANELES }, (_, i) => (
          <button
            key={i}
            onClick={() => setPanel(i)}
            style={{
              width: i === panel ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === panel ? 'var(--ipd-color-gold-500, #C6A65C)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              transition: 'width 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ========== PANEL 1: LA BRECHA ========== */

function CifraGrande({ valor, label, variacion }: { valor: string; label: string; variacion?: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 140 }}>
      <div style={{
        fontFamily: 'var(--ipd-font-mono, "IBM Plex Mono", monospace)',
        fontSize: 'clamp(28px, 4vw, 56px)',
        fontWeight: 700,
        color: 'var(--ipd-color-gold-500, #C6A65C)',
      }}>{valor}</div>
      <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>{label}</div>
      {variacion && <div style={{ fontSize: 13, color: 'var(--ipd-color-success-600, #1E7A46)', marginTop: 2 }}>{variacion}</div>}
    </div>
  );
}

function PanelBrecha({ datos, mejor }: { datos: DatosDebrief; mejor: EquipoDebrief }) {
  const base = datos.lineaBase;
  const mejorKPI = mejor.historialKPIs[mejor.historialKPIs.length - 1];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center' }}>
      <CifraGrande
        valor={`${mejorKPI.ventanaCapturaMediana}d`}
        label="Tiempo de ciclo mediano"
        variacion={`vs ${base.ventanaCapturaMediana}d base (${Math.round((1 - mejorKPI.ventanaCapturaMediana / base.ventanaCapturaMediana) * 100)}%)`}
      />
      <CifraGrande
        valor={`${mejorKPI.reproceso ?? 0}%`}
        label="Tasa de reproceso"
        variacion={`vs ${base.reproceso}% base`}
      />
      <CifraGrande
        valor={`${mejorKPI.atoradosPct}%`}
        label="Solicitudes atoradas"
        variacion={`vs ${base.atoradosPct}% base`}
      />
      <CifraGrande
        valor={`${mejorKPI.conversion}%`}
        label="Conversion"
        variacion={`vs ${base.conversion}% base`}
      />
    </div>
  );
}

/* ========== PANEL 2: EL VEREDICTO CAUSAL ========== */

function PanelVeredicto({ datos }: { datos: DatosDebrief }) {
  const n = datos.equipos.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {datos.dagVerdadero.map(nodo => (
          <div key={nodo.id} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '16px 24px',
            textAlign: 'center', minWidth: 180,
          }}>
            <div style={{
              fontFamily: 'var(--ipd-font-mono, "IBM Plex Mono", monospace)',
              fontSize: 32, fontWeight: 700,
              color: 'var(--ipd-color-gold-500, #C6A65C)',
            }}>
              {nodo.equiposIdentificaron}/{n}
            </div>
            <div style={{ fontSize: 15, marginTop: 6 }}>{nodo.nombre}</div>
          </div>
        ))}
      </div>

      {datos.trampas.filter(t => t.equiposDeclararon > 0).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 16, opacity: 0.5, marginBottom: 8 }}>Trampas declaradas como causa</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {datos.trampas.filter(t => t.equiposDeclararon > 0).map(t => (
              <div key={t.nombre} style={{
                background: 'rgba(179, 38, 30, 0.15)',
                border: '1px solid rgba(179, 38, 30, 0.3)',
                borderRadius: 6, padding: '8px 16px',
                fontSize: 14,
              }}>
                <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                <span style={{ opacity: 0.7 }}>: {t.equiposDeclararon} equipo{t.equiposDeclararon > 1 ? 's' : ''}</span>
                <span style={{ marginLeft: 8, opacity: 0.5 }}>r = {t.correlacionReal.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== PANEL 3: DIAGNOSTICO vs IMPACTO ========== */

function PanelDiagImpacto({ datos }: { datos: DatosDebrief }) {
  const maxDiag = 350;
  const maxImpacto = 300;

  const cuadrantes = [
    { label: 'Entendieron y lograron', x: 0.75, y: 0.25 },
    { label: 'Lograron sin entender', x: 0.25, y: 0.25 },
    { label: 'Entendieron, no ejecutaron', x: 0.75, y: 0.75 },
    { label: 'Ni una ni otra', x: 0.25, y: 0.75 },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 700, margin: '0 auto', aspectRatio: '1.2' }}>
      <svg viewBox="0 0 700 580" style={{ width: '100%', height: '100%' }}>
        {/* Grid */}
        <line x1="50" y1="30" x2="50" y2="530" stroke="rgba(255,255,255,0.15)" />
        <line x1="50" y1="530" x2="680" y2="530" stroke="rgba(255,255,255,0.15)" />
        {/* Midlines */}
        <line x1="365" y1="30" x2="365" y2="530" stroke="rgba(255,255,255,0.08)" strokeDasharray="4" />
        <line x1="50" y1="280" x2="680" y2="280" stroke="rgba(255,255,255,0.08)" strokeDasharray="4" />

        {/* Labels */}
        <text x="365" y="560" fill="rgba(255,255,255,0.5)" textAnchor="middle" fontSize="13">Puntaje de diagnostico</text>
        <text x="20" y="280" fill="rgba(255,255,255,0.5)" textAnchor="middle" fontSize="13" transform="rotate(-90, 20, 280)">Impacto en negocio</text>

        {/* Quadrant labels */}
        {cuadrantes.map(q => (
          <text key={q.label} x={50 + q.x * 630} y={30 + q.y * 500} fill="rgba(255,255,255,0.15)" textAnchor="middle" fontSize="11">{q.label}</text>
        ))}

        {/* Data points */}
        {datos.equipos.map(eq => {
          const x = 50 + (eq.resultado.diagnostico / maxDiag) * 630;
          const y = 530 - (eq.resultado.impacto / maxImpacto) * 500;
          return (
            <g key={eq.nombre}>
              <circle cx={x} cy={y} r={8} fill="var(--ipd-color-gold-500, #C6A65C)" fillOpacity={0.8} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              <text x={x} y={y - 12} fill="#fff" textAnchor="middle" fontSize="10" opacity={0.8}>{eq.nombre}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ========== PANEL 4: TRAYECTORIAS ========== */

function PanelTrayectorias({ datos, equipoHover, onHover }: {
  datos: DatosDebrief;
  equipoHover: string | null;
  onHover: (nombre: string | null) => void;
}) {
  const top3 = [...datos.equipos].sort((a, b) => b.resultado.total - a.resultado.total).slice(0, 3);
  const colores = ['var(--ipd-color-gold-500, #C6A65C)', '#4C82B8', '#1E7A46'];
  const svgW = 700;
  const svgH = 400;
  const pad = { l: 60, r: 20, t: 20, b: 40 };
  const w = svgW - pad.l - pad.r;
  const h = svgH - pad.t - pad.b;

  const allVals = datos.equipos.flatMap(e => e.historialKPIs.map(k => k.ventanaCapturaMediana));
  const maxV = Math.max(...allVals, 15);

  function linea(eq: EquipoDebrief): string {
    return eq.historialKPIs.map((k, i) => {
      const x = pad.l + (i / 3) * w;
      const y = pad.t + h - (k.ventanaCapturaMediana / maxV) * h;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  return (
    <div style={{ width: '100%', maxWidth: 750, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%' }}>
        {/* Y axis labels */}
        {[0, maxV / 2, maxV].map(v => {
          const y = pad.t + h - (v / maxV) * h;
          return (
            <g key={v}>
              <line x1={pad.l} y1={y} x2={svgW - pad.r} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={pad.l - 8} y={y + 4} fill="rgba(255,255,255,0.4)" textAnchor="end" fontSize="11">{Math.round(v)}d</text>
            </g>
          );
        })}
        {/* X axis labels */}
        {['Base', 'T1', 'T2', 'T3'].map((l, i) => (
          <text key={l} x={pad.l + (i / 3) * w} y={svgH - 10} fill="rgba(255,255,255,0.4)" textAnchor="middle" fontSize="11">{l}</text>
        ))}

        {/* Baseline */}
        <line
          x1={pad.l} y1={pad.t + h - (datos.lineaBase.ventanaCapturaMediana / maxV) * h}
          x2={svgW - pad.r} y2={pad.t + h - (datos.lineaBase.ventanaCapturaMediana / maxV) * h}
          stroke="rgba(255,255,255,0.2)" strokeDasharray="6 4"
        />

        {/* All teams (gray) */}
        {datos.equipos.filter(e => !top3.includes(e)).map(eq => (
          <path
            key={eq.nombre}
            d={linea(eq)}
            fill="none"
            stroke={equipoHover === eq.nombre ? '#fff' : 'rgba(255,255,255,0.12)'}
            strokeWidth={equipoHover === eq.nombre ? 2 : 1}
            onMouseEnter={() => onHover(eq.nombre)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}

        {/* Top 3 */}
        {top3.map((eq, i) => (
          <path
            key={eq.nombre}
            d={linea(eq)}
            fill="none"
            stroke={colores[i]}
            strokeWidth={equipoHover === eq.nombre ? 3 : 2}
            onMouseEnter={() => onHover(eq.nombre)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 13 }}>
        {top3.map((eq, i) => (
          <span key={eq.nombre} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 3, background: colores[i], display: 'inline-block' }} />
            {eq.nombre} ({eq.resultado.total}pts)
          </span>
        ))}
        {equipoHover && !top3.find(e => e.nombre === equipoHover) && (
          <span style={{ opacity: 0.7 }}>{equipoHover}</span>
        )}
      </div>
    </div>
  );
}

/* ========== PANEL 5: QUE ELIGIERON ========== */

function PanelQueEligieron({ datos }: { datos: DatosDebrief }) {
  const conteo: Record<string, { count: number; impactoSum: number }> = {};
  for (const eq of datos.equipos) {
    for (const interv of eq.intervenciones) {
      if (!conteo[interv.nombre]) conteo[interv.nombre] = { count: 0, impactoSum: 0 };
      conteo[interv.nombre].count++;
      conteo[interv.nombre].impactoSum += eq.resultado.impacto;
    }
  }
  const items = Object.entries(conteo)
    .map(([nombre, { count, impactoSum }]) => ({
      nombre, count, impactoPromedio: Math.round(impactoSum / count),
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...items.map(i => i.count), 1);

  return (
    <div style={{ width: '100%', maxWidth: 750, margin: '0 auto' }}>
      {items.map(item => (
        <div key={item.nombre} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 8,
        }}>
          <div style={{
            width: 200, fontSize: 13, textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{item.nombre}</div>
          <div style={{ flex: 1, position: 'relative', height: 28 }}>
            <div style={{
              width: `${(item.count / maxCount) * 100}%`,
              height: '100%',
              background: 'var(--ipd-color-gold-500, #C6A65C)',
              borderRadius: 4,
              opacity: 0.7,
              minWidth: 2,
            }} />
            <span style={{
              position: 'absolute', left: `${(item.count / maxCount) * 100 + 2}%`,
              top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, fontFamily: 'var(--ipd-font-mono, "IBM Plex Mono", monospace)',
            }}>
              {item.count} equipo{item.count > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{
            width: 100, fontSize: 12, opacity: 0.5, textAlign: 'right', flexShrink: 0,
          }}>
            impacto: {item.impactoPromedio}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ========== PANEL 6: LAS TRAMPAS ========== */

function PanelTrampas({ datos }: { datos: DatosDebrief }) {
  const filtroRiesgo = datos.equipos.filter(e => e.intervenciones.some(i => i.id === 8));
  const maxDecl = Math.max(...datos.trampas.map(t => t.equiposDeclararon), 1);

  return (
    <div style={{ width: '100%', maxWidth: 750, margin: '0 auto' }}>
      {datos.trampas.filter(t => t.equiposDeclararon > 0).map(t => (
        <div key={t.nombre} style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
        }}>
          <div style={{ width: 160, fontSize: 14, textAlign: 'right', flexShrink: 0 }}>
            {t.nombre}
          </div>
          <div style={{ flex: 1, position: 'relative', height: 28 }}>
            <div style={{
              width: `${(t.equiposDeclararon / maxDecl) * 100}%`,
              height: '100%',
              background: 'var(--ipd-color-danger-600, #B3261E)',
              borderRadius: 4,
              opacity: 0.7,
              minWidth: 2,
            }} />
            <span style={{
              position: 'absolute', left: `${(t.equiposDeclararon / maxDecl) * 100 + 2}%`,
              top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, fontFamily: 'var(--ipd-font-mono, "IBM Plex Mono", monospace)',
            }}>
              {t.equiposDeclararon}
            </span>
          </div>
          <div style={{ width: 80, fontSize: 12, opacity: 0.5, textAlign: 'right', flexShrink: 0 }}>
            r = {t.correlacionReal.toFixed(3)}
          </div>
        </div>
      ))}

      {filtroRiesgo.length > 0 && (
        <div style={{
          marginTop: 24, padding: 16,
          background: 'rgba(179, 38, 30, 0.12)',
          border: '1px solid rgba(179, 38, 30, 0.25)',
          borderRadius: 8,
        }}>
          <h3 style={{ fontSize: 15, marginBottom: 8, color: 'var(--ipd-color-danger-600, #B3261E)' }}>
            Trampa del filtro de riesgo
          </h3>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
            {filtroRiesgo.length} equipo{filtroRiesgo.length > 1 ? 's' : ''} endureci{filtroRiesgo.length > 1 ? 'eron' : 'o'} el umbral del score interno.
          </p>
          {filtroRiesgo.map(eq => {
            const ultimo = eq.historialKPIs[eq.historialKPIs.length - 1];
            return (
              <div key={eq.nombre} style={{ fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{eq.nombre}</span>:
                ciclo {ultimo.ventanaCapturaMediana}d (mejoro),
                conversion {ultimo.conversion}% (se desplomo)
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========== PANEL 7: RIGOR CONTRA RESULTADO ========== */

function PanelRigor({ datos }: { datos: DatosDebrief }) {
  const maxCreditos = 12;
  const maxDiag = 350;
  const maxHip = Math.max(...datos.equipos.map(e => e.hipotesisEscritas), 5);
  const svgW = 700;
  const svgH = 400;
  const pad = { l: 60, r: 20, t: 20, b: 50 };
  const w = svgW - pad.l - pad.r;
  const h = svgH - pad.t - pad.b;

  return (
    <div style={{ width: '100%', maxWidth: 750, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%' }}>
        <line x1={pad.l} y1={svgH - pad.b} x2={svgW - pad.r} y2={svgH - pad.b} stroke="rgba(255,255,255,0.15)" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={svgH - pad.b} stroke="rgba(255,255,255,0.15)" />

        <text x={svgW / 2} y={svgH - 8} fill="rgba(255,255,255,0.5)" textAnchor="middle" fontSize="12">Creditos de indagacion gastados / Hipotesis escritas</text>
        <text x={16} y={(svgH - pad.b) / 2} fill="rgba(255,255,255,0.5)" textAnchor="middle" fontSize="12" transform={`rotate(-90, 16, ${(svgH - pad.b) / 2})`}>Puntaje de diagnostico</text>

        {datos.equipos.map(eq => {
          const x = pad.l + (eq.creditosUsados / maxCreditos) * w;
          const y = svgH - pad.b - (eq.resultado.diagnostico / maxDiag) * h;
          return (
            <g key={`c-${eq.nombre}`}>
              <circle cx={x} cy={y} r={7} fill="var(--ipd-color-gold-500, #C6A65C)" fillOpacity={0.7} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              <text x={x} y={y - 10} fill="#fff" textAnchor="middle" fontSize="9" opacity={0.7}>{eq.nombre}</text>
            </g>
          );
        })}

        {datos.equipos.map(eq => {
          const x = pad.l + (eq.hipotesisEscritas / maxHip) * w;
          const y = svgH - pad.b - (eq.resultado.diagnostico / maxDiag) * h;
          return (
            <g key={`h-${eq.nombre}`}>
              <rect x={x - 4} y={y - 4} width={8} height={8} fill="#4C82B8" fillOpacity={0.7} stroke="rgba(255,255,255,0.3)" strokeWidth={1} transform={`rotate(45, ${x}, ${y})`} />
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8, fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ipd-color-gold-500, #C6A65C)', display: 'inline-block' }} />
          Creditos gastados
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#4C82B8', display: 'inline-block', transform: 'rotate(45deg)' }} />
          Hipotesis escritas
        </span>
      </div>
    </div>
  );
}

/* ========== PANEL 8: RITMO DE DECISION ========== */

function PanelRitmo({ datos }: { datos: DatosDebrief }) {
  const maxMinuto = 50;
  const ordenados = [...datos.equipos].sort((a, b) => b.resultado.total - a.resultado.total);
  const svgW = 800;
  const filaH = 28;
  const pad = { l: 100, r: 20, t: 10, b: 30 };
  const svgH = pad.t + ordenados.length * filaH + pad.b;
  const w = svgW - pad.l - pad.r;

  return (
    <div style={{ width: '100%', maxWidth: 850, margin: '0 auto', overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', minWidth: 600 }}>
        {[0, 10, 20, 30, 40, 50].map(m => {
          const x = pad.l + (m / maxMinuto) * w;
          return (
            <g key={m}>
              <line x1={x} y1={pad.t} x2={x} y2={svgH - pad.b} stroke="rgba(255,255,255,0.06)" />
              <text x={x} y={svgH - 10} fill="rgba(255,255,255,0.4)" textAnchor="middle" fontSize="11">{m}m</text>
            </g>
          );
        })}

        {ordenados.map((eq, i) => {
          const y = pad.t + i * filaH + filaH / 2;
          const diagX = pad.l + (eq.minutoDiagnostico / maxMinuto) * w;
          return (
            <g key={eq.nombre}>
              <line x1={pad.l} y1={y} x2={svgW - pad.r} y2={y} stroke="rgba(255,255,255,0.04)" />
              <text x={pad.l - 8} y={y + 4} fill="rgba(255,255,255,0.7)" textAnchor="end" fontSize="12">{eq.nombre}</text>

              <line x1={diagX} y1={y - 8} x2={diagX} y2={y + 8} stroke="var(--ipd-color-gold-500, #C6A65C)" strokeWidth={2} opacity={0.6} />

              {eq.decisiones.map((d, di) => {
                const dx = pad.l + (Math.max(0, d.minuto) / maxMinuto) * w;
                return (
                  <circle key={di} cx={dx} cy={y} r={4} fill="#4C82B8" fillOpacity={0.8}>
                    <title>{d.tipo} (min {d.minuto})</title>
                  </circle>
                );
              })}

              {eq.intervenciones.length === 0 && (
                <text x={svgW - pad.r - 4} y={y + 4} fill="rgba(179,38,30,0.6)" textAnchor="end" fontSize="10">sin intervenciones</text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8, fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 2, height: 14, background: 'var(--ipd-color-gold-500, #C6A65C)', display: 'inline-block' }} />
          Momento del diagnostico
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4C82B8', display: 'inline-block' }} />
          Decision / intervencion
        </span>
      </div>
    </div>
  );
}

/* ========== PANEL 9: DETALLE POR EQUIPO ========== */

const CAUSAS_NOMBRE: Record<string, string> = {
  ventanaCapturaEsCuello: 'Ventana de captura es cuello',
  reprocesoEsMecanismo: 'Reproceso es mecanismo',
  fugaPlastico: 'Fuga de aprobados sin plastico',
  trabajoPerdidoBuro: 'Secuencia del buro',
};

function PanelDetalle({ datos, seleccionado, onSeleccionar }: {
  datos: DatosDebrief;
  seleccionado: string;
  onSeleccionar: (nombre: string) => void;
}) {
  const eq = datos.equipos.find(e => e.nombre === seleccionado) ?? datos.equipos[0];
  const r = eq.resultado;

  const barras = [
    { label: 'Diagnostico', val: r.diagnostico, max: 350, color: 'var(--ipd-color-gold-500, #C6A65C)' },
    { label: 'Rigor', val: r.rigor, max: 200, color: '#4C82B8' },
    { label: 'Impacto', val: r.impacto, max: 300, color: '#1E7A46' },
    { label: 'Velocidad', val: r.velocidad, max: 100, color: '#8B6CC1' },
    { label: 'Eficiencia', val: r.eficiencia, max: 50, color: '#C17A3C' },
  ];

  const causasDeclaradas = Object.entries(eq.diagnostico)
    .filter(([k, v]) => k !== 'causasEspurias' && k !== 'concentracionSinMasa' && v === true)
    .map(([k]) => CAUSAS_NOMBRE[k] ?? k);

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, justifyContent: 'center' }}>
        {datos.equipos.map(e => (
          <button
            key={e.nombre}
            onClick={() => onSeleccionar(e.nombre)}
            style={{
              background: e.nombre === seleccionado ? 'var(--ipd-color-gold-500, #C6A65C)' : 'rgba(255,255,255,0.08)',
              color: e.nombre === seleccionado ? '#000' : '#fff',
              border: 'none', padding: '4px 12px', borderRadius: 4,
              cursor: 'pointer', fontSize: 13, fontWeight: e.nombre === seleccionado ? 600 : 400,
            }}
          >
            {e.nombre}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 15, opacity: 0.5, marginBottom: 8 }}>Diagnostico declarado</h3>
          {causasDeclaradas.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {causasDeclaradas.map(c => (
                <li key={c} style={{ fontSize: 14, marginBottom: 4, paddingLeft: 12, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--ipd-color-success-600, #1E7A46)' }}>+</span>
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 14, opacity: 0.5 }}>No identifico ninguna causa verdadera</p>
          )}
          {eq.diagnostico.causasEspurias.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--ipd-color-danger-600, #B3261E)' }}>
                Espurias: {eq.diagnostico.causasEspurias.join(', ')}
              </span>
            </div>
          )}

          <h3 style={{ fontSize: 15, opacity: 0.5, marginBottom: 8, marginTop: 16 }}>Intervenciones</h3>
          {eq.intervenciones.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {eq.intervenciones.map(i => (
                <li key={i.id} style={{ fontSize: 14, marginBottom: 4 }}>
                  T{i.trimestre}: {i.nombre}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 14, opacity: 0.5 }}>No aplico intervenciones</p>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 15, opacity: 0.5, marginBottom: 8 }}>Desglose de puntaje</h3>
          {barras.map(b => (
            <div key={b.label} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                <span>{b.label}</span>
                <span style={{ fontFamily: 'var(--ipd-font-mono, "IBM Plex Mono", monospace)' }}>
                  {b.val}/{b.max}
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                <div style={{
                  width: `${(b.val / b.max) * 100}%`,
                  height: '100%', background: b.color, borderRadius: 4,
                }} />
              </div>
            </div>
          ))}

          {eq.penalizaciones.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 15, opacity: 0.5, marginBottom: 6 }}>Penalizaciones</h3>
              {eq.penalizaciones.map((p, i) => (
                <div key={i} style={{
                  fontSize: 13, marginBottom: 4, padding: '4px 8px',
                  background: 'rgba(179,38,30,0.12)', borderRadius: 4,
                }}>
                  <span style={{ color: 'var(--ipd-color-danger-600, #B3261E)', fontWeight: 600 }}>{p.puntos}</span>
                  {' '}{p.descripcion}
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: 16, padding: 12,
            background: 'rgba(255,255,255,0.06)', borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--ipd-font-mono, "IBM Plex Mono", monospace)',
              fontSize: 32, fontWeight: 700,
              color: 'var(--ipd-color-gold-500, #C6A65C)',
            }}>
              {r.total}
            </div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>Puntaje total — Final {r.final}</div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8, fontSize: 13, opacity: 0.6,
      }}>
        <div>Diagnostico al minuto {eq.minutoDiagnostico}</div>
        <div>Hipotesis escritas: {eq.hipotesisEscritas}</div>
        <div>Creditos usados: {eq.creditosUsados}/{eq.creditosTotales}</div>
        <div>Presupuesto restante: ${eq.presupuestoRestante}</div>
      </div>
    </div>
  );
}

/* ========== PANEL 10: PUENTE A3 ========== */

const SECCIONES_A3 = [
  { id: 'antecedentes', label: 'Antecedentes', evaluar: (eq: EquipoDebrief) => eq.hipotesisEscritas >= 1 },
  { id: 'condiciones', label: 'Condiciones actuales', evaluar: (eq: EquipoDebrief) => {
    const causas = [eq.diagnostico.ventanaCapturaEsCuello, eq.diagnostico.reprocesoEsMecanismo, eq.diagnostico.fugaPlastico, eq.diagnostico.trabajoPerdidoBuro];
    return causas.filter(Boolean).length >= 1;
  }},
  { id: 'meta', label: 'Meta', evaluar: (eq: EquipoDebrief) => eq.intervenciones.length > 0 },
  { id: 'analisis', label: 'Analisis de causa raiz', evaluar: (eq: EquipoDebrief) => {
    const causas = [eq.diagnostico.ventanaCapturaEsCuello, eq.diagnostico.reprocesoEsMecanismo, eq.diagnostico.fugaPlastico, eq.diagnostico.trabajoPerdidoBuro];
    return causas.filter(Boolean).length >= 2 && eq.diagnostico.causasEspurias.length === 0;
  }},
  { id: 'propuesta', label: 'Propuesta', evaluar: (eq: EquipoDebrief) => eq.intervenciones.length >= 2 && eq.resultado.impacto >= 150 },
  { id: 'plan', label: 'Plan de implementacion', evaluar: (eq: EquipoDebrief) => eq.decisiones.length >= 2 && eq.minutoDiagnostico <= 35 },
  { id: 'seguimiento', label: 'Seguimiento', evaluar: (eq: EquipoDebrief) => {
    const ultimo = eq.historialKPIs[eq.historialKPIs.length - 1];
    const base = eq.historialKPIs[0];
    return ultimo && base && ultimo.ventanaCapturaMediana < base.ventanaCapturaMediana;
  }},
];

function PanelA3({ datos }: { datos: DatosDebrief }) {
  const ordenados = [...datos.equipos].sort((a, b) => b.resultado.total - a.resultado.total);

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
      <div style={{ minWidth: 650 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `140px repeat(${SECCIONES_A3.length}, 1fr)`,
          gap: 2, fontSize: 12,
        }}>
          <div style={{ padding: '6px 8px', fontWeight: 600 }}>Equipo</div>
          {SECCIONES_A3.map(s => (
            <div key={s.id} style={{
              padding: '6px 4px', fontWeight: 600, textAlign: 'center',
              fontSize: 11, lineHeight: 1.2,
            }}>
              {s.label}
            </div>
          ))}

          {ordenados.map(eq => (
            <>
              <div key={eq.nombre} style={{
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center',
              }}>
                {eq.nombre}
              </div>
              {SECCIONES_A3.map(s => {
                const ok = s.evaluar(eq);
                return (
                  <div key={`${eq.nombre}-${s.id}`} style={{
                    padding: '4px',
                    background: ok ? 'rgba(30,122,70,0.15)' : 'rgba(179,38,30,0.1)',
                    textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>
                    {ok ? (
                      <span style={{ color: 'var(--ipd-color-success-600, #1E7A46)' }}>Si</span>
                    ) : (
                      <span style={{ color: 'var(--ipd-color-danger-600, #B3261E)', opacity: 0.7 }}>No</span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>
          <p>Cada celda evalua si el equipo tiene material suficiente en esa seccion del A3 con base en su desempeno en el simulador.</p>
        </div>
      </div>
    </div>
  );
}
