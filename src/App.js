import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { C, TRAINER_EMAILS } from "./lib";
import AthleteApp from "./Athlete";
import TrainerApp from "./Trainer";

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

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [extras, setExtras] = useState([]);
  const [history, setHistory] = useState([]);
  const [prs, setPrs] = useState({arrancada:0,dostiempos:0,squat:0,squatf:0});
  const [newWeeks, setNewWeeks] = useState([]);
  const [viewAsAthlete, setViewAsAthleteState] = useState(false);
  const setViewAsAthlete = (v) => { setViewAsAthleteState(v); try { localStorage.setItem("owl_mode", v?"athlete":"trainer"); } catch {} };

  const isTrainer = TRAINER_EMAILS.includes((session?.user?.email||"").toLowerCase());

  useEffect(()=>{
    try { if (localStorage.getItem("owl_mode")==="athlete") setViewAsAthleteState(true); } catch {}
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
      setPrs({arrancada:prRow.pr_arrancada||0, dostiempos:prRow.pr_dostiempos||0, squat:prRow.pr_squat||0, squatf:prRow.pr_squatf||0});
    }

    if (!isTrainer) {
      const key = `owl_seen_weeks_${uid}`;
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
    } else {
      const [{data:users},{data:todos}]=await Promise.all([
        supabase.rpc("get_users"),
        supabase.from("athlete_logs").select("*"),
      ]);
      if (users) setAthletes(users.filter(u=>!TRAINER_EMAILS.includes((u.email||"").toLowerCase())));
      setAllLogs(todos||[]);
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

  const markSeen=()=>{
    try { localStorage.setItem(`owl_seen_weeks_${session.user.id}`, JSON.stringify(weeks.map(x=>x.id))); } catch {}
    setNewWeeks([]);
  };

  useEffect(()=>{
    const n=newWeeks.length;
    document.title=n>0?`(${n}) OWL Lifting`:"OWL Lifting";
    try {
      if (n>0) Promise.resolve(navigator.setAppBadge?.(n)).catch(()=>{});
      else Promise.resolve(navigator.clearAppBadge?.()).catch(()=>{});
    } catch {}
  },[newWeeks]);

  if (loading) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontSize:18,fontWeight:700}}>Cargando...</div>;
  if (!session) return <AuthScreen/>;

  const userName=session.user.user_metadata?.full_name||session.user.email;
  const signOut=()=>supabase.auth.signOut();

  if (isTrainer && !viewAsAthlete) return (
    <TrainerApp userName={userName} weeks={weeks} sessions={sessions} athletes={athletes} allLogs={allLogs}
      prs={prs} history={history} extras={extras}
      onRefresh={loadAll} onSignOut={signOut} onUpdatePR={updatePR} onViewAsAthlete={()=>setViewAsAthlete(true)}/>
  );

  return (
    <AthleteApp userName={userName}
      weeks={weeks} sessions={sessions} logs={logs} prs={prs} extras={extras} history={history} newWeeks={isTrainer?[]:newWeeks}
      onSeen={markSeen} onSignOut={signOut} onBackToTrainer={isTrainer?()=>setViewAsAthlete(false):null}
      onToggleSession={toggleSession} onSets={saveSets} onUpdatePR={updatePR} onAddExtra={addExtra} onDelExtra={delExtra}/>
  );
}
