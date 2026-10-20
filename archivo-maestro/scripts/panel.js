#!/usr/bin/env node
"use strict";

/**
 * Genera salidas/panel.html — pantalla visual para revisar y actualizar.
 *
 *   npm run panel
 *
 * Ábrela con doble clic. Editas en la página y descargas el JSON actualizado
 * (luego reemplazas data/perfil.local.json o perfil.json).
 */

const fs = require("fs");
const path = require("path");
const {
  cargarPerfil,
  cargarAplicaciones,
  asegurarSalidas,
  OUT_DIR,
  inferirBilingue,
  ESTADOS_APP
} = require("./lib/cargar");

function diasEntre(desde, hasta) {
  const a = new Date(desde + "T12:00:00");
  const b = new Date(hasta + "T12:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function buildPayload(perfil, apps) {
  const hoyStr = hoy();
  const enriquecidas = (apps || []).map((a) => {
    const estado = (a.estado || "").toLowerCase();
    const base = a.fecha_estado || a.fecha || "";
    const dias = base ? diasEntre(base, hoyStr) : null;
    const stale = estado === "enviada" && dias != null && dias > 10;
    return {
      ...a,
      bilingue: inferirBilingue(a.puesto, a.bilingue),
      _dias: dias,
      _stale: stale
    };
  });

  const total = enriquecidas.length;
  const conResp = enriquecidas.filter((a) => a.estado && a.estado !== "enviada").length;
  const porEstado = {};
  const porFamilia = {};
  const porPortal = {};
  let bilSi = 0;
  let bilNo = 0;
  for (const a of enriquecidas) {
    const e = (a.estado || "(vacío)").toLowerCase();
    porEstado[e] = (porEstado[e] || 0) + 1;
    const f = (a.familia || "(vacío)").toLowerCase();
    porFamilia[f] = (porFamilia[f] || 0) + 1;
    const p = a.portal || "(vacío)";
    porPortal[p] = (porPortal[p] || 0) + 1;
    if (a.bilingue) bilSi++;
    else bilNo++;
  }

  return {
    generado: hoyStr,
    perfil,
    apps: enriquecidas,
    meta: {
      totalApps: total,
      conRespuesta: conResp,
      pctRespuesta: total ? Math.round((conResp * 1000) / total) / 10 : 0,
      pendientes: (perfil.pending || []).length,
      stale: enriquecidas.filter((a) => a._stale).length,
      porEstado,
      porFamilia,
      porPortal,
      bilingue: { si: bilSi, no: bilNo }
    },
    estados: ESTADOS_APP
  };
}

function htmlPage(payload) {
  const dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panel — Archivo Maestro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --verde:#2e7d5b; --sol:#e8b04b; --fondo:#f5f7f4; --texto:#1f2a26;
  --gris:#5d6c66; --linea:#dde5e0; --suave:#e1efe7; --solsuave:#fbf0d9; --rojo:#b33b3b;
}
*{box-sizing:border-box}
body{margin:0;font-family:Nunito,system-ui,sans-serif;background:linear-gradient(165deg,#f5f7f4 0%,#e8f0ea 45%,#fbf0d9 100%);color:var(--texto);min-height:100vh}
h1,h2,h3{font-family:"Bricolage Grotesque",Georgia,serif;margin:0}
a{color:var(--verde)}
.wrap{max-width:1100px;margin:0 auto;padding:16px 16px 80px}
.hero{padding:20px 0 8px}
.hero .brand{font-size:clamp(1.6rem,4vw,2.2rem);color:var(--verde);letter-spacing:-.02em}
.hero .sub{color:var(--gris);margin-top:6px;font-size:.95rem}
.nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;position:sticky;top:0;z-index:5;background:rgba(245,247,244,.92);backdrop-filter:blur(8px);padding:8px 0;border-bottom:1px solid var(--linea)}
.nav button,.btn{appearance:none;border:1px solid var(--linea);background:#fff;color:var(--texto);border-radius:12px;padding:10px 14px;font-weight:700;font-size:.9rem;cursor:pointer;min-height:44px;font-family:inherit}
.nav button.active,.btn.primary{background:var(--verde);color:#fff;border-color:var(--verde)}
.btn.sol{background:var(--sol);border-color:#d4a043;color:#1f2a26}
.btn.ghost{background:transparent}
.kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:16px 0}
@media(min-width:700px){.kpis{grid-template-columns:repeat(4,1fr)}}
.kpi{background:#fff;border:1px solid var(--linea);border-radius:16px;padding:14px}
.kpi .n{font-family:"Bricolage Grotesque",Georgia,serif;font-size:1.8rem;color:var(--verde)}
.kpi .l{font-size:.8rem;color:var(--gris);margin-top:2px}
.panel{display:none;background:#fff;border:1px solid var(--linea);border-radius:18px;padding:16px;margin-top:12px}
.panel.on{display:block}
.panel h2{font-size:1.15rem;margin-bottom:12px}
.bar-row{display:grid;grid-template-columns:110px 1fr 48px;gap:8px;align-items:center;margin:6px 0;font-size:.9rem}
.bar{height:10px;background:var(--linea);border-radius:999px;overflow:hidden}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--verde),#3f9a72);border-radius:999px}
.bar.warn>i{background:linear-gradient(90deg,#c9842a,var(--sol))}
.list{display:flex;flex-direction:column;gap:10px}
.card{border:1px solid var(--linea);border-radius:14px;padding:12px;background:#fafcfb}
.card.stale{border-color:#e0b45a;background:var(--solsuave)}
.card .top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:flex-start}
.card .title{font-weight:700}
.muted{color:var(--gris);font-size:.85rem}
.tag{display:inline-block;background:var(--suave);color:var(--verde);padding:2px 8px;border-radius:8px;font-size:.75rem;font-weight:700;margin-right:4px}
.tag.bad{background:#f3d6d6;color:var(--rojo)}
.tag.warn{background:var(--solsuave);color:#8a5a10}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.filters input,.filters select,label.field input,label.field select,label.field textarea{
  width:100%;padding:10px 12px;border:1px solid var(--linea);border-radius:10px;font:inherit;background:#fff}
.filters input,.filters select{width:auto;min-width:140px}
label.field{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:700;margin-bottom:10px}
label.field span{color:var(--gris);font-weight:600}
.grid2{display:grid;gap:10px}
@media(min-width:700px){.grid2{grid-template-columns:1fr 1fr}}
.pending-item{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--linea);border-radius:12px;margin-bottom:8px}
.pending-item input{margin-top:4px;width:18px;height:18px}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;position:sticky;bottom:12px}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1f2a26;color:#fff;padding:10px 16px;border-radius:999px;opacity:0;transition:.2s;pointer-events:none;z-index:9}
.toast.show{opacity:1}
.note{background:var(--suave);border-radius:12px;padding:12px;font-size:.9rem;margin:12px 0;color:var(--texto)}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--linea);vertical-align:top}
th{color:var(--gris);font-weight:700}
select.estado{padding:6px 8px;border-radius:8px;border:1px solid var(--linea);font:inherit}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="brand">Archivo Maestro</div>
    <p class="sub" id="heroSub">Cargando…</p>
  </header>

  <nav class="nav" id="nav">
    <button type="button" data-tab="inicio" class="active">Inicio</button>
    <button type="button" data-tab="embudo">Embudo</button>
    <button type="button" data-tab="apps">Aplicaciones</button>
    <button type="button" data-tab="pendientes">Pendientes</button>
    <button type="button" data-tab="perfil">Perfil</button>
    <button type="button" data-tab="experiencia">Experiencia</button>
  </nav>

  <section class="panel on" id="tab-inicio">
    <div class="kpis" id="kpis"></div>
    <div class="note">
      Esta pantalla es para <strong>revisar</strong> y hacer cambios rápidos.
      Al editar, usa <strong>Descargar JSON</strong> y reemplaza el archivo en tu carpeta
      <code>data/</code> (perfil.local.json / aplicaciones.local.json). Luego corre
      <code>npm run todo</code> si quieres regenerar CVs y exports.
    </div>
    <h2>Seguimiento (+10 días sin respuesta)</h2>
    <div class="list" id="staleList"></div>
  </section>

  <section class="panel" id="tab-embudo">
    <h2>Embudo</h2>
    <div id="embudoBars"></div>
  </section>

  <section class="panel" id="tab-apps">
    <h2>Aplicaciones</h2>
    <div class="filters">
      <input id="qApp" type="search" placeholder="Buscar empresa o puesto">
      <select id="fEstado"><option value="">Todos los estados</option></select>
      <select id="fFamilia"><option value="">Todas las familias</option>
        <option value="ta">ta</option><option value="hr">hr</option>
        <option value="ld">ld</option><option value="warehouse">warehouse</option>
      </select>
    </div>
    <div style="overflow:auto">
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Empresa / puesto</th><th>Fam.</th><th>Portal</th><th>Estado</th><th>Días</th>
          </tr>
        </thead>
        <tbody id="appsBody"></tbody>
      </table>
    </div>
    <div class="actions">
      <button type="button" class="btn sol" id="btnDlApps">Descargar aplicaciones.json</button>
    </div>
  </section>

  <section class="panel" id="tab-pendientes">
    <h2>Pendientes</h2>
    <p class="muted">Marca los que ya resolviste. Al descargar el perfil, esos salen de la lista <code>pending</code>.</p>
    <div id="pendingList"></div>
    <div class="actions">
      <button type="button" class="btn sol" id="btnDlPerfilPending">Descargar perfil.json</button>
    </div>
  </section>

  <section class="panel" id="tab-perfil">
    <h2>Datos personales y búsqueda</h2>
    <div class="grid2" id="perfilForm"></div>
    <h3 style="margin:16px 0 8px;font-size:1rem">Salario por familia (ask)</h3>
    <div class="grid2" id="salForm"></div>
    <div class="actions">
      <button type="button" class="btn sol" id="btnDlPerfil">Descargar perfil.json</button>
    </div>
  </section>

  <section class="panel" id="tab-experiencia">
    <h2>Experiencia (solo lectura)</h2>
    <div class="list" id="expList"></div>
  </section>
</div>
<div class="toast" id="toast">Listo</div>
<script>
const DATA = ${dataJson};
(function(){
  const state = {
    perfil: JSON.parse(JSON.stringify(DATA.perfil)),
    apps: JSON.parse(JSON.stringify(DATA.apps)),
    removedPending: new Set()
  };
  const toastEl = document.getElementById('toast');
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(function(){ toastEl.classList.remove('show'); }, 1400);
  }
  function download(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2) + '\\n'], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Descargado: ' + filename);
  }
  function pct(n, t){ return t ? (Math.round(n*1000/t)/10) + '%' : '0%'; }

  document.getElementById('heroSub').textContent =
    (state.perfil.personal && state.perfil.personal.preferred_name || 'Sin nombre') +
    ' · actualizado ' + (state.perfil.updated_at || '—') +
    ' · panel ' + DATA.generado;

  // KPIs
  const m = DATA.meta;
  document.getElementById('kpis').innerHTML = [
    ['Aplicaciones', m.totalApps],
    ['Con respuesta', m.pctRespuesta + '%'],
    ['Pendientes', m.pendientes],
    ['+10 días sin resp.', m.stale]
  ].map(function(x){
    return '<div class="kpi"><div class="n">'+x[1]+'</div><div class="l">'+x[0]+'</div></div>';
  }).join('');

  // Stale
  const stale = state.apps.filter(function(a){ return a._stale; })
    .sort(function(a,b){ return (b._dias||0)-(a._dias||0); });
  document.getElementById('staleList').innerHTML = stale.length ? stale.map(function(a){
    return '<div class="card stale"><div class="top"><div><div class="title">'+esc(a.empresa)+'</div>'+
      '<div class="muted">'+esc(a.puesto)+'</div></div>'+
      '<span class="tag warn">'+a._dias+' días</span></div>'+
      '<div class="muted" style="margin-top:6px">'+esc(a.portal||'')+' · id '+esc(String(a.id))+' · '+esc(a.fecha||'')+'</div></div>';
  }).join('') : '<p class="muted">Ninguna aplicación enviada lleva más de 10 días sin respuesta. Bien.</p>';

  // Embudo bars
  function bars(title, obj, warn){
    const total = Object.values(obj).reduce(function(s,n){return s+n;},0) || 1;
    const rows = Object.keys(obj).sort(function(a,b){return obj[b]-obj[a];}).map(function(k){
      const n = obj[k];
      const w = Math.max(4, Math.round(n*100/total));
      return '<div class="bar-row"><div>'+esc(k)+'</div><div class="bar'+(warn?' warn':'')+'"><i style="width:'+w+'%"></i></div><div>'+n+'</div></div>';
    }).join('');
    return '<h3 style="margin:14px 0 6px;font-size:1rem">'+esc(title)+'</h3>'+rows;
  }
  document.getElementById('embudoBars').innerHTML =
    '<p class="muted">Total '+m.totalApps+' · con respuesta '+m.conRespuesta+' ('+m.pctRespuesta+'%)</p>'+
    bars('Por estado', m.porEstado) +
    bars('Por familia', m.porFamilia) +
    bars('Por portal', m.porPortal) +
    bars('Bilingüe', {sí: m.bilingue.si, no: m.bilingue.no});

  // Apps table
  const selEst = document.getElementById('fEstado');
  DATA.estados.forEach(function(e){
    const o=document.createElement('option'); o.value=e; o.textContent=e; selEst.appendChild(o);
  });
  // include odd estados present in data
  Object.keys(m.porEstado).forEach(function(e){
    if(!DATA.estados.includes(e) && e!=='(vacío)'){
      const o=document.createElement('option'); o.value=e; o.textContent=e+' (otro)'; selEst.appendChild(o);
    }
  });

  function renderApps(){
    const q = (document.getElementById('qApp').value||'').toLowerCase();
    const fe = document.getElementById('fEstado').value;
    const ff = document.getElementById('fFamilia').value;
    const body = document.getElementById('appsBody');
    const rows = state.apps.filter(function(a){
      if(fe && (a.estado||'').toLowerCase()!==fe) return false;
      if(ff && (a.familia||'').toLowerCase()!==ff) return false;
      if(q && !(String(a.empresa||'')+' '+String(a.puesto||'')).toLowerCase().includes(q)) return false;
      return true;
    }).sort(function(a,b){ return String(b.fecha||'').localeCompare(String(a.fecha||'')); });

    body.innerHTML = rows.map(function(a, idx){
      const opts = DATA.estados.map(function(e){
        return '<option value="'+e+'"'+(e===(a.estado||'')?' selected':'')+'>'+e+'</option>';
      }).join('');
      const extra = (a.estado && DATA.estados.indexOf(a.estado)===-1)
        ? '<option value="'+esc(a.estado)+'" selected>'+esc(a.estado)+'</option>' : '';
      return '<tr data-id="'+esc(String(a.id))+'">'+
        '<td>'+esc(a.fecha||'')+'</td>'+
        '<td><strong>'+esc(a.empresa||'')+'</strong><div class="muted">'+esc(a.puesto||'')+
        (a.bilingue?' <span class="tag">bilingüe</span>':'')+
        (a._stale?' <span class="tag warn">+10d</span>':'')+
        '</div></td>'+
        '<td>'+esc(a.familia||'')+'</td>'+
        '<td>'+esc(a.portal||'')+'</td>'+
        '<td><select class="estado" data-id="'+esc(String(a.id))+'">'+extra+opts+'</select></td>'+
        '<td>'+(a._dias!=null?a._dias:'—')+'</td></tr>';
    }).join('') || '<tr><td colspan="6" class="muted">Sin resultados</td></tr>';
  }
  document.getElementById('qApp').addEventListener('input', renderApps);
  document.getElementById('fEstado').addEventListener('change', renderApps);
  document.getElementById('fFamilia').addEventListener('change', renderApps);
  document.getElementById('appsBody').addEventListener('change', function(ev){
    const sel = ev.target.closest('select.estado');
    if(!sel) return;
    const id = String(sel.getAttribute('data-id'));
    const app = state.apps.find(function(x){ return String(x.id)===id; });
    if(!app) return;
    app.estado = sel.value;
    app.fecha_estado = DATA.generado;
    toast('Estado de id '+id+' → '+sel.value+' (recuerda descargar)');
  });
  renderApps();

  document.getElementById('btnDlApps').addEventListener('click', function(){
    const clean = state.apps.map(function(a){
      const o = Object.assign({}, a);
      delete o._dias; delete o._stale;
      return o;
    });
    download('aplicaciones.json', clean);
  });

  // Pendientes
  function renderPending(){
    const list = state.perfil.pending || [];
    document.getElementById('pendingList').innerHTML = list.length ? list.map(function(p,i){
      const key = p.field+'|'+p.question;
      const checked = state.removedPending.has(key) ? ' checked' : '';
      return '<label class="pending-item"><input type="checkbox" data-key="'+esc(key)+'"'+checked+'>'+
        '<div><div class="title">'+esc(p.field)+'</div><div class="muted">'+esc(p.question)+'</div></div></label>';
    }).join('') : '<p class="muted">No hay pendientes. Excelente.</p>';
  }
  document.getElementById('pendingList').addEventListener('change', function(ev){
    const inp = ev.target;
    if(inp.tagName!=='INPUT') return;
    const key = inp.getAttribute('data-key');
    if(inp.checked) state.removedPending.add(key); else state.removedPending.delete(key);
  });
  renderPending();

  function perfilParaDescarga(){
    const p = JSON.parse(JSON.stringify(state.perfil));
    // apply form fields if present
    const map = {
      preferred_name: 'personal.preferred_name',
      email: 'personal.email',
      phone_mobile: 'personal.phone_mobile',
      linkedin_url: 'personal.linkedin_url',
      line1: 'personal.address.line1',
      line2: 'personal.address.line2',
      city: 'personal.address.city',
      county: 'personal.address.county',
      state: 'personal.address.state',
      zip: 'personal.address.zip',
      search_zip: 'targets.search_zip',
      start_availability: 'targets.start_availability',
      notice_period: 'targets.notice_period',
      schedule: 'targets.schedule'
    };
    Object.keys(map).forEach(function(id){
      const el = document.getElementById('f_'+id);
      if(!el) return;
      setPath(p, map[id], el.value);
    });
    ['ta','hr','ld','warehouse'].forEach(function(fam){
      const el = document.getElementById('sal_'+fam);
      if(!el) return;
      const famObj = (p.targets.role_families||[]).find(function(x){return x.id===fam;});
      if(!famObj) return;
      const v = el.value.trim();
      famObj.salary_ask = v==='' ? null : Number(v);
    });
    p.pending = (p.pending||[]).filter(function(item){
      return !state.removedPending.has(item.field+'|'+item.question);
    });
    p.updated_at = DATA.generado;
    return p;
  }
  function setPath(obj, path, value){
    const parts = path.split('.');
    let cur = obj;
    for(let i=0;i<parts.length-1;i++){
      if(!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length-1]] = value;
  }

  document.getElementById('btnDlPerfilPending').addEventListener('click', function(){
    download('perfil.json', perfilParaDescarga());
  });
  document.getElementById('btnDlPerfil').addEventListener('click', function(){
    download('perfil.json', perfilParaDescarga());
  });

  // Perfil form
  const pers = state.perfil.personal || {};
  const addr = pers.address || {};
  const tgt = state.perfil.targets || {};
  const fields = [
    ['preferred_name','Nombre preferido', pers.preferred_name||''],
    ['email','Email', pers.email||''],
    ['phone_mobile','Teléfono', pers.phone_mobile||''],
    ['linkedin_url','LinkedIn', pers.linkedin_url||''],
    ['line1','Calle', addr.line1||''],
    ['line2','Apt', addr.line2||''],
    ['city','Ciudad', addr.city||''],
    ['county','County', addr.county||''],
    ['state','Estado', addr.state||''],
    ['zip','ZIP', addr.zip||''],
    ['search_zip','ZIP de búsqueda', tgt.search_zip||''],
    ['schedule','Horario', tgt.schedule||''],
    ['start_availability','Disponibilidad', tgt.start_availability||''],
    ['notice_period','Aviso', tgt.notice_period||'']
  ];
  document.getElementById('perfilForm').innerHTML = fields.map(function(f){
    return '<label class="field"><span>'+esc(f[1])+'</span><input id="f_'+f[0]+'" value="'+escAttr(f[2])+'"></label>';
  }).join('');

  document.getElementById('salForm').innerHTML = ['ta','hr','ld','warehouse'].map(function(fam){
    const rf = (tgt.role_families||[]).find(function(x){return x.id===fam;}) || {};
    const ask = rf.salary_ask==null?'':rf.salary_ask;
    return '<label class="field"><span>'+fam+' — salary ask</span><input id="sal_'+fam+'" type="number" value="'+escAttr(String(ask))+'"></label>';
  }).join('');

  // Experiencia
  document.getElementById('expList').innerHTML = (state.perfil.experience||[]).map(function(e){
    return '<div class="card"><div class="title">'+esc(e.title_us_equivalent||e.title_original||'')+'</div>'+
      '<div class="muted">'+esc(e.employer||'')+' · '+esc(e.start||'')+' → '+esc(e.end||'')+'</div>'+
      '<div style="margin-top:6px">'+(e.show_on_cv||[]).map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div></div>';
  }).join('') || '<p class="muted">Sin experiencia en el perfil.</p>';

  // Tabs
  document.getElementById('nav').addEventListener('click', function(ev){
    const btn = ev.target.closest('button[data-tab]');
    if(!btn) return;
    document.querySelectorAll('#nav button').forEach(function(b){ b.classList.toggle('active', b===btn); });
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('on'); });
    document.getElementById('tab-'+btn.getAttribute('data-tab')).classList.add('on');
  });

  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s){ return esc(s).replace(/'/g,'&#39;'); }
})();
</script>
</body>
</html>`;
}

function main() {
  const { perfil, ruta } = cargarPerfil();
  const { apps, ruta: rutaApps } = cargarAplicaciones();
  const payload = buildPayload(perfil, apps);
  asegurarSalidas();
  const out = path.join(OUT_DIR, "panel.html");
  fs.writeFileSync(out, htmlPage(payload), "utf8");
  console.log("=== Archivo Maestro — panel ===\n");
  console.log(`Perfil: ${ruta}`);
  console.log(`Apps:   ${rutaApps} (${apps.length})`);
  console.log(`Salida: ${out}`);
  console.log("\nÁbrela con doble clic en el navegador.");
  console.log("Para actualizar: edita → Descargar JSON → reemplaza el archivo en data/.");
}

main();
