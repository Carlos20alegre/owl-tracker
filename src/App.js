import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { C, EJERCICIOS, TRAINER_EMAILS, parseSeries, ejPrKg, pickCurrentMonth, pickCurrentWeekId } from "./lib";
import WeekForm from "./WeekEditor";
import AthleteApp, { PRPanel } from "./Athlete";

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
        const {error:e2} = await supabase.auth.signInWithPassword({email,password});
        if (e2) { alert("Cuenta creada. Ya puedes iniciar sesión."); setMode("login"); }
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

// ── TRAINER PANEL ─────────────────────────────────────────────
function TrainerPanel({ weeks, sessions, athletes, onRefresh, allWeeks }) {
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
          {showForm && <WeekForm allWeeks={allWeeks} allSessions={sessions} onSave={()=>{setShowForm(false);onRefresh();}} onCancel={()=>setShowForm(false)}/>}

          {weeks.map(week=>{
            const wSessions=sessions.filter(s=>s.week_id===week.id);
            if (editingWeek?.id===week.id) {
              const initial={...week,dias:wSessions.map(s=>({id:s.id,dia:s.dia,ejercicios:s.ejercicios}))};
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
  if (ej.tipo==="libre") return <div style={{padding:"6px 0",color:"#94a3b8",fontSize:13,fontStyle:"italic"}}>• {ej.nombre}{ej.detalle?` · ${ej.detalle}`:""}</div>;
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
            {s.series>1?`${s.series}× `:""}
            {String(s.reps).includes("+")
              ? String(s.reps).split("+").map((r,ri)=>(
                  <span key={ri}>
                    {ri>0&&<span style={{color:C.muted}}> + </span>}
                    <b style={{color:C.text}}>{r}</b>
                    <span style={{color:C.muted,fontSize:10}}> ({ej.codigos[ri]??"rep"})</span>
                  </span>
                ))
              : <span>{s.reps}<span style={{color:C.muted,fontSize:10}}>r</span></span>}
            {" · "}<span style={{color:C.muted,fontSize:11}}>{s.pct}%</span> <b style={{color:C.accent}}>{s.kg}kg</b>
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

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [extras, setExtras] = useState([]);
  const [history, setHistory] = useState([]);
  const [prs, setPrs] = useState({arrancada:0,dostiempos:0,squat:0,squatf:0});
  const [mesSel, setMesSel] = useState(null);
  const [showArchivo, setShowArchivo] = useState(false);
  const [tab, setTab] = useState("todas");
  const [openWeeks, setOpenWeeks] = useState({});
  const [newWeeks, setNewWeeks] = useState([]);

  const isTrainer = TRAINER_EMAILS.includes((session?.user?.email||"").toLowerCase());

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(session) loadAll(); },[session]);

  const loadAll = async () => {
    const uid=session.user.id;
    const [{data:w},{data:s},{data:l},{data:ex},{data:hi}]=await Promise.all([
      supabase.from("weeks").select("*").order("created_at"),
      supabase.from("sessions").select("*"),
      supabase.from("athlete_logs").select("*").eq("user_id",uid),
      supabase.from("athlete_extras").select("*").eq("user_id",uid).order("created_at"),
      supabase.from("pr_history").select("*").eq("user_id",uid).order("created_at"),
    ]);
    const orden=(a,b)=>String(a.dia).localeCompare(String(b.dia),"es",{numeric:true});
    setWeeks(w||[]); setSessions([...(s||[])].sort(orden)); setLogs(l||[]); setExtras(ex||[]); setHistory(hi||[]);
    if (l?.length>0) {
  const prRow = l.find(x => !x.session_id) || l[0];
  setPrs({
    arrancada: prRow.pr_arrancada||0,
    dostiempos: prRow.pr_dostiempos||0,
    squat: prRow.pr_squat||0,
    squatf: prRow.pr_squatf||0
  });
}
    setMesSel(prev => (prev && (w||[]).some(x=>x.mes===prev)) ? prev : pickCurrentMonth(w||[]));

    if (!isTrainer) {
      const key = `owl_seen_weeks_${session.user.id}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) {
          // Primera vez en este dispositivo: lo ya publicado no cuenta como "nuevo"
          localStorage.setItem(key, JSON.stringify((w||[]).map(x=>x.id)));
          setNewWeeks([]);
        } else {
          const seen = JSON.parse(raw);
          setNewWeeks((w||[]).filter(x=>!seen.includes(x.id)));
        }
      } catch { setNewWeeks([]); }
    }

    if (isTrainer) {
      const {data:users}=await supabase.rpc("get_users");
      if (users) setAthletes(users.filter(u=>!TRAINER_EMAILS.includes((u.email||"").toLowerCase())));
    }
  };

  const toggleSession = async (sessionId) => {
    const existing=logs.find(l=>l.session_id===sessionId);
    const newVal=!(existing?.completado||false);
    if (existing) {
      await supabase.from("athlete_logs").update({completado:newVal}).eq("id",existing.id);
    } else {
      await supabase.from("athlete_logs").insert({user_id:session.user.id,session_id:sessionId,completado:newVal,pr_arrancada:prs.arrancada,pr_dostiempos:prs.dostiempos,pr_squat:prs.squat,pr_squatf:prs.squatf});
    }
    loadAll();
  };

  const updatePR = async (key,val) => {
    const newPrs={...prs,[key]:val};
    if (prs[key]!==val) {
      supabase.from("pr_history").insert({user_id:session.user.id,clave:key,valor:val}).then(()=>{});
    }
    setPrs(newPrs);
    const existing=logs.find(l=>!l.session_id);
    if (existing) {
      await supabase.from("athlete_logs").update({[`pr_${key}`]:val}).eq("id",existing.id);
    } else {
      await supabase.from("athlete_logs").insert({user_id:session.user.id,session_id:null,pr_arrancada:newPrs.arrancada,pr_dostiempos:newPrs.dostiempos,pr_squat:newPrs.squat,pr_squatf:newPrs.squatf});
    }
    loadAll();
  };

  const saveSets = async (sessionId, sets, completado) => {
    const uid=session.user.id;
    const existing=logs.find(l=>l.session_id===sessionId);
    if (existing) {
      setLogs(ls=>ls.map(l=>l.id===existing.id?{...l,sets,completado}:l));
      const {error}=await supabase.from("athlete_logs").update({sets,completado}).eq("id",existing.id);
      if (error) { alert("No se pudo guardar la serie: "+error.message); loadAll(); }
    } else {
      const {data,error}=await supabase.from("athlete_logs").insert({user_id:uid,session_id:sessionId,sets,completado,pr_arrancada:prs.arrancada,pr_dostiempos:prs.dostiempos,pr_squat:prs.squat,pr_squatf:prs.squatf}).select().single();
      if (error) { alert("No se pudo guardar la serie: "+error.message); return; }
      setLogs(ls=>[...ls,data]);
    }
  };
  const addExtra = async (row) => {
    const {data,error}=await supabase.from("athlete_extras").insert({...row,user_id:session.user.id}).select().single();
    if (error) { alert("No se pudo guardar el ejercicio: "+error.message); return; }
    setExtras(es=>[...es,data]);
  };
  const delExtra = async (id) => {
    setExtras(es=>es.filter(x=>x.id!==id));
    const {error}=await supabase.from("athlete_extras").delete().eq("id",id);
    if (error) loadAll();
  };

  const meses=useMemo(()=>[...new Set(weeks.map(w=>w.mes))],[weeks]);
  const weeksMes=useMemo(()=>weeks.filter(w=>w.mes===mesSel),[weeks,mesSel]);

  // Se fija al cargar o cambiar de mes; no depende de `logs` para que no se mueva al marcar sesiones.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultWeekId=useMemo(()=>pickCurrentWeekId(weeksMes,sessions,logs,isTrainer),[mesSel,weeks.length,sessions.length,isTrainer]);
  const isWeekOpen=(week)=>openWeeks[week.id] ?? (week.id===defaultWeekId);
  const toggleWeek=(week)=>setOpenWeeks(o=>({...o,[week.id]:!isWeekOpen(week)}));

  const markSeen=()=>{
    try { localStorage.setItem(`owl_seen_weeks_${session.user.id}`, JSON.stringify(weeks.map(x=>x.id))); } catch {}
    setNewWeeks([]);
  };
  const goToNewWeek=()=>{
    const last=newWeeks[newWeeks.length-1];
    if (last) { setMesSel(last.mes); setTab("todas"); setOpenWeeks(o=>({...o,[last.id]:true})); }
    markSeen();
  };

  useEffect(()=>{
    const n=newWeeks.length;
    document.title=n>0?`(${n}) OWL Lifting`:"OWL Lifting";
    try {
      if (n>0) Promise.resolve(navigator.setAppBadge?.(n)).catch(()=>{});
      else Promise.resolve(navigator.clearAppBadge?.()).catch(()=>{});
    } catch {}
  },[newWeeks]);

  const mesActual=useMemo(()=>pickCurrentMonth(weeks),[weeks]);
  const idxActual=meses.indexOf(mesActual);
  const mesesVisibles=idxActual<0?meses:meses.slice(idxActual);
  const mesesArchivo=idxActual<0?[]:meses.slice(0,idxActual);
  const mesEnArchivo=mesesArchivo.includes(mesSel);

  const tabBtn=(t,label)=>(
    <button onClick={()=>setTab(t)} style={{background:tab===t?C.accent:C.card,border:`1px solid ${C.border}`,color:tab===t?"#000":"#9ca3af",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>
      {label}
    </button>
  );

  if (loading) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontSize:18,fontWeight:700}}>Cargando...</div>;
  if (!session) return <AuthScreen/>;

  if (!isTrainer) return (
    <AthleteApp userName={session.user.user_metadata?.full_name||session.user.email}
      weeks={weeks} sessions={sessions} logs={logs} prs={prs} extras={extras} history={history} newWeeks={newWeeks}
      onSeen={markSeen} onSignOut={()=>supabase.auth.signOut()}
      onToggleSession={toggleSession} onSets={saveSets} onUpdatePR={updatePR} onAddExtra={addExtra} onDelExtra={delExtra}/>
  );

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

      {!isTrainer&&newWeeks.length>0&&(
        <div style={{background:C.accent,color:"#000",padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <span style={{fontWeight:800,fontSize:14}}>
            🆕 {newWeeks.length===1?"Nueva semana publicada":`${newWeeks.length} semanas nuevas`}: {newWeeks.map(x=>`${x.semana} (${x.mes})`).join(" · ")}
          </span>
          <span style={{display:"flex",gap:8}}>
            <button onClick={goToNewWeek} style={{background:"#000",color:C.accent,border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer"}}>Ver</button>
            <button onClick={markSeen} aria-label="Descartar" style={{background:"none",color:"#000",border:"1px solid #000",borderRadius:6,padding:"6px 10px",fontSize:12,fontWeight:800,cursor:"pointer"}}>✕</button>
          </span>
        </div>
      )}

      {meses.length>0&&(
        <div style={{background:"#000",borderBottom:`1px solid ${C.border}`,padding:"8px 24px"}}>
          <div style={{display:"flex",gap:8,overflowX:"auto",alignItems:"center"}}>
            {mesesVisibles.map(m=>(
              <button key={m} onClick={()=>setMesSel(m)} style={{background:mesSel===m?C.accent:"none",border:`1px solid ${mesSel===m?C.accent:C.border}`,color:mesSel===m?"#000":C.muted,padding:"6px 18px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{m}</button>
            ))}
            {mesesArchivo.length>0&&(
              <button onClick={()=>setShowArchivo(v=>!v)} aria-pressed={showArchivo||mesEnArchivo} style={{background:"none",border:`1px dashed ${C.border}`,color:C.muted,padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap",marginLeft:"auto"}}>
                📁 Archivo ({mesesArchivo.length}) {(showArchivo||mesEnArchivo)?"▴":"▾"}
              </button>
            )}
          </div>
          {mesesArchivo.length>0&&(showArchivo||mesEnArchivo)&&(
            <div style={{display:"flex",gap:8,overflowX:"auto",marginTop:8}}>
              {mesesArchivo.map(m=>(
                <button key={m} onClick={()=>setMesSel(m)} style={{background:mesSel===m?C.accent:"none",border:`1px solid ${mesSel===m?C.accent:C.border}`,color:mesSel===m?"#000":C.muted,padding:"6px 18px",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{m}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{display:"flex",gap:8,padding:"0 24px 16px",flexWrap:"wrap"}}>
        {tabBtn("todas","📋 Todas")}
        {tabBtn("completadas","✅ Completadas")}
        {tabBtn("pendientes","⏳ Pendientes")}
        {tabBtn("prs","🏆 Mis PRs")}
      </div>

      <div style={{padding:"0 24px 32px"}}>
        {isTrainer&&tab!=="prs"&&<TrainerPanel weeks={weeksMes} allWeeks={weeks} sessions={sessions} athletes={athletes} onRefresh={loadAll}/>}
        {tab==="prs"?(
          <PRPanel prs={prs} onChange={updatePR} history={history} extras={extras}/>
        ):(
          weeksMes.map(week=>{
            const wSessions=sessions.filter(s=>s.week_id===week.id)
              .filter(s=>tab==="todas"||(tab==="completadas"?logs.find(l=>l.session_id===s.id&&l.completado):!logs.find(l=>l.session_id===s.id&&l.completado)));
            if (!wSessions.length) return null;
            const allW=sessions.filter(s=>s.week_id===week.id);
            const doneN=allW.filter(s=>logs.some(l=>l.session_id===s.id&&l.completado)).length;
            const open=isWeekOpen(week);
            const isCurrent=week.id===defaultWeekId;
            return (
              <div key={week.id} style={{marginBottom:open?28:14}}>
                <button onClick={()=>toggleWeek(week)} aria-expanded={open}
                  style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"none",border:"none",borderBottom:`1px solid ${C.border}`,padding:"0 0 8px",marginBottom:open?12:0,cursor:"pointer",textAlign:"left"}}>
                  <span style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{color:C.accent,fontSize:18,fontWeight:900}}>{week.semana}</span>
                    {isCurrent&&<span style={{background:C.accent,color:"#000",fontSize:10,fontWeight:900,letterSpacing:1,padding:"2px 8px",borderRadius:20}}>{isTrainer?"ÚLTIMA":"ACTUAL"}</span>}
                  </span>
                  <span style={{color:C.muted,fontSize:12,whiteSpace:"nowrap"}}>{doneN}/{allW.length} · {open?"▲":"▼"}</span>
                </button>
                {open&&wSessions.map(s=>(
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