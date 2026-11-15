import { useState, useMemo, useEffect } from "react";
import { C, EJERCICIOS, ejPrKg, flatSets, totalSets, normTxt, pickCurrentMonth, pickCurrentWeekId } from "./lib";

export function Spark({ values, color=C.accent, w=110, h=34 }) {
  if (!values || values.length<2) return <svg width={w} height={h} aria-hidden="true"><line x1="0" y1={h/2} x2={w} y2={h/2} stroke={C.border} strokeDasharray="3 3"/></svg>;
  const min=Math.min(...values), max=Math.max(...values), r=(max-min)||1;
  const pts=values.map((v,i)=>`${Math.round(i*(w-4)/(values.length-1))+2},${Math.round(h-4-((v-min)/r)*(h-8))}`).join(" ");
  return <svg width={w} height={h} aria-hidden="true"><polyline fill="none" stroke={color} strokeWidth="2" points={pts}/></svg>;
}

const fmtKg = v => String(Math.round(v*10)/10).replace(".",",");
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString("es-ES",{day:"numeric",month:"short"}); } catch { return ""; } };
const nameOf = ej => ej.codigos.map(c=>EJERCICIOS[c]||`Ej.${c}`).join(" + ");

// Selector de modo para quien es entrenador y deportista
export function ModeSwitch({ mode, onChange }) {
  const b = (k,label) => (
    <button key={k} onClick={()=>mode!==k&&onChange(k)} aria-pressed={mode===k}
      style={{flex:1,background:mode===k?C.accent:"none",color:mode===k?"#000":C.muted,border:"none",borderRadius:8,padding:"8px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{label}</button>
  );
  return <div style={{display:"flex",background:C.sub,borderRadius:10,padding:3,margin:"4px 16px 8px"}}>{b("trainer","⚡ Entrenador")}{b("athlete","🏋️ Deportista")}</div>;
}

// ── PRs (atleta y entrenador) ────────────────────────────────
export function PRPanel({ prs, onChange, history=[], extras=[] }) {
  const [editing, setEditing] = useState(null);
  const items=[{key:"arrancada",label:"Arrancada"},{key:"dostiempos",label:"Dos tiempos"},{key:"squat",label:"Sentadilla trasera"},{key:"squatf",label:"Sentadilla frontal"}];
  const colors=[C.accent,C.green,"#f472b6","#60a5fa"];
  const porNombre = useMemo(()=>{
    const m={};
    extras.forEach(x=>{ const k=normTxt(x.nombre); (m[k]=m[k]||{nombre:x.nombre,rows:[]}).rows.push(x); });
    return Object.values(m).map(g=>{
      const pesos=g.rows.map(r=>+r.peso||0);
      const last=g.rows[g.rows.length-1];
      return {nombre:last.nombre, last, best:Math.max(...pesos), pesos};
    }).sort((a,b)=>String(b.last.created_at).localeCompare(String(a.last.created_at)));
  },[extras]);
  return (
    <div>
      <h2 style={{color:C.accent,margin:"0 0 16px",fontWeight:900,letterSpacing:1}}>🏆 MIS RÉCORDS</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
        {items.map((item,i)=>{
          const vals=history.filter(h=>h.clave===item.key).map(h=>+h.valor);
          const prev=vals.length>1?vals[vals.length-2]:null;
          const delta=prev!=null&&prs[item.key]?prs[item.key]-prev:null;
          return (
          <div key={item.key} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:colors[i],fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{item.label}</div>
            {editing===item.key?(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input type="number" defaultValue={prs[item.key]} id={`pr-${item.key}`}
                  style={{background:C.sub,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"6px 8px",fontSize:18,fontWeight:700,width:75}}/>
                <button aria-label="Guardar" onClick={()=>{const v=+document.getElementById(`pr-${item.key}`).value;if(v>0)onChange(item.key,v);setEditing(null);}}
                  style={{background:"#7c3aed",border:"none",color:"#fff",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontWeight:700}}>✓</button>
                <button aria-label="Cancelar" onClick={()=>setEditing(null)} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"6px 8px",cursor:"pointer"}}>✕</button>
              </div>
            ):(
              <>
                <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                  <div style={{fontSize:32,fontWeight:800,color:"#fff",lineHeight:1}}>{prs[item.key]||"—"}<span style={{fontSize:14,color:C.muted}}>{prs[item.key]?" kg":""}</span></div>
                  <button aria-label={`Editar ${item.label}`} onClick={()=>setEditing(item.key)} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>✏️</button>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
                  <span style={{fontSize:11,color:delta>0?C.green:C.muted}}>{delta!=null&&delta!==0?`${delta>0?"+":""}${fmtKg(delta)} kg`:" "}</span>
                  <Spark values={vals} color={colors[i]} w={80} h={26}/>
                </div>
              </>
            )}
          </div>);
        })}
      </div>

      {porNombre.length>0&&(
        <div style={{marginTop:24}}>
          <h3 style={{color:C.accent,margin:"0 0 10px",fontWeight:900,letterSpacing:1,fontSize:14}}>MIS EJERCICIOS EXTRA</h3>
          {porNombre.map(g=>(
            <div key={g.nombre} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{minWidth:0}}>
                <div style={{color:"#fff",fontWeight:700}}>{g.nombre}</div>
                <div style={{color:C.muted,fontSize:12}}>Última: {g.last.series}×{g.last.reps} · {fmtKg(+g.last.peso)} kg · {fmtDate(g.last.created_at)}</div>
                <div style={{color:C.accent,fontSize:12}}>Mejor: {fmtKg(g.best)} kg</div>
              </div>
              <Spark values={g.pesos} w={90} h={30}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SESIÓN (modo entrenamiento) ──────────────────────────────
function SessionView({ session, week, log, prs, extras, allExtras, onBack, onSets, onToggle, onAddExtra, onDelExtra }) {
  const sets = log?.sets || {};
  const total = totalSets(session, prs);
  const doneN = Object.values(sets).filter(Boolean).length;
  const completado = !!log?.completado;
  const [rest, setRest] = useState(0);
  const [form, setForm] = useState({nombre:"",series:"",reps:"",peso:""});
  const [touched, setTouched] = useState(false);
  const [last, setLast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if (rest<=0) return;
    const t=setTimeout(()=>{ setRest(r=>r-1); if (rest===1) { try { navigator.vibrate?.(200); } catch {} } },1000);
    return ()=>clearTimeout(t);
  },[rest]);

  const toggleSet = key => {
    const wasAll = total>0 && doneN>=total;
    const next={...sets,[key]:!sets[key]};
    if (!next[key]) delete next[key];
    const n=Object.values(next).filter(Boolean).length;
    const isDone=!!sets[key];
    const all = total>0 && n>=total;
    const comp = isDone ? (wasAll ? false : completado) : (all || completado);
    if (!isDone) setRest(90);
    onSets(session.id, next, comp);
  };

  const lastOf = nombre => {
    const k=normTxt(nombre); if(!k) return null;
    return [...allExtras].reverse().find(x=>normTxt(x.nombre)===k)||null;
  };
  const onNombre = v => {
    const l=lastOf(v);
    setLast(l);
    setForm(f=>(l&&!touched)?{nombre:v,series:String(l.series),reps:String(l.reps),peso:String(l.peso)}:{...f,nombre:v});
  };
  const setField = (k,v) => { setTouched(true); setForm(f=>({...f,[k]:v})); };
  const nombres = useMemo(()=>[...new Set(allExtras.map(x=>x.nombre))],[allExtras]);
  const canSave = form.nombre.trim() && +form.series>0 && +form.reps>0 && form.peso!=="" && +String(form.peso).replace(",",".")>=0;

  const saveExtra = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await onAddExtra({session_id:session.id,nombre:form.nombre.trim(),series:+form.series,reps:+form.reps,peso:+String(form.peso).replace(",",".")});
    setForm({nombre:"",series:"",reps:"",peso:""}); setTouched(false); setLast(null); setSaving(false);
  };

  const box={background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:10};
  const inp={background:C.sub,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px",fontSize:15,boxSizing:"border-box",width:"100%"};

  return (
    <div style={{padding:"12px 16px 100px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <button onClick={onBack} aria-label="Volver" style={{background:"none",border:"none",color:C.accent,fontSize:15,cursor:"pointer",padding:"6px 0"}}>← Volver</button>
        <span style={{color:C.muted,fontSize:11}}>{week?.semana} · {session.dia}</span>
      </div>
      {total>0&&(
        <div style={{height:4,background:C.sub,borderRadius:2,marginBottom:12}}>
          <div style={{height:4,width:`${Math.min(100,Math.round(doneN*100/total))}%`,background:C.accent,borderRadius:2}}/>
        </div>
      )}

      {session.ejercicios.map((ej,ei)=>{
        if (ej.tipo!=="num") {
          return <div key={ei} style={{...box,display:"flex",gap:8,alignItems:"baseline",borderStyle:"dashed"}}>
            <span style={{background:"#1d2a22",color:C.green,borderRadius:6,padding:"1px 6px",fontSize:10,flex:"none"}}>COMPL.</span>
            <span style={{color:"#fff"}}>{ej.nombre}</span><span style={{color:C.muted}}>{ej.detalle}</span>
          </div>;
        }
        const pr=ejPrKg(ej.codigos[0],prs);
        const ss=flatSets(ej,prs);
        return (
          <div key={ei} style={box}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{ej.codigos.map(c=><span key={c} style={{background:"#2a2a2a",borderRadius:4,padding:"1px 6px",marginRight:4,fontSize:11,color:C.accent}}>{c}</span>)}{nameOf(ej)}</span>
              {pr?<span style={{color:C.muted,fontSize:11}}>PR base <b style={{color:C.text}}>{pr} kg</b></span>:null}
            </div>
            {ej.nota&&<div style={{color:C.muted,fontSize:12,marginTop:2}}>{ej.nota}</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
              {ss.map((s,k)=>{
                const key=`${ei}-${k}`, on=!!sets[key];
                return (
                  <button key={key} onClick={()=>toggleSet(key)} aria-pressed={on} aria-label={`Serie ${k+1} de ${nameOf(ej)}`}
                    style={{minWidth:68,minHeight:52,borderRadius:12,border:`2px solid ${on?C.green:C.accent}`,background:on?C.green:"transparent",color:on?"#000":C.text,cursor:"pointer",padding:"4px 8px",textAlign:"center",lineHeight:1.2}}>
                    <div style={{fontWeight:700,fontSize:15}}>{on?"✓ ":""}{s.reps}</div>
                    <div style={{fontSize:12,color:on?"#000":C.accent,fontWeight:700}}>{s.kg} kg</div>
                    <div style={{fontSize:10,color:on?"#064e3b":C.muted}}>{s.pct}%</div>
                  </button>
                );
              })}
              {ss.length===0&&<span style={{color:C.muted,fontSize:12}}>Sin series interpretables: {ej.series}</span>}
            </div>
          </div>
        );
      })}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.sub,borderRadius:12,padding:"8px 12px",marginBottom:10}}>
        <span style={{color:C.muted}}>⏱ Descanso</span>
        <span style={{color:C.accent,fontWeight:700,fontSize:18}} aria-live="polite">{Math.floor(rest/60)}:{String(rest%60).padStart(2,"0")}</span>
        <button onClick={()=>setRest(rest>0?0:90)} style={{background:"none",border:`1px solid ${C.accent}`,color:C.accent,borderRadius:8,padding:"4px 12px",cursor:"pointer"}}>{rest>0?"Parar":"90 s"}</button>
      </div>

      <div style={{color:C.muted,fontSize:11,margin:"14px 0 6px",letterSpacing:1}}>MIS EJERCICIOS EXTRA</div>
      {extras.map(x=>(
        <div key={x.id} style={{...box,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px"}}>
          <div><div style={{color:"#fff",fontWeight:700}}>{x.nombre}</div><div style={{color:C.accent,fontSize:13}}>{x.series} × {x.reps} · {fmtKg(+x.peso)} kg</div></div>
          <button onClick={()=>onDelExtra(x.id)} aria-label={`Borrar ${x.nombre}`} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
      ))}
      <div style={{...box,borderStyle:"dashed"}}>
        <input list="owl-extras" value={form.nombre} onChange={e=>onNombre(e.target.value)} placeholder="Ejercicio (ej: Press banca)" aria-label="Nombre del ejercicio extra" style={inp}/>
        <datalist id="owl-extras">{nombres.map(n=><option key={n} value={n}/>)}</datalist>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {[["series","Series","1"],["reps","Reps","1"],["peso","Kg","0.5"]].map(([k,l,st])=>(
            <label key={k} style={{flex:1,fontSize:10,color:C.muted}}>{l.toUpperCase()}
              <input type="number" inputMode="decimal" min="0" step={st} value={form[k]} onChange={e=>setField(k,e.target.value)} aria-label={l} style={{...inp,marginTop:2,textAlign:"center"}}/>
            </label>
          ))}
        </div>
        {last&&!touched&&<div style={{color:C.muted,fontSize:11,marginTop:6}}>Última vez, {fmtDate(last.created_at)}: {last.series}×{last.reps} · {fmtKg(+last.peso)} kg. Cámbialo si quieres.</div>}
        <button onClick={saveExtra} disabled={!canSave||saving} style={{width:"100%",marginTop:8,background:canSave?C.accent:"#333",color:canSave?"#000":C.muted,border:"none",borderRadius:10,padding:12,fontWeight:700,fontSize:14,cursor:canSave?"pointer":"not-allowed"}}>
          Guardar ejercicio
        </button>
      </div>

      <button onClick={onToggle} style={{width:"100%",marginTop:8,background:completado?"#064e3b":C.accent,color:completado?C.green:"#000",border:completado?`1px solid ${C.green}`:"none",borderRadius:12,padding:14,fontWeight:800,fontSize:15,cursor:"pointer"}}>
        {completado?"✓ Sesión completada · Desmarcar":"Completar sesión"}
      </button>
    </div>
  );
}

// ── APP DEL DEPORTISTA ───────────────────────────────────────
export default function AthleteApp({ onBackToTrainer, userName, weeks, sessions, logs, prs, extras, history, newWeeks, onSeen, onSignOut, onToggleSession, onSets, onUpdatePR, onAddExtra, onDelExtra }) {
  const [tab, setTab] = useState("hoy");
  const [openId, setOpenId] = useState(null);
  const [mesSel, setMesSel] = useState(null);
  const [showArchivo, setShowArchivo] = useState(false);
  const [openWeeks, setOpenWeeks] = useState({});

  const meses = useMemo(()=>[...new Set(weeks.map(w=>w.mes))],[weeks]);
  const mesActual = useMemo(()=>pickCurrentMonth(weeks),[weeks]);
  const mes = (mesSel && meses.includes(mesSel)) ? mesSel : mesActual;
  const idxActual = meses.indexOf(mesActual);
  const visibles = idxActual<0?meses:meses.slice(idxActual);
  const archivo = idxActual<0?[]:meses.slice(0,idxActual);
  const mesEnArchivo = archivo.includes(mes);
  const weeksMes = weeks.filter(w=>w.mes===mes);
  const hecha = id => logs.some(l=>l.session_id===id&&l.completado);

  const hoyWeekId = useMemo(()=>pickCurrentWeekId(weeks.filter(w=>w.mes===mesActual),sessions,logs,false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mesActual,weeks.length,sessions.length]);
  const semanaHoy = weeks.find(w=>w.id===hoyWeekId);
  const sesionesHoy = sessions.filter(s=>s.week_id===hoyWeekId);
  const proxima = sesionesHoy.find(s=>!hecha(s.id));

  const defaultWeekId = useMemo(()=>pickCurrentWeekId(weeksMes,sessions,logs,false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mes,weeks.length,sessions.length]);
  const isOpen = w => openWeeks[w.id] ?? (w.id===defaultWeekId);

  const openSession = openId ? sessions.find(s=>s.id===openId) : null;
  const goNew = () => {
    const last=newWeeks[newWeeks.length-1];
    if (last) { setMesSel(last.mes); setTab("sem"); setOpenWeeks(o=>({...o,[last.id]:true})); }
    onSeen();
  };

  const pill = on => ({background:on?C.accent:"none",border:`1px solid ${on?C.accent:C.border}`,color:on?"#000":C.muted,padding:"6px 16px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap"});
  const prog = s => { const t=totalSets(s,prs); const l=logs.find(x=>x.session_id===s.id); const d=Object.values(l?.sets||{}).filter(Boolean).length; return {t,d}; };

  const navItem = (k,icon,label) => (
    <button key={k} onClick={()=>{setTab(k);setOpenId(null);}} aria-current={tab===k&&!openId?"page":undefined}
      style={{flex:1,background:"none",border:"none",cursor:"pointer",color:tab===k?C.accent:C.muted,fontWeight:tab===k?700:400,padding:"8px 0 10px",fontSize:11}}>
      <div style={{fontSize:20}}>{icon}</div>{label}
    </button>
  );

  const sessionRow = s => {
    const {t,d}=prog(s); const ok=hecha(s.id);
    return (
      <button key={s.id} onClick={()=>setOpenId(s.id)} style={{width:"100%",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.card,border:`1px solid ${ok?"#1a3a1a":C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,color:C.text,cursor:"pointer"}}>
        <span style={{fontWeight:700}}>{s.dia}</span>
        <span style={{fontSize:12,color:ok?C.green:C.muted}}>{ok?"✓ Completada":(t>0&&d>0?`${d}/${t} series`:"Pendiente")}</span>
      </button>
    );
  };

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"Inter, sans-serif",maxWidth:560,margin:"0 auto"}}>
      <div style={{padding:"14px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:C.accent,fontWeight:900,letterSpacing:3}}>OWL FUNCTIONAL FITNESS</div>
          <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>Hola, {String(userName||"").split(" ")[0]||"atleta"}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={onSignOut} style={{background:C.sub,border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Log out</button>
        </div>
      </div>

      {onBackToTrainer&&!openSession&&<ModeSwitch mode="athlete" onChange={onBackToTrainer}/>}

      {newWeeks.length>0&&!openSession&&(
        <div style={{background:C.accent,color:"#000",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
          <span style={{fontWeight:800,fontSize:13}}>🆕 {newWeeks.length===1?"Nueva semana":`${newWeeks.length} semanas nuevas`}: {newWeeks.map(x=>x.semana).join(" · ")}</span>
          <span style={{display:"flex",gap:6}}>
            <button onClick={goNew} style={{background:"#000",color:C.accent,border:"none",borderRadius:6,padding:"6px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>Ver</button>
            <button onClick={onSeen} aria-label="Descartar" style={{background:"none",color:"#000",border:"1px solid #000",borderRadius:6,padding:"6px 10px",fontSize:12,fontWeight:800,cursor:"pointer"}}>✕</button>
          </span>
        </div>
      )}

      {openSession ? (
        <SessionView session={openSession} week={weeks.find(w=>w.id===openSession.week_id)}
          log={logs.find(l=>l.session_id===openSession.id)} prs={prs}
          extras={extras.filter(x=>x.session_id===openSession.id)} allExtras={extras}
          onBack={()=>setOpenId(null)} onSets={onSets} onToggle={()=>onToggleSession(openSession.id)}
          onAddExtra={onAddExtra} onDelExtra={onDelExtra}/>
      ) : (
        <div style={{padding:"8px 16px 100px"}}>
          {tab==="hoy"&&(
            <div>
              {weeks.length===0&&<div style={{textAlign:"center",color:C.muted,marginTop:60}}>No hay entrenamientos publicados aún. ¡Vuelve pronto!</div>}
              {semanaHoy&&proxima&&(
                <div style={{background:C.card,border:`1px solid ${C.accent}`,borderRadius:16,padding:16}}>
                  <div style={{color:C.muted,fontSize:11}}>PRÓXIMA SESIÓN · {semanaHoy.semana}</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#fff",margin:"2px 0 10px"}}>{proxima.dia}</div>
                  {proxima.ejercicios.map((ej,i)=>(
                    <div key={i} style={{padding:"6px 0",borderTop:`1px solid ${C.border}`,color:"#cbd5e1",fontSize:14}}>
                      {ej.tipo==="num"?<>{nameOf(ej)} <span style={{color:C.muted}}>· {flatSets(ej,prs).length} series</span></>:<span style={{color:"#9ca3af"}}>+ {ej.nombre} {ej.detalle}</span>}
                    </div>
                  ))}
                  <button onClick={()=>setOpenId(proxima.id)} style={{width:"100%",marginTop:12,background:C.accent,color:"#000",border:"none",borderRadius:12,padding:14,fontSize:16,fontWeight:800,cursor:"pointer"}}>
                    {prog(proxima).d>0?"Continuar entrenamiento":"Empezar entrenamiento"}
                  </button>
                </div>
              )}
              {semanaHoy&&!proxima&&(
                <div style={{background:C.card,border:`1px solid ${C.green}`,borderRadius:16,padding:20,textAlign:"center"}}>
                  <div style={{fontSize:28}}>💪</div>
                  <div style={{fontWeight:800,color:"#fff",fontSize:18}}>¡{semanaHoy.semana} completada!</div>
                  <div style={{color:C.muted,fontSize:13,marginTop:4}}>Cuando el entrenador publique la siguiente semana, te avisaremos aquí.</div>
                </div>
              )}
              {semanaHoy&&sesionesHoy.length>0&&(
                <>
                  <div style={{color:C.muted,fontSize:11,margin:"16px 0 6px",letterSpacing:1}}>ESTA SEMANA</div>
                  <div style={{display:"flex",gap:8}}>
                    {sesionesHoy.map((s,i)=>{const ok=hecha(s.id),cur=proxima&&proxima.id===s.id;return (
                      <button key={s.id} onClick={()=>setOpenId(s.id)} aria-label={s.dia}
                        style={{flex:1,padding:"10px 0",borderRadius:10,border:`1px solid ${cur?C.accent:C.border}`,background:ok?"#1d2a22":C.card,color:ok?C.green:(cur?C.accent:C.muted),cursor:"pointer",fontWeight:700}}>
                        {ok?"✓":`${i+1}º`}
                      </button>);})}
                  </div>
                </>
              )}
            </div>
          )}

          {tab==="sem"&&(
            <div>
              {meses.length>0&&(
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",gap:8,overflowX:"auto",alignItems:"center"}}>
                    {visibles.map(m=><button key={m} onClick={()=>setMesSel(m)} style={pill(mes===m)}>{m}</button>)}
                    {archivo.length>0&&<button onClick={()=>setShowArchivo(v=>!v)} aria-pressed={showArchivo||mesEnArchivo} style={{...pill(false),border:`1px dashed ${C.border}`,marginLeft:"auto"}}>📁 Archivo ({archivo.length}) {(showArchivo||mesEnArchivo)?"▴":"▾"}</button>}
                  </div>
                  {archivo.length>0&&(showArchivo||mesEnArchivo)&&(
                    <div style={{display:"flex",gap:8,overflowX:"auto",marginTop:8}}>{archivo.map(m=><button key={m} onClick={()=>setMesSel(m)} style={pill(mes===m)}>{m}</button>)}</div>
                  )}
                </div>
              )}
              {weeksMes.map(w=>{
                const ss=sessions.filter(s=>s.week_id===w.id); if(!ss.length) return null;
                const open=isOpen(w), n=ss.filter(s=>hecha(s.id)).length;
                return (
                  <div key={w.id} style={{marginBottom:14}}>
                    <button onClick={()=>setOpenWeeks(o=>({...o,[w.id]:!open}))} aria-expanded={open}
                      style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0 0 8px",marginBottom:open?10:0,cursor:"pointer"}}>
                      <span style={{color:C.accent,fontSize:17,fontWeight:900}}>{w.semana}{w.id===defaultWeekId&&<span style={{background:C.accent,color:"#000",fontSize:10,padding:"2px 8px",borderRadius:20,marginLeft:8}}>ACTUAL</span>}</span>
                      <span style={{color:C.muted,fontSize:12}}>{n}/{ss.length} · {open?"▲":"▼"}</span>
                    </button>
                    {open&&ss.map(sessionRow)}
                  </div>
                );
              })}
              {weeksMes.length===0&&<div style={{textAlign:"center",color:C.muted,marginTop:40}}>No hay semanas en este mes.</div>}
            </div>
          )}

          {tab==="pr"&&<PRPanel prs={prs} onChange={onUpdatePR} history={history} extras={extras}/>}
        </div>
      )}

      {!openSession&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#000",borderTop:`1px solid ${C.border}`,display:"flex",maxWidth:560,margin:"0 auto",paddingBottom:"env(safe-area-inset-bottom)"}}>
          {navItem("hoy","🏠","Hoy")}{navItem("sem","📅","Semanas")}{navItem("pr","🏆","Mis PRs")}
        </div>
      )}
    </div>
  );
}
