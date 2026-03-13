import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const TRAINER_EMAIL = "carlosalecas@gmail.com";

const EJERCICIOS = {
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

const C = {accent:"#f5c400",green:"#34d399",red:"#f87171",bg:"#0a0a0a",card:"#141414",border:"#2a2a2a",sub:"#1a1a1a",muted:"#6b7280",text:"#e2e8f0"};

function parseSeries(str, prKg) {
  if (!str) return [];
  return str.split(",").map(seg => {
    seg = seg.trim();
    const m1 = seg.match(/^(\d+)\/(\d+)\s+(\d+)/);
    if (m1) { const pct=+m1[3],kg=prKg?Math.round(prKg*pct/100):pct; return {series:+m1[1],reps:+m1[2],pct,kg}; }
    const m2 = seg.match(/^(\d+)\s+(\d+)/);
    if (m2) { const pct=+m2[2],kg=prKg?Math.round(prKg*pct/100):pct; return {series:1,reps:+m2[1],pct,kg}; }
    return null;
  }).filter(Boolean);
}

function ejPrKg(cod, prs) {
  const c = Number(cod);
  if ([1,2,3,6,7,9,20,21,22,23,24,25].includes(c)) return prs.arrancada;
  if ([11,12,13,16,17,33,34,35,36,37,38,39].includes(c)) return prs.dostiempos;
  if ([18,19,29,30,31,32].includes(c)) return prs.dostiempos;
  if ([40,41,43,44].includes(c)) return prs.arrancada;
  if ([47,48,49].includes(c)) return prs.dostiempos;
  if ([50,51,52,53].includes(c)) return prs.squat;
  return null;
}

// ── AUTH ─────────────────────────────────────────────────────
function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inp = (val, set, ph, type="text") => (
    <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
      style={{width:"100%",background:C.sub,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"12px 14px",fontSize:14,boxSizing:"border-box",marginBottom:10}}/>
  );

  const handle = async () => {
    setLoading(true); setError(null);
    try {
      if (mode==="login") {
        const {error} = await supabase.auth.signInWithPassword({email,password});
        if (error) throw error;
      } else {
        const {error} = await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
        if (error) throw error;
        alert("Revisa tu email para confirmar la cuenta y luego inicia sesión.");
        setMode("login");
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,color:C.accent,fontWeight:900,letterSpacing:4,textTransform:"uppercase"}}>Owl Functional Fitness</div>
          <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:2,textTransform:"uppercase",marginTop:4}}>Weightlifting</div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:28}}>
          <div style={{display:"flex",marginBottom:20,background:C.sub,borderRadius:8,padding:4}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{flex:1,background:mode===m?C.accent:"none",color:mode===m?"#000":C.muted,border:"none",borderRadius:6,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {m==="login"?"Log in":"Register"}
              </button>
            ))}
          </div>
          {mode==="register" && inp(name,setName,"Nombre completo")}
          {inp(email,setEmail,"Email","email")}
          {inp(password,setPassword,"Contraseña","password")}
          {error && <div style={{color:C.red,fontSize:13,marginBottom:10}}>{error}</div>}
          <button onClick={handle} disabled={loading}
            style={{width:"100%",background:C.accent,color:"#000",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:900,cursor:"pointer",letterSpacing:1}}>
            {loading?"...":(mode==="login"?"LOG IN":"CREAR CUENTA")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TRAINER: ADD/EDIT WEEK ────────────────────────────────────
const EMPTY_DIA = () => ({dia:"",ejercicios:[{tipo:"num",codigos:"",nota:"",series:""},{tipo:"num",codigos:"",nota:"",series:""}]});

function WeekForm({ onSave, onCancel, initial }) {
  const [semanaName, setSemanaName] = useState(initial?.semana||"");
  const [mes, setMes] = useState(initial?.mes||"Marzo");
  const [dias, setDias] = useState(initial?.dias||[EMPTY_DIA(),EMPTY_DIA(),EMPTY_DIA()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(initial ? "manual" : null);
  const [imgB64, setImgB64] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const imgRef = useRef();

  const inp = (val, onChange, ph, w="100%") => (
    <input value={val} onChange={e=>onChange(e.target.value)} placeholder={ph}
      style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"6px 10px",fontSize:13,width:w,boxSizing:"border-box"}}/>
  );

  const updateDia = (di,f,v) => setDias(ds=>ds.map((d,i)=>i!==di?d:{...d,[f]:v}));
  const updateEj = (di,ei,f,v) => setDias(ds=>ds.map((d,i)=>i!==di?d:{...d,ejercicios:d.ejercicios.map((e,j)=>j!==ei?e:{...e,[f]:v})}));
  const addEj = di => setDias(ds=>ds.map((d,i)=>i!==di?d:{...d,ejercicios:[...d.ejercicios,{tipo:"num",codigos:"",nota:"",series:""}]}));
  const removeEj = (di,ei) => setDias(ds=>ds.map((d,i)=>i!==di?d:{...d,ejercicios:d.ejercicios.filter((_,j)=>j!==ei)}));
  const addDia = () => setDias(ds=>[...ds,EMPTY_DIA()]);
  const removeDia = di => setDias(ds=>ds.filter((_,i)=>i!==di));

  const onImgChange = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{setImgPreview(ev.target.result);setImgB64(ev.target.result.split(",")[1]);};
    r.readAsDataURL(f);
  };

  const analyzeImage = async () => {
    if (!imgB64) { setError("Sube una imagen primero"); return; }
    setAiLoading(true); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:"image/jpeg",data:imgB64}},
            {type:"text",text:`Analiza esta imagen de un plan de entrenamiento de halterofilia. Devuelve SOLO JSON válido sin backticks:
{"semana":"Xª SEMANA","mes":"Marzo","dias":[{"dia":"1º DIA","ejercicios":[{"tipo":"num","codigos":[50],"nota":"","series":"2/3 50, 3 60"},{"tipo":"libre","nombre":"Bíceps 4x10"}]}]}
Reglas: tipo num=código numérico (codigos es array). tipo libre=texto libre. series formato "X/Y Z". nota para variantes.`}
          ]}]})
      });
      const data=await res.json();
      const txt=data.content.find(b=>b.type==="text")?.text||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      if (!parsed?.dias) throw new Error("No se pudo interpretar");
      setSemanaName(parsed.semana||semanaName);
      setMes(parsed.mes||mes);
      setDias(parsed.dias.map(d=>({...d,ejercicios:(d.ejercicios||[]).map(e=>e.tipo==="num"?{...e,codigos:Array.isArray(e.codigos)?e.codigos.join("+"):e.codigos}:e)})));
      setMode("manual");
    } catch(e) { setError("Error: "+e.message); }
    finally { setAiLoading(false); }
  };

  const save = async () => {
    if (!semanaName) { setError("Añade un nombre a la semana"); return; }
    setLoading(true); setError(null);
    try {
      let weekId = initial?.id;
      if (initial) {
        await supabase.from("weeks").update({semana:semanaName,mes}).eq("id",initial.id);
        await supabase.from("sessions").delete().eq("week_id",initial.id);
      } else {
        const {data:week,error:wErr}=await supabase.from("weeks").insert({semana:semanaName,mes}).select().single();
        if (wErr) throw wErr;
        weekId=week.id;
      }
      for (const dia of dias) {
        const ejercicios=dia.ejercicios
          .filter(e=>e.tipo==="libre"?e.nombre:e.series)
          .map(e=>e.tipo==="libre"?e:{...e,codigos:String(e.codigos).split("+").map(x=>isNaN(x.trim())?x.trim():+x.trim())});
        if (ejercicios.length>0)
          await supabase.from("sessions").insert({week_id:weekId,dia:dia.dia||"Día",ejercicios});
      }
      onSave();
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{background:C.card,border:`2px solid ${C.accent}`,borderRadius:16,padding:24,marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h3 style={{margin:0,color:C.accent,fontWeight:900}}>{initial?"✏️ EDITAR SEMANA":"+ NUEVA SEMANA"}</h3>
        <button onClick={onCancel} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
      </div>

      {!mode && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[{k:"manual",icon:"✏️",label:"Manual"},{k:"image",icon:"📸",label:"Desde imagen"}].map(o=>(
            <button key={o.k} onClick={()=>setMode(o.k)}
              style={{background:C.sub,border:`2px solid ${C.border}`,borderRadius:10,padding:"18px",cursor:"pointer",color:C.text,fontWeight:700,fontSize:14}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{fontSize:28,marginBottom:6}}>{o.icon}</div>{o.label}
            </button>
          ))}
        </div>
      )}

      {mode==="image" && (
        <div>
          <button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:12}}>← Volver</button>
          <div onClick={()=>imgRef.current.click()} style={{border:`2px dashed ${C.border}`,borderRadius:10,padding:28,textAlign:"center",cursor:"pointer",marginBottom:12}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            {imgPreview?<img src={imgPreview} alt="preview" style={{maxWidth:"100%",maxHeight:180,borderRadius:8,objectFit:"contain"}}/>:
              <><div style={{fontSize:36}}>📸</div><div style={{color:C.muted,fontSize:13,marginTop:6}}>Haz clic para subir imagen</div></>}
            <input ref={imgRef} type="file" accept="image/*" onChange={onImgChange} style={{display:"none"}}/>
          </div>
          {error&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{error}</div>}
          <button onClick={analyzeImage} disabled={aiLoading||!imgB64}
            style={{width:"100%",background:aiLoading||!imgB64?"#333":C.accent,color:"#000",border:"none",borderRadius:8,padding:"11px",fontSize:14,fontWeight:900,cursor:aiLoading||!imgB64?"not-allowed":"pointer"}}>
            {aiLoading?"🔍 Analizando...":"🤖 ANALIZAR CON IA"}
          </button>
        </div>
      )}

      {mode==="manual" && (
        <div>
          {!initial && <button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:12}}>← Volver</button>}
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {inp(mes,setMes,"Mes","110px")}
            {inp(semanaName,setSemanaName,"Nombre semana (ej: 1ª SEMANA)","auto")}
          </div>
          {dias.map((dia,di)=>(
            <div key={di} style={{background:C.sub,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                {inp(dia.dia,v=>updateDia(di,"dia",v),`${di+1}º DIA`,"140px")}
                <button onClick={()=>removeDia(di)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:13,marginLeft:"auto"}}>✕ Eliminar día</button>
              </div>
              {dia.ejercicios.map((ej,ei)=>(
                <div key={ei} style={{background:C.bg,borderRadius:8,padding:8,marginBottom:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <select value={ej.tipo} onChange={e=>updateEj(di,ei,"tipo",e.target.value)}
                    style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"5px 8px",fontSize:12}}>
                    <option value="num">Código</option>
                    <option value="libre">Libre</option>
                  </select>
                  {ej.tipo==="num"?<>
                    {inp(ej.codigos,v=>updateEj(di,ei,"codigos",v),"Cód. (ej: 50 o 34+18)","120px")}
                    {inp(ej.nota,v=>updateEj(di,ei,"nota",v),"Nota","90px")}
                    {inp(ej.series,v=>updateEj(di,ei,"series",v),"Series (ej: 2/3 50, 3 60)","190px")}
                  </>:inp(ej.nombre||"",v=>updateEj(di,ei,"nombre",v),"Descripción")}
                  <button onClick={()=>removeEj(di,ei)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:15}}>✕</button>
                </div>
              ))}
              <button onClick={()=>addEj(di)} style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,width:"100%",marginTop:4}}>+ ejercicio</button>
            </div>
          ))}
          <button onClick={addDia} style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:8,padding:"7px",cursor:"pointer",fontSize:13,width:"100%",marginBottom:12}}>+ día</button>
          {error&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{error}</div>}
          <button onClick={save} disabled={loading}
            style={{width:"100%",background:loading?"#333":C.accent,color:"#000",border:"none",borderRadius:8,padding:"11px",fontSize:14,fontWeight:900,cursor:loading?"not-allowed":"pointer"}}>
            {loading?"Guardando...":(initial?"💾 GUARDAR CAMBIOS":"💾 PUBLICAR SEMANA")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── TRAINER PANEL ─────────────────────────────────────────────
function TrainerPanel({ weeks, sessions, athletes, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);
  const [activeTab, setActiveTab] = useState("weeks");

  const deleteWeek = async (weekId) => {
    if (!window.confirm("¿Eliminar esta semana?")) return;
    await supabase.from("weeks").delete().eq("id",weekId);
    onRefresh();
  };

  const tabBtn = (t,label) => (
    <button onClick={()=>setActiveTab(t)} style={{background:activeTab===t?C.accent:C.sub,border:"none",color:activeTab===t?"#000":C.muted,padding:"7px 16px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:700}}>
      {label}
    </button>
  );

  return (
    <div style={{background:C.card,border:`2px solid ${C.accent}`,borderRadius:16,padding:24,marginBottom:28}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <h2 style={{margin:0,color:C.accent,fontWeight:900,letterSpacing:1}}>⚡ PANEL ENTRENADOR</h2>
        <div style={{display:"flex",gap:8}}>
          {tabBtn("weeks","📅 Semanas")}
          {tabBtn("athletes",`👥 Atletas (${athletes.length})`)}
        </div>
      </div>

      {activeTab==="weeks" && (
        <>
          {!showForm && !editingWeek && (
            <button onClick={()=>setShowForm(true)}
              style={{width:"100%",background:C.sub,border:`2px dashed ${C.border}`,color:C.accent,borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:16}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              + NUEVA SEMANA
            </button>
          )}
          {showForm && <WeekForm onSave={()=>{setShowForm(false);onRefresh();}} onCancel={()=>setShowForm(false)}/>}

          {weeks.map(week=>{
            const wSessions=sessions.filter(s=>s.week_id===week.id);
            if (editingWeek?.id===week.id) {
              const initial={...week,dias:wSessions.map(s=>({dia:s.dia,ejercicios:s.ejercicios.map(e=>e.tipo==="num"?{...e,codigos:Array.isArray(e.codigos)?e.codigos.join("+"):e.codigos}:e)}))};
              return <WeekForm key={week.id} initial={initial} onSave={()=>{setEditingWeek(null);onRefresh();}} onCancel={()=>setEditingWeek(null)}/>;
            }
            return (
              <div key={week.id} style={{background:C.sub,borderRadius:10,padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <span style={{fontWeight:700,color:C.text}}>{week.semana}</span>
                  <span style={{color:C.muted,fontSize:12,marginLeft:10}}>{week.mes} · {wSessions.length} días</span>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setEditingWeek(week)}
                    style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
                    ✏️ Editar
                  </button>
                  <button onClick={()=>deleteWeek(week.id)}
                    style={{background:"#450a0a",border:"none",color:C.red,borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {activeTab==="athletes" && (
        <div>
          {athletes.length===0 ? (
            <div style={{textAlign:"center",color:C.muted,padding:24}}>No hay atletas registrados aún.</div>
          ) : (
            <div style={{background:C.sub,borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {["Nombre","Email","Registrado"].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left",color:C.muted,fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a,i)=>(
                    <tr key={a.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":C.bg}}>
                      <td style={{padding:"10px 14px",color:C.text,fontWeight:600}}>{a.raw_user_meta_data?.full_name||"—"}</td>
                      <td style={{padding:"10px 14px",color:C.muted}}>{a.email}</td>
                      <td style={{padding:"10px 14px",color:C.muted}}>{new Date(a.created_at).toLocaleDateString("es-ES")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── EXERCISE ROW ─────────────────────────────────────────────
function EjRow({ ej, prs }) {
  if (ej.tipo==="libre") return <div style={{padding:"6px 0",color:"#94a3b8",fontSize:13,fontStyle:"italic"}}>• {ej.nombre}</div>;
  const pr=ejPrKg(ej.codigos[0],prs);
  const series=parseSeries(ej.series,pr);
  const nombre=ej.codigos.map(c=>EJERCICIOS[c]||`Ej.${c}`).join(" + ")+(ej.nota?` (${ej.nota})`:"");
  return (
    <div style={{background:C.sub,borderRadius:8,padding:"10px 14px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:4}}>
        <span style={{color:C.accent,fontWeight:700,fontSize:13}}>
          {ej.codigos.map(c=><span key={c} style={{background:"#2a2a2a",borderRadius:4,padding:"2px 6px",marginRight:4,fontSize:11}}>{c}</span>)}
          {nombre}
        </span>
        {pr&&<span style={{color:C.muted,fontSize:11}}>PR base: <b style={{color:C.text}}>{pr}kg</b></span>}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
        {series.map((s,i)=>(
          <span key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 9px",fontSize:12}}>
            {s.series>1?`${s.series}×`:""}{s.reps}r · <span style={{color:C.muted,fontSize:11}}>{s.pct}%</span> <b style={{color:C.accent}}>{s.kg}kg</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── SESSION CARD ─────────────────────────────────────────────
function SessionCard({ session, log, onToggle, prs }) {
  const [open, setOpen] = useState(false);
  const completado=log?.completado||false;
  return (
    <div style={{background:C.card,border:`1px solid ${completado?"#1a3a1a":"#3a1a1a"}`,borderRadius:12,marginBottom:12,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",cursor:"pointer",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontWeight:700,fontSize:15}}>{session.dia}</span>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:completado?"#064e3b":"#450a0a",color:completado?C.green:C.red}}>
            {completado?"✓ Completado":"○ Pendiente"}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={e=>{e.stopPropagation();onToggle();}}
            style={{background:completado?"#450a0a":"#064e3b",border:"none",color:completado?C.red:C.green,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>
            {completado?"Marcar pendiente":"Marcar completado"}
          </button>
          <span style={{color:C.muted}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&<div style={{padding:"0 18px 14px"}}>{session.ejercicios.map((ej,i)=><EjRow key={i} ej={ej} prs={prs}/>)}</div>}
    </div>
  );
}

// ── PR PANEL ─────────────────────────────────────────────────
function PRPanel({ prs, onChange }) {
  const [editing, setEditing] = useState(null);
  const items=[{key:"arrancada",label:"Arrancada"},{key:"dostiempos",label:"Dos tiempos"},{key:"squat",label:"Sentadilla trasera"},{key:"squatF",label:"Sentadilla frontal"}];
  const colors=[C.accent,C.green,"#f472b6","#60a5fa"];
  return (
    <div>
      <h2 style={{color:C.accent,margin:"0 0 16px",fontWeight:900,letterSpacing:1}}>🏆 MIS RÉCORDS</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:16}}>
        {items.map((item,i)=>(
          <div key={item.key} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
            <div style={{fontSize:11,color:colors[i],fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{item.label}</div>
            {editing===item.key?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input type="number" defaultValue={prs[item.key]} id={`pr-${item.key}`}
                  style={{background:C.sub,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"6px 8px",fontSize:18,fontWeight:700,width:75}}/>
                <button onClick={()=>{const v=+document.getElementById(`pr-${item.key}`).value;if(v>0)onChange(item.key,v);setEditing(null);}}
                  style={{background:"#7c3aed",border:"none",color:"#fff",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>✓</button>
                <button onClick={()=>setEditing(null)} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"6px 8px",cursor:"pointer"}}>✕</button>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                <div style={{fontSize:34,fontWeight:800,color:"#fff",lineHeight:1}}>{prs[item.key]||"—"}<span style={{fontSize:14,color:C.muted}}>{prs[item.key]?" kg":""}</span></div>
                <button onClick={()=>setEditing(item.key)} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>✏️</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [prs, setPrs] = useState({arrancada:0,dostiempos:0,squat:0,squatF:0});
  const [mesSel, setMesSel] = useState(null);
  const [tab, setTab] = useState("todas");

  const isTrainer = session?.user?.email===TRAINER_EMAIL;

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(session) loadAll(); },[session]);

  const loadAll = async () => {
    const [{data:w},{data:s},{data:l}]=await Promise.all([
      supabase.from("weeks").select("*").order("created_at"),
      supabase.from("sessions").select("*"),
      supabase.from("athlete_logs").select("*").eq("user_id",session.user.id),
    ]);
    setWeeks(w||[]); setSessions(s||[]); setLogs(l||[]);
    if (l?.length>0) {
      const latest=[...l].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0];
      setPrs({arrancada:latest.pr_arrancada||0,dostiempos:latest.pr_dostiempos||0,squat:latest.pr_squat||0,squatF:latest.pr_squatF||0});
    }
    if (w?.length>0&&!mesSel) setMesSel(w[w.length-1].mes);

    if (isTrainer) {
      const {data:users}=await supabase.rpc("get_users");
      if (users) setAthletes(users.filter(u=>u.email!==TRAINER_EMAIL));
    }
  };

  const toggleSession = async (sessionId) => {
    const existing=logs.find(l=>l.session_id===sessionId);
    const newVal=!(existing?.completado||false);
    if (existing) {
      await supabase.from("athlete_logs").update({completado:newVal}).eq("id",existing.id);
    } else {
      await supabase.from("athlete_logs").insert({user_id:session.user.id,session_id:sessionId,completado:newVal,pr_arrancada:prs.arrancada,pr_dostiempos:prs.dostiempos,pr_squat:prs.squat,pr_squatF:prs.squatF});
    }
    loadAll();
  };

  const updatePR = async (key,val) => {
    const newPrs={...prs,[key]:val};
    setPrs(newPrs);
    const existing=logs.find(l=>!l.session_id);
    if (existing) {
      await supabase.from("athlete_logs").update({[`pr_${key}`]:val}).eq("id",existing.id);
    } else {
      await supabase.from("athlete_logs").insert({user_id:session.user.id,session_id:null,pr_arrancada:newPrs.arrancada,pr_dostiempos:newPrs.dostiempos,pr_squat:newPrs.squat,pr_squatF:newPrs.squatF});
    }
    loadAll();
  };

  const meses=useMemo(()=>[...new Set(weeks.map(w=>w.mes))],[weeks]);
  const weeksMes=useMemo(()=>weeks.filter(w=>w.mes===mesSel),[weeks,mesSel]);

  const stats=useMemo(()=>{
    let total=0,comp=0;
    weeksMes.forEach(w=>{
      sessions.filter(s=>s.week_id===w.id).forEach(s=>{
        total++;
        if(logs.find(l=>l.session_id===s.id&&l.completado)) comp++;
      });
    });
    return {total,comp,pend:total-comp};
  },[weeksMes,sessions,logs]);

  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{background:tab===t?C.accent:C.card,border:`1px solid ${C.border}`,color:tab===t?"#000":"#9ca3af",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>
      {label}
    </button>
  );

  if (loading) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontSize:18,fontWeight:700}}>Cargando...</div>;
  if (!session) return <AuthScreen/>;

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"Inter, sans-serif"}}>
      <div style={{background:"#000",borderBottom:`2px solid ${C.accent}`,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:11,color:C.accent,fontWeight:900,letterSpacing:4,textTransform:"uppercase"}}>Owl Functional Fitness</div>
          <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:2,textTransform:"uppercase"}}>Weightlifting Tracker</div>
          <div style={{fontSize:11,color:C.muted,marginTop:1}}>{session.user.user_metadata?.full_name||session.user.email}{isTrainer&&<span style={{color:C.accent,fontWeight:700}}> · Entrenador</span>}</div>
        </div>
        <button onClick={()=>supabase.auth.signOut()} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer"}}>Log out</button>
      </div>

      {meses.length>0&&(
        <div style={{background:"#000",borderBottom:`1px solid ${C.border}`,padding:"8px 24px",display:"flex",gap:8,overflowX:"auto"}}>
          {meses.map(m=>(
            <button key={m} onClick={()=>setMesSel(m)} style={{background:mesSel===m?C.accent:"none",border:`1px solid ${mesSel===m?C.accent:C.border}`,color:mesSel===m?"#000":C.muted,padding:"6px 18px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>
              {m}
            </button>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:12,padding:"16px 24px",flexWrap:"wrap"}}>
        {[{label:"Total sesiones",val:stats.total,color:C.accent},{label:"Completadas",val:stats.comp,color:C.green},{label:"Pendientes",val:stats.pend,color:C.red}].map(s=>(
          <div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 20px",minWidth:110}}>
            <div style={{fontSize:26,fontWeight:800,color:s.color}}>{s.val}</div>
            <div style={{fontSize:12,color:C.muted}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,padding:"0 24px 16px",flexWrap:"wrap"}}>
        {tabBtn("todas","📋 Todas")}
        {tabBtn("completadas","✅ Completadas")}
        {tabBtn("pendientes","⏳ Pendientes")}
        {tabBtn("prs","🏆 Mis PRs")}
      </div>

      <div style={{padding:"0 24px 32px"}}>
        {isTrainer&&tab!=="prs"&&<TrainerPanel weeks={weeksMes} sessions={sessions} athletes={athletes} onRefresh={loadAll}/>}
        {tab==="prs"?(
          <PRPanel prs={prs} onChange={updatePR}/>
        ):(
          weeksMes.map(week=>{
            const wSessions=sessions.filter(s=>s.week_id===week.id)
              .filter(s=>tab==="todas"||(tab==="completadas"?logs.find(l=>l.session_id===s.id&&l.completado):!logs.find(l=>l.session_id===s.id&&l.completado)));
            if (!wSessions.length) return null;
            return (
              <div key={week.id} style={{marginBottom:28}}>
                <h2 style={{color:C.accent,margin:"0 0 12px",fontSize:18,fontWeight:900,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>{week.semana}</h2>
                {wSessions.map(s=>(
                  <SessionCard key={s.id} session={s} log={logs.find(l=>l.session_id===s.id)} onToggle={()=>toggleSession(s.id)} prs={prs}/>
                ))}
              </div>
            );
          })
        )}
        {tab!=="prs"&&weeksMes.length===0&&!isTrainer&&(
          <div style={{textAlign:"center",color:C.muted,marginTop:60,fontSize:15}}>No hay entrenamientos publicados aún. ¡Vuelve pronto!</div>
        )}
      </div>
    </div>
  );
}