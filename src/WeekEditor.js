import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { C, EJERCICIOS, MESES_ES, parseSeries, parseDay, serializeDay, nextName, rowFromLine, lineFromRow } from "./lib";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const newDay = () => ({id:null, dia:"", text:"", compl:[], prev:true});

// Los "+ complementario" escritos en el texto pasan a la lista de complementarios
function normalizeDay(d) {
  const lines = d.text.split("\n");
  const plus = lines.filter(l=>l.trim().startsWith("+")).map(l=>({nombre:l.trim().slice(1).trim(), detalle:""})).filter(x=>x.nombre);
  if (plus.length===0 && !lines.some(l=>l.trim().startsWith("+"))) return d;
  return {...d, text:lines.filter(l=>!l.trim().startsWith("+")).join("\n"), compl:[...d.compl, ...plus]};
}

function dayFromSession(s) {
  const ejs = s.ejercicios||[];
  const nums = ejs.filter(e=>e.tipo==="num");
  return {
    id:s.id||null, dia:s.dia||"", prev:false,
    text:serializeDay(nums),
    compl:ejs.filter(e=>e.tipo!=="num").map(e=>({nombre:e.nombre||"", detalle:e.detalle||""})),
  };
}

function buildEjercicios(d) {
  const {ejercicios} = parseDay(d.text);
  const compl = d.compl.filter(x=>x.nombre.trim()).map(x=>({tipo:"libre", nombre:x.nombre.trim(), detalle:x.detalle.trim()}));
  return [...ejercicios, ...compl];
}

function Preview({ day, sample }) {
  const {ejercicios} = parseDay(day.text);
  const pr = sample>0 ? sample : null;
  if (ejercicios.length===0 && day.compl.length===0) return <div style={{color:C.muted,fontSize:12}}>Sin ejercicios todavía.</div>;
  return (
    <div>
      {ejercicios.filter(e=>e.tipo==="num").map((e,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",minWidth:0}}>
          <span style={{color:"#fff",flex:"none",fontSize:12,minWidth:70}}>{e.codigos.join("+")} <span style={{color:C.muted}}>{e.codigos.map(c=>EJERCICIOS[c]||"").join(" + ").slice(0,16)}</span></span>
          <div style={{display:"flex",overflowX:"auto",gap:4,whiteSpace:"nowrap"}}>
            {parseSeries(e.series,pr).map((s,j)=>(
              <span key={j} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"1px 6px",fontSize:12,flex:"none"}}>
                {s.series>1?`${s.series}× `:""}{s.reps} · <b style={{color:C.accent,fontWeight:700}}>{s.kg}</b>
              </span>
            ))}
            {e.nota&&<span style={{color:C.muted,fontSize:12,flex:"none"}}>({e.nota})</span>}
          </div>
        </div>
      ))}
      {day.compl.filter(x=>x.nombre.trim()).map((x,i)=>(
        <div key={"c"+i} style={{display:"flex",gap:6,padding:"3px 0",fontSize:12,color:"#9ca3af"}}>
          <span style={{background:"#1d2a22",color:C.green,borderRadius:6,padding:"1px 6px",fontSize:10,flex:"none"}}>COMPL.</span>
          <span style={{color:"#fff"}}>{x.nombre}</span><span>{x.detalle}</span>
        </div>
      ))}
    </div>
  );
}

