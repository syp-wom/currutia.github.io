/* Ritmo SyP - logica del tablero. Version 2026.09.06.1327 */
function arrancar(DATOS, CODIGOS){


/* ---------------- utilidades ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hay = v => v !== null && v !== undefined && !isNaN(v);
/* las ventas son unidades enteras: toda cifra que se muestre va redondeada
   hacia arriba. El epsilon evita que 6,0000000001 se convierta en 7. */
const techo = v => Math.ceil(v - 1e-9);
const n0 = v => hay(v) ? techo(v).toLocaleString('es-CL') : '—';
const n1 = n0;
const pct = v => hay(v) ? Math.round(v * 100) + '%' : '—';
const clp = v => hay(v) ? '$' + techo(v).toLocaleString('es-CL') : '—';

const DIAS_MES = DATOS.diasMes || 30;
const FRAC = DATOS.fraccionMes || 0;

/* las once líneas del mes, en el orden en que se leen en la ficha */
const LINEAS_KPI = [
  {k:'postpago',   nom:'Postpago total'},
  {k:'consumer',   nom:'Consumer'},
  {k:'business',   nom:'Business'},
  {k:'portaPost',  nom:'Portabilidad post a post'},
  {k:'fibra',      nom:'Fibra'},
  {k:'seguros',    nom:'Seguros'},
  {k:'renovacion', nom:'Renovación'},
  {k:'accesorios', nom:'Accesorios', fmt: clp},
  {k:'womGo',      nom:'WOM GO'},
  {k:'vtaEquipo',  nom:'Venta de equipo'},
  {k:'planO',      nom:'Plan O líneas principales'},
];

function estado(cumpProy){
  if (!hay(cumpProy)) return 'medio';
  if (cumpProy >= 1) return 'ok';
  if (cumpProy >= 0.85) return 'medio';
  return 'mal';
}
const ETIQUETA = {ok:'En ritmo', medio:'Ajustado', mal:'Atrasado'};

/* barra de ritmo: relleno = % de meta logrado, marca = % de mes transcurrido */
function ritmo(avance, meta, cumpProy){
  const logrado = (meta > 0 && hay(avance)) ? Math.min(avance / meta, 1) : 0;
  return `<div class="ritmo">
      <div class="ritmo-fill ${estado(cumpProy)}" style="width:${(logrado*100).toFixed(1)}%"></div>
      <div class="ritmo-tick" style="left:${(Math.min(FRAC,1)*100).toFixed(1)}%" title="Esperado a hoy"></div>
    </div>`;
}

function tarjetaKpi(nombre, k, fmt, irA){
  if (!k || (!k.meta && !hay(k.avance))) return '';
  const f = fmt || n0;

  /* línea con meta pero sin fuente de avance en el reporte de ventas */
  if (!hay(k.avance)){
    return `<div class="tarjeta kpi sinav">
      <div class="kpi-top"><span class="kpi-nom">${esc(nombre)}</span>
        <span class="kpi-cifra num">— / ${f(k.meta)}</span></div>
      <div class="ritmo"><div class="ritmo-tick" style="left:${(Math.min(FRAC,1)*100).toFixed(1)}%"></div></div>
      <div class="kpi-pie"><span class="num">${fmt ? f(k.esperado) : n1(k.esperado)} esperado a hoy</span>
        <span class="pill neutro">Avance pendiente</span></div>
    </div>`;
  }
  if (!k.meta){
    return `<div class="tarjeta kpi">
      <div class="kpi-top"><span class="kpi-nom">${esc(nombre)}</span>
        <span class="kpi-cifra num"><b>${f(k.avance)}</b></span></div>
      <div class="kpi-pie"><span>Sin meta asignada este mes</span></div>
    </div>`;
  }
  const est = estado(k.cumpProy);
  /* el esperado se redondea hacia arriba y la brecha sale de esa resta,
     asi lo que se lee siempre cuadra: avance − esperado = diferencia */
  const esp = hay(k.esperado) ? techo(k.esperado) : null;
  const dif = hay(esp) ? k.avance - esp : k.diferencia;
  const tg = irA ? 'button' : 'div';
  return `<${tg} class="tarjeta kpi"${irA ? ` data-linea="${esc(irA)}"` : ''}>
    <div class="kpi-top">
      <span class="kpi-nom">${esc(nombre)}</span>
      <span class="kpi-cifra num"><b>${f(k.avance)}</b> / ${f(k.meta)}</span>
      ${irA ? '<span class="chev">\u203a</span>' : ''}
    </div>
    ${ritmo(k.avance, k.meta, k.cumpProy)}
    <div class="kpi-pie">
      <span class="num">${dif >= 0 ? '+' : '−'}${f(Math.abs(dif))} vs ${f(esp)} esperado</span>
      <span class="pill ${est}">${ETIQUETA[est]}</span>
    </div>
    ${statsKpi(k, f, est)}
  </${tg}>`;
}

/* las tres cifras que el usuario quiere leer en toda ficha */
function statsKpi(k, f, est){
  return `<div class="kpi-datos">
    <div><b>${pct(k.cump)}</b><span>Cumplimiento</span></div>
    <div><b>${f(k.proyeccion)}</b><span>Proyección</span></div>
    <div class="${est}"><b>${pct(k.cumpProy)}</b><span>Cierre proy.</span></div>
  </div>`;
}

/* % de portabilidad = portas sobre altas postpago.
   La meta es la razon entre las dos metas del archivo (Porta Post / Postpago). */
function razonPorta(o){
  const p = o && o.portaPost, t = o && o.postpago;
  if (!p || !t) return null;
  const real = (hay(p.avance) && t.avance) ? p.avance / t.avance : null;
  const meta = (p.meta && t.meta) ? p.meta / t.meta : null;
  const proy = (hay(p.proyeccion) && t.proyeccion) ? p.proyeccion / t.proyeccion : null;
  if (!hay(real) && !hay(meta)) return null;
  return {real, meta, proy, ratio: (hay(real) && meta) ? real / meta : null,
          portas: p.avance, altas: t.avance};
}

function tarjetaPctPorta(o){
  const r = razonPorta(o);
  if (!r || !hay(r.real)) return '';
  const est = estado(r.ratio);
  const ancho = r.meta ? Math.min(r.real / r.meta, 1) * 100 : 0;
  return `<div class="tarjeta kpi">
    <div class="kpi-top">
      <span class="kpi-nom">% de portabilidad</span>
      <span class="kpi-cifra num"><b>${pct(r.real)}</b>${r.meta ? ' / ' + pct(r.meta) : ''}</span>
    </div>
    <div class="ritmo"><div class="ritmo-fill ${est}" style="width:${ancho.toFixed(1)}%"></div></div>
    <div class="kpi-pie">
      <span class="num">${n0(r.portas)} portas sobre ${n0(r.altas)} altas postpago</span>
      ${r.meta ? `<span class="pill ${est}">${ETIQUETA[est]}</span>` : ''}
    </div>
    ${r.meta ? `<div class="kpi-datos">
      <div><b>${pct(r.real)}</b><span>% actual</span></div>
      <div><b>${pct(r.meta)}</b><span>% meta</span></div>
      <div class="${est}"><b>${hay(r.proy) ? pct(r.proy) : '—'}</b><span>% proyectado</span></div>
    </div>` : ''}
  </div>`;
}

const tarjetasLineas = (o, ir = true) => LINEAS_KPI.map(l => {
  const c = tarjetaKpi(l.nom, o[l.k], l.fmt,
    ir && o[l.k] && o[l.k].meta && hay(o[l.k].avance) ? l.k : null);
  return l.k === 'portaPost' ? c + tarjetaPctPorta(o) : c;
}).join('');

/* ---------------- serie diaria ---------------- */
const LINEAS_SERIE = [
  {id:'postpago_persona', nom:'Consumer',  col:'var(--s1)'},
  {id:'postpago_empresa', nom:'Business',  col:'var(--s2)'},
  {id:'renovacion',       nom:'Renovación',col:'var(--s3)'},
  {id:'fibra',            nom:'Fibra',     col:'var(--s4)'},
  {id:'seguros',          nom:'Seguros',   col:'var(--s5)'},
  {id:'prepago',          nom:'Prepago',   col:'var(--s6)'},
];
const FECHAS = [...new Set(DATOS.serie.map(r => r.f))].sort();
const EJEC = Object.fromEntries(DATOS.ejecutivos.filter(e => e.codigo).map(e => [e.codigo, e]));
const SUC  = Object.fromEntries(DATOS.sucursales.map(s => [s.corto, s]));

function grafDias(rows){
  if (!rows.length || !FECHAS.length)
    return `<div class="tarjeta vacio">Sin ventas registradas todavía.</div>`;
  const porDia = {};
  for (const r of rows){
    if (r.l === 'porta') continue;
    porDia[r.f] = porDia[r.f] || {};
    porDia[r.f][r.l] = (porDia[r.f][r.l] || 0) + r.n;
  }
  const usadas = LINEAS_SERIE.filter(l => rows.some(r => r.l === l.id));
  const maxDia = Math.max(1, ...FECHAS.map(d =>
    usadas.reduce((a, l) => a + (porDia[d]?.[l.id] || 0), 0)));
  const paso = maxDia <= 10 ? 2 : maxDia <= 30 ? 5 : maxDia <= 80 ? 10 : 25;
  const tope = Math.ceil(maxDia * 1.15 / paso) * paso;   // aire para los totales

  const W = 320, H = 152, ML = 26, MB = 22, MT = 8;
  const gw = W - ML, gh = H - MB - MT;
  const pasoX = gw / FECHAS.length;
  const bw = Math.min(30, pasoX * 0.62);

  let ejes = '';
  for (let v = 0; v <= tope; v += paso){
    const y = (MT + gh - (v / tope) * gh).toFixed(1);
    ejes += `<line x1="${ML}" y1="${y}" x2="${W}" y2="${y}" stroke="var(--line)" stroke-width="1"/>
      <text x="${ML - 6}" y="${y}" text-anchor="end" dominant-baseline="middle"
        fill="var(--muted)" font-size="9" font-family="IBM Plex Mono, monospace">${v}</text>`;
  }
  let barras = '';
  FECHAS.forEach((d, i) => {
    const x = ML + pasoX * i + (pasoX - bw) / 2;
    let acum = 0;
    for (const l of usadas){
      const v = porDia[d]?.[l.id] || 0;
      if (!v) continue;
      const alto = Math.max((v / tope) * gh - 2, 1.5);
      const y = MT + gh - (acum + v) / tope * gh;
      acum += v;
      barras += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}"
        height="${alto.toFixed(1)}" fill="${l.col}" rx="2"><title>${esc(d)} · ${l.nom}: ${v}</title></rect>`;
      if (alto >= 11 && bw >= 16) barras += `<text x="${(x + bw/2).toFixed(1)}"
        y="${(y + alto/2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
        fill="#fff" font-size="9" font-weight="600"
        font-family="IBM Plex Mono, monospace" pointer-events="none">${v}</text>`;
    }
    const totDia = usadas.reduce((a, l) => a + (porDia[d]?.[l.id] || 0), 0);
    if (totDia) barras += `<text x="${(x + bw/2).toFixed(1)}"
      y="${(MT + gh - (totDia / tope) * gh - 5).toFixed(1)}" text-anchor="middle"
      fill="var(--ink)" font-size="9.5" font-weight="600"
      font-family="IBM Plex Mono, monospace">${n0(totDia)}</text>`;
    barras += `<text x="${(x + bw/2).toFixed(1)}" y="${H - 7}" text-anchor="middle"
      fill="var(--muted)" font-size="9.5" font-family="IBM Plex Mono, monospace">${d.slice(8)}</text>`;
  });
  return `<div class="tarjeta grafico">
    <div class="seccion" style="margin-top:0"><h2>Unidades por día</h2>
      <span class="nota">ventas finalizadas</span></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img"
      aria-label="Unidades vendidas por día y línea de negocio">${ejes}${barras}</svg>
    <div class="leyenda">${usadas.map(l =>
      `<span><i style="background:${l.col}"></i>${l.nom}</span>`).join('')}</div>
  </div>`;
}

const filtra = f => DATOS.serie.filter(f);
function suma(rows){
  const t = {total:0};
  for (const r of rows){ t[r.l] = (t[r.l] || 0) + r.n; if (r.l !== 'porta') t.total += r.n; }
  return t;
}

/* ---------------- vistas ---------------- */
let sesion = null;
let ruta = {tab:'resumen', suc:null, ejec:null, linea:null, alcance:'total', tend:'postpago'};

function ordenSucursales(){
  const holgura = s => s.postpago.meta ? (s.postpago.avance - s.postpago.esperado) / s.postpago.meta : 0;
  return [...DATOS.sucursales].sort((a,b) =>
    ((b.postpago.cumpProy||0) - (a.postpago.cumpProy||0)) || (holgura(b) - holgura(a)));
}

/* las tres cifras que el usuario quiere ver sin abrir la sucursal */
function clavesFila(o){
  const r = razonPorta(o), p = o.portaPost, b = o.business;
  if (!p && !b) return '';
  return `<div class="kpi-datos">
    <div class="${p ? estado(p.cumpProy) : ''}"><b>${n0(p && p.avance)}${p && p.meta ? '/' + n0(p.meta) : ''}</b>
      <span>Portabilidad</span></div>
    <div class="${r && hay(r.ratio) ? estado(r.ratio) : ''}"><b>${r ? pct(r.real) : '—'}</b>
      <span>% porta${r && r.meta ? ' · meta ' + pct(r.meta) : ''}</span></div>
    <div class="${b ? estado(b.cumpProy) : ''}"><b>${n0(b && b.avance)}${b && b.meta ? '/' + n0(b.meta) : ''}</b>
      <span>Business</span></div>
  </div>`;
}

function filaSucursal(s, pos){
  return `<button class="fila" data-suc="${esc(s.corto)}">
    <div class="fila-top">
      <span class="pos num">${pos}</span>
      <span class="fila-nom">${esc(s.corto)}</span>
      <span class="fila-val num"><b>${n0(s.postpago.avance)}</b>/${n0(s.postpago.meta)}</span>
      <span class="chev">›</span>
    </div>
    ${ritmo(s.postpago.avance, s.postpago.meta, s.postpago.cumpProy)}
    <div class="kpi-pie"><span class="num">cierre proyectado ${n0(s.postpago.proyeccion)}</span>
      <span class="pill ${estado(s.postpago.cumpProy)}">${pct(s.postpago.cumpProy)}</span></div>
    ${clavesFila(s)}
  </button>`;
}

const tile = (lbl, k, fmt) => {
  const f = fmt || n0;
  if (!k) return '';
  return `<div class="tile"><div class="lbl">${lbl}</div>
    <div class="big num">${f(k.avance)}</div>
    <div class="sub num">de ${f(k.meta)}${hay(k.proyeccion) ? ' · cierra en ' + f(k.proyeccion) : ''}</div></div>`;
};

/* portabilidad en un solo bloque: unidades y % de portabilidad */
const tilePorta = o => {
  const p = o.portaPost, r = razonPorta(o);
  if (!p) return '';
  if (!r || !hay(r.real)) return tile('Portabilidad', p);
  return `<div class="tile"><div class="lbl">Portabilidad</div>
    <div class="big num">${n0(p.avance)}<i class="sep">·</i><span class="big-2 ${estado(r.ratio)}-t">${pct(r.real)}</span></div>
    <div class="sub num">de ${n0(p.meta)} · meta ${pct(r.meta)}</div></div>`;
};

/* los KPI que deben verse siempre, en compania, sucursal y ejecutivo */
const tilesClave = o => `<div class="tiles">
  ${tile('Postpago', o.postpago)}${tilePorta(o)}
  ${tile('Business', o.business)}${tile('Renovación', o.renovacion)}
  ${tile('Fibra', o.fibra)}${tile('Seguros', o.seguros)}
</div>`;

function vistaResumen(){
  if (sesion.tipo === 'sucursal') return vistaSucursal(sesion.suc, false);
  const sel = `<div class="barra-sel">${selectorAlcance()}</div>`;
  if (ruta.alcance && ruta.alcance !== 'total') return sel + vistaSucursal(ruta.alcance, false);
  const t = DATOS.total;
  const orden = ordenSucursales();
  const mejor = orden[0], peor = orden[orden.length - 1];
  return sel + `
  <div class="seccion"><h2>Compañía</h2><span class="nota">9 sucursales</span></div>
  ${tilesClave(t)}

  <div class="seccion"><h2>Ritmo de la compañía</h2></div>
  <div class="lista">${tarjetasLineas(t)}</div>

  <div class="seccion"><h2>Sucursales</h2><span class="nota">por cierre proyectado de postpago</span></div>
  <div class="tarjeta">${orden.map((s,i) => filaSucursal(s, i+1)).join('')}</div>

  <div class="seccion"><h2>Lo que salta a la vista</h2></div>
  <div class="tarjeta kpi"><table class="mini">
    <tr><th>Señal</th><th>Sucursal</th><th>Cierre</th></tr>
    <tbody>
      <tr><td>Mejor ritmo</td><td class="dest">${esc(mejor.corto)}</td>
          <td class="num">${pct(mejor.postpago.cumpProy)}</td></tr>
      <tr><td>Más atrasada</td><td class="dest">${esc(peor.corto)}</td>
          <td class="num">${pct(peor.postpago.cumpProy)}</td></tr>
    </tbody>
  </table></div>`;
}

function vistaSucursales(){
  const orden = ordenSucursales();
  return `<div class="seccion"><h2>Sucursales</h2><span class="nota">toca para ver el detalle</span></div>
    <div class="tarjeta">${orden.map((s,i) => filaSucursal(s, i+1)).join('')}</div>`;
}

function vistaSucursal(corto, conVolver = true){
  const s = SUC[corto];
  if (!s) return `<div class="tarjeta vacio">Sucursal no encontrada.</div>`;
  const eq = DATOS.ejecutivos.filter(e => e.sucursal === corto);
  return `
    ${conVolver ? `<button class="volver" data-volver="1">‹ Todas las sucursales</button>` : ''}
    <div class="seccion"><h2>${esc(s.nombre)}</h2><span class="nota">${eq.length} en dotación</span></div>
    ${tilesClave(s)}
    <div class="seccion"><h2>Sus líneas del mes</h2></div>
    <div class="lista">${tarjetasLineas(s)}</div>
    <div class="seccion"><h2>Tendencia</h2></div>
    ${grafAcumulado(filtra(r => r.s === corto), s, 'postpago', 'Postpago · ' + s.corto)}
    <div class="seccion"><h2>Día a día</h2></div>
    ${grafDias(filtra(r => r.s === corto))}
    <div class="seccion"><h2>Equipo</h2><span class="nota">por cierre proyectado de postpago</span></div>
    <div class="tarjeta">${filasEquipo(eq)}</div>`;
}

function filasEquipo(lista, global = false){
  if (!lista.length) return `<div class="vacio">Sin ejecutivos asignados.</div>`;
  /* orden unico: cierre proyectado de postpago, de mayor a menor */
  const orden = [...lista].sort((a,b) => (b.postpago.cumpProy||0) - (a.postpago.cumpProy||0));
  return orden.map((e, i) => {
    const k = e.postpago;
    return `<button class="fila" data-ejec="${esc(e.codigo || e.nombre)}">
      <div class="fila-top">
        <span class="pos num">${i+1}</span>
        <span class="fila-nom">${esc(global ? nomCorto(e.nombre) : e.nombre)}${
          global ? `<span class="fila-suc">${esc(e.sucursal)}</span>` : ''}</span>
        <span class="fila-val num"><b>${n0(k.avance)}</b>${k.meta ? '/' + n0(k.meta) : ''}</span>
        <span class="chev">›</span>
      </div>
      ${ritmo(k.avance, k.meta, k.cumpProy)}
      <div class="kpi-pie">
        <span class="num">${n0(e.portaPost.avance)} porta${(() => { const r = razonPorta(e);
          return r && hay(r.real) ? ' (' + pct(r.real) + ')' : ''; })()} · ${n0(e.business.avance)} business ·
          ${n0(e.renovacion.avance)} renov. · ${n0(e.fibra.avance)} fibra · ${n0(e.seguros.avance)} seguros</span>
      </div>
      ${k.meta ? statsKpi(k, n0, estado(k.cumpProy))
               : '<div class="kpi-pie"><span>Sin meta asignada</span></div>'}
    </button>`;
  }).join('');
}

function vistaEquipo(){
  const lista = equipoAlcance();
  if (sesion.tipo !== 'admin' || ruta.alcance !== 'total')
    return `${sesion.tipo === 'admin' ? `<div class="barra-sel">${selectorAlcance()}</div>` : ''}
      <div class="seccion"><h2>Equipo de ${esc(alcanceActual())}</h2>
        <span class="nota">${lista.length} · por cierre proyectado</span></div>
      <div class="tarjeta">${filasEquipo(lista)}</div>`;
  return `<div class="barra-sel">${selectorAlcance()}</div>
    <div class="seccion"><h2>Ejecutivos</h2>
      <span class="nota">${lista.length} · por cierre proyectado</span></div>
    <div class="tarjeta">${filasEquipo(lista, true)}</div>`;
}

function vistaEjecutivo(id){
  const e = EJEC[id] || DATOS.ejecutivos.find(x => x.nombre === id);
  if (!e) return `<div class="tarjeta vacio">Ejecutivo no encontrado.</div>`;
  const rows = e.codigo ? filtra(r => r.e === e.codigo) : [];
  const nota = !e.codigo
    ? `<p class="pie" style="margin:10px 0 0">Todavía no tiene código de vendedor cruzado, así que sus
       ventas no se pueden separar de las de la tienda. Solo se muestran sus metas.</p>`
    : e.origenSucursal === 'grupo'
      ? `<p class="pie" style="margin:10px 0 0">Sin ventas registradas este mes; queda en
         ${esc(e.sucursal)} por el grupo de tiendas del archivo de metas.</p>` : '';
  return `
    <button class="volver" data-volver="equipo">‹ Equipo</button>
    <div class="seccion"><h2>${esc(e.nombre)}</h2>
      <span class="nota mono">${esc(e.codigo || 'sin código')} · ${esc(e.sucursal)}</span></div>
    ${tilesClave(e)}
    <div class="seccion"><h2>Sus líneas del mes</h2></div>
    <div class="lista">${tarjetasLineas(e)}</div>
    <div class="seccion"><h2>Tendencia</h2></div>
    ${grafAcumulado(rows, e, 'postpago', 'Postpago · ' + nomCorto(e.nombre))}
    <div class="seccion"><h2>Día a día</h2></div>
    ${grafDias(rows)}
    ${nota}`;
}


/* ==================== gráficos ==================== */

/* barras horizontales de cumplimiento, con línea de referencia en 100%.
   Si el item trae `ir`, la fila completa es un objetivo tocable. */
function grafCumplimiento(items, titulo, nota){
  const vivos = items.filter(i => hay(i.v));
  if (!vivos.length) return '';
  const TOPE = Math.max(1.5, ...vivos.map(i => Math.min(i.v, 2)));
  const FILA = 30, ML = 96, MR = 40, W = 320, MT = 16;
  const H = MT + vivos.length * FILA + 8;
  const gw = W - ML - MR;
  const x = v => ML + Math.min(v, TOPE) / TOPE * gw;
  const COL = {ok:'var(--good)', medio:'var(--warn)', mal:'var(--bad)'};

  let ref = `<line x1="${x(1).toFixed(1)}" y1="${MT-8}" x2="${x(1).toFixed(1)}" y2="${H-6}"
      stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 3" opacity=".45"/>
    <text x="${x(1).toFixed(1)}" y="${MT-11}" text-anchor="middle"
      fill="var(--muted)" font-size="9" font-family="IBM Plex Mono, monospace">100%</text>`;

  const barras = vivos.map((i, k) => {
    const y = MT + k * FILA + 5;
    const ancho = Math.max(x(i.v) - ML, 2);
    const ir = i.ir ? ` ${i.ir} class="tocable"` : '';
    return `<g${ir}><title>${esc(i.nom)}: ${pct(i.v)} de cierre proyectado</title>
      <rect x="0" y="${y - 8}" width="${W}" height="${FILA}" fill="transparent"/>
      <rect x="${ML}" y="${y}" width="${ancho.toFixed(1)}" height="14" rx="4" fill="${COL[i.est]}"/>
      <text x="${ML - 8}" y="${y + 7}" text-anchor="end" dominant-baseline="middle"
        fill="var(--ink)" font-size="11">${esc(i.nom)}</text>
      <text x="${(x(i.v) + 6).toFixed(1)}" y="${y + 7}" dominant-baseline="middle"
        fill="var(--muted)" font-size="10.5" font-family="IBM Plex Mono, monospace">${pct(i.v)}</text>
    </g>`;
  }).join('');

  const tocables = vivos.some(i => i.ir);
  return `<div class="tarjeta graf">
    <div class="seccion" style="margin-top:0"><h2>${esc(titulo)}</h2>
      ${nota ? `<span class="nota">${esc(nota)}</span>` : ''}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(titulo)}: cierre proyectado por fila, con referencia en 100 por ciento">
      ${ref}${barras}</svg>
    <p class="pie">Verde cierra sobre la meta, ámbar entre 85% y 100%, rojo bajo 85%.${
      tocables ? ' Toca una barra para abrirla.' : ''}</p>
  </div>`;
}

const NOM_CORTO = {postpago:'Postpago', consumer:'Consumer', business:'Business',
  portaPost:'Portabilidad', fibra:'Fibra', seguros:'Seguros', renovacion:'Renovación',
  accesorios:'Accesorios', womGo:'WOM GO', vtaEquipo:'Venta de equipo', planO:'Plan O'};

const nomCorto = n => { const p = String(n).trim().split(/\s+/);
  return p.length <= 2 ? n : p[0] + ' ' + p[p.length - 1]; };

function itemsLineas(o){
  return LINEAS_KPI.filter(l => o[l.k] && hay(o[l.k].cumpProy))
    .map(l => ({nom: NOM_CORTO[l.k] || l.nom, v: o[l.k].cumpProy,
                est: estado(o[l.k].cumpProy), ir: `data-linea="${l.k}"`}))
    .sort((a,b) => b.v - a.v);
}

/* alcance actual: toda la compañía o una sucursal */
function alcanceActual(){
  if (sesion.tipo !== 'admin') return sesion.suc;
  return ruta.alcance || 'total';
}
function objetoAlcance(){
  const a = alcanceActual();
  return a === 'total' ? DATOS.total : SUC[a];
}
function filasAlcance(){
  const a = alcanceActual();
  return a === 'total' ? DATOS.serie : filtra(r => r.s === a);
}
function equipoAlcance(){
  const a = alcanceActual();
  return a === 'total' ? DATOS.ejecutivos : DATOS.ejecutivos.filter(e => e.sucursal === a);
}

/* qué líneas de la serie diaria alimentan cada KPI */
const SERIE_DE = {
  postpago:   ['postpago_persona','postpago_empresa'],
  consumer:   ['postpago_persona'],
  business:   ['postpago_empresa'],
  portaPost:  ['porta'],
  fibra:      ['fibra'],
  seguros:    ['seguros'],
  renovacion: ['renovacion'],
};
const CON_TENDENCIA = LINEAS_KPI.filter(l => SERIE_DE[l.k]);

/* Tendencia de una línea: barras de cantidad arriba, % de cumplimiento proyectado abajo.
   Comparten el eje de días. Dos paneles en vez de dos escalas encima de la misma caja. */
function grafAcumulado(rows, o, k, titulo){
  const kk = o[k], ids = SERIE_DE[k];
  if (!ids || !kk || !hay(kk.meta) || !kk.meta || !FECHAS.length) return '';
  const set = new Set(ids);
  const porDia = {};
  for (const r of rows) if (set.has(r.l)) porDia[r.f] = (porDia[r.f] || 0) + r.n;

  const dias = FECHAS.map(f => +f.slice(8));
  const ultimo = dias[dias.length - 1];
  /* el archivo cuenta hoy como transcurrido aunque las ventas lleguen hasta ayer:
     el mismo desfase se aplica a cada día para que la curva cierre en el % de la ficha */
  const desfase = Math.max(0, (DATOS.dia || ultimo) - ultimo);
  let ac = 0;
  const pts = FECHAS.map((f, i) => {
    const q = porDia[f] || 0;
    ac += q;
    const fr = (dias[i] + desfase) / DIAS_MES;
    return {d: dias[i], q, ac, cump: fr ? (ac / fr) / kk.meta : null};
  });

  const meta = kk.meta, proy = hay(kk.proyeccion) ? kk.proyeccion : ac;
  const est = estado(kk.cumpProy);
  const COL = {ok:'var(--good)', medio:'var(--warn)', mal:'var(--bad)'}[est];
  const ritmoDia = meta / DIAS_MES;

  const W = 320, ML = 34, MR = 14;
  const A0 = 22, AH = 96;              // panel de cantidad
  const B0 = A0 + AH + 34, BH = 74;    // panel de porcentaje
  const H = B0 + BH + 24;
  const gw = W - ML - MR;
  const X = d => ML + ((d - 0.5) / DIAS_MES) * gw;

  /* --- panel de cantidad --- */
  const maxQ = Math.max(ritmoDia, ...pts.map(p => p.q), 1);
  const pasoQ = maxQ <= 8 ? 2 : maxQ <= 20 ? 5 : maxQ <= 50 ? 10 : maxQ <= 120 ? 25 : 50;
  const topeQ = Math.ceil(maxQ * 1.18 / pasoQ) * pasoQ;   // aire para las cifras
  const YQ = v => A0 + AH - (v / topeQ) * AH;
  let ejesA = '';
  for (let v = 0; v <= topeQ; v += pasoQ)
    ejesA += `<line x1="${ML}" y1="${YQ(v).toFixed(1)}" x2="${W-MR}" y2="${YQ(v).toFixed(1)}"
      stroke="var(--line)" stroke-width="1"/>
      <text x="${ML-6}" y="${YQ(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle"
        fill="var(--muted)" font-size="9" font-family="IBM Plex Mono, monospace">${n0(v)}</text>`;
  const bw = Math.max(3, Math.min(14, gw / DIAS_MES - 2));
  /* la cifra va sobre cada barra mientras quepa; si el mes avanza, solo en los hitos */
  const cabenTodas = pts.length <= 15;   // pasado eso solo los hitos, si no se pisan
  const maxPt = pts.reduce((a, p) => p.q > a.q ? p : a, pts[0]);
  const rotula = p => cabenTodas || p === maxPt || p === pts[pts.length - 1] || p.d % 5 === 0;
  const barras = pts.map(p => {
    const alto = Math.max((p.q / topeQ) * AH, p.q ? 1.5 : 0);
    return `<g><title>Día ${p.d}: ${n0(p.q)} unidades</title>
      <rect x="${(X(p.d) - bw/2).toFixed(1)}" y="${(YQ(p.q)).toFixed(1)}"
        width="${bw.toFixed(1)}" height="${alto.toFixed(1)}" rx="2" fill="var(--accent)"/>
      ${p.q && rotula(p) ? `<text x="${X(p.d).toFixed(1)}" y="${(YQ(p.q) - 4).toFixed(1)}"
        text-anchor="middle" fill="var(--ink)" font-size="9.5" font-weight="600"
        font-family="IBM Plex Mono, monospace">${n0(p.q)}</text>` : ''}
    </g>`;
  }).join('');
  const refDia = `<line x1="${ML}" y1="${YQ(ritmoDia).toFixed(1)}" x2="${W-MR}" y2="${YQ(ritmoDia).toFixed(1)}"
      stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4" opacity=".7"/>
    <text x="${(W-MR).toFixed(1)}" y="${(YQ(ritmoDia)-5).toFixed(1)}" text-anchor="end"
      fill="var(--muted)" font-size="9.5">${n1(ritmoDia)} por día para la meta</text>`;

  /* --- panel de porcentaje --- */
  const cs = pts.filter(p => hay(p.cump)).map(p => p.cump);
  const topeP = Math.max(1.2, Math.ceil(Math.max(...cs, 1) * 5) / 5);
  const YP = v => B0 + BH - (Math.min(v, topeP) / topeP) * BH;
  let ejesB = '';
  for (const v of [0, 0.5, 1, topeP > 1.4 ? topeP : null].filter(v => v !== null))
    ejesB += `<line x1="${ML}" y1="${YP(v).toFixed(1)}" x2="${W-MR}" y2="${YP(v).toFixed(1)}"
      stroke="var(--line)" stroke-width="1"/>
      <text x="${ML-6}" y="${YP(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle"
        fill="var(--muted)" font-size="9" font-family="IBM Plex Mono, monospace">${pct(v)}</text>`;
  ejesB += `<line x1="${ML}" y1="${YP(1).toFixed(1)}" x2="${W-MR}" y2="${YP(1).toFixed(1)}"
      stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3" opacity=".5"/>`;
  const curva = pts.filter(p => hay(p.cump))
    .map(p => `${X(p.d).toFixed(1)},${YP(p.cump).toFixed(1)}`).join(' ');
  const fin = pts[pts.length - 1];
  const puntos = pts.filter(p => hay(p.cump)).map(p =>
    `<circle cx="${X(p.d).toFixed(1)}" cy="${YP(p.cump).toFixed(1)}" r="2.5" fill="${COL}">
      <title>Día ${p.d}: proyecta ${pct(p.cump)}</title></circle>`).join('');

  for (const d of [1, Math.round(DIAS_MES/2), DIAS_MES])
    ejesB += `<text x="${X(d).toFixed(1)}" y="${(H-8)}" text-anchor="middle"
      fill="var(--muted)" font-size="9" font-family="IBM Plex Mono, monospace">${d}</text>`;

  return `<div class="tarjeta graf">
    <div class="seccion" style="margin-top:0">
      <h2>${esc(titulo)}</h2>
      <span class="pill ${est}">${pct(kk.cumpProy)} proyectado</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(titulo)}: unidades por día arriba y porcentaje de cumplimiento proyectado abajo">
      <text x="${ML}" y="${A0-8}" fill="var(--muted)" font-size="10">Unidades por día</text>
      ${ejesA}${refDia}${barras}
      <text x="${ML}" y="${B0-9}" fill="var(--muted)" font-size="10">Cumplimiento proyectado</text>
      ${ejesB}
      <polyline points="${curva}" fill="none" stroke="${COL}" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round"/>
      ${puntos}
      <circle cx="${X(fin.d).toFixed(1)}" cy="${YP(fin.cump).toFixed(1)}" r="4.5"
        fill="${COL}" stroke="var(--surface)" stroke-width="2"/>
      <text x="${(X(fin.d)+9).toFixed(1)}" y="${YP(fin.cump).toFixed(1)}" dominant-baseline="middle"
        fill="var(--ink)" font-size="12" font-weight="600">${pct(fin.cump)}</text>
    </svg>
    <p class="pie">Lleva ${n0(ac)} de una meta de ${n0(meta)} y proyecta cerrar en ${n0(proy)}.
      Necesita ${n1(ritmoDia)} por día; el mes va ${n0(FECHAS.length)} ${FECHAS.length === 1 ? 'día' : 'días'} con venta.</p>
  </div>`;
}

function selectorTendencia(){
  const o = objetoAlcance();
  const ops = CON_TENDENCIA.filter(l => o[l.k] && hay(o[l.k].cumpProy))
    .map(l => `<option value="${l.k}"${(ruta.tend||'postpago') === l.k ? ' selected' : ''}>${esc(NOM_CORTO[l.k] || l.nom)}</option>`);
  return `<label class="selector"><span>Tendencia</span>
    <select id="selTend">${ops.join('')}</select></label>`;
}

function selectorAlcance(){
  if (sesion.tipo !== 'admin') return '';
  const a = alcanceActual();
  const ops = ['<option value="total">Toda la compañía</option>']
    .concat(ordenSucursales().map(s =>
      `<option value="${esc(s.corto)}"${a === s.corto ? ' selected' : ''}>${esc(s.corto)}</option>`));
  return `<label class="selector"><span>Ver</span>
    <select id="alcance">${ops.join('')}</select></label>`;
}

function selectorLinea(){
  const o = objetoAlcance();
  const ops = LINEAS_KPI.filter(l => o[l.k] && hay(o[l.k].cumpProy))
    .map(l => `<option value="${l.k}"${ruta.linea === l.k ? ' selected' : ''}>${esc(NOM_CORTO[l.k] || l.nom)}</option>`);
  return `<label class="selector"><span>Línea</span>
    <select id="selLinea">${ops.join('')}</select></label>`;
}

/* una línea de negocio, abierta por sucursal o por ejecutivo */
function vistaLinea(){
  const k = ruta.linea;
  const meta = LINEAS_KPI.find(l => l.k === k);
  const o = objetoAlcance();
  const a = alcanceActual();
  const enTotal = a === 'total';
  const nom = NOM_CORTO[k] || (meta ? meta.nom : k);

  const items = enTotal
    ? DATOS.sucursales.filter(s => hay(s[k]?.cumpProy))
        .map(s => ({nom: s.corto, v: s[k].cumpProy, est: estado(s[k].cumpProy),
                    ir: `data-alcance="${esc(s.corto)}"`}))
        .sort((x,y) => y.v - x.v)
    : DATOS.ejecutivos.filter(e => e.sucursal === a && hay(e[k]?.cumpProy))
        .map(e => ({nom: nomCorto(e.nombre), v: e[k].cumpProy, est: estado(e[k].cumpProy),
                    ir: `data-ejec="${esc(e.codigo || e.nombre)}"`}))
        .sort((x,y) => y.v - x.v);

  const detalle = enTotal
    ? DATOS.sucursales.filter(s => hay(s[k]?.avance)).sort((x,y) => (y[k].cumpProy||0) - (x[k].cumpProy||0))
        .map(s => [s.corto, s[k], s])
    : DATOS.ejecutivos.filter(e => e.sucursal === a && hay(e[k]?.avance))
        .sort((x,y) => (y[k].cumpProy||0) - (x[k].cumpProy||0))
        .map(e => [nomCorto(e.nombre), e[k], e]);
  const conPct = k === 'portaPost';
  const f = meta && meta.fmt ? meta.fmt : n0;

  const desde = ruta.tab === 'resumen' ? 'Resumen'
    : ruta.tab === 'sucursales' ? (ruta.suc || 'Sucursales')
    : ruta.tab === 'equipo' ? 'Equipo' : 'Gráficos';
  return `<button class="volver" data-volver="graficos">‹ ${esc(desde)}</button>
    <div class="seccion"><h2>${esc(nom)}</h2>
      <span class="nota">${enTotal ? 'por sucursal' : 'por ejecutivo · ' + esc(a)}</span></div>
    <div class="barra-sel">${selectorLinea()}</div>
    <div class="lista">${tarjetaKpi(nom + (enTotal ? ' · compañía' : ' · ' + a), o[k], meta && meta.fmt)}
      ${conPct ? tarjetaPctPorta(o) : ''}</div>
    ${grafAcumulado(filasAlcance(), o, k, nom + ' · tendencia')}
    ${grafCumplimiento(items, 'Cierre proyectado', enTotal ? '9 sucursales' : `${items.length} ejecutivos`)}
    <div class="seccion"><h2>Detalle</h2></div>
    <div class="tarjeta kpi"><div class="scroll-x"><table class="mini">
      <tr><th>${enTotal ? 'Sucursal' : 'Ejecutivo'}</th><th>Avance</th><th>Meta</th>${
        conPct ? '<th>% porta</th><th>% meta</th>' : ''}<th>Cierre</th></tr>
      <tbody>${detalle.map(([nm, kk, par]) => { const r = conPct ? razonPorta(par) : null;
        return `<tr><td>${esc(nm)}</td>
        <td class="num">${f(kk.avance)}</td><td class="num">${f(kk.meta)}</td>
        ${conPct ? `<td class="num dest">${r ? pct(r.real) : '—'}</td>
                    <td class="num">${r ? pct(r.meta) : '—'}</td>` : ''}
        <td class="num"><span class="pill ${estado(kk.cumpProy)}">${pct(kk.cumpProy)}</span></td></tr>`; }).join('')}
      </tbody></table></div></div>`;
}

function vistaGraficos(){
  if (ruta.linea) return vistaLinea();
  const admin = sesion.tipo === 'admin';
  const a = alcanceActual();
  const enTotal = a === 'total';
  const foco = objetoAlcance();
  const rows = filasAlcance();
  const equipo = equipoAlcance();

  const itemsSuc = ordenSucursales().map(s => ({
    nom: s.corto, v: s.postpago.cumpProy, est: estado(s.postpago.cumpProy),
    ir: `data-alcance="${esc(s.corto)}"`}));
  const itemsEjec = equipo.filter(e => hay(e.postpago.cumpProy))
    .map(e => ({nom: nomCorto(e.nombre), v: e.postpago.cumpProy, est: estado(e.postpago.cumpProy),
                ir: `data-ejec="${esc(e.codigo || e.nombre)}"`}))
    .sort((x,y) => y.v - x.v).slice(0, enTotal ? 12 : 20);

  return `<div class="seccion"><h2>Gráficos</h2>
      <span class="nota">día ${DATOS.dia} de ${DIAS_MES}</span></div>
    <div class="barra-sel">${admin ? selectorAlcance() : ''}${selectorTendencia()}</div>
    ${grafAcumulado(rows, foco, ruta.tend || 'postpago',
        (NOM_CORTO[ruta.tend] || 'Postpago') + (enTotal ? ' · compañía' : ' · ' + a))}
    <div class="seccion"><h2>Por línea de negocio</h2></div>
    ${grafCumplimiento(itemsLineas(foco), 'Cierre proyectado', 'sobre la meta del mes')}
    ${enTotal ? `<div class="seccion"><h2>Por sucursal</h2></div>
      ${grafCumplimiento(itemsSuc, 'Cierre proyectado', 'postpago · 9 sucursales')}` : ''}
    <div class="seccion"><h2>Por ejecutivo</h2></div>
    ${grafCumplimiento(itemsEjec, 'Cierre proyectado',
        enTotal ? 'postpago · los 12 mejores' : `postpago · ${itemsEjec.length} ejecutivos`)}
    <div class="seccion"><h2>Día a día</h2></div>
    ${grafDias(rows)}
    ${tablaDias(rows)}`;
}

function tablaDias(rows){
  /* unidades por día y por concepto; postpago es consumer + business */
  const cel = {};
  for (const r of rows){
    if (r.l === 'porta') continue;
    (cel[r.f] = cel[r.f] || {})[r.l] = (cel[r.f][r.l] || 0) + r.n;
  }
  const cols = [
    {id:'postpago', nom:'Postpago', suma: c => (c.postpago_persona||0) + (c.postpago_empresa||0)},
    {id:'postpago_persona', nom:'Consumer'},
    {id:'postpago_empresa', nom:'Business'},
    {id:'renovacion', nom:'Renov.'},
    {id:'fibra', nom:'Fibra'},
    {id:'seguros', nom:'Seguros'},
    {id:'prepago', nom:'Prepago'},
  ].filter(c => FECHAS.some(f => (c.suma ? c.suma(cel[f] || {}) : (cel[f] || {})[c.id] || 0) > 0));
  const val = (f, c) => c.suma ? c.suma(cel[f] || {}) : ((cel[f] || {})[c.id] || 0);
  const total = f => LINEAS_SERIE.reduce((a, l) => a + ((cel[f] || {})[l.id] || 0), 0);
  const granTotal = FECHAS.reduce((a, f) => a + total(f), 0);

  return `<div class="seccion"><h2>Detalle diario</h2>
      <span class="nota">unidades por concepto</span></div>
    <div class="tarjeta kpi">
      <div class="scroll-x"><table class="mini">
        <tr><th>Día</th>${cols.map(c => `<th>${esc(c.nom)}</th>`).join('')}<th>Total</th></tr>
        <tbody>${FECHAS.map(f => `<tr><td class="mono">${esc(f.slice(8))}/${esc(f.slice(5,7))}</td>
          ${cols.map(c => `<td class="num">${val(f, c) || '·'}</td>`).join('')}
          <td class="num" style="color:var(--ink);font-weight:600">${n0(total(f))}</td></tr>`).join('')}
        <tr><td>Total</td>${cols.map(c =>
            `<td class="num" style="color:var(--ink);font-weight:600">${n0(FECHAS.reduce((a,f) => a + val(f,c), 0))}</td>`).join('')}
          <td class="num" style="color:var(--ink);font-weight:600">${n0(granTotal)}</td></tr>
        </tbody>
      </table></div>
      <p class="pie">Promedio ${n1(FECHAS.length ? granTotal / FECHAS.length : 0)} unidades por día
        en ${FECHAS.length} ${FECHAS.length === 1 ? 'día' : 'días'} con venta.
        Postpago es la suma de consumer y business, por eso el total no los repite.</p>
    </div>`;
}

/* ---------------- navegación ---------------- */
const ICONOS = {
  resumen:'<path d="M3 13h4v7H3zM10 4h4v16h-4zM17 9h4v11h-4z"/>',
  sucursales:'<path d="M3 9l2-5h14l2 5M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
  equipo:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 6a3 3 0 010 6M18 20a5.5 5.5 0 00-2-4"/>',
  dias:'<path d="M4 18l5-6 4 3 7-8"/><path d="M4 21h17"/>'
};
function tabs(){
  const base = [['resumen','Resumen'], ['equipo','Equipo'], ['dias','Gráficos']];
  if (sesion.tipo === 'admin') base.splice(1, 0, ['sucursales','Sucursales']);
  return base;
}
function pintaNav(){
  const t = tabs();
  $('#nav-in').style.setProperty('--tabs', t.length);
  $('#nav-in').innerHTML = t.map(([id,nom]) => `
    <button class="tab" data-tab="${id}" ${ruta.tab === id ? 'aria-current="page"' : ''}>
      <svg viewBox="0 0 24 24">${ICONOS[id]}</svg><span>${nom}</span>
    </button>`).join('');
}
function pinta(){
  let html;
  if (ruta.ejec) html = vistaEjecutivo(ruta.ejec);
  else if (ruta.linea) html = vistaLinea();
  else if (ruta.tab === 'resumen') html = vistaResumen();
  else if (ruta.tab === 'sucursales') html = ruta.suc ? vistaSucursal(ruta.suc) : vistaSucursales();
  else if (ruta.tab === 'equipo') html = vistaEquipo();
  else html = vistaGraficos();
  $('#ambito').textContent = sesion.tipo === 'admin'
    ? (ruta.alcance && ruta.alcance !== 'total' ? ruta.alcance : 'Todas las sucursales')
    : sesion.suc;
  $('#vista').innerHTML = html + `<p class="pie">Día ${DATOS.dia} de ${DIAS_MES} · datos al ${esc(DATOS.generado)}.
    Metas del archivo Meta ${esc(DATOS.periodo)}; avances del reporte de ventas del mes, solo ventas finalizadas.</p>`;
  pintaNav();
  window.scrollTo({top:0, behavior:'instant'});
}

document.addEventListener('click', ev => {
  const tab = ev.target.closest('[data-tab]');
  if (tab){ ruta = {...ruta, tab: tab.dataset.tab, suc:null, ejec:null, linea:null}; return pinta(); }
  const suc = ev.target.closest('[data-suc]');
  if (suc){ ruta = {tab:'sucursales', suc: suc.dataset.suc, ejec:null}; return pinta(); }
  const ej = ev.target.closest('[data-ejec]');
  if (ej){ ruta.ejec = ej.dataset.ejec; return pinta(); }
  const lin = ev.target.closest('[data-linea]');
  if (lin){
    if (ruta.ejec){
      const e = EJEC[ruta.ejec] || DATOS.ejecutivos.find(x => x.nombre === ruta.ejec);
      if (e) ruta.alcance = e.sucursal;
    } else if (ruta.tab === 'sucursales' && ruta.suc) ruta.alcance = ruta.suc;
    ruta.linea = lin.dataset.linea; ruta.ejec = null; return pinta();
  }
  const alc = ev.target.closest('[data-alcance]');
  if (alc){ ruta.alcance = alc.dataset.alcance; if (!ruta.linea) ruta.tab = 'dias';
    ruta.ejec = null; return pinta(); }
  const vol = ev.target.closest('[data-volver]');
  if (vol){
    if (vol.dataset.volver === 'graficos'){ ruta.linea = null; ruta.ejec = null; }
    else if (ruta.ejec) ruta.ejec = null;
    else ruta.suc = null;
    return pinta();
  }
});

document.addEventListener('change', ev => {
  if (ev.target.id === 'alcance'){ ruta.alcance = ev.target.value; ruta.linea = null; return pinta(); }
  if (ev.target.id === 'selLinea'){ ruta.linea = ev.target.value; return pinta(); }
  if (ev.target.id === 'selTend'){ ruta.tend = ev.target.value; return pinta(); }
});

/* ---------------- acceso ---------------- */
function abrir(s){
  sesion = s;
  ruta = {tab:'resumen', suc:null, ejec:null, linea:null, alcance:'total', tend:'postpago'};
  $('#acceso').hidden = true;
  $('#app').hidden = false;
  $('#nav').hidden = false;
  $('#ambito').textContent = s.tipo === 'admin' ? 'Todas las sucursales' : s.suc;
  $('#periodo').textContent = DATOS.periodo + ' · SyP';
  $('#mes-dia').textContent = `Día ${DATOS.dia} de ${DIAS_MES}`;
  $('#mes-pct').textContent = `${Math.round(FRAC*100)}% del mes`;
  $('#mes-fill').style.width = (Math.min(FRAC,1)*100).toFixed(1) + '%';
  try { localStorage.setItem('ritmo-syp', JSON.stringify(s)); } catch(e){}
  pinta();
}
function intentar(){
  const v = ($('#cod').value || '').trim().toUpperCase();
  const s = CODIGOS[v];
  if (!s){ $('#err').textContent = 'Ese código no corresponde a ninguna sucursal.'; return; }
  $('#err').textContent = '';
  abrir(s);
}
$('#entrar').addEventListener('click', intentar);
$('#cod').addEventListener('keydown', e => { if (e.key === 'Enter') intentar(); });
$('#salir').addEventListener('click', () => {
  try { localStorage.removeItem('ritmo-syp'); } catch(e){}
  sesion = null; $('#app').hidden = true; $('#nav').hidden = true;
  $('#acceso').hidden = false; $('#cod').value = '';
});
$('#pie-acceso').textContent =
  `${DATOS.periodo} · datos al ${DATOS.generado}. Este tablero muestra solo cifras agregadas de venta: no contiene datos de clientes.`;

try {
  const g = JSON.parse(localStorage.getItem('ritmo-syp') || 'null');
  if (g && (g.tipo === 'admin' || SUC[g.suc])) abrir(g);
} catch(e){}


}
window.arrancar = arrancar;
