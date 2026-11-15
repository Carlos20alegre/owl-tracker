import { useState, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { C, EJERCICIOS, normTxt, pickCurrentMonth, serializeDay } from "./lib";
import WeekForm from "./WeekEditor";
import { ModeSwitch } from "./Athlete";

const nombreAtleta = a => a.raw_user_meta_data?.full_name || a.email;
const fecha = iso => { try { return new Date(iso).toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"2-digit"}); } catch { return ""; } };

function Bar({ value, total, color=C.green }) {
  const pct = total>0 ? Math.round(value*100/total) : 0;
  return <div style={{height:4,background:C.sub,borderRadius:2}} aria-hidden="true"><div style={{height:4,width:`${pct}%`,background:color,borderRadius:2}}/></div>;
}

function WeekCard({ week, days, athletes, allLogs, onEdit, onDelete, isLast }) {
  const [open, setOpen] = useState(false);
  const ids = new Set(athletes.map(a=>a.id));
  const done = days.reduce((n,s)=>n+allLogs.filter(l=>l.session_id===s.id&&l.completado&&ids.has(l.user_id)).length,0);
  const total = days.length*athletes.length;
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:10}}>
      <button onClick={()=>setOpen(o=>!o)} aria-expanded={open}
        style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",color:C.text,cursor:"pointer",padding:0,textAlign:"left"}}>
        <span>
          <span style={{color:C.accent,fontWeight:800,fontSize:16}}>{week.semana}</span>
          {isLast&&<span style={{background:C.accent,color:"#000",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,marginLeft:8}}>ÚLTIMA</span>}
          <span style={{display:"block",color:C.muted,fontSize:12,marginTop:2}}>{days.length} {days.length===1?"día":"días"}{athletes.length>0&&total>0?` · ${done}/${total} sesiones hechas`:""}</span>
        </span>
        <span style={{color:C.muted}}>{open?"▲":"▼"}</span>
      </button>
      {athletes.length>0&&total>0&&<div style={{marginTop:8}}><Bar value={done} total={total}/></div>}

      {open&&(
        <div style={{marginTop:10}}>
          {days.map(s=>{
            const nums=(s.ejercicios||[]).filter(e=>e.tipo==="num"), libres=(s.ejercicios||[]).filter(e=>e.tipo!=="num");
            const hechas=allLogs.filter(l=>l.session_id===s.id&&l.completado&&ids.has(l.user_id)).length;
            return (
              <div key={s.id} style={{background:C.bg,borderRadius:10,padding:"8px 10px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <b style={{color:"#fff"}}>{s.dia}</b>
                  {athletes.length>0&&<span style={{color:C.muted}}>{hechas}/{athletes.length} atletas</span>}
                </div>
                <pre style={{margin:"4px 0 0",fontFamily:"monospace",fontSize:11,color:C.accent,whiteSpace:"pre-wrap"}}>{serializeDay(nums)}</pre>
                {nums.length>0&&<div style={{color:C.muted,fontSize:11}}>{nums.map(e=>e.codigos.map(c=>EJERCICIOS[c]||c).join("+")).join(" · ")}</div>}
                {libres.map((e,i)=><div key={i} style={{color:"#9ca3af",fontSize:12}}>+ {e.nombre} {e.detalle}</div>)}
              </div>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={onEdit} style={{flex:1,background:C.sub,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✏️ Editar</button>
            <button onClick={onDelete} style={{background:"#2a0f0f",border:"1px solid #5b1c1c",color:C.red,borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>🗑️ Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrainerApp({ userName, weeks, sessions, athletes, allLogs, prs, history, extras, onRefresh, onSignOut, onUpdatePR, onViewAsAthlete }) {
  const [tab, setTab] = useState("sem");
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mesSel, setMesSel] = useState(null);
  const [showArchivo, setShowArchivo] = useState(false);
  const [atletaAbierto, setAtletaAbierto] = useState(null);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState(null);

  const meses = useMemo(()=>[...new Set(weeks.map(w=>w.mes))],[weeks]);
  const mesActual = useMemo(()=>pickCurrentMonth(weeks),[weeks]);
  const mes = (mesSel && meses.includes(mesSel)) ? mesSel : mesActual;
  const idx = meses.indexOf(mesActual);
  const visibles = idx<0?meses:meses.slice(idx);
  const archivo = idx<0?[]:meses.slice(0,idx);
  const enArchivo = archivo.includes(mes);
  const weeksMes = weeks.filter(w=>w.mes===mes);
  const ultima = weeks.length ? weeks[weeks.length-1].id : null;
  const daysOf = id => sessions.filter(s=>s.week_id===id);

  const deleteWeek = async (w) => {
    if (!window.confirm(`¿Eliminar ${w.semana} (${w.mes})? Se borrarán también las sesiones marcadas por los atletas.`)) return;
    const {error}=await supabase.from("weeks").delete().eq("id",w.id);
    if (error) { setMsg("No se pudo eliminar: "+error.message); return; }
    setMsg(null); onRefresh();
  };

  const sesMes = weeksMes.flatMap(w=>daysOf(w.id));
  const resumen = a => {
    const mine = allLogs.filter(l=>l.user_id===a.id);
    const hechas = sesMes.filter(s=>mine.some(l=>l.session_id===s.id&&l.completado)).length;
    const prRow = mine.find(l=>!l.session_id);
    return {hechas, prRow};
  };
  const filtrados = athletes.filter(a=>!busca.trim()||normTxt(nombreAtleta(a)+" "+a.email).includes(normTxt(busca)));

  const pill = on => ({background:on?C.accent:"none",border:`1px solid ${on?C.accent:C.border}`,color:on?"#000":C.muted,padding:"6px 16px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap"});
  const navItem = (k,icon,label) => (
    <button key={k} onClick={()=>{setTab(k);setForm(false);setEditing(null);}} aria-current={tab===k?"page":undefined}
      style={{flex:1,background:"none",border:"none",cursor:"pointer",color:tab===k?C.accent:C.muted,fontWeight:tab===k?700:400,padding:"8px 0 10px",fontSize:11}}>
      <div style={{fontSize:20}}>{icon}</div>{label}
    </button>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"Inter, sans-serif",maxWidth:720,margin:"0 auto"}}>
      <div style={{padding:"14px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
        <div>
          <div style={{fontSize:10,color:C.accent,fontWeight:900,letterSpacing:3}}>OWL FUNCTIONAL FITNESS</div>
          <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>Hola, {String(userName||"").split(" ")[0]}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={onSignOut} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>Log out</button>
        </div>
      </div>

      <ModeSwitch mode="trainer" onChange={onViewAsAthlete}/>

      <div style={{padding:"8px 16px 100px"}}>
        {msg&&<div style={{color:C.red,fontSize:13,marginBottom:8}}>{msg}</div>}

        {tab==="sem"&&(
          <div>
            {meses.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",gap:8,overflowX:"auto",alignItems:"center"}}>
                  {visibles.map(m=><button key={m} onClick={()=>setMesSel(m)} style={pill(mes===m)}>{m}</button>)}
                  {archivo.length>0&&<button onClick={()=>setShowArchivo(v=>!v)} aria-pressed={showArchivo||enArchivo} style={{...pill(false),border:`1px dashed ${C.border}`,marginLeft:"auto"}}>📁 Archivo ({archivo.length}) {(showArchivo||enArchivo)?"▴":"▾"}</button>}
                </div>
                {archivo.length>0&&(showArchivo||enArchivo)&&(
                  <div style={{display:"flex",gap:8,overflowX:"auto",marginTop:8}}>{archivo.map(m=><button key={m} onClick={()=>setMesSel(m)} style={pill(mes===m)}>{m}</button>)}</div>
                )}
              </div>
            )}

            {!form&&!editing&&(
              <button onClick={()=>setForm(true)} style={{width:"100%",background:C.accent,color:"#000",border:"none",borderRadius:12,padding:13,fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:14}}>+ Nueva semana</button>
            )}
            {form&&<WeekForm allWeeks={weeks} allSessions={sessions} onSave={()=>{setForm(false);onRefresh();}} onCancel={()=>setForm(false)}/>}

            {weeksMes.map(w=>{
              if (editing===w.id) {
                const initial={...w,dias:daysOf(w.id).map(s=>({id:s.id,dia:s.dia,ejercicios:s.ejercicios}))};
                return <WeekForm key={w.id} initial={initial} onSave={()=>{setEditing(null);onRefresh();}} onCancel={()=>setEditing(null)}/>;
              }
              return <WeekCard key={w.id} week={w} days={daysOf(w.id)} athletes={athletes} allLogs={allLogs} isLast={w.id===ultima}
                onEdit={()=>{setForm(false);setEditing(w.id);}} onDelete={()=>deleteWeek(w)}/>;
            })}
            {weeksMes.length===0&&!form&&<div style={{textAlign:"center",color:C.muted,marginTop:40}}>Aún no hay semanas en este mes. Crea la primera con el botón de arriba.</div>}
          </div>
        )}

        {tab==="atl"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
              <h2 style={{margin:0,color:C.accent,fontSize:18,fontWeight:800}}>Atletas ({athletes.length})</h2>
              <span style={{color:C.muted,fontSize:11}}>Sesiones hechas en {mes||"—"}</span>
            </div>
            {athletes.length>4&&<input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nombre o email" aria-label="Buscar atleta"
              style={{width:"100%",boxSizing:"border-box",background:C.sub,border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"10px 12px",marginBottom:10}}/>}
            {athletes.length===0&&<div style={{textAlign:"center",color:C.muted,padding:24}}>Todavía no hay atletas registrados. Comparte el enlace de la app para que se registren.</div>}
            {filtrados.map(a=>{
              const {hechas,prRow}=resumen(a); const open=atletaAbierto===a.id;
              return (
                <div key={a.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:8}}>
                  <button onClick={()=>setAtletaAbierto(open?null:a.id)} aria-expanded={open} style={{width:"100%",background:"none",border:"none",color:C.text,cursor:"pointer",padding:0,textAlign:"left"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                      <span style={{minWidth:0}}>
                        <span style={{display:"block",fontWeight:700,color:"#fff"}}>{nombreAtleta(a)}</span>
                        <span style={{display:"block",color:C.muted,fontSize:12,overflow:"hidden",textOverflow:"ellipsis"}}>{a.email}</span>
                      </span>
                      <span style={{color:hechas>0?C.green:C.muted,fontSize:13,whiteSpace:"nowrap",fontWeight:700}}>{hechas}/{sesMes.length}</span>
                    </div>
                    <div style={{marginTop:8}}><Bar value={hechas} total={sesMes.length}/></div>
                  </button>
                  {open&&(
                    <div style={{marginTop:10,fontSize:12,color:C.muted}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        {[["Arrancada","pr_arrancada"],["Dos tiempos","pr_dostiempos"],["Sent. trasera","pr_squat"],["Sent. frontal","pr_squatf"]].map(([l,k])=>(
                          <div key={k} style={{background:C.bg,borderRadius:8,padding:"6px 10px"}}>{l}<div style={{color:"#fff",fontWeight:700,fontSize:15}}>{prRow?.[k]?`${prRow[k]} kg`:"—"}</div></div>
                        ))}
                      </div>
                      <div style={{marginTop:6}}>Registrado el {fecha(a.created_at)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#000",borderTop:`1px solid ${C.border}`,display:"flex",maxWidth:720,margin:"0 auto",paddingBottom:"env(safe-area-inset-bottom)"}}>
        {navItem("sem","📅","Semanas")}{navItem("atl","👥","Atletas")}
      </div>
    </div>
  );
}
