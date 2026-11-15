export const TRAINER_EMAILS = ["karls_d2@hotmail.com", "carlosalecas@gmail.com"];

export const EJERCICIOS = {
  1:"Arrancada",2:"Arr. Encima rodilla",3:"Arr. Debajo rodilla",6:"Arr. Tacos altos",
  7:"Arr. Tacos bajos",9:"Arr. Lenta",10:"Dos tiempos",11:"Cargada",12:"Crg. Encima rodilla",
  13:"Crg. Debajo rodilla",16:"Crg. Tacos altos",17:"Crg. Tacos bajos",18:"Jerk delante",
  19:"Jerk detrás",20:"Arr. Fuerza",21:"Arr. Fza. Encima rodilla",22:"Arr. Fza. Debajo rodilla",
  23:"Arr. Fza. Tacos bajos",24:"Arr. Fza. Tacos altos",25:"Arr. Sin flexión",29:"Push jerk delante",
  30:"Push jerk detrás",31:"Push press delante",32:"Push press detrás",33:"Crg. Fuerza",
  34:"Crg. Fza. Debajo rodilla",35:"Crg. Fza. Encima rodilla",36:"Crg. Fza. Tacos bajos",
  37:"Crg. Fza. Tacos altos",38:"Crg. Fza. + Jerk",39:"Crg. Fza. + Push jerk",
  40:"Tirón Arr. Técnico",41:"Tirón Arr. Colgante",43:"Tirón Arr. Tacos altos",
  44:"Tirón Arr. Tacos bajos",47:"Tirón DT len.",48:"Tirón DT téc.",49:"Tirón DT col.",
  50:"Pierna trasera",51:"Pierna delantera",52:"Pierna delantera + Jerk",53:"Pierna dinámica","53e":"Pierna estática",
};

export const C = {accent:"#f5c400",green:"#34d399",red:"#f87171",bg:"#0a0a0a",card:"#141414",border:"#2a2a2a",sub:"#1a1a1a",muted:"#6b7280",text:"#e2e8f0"};

export function parseSeries(str, prKg) {
  if (!str) return [];
  return str.split(",").map(seg => {
    seg = seg.trim();
    const m1 = seg.match(/^(\d+)[\\\/]\s*(\d+\+\d+|\d+)\s+(\d+)/);
    if (m1) { const pct=+m1[3],kg=prKg?Math.round(prKg*pct/100):pct; return {series:+m1[1],reps:m1[2],pct,kg}; }
    const m2 = seg.match(/^(\d+\+\d+|\d+)\s+(\d+)/);
    if (m2) { const pct=+m2[2],kg=prKg?Math.round(prKg*pct/100):pct; return {series:1,reps:m2[1],pct,kg}; }
    return null;
  }).filter(Boolean);
}

export function ejPrKg(cod, prs) {
  const c = Number(cod);
  if ([1,2,3,6,7,9,20,21,22,23,24,25].includes(c)) return prs.arrancada;
  if ([10,11,12,13,16,17,33,34,35,36,37,38,39].includes(c)) return prs.dostiempos;
  if ([18,19,29,30,31,32].includes(c)) return prs.dostiempos;
  if ([40,41,43,44].includes(c)) return prs.arrancada;
  if ([47,48,49].includes(c)) return prs.dostiempos;
  if (c === 52) return prs.dostiempos;
  if ([53].includes(c) || cod === "53e") return prs.arrancada;
  if (c === 50) return prs.squat;
  if (c === 51) return prs.squatf;
  return null;
}

// ── MES / SEMANA ACTUAL ──────────────────────────────────────
export const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export const normTxt = (s) => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").trim().toLowerCase();

// Mes de hoy si hay semanas publicadas con ese mes; si no, el mes de la última semana creada.
export function pickCurrentMonth(weeks, now = new Date()) {
  if (!weeks || weeks.length === 0) return null;
  const hoy = MESES_ES[now.getMonth()];
  const esHoy = w => normTxt(w.mes).split(/[^a-z]+/).includes(hoy);
  const match = [...weeks].reverse().find(esHoy);
  return (match || weeks[weeks.length - 1]).mes;
}

