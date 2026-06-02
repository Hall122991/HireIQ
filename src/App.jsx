import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "https://hireiq-api.onrender.com";

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"analyzer",  icon:"📄", label:"Resume Analyzer" },
  { id:"bulk",      icon:"📦", label:"Bulk Upload" },
  { id:"ranking",   icon:"⭐", label:"AI Ranking" },
  { id:"matcher",   icon:"🎯", label:"JD Matcher" },
  { id:"followups", icon:"🔁", label:"Auto Follow-Ups" },
  { id:"reports",   icon:"📋", label:"Hiring Reports" },
  { id:"jd",        icon:"✍️",  label:"JD Writer" },
  { id:"outreach",  icon:"📧", label:"Outreach" },
  { id:"screening", icon:"🔍", label:"Screening" },
  { id:"ats",       icon:"🔗", label:"ATS Sync" },
  { id:"team",      icon:"👥", label:"Team" },
  { id:"analytics", icon:"📊", label:"Analytics" },
];

// ─── Prompts ──────────────────────────────────────────────────────────────────
const PROMPTS = {
  resume:`You are an elite talent acquisition specialist. Given resume text, return ONLY valid JSON:
{"name":"...","title":"...","experience_years":N,"top_skills":["s1","s2","s3","s4","s5"],"education":"...","strengths":["s1","s2","s3"],"red_flags":[],"fit_score":N,"summary":"2-sentence summary.","recommendation":"Strong Hire|Hire|Maybe|Pass"}
ONLY JSON.`,
  jd:`You are a world-class talent brand strategist. Return ONLY valid JSON:
{"title":"...","tagline":"...","about_company":"...","role_overview":"...","responsibilities":["r1","r2","r3","r4","r5"],"requirements":["r1","r2","r3","r4"],"nice_to_have":["n1","n2","n3"],"what_we_offer":["b1","b2","b3","b4"],"salary_range":"..."}
ONLY JSON.`,
  outreach:`You are an elite recruiter. Return ONLY valid JSON:
{"subject":"...","email_1":{"label":"Initial Outreach","body":"..."},"email_2":{"label":"Follow-up (Day 5)","body":"..."},"email_3":{"label":"Final Nudge (Day 12)","body":"..."},"linkedin_message":"under 300 chars"}
ONLY JSON.`,
  screening:`You are a senior technical recruiter. Return ONLY valid JSON:
{"screening_questions":[{"question":"...","what_to_listen_for":"..."}],"disqualifiers":["d1","d2","d3"],"green_flags":["g1","g2","g3"],"scorecard":[{"criteria":"...","weight":"High|Medium|Low"}],"time_to_hire_tip":"..."}
ONLY JSON.`,
  ranking:`You are a world-class head of talent. Rank candidates and return ONLY valid JSON:
{"role_summary":"...","top_10":[{"rank":1,"name":"...","score":N,"tier":"S-Tier|A-Tier|B-Tier|C-Tier","why_ranked_here":"...","immediate_action":"Call today|Schedule this week|Keep warm|Archive","differentiator":"..."}],"hiring_insight":"...","recommended_next_step":"..."}
ONLY JSON.`,
  followup:`You are an expert recruiting coordinator. Return ONLY valid JSON:
{"candidate":"...","role":"...","stage":"...","sequences":[{"trigger":"...","subject":"...","body":"...","channel":"Email|SMS|LinkedIn","tone":"Warm|Professional|Urgent"}],"nurture_tip":"...","dropout_risk":"Low|Medium|High","dropout_reason":"..."}
ONLY JSON.`,
  report:`You are a data-driven HR analytics expert. Return ONLY valid JSON:
{"report_title":"...","period":"...","executive_summary":"3 sentences","metrics":{"time_to_hire_days":N,"time_to_hire_trend":"improving|stable|worsening","candidates_screened":N,"interview_conversion_rate":"X%","offer_acceptance_rate":"X%","source_performance":[{"source":"LinkedIn","candidates":N,"hires":N,"conversion":"X%"},{"source":"Referral","candidates":N,"hires":N,"conversion":"X%"},{"source":"Indeed","candidates":N,"hires":N,"conversion":"X%"},{"source":"Agency","candidates":N,"hires":N,"conversion":"X%"}]},"highlights":["h1","h2"],"risks":["r1","r2"],"recommendations":[{"action":"...","impact":"High|Medium|Low","effort":"High|Medium|Low"}],"next_30_days":"..."}
ONLY JSON.`,
  matcher:`You are an elite technical recruiter. Match resumes to a JD and return ONLY a JSON array:
[{"name":"...","match_score":N,"match_grade":"Excellent|Strong|Good|Weak|Poor","matched_requirements":["r1"],"missing_requirements":["r1"],"standout_strengths":["s1"],"concerns":[],"interview_priority":"Fast-track|Schedule|Maybe|Skip","one_liner":"..."}]
ONLY JSON array.`,
};

