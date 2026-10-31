#!/usr/bin/env node
/**
 * Prueba automática del diccionario de cargos (G1).
 * Extrae TITLES + la lógica entre TITLES_LOGIC_START/END de app/index.html.
 * Ejecutar antes de cada commit: node tests/titulos.js
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'app', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const titlesMatch = html.match(/const TITLES = \{[\s\S]*?\n\};/);
if (!titlesMatch) {
  console.error('FAIL: no se encontró const TITLES en app/index.html');
  process.exit(1);
}
const logicMatch = html.match(/\/\* TITLES_LOGIC_START \*\/([\s\S]*?)\/\* TITLES_LOGIC_END \*\//);
if (!logicMatch) {
  console.error('FAIL: no se encontraron marcadores TITLES_LOGIC_START/END');
  process.exit(1);
}

const sandbox = {};
const fn = new Function(
  'exports',
  titlesMatch[0] + '\n' + logicMatch[1] +
  '\nexports.TITLES = TITLES;\nexports.findTitle = findTitle;\nexports.findTitles = findTitles;\nexports.esGrado = esGrado;\nexports.expandir = expandir;\n'
);
fn(sandbox);

const { findTitle, findTitles, esGrado } = sandbox;

const casos = [
  { texto: 'Contadora', en: 'Staff Accountant' },
  { texto: 'Maestría', grado: true, en: null },
  { texto: 'Ing Electromecánico', en: 'Electromechanical Engineer' },
  { texto: 'Ing. Electromecánico', en: 'Electromechanical Engineer' },
  {
    texto: 'Ingeniero en Sistemas / Máster en Ciberseguridad',
    en: 'Cybersecurity Analyst',
    tambien: 'Systems Engineer'
  },
  { texto: 'Docente', en: 'Teacher' },
  { texto: 'INGENIERO INDUSTRIAL', en: 'Industrial Engineer' },
  { texto: 'Psicologo organizacional', en: 'People Operations Specialist' },
  { texto: 'MAESTRA', en: 'Teacher' },
  { texto: 'Ingeniería en Turismo', en: 'Guest Services Coordinator' },
  { texto: 'Ingeniera en Sistemas', en: 'Systems Engineer' },
  { texto: 'Enfermera', en: 'Patient Care Technician' },
  { texto: 'Abogado', en: 'Paralegal / Legal Assistant' },
  { texto: 'Licenciada en Contabilidad', en: 'Staff Accountant' },
  { texto: 'Máster en Ciberseguridad', en: 'Cybersecurity Analyst' }
];

let fallos = 0;
casos.forEach((c, i) => {
  const m = findTitle(c.texto);
  const got = m ? m.en : null;
  const okEn = got === c.en;
  const okGrado = c.grado ? esGrado(c.texto) === true && got === null : true;
  let okTambien = true;
  if (c.tambien) {
    okTambien = findTitles(c.texto).some(x => x.en === c.tambien);
  }
  const ok = okEn && okGrado && okTambien;
  if (!ok) {
    fallos++;
    console.error(
      (i + 1) + '. FAIL  "' + c.texto + '"\n    esperado: ' + c.en +
      (c.tambien ? ' (+ ' + c.tambien + ')' : '') +
      (c.grado ? ' [grado]' : '') +
      '\n    obtuvo:   ' + got +
      (c.grado ? '  esGrado=' + esGrado(c.texto) : '') +
      (c.tambien ? '  todos=' + findTitles(c.texto).map(x => x.en).join(' | ') : '')
    );
  } else {
    console.log((i + 1) + '. ok    "' + c.texto + '" → ' + (got || '(grado, sin cargo)'));
  }
});

if (fallos) {
  console.error('\n' + fallos + ' de ' + casos.length + ' casos fallaron.');
  process.exit(1);
}
console.log('\n15/15 cargos del diccionario coinciden.');