export default function WeekForm({ onSave, onCancel, initial, allWeeks=[], allSessions=[] }) {
  const hoyMes = cap(MESES_ES[new Date().getMonth()]);
  const [semanaName, setSemanaName] = useState(initial?.semana||"");
  const [mes, setMes] = useState(initial?.mes||hoyMes);
  const [dias, setDias] = useState(()=>initial?.dias?.length
    ? [...initial.dias].sort((a,b)=>String(a.dia).localeCompare(String(b.dia),"es",{numeric:true})).map(dayFromSession)
    : [newDay(),newDay(),newDay()]);
  const [mode, setMode] = useState("texto");
  const [sample, setSample] = useState(100);
  const [showPaste, setShowPaste] = useState(false);
  const [bigText, setBigText] = useState("");
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(()=>{
    supabase.from("plantillas").select("*").order("nombre").then(({data})=>setPlantillas(data||[]));
  },[]);

  const meses = MESES_ES.map(cap);
  if (mes && !meses.includes(mes)) meses.unshift(mes);

  const setDay = (i, patch) => setDias(ds=>ds.map((d,j)=>j===i?{...d,...patch}:d));
  const normDay = i => setDias(ds=>ds.map((d,j)=>j===i?normalizeDay(d):d));

  const prevWeek = !initial ? [...allWeeks].reverse().find(w=>allSessions.some(s=>s.week_id===w.id)) : null;
  const copyPrev = () => {
    if (!prevWeek) return;
    const ss = allSessions.filter(s=>s.week_id===prevWeek.id).sort((a,b)=>String(a.dia).localeCompare(String(b.dia),"es",{numeric:true}));
    setDias(ss.map(s=>({...dayFromSession(s), id:null})));
    setSemanaName(nextName(prevWeek.semana));
    setMes(prevWeek.mes);
  };

  const splitWeek = () => {
    const re = /^[ \t]*\d+\s*[ºo°.]?\s*d[ií]a\b.*$/gim;
    const heads = [...bigText.matchAll(re)];
    let out;
    if (heads.length===0) out = [{...newDay(), text:bigText.trim()}];
    else out = heads.map((h,i)=>{
      const from = h.index + h[0].length;
      const to = i+1<heads.length ? heads[i+1].index : bigText.length;
      return {...newDay(), dia:h[0].trim(), text:bigText.slice(from,to).trim()};
    });
    setDias(out.map(normalizeDay)); setShowPaste(false); setBigText("");
  };

  const saveTemplate = async i => {
    const d = normalizeDay(dias[i]);
    const nombre = window.prompt("Nombre de la plantilla");
    if (!nombre || !nombre.trim()) return;
    const {error:e} = await supabase.from("plantillas").insert({nombre:nombre.trim(), contenido:{text:d.text, compl:d.compl}});
    if (e) { setError("No se pudo guardar la plantilla: "+e.message); return; }
    const {data} = await supabase.from("plantillas").select("*").order("nombre");
    setPlantillas(data||[]);
  };
  const loadTemplate = (i, id) => {
    const p = plantillas.find(x=>x.id===id); if (!p) return;
    const d = dias[i];
    if ((d.text.trim()||d.compl.length) && !window.confirm("Esto reemplaza el contenido de este día. ¿Seguir?")) return;
    setDay(i, {text:p.contenido?.text||"", compl:p.contenido?.compl||[]});
  };

  const errorsOf = d => parseDay(d.text).errors;
  const totalErrors = dias.reduce((n,d)=>n+errorsOf(d).length,0);

  const save = async () => {
    if (!semanaName.trim()) { setError("Añade un nombre a la semana"); return; }
    if (totalErrors>0) { setError("Hay líneas con errores (marcadas en rojo). Corrígelas antes de publicar."); return; }
    setLoading(true); setError(null);
    try {
      let weekId = initial?.id;
      if (initial) {
        const {error:e} = await supabase.from("weeks").update({semana:semanaName.trim(),mes}).eq("id",initial.id);
        if (e) throw e;
      } else {
        const {data:week,error:e} = await supabase.from("weeks").insert({semana:semanaName.trim(),mes}).select().single();
        if (e) throw e;
        weekId = week.id;
      }
      const keep = [];
      for (let di=0; di<dias.length; di++) {
        const d = normalizeDay(dias[di]);
        const ejercicios = buildEjercicios(d);
        if (ejercicios.length===0) continue;
        const dia = d.dia.trim() || `${di+1}º DIA`;
        if (d.id) {
          const {error:e} = await supabase.from("sessions").update({dia,ejercicios}).eq("id",d.id);
          if (e) throw e;
          keep.push(d.id);
        } else {
          const {data,error:e} = await supabase.from("sessions").insert({week_id:weekId,dia,ejercicios}).select().single();
          if (e) throw e;
          keep.push(data.id);
        }
      }
      if (initial) {
        const toDel = (initial.dias||[]).map(x=>x.id).filter(id=>id && !keep.includes(id));
        if (toDel.length) {
          const {error:e} = await supabase.from("sessions").delete().in("id",toDel);
          if (e) throw e;
        }
      }
      onSave();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const field = {background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"6px 10px",fontSize:13,boxSizing:"border-box"};
  const ghost = {background:"none",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer"};

  return (
    <div style={{background:C.card,border:`2px solid ${C.accent}`,borderRadius:16,padding:20,marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{margin:0,color:C.accent,fontWeight:900}}>{initial?"✏️ EDITAR SEMANA":"+ NUEVA SEMANA"}</h3>
        <button onClick={onCancel} aria-label="Cerrar" style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <select aria-label="Mes" value={mes} onChange={e=>setMes(e.target.value)} style={{...field,flex:"1 1 120px"}}>
          {meses.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <input aria-label="Nombre de la semana" value={semanaName} onChange={e=>setSemanaName(e.target.value)} placeholder="Nombre (ej: 3ª SEMANA)" style={{...field,flex:"2 1 160px"}}/>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        {prevWeek&&<button onClick={copyPrev} style={ghost}>📋 Copiar {prevWeek.semana}</button>}
        <button onClick={()=>setShowPaste(v=>!v)} style={ghost}>📥 Pegar semana entera</button>
        <span style={{marginLeft:"auto",display:"flex",gap:0}}>
          {["texto","filas"].map(m=>(
            <button key={m} onClick={()=>{ if(m==="filas") setDias(ds=>ds.map(normalizeDay)); setMode(m); }}
              style={{...ghost,borderRadius:m==="texto"?"8px 0 0 8px":"0 8px 8px 0",background:mode===m?C.accent:"none",color:mode===m?"#000":C.text,fontWeight:700}}>
              {m==="texto"?"Texto":"Filas"}
            </button>
          ))}
        </span>
      </div>

      {showPaste&&(
        <div style={{marginBottom:10}}>
          <textarea value={bigText} onChange={e=>setBigText(e.target.value)} rows={7}
            placeholder={"1º DÍA\n1- 2/3 50, 3 60\n2º DÍA\n10- 3 80, 2 90\n3º DÍA\n52- 5/5 70"}
            style={{...field,width:"100%",fontFamily:"monospace",fontSize:12,color:C.accent}}/>
          <button onClick={splitWeek} disabled={!bigText.trim()} style={{...ghost,background:C.accent,color:"#000",fontWeight:700,marginTop:6}}>Repartir en días</button>
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:11,color:C.muted}}>
        <span>KILOS DE EJEMPLO PARA UN PR DE</span>
        <input type="number" min="1" value={sample} onChange={e=>setSample(+e.target.value)} aria-label="PR de ejemplo" style={{...field,width:70,padding:"3px 6px"}}/><span>kg</span>
      </div>

      {dias.map((d,di)=>{
        const errs = errorsOf(d);
        const rows = d.text.split("\n").map(rowFromLine);
        const setRow = (ri, patch) => {
          const lines = d.text.split("\n"); lines[ri] = lineFromRow({...rows[ri],...patch}); setDay(di,{text:lines.join("\n")});
        };
        return (
          <div key={di} style={{background:C.bg,border:`1px solid ${errs.length?"#7f1d1d":C.border}`,borderRadius:10,padding:10,marginBottom:10}}>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
              <input aria-label={`Título del día ${di+1}`} value={d.dia} onChange={e=>setDay(di,{dia:e.target.value})} placeholder={`${di+1}º DIA`} style={{...field,width:110,padding:"3px 8px"}}/>
              <span style={{fontSize:11,color:errs.length?C.red:C.green}}>{errs.length?`${errs.length} por revisar`:"✓ listo"}</span>
              <span style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
                {plantillas.length>0&&(
                  <select aria-label="Cargar plantilla" value="" onChange={e=>loadTemplate(di,e.target.value)} style={{...field,padding:"3px 6px",fontSize:12,maxWidth:130}}>
                    <option value="">Plantilla…</option>
                    {plantillas.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                )}
                <button onClick={()=>saveTemplate(di)} title="Guardar este día como plantilla" style={{...ghost,padding:"3px 8px"}}>💾</button>
                <button onClick={()=>setDias(ds=>ds.filter((_,j)=>j!==di))} aria-label="Eliminar día" style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:13}}>✕</button>
              </span>
            </div>

            {mode==="texto"?(
              <textarea aria-label={`Ejercicios del día ${di+1}`} value={d.text} rows={Math.max(3,Math.min(8,d.text.split("\n").length+1))}
                onChange={e=>setDay(di,{text:e.target.value})} onBlur={()=>normDay(di)}
                placeholder={"1- 2/3 50, 3 60, 2 70\n31+18- 2/3+3 50, 2+2 60 # con pausa"}
                style={{...field,width:"100%",fontFamily:"monospace",fontSize:12,color:C.accent,resize:"vertical"}}/>
            ):(
              <div>
                {rows.map((r,ri)=>(
                  <div key={ri} style={{display:"flex",gap:6,marginBottom:5,alignItems:"center"}}>
                    <input aria-label="Código" value={r.c} onChange={e=>setRow(ri,{c:e.target.value})} placeholder="Cód." style={{...field,width:70,padding:"4px 6px"}}/>
                    <input aria-label="Series" value={r.s} onChange={e=>setRow(ri,{s:e.target.value})} placeholder="2/3 50, 3 60" style={{...field,flex:1,minWidth:0,padding:"4px 6px"}}/>
                    <input aria-label="Nota" value={r.n} onChange={e=>setRow(ri,{n:e.target.value})} placeholder="Nota" style={{...field,width:80,padding:"4px 6px"}}/>
                    <button aria-label="Quitar fila" onClick={()=>{const l=d.text.split("\n");l.splice(ri,1);setDay(di,{text:l.join("\n")});}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setDay(di,{text:d.text+(d.text&&!d.text.endsWith("\n")?"\n":"")+"- "})} style={{...ghost,borderStyle:"dashed",color:C.muted,width:"100%"}}>+ ejercicio</button>
              </div>
            )}

            {errs.length>0&&(
              <div style={{marginTop:4,fontSize:11,color:C.red}}>
                {errs.map((x,i)=><div key={i}>Línea {x.line}: {x.msg}</div>)}
              </div>
            )}

            {d.compl.map((x,ci)=>(
              <div key={ci} style={{display:"flex",gap:6,marginTop:6}}>
                <input aria-label="Complementario" value={x.nombre} onChange={e=>setDay(di,{compl:d.compl.map((y,k)=>k===ci?{...y,nombre:e.target.value}:y)})} placeholder="Complementario (ej: Bíceps)" style={{...field,flex:1.3,minWidth:0,padding:"4px 8px"}}/>
                <input aria-label="Detalle del complementario" value={x.detalle} onChange={e=>setDay(di,{compl:d.compl.map((y,k)=>k===ci?{...y,detalle:e.target.value}:y)})} placeholder="4x10" style={{...field,flex:1,minWidth:0,padding:"4px 8px"}}/>
                <button aria-label="Quitar complementario" onClick={()=>setDay(di,{compl:d.compl.filter((_,k)=>k!==ci)})} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setDay(di,{compl:[...d.compl,{nombre:"",detalle:""}]})} style={{...ghost,borderStyle:"dashed",color:C.muted,marginTop:6}}>+ Complementario</button>

            <div onClick={()=>setDay(di,{prev:!d.prev})} style={{marginTop:8,color:C.muted,fontSize:11,cursor:"pointer"}}>{d.prev?"▾":"▸"} Vista previa</div>
            {d.prev&&<div style={{marginTop:4}}><Preview day={d} sample={sample}/></div>}
          </div>
        );
      })}

      <button onClick={()=>setDias(ds=>[...ds,newDay()])} style={{...ghost,borderStyle:"dashed",color:C.muted,width:"100%",marginBottom:12}}>+ día</button>
      {error&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{error}</div>}
      <button onClick={save} disabled={loading}
        style={{width:"100%",background:loading?"#333":C.accent,color:"#000",border:"none",borderRadius:8,padding:"11px",fontSize:14,fontWeight:900,cursor:loading?"not-allowed":"pointer"}}>
        {loading?"Guardando...":(initial?"💾 GUARDAR CAMBIOS":"💾 PUBLICAR SEMANA")}
      </button>
    </div>
  );
}