// ─── API helpers ──────────────────────────────────────────────────────────────
async function callAI(token, systemKey, prompt) {
  const res = await fetch(`${API}/api/ai`, {
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body: JSON.stringify({ system: PROMPTS[systemKey], prompt })
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return { parsed: JSON.parse(data.result.replace(/```json|```/g,"").trim()), credits: data.credits };
}

async function apiPost(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method:"POST",
    headers:{"Content-Type":"application/json", ...(token?{"Authorization":`Bearer ${token}`}:{})},
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Card({children,style,onClick}){return <div onClick={onClick} style={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:12,padding:"18px 20px",marginBottom:14,cursor:onClick?"pointer":"default",...style}}>{children}</div>}
function Label({children,style}){return <div style={{fontSize:10,color:"#555",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,...style}}>{children}</div>}
function Badge({children,color="#6366f1"}){return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:color+"22",color,border:`1px solid ${color}44`}}>{children}</span>}
function Spinner({text}){return <div style={{textAlign:"center",padding:"40px 0"}}><div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:10}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#6366f1",animation:"pulse 1.4s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>{text&&<div style={{color:"#555",fontSize:12}}>{text}</div>}</div>}
function ErrorBox({msg,onUpgrade}){
  const isCredits = msg?.includes?.("credits") || msg?.error === "out_of_credits";
  return (
    <div style={{padding:14,background:isCredits?"#0a1a0a":"#1a0a0a",border:`1px solid ${isCredits?"#1a3a1a":"#3a1a1a"}`,borderRadius:10,marginBottom:16}}>
      <div style={{color:isCredits?"#86efac":"#f87171",fontSize:13,marginBottom:isCredits?8:0}}>{isCredits?"You've used all your free credits.":msg}</div>
      {isCredits&&onUpgrade&&<button onClick={onUpgrade} style={{padding:"6px 16px",borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>Upgrade to Pro →</button>}
    </div>
  );
}
function PanelHeader({title,subtitle}){return <div style={{marginBottom:24}}><h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>{title}</h1><p style={{color:"#555",fontSize:13,marginTop:4}}>{subtitle}</p></div>}
function RunButton({onClick,disabled,loading,label}){return <button onClick={onClick} disabled={disabled} style={{padding:"11px 26px",borderRadius:10,fontSize:13,fontWeight:600,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:disabled?"not-allowed":"pointer",marginBottom:24,opacity:disabled?0.5:1,boxShadow:disabled?"none":"0 4px 20px rgba(99,102,241,0.3)"}}>{loading?"⟳ Running...":`⚡ ${label}`}</button>}
function ScoreRing({score,color="#6366f1"}){return <div style={{position:"relative",width:68,height:68,flexShrink:0}}><svg width="68" height="68" viewBox="0 0 68 68" style={{transform:"rotate(-90deg)"}}><circle cx="34" cy="34" r="28" fill="none" stroke="#1e1e35" strokeWidth="5"/><circle cx="34" cy="34" r="28" fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${(score||0)*1.759} 175.9`} strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>{score}</div></div>}
const TA = {width:"100%",background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:10,padding:"14px 16px",color:"#ccc",fontSize:13,lineHeight:1.7,resize:"vertical",marginBottom:14,fontFamily:"inherit",outline:"none"};
const SB = {padding:"5px 12px",borderRadius:7,background:"#141420",border:"1px solid #1e1e35",color:"#888",fontSize:11,cursor:"pointer",fontFamily:"inherit"};
const prose = {color:"#ccc",fontSize:13,lineHeight:1.7};

// ─── Pricing Modal ────────────────────────────────────────────────────────────
function PricingModal({token,onClose}){
  const [loading,setLoading]=useState(null);
  async function checkout(plan){
    setLoading(plan);
    try{const{url}=await apiPost("/api/checkout",{plan},token);window.location.href=url;}
    catch(e){alert(e.message||"Checkout failed");setLoading(null);}
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:20,padding:40,maxWidth:700,width:"100%",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:20}}>✕</button>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:"#fff"}}>Upgrade HireIQ</div>
          <div style={{color:"#555",fontSize:14,marginTop:6}}>You've used your free credits. Unlock unlimited access.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[
            {id:"pro",name:"Pro",price:"$49/mo",color:"#6366f1",features:["Unlimited AI calls","All 12 modules","Resume analyzer & ranking","JD matching & outreach","Hiring reports","Priority support"]},
            {id:"agency",name:"Agency",price:"$149/mo",color:"#f59e0b",badge:"Most Popular",features:["Everything in Pro","5 team seats","White-label reports","API access","Bulk upload (100+ resumes)","Dedicated support"]},
          ].map(p=>(
            <div key={p.id} style={{border:`1px solid ${p.color}44`,borderRadius:14,padding:24,position:"relative"}}>
              {p.badge&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:p.color,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:20}}>{p.badge}</div>}
              <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{p.name}</div>
              <div style={{fontSize:28,fontWeight:800,color:p.color,margin:"8px 0"}}>{p.price}</div>
              <div style={{marginBottom:20}}>{p.features.map((f,i)=><div key={i} style={{fontSize:13,color:"#888",padding:"3px 0"}}>✓ {f}</div>)}</div>
              <button onClick={()=>checkout(p.id)} disabled={loading===p.id} style={{width:"100%",padding:"11px",borderRadius:10,background:`linear-gradient(135deg,${p.color},${p.color}cc)`,color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontSize:14,opacity:loading===p.id?0.6:1}}>
                {loading===p.id?"Redirecting...":"Get Started →"}
              </button>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#444"}}>Powered by Stripe · Cancel anytime · No hidden fees</div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function login(){
    if(!email.includes("@"))return setError("Enter a valid email.");
    setLoading(true);setError("");
    try{
      const data=await apiPost("/api/auth/login",{email});
      onLogin(data.token,data.user);
    }catch(e){setError(e.error||"Login failed.");}
    finally{setLoading(false);}
  }
  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div style={{width:"100%",maxWidth:440,padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 20px"}}>⚡</div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:34,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>HireIQ <span style={{color:"#6366f1"}}>Agent</span></h1>
          <p style={{color:"#555",fontSize:15,marginTop:8}}>AI-powered recruiting automation</p>
        </div>
        <div style={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:16,padding:32}}>
          <Label>Enter your email to get started</Label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="you@company.com" style={{...TA,marginBottom:8,padding:"12px 16px",borderRadius:10,fontSize:14}}/>
          <div style={{fontSize:11,color:"#444",marginBottom:16}}>Free plan includes 10 AI calls · No credit card required</div>
          {error&&<div style={{color:"#f87171",fontSize:13,marginBottom:12}}>{error}</div>}
          <button onClick={login} disabled={loading||!email.includes("@")} style={{width:"100%",padding:13,borderRadius:10,fontSize:14,fontWeight:700,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:loading||!email.includes("@")?"not-allowed":"pointer",opacity:loading||!email.includes("@")?0.5:1}}>
            {loading?"Signing in...":"Get Started Free →"}
          </button>
          <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid #1a1a2e",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {["📄 Resume Scoring","⭐ AI Ranking","🎯 JD Matching","🔁 Follow-Ups","📋 Hiring Reports","📊 Analytics"].map(f=><div key={f} style={{fontSize:11,color:"#666",padding:"6px 10px",background:"#080810",borderRadius:8,border:"1px solid #1a1a2e"}}>{f}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────
function useAI(token, onUpgrade) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  async function run(promptKey, prompt, onSuccess) {
    setLoading(true);setError(null);
    try{
      const{parsed,credits}=await callAI(token,promptKey,prompt);
      onSuccess(parsed,credits);
    }catch(e){
      if(e.status===402||e.error==="out_of_credits"){setError({message:e.message,upgrade:true});}
      else setError({message:e.error||e.message||"Request failed."});
    }finally{setLoading(false);}
  }
  const ErrComponent = error ? <ErrorBox msg={error.message} onUpgrade={error.upgrade?onUpgrade:null}/> : null;
  return {loading,ErrComponent,run};
}

function ResumeAnalyzer({token,onAnalyzed,onUpgrade}){
  const [input,setInput]=useState("");const [result,setResult]=useState(null);
  const {loading,ErrComponent,run}=useAI(token,onUpgrade);
  const recColor={"Strong Hire":"#22c55e","Hire":"#84cc16","Maybe":"#f59e0b","Pass":"#ef4444"};
  return <div>
    <PanelHeader title="Resume Analyzer" subtitle="Paste any resume for instant AI scoring and extraction"/>
    <textarea value={input} onChange={e=>setInput(e.target.value)} rows={8} placeholder={"Paste resume here...\n\nExample:\nJane Smith — Senior PM at Stripe (4 yrs)\nPrev: Google, LinkedIn | MBA Wharton\nSkills: Product strategy, SQL, A/B testing"} style={TA}/>
    <RunButton onClick={()=>run("resume",input,r=>{setResult(r);onAnalyzed(r);})} disabled={loading||!input.trim()} loading={loading} label="Analyze Resume"/>
    {loading&&<Spinner text="Analyzing resume..."/>}{ErrComponent}
    {result&&!loading&&<div style={{animation:"fadeUp 0.4s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card><Label>Candidate</Label><div style={{fontSize:18,fontWeight:700,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{result.name}</div><div style={{color:"#888",fontSize:13,marginTop:4}}>{result.title}</div><div style={{color:"#555",fontSize:12,marginTop:3}}>{result.experience_years} yrs · {result.education}</div></Card>
        <Card style={{display:"flex",alignItems:"center",gap:16}}><ScoreRing score={result.fit_score} color={recColor[result.recommendation]||"#6366f1"}/><div><Label>AI Fit Score</Label><div style={{fontSize:15,fontWeight:700,color:recColor[result.recommendation]||"#fff"}}>{result.recommendation}</div></div></Card>
      </div>
      <Card><Label>Summary</Label><div style={prose}>{result.summary}</div></Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card><Label>Top Skills</Label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{result.top_skills?.map((s,i)=><Badge key={i} color="#6366f1">{s}</Badge>)}</div></Card>
        <Card><Label>Strengths</Label>{result.strengths?.map((s,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>✓ {s}</div>)}</Card>
      </div>
      {result.red_flags?.length>0&&<Card style={{borderColor:"#3a1a1a"}}><Label>Red Flags</Label>{result.red_flags.map((f,i)=><div key={i} style={{fontSize:13,color:"#f87171"}}>⚠ {f}</div>)}</Card>}
    </div>}
  </div>;
}

function BulkUpload({token,onAnalyzed,onUpgrade}){
  const [files,setFiles]=useState([]);const [processing,setProcessing]=useState(false);
  const [results,setResults]=useState([]);const [progress,setProgress]=useState(0);
  const [dragging,setDragging]=useState(false);const fileInputRef=useRef(null);
  const recColor={"Strong Hire":"#22c55e","Hire":"#84cc16","Maybe":"#f59e0b","Pass":"#ef4444"};
  const statusColor={queued:"#555",analyzing:"#6366f1",done:"#22c55e",error:"#ef4444"};
  function addFiles(newFiles){setFiles(p=>[...p,...Array.from(newFiles).map((f,i)=>({id:Date.now()+i,name:f.name,file:f,size:(f.size/1024).toFixed(1)+"KB",status:"queued"}))]);}
  async function processAll(){
    const q=files.filter(f=>f.status==="queued");if(!q.length)return;
    setProcessing(true);setProgress(0);
    for(let i=0;i<q.length;i++){
      const fid=q[i].id;setFiles(p=>p.map(f=>f.id===fid?{...f,status:"analyzing"}:f));
      try{
        const text=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=()=>rej();r.readAsText(q[i].file);});
        const{parsed}=await callAI(token,"resume",text||q[i].name);
        setFiles(p=>p.map(f=>f.id===fid?{...f,status:"done"}:f));
        setResults(p=>[...p,{...parsed,fileName:q[i].name}]);onAnalyzed(parsed);
      }catch(e){
        setFiles(p=>p.map(f=>f.id===fid?{...f,status:"error"}:f));
        if(e.status===402){setProcessing(false);onUpgrade();return;}
      }
      setProgress(Math.round(((i+1)/q.length)*100));
    }
    setProcessing(false);
  }
  return <div>
    <PanelHeader title="Bulk Resume Upload" subtitle="Drop up to 100 resumes — AI analyzes and ranks them all"/>
    <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}} onClick={()=>fileInputRef.current?.click()} style={{border:`2px dashed ${dragging?"#6366f1":"#1e1e35"}`,borderRadius:14,padding:"40px 24px",textAlign:"center",cursor:"pointer",marginBottom:20,background:dragging?"#0f0f2a":"#09090f"}}>
      <div style={{fontSize:36,marginBottom:10}}>📂</div>
      <div style={{color:"#ccc",fontSize:14,fontWeight:500}}>Drag & drop resumes here</div>
      <div style={{color:"#555",fontSize:12,marginTop:4}}>TXT · PDF · DOC · up to 100 files</div>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
    </div>
    {files.length>0&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{color:"#888",fontSize:13}}>{files.length} file{files.length!==1?"s":""} queued</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setFiles([]);setResults([]);setProgress(0);}} style={{...SB,color:"#f87171",borderColor:"#3a1a1a"}}>Clear</button>
          <button onClick={processAll} disabled={processing||!files.some(f=>f.status==="queued")} style={{...SB,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",opacity:(processing||!files.some(f=>f.status==="queued"))?0.5:1}}>{processing?`${progress}%`:"⚡ Analyze All"}</button>
        </div>
      </div>
      {processing&&<div style={{marginBottom:14}}><div style={{height:4,background:"#1e1e35",borderRadius:2}}><div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",transition:"width 0.4s",borderRadius:2}}/></div></div>}
      <div style={{maxHeight:200,overflowY:"auto",marginBottom:16}}>
        {files.map(f=><div key={f.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#0f0f1a",borderRadius:8,marginBottom:4,border:"1px solid #1a1a2e"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:15}}>{f.status==="done"?"✅":f.status==="error"?"❌":f.status==="analyzing"?"⟳":"📄"}</div><div style={{fontSize:12,color:"#ccc"}}>{f.name}<span style={{color:"#555",marginLeft:8,fontSize:11}}>{f.size}</span></div></div>
          <div style={{fontSize:11,fontWeight:600,color:statusColor[f.status]}}>{f.status==="analyzing"?"Analyzing...":f.status}</div>
        </div>)}
      </div>
    </>}
    {results.length>0&&<>
      <Label>Results — ranked by score</Label>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid #1e1e35"}}>{["#","Name","Title","Score","Rec","Skills"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",color:"#555",fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{results.sort((a,b)=>b.fit_score-a.fit_score).map((r,i)=><tr key={i} style={{borderBottom:"1px solid #1a1a2e"}}>
            <td style={{padding:"9px 10px",color:i===0?"#fcd34d":i===1?"#94a3b8":i===2?"#cd7c4a":"#555",fontWeight:700}}>#{i+1}</td>
            <td style={{padding:"9px 10px",color:"#fff",fontWeight:500}}>{r.name}</td>
            <td style={{padding:"9px 10px",color:"#888"}}>{r.title}</td>
            <td style={{padding:"9px 10px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{height:4,width:44,background:"#1e1e35",borderRadius:2}}><div style={{height:"100%",width:`${r.fit_score}%`,background:"#6366f1",borderRadius:2}}/></div><span style={{color:"#a5b4fc",fontWeight:700}}>{r.fit_score}</span></div></td>
            <td style={{padding:"9px 10px"}}><Badge color={recColor[r.recommendation]||"#888"}>{r.recommendation}</Badge></td>
            <td style={{padding:"9px 10px",color:"#666"}}>{r.top_skills?.slice(0,2).join(", ")}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </div>;
}

function SimplePanel({token,promptKey,title,subtitle,placeholder,label,rows=6,onUpgrade,onResult,children}){
  const [input,setInput]=useState("");const [result,setResult]=useState(null);
  const {loading,ErrComponent,run}=useAI(token,onUpgrade);
  return <div>
    <PanelHeader title={title} subtitle={subtitle}/>
    <textarea value={input} onChange={e=>setInput(e.target.value)} rows={rows} placeholder={placeholder} style={TA}/>
    <RunButton onClick={()=>run(promptKey,input,r=>{setResult(r);onResult&&onResult(r);})} disabled={loading||!input.trim()} loading={loading} label={label}/>
    {loading&&<Spinner text="Working on it..."/>}{ErrComponent}
    {result&&!loading&&<div style={{animation:"fadeUp 0.4s ease"}}>{children(result)}</div>}
  </div>;
}

function AIRanking({token,onUpgrade}){
  const [input,setInput]=useState("");const [result,setResult]=useState(null);
  const {loading,ErrComponent,run}=useAI(token,onUpgrade);
  const tierColor={"S-Tier":"#fcd34d","A-Tier":"#22c55e","B-Tier":"#6366f1","C-Tier":"#888"};
  const actionColor={"Call today":"#22c55e","Schedule this week":"#6366f1","Keep warm":"#f59e0b","Archive":"#555"};
  return <div>
    <PanelHeader title="AI Candidate Ranking ⭐" subtitle="Paste any list of candidates — get a ranked top 10 with tiers and actions"/>
    <textarea value={input} onChange={e=>setInput(e.target.value)} rows={8} placeholder={"Paste candidate details or resumes...\n\nExample:\n1. Jane Smith – 8yr PM, ex-Google, MBA Stanford\n2. Alex Lee – 5yr PM, Series B startup\n3. Marco R – 3yr APM, no leadership yet"} style={TA}/>
    <RunButton onClick={()=>run("ranking",input,setResult)} disabled={loading||!input.trim()} loading={loading} label="Rank Candidates"/>
    {loading&&<Spinner text="Ranking your candidate pool..."/>}{ErrComponent}
    {result&&!loading&&<div style={{animation:"fadeUp 0.4s ease"}}>
      <Card style={{borderColor:"#2a1a5e",marginBottom:16}}>
        <Label>Role Benchmark</Label><div style={{color:"#a5b4fc",fontSize:14,marginBottom:12}}>{result.role_summary}</div>
        <div style={{background:"#080810",borderRadius:8,padding:"10px 14px",marginBottom:10}}><div style={{fontSize:11,color:"#6366f1",fontWeight:700,marginBottom:4}}>💡 Insight</div><div style={{color:"#888",fontSize:13,lineHeight:1.6}}>{result.hiring_insight}</div></div>
        <div style={{background:"#0a1a0a",borderRadius:8,padding:"10px 14px"}}><div style={{fontSize:11,color:"#22c55e",fontWeight:700,marginBottom:4}}>⚡ Next 24h</div><div style={{color:"#86efac",fontSize:13}}>{result.recommended_next_step}</div></div>
      </Card>
      {result.top_10?.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#0f0f1a",border:`1px solid ${i===0?"#fcd34d33":i<3?"#6366f133":"#1e1e35"}`,borderRadius:12,marginBottom:8}}>
        <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,background:i===0?"linear-gradient(135deg,#fcd34d,#f59e0b)":i===1?"linear-gradient(135deg,#94a3b8,#cbd5e1)":i===2?"linear-gradient(135deg,#cd7c4a,#a16207)":"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:i<3?"#0a0a0f":"#555"}}>#{c.rank}</div>
        <div style={{textAlign:"center",flexShrink:0,width:44}}><div style={{fontSize:20,fontWeight:800,color:tierColor[c.tier]||"#888",fontFamily:"'Syne',sans-serif",lineHeight:1}}>{c.score}</div><div style={{fontSize:9,color:"#555",marginTop:2}}>/100</div></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{c.name}</div><Badge color={tierColor[c.tier]||"#888"}>{c.tier}</Badge></div>
          <div style={{fontSize:12,color:"#666",marginBottom:3}}>{c.why_ranked_here}</div>
          <div style={{fontSize:11,color:"#555"}}>✨ {c.differentiator}</div>
        </div>
        <div style={{flexShrink:0}}><div style={{padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:700,background:(actionColor[c.immediate_action]||"#555")+"22",color:actionColor[c.immediate_action]||"#555",border:`1px solid ${(actionColor[c.immediate_action]||"#555")}44`,whiteSpace:"nowrap"}}>{c.immediate_action}</div></div>
      </div>)}
    </div>}
  </div>;
}

function JDMatcher({token,onUpgrade}){
  const [jd,setJd]=useState("");const [resumes,setResumes]=useState([{id:1,text:""}]);
  const [results,setResults]=useState(null);const [selected,setSelected]=useState(null);const [view,setView]=useState("ranked");
  const {loading,ErrComponent,run}=useAI(token,onUpgrade);
  const gradeColor={Excellent:"#22c55e",Strong:"#84cc16",Good:"#f59e0b",Weak:"#f97316",Poor:"#ef4444"};
  const priColor={"Fast-track":"#22c55e","Schedule":"#6366f1","Maybe":"#f59e0b","Skip":"#ef4444"};
  return <div>
    <PanelHeader title="JD → Resume Matcher 🎯" subtitle="Paste a job description and resumes — get ranked match scores"/>
    <Label>Job Description</Label>
    <textarea value={jd} onChange={e=>setJd(e.target.value)} rows={5} placeholder="Paste the full job description..." style={TA}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Label style={{marginBottom:0}}>Resumes ({resumes.length})</Label><button onClick={()=>setResumes(p=>[...p,{id:Date.now(),text:""}])} disabled={resumes.length>=10} style={{...SB,color:"#a5b4fc",borderColor:"#2a2a4f"}}>+ Add</button></div>
    <div style={{display:"grid",gridTemplateColumns:resumes.length>1?"1fr 1fr":"1fr",gap:10,marginBottom:16}}>
      {resumes.map((r,i)=><div key={r.id} style={{position:"relative"}}>
        <div style={{fontSize:11,color:"#555",marginBottom:4,fontWeight:600}}>CANDIDATE {i+1}</div>
        <textarea value={r.text} onChange={e=>setResumes(p=>p.map(x=>x.id===r.id?{...x,text:e.target.value}:x))} rows={5} placeholder={`Paste resume ${i+1}...`} style={{...TA,marginBottom:0,fontSize:12}}/>
        {resumes.length>1&&<button onClick={()=>setResumes(p=>p.filter(x=>x.id!==r.id))} style={{position:"absolute",top:20,right:8,background:"transparent",border:"none",color:"#444",cursor:"pointer",fontSize:14,padding:"2px 6px"}}>✕</button>}
      </div>)}
    </div>
    <RunButton onClick={()=>{const f=resumes.filter(r=>r.text.trim());run("matcher",`JOB DESCRIPTION:\n${jd}\n\n---\n\nRESUMES:\n${f.map((r,i)=>`RESUME ${i+1}:\n${r.text}`).join("\n\n---\n\n")}`,r=>{setResults((Array.isArray(r)?r:[r]).sort((a,b)=>b.match_score-a.match_score));});}} disabled={loading||!jd.trim()||!resumes.some(r=>r.text.trim())} loading={loading} label="Match Resumes"/>
    {loading&&<Spinner text="Analyzing fit..."/>}{ErrComponent}
    {results&&!loading&&<div style={{animation:"fadeUp 0.4s ease"}}>
      <div style={{display:"flex",gap:6,marginBottom:14}}>{["ranked","detail"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,background:view===v?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f0f1a",color:view===v?"#fff":"#555",border:view===v?"none":"1px solid #1e1e35",cursor:"pointer"}}>{v==="ranked"?"📊 Ranked":"🔍 Detail"}</button>)}</div>
      {view==="ranked"&&<Card>{results.map((r,i)=><div key={i} onClick={()=>{setSelected(r);setView("detail");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<results.length-1?"1px solid #1a1a2e":"none",cursor:"pointer"}}>
        <div style={{width:28,textAlign:"center",fontSize:13,fontWeight:800,color:i===0?"#fcd34d":i===1?"#94a3b8":i===2?"#cd7c4a":"#333"}}>#{i+1}</div>
        <div style={{position:"relative",width:44,height:44,flexShrink:0}}><svg width="44" height="44" viewBox="0 0 44 44" style={{transform:"rotate(-90deg)"}}><circle cx="22" cy="22" r="18" fill="none" stroke="#1e1e35" strokeWidth="3.5"/><circle cx="22" cy="22" r="18" fill="none" stroke={gradeColor[r.match_grade]||"#6366f1"} strokeWidth="3.5" strokeDasharray={`${r.match_score*1.131} 113.1`} strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>{r.match_score}</div></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{r.name}</div><div style={{fontSize:11,color:"#666",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.one_liner}</div></div>
        <div style={{display:"flex",gap:6,flexShrink:0}}><Badge color={gradeColor[r.match_grade]||"#888"}>{r.match_grade}</Badge><Badge color={priColor[r.interview_priority]||"#888"}>{r.interview_priority}</Badge></div>
      </div>)}</Card>}
      {view==="detail"&&(()=>{const r=selected||results[0];return <div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{results.map((x,i)=><button key={i} onClick={()=>setSelected(x)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,background:(selected?.name===x.name||(!selected&&i===0))?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f0f1a",color:(selected?.name===x.name||(!selected&&i===0))?"#fff":"#666",border:"none",cursor:"pointer"}}>{x.name} · {x.match_score}</button>)}</div>
        <Card style={{borderColor:(gradeColor[r.match_grade]||"#6366f1")+"44"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{r.name}</div><div style={{fontSize:13,color:"#888",marginTop:4,fontStyle:"italic"}}>{r.one_liner}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:32,fontWeight:800,color:gradeColor[r.match_grade],fontFamily:"'Syne',sans-serif"}}>{r.match_score}</div><Badge color={priColor[r.interview_priority]||"#888"}>{r.interview_priority}</Badge></div></div><div style={{height:6,background:"#1e1e35",borderRadius:3}}><div style={{height:"100%",width:`${r.match_score}%`,background:`linear-gradient(90deg,#6366f1,${gradeColor[r.match_grade]})`,borderRadius:3}}/></div></Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card><Label>✅ Matched</Label>{r.matched_requirements?.map((m,i)=><div key={i} style={{fontSize:13,color:"#86efac",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>✓ {m}</div>)}</Card>
          <Card><Label>❌ Missing</Label>{r.missing_requirements?.length>0?r.missing_requirements.map((m,i)=><div key={i} style={{fontSize:13,color:"#f87171",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>✗ {m}</div>):<div style={{fontSize:13,color:"#555"}}>No critical gaps</div>}</Card>
        </div>
      </div>;})()}
    </div>}
  </div>;
}

function AutoFollowUps({token,onUpgrade}){
  const [candidate,setCandidate]=useState("");const [role,setRole]=useState("");const [stage,setStage]=useState("Applied");
  const [result,setResult]=useState(null);const [copiedIdx,setCopiedIdx]=useState(null);
  const {loading,ErrComponent,run}=useAI(token,onUpgrade);
  const STAGES=["Applied","Phone Screen","Technical Interview","Final Round","Offer Extended"];
  const riskColor={Low:"#22c55e",Medium:"#f59e0b",High:"#ef4444"};
  function copy(text,i){navigator.clipboard.writeText(text);setCopiedIdx(i);setTimeout(()=>setCopiedIdx(null),2000);}
  return <div>
    <PanelHeader title="Auto Follow-Ups 🔁" subtitle="Smart follow-up sequences for any candidate at any stage"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
      <div><Label>Candidate Name</Label><input value={candidate} onChange={e=>setCandidate(e.target.value)} placeholder="e.g. Sarah Chen" style={{...TA,marginBottom:0,padding:"10px 14px",borderRadius:10}}/></div>
      <div><Label>Role</Label><input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Senior Engineer" style={{...TA,marginBottom:0,padding:"10px 14px",borderRadius:10}}/></div>
    </div>
    <div style={{marginBottom:20}}><Label>Current Stage</Label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{STAGES.map(s=><button key={s} onClick={()=>setStage(s)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:stage===s?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f0f1a",color:stage===s?"#fff":"#555",border:stage===s?"none":"1px solid #1e1e35",cursor:"pointer"}}>{s}</button>)}</div></div>
    <RunButton onClick={()=>run("followup",`Candidate: ${candidate}\nRole: ${role}\nStage: ${stage}`,setResult)} disabled={loading||!candidate.trim()||!role.trim()} loading={loading} label="Generate Follow-Ups"/>
    {loading&&<Spinner text="Building your sequence..."/>}{ErrComponent}
    {result&&!loading&&<div style={{animation:"fadeUp 0.4s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <Card style={{marginBottom:0}}><Label>Dropout Risk</Label><div style={{fontSize:24,fontWeight:800,color:riskColor[result.dropout_risk],fontFamily:"'Syne',sans-serif"}}>{result.dropout_risk}</div><div style={{fontSize:12,color:"#666",marginTop:4}}>{result.dropout_reason}</div></Card>
        <Card style={{marginBottom:0,borderColor:"#1a2a1a"}}><Label>💡 Tip</Label><div style={{fontSize:13,color:"#86efac",lineHeight:1.6}}>{result.nurture_tip}</div></Card>
      </div>
      {result.sequences?.map((seq,i)=><Card key={i} style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{seq.channel==="SMS"?"💬":seq.channel==="LinkedIn"?"🔗":"📧"}</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{seq.channel} · <span style={{color:"#6366f1"}}>{seq.tone}</span></div><div style={{fontSize:11,color:"#555"}}>{seq.trigger}</div></div></div>
          <button onClick={()=>copy(`Subject: ${seq.subject}\n\n${seq.body}`,i)} style={SB}>{copiedIdx===i?"✓ Copied":"Copy"}</button>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:"#a5b4fc",marginBottom:8}}>{seq.subject}</div>
        <div style={{fontSize:13,color:"#888",lineHeight:1.8,whiteSpace:"pre-line",borderTop:"1px solid #1a1a2e",paddingTop:8}}>{seq.body}</div>
      </Card>)}
    </div>}
  </div>;
}

function HiringReports({token,onUpgrade}){
  const [input,setInput]=useState("");const [result,setResult]=useState(null);
  const {loading,ErrComponent,run}=useAI(token,onUpgrade);
  const iC={High:"#22c55e",Medium:"#f59e0b",Low:"#888"};const eC={High:"#ef4444",Medium:"#f59e0b",Low:"#22c55e"};
  const tC={improving:"#22c55e",stable:"#f59e0b",worsening:"#ef4444"};const tI={improving:"↑",stable:"→",worsening:"↓"};
  const prompt=input.trim()||"Generate a hiring report for a fast-growing Series B SaaS startup hiring across engineering and product for 6 months, using LinkedIn, referrals, and one agency.";
  return <div>
    <PanelHeader title="Hiring Reports 📋" subtitle="Full hiring health reports with metrics and recommendations"/>
    <textarea value={input} onChange={e=>setInput(e.target.value)} rows={4} placeholder={"Describe your hiring context (or leave blank for a sample)...\n\nExample: Q2, 20-person startup, 80 candidates, 4 roles, 3 hires, avg 24 days, via LinkedIn and referrals."} style={TA}/>
    <RunButton onClick={()=>run("report",prompt,setResult)} disabled={loading} loading={loading} label="Generate Report"/>
    {loading&&<Spinner text="Building your report..."/>}{ErrComponent}
    {result&&!loading&&<div style={{animation:"fadeUp 0.4s ease"}}>
      <Card style={{borderColor:"#2a1a5e",marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{result.report_title}</div><div style={{color:"#555",fontSize:12,marginTop:4}}>{result.period}</div></div><Badge color="#6366f1">REPORT</Badge></div><div style={{color:"#888",fontSize:13,lineHeight:1.7,marginTop:12,paddingTop:12,borderTop:"1px solid #1e1e35"}}>{result.executive_summary}</div></Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[{label:"Time to Hire",value:result.metrics?.time_to_hire_days+"d",sub:tI[result.metrics?.time_to_hire_trend]+" "+result.metrics?.time_to_hire_trend,color:tC[result.metrics?.time_to_hire_trend]||"#888"},{label:"Screened",value:result.metrics?.candidates_screened,sub:"candidates",color:"#6366f1"},{label:"Interview→Hire",value:result.metrics?.interview_conversion_rate,sub:"conversion",color:"#22c55e"},{label:"Offer Accept",value:result.metrics?.offer_acceptance_rate,sub:"rate",color:"#f59e0b"}].map((k,i)=><Card key={i} style={{textAlign:"center",padding:"14px 10px",marginBottom:0}}><div style={{fontSize:22,fontWeight:800,color:k.color,fontFamily:"'Syne',sans-serif"}}>{k.value}</div><div style={{fontSize:10,color:"#ccc",marginTop:3,fontWeight:600}}>{k.label}</div><div style={{fontSize:10,color:k.color,marginTop:2}}>{k.sub}</div></Card>)}
      </div>
      <Card style={{marginBottom:14}}><Label>Source Performance</Label><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid #1e1e35"}}>{["Source","Candidates","Hires","Conversion"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#555",fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{result.metrics?.source_performance?.map((s,i)=><tr key={i} style={{borderBottom:"1px solid #1a1a2e"}}><td style={{padding:"9px 10px",color:"#fff",fontWeight:500}}>{s.source}</td><td style={{padding:"9px 10px",color:"#888"}}>{s.candidates}</td><td style={{padding:"9px 10px",color:"#22c55e",fontWeight:600}}>{s.hires}</td><td style={{padding:"9px 10px"}}><span style={{color:"#a5b4fc",fontWeight:700}}>{s.conversion}</span></td></tr>)}</tbody></table></Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card style={{marginBottom:0,borderColor:"#1a2a1a"}}><Label>✅ Highlights</Label>{result.highlights?.map((h,i)=><div key={i} style={{fontSize:13,color:"#86efac",padding:"5px 0",borderBottom:"1px solid #1a1a2e"}}>✓ {h}</div>)}</Card>
        <Card style={{marginBottom:0,borderColor:"#2a1a1a"}}><Label>⚠ Risks</Label>{result.risks?.map((r,i)=><div key={i} style={{fontSize:13,color:"#f87171",padding:"5px 0",borderBottom:"1px solid #1a1a2e"}}>⚠ {r}</div>)}</Card>
      </div>
      <Card><Label>Recommendations</Label>{result.recommendations?.map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1a1a2e"}}><div style={{fontSize:13,color:"#ccc",flex:1}}>{r.action}</div><div style={{display:"flex",gap:6,marginLeft:12}}><Badge color={iC[r.impact]||"#888"}>Impact: {r.impact}</Badge><Badge color={eC[r.effort]||"#888"}>Effort: {r.effort}</Badge></div></div>)}</Card>
      <Card style={{borderColor:"#1a2a3a"}}><Label>🎯 Next 30 Days</Label><div style={{color:"#60a5fa",fontSize:13,lineHeight:1.7}}>{result.next_30_days}</div></Card>
    </div>}
  </div>;
}

function JDWriter({token,onUpgrade}){
  return <SimplePanel token={token} promptKey="jd" title="Job Description Writer ✍️" subtitle="Generate compelling, inclusive JDs that attract top talent" placeholder={"Describe the role...\n\nExample: Senior Frontend Engineer, B2B SaaS, Series B, 100% remote, React + design systems"} label="Generate JD" onUpgrade={onUpgrade}>
    {r=><div>
      <Card style={{borderColor:"#2a1a5e"}}><div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{r.title}</div><div style={{color:"#a5b4fc",fontSize:14,marginTop:6,fontStyle:"italic"}}>{r.tagline}</div><div style={{color:"#6366f1",fontSize:12,marginTop:8,fontWeight:600}}>{r.salary_range}</div></Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div><Card><Label>About</Label><div style={prose}>{r.about_company}</div></Card><Card><Label>Overview</Label><div style={prose}>{r.role_overview}</div></Card><Card><Label>Benefits</Label>{r.what_we_offer?.map((b,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>🎁 {b}</div>)}</Card></div>
        <div><Card><Label>Responsibilities</Label>{r.responsibilities?.map((x,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>→ {x}</div>)}</Card><Card><Label>Requirements</Label>{r.requirements?.map((x,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>• {x}</div>)}<div style={{marginTop:10}}><Label>Nice to Have</Label>{r.nice_to_have?.map((x,i)=><div key={i} style={{fontSize:12,color:"#666",padding:"3px 0"}}>○ {x}</div>)}</div></Card></div>
      </div>
    </div>}
  </SimplePanel>;
}

function OutreachPanel({token,onUpgrade}){
  const [copied,setCopied]=useState(null);
  function copy(text,key){navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(null),2000);}
  return <SimplePanel token={token} promptKey="outreach" title="Outreach Emails 📧" subtitle="3-touch sequences with high response rates" placeholder={"Describe role and target candidate...\n\nExample: Reaching out to a Senior ML Engineer at FAANG for a Lead AI role at our fintech startup."} label="Generate Sequence" onUpgrade={onUpgrade}>
    {r=><div>
      <Card style={{borderColor:"#1a2a1e"}}><Label>Subject</Label><div style={{fontSize:16,fontWeight:600,color:"#fff"}}>{r.subject}</div></Card>
      {[r.email_1,r.email_2,r.email_3].filter(Boolean).map((e,i)=><Card key={i}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Label style={{marginBottom:0}}>{e.label}</Label><button onClick={()=>copy(e.body,i)} style={SB}>{copied===i?"✓ Copied":"Copy"}</button></div><div style={{color:"#ccc",fontSize:13,lineHeight:1.8,whiteSpace:"pre-line"}}>{e.body}</div></Card>)}
      <Card style={{borderColor:"#1a2a3a"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><Label style={{marginBottom:0}}>LinkedIn InMail</Label><button onClick={()=>copy(r.linkedin_message,"li")} style={SB}>{copied==="li"?"✓":"Copy"}</button></div><div style={{color:"#ccc",fontSize:13,lineHeight:1.7}}>{r.linkedin_message}</div></Card>
    </div>}
  </SimplePanel>;
}

function ScreeningPanel({token,onUpgrade}){
  const wC={High:"#6366f1",Medium:"#f59e0b",Low:"#555"};
  return <SimplePanel token={token} promptKey="screening" title="Screening Automation 🔍" subtitle="Structured interview frameworks and scorecards" placeholder={"Enter role details...\n\nExample: Head of Growth Marketing for a D2C brand, $50M ARR"} label="Build Framework" rows={4} onUpgrade={onUpgrade}>
    {r=><div>
      <Card><Label>Screening Questions</Label>{r.screening_questions?.map((q,i)=><div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #1a1a2e"}}><div style={{fontSize:13,color:"#fff",fontWeight:500,marginBottom:4}}>Q{i+1}: {q.question}</div><div style={{fontSize:12,color:"#666"}}>👂 {q.what_to_listen_for}</div></div>)}</Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card><Label>Scorecard</Label>{r.scorecard?.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #1a1a2e"}}><div style={{fontSize:13,color:"#ccc"}}>{s.criteria}</div><Badge color={wC[s.weight]||"#888"}>{s.weight}</Badge></div>)}</Card>
        <div><Card><Label>✅ Green Flags</Label>{r.green_flags?.map((f,i)=><div key={i} style={{fontSize:13,color:"#86efac",padding:"3px 0"}}>✓ {f}</div>)}</Card><Card><Label>❌ Disqualifiers</Label>{r.disqualifiers?.map((f,i)=><div key={i} style={{fontSize:13,color:"#f87171",padding:"3px 0"}}>✗ {f}</div>)}</Card></div>
      </div>
      <Card style={{borderColor:"#2a2a1a"}}><Label>⚡ Speed Tip</Label><div style={{color:"#fcd34d",fontSize:13,lineHeight:1.6}}>{r.time_to_hire_tip}</div></Card>
    </div>}
  </SimplePanel>;
}

function ATSSync(){
  const [ats,setAts]=useState([
    {id:"greenhouse",name:"Greenhouse",logo:"🌱",connected:false,synced:null,candidates:0,jobs:0},
    {id:"lever",name:"Lever",logo:"⚙️",connected:false,synced:null,candidates:0,jobs:0},
    {id:"ashby",name:"Ashby",logo:"🔷",connected:false,synced:null,candidates:0,jobs:0},
    {id:"workday",name:"Workday",logo:"☁️",connected:false,synced:null,candidates:0,jobs:0},
    {id:"icims",name:"iCIMS",logo:"🔵",connected:false,synced:null,candidates:0,jobs:0},
    {id:"smartrec",name:"SmartRecruiters",logo:"⚡",connected:false,synced:null,candidates:0,jobs:0},
  ]);
  const [connecting,setConnecting]=useState(null);const [syncing,setSyncing]=useState(null);
  async function toggle(id){
    const cur=ats.find(a=>a.id===id);
    if(cur.connected){setAts(p=>p.map(a=>a.id===id?{...a,connected:false,synced:null,candidates:0,jobs:0}:a));return;}
    setConnecting(id);await new Promise(r=>setTimeout(r,1800));
    setAts(p=>p.map(a=>a.id===id?{...a,connected:true,synced:"just now",candidates:Math.floor(Math.random()*200+50),jobs:Math.floor(Math.random()*15+3)}:a));setConnecting(null);
  }
  async function syncNow(id){setSyncing(id);await new Promise(r=>setTimeout(r,1500));setAts(p=>p.map(a=>a.id===id?{...a,synced:"just now",candidates:a.candidates+Math.floor(Math.random()*10)}:a));setSyncing(null);}
  const connected=ats.filter(a=>a.connected);
  return <div>
    <PanelHeader title="ATS Integration 🔗" subtitle="Connect your recruiting stack — sync candidates and jobs automatically"/>
    {connected.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>{[{label:"Candidates",value:connected.reduce((s,a)=>s+a.candidates,0)},{label:"Active Jobs",value:connected.reduce((s,a)=>s+a.jobs,0)},{label:"Connected",value:connected.length}].map((s,i)=><Card key={i} style={{textAlign:"center",padding:"14px 10px",marginBottom:0}}><div style={{fontSize:26,fontWeight:800,color:"#a5b4fc",fontFamily:"'Syne',sans-serif"}}>{s.value}</div><div style={{fontSize:11,color:"#555",marginTop:4}}>{s.label}</div></Card>)}</div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {ats.map(a=><Card key={a.id} style={{marginBottom:0,borderColor:a.connected?"#1e2a3a":"#1e1e35"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:26}}>{a.logo}</div><div><div style={{fontWeight:600,color:"#fff",fontSize:14}}>{a.name}</div>{a.connected?<div style={{fontSize:11,color:"#22c55e",marginTop:2}}>● Connected · {a.synced}</div>:<div style={{fontSize:11,color:"#555",marginTop:2}}>Not connected</div>}</div></div>
        <button onClick={()=>toggle(a.id)} disabled={connecting===a.id} style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:a.connected?"#1a1a2e":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:a.connected?"#f87171":"#fff",opacity:connecting===a.id?0.6:1}}>{connecting===a.id?"Connecting...":a.connected?"Disconnect":"Connect"}</button></div>
        {a.connected&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1e1e35"}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:16}}><div style={{fontSize:12,color:"#888"}}><span style={{color:"#a5b4fc",fontWeight:700}}>{a.candidates}</span> candidates</div><div style={{fontSize:12,color:"#888"}}><span style={{color:"#a5b4fc",fontWeight:700}}>{a.jobs}</span> jobs</div></div><button onClick={()=>syncNow(a.id)} disabled={syncing===a.id} style={{...SB,opacity:syncing===a.id?0.6:1}}>{syncing===a.id?"Syncing...":"↻ Sync"}</button></div></div>}
      </Card>)}
    </div>
  </div>;
}

function TeamPanel({analyzedCandidates}){
  const [comments,setComments]=useState([]);const [newComment,setNewComment]=useState("");const [selected,setSelected]=useState("");
  const recColor={"Strong Hire":"#22c55e","Hire":"#84cc16","Maybe":"#f59e0b","Pass":"#ef4444"};
  useEffect(()=>{if(analyzedCandidates.length>0&&!selected)setSelected(analyzedCandidates[0].name);},[analyzedCandidates]);
  if(analyzedCandidates.length===0)return <div><PanelHeader title="Team Collaboration 👥" subtitle="Review candidates together and align on decisions"/><Card style={{textAlign:"center",padding:"48px 24px",borderStyle:"dashed"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div style={{color:"#ccc",fontSize:14,fontWeight:500,marginBottom:8}}>No candidates yet</div><div style={{color:"#555",fontSize:13}}>Analyze resumes first — they'll appear here for team review.</div></Card></div>;
  return <div>
    <PanelHeader title="Team Collaboration 👥" subtitle="Review candidates together and align on decisions"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:20}}>
      {analyzedCandidates.map((c,i)=><Card key={i} onClick={()=>setSelected(c.name)} style={{marginBottom:0,cursor:"pointer",borderColor:selected===c.name?"#6366f1":"#1e1e35",padding:"14px 16px"}}><div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>{c.name}</div><div style={{fontSize:11,color:"#666",marginBottom:6}}>{c.title}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Badge color={recColor[c.recommendation]||"#888"}>{c.recommendation}</Badge><span style={{fontSize:12,fontWeight:700,color:"#a5b4fc"}}>{c.fit_score}</span></div></Card>)}
    </div>
    {selected&&<Card>
      <Label>Discussion — {selected}</Label>
      <div style={{display:"flex",gap:8,marginBottom:14}}><textarea value={newComment} onChange={e=>setNewComment(e.target.value)} rows={2} placeholder={`Add your assessment of ${selected}...`} style={{...TA,marginBottom:0,flex:1,resize:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&e.metaKey){setComments(p=>[{id:Date.now(),author:"You",avatar:"YO",color:"#f59e0b",time:"just now",text:newComment,candidate:selected},...p]);setNewComment("");}}}/>
      <button onClick={()=>{if(!newComment.trim())return;setComments(p=>[{id:Date.now(),author:"You",avatar:"YO",color:"#f59e0b",time:"just now",text:newComment,candidate:selected},...p]);setNewComment("");}} disabled={!newComment.trim()} style={{padding:"0 16px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,opacity:!newComment.trim()?0.5:1}}>Post</button></div>
      {comments.filter(c=>c.candidate===selected).length===0?<div style={{fontSize:13,color:"#444",textAlign:"center",padding:"20px 0"}}>No comments yet.</div>:comments.filter(c=>c.candidate===selected).map(c=><div key={c.id} style={{display:"flex",gap:10,marginBottom:14,paddingBottom:14,borderBottom:"1px solid #1a1a2e"}}><div style={{width:30,height:30,borderRadius:"50%",background:c.color+"30",border:`1.5px solid ${c.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:c.color,flexShrink:0}}>{c.avatar}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:600,color:"#ccc"}}>{c.author}</span><span style={{fontSize:11,color:"#444"}}>{c.time}</span></div><div style={{fontSize:13,color:"#888",lineHeight:1.6}}>{c.text}</div></div></div>)}
    </Card>}
  </div>;
}

function AnalyticsPanel({analyzedCandidates}){
  const total=analyzedCandidates.length;
  const avgScore=total>0?(analyzedCandidates.reduce((a,c)=>a+(c.fit_score||0),0)/total).toFixed(1):"—";
  const strong=analyzedCandidates.filter(c=>["Strong Hire","Hire"].includes(c.recommendation)).length;
  const hireRate=total>0?((strong/total)*100).toFixed(0)+"%":"—";
  const scoreDistData=[{range:"90-100",count:analyzedCandidates.filter(c=>c.fit_score>=90).length},{range:"75-89",count:analyzedCandidates.filter(c=>c.fit_score>=75&&c.fit_score<90).length},{range:"60-74",count:analyzedCandidates.filter(c=>c.fit_score>=60&&c.fit_score<75).length},{range:"<60",count:analyzedCandidates.filter(c=>c.fit_score<60).length}];
  const skillFreq={};analyzedCandidates.forEach(c=>c.top_skills?.forEach(s=>{skillFreq[s]=(skillFreq[s]||0)+1;}));
  const topSkills=Object.entries(skillFreq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([skill,count])=>({skill,count}));
  const recBreakdown=[{label:"Strong Hire",count:analyzedCandidates.filter(c=>c.recommendation==="Strong Hire").length,color:"#22c55e"},{label:"Hire",count:analyzedCandidates.filter(c=>c.recommendation==="Hire").length,color:"#84cc16"},{label:"Maybe",count:analyzedCandidates.filter(c=>c.recommendation==="Maybe").length,color:"#f59e0b"},{label:"Pass",count:analyzedCandidates.filter(c=>c.recommendation==="Pass").length,color:"#ef4444"}].filter(r=>r.count>0);
  if(total===0)return <div><PanelHeader title="Analytics 📊" subtitle="Your hiring insights will appear here as you analyze candidates"/><Card style={{textAlign:"center",padding:"48px 24px",borderStyle:"dashed"}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{color:"#ccc",fontSize:14,fontWeight:500,marginBottom:8}}>No data yet</div><div style={{color:"#555",fontSize:13}}>Start analyzing resumes — your dashboard populates automatically.</div></Card></div>;
  return <div>
    <PanelHeader title="Analytics 📊" subtitle="Live insights from your candidate pool"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {[{label:"Total Analyzed",value:total,color:"#6366f1"},{label:"Avg AI Score",value:avgScore,color:"#f59e0b"},{label:"Hire Rate",value:hireRate,color:"#22c55e"},{label:"Strong Hires",value:strong,color:"#8b5cf6"}].map((s,i)=><Card key={i} style={{textAlign:"center",padding:"16px 10px",marginBottom:0}}><div style={{fontSize:26,fontWeight:800,color:s.color,fontFamily:"'Syne',sans-serif"}}>{s.value}</div><div style={{fontSize:11,color:"#ccc",marginTop:4,fontWeight:500}}>{s.label}</div></Card>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
      <Card style={{marginBottom:0}}><Label>Score Distribution</Label><ResponsiveContainer width="100%" height={160}><BarChart data={scoreDistData}><CartesianGrid strokeDasharray="3 3" stroke="#1e1e35"/><XAxis dataKey="range" tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:8,fontSize:11}}/><Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Candidates"/></BarChart></ResponsiveContainer></Card>
      <Card style={{marginBottom:0}}><Label>Recommendation Breakdown</Label><div style={{marginTop:8}}>{recBreakdown.map((r,i)=><div key={i} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#ccc"}}>{r.label}</span><span style={{fontSize:12,color:r.color,fontWeight:700}}>{r.count} <span style={{color:"#555",fontWeight:400}}>({total>0?((r.count/total)*100).toFixed(0):0}%)</span></span></div><div style={{height:6,background:"#1e1e35",borderRadius:3}}><div style={{height:"100%",width:`${total>0?(r.count/total)*100:0}%`,background:r.color,borderRadius:3}}/></div></div>)}</div></Card>
    </div>
    {topSkills.length>0&&<Card><Label>Top Skills in Pool</Label><ResponsiveContainer width="100%" height={160}><BarChart data={topSkills} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#1e1e35"/><XAxis type="number" allowDecimals={false} tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="skill" tick={{fill:"#888",fontSize:11}} axisLine={false} tickLine={false} width={80}/><Tooltip contentStyle={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:8,fontSize:11}}/><Bar dataKey="count" fill="#8b5cf6" radius={[0,4,4,0]} name="Candidates"/></BarChart></ResponsiveContainer></Card>}
  </div>;
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App(){
  const [token,setToken]=useState(()=>{try{return localStorage.getItem("hiq_token")||"";}catch{return "";}});
  const [user,setUser]=useState(()=>{try{const u=localStorage.getItem("hiq_user");return u?JSON.parse(u):null;}catch{return null;}});
  const [active,setActive]=useState("analyzer");
  const [analyzedCandidates,setAnalyzedCandidates]=useState([]);
  const [showPricing,setShowPricing]=useState(false);

  function onLogin(tok,usr){
    setToken(tok);setUser(usr);
    try{localStorage.setItem("hiq_token",tok);localStorage.setItem("hiq_user",JSON.stringify(usr));}catch{}
  }
  function logout(){
    try{fetch(`${API}/api/auth/logout`,{method:"POST",headers:{"Authorization":`Bearer ${token}`}});}catch{}
    setToken("");setUser(null);setAnalyzedCandidates([]);
    try{localStorage.removeItem("hiq_token");localStorage.removeItem("hiq_user");}catch{}
  }
  function onAnalyzed(c){setAnalyzedCandidates(p=>{const exists=p.find(x=>x.name===c.name);return exists?p.map(x=>x.name===c.name?c:x):[...p,c];});}

  if(!token)return <Login onLogin={onLogin}/>;

  const p={token,onAnalyzed,analyzedCandidates,onUpgrade:()=>setShowPricing(true)};
  const panels={analyzer:<ResumeAnalyzer {...p}/>,bulk:<BulkUpload {...p}/>,ranking:<AIRanking {...p}/>,matcher:<JDMatcher {...p}/>,followups:<AutoFollowUps {...p}/>,reports:<HiringReports {...p}/>,jd:<JDWriter {...p}/>,outreach:<OutreachPanel {...p}/>,screening:<ScreeningPanel {...p}/>,ats:<ATSSync/>,team:<TeamPanel {...p}/>,analytics:<AnalyticsPanel {...p}/>};

  const isPro=user?.plan==="pro"||user?.plan==="agency";
  const credits=user?.plan==="free"?(user?.credits??10):null;

  return <div style={{minHeight:"100vh",background:"#0a0a0f",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#e8e6f0"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0f}::-webkit-scrollbar-thumb{background:#2a2a3f;border-radius:2px}textarea:focus,input:focus{outline:none!important;border-color:#6366f1!important}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}button:hover{opacity:0.9}`}</style>
    {showPricing&&<PricingModal token={token} onClose={()=>setShowPricing(false)}/>}

    <div style={{borderBottom:"1px solid #1a1a2e",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#0a0a0f",zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
        <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,letterSpacing:"-0.02em",color:"#fff"}}>HireIQ <span style={{color:"#6366f1"}}>Agent</span></div><div style={{fontSize:10,color:"#444"}}>AI Recruiting Platform</div></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {isPro?<Badge color="#f59e0b">{user.plan==="agency"?"Agency":"Pro"}</Badge>:<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:11,color:credits<=3?"#f87171":"#555"}}>{credits} credit{credits!==1?"s":""} left</div><button onClick={()=>setShowPricing(true)} style={{padding:"5px 12px",borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>Upgrade</button></div>}
        <div style={{fontSize:11,color:"#444",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
        <button onClick={logout} style={{...SB,fontSize:10,color:"#444"}}>Sign out</button>
      </div>
    </div>

    <div style={{display:"flex"}}>
      <div style={{width:196,borderRight:"1px solid #1a1a2e",padding:"18px 10px",minHeight:"calc(100vh - 61px)",position:"sticky",top:61,alignSelf:"flex-start"}}>
        <div style={{fontSize:9,color:"#2a2a3f",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,paddingLeft:6}}>Workspace</div>
        {NAV_ITEMS.map(item=>{const isActive=active===item.id;return <button key={item.id} onClick={()=>setActive(item.id)} style={{width:"100%",padding:"9px 10px",borderRadius:8,marginBottom:2,background:isActive?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",color:isActive?"#fff":"#666",fontSize:12,fontWeight:isActive?600:400,textAlign:"left",display:"flex",alignItems:"center",gap:8,border:"none",cursor:"pointer"}}>
          <span style={{fontSize:13}}>{item.icon}</span>{item.label}
          {item.id==="analytics"&&analyzedCandidates.length>0&&<span style={{marginLeft:"auto",fontSize:9,background:"#6366f122",color:"#6366f1",padding:"1px 5px",borderRadius:10,fontWeight:700}}>{analyzedCandidates.length}</span>}
        </button>;})}
        {analyzedCandidates.length>0&&<div style={{marginTop:14,padding:10,background:"#0d0d18",borderRadius:8,border:"1px solid #1a1a2e"}}>
          <div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:6}}>Pool</div>
          <div style={{fontSize:11,color:"#888"}}>{analyzedCandidates.length} analyzed</div>
          <div style={{fontSize:11,color:"#22c55e",marginTop:2}}>{analyzedCandidates.filter(c=>["Strong Hire","Hire"].includes(c.recommendation)).length} recommend hire</div>
          <div style={{fontSize:11,color:"#f59e0b",marginTop:2}}>Avg: {(analyzedCandidates.reduce((a,c)=>a+(c.fit_score||0),0)/analyzedCandidates.length).toFixed(0)}</div>
        </div>}
        {!isPro&&<button onClick={()=>setShowPricing(true)} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>⚡ Upgrade to Pro</button>}
      </div>
      <div style={{flex:1,padding:"32px 36px",maxWidth:920,overflowY:"auto"}}>{panels[active]}</div>
    </div>
  </div>;
}
