#!/usr/bin/env node
"use strict";

/**
 * Genera salidas/editor.html — editor local del perfil con formularios.
 *
 *   npm run editor
 *
 * Abre el HTML en el navegador. Puedes:
 *  - editar el perfil precargado
 *  - cargar otro .json con "Abrir archivo"
 *  - descargar el perfil.json actualizado
 */

const fs = require("fs");
const path = require("path");
const { cargarPerfil, asegurarSalidas, OUT_DIR } = require("./lib/cargar");

function htmlPage(perfil) {
  const dataJson = JSON.stringify(perfil).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Editor — Archivo Maestro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--verde:#2e7d5b;--sol:#e8b04b;--fondo:#f5f7f4;--texto:#1f2a26;--gris:#5d6c66;--linea:#dde5e0;--suave:#e1efe7;--solsuave:#fbf0d9}
*{box-sizing:border-box}
body{margin:0;font-family:Nunito,system-ui,sans-serif;background:linear-gradient(165deg,#f5f7f4,#e8f0ea 50%,#fbf0d9);color:var(--texto)}
h1,h2,h3{font-family:"Bricolage Grotesque",Georgia,serif;margin:0}
.wrap{max-width:900px;margin:0 auto;padding:16px 16px 100px}
.hero{padding:12px 0 8px}
.hero h1{font-size:clamp(1.5rem,4vw,2rem);color:var(--verde)}
.sub{color:var(--gris);font-size:.9rem;margin-top:4px}
.bar{position:sticky;top:0;z-index:6;display:flex;flex-wrap:wrap;gap:8px;padding:10px 0;background:rgba(245,247,244,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--linea);margin-bottom:12px}
.btn{appearance:none;border:1px solid var(--linea);background:#fff;border-radius:12px;padding:10px 14px;font-weight:700;font-size:.9rem;cursor:pointer;min-height:44px;font-family:inherit}
.btn.primary{background:var(--verde);color:#fff;border-color:var(--verde)}
.btn.sol{background:var(--sol);border-color:#d4a043}
.btn.ghost{background:transparent}
.nav{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 14px}
.nav button{border:1px solid var(--linea);background:#fff;border-radius:999px;padding:8px 12px;font-size:.8rem;font-weight:700;cursor:pointer}
.nav button.on{background:var(--verde);color:#fff;border-color:var(--verde)}
.sec{display:none;background:#fff;border:1px solid var(--linea);border-radius:18px;padding:16px}
.sec.on{display:block}
.sec h2{font-size:1.1rem;margin-bottom:12px}
.grid{display:grid;gap:10px}
@media(min-width:700px){.grid.two{grid-template-columns:1fr 1fr}}
label.f{display:flex;flex-direction:column;gap:4px;font-size:.82rem;font-weight:700}
label.f span{color:var(--gris);font-weight:600}
input,select,textarea{width:100%;padding:10px 12px;border:1px solid var(--linea);border-radius:10px;font:inherit;background:#fff}
textarea{min-height:88px;resize:vertical}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
.check{display:flex;gap:8px;align-items:center;font-size:.9rem;font-weight:700}
.check input{width:18px;height:18px}
.card{border:1px solid var(--linea);border-radius:14px;padding:12px;margin-bottom:10px;background:#fafcfb}
.card h3{font-size:.95rem;margin-bottom:8px}
.muted{color:var(--gris);font-size:.85rem}
.note{background:var(--suave);border-radius:12px;padding:12px;font-size:.9rem;margin:10px 0}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1f2a26;color:#fff;padding:10px 16px;border-radius:999px;opacity:0;transition:.2s;z-index:9;pointer-events:none}
.toast.show{opacity:1}
.danger{color:#8a2b2b}
.list-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
input.campo-vacio,select.campo-vacio,textarea.campo-vacio{border-color:#c45c5c;background:#fff5f5;box-shadow:0 0 0 3px rgba(196,92,92,.18)}
label.f.campo-vacio-label span{color:#a33;font-weight:700}
.banner-vacios{display:none;background:#fde8e8;border:1px solid #e3a0a0;color:#7a2222;border-radius:12px;padding:12px;margin:10px 0;font-size:.9rem;font-weight:700}
.banner-vacios.on{display:block}
.nav button.tiene-vacios{box-shadow:inset 0 -3px 0 #c45c5c}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <h1>Editor del Archivo Maestro</h1>
    <p class="sub" id="statusLine">Cargando…</p>
  </header>

  <div class="bar">
    <label class="btn ghost" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
      Abrir archivo JSON
      <input id="fileIn" type="file" accept="application/json,.json" hidden>
    </label>
    <button type="button" class="btn sol" id="btnDl">Descargar perfil.json</button>
    <button type="button" class="btn" id="btnValidar">Revisar campos vacíos</button>
  </div>

  <div class="note">
    <strong>No se guarda solo.</strong> Los cambios viven en esta página hasta que pulses
    <strong>Descargar perfil.json</strong> y reemplaces el archivo en <code>data/</code>.
    Luego: <code>npm run validar</code> (y <code>npm run todo</code> si quieres regenerar CVs/exports).
  </div>
  <div class="banner-vacios" id="bannerVacios"></div>

  <nav class="nav" id="nav">
    <button type="button" data-sec="personal" class="on">Personal</button>
    <button type="button" data-sec="elig">Elegibilidad</button>
    <button type="button" data-sec="targets">Búsqueda</button>
    <button type="button" data-sec="skills">Skills</button>
    <button type="button" data-sec="edu">Educación</button>
    <button type="button" data-sec="exp">Experiencia</button>
    <button type="button" data-sec="us">Empleos US</button>
    <button type="button" data-sec="answers">Respuestas</button>
    <button type="button" data-sec="refs">Referencias</button>
    <button type="button" data-sec="pending">Pendientes</button>
  </nav>

  <section class="sec on" id="sec-personal"></section>
  <section class="sec" id="sec-elig"></section>
  <section class="sec" id="sec-targets"></section>
  <section class="sec" id="sec-skills"></section>
  <section class="sec" id="sec-edu"></section>
  <section class="sec" id="sec-exp"></section>
  <section class="sec" id="sec-us"></section>
  <section class="sec" id="sec-answers"></section>
  <section class="sec" id="sec-refs"></section>
  <section class="sec" id="sec-pending"></section>
</div>
<div class="toast" id="toast">Listo</div>
<script>
const SEED = ${dataJson};
let perfil = JSON.parse(JSON.stringify(SEED));
const toastEl = document.getElementById('toast');
function toast(m){ toastEl.textContent=m; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'),1400); }
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function field(id,label,val,type){
  type=type||'text';
  if(type==='textarea') return '<label class="f"><span>'+esc(label)+'</span><textarea id="'+id+'">'+esc(val??'')+'</textarea></label>';
  if(type==='checkbox') return '<label class="check"><input type="checkbox" id="'+id+'" '+(val?'checked':'')+'> '+esc(label)+'</label>';
  return '<label class="f"><span>'+esc(label)+'</span><input id="'+id+'" type="'+type+'" value="'+esc(val??'')+'"></label>';
}
function val(id){ const el=document.getElementById(id); return el?el.value:''; }
function checked(id){ const el=document.getElementById(id); return !!(el&&el.checked); }
function lines(id){ return val(id).split(/\\n/).map(s=>s.trim()).filter(Boolean); }
function setStatus(){
  const n=perfil.personal&&perfil.personal.preferred_name||'Sin nombre';
  document.getElementById('statusLine').textContent=n+' · schema '+ (perfil.schema_version||'?') +' · updated_at '+(perfil.updated_at||'—');
}

function ensure(){
  perfil.personal=perfil.personal||{};
  perfil.personal.address=perfil.personal.address||{};
  perfil.eligibility=perfil.eligibility||{};
  perfil.targets=perfil.targets||{role_families:[],work_mode:[]};
  if(!Array.isArray(perfil.targets.role_families)) perfil.targets.role_families=[];
  ['ta','hr','ld','warehouse'].forEach(function(id){
    if(!perfil.targets.role_families.find(f=>f.id===id)){
      perfil.targets.role_families.push({id:id,name:'',keywords:[],cv_version:id,salary_floor:null,salary_ask:null,salary_ceiling:null});
    }
  });
  perfil.skills=perfil.skills||{systems:[],methodologies:[],domains:[],soft:[]};
  perfil.languages=Array.isArray(perfil.languages)?perfil.languages:[];
  perfil.education=Array.isArray(perfil.education)?perfil.education:[];
  perfil.experience=Array.isArray(perfil.experience)?perfil.experience:[];
  perfil.us_current_jobs=Array.isArray(perfil.us_current_jobs)?perfil.us_current_jobs:[];
  perfil.answer_bank=Array.isArray(perfil.answer_bank)?perfil.answer_bank:[];
  perfil.references=Array.isArray(perfil.references)?perfil.references:[];
  perfil.pending=Array.isArray(perfil.pending)?perfil.pending:[];
  perfil.profile_text=perfil.profile_text||{headline_en:'',summaries_en:[]};
  perfil.standard_answers=perfil.standard_answers||{years_total_experience:null,years_by_area:{},eeo:{},how_did_you_hear_default:'LinkedIn'};
  perfil.standard_answers.years_by_area=perfil.standard_answers.years_by_area||{};
  perfil.standard_answers.eeo=perfil.standard_answers.eeo||{};
}

function collectFromDom(){
  ensure();
  const p=perfil.personal, a=p.address, e=perfil.eligibility, t=perfil.targets;
  p.legal_first_name=val('p_fn'); p.middle_name=val('p_mn'); p.legal_last_name=val('p_ln');
  p.preferred_name=val('p_pref'); p.email=val('p_email'); p.phone_mobile=val('p_phone');
  p.linkedin_url=val('p_li'); p.date_of_birth=val('p_dob'); p.nationality=val('p_nat');
  p.origin_country=val('p_origin');
  a.line1=val('p_l1'); a.line2=val('p_l2'); a.city=val('p_city'); a.county=val('p_county'); a.state=val('p_state'); a.zip=val('p_zip');
  if(document.getElementById('p_namerule')) p.name_rule=val('p_namerule');

  e.authorized_to_work_us=checked('e_auth');
  e.requires_sponsorship=checked('e_spons');
  e.drivers_license=checked('e_dl');
  e.has_vehicle=checked('e_car');
  const reloc=val('e_reloc');
  e.willing_to_relocate=reloc===''?null:reloc==='yes';
  const travel=val('e_travel');
  e.willing_to_travel_pct=travel===''?null:Number(travel);

  t.search_zip=val('t_zip');
  t.radius_miles=Number(val('t_radius')||0);
  t.schedule=val('t_sched');
  t.start_availability=val('t_start');
  t.notice_period=val('t_notice');
  const modes=[];
  ['onsite','hybrid','remote'].forEach(m=>{ if(checked('t_'+m)) modes.push(m); });
  t.work_mode=modes;
  t.role_families.forEach(function(f){
    f.name=val('rf_name_'+f.id)||f.name||'';
    f.keywords=lines('rf_kw_'+f.id);
    f.cv_version=val('rf_cv_'+f.id)||f.id;
    const fl=val('rf_floor_'+f.id), ask=val('rf_ask_'+f.id), ceil=val('rf_ceil_'+f.id);
    f.salary_floor=fl===''?null:Number(fl);
    f.salary_ask=ask===''?null:Number(ask);
    f.salary_ceiling=ceil===''?null:Number(ceil);
  });

  perfil.skills.systems=lines('sk_sys');
  perfil.skills.methodologies=lines('sk_met');
  perfil.skills.domains=lines('sk_dom');
  perfil.skills.soft=lines('sk_soft');

  perfil.profile_text.headline_en=val('pt_head');
  const sums=['hr','ld','ta','warehouse'].map(function(fam){
    const text=val('pt_sum_'+fam);
    return text?{family:fam,text:text}:null;
  }).filter(Boolean);
  perfil.profile_text.summaries_en=sums;

  const sa=perfil.standard_answers;
  const yt=val('sa_years'); sa.years_total_experience=yt===''?null:Number(yt);
  ['recruiting','training','hr_generalist','people_management'].forEach(function(k){
    const v=val('sa_y_'+k); sa.years_by_area[k]=v===''?null:Number(v);
  });
  sa.how_did_you_hear_default=val('sa_hear');
  sa.eeo.gender=val('sa_gender');
  sa.eeo.race=val('sa_race');
  const h=val('sa_hisp'); sa.eeo.hispanic_latino=h===''?null:h==='yes';
  const v=val('sa_vet'); sa.eeo.veteran=v===''?null:v==='yes';
  const d=val('sa_dis'); sa.eeo.disability=d===''?null:d==='yes';

  // languages from cards
  perfil.languages=[];
  document.querySelectorAll('[data-lang]').forEach(function(card){
    const i=card.getAttribute('data-lang');
    const language=val('lang_n_'+i); const level=val('lang_l_'+i);
    if(language) perfil.languages.push({language, level});
  });

  // education
  perfil.education=[];
  document.querySelectorAll('[data-edu]').forEach(function(card){
    const i=card.getAttribute('data-edu');
    perfil.education.push({
      institution:val('edu_inst_'+i), country:val('edu_co_'+i),
      degree_original:val('edu_do_'+i), degree_us_equivalent:val('edu_du_'+i),
      field:val('edu_field_'+i), start:val('edu_start_'+i), end:val('edu_end_'+i),
      completed:checked('edu_ok_'+i),
      credential_evaluation:val('edu_cred_'+i)||'none'
    });
  });

  // experience key fields + bullets
  document.querySelectorAll('[data-exp]').forEach(function(card){
    const i=Number(card.getAttribute('data-exp'));
    const exp=perfil.experience[i]; if(!exp) return;
    exp.employer=val('ex_emp_'+i); exp.employer_context=val('ex_ctx_'+i);
    exp.title_original=val('ex_to_'+i); exp.title_us_equivalent=val('ex_tu_'+i);
    exp.city=val('ex_city_'+i); exp.country=val('ex_co_'+i);
    exp.start=val('ex_start_'+i); exp.end=val('ex_end_'+i);
    exp.reason_for_leaving=val('ex_leave_'+i);
    exp.employee_count=val('ex_count_'+i);
    exp.show_on_cv=['hr','ld','ta','warehouse'].filter(f=>checked('ex_show_'+f+'_'+i));
    exp.bullets_by_family=exp.bullets_by_family||{hr:[],ld:[],ta:[],warehouse:[]};
    ['hr','ld','ta','warehouse'].forEach(f=>{ exp.bullets_by_family[f]=lines('ex_b_'+f+'_'+i); });
    exp.address=exp.address||{};
    exp.address.line1=val('ex_a1_'+i); exp.address.city=val('ex_acity_'+i);
    exp.address.state=val('ex_astate_'+i); exp.address.country=val('ex_aco_'+i); exp.address.zip=val('ex_azip_'+i);
  });

  // US jobs
  document.querySelectorAll('[data-us]').forEach(function(card){
    const i=Number(card.getAttribute('data-us'));
    const j=perfil.us_current_jobs[i]; if(!j) return;
    j.employer=val('us_emp_'+i); j.via_agency=val('us_via_'+i);
    j.title=val('us_title_'+i); j.start=val('us_start_'+i); j.city=val('us_city_'+i);
    j.show_on_cv=['hr','ld','ta','warehouse'].filter(f=>checked('us_show_'+f+'_'+i));
    j.bullets=lines('us_b_'+i);
  });

  // answer bank
  document.querySelectorAll('[data-ans]').forEach(function(card){
    const i=Number(card.getAttribute('data-ans'));
    const a=perfil.answer_bank[i]; if(!a) return;
    a.id=val('an_id_'+i); a.question_pattern=val('an_pat_'+i);
    a.family=val('an_fam_'+i); a.espanso_trigger=val('an_tr_'+i);
    a.answer_en=val('an_en_'+i); a.answer_es=val('an_es_'+i);
    const mc=val('an_max_'+i); a.max_chars=mc===''?0:Number(mc);
  });

  // references
  document.querySelectorAll('[data-ref]').forEach(function(card){
    const i=Number(card.getAttribute('data-ref'));
    const r=perfil.references[i]; if(!r) return;
    r.name=val('ref_name_'+i); r.relationship=val('ref_rel_'+i);
    r.phone=val('ref_phone_'+i); r.email=val('ref_email_'+i); r.country=val('ref_co_'+i);
    const y=val('ref_years_'+i); r.years_known=y===''?null:Number(y);
  });

  // pending
  perfil.pending=[];
  document.querySelectorAll('[data-pend]').forEach(function(card){
    if(checked('pend_del_'+card.getAttribute('data-pend'))) return;
    const i=card.getAttribute('data-pend');
    const field=val('pend_f_'+i), question=val('pend_q_'+i);
    if(field&&question) perfil.pending.push({field, question});
  });

  perfil.updated_at=new Date().toISOString().slice(0,10);
}

function renderAll(){
  ensure();
  setStatus();
  // Personal
  const p=perfil.personal, a=p.address||{};
  document.getElementById('sec-personal').innerHTML='<h2>Personal</h2><div class="grid two">'+
    field('p_fn','Legal first name',p.legal_first_name)+
    field('p_mn','Middle name',p.middle_name)+
    field('p_ln','Legal last name',p.legal_last_name)+
    field('p_pref','Preferred name',p.preferred_name)+
    field('p_email','Email',p.email,'email')+
    field('p_phone','Phone',p.phone_mobile)+
    field('p_li','LinkedIn URL',p.linkedin_url)+
    field('p_dob','Date of birth (YYYY-MM-DD)',p.date_of_birth)+
    field('p_nat','Nationality',p.nationality)+
    field('p_origin','Origin country',p.origin_country)+
    field('p_l1','Address line 1',a.line1)+
    field('p_l2','Address line 2',a.line2)+
    field('p_city','City',a.city)+
    field('p_county','County',a.county)+
    field('p_state','State',a.state)+
    field('p_zip','ZIP',a.zip)+
    '</div>'+field('p_namerule','Name rule / notas de nombre',p.name_rule||'','textarea');

  const e=perfil.eligibility;
  document.getElementById('sec-elig').innerHTML='<h2>Elegibilidad</h2><div class="grid">'+
    field('e_auth','Authorized to work in the US',e.authorized_to_work_us,'checkbox')+
    field('e_spons','Requires sponsorship',e.requires_sponsorship,'checkbox')+
    field('e_dl',"Driver's license",e.drivers_license,'checkbox')+
    field('e_car','Has vehicle',e.has_vehicle,'checkbox')+
    '<label class="f"><span>Willing to relocate</span><select id="e_reloc"><option value="">(vacío)</option><option value="yes"'+(e.willing_to_relocate===true?' selected':'')+'>Yes</option><option value="no"'+(e.willing_to_relocate===false?' selected':'')+'>No</option></select></label>'+
    field('e_travel','Willing to travel % (0-100)',e.willing_to_travel_pct??'','number')+
    '</div>';

  const t=perfil.targets;
  let rfHtml=t.role_families.map(function(f){
    return '<div class="card"><h3>'+esc(f.id)+'</h3><div class="grid two">'+
      field('rf_name_'+f.id,'Nombre familia',f.name)+
      field('rf_cv_'+f.id,'CV version (hr/ld/ta/warehouse)',f.cv_version)+
      field('rf_floor_'+f.id,'Salary floor',f.salary_floor??'','number')+
      field('rf_ask_'+f.id,'Salary ask',f.salary_ask??'','number')+
      field('rf_ceil_'+f.id,'Salary ceiling',f.salary_ceiling??'','number')+
      '</div>'+field('rf_kw_'+f.id,'Keywords (una por línea)',(f.keywords||[]).join('\\n'),'textarea')+'</div>';
  }).join('');
  document.getElementById('sec-targets').innerHTML='<h2>Búsqueda y salarios</h2><div class="grid two">'+
    field('t_zip','Search ZIP',t.search_zip)+
    field('t_radius','Radius miles',t.radius_miles,'number')+
    field('t_sched','Schedule',t.schedule||'')+
    field('t_start','Start availability',t.start_availability||'')+
    field('t_notice','Notice period',t.notice_period||'')+
    '</div><div class="row">'+
    field('t_onsite','Onsite',(t.work_mode||[]).includes('onsite'),'checkbox')+
    field('t_hybrid','Hybrid',(t.work_mode||[]).includes('hybrid'),'checkbox')+
    field('t_remote','Remote',(t.work_mode||[]).includes('remote'),'checkbox')+
    '</div><h3 style="margin:12px 0 8px;font-size:1rem">Familias</h3>'+rfHtml+
    '<h3 style="margin:12px 0 8px;font-size:1rem">Profile text</h3>'+
    field('pt_head','Headline EN',perfil.profile_text.headline_en||'','textarea')+
    ['hr','ld','ta','warehouse'].map(function(fam){
      const s=(perfil.profile_text.summaries_en||[]).find(x=>x.family===fam);
      return field('pt_sum_'+fam,'Summary '+fam,(s&&s.text)||'','textarea');
    }).join('')+
    '<h3 style="margin:12px 0 8px;font-size:1rem">Standard answers</h3><div class="grid two">'+
    field('sa_years','Years total',perfil.standard_answers.years_total_experience??'','number')+
    field('sa_y_recruiting','Years recruiting',perfil.standard_answers.years_by_area.recruiting??'','number')+
    field('sa_y_training','Years training',perfil.standard_answers.years_by_area.training??'','number')+
    field('sa_y_hr_generalist','Years HR generalist',perfil.standard_answers.years_by_area.hr_generalist??'','number')+
    field('sa_y_people_management','Years people mgmt',perfil.standard_answers.years_by_area.people_management??'','number')+
    field('sa_hear','How did you hear default',perfil.standard_answers.how_did_you_hear_default||'')+
    field('sa_gender','EEO gender',perfil.standard_answers.eeo.gender||'')+
    field('sa_race','EEO race',perfil.standard_answers.eeo.race||'')+
    '<label class="f"><span>Hispanic/Latino</span><select id="sa_hisp"><option value="">(vacío)</option><option value="yes"'+(perfil.standard_answers.eeo.hispanic_latino===true?' selected':'')+'>Yes</option><option value="no"'+(perfil.standard_answers.eeo.hispanic_latino===false?' selected':'')+'>No</option></select></label>'+
    '<label class="f"><span>Veteran</span><select id="sa_vet"><option value="">(vacío)</option><option value="yes"'+(perfil.standard_answers.eeo.veteran===true?' selected':'')+'>Yes</option><option value="no"'+(perfil.standard_answers.eeo.veteran===false?' selected':'')+'>No</option></select></label>'+
    '<label class="f"><span>Disability</span><select id="sa_dis"><option value="">(vacío)</option><option value="yes"'+(perfil.standard_answers.eeo.disability===true?' selected':'')+'>Yes</option><option value="no"'+(perfil.standard_answers.eeo.disability===false?' selected':'')+'>No</option></select></label>'+
    '</div>';

  const sk=perfil.skills;
  let langHtml=perfil.languages.map(function(l,i){
    return '<div class="card" data-lang="'+i+'"><div class="grid two">'+
      field('lang_n_'+i,'Language',l.language)+
      '<label class="f"><span>Level</span><select id="lang_l_'+i+'">'+
      ['native','advanced','intermediate','basic',''].map(function(lv){
        return '<option value="'+lv+'"'+(l.level===lv?' selected':'')+'>'+(lv||'(vacío)')+'</option>';
      }).join('')+'</select></label></div></div>';
  }).join('');
  document.getElementById('sec-skills').innerHTML='<h2>Skills e idiomas</h2>'+
    field('sk_sys','Systems (una por línea)',(sk.systems||[]).join('\\n'),'textarea')+
    field('sk_met','Methodologies',(sk.methodologies||[]).join('\\n'),'textarea')+
    field('sk_dom','Domains',(sk.domains||[]).join('\\n'),'textarea')+
    field('sk_soft','Soft skills',(sk.soft||[]).join('\\n'),'textarea')+
    '<h3 style="margin:12px 0 8px;font-size:1rem">Idiomas</h3>'+langHtml+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddLang">+ Idioma</button></div>';

  document.getElementById('sec-edu').innerHTML='<h2>Educación</h2>'+
    perfil.education.map(function(ed,i){
      return '<div class="card" data-edu="'+i+'"><h3>#'+(i+1)+'</h3><div class="grid two">'+
        field('edu_inst_'+i,'Institution',ed.institution)+
        field('edu_co_'+i,'Country',ed.country)+
        field('edu_do_'+i,'Degree original',ed.degree_original)+
        field('edu_du_'+i,'Degree US equivalent',ed.degree_us_equivalent)+
        field('edu_field_'+i,'Field',ed.field)+
        field('edu_start_'+i,'Start YYYY-MM',ed.start)+
        field('edu_end_'+i,'End YYYY-MM',ed.end)+
        '<label class="f"><span>Credential evaluation</span><select id="edu_cred_'+i+'">'+
        ['none','wes','ece','other'].map(c=>'<option value="'+c+'"'+(ed.credential_evaluation===c?' selected':'')+'>'+c+'</option>').join('')+
        '</select></label>'+field('edu_ok_'+i,'Completed',ed.completed,'checkbox')+
        '</div></div>';
    }).join('')+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddEdu">+ Educación</button></div>';

  document.getElementById('sec-exp').innerHTML='<h2>Experiencia</h2><p class="muted">Bullets: una línea = un bullet. show_on_cv marca en qué CVs aparece.</p>'+
    perfil.experience.map(function(ex,i){
      const show=ex.show_on_cv||[];
      const bf=ex.bullets_by_family||{};
      const ad=ex.address||{};
      return '<div class="card" data-exp="'+i+'"><h3>'+esc(ex.id||('exp'+i))+'</h3><div class="grid two">'+
        field('ex_emp_'+i,'Employer',ex.employer)+
        field('ex_ctx_'+i,'Employer context',ex.employer_context)+
        field('ex_to_'+i,'Title original',ex.title_original)+
        field('ex_tu_'+i,'Title US',ex.title_us_equivalent)+
        field('ex_city_'+i,'City',ex.city)+
        field('ex_co_'+i,'Country',ex.country)+
        field('ex_start_'+i,'Start YYYY-MM',ex.start)+
        field('ex_end_'+i,'End YYYY-MM o present',ex.end)+
        field('ex_leave_'+i,'Reason for leaving',ex.reason_for_leaving)+
        field('ex_count_'+i,'Employee count',ex.employee_count)+
        field('ex_a1_'+i,'Address line1',ad.line1||'')+
        field('ex_acity_'+i,'Address city',ad.city||'')+
        field('ex_astate_'+i,'Address state',ad.state||'')+
        field('ex_aco_'+i,'Address country',ad.country||'')+
        field('ex_azip_'+i,'Address zip',ad.zip||'')+
        '</div><div class="row">'+
        ['hr','ld','ta','warehouse'].map(f=>field('ex_show_'+f+'_'+i,'CV '+f,show.includes(f),'checkbox')).join('')+
        '</div>'+
        ['hr','ld','ta','warehouse'].map(f=>field('ex_b_'+f+'_'+i,'Bullets '+f,(bf[f]||[]).join('\\n'),'textarea')).join('')+
        '</div>';
    }).join('')+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddExp">+ Empleo</button></div>';

  document.getElementById('sec-us').innerHTML='<h2>Empleos actuales US</h2>'+
    perfil.us_current_jobs.map(function(j,i){
      const show=j.show_on_cv||[];
      return '<div class="card" data-us="'+i+'"><div class="grid two">'+
        field('us_emp_'+i,'Employer',j.employer)+
        field('us_via_'+i,'Via agency',j.via_agency||'')+
        field('us_title_'+i,'Title',j.title)+
        field('us_start_'+i,'Start YYYY-MM',j.start||'')+
        field('us_city_'+i,'City',j.city||'')+
        '</div><div class="row">'+
        ['hr','ld','ta','warehouse'].map(f=>field('us_show_'+f+'_'+i,'CV '+f,show.includes(f),'checkbox')).join('')+
        '</div>'+field('us_b_'+i,'Bullets',(j.bullets||[]).join('\\n'),'textarea')+'</div>';
    }).join('')+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddUs">+ Empleo US</button></div>';

  document.getElementById('sec-answers').innerHTML='<h2>Answer bank</h2>'+
    perfil.answer_bank.map(function(a,i){
      return '<div class="card" data-ans="'+i+'"><div class="grid two">'+
        field('an_id_'+i,'ID',a.id)+
        field('an_fam_'+i,'Family',a.family||'')+
        field('an_pat_'+i,'Question pattern',a.question_pattern||'')+
        field('an_tr_'+i,'Espanso trigger',a.espanso_trigger||'')+
        field('an_max_'+i,'Max chars',a.max_chars||0,'number')+
        '</div>'+field('an_en_'+i,'Answer EN',a.answer_en||'','textarea')+
        field('an_es_'+i,'Answer ES',a.answer_es||'','textarea')+'</div>';
    }).join('')+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddAns">+ Respuesta</button></div>';

  document.getElementById('sec-refs').innerHTML='<h2>Referencias</h2>'+
    perfil.references.map(function(r,i){
      return '<div class="card" data-ref="'+i+'"><div class="grid two">'+
        field('ref_name_'+i,'Name',r.name)+
        field('ref_rel_'+i,'Relationship',r.relationship)+
        field('ref_phone_'+i,'Phone',r.phone||'')+
        field('ref_email_'+i,'Email',r.email||'')+
        field('ref_co_'+i,'Country',r.country||'')+
        field('ref_years_'+i,'Years known',r.years_known??'','number')+
        '</div></div>';
    }).join('')+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddRef">+ Referencia</button></div>';

  document.getElementById('sec-pending').innerHTML='<h2>Pendientes</h2><p class="muted">Marca “Quitar” para eliminar al descargar.</p>'+
    perfil.pending.map(function(item,i){
      return '<div class="card" data-pend="'+i+'"><div class="grid two">'+
        field('pend_f_'+i,'Field',item.field)+
        field('pend_q_'+i,'Question',item.question)+
        '</div>'+field('pend_del_'+i,'Quitar este pendiente',false,'checkbox')+'</div>';
    }).join('')+
    '<div class="list-actions"><button type="button" class="btn" id="btnAddPend">+ Pendiente</button></div>';

  wireAddButtons();
}

function wireAddButtons(){
  const add=function(id,fn){ const b=document.getElementById(id); if(b) b.onclick=fn; };
  add('btnAddLang',function(){ collectFromDom(); perfil.languages.push({language:'',level:'advanced'}); renderAll(); toast('Idioma agregado'); });
  add('btnAddEdu',function(){ collectFromDom(); perfil.education.push({institution:'',country:'',degree_original:'',degree_us_equivalent:'',field:'',start:'',end:'',completed:true,credential_evaluation:'none'}); renderAll(); toast('Educación agregada'); });
  add('btnAddExp',function(){
    collectFromDom();
    perfil.experience.push({id:'exp'+(perfil.experience.length+1),employer:'',employer_context:'',employee_count:'',address:{line1:'',city:'',state:'',country:'',zip:''},country:'',city:'',title_original:'',title_us_equivalent:'',start:'',end:'',reports_to:'',direct_reports:null,supervisor_name:'',may_contact:null,reason_for_leaving:'',bullets_by_family:{hr:[],ld:[],ta:[],warehouse:[]},achievements:[],show_on_cv:[]});
    renderAll(); toast('Empleo agregado');
  });
  add('btnAddUs',function(){ collectFromDom(); perfil.us_current_jobs.push({employer:'',via_agency:'',title:'',start:'',show_on_cv:[],bullets:[],city:''}); renderAll(); toast('Empleo US agregado'); });
  add('btnAddAns',function(){ collectFromDom(); perfil.answer_bank.push({id:'',question_pattern:'',family:'general',answer_en:'',answer_es:'',max_chars:0,espanso_trigger:''}); renderAll(); toast('Respuesta agregada'); });
  add('btnAddRef',function(){ collectFromDom(); perfil.references.push({name:'',relationship:'',phone:'',email:'',years_known:null,country:''}); renderAll(); toast('Referencia agregada'); });
  add('btnAddPend',function(){ collectFromDom(); perfil.pending.push({field:'',question:''}); renderAll(); toast('Pendiente agregado'); });
}

document.getElementById('nav').addEventListener('click',function(ev){
  const b=ev.target.closest('button[data-sec]'); if(!b) return;
  collectFromDom();
  document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.getElementById('sec-'+b.getAttribute('data-sec')).classList.add('on');
  setStatus();
});

document.getElementById('fileIn').addEventListener('change',function(ev){
  const f=ev.target.files&&ev.target.files[0]; if(!f) return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      perfil=JSON.parse(reader.result);
      if(!perfil.schema_version) throw new Error('No parece un perfil del Archivo Maestro');
      renderAll(); toast('Cargado: '+f.name);
    }catch(err){ alert('No pude leer el JSON: '+(err.message||err)); }
  };
  reader.readAsText(f);
});

document.getElementById('btnDl').addEventListener('click',function(){
  collectFromDom();
  const blob=new Blob([JSON.stringify(perfil,null,2)+'\\n'],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='perfil.json';
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus();
  toast('Descargado perfil.json');
});

function clearVacios(){
  document.querySelectorAll('.campo-vacio').forEach(function(el){ el.classList.remove('campo-vacio'); });
  document.querySelectorAll('.campo-vacio-label').forEach(function(el){ el.classList.remove('campo-vacio-label'); });
  document.querySelectorAll('#nav button.tiene-vacios').forEach(function(el){ el.classList.remove('tiene-vacios'); });
  const b=document.getElementById('bannerVacios');
  b.classList.remove('on'); b.textContent='';
}
function marcarVacio(id){
  const el=document.getElementById(id);
  if(!el) return false;
  const v=(el.type==='checkbox') ? false : String(el.value||'').trim();
  if(el.type==='checkbox') return false;
  if(v!=='') return false;
  el.classList.add('campo-vacio');
  const lab=el.closest('label.f');
  if(lab) lab.classList.add('campo-vacio-label');
  const sec=el.closest('.sec');
  if(sec){
    const sid=sec.id.replace('sec-','');
    const btn=document.querySelector('#nav button[data-sec="'+sid+'"]');
    if(btn) btn.classList.add('tiene-vacios');
  }
  return true;
}
function revisarVacios(){
  collectFromDom();
  clearVacios();
  const ids=[
    'p_fn','p_ln','p_pref','p_email','p_phone','p_li','p_l1','p_city','p_state','p_zip',
    't_zip','t_start','t_notice',
    'rf_ask_ta','rf_ask_hr','rf_ask_ld',
    'pt_head','pt_sum_hr','pt_sum_ld',
    'sa_years','sa_y_recruiting','sa_y_people_management'
  ];
  // experiencia
  (perfil.experience||[]).forEach(function(_,i){
    ids.push('ex_emp_'+i,'ex_tu_'+i,'ex_start_'+i,'ex_end_'+i);
  });
  (perfil.education||[]).forEach(function(_,i){
    ids.push('edu_inst_'+i,'edu_du_'+i,'edu_end_'+i);
  });
  (perfil.languages||[]).forEach(function(_,i){
    ids.push('lang_n_'+i);
  });
  let n=0;
  const first=[];
  ids.forEach(function(id){
    if(marcarVacio(id)){ n++; if(first.length<8) first.push(id); }
  });
  const pend=(perfil.pending||[]).length;
  const banner=document.getElementById('bannerVacios');
  if(n===0 && pend===0){
    banner.classList.add('on');
    banner.style.background='#e1efe7';
    banner.style.borderColor='#2e7d5b';
    banner.style.color='#1f2a26';
    banner.textContent='No hay campos clave vacíos. Si quieres, corre npm run validar en la terminal.';
    toast('Todo completo en campos clave');
    return;
  }
  banner.style.background='';
  banner.style.borderColor='';
  banner.style.color='';
  banner.classList.add('on');
  banner.textContent=n+' campo(s) vacío(s) resaltados en rojo'+(pend?(' · '+pend+' pendiente(s) en la pestaña Pendientes'):'')+'. Las pestañas con subrayado rojo tienen vacíos.';
  // ir al primer vacío
  if(first[0]){
    const el=document.getElementById(first[0]);
    const sec=el&&el.closest('.sec');
    if(sec){
      const sid=sec.id.replace('sec-','');
      document.querySelectorAll('#nav button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sec')===sid); });
      document.querySelectorAll('.sec').forEach(function(s){ s.classList.toggle('on', s.id==='sec-'+sid); });
    }
    if(el){ el.focus({preventScroll:false}); el.scrollIntoView({behavior:'smooth',block:'center'}); }
  }
  toast(n+' vacíos marcados');
}
document.getElementById('btnValidar').addEventListener('click', revisarVacios);
document.addEventListener('input', function(ev){
  const t=ev.target;
  if(!t||!t.classList||!t.classList.contains('campo-vacio')) return;
  if(String(t.value||'').trim()!==''){
    t.classList.remove('campo-vacio');
    const lab=t.closest('label.f');
    if(lab) lab.classList.remove('campo-vacio-label');
  }
});

renderAll();
</script>
</body>
</html>`;
}

function main() {
  const { perfil, ruta } = cargarPerfil();
  asegurarSalidas();
  const out = path.join(OUT_DIR, "editor.html");
  fs.writeFileSync(out, htmlPage(perfil), "utf8");
  console.log("=== Archivo Maestro — editor ===\n");
  console.log(`Perfil: ${ruta}`);
  console.log(`Salida: ${out}`);
  console.log("\nÁbrelo con doble clic en Chrome.");
  console.log("Edita → Descargar perfil.json → reemplaza data/perfil.local.json");
  console.log("Luego: npm run validar");
}

main();
