import { useState, useMemo } from 'react';
import { socket } from '../lib/socket';
import type { ComentarioClientePublico } from '../lib/tipos';

interface Props {
  comentariosClientes: ComentarioClientePublico[];
  onEvidenciaCount?: (count: number) => void;
}

type ColumnaOrden = 'id' | 'sucursal' | 'estado' | 'intentos' | 'categoriaPrimaria' | 'fecha';

export function PanelComentarios({ comentariosClientes, onEvidenciaCount }: Props) {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [ordenCol, setOrdenCol] = useState<ColumnaOrden>('id');
  const [ordenAsc, setOrdenAsc] = useState(true);
  const [evidencias, setEvidencias] = useState<Set<string>>(new Set());
  const [hipotesis, setHipotesis] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    comentariosClientes.forEach(c => set.add(c.categoriaPrimaria));
    return Array.from(set).sort();
  }, [comentariosClientes]);

  const estados = useMemo(() => {
    const set = new Set<string>();
    comentariosClientes.forEach(c => set.add(c.estado));
    return Array.from(set).sort();
  }, [comentariosClientes]);

  const sucursales = useMemo(() => {
    const set = new Set<number>();
    comentariosClientes.forEach(c => set.add(c.sucursal));
    return Array.from(set).sort((a, b) => a - b);
  }, [comentariosClientes]);

  const filtrados = useMemo(() => {
    let lista = comentariosClientes;

    if (filtroTexto) {
      const f = filtroTexto.toLowerCase();
      lista = lista.filter(c =>
        c.comentario.toLowerCase().includes(f) ||
        c.id.toLowerCase().includes(f),
      );
    }
    if (filtroCategoria) {
      lista = lista.filter(c => c.categoriaPrimaria === filtroCategoria);
    }
    if (filtroEstado) {
      lista = lista.filter(c => c.estado === filtroEstado);
    }
    if (filtroSucursal) {
      lista = lista.filter(c => String(c.sucursal) === filtroSucursal);
    }

    lista = [...lista].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (ordenCol) {
        case 'id': va = a.id; vb = b.id; break;
        case 'sucursal': va = a.sucursal; vb = b.sucursal; break;
        case 'estado': va = a.estado; vb = b.estado; break;
        case 'intentos': va = a.intentos; vb = b.intentos; break;
        case 'categoriaPrimaria': va = a.categoriaPrimaria; vb = b.categoriaPrimaria; break;
        case 'fecha': va = a.fecha; vb = b.fecha; break;
      }
      if (va < vb) return ordenAsc ? -1 : 1;
      if (va > vb) return ordenAsc ? 1 : -1;
      return 0;
    });

    return lista;
  }, [comentariosClientes, filtroTexto, filtroCategoria, filtroEstado, filtroSucursal, ordenCol, ordenAsc]);

  const conteoCategoria = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach(c => {
      map.set(c.categoriaPrimaria, (map.get(c.categoriaPrimaria) ?? 0) + 1);
    });
    return map;
  }, [filtrados]);

  function alternarOrden(col: ColumnaOrden) {
    if (ordenCol === col) {
      setOrdenAsc(prev => !prev);
    } else {
      setOrdenCol(col);
      setOrdenAsc(true);
    }
  }

  function marcar(id: string) {
    if (!hipotesis.trim()) {
      setMensaje('Escribe la hipotesis antes de marcar.');
      return;
    }
    socket.emit(
      'equipo:marcar_evidencia',
      { comentarioId: id, hipotesis: hipotesis.trim() },
      (resp: any) => {
        if (resp?.error) {
          setMensaje(resp.error);
          return;
        }
        const nuevas = new Set(evidencias).add(id);
        setEvidencias(nuevas);
        onEvidenciaCount?.(nuevas.size);
        setMensaje(`Evidencia registrada (${resp.totalEvidencias} total)`);
        setSeleccion(null);
        setHipotesis('');
        setTimeout(() => setMensaje(''), 3000);
      },
    );
  }

  const seleccionado = seleccion ? comentariosClientes.find(c => c.id === seleccion) : null;
  const indicadorOrden = (col: ColumnaOrden) =>
    ordenCol === col ? (ordenAsc ? ' ▲' : ' ▼') : '';

  return (
    <div className="comentarios">
      <h3 className="consultas__titulo">
        Comentarios de clientes
        <span className="comentarios__conteo">{filtrados.length} / {comentariosClientes.length}</span>
      </h3>

      <div className="comentarios__filtros">
        <input
          className="comentarios__filtro"
          value={filtroTexto}
          onChange={e => setFiltroTexto(e.target.value)}
          placeholder="Buscar en texto..."
          aria-label="Buscar comentarios"
        />
        <select
          className="comentarios__select"
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas las categorias</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          className="comentarios__select"
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {estados.map(est => (
            <option key={est} value={est}>{est}</option>
          ))}
        </select>
        <select
          className="comentarios__select"
          value={filtroSucursal}
          onChange={e => setFiltroSucursal(e.target.value)}
          aria-label="Filtrar por sucursal"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map(suc => (
            <option key={suc} value={String(suc)}>Suc {suc}</option>
          ))}
        </select>
      </div>

      {conteoCategoria.size > 0 && (
        <div className="comentarios__distribucion">
          {Array.from(conteoCategoria.entries()).map(([cat, n]) => (
            <span key={cat} className="comentarios__dist-item">
              {cat}: {n}
            </span>
          ))}
        </div>
      )}

      <div className="comentarios__tabla-wrap">
        <table className="comentarios__tabla">
          <thead>
            <tr>
              <th onClick={() => alternarOrden('id')} className="comentarios__th-sort">
                ID{indicadorOrden('id')}
              </th>
              <th onClick={() => alternarOrden('estado')} className="comentarios__th-sort">
                Estado{indicadorOrden('estado')}
              </th>
              <th onClick={() => alternarOrden('sucursal')} className="comentarios__th-sort">
                Suc{indicadorOrden('sucursal')}
              </th>
              <th onClick={() => alternarOrden('intentos')} className="comentarios__th-sort">
                Int{indicadorOrden('intentos')}
              </th>
              <th onClick={() => alternarOrden('categoriaPrimaria')} className="comentarios__th-sort">
                Categoria{indicadorOrden('categoriaPrimaria')}
              </th>
              <th>Comentario</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr
                key={c.id}
                className={`comentarios__fila ${seleccion === c.id ? 'comentarios__fila--sel' : ''} ${evidencias.has(c.id) ? 'comentarios__fila--evidencia' : ''}`}
                onClick={() => setSeleccion(seleccion === c.id ? null : c.id)}
              >
                <td className="comentarios__celda-id">{c.id}</td>
                <td>{c.estado}</td>
                <td>{c.sucursal}</td>
                <td>{c.intentos}</td>
                <td>{c.categoriaPrimaria}</td>
                <td className="comentarios__celda-texto">
                  {filtroTexto ? resaltarCoincidencia(c.comentario, filtroTexto) : c.comentario.slice(0, 80)}
                  {c.comentario.length > 80 && !filtroTexto ? '...' : ''}
                </td>
                <td>
                  {evidencias.has(c.id) && (
                    <span className="comentarios__item-badge">Evidencia</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="comentarios__vacio">No se encontraron comentarios.</p>
        )}
      </div>

      {seleccionado && (
        <div className="comentarios__detalle">
          <div className="comentarios__detalle-header">
            <h4>{seleccionado.id}</h4>
            <button
              className="comentarios__detalle-cerrar"
              onClick={() => setSeleccion(null)}
              aria-label="Cerrar detalle"
            >
              ×
            </button>
          </div>
          <div className="comentarios__detalle-datos">
            <div><strong>Estado:</strong> {seleccionado.estado}</div>
            <div><strong>Sucursal:</strong> {seleccionado.sucursal}</div>
            <div><strong>Intentos:</strong> {seleccionado.intentos}</div>
            <div><strong>Canal:</strong> {seleccionado.canal}</div>
            <div><strong>Fecha:</strong> {seleccionado.fecha}</div>
            <div><strong>Categoria:</strong> {seleccionado.categoriaPrimaria}</div>
            {seleccionado.categoriaSecundaria && (
              <div><strong>Subcategoria:</strong> {seleccionado.categoriaSecundaria}</div>
            )}
            <div><strong>Solicitud:</strong> {seleccionado.solicitudId}</div>
          </div>
          <div className="comentarios__detalle-texto">
            <strong>Comentario completo:</strong>
            <p>{seleccionado.comentario}</p>
          </div>

          {!evidencias.has(seleccionado.id) && (
            <div className="comentarios__marcar">
              <textarea
                className="comentarios__hipotesis"
                value={hipotesis}
                onChange={e => setHipotesis(e.target.value)}
                placeholder="Este comentario evidencia que..."
              />
              <button
                className="comentarios__btn"
                onClick={() => marcar(seleccionado.id)}
              >
                Marcar como evidencia
              </button>
            </div>
          )}
        </div>
      )}

      {mensaje && <p className="comentarios__mensaje">{mensaje}</p>}
    </div>
  );
}

function resaltarCoincidencia(texto: string, busqueda: string): JSX.Element {
  if (!busqueda) return <>{texto.slice(0, 80)}</>;
  const idx = texto.toLowerCase().indexOf(busqueda.toLowerCase());
  if (idx === -1) return <>{texto.slice(0, 80)}</>;
  const inicio = Math.max(0, idx - 30);
  const fin = Math.min(texto.length, idx + busqueda.length + 30);
  const fragmento = texto.slice(inicio, fin);
  const idxLocal = idx - inicio;
  return (
    <>
      {inicio > 0 ? '...' : ''}
      {fragmento.slice(0, idxLocal)}
      <mark className="comentarios__resaltado">{fragmento.slice(idxLocal, idxLocal + busqueda.length)}</mark>
      {fragmento.slice(idxLocal + busqueda.length)}
      {fin < texto.length ? '...' : ''}
    </>
  );
}