// Atleta: primera semana del mes con alguna sesión sin completar (si todo está hecho, la última).
// Entrenador: la última semana publicada.
export function pickCurrentWeekId(monthWeeks, sessions, logs, isTrainer) {
  const conSesiones = monthWeeks.filter(w => sessions.some(s => s.week_id === w.id));
  if (conSesiones.length === 0) return null;
  if (isTrainer) return conSesiones[conSesiones.length - 1].id;
  const hecha = (id) => logs.some(l => l.session_id === id && l.completado);
  const pendiente = conSesiones.find(w => sessions.filter(s => s.week_id === w.id).some(s => !hecha(s.id)));
  return (pendiente || conSesiones[conSesiones.length - 1]).id;
}

// ── FORMATO DE TEXTO DEL ENTRENADOR ──────────────────────────
// Una línea por ejercicio:  31+18- 2/3+3 50, 2+2 60 # nota   |   + Bíceps 4x10 (complementario)
const SERIE_RE = /^(?:(\d+)\s*[\\\/]\s*)?(\d+(?:\+\d+)?)\s+(\d+)$/;

export function parseLine(raw) {
  const l = raw.trim();
  if (!l) return null;
  if (l[0] === "+") {
    const nombre = l.slice(1).trim();
    return nombre ? {ok:true, ej:{tipo:"libre", nombre}} : {ok:false, msg:"Falta el nombre del complementario"};
  }
  const m = l.match(/^(\d+e?(?:\s*\+\s*\d+e?)*)\s*-\s*(.*)$/i);
  if (!m) return {ok:false, msg:"Formato: códigos- series (ej: 31+18- 2/3 50, 3 60)"};
  const codigos = m[1].split("+").map(x=>x.trim().toLowerCase()).map(x=>/^\d+$/.test(x)?+x:x);
  const bad = codigos.filter(c=>!(c in EJERCICIOS));
  if (bad.length) return {ok:false, msg:`Código desconocido: ${bad.join(", ")}`};
  let rest = m[2], nota = "";
  const h = rest.indexOf("#");
  if (h >= 0) { nota = rest.slice(h+1).trim(); rest = rest.slice(0,h).trim(); }
  const partes = rest.split(",").map(x=>x.trim()).filter(Boolean);
  if (!partes.length) return {ok:false, msg:"Faltan las series"};
  const malas = partes.filter(p=>!SERIE_RE.test(p));
  if (malas.length) return {ok:false, msg:`Serie no válida: ${malas.join(" | ")}`};
  return {ok:true, ej:{tipo:"num", codigos, nota, series:partes.join(", ")}};
}

export function parseDay(text) {
  const ejercicios = [], errors = [];
  String(text||"").split("\n").forEach((raw, i) => {
    const r = parseLine(raw);
    if (!r) return;
    if (r.ok) ejercicios.push(r.ej); else errors.push({line:i+1, msg:r.msg});
  });
  return {ejercicios, errors};
}

export function serializeDay(ejs) {
  return (ejs||[]).filter(e=>e.tipo==="num").map(e=>
    `${(Array.isArray(e.codigos)?e.codigos:[e.codigos]).join("+")}- ${e.series}${e.nota?` # ${e.nota}`:""}`
  ).join("\n");
}

export function nextName(name) {
  const m = String(name||"").match(/\d+/);
  return m ? String(name).replace(/\d+/, String(+m[0]+1)) : "";
}

// Filas (modo "Filas"): se derivan de las líneas del texto, sin validar
export function rowFromLine(line) {
  const h = line.indexOf("#");
  const nota = h>=0 ? line.slice(h+1).replace(/^ /,"") : "";
  let rest = h>=0 ? line.slice(0,h).replace(/ $/,"") : line;
  const i = rest.indexOf("-");
  if (i<0) return {c:rest, s:"", n:nota};
  return {c:rest.slice(0,i), s:rest.slice(i+1).replace(/^ /,""), n:nota};
}
export function lineFromRow(r) {
  if (!r.c && !r.s && !r.n) return "";
  return `${r.c}- ${r.s}${r.n?` # ${r.n}`:""}`;
}

// Series sueltas de un ejercicio (una casilla por serie)
export function flatSets(ej, prs) {
  if (ej.tipo !== "num") return [];
  const pr = ejPrKg(ej.codigos[0], prs);
  const out = [];
  parseSeries(ej.series, pr).forEach(g => { for (let k=0;k<g.series;k++) out.push({reps:g.reps,pct:g.pct,kg:g.kg}); });
  return out;
}
export const totalSets = (session, prs) => (session.ejercicios||[]).reduce((n,ej)=>n+flatSets(ej,prs).length,0);
