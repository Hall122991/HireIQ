import { useState, useRef, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  resume: `You are an elite talent acquisition specialist. Given resume text, return ONLY valid JSON:
{"name":"...","title":"...","experience_years":N,"top_skills":["s1","s2","s3","s4","s5"],"education":"...","strengths":["s1","s2","s3"],"red_flags":[],"fit_score":N,"summary":"2-sentence summary.","recommendation":"Strong Hire|Hire|Maybe|Pass"}
ONLY JSON, no markdown.`,

  jd: `You are a world-class talent brand strategist. Return ONLY valid JSON:
{"title":"...","tagline":"...","about_company":"...","role_overview":"...","responsibilities":["r1","r2","r3","r4","r5"],"requirements":["r1","r2","r3","r4"],"nice_to_have":["n1","n2","n3"],"what_we_offer":["b1","b2","b3","b4"],"salary_range":"..."}
ONLY JSON, no markdown.`,

  outreach: `You are an elite recruiter with 60%+ cold email response rates. Return ONLY valid JSON:
{"subject":"...","email_1":{"label":"Initial Outreach","body":"..."},"email_2":{"label":"Follow-up (Day 5)","body":"..."},"email_3":{"label":"Final Nudge (Day 12)","body":"..."},"linkedin_message":"under 300 chars"}
ONLY JSON, no markdown.`,

  screening: `You are a senior technical recruiter. Return ONLY valid JSON:
{"screening_questions":[{"question":"...","what_to_listen_for":"..."}],"disqualifiers":["d1","d2","d3"],"green_flags":["g1","g2","g3"],"scorecard":[{"criteria":"...","weight":"High|Medium|Low"}],"time_to_hire_tip":"..."}
ONLY JSON, no markdown.`,

  ranking: `You are a world-class head of talent. Given candidates, rank them and return ONLY valid JSON:
{"role_summary":"...","top_10":[{"rank":1,"name":"...","score":N,"tier":"S-Tier|A-Tier|B-Tier|C-Tier","why_ranked_here":"...","immediate_action":"Call today|Schedule this week|Keep warm|Archive","differentiator":"..."}],"hiring_insight":"...","recommended_next_step":"..."}
ONLY JSON, no markdown.`,

  followup: `You are an expert recruiting coordinator. Return ONLY valid JSON:
{"candidate":"...","role":"...","stage":"...","sequences":[{"trigger":"...","subject":"...","body":"...","channel":"Email|SMS|LinkedIn","tone":"Warm|Professional|Urgent"}],"nurture_tip":"...","dropout_risk":"Low|Medium|High","dropout_reason":"..."}
ONLY JSON, no markdown.`,

  report: `You are a data-driven HR analytics expert. Return ONLY valid JSON:
{"report_title":"...","period":"...","executive_summary":"3 sentence summary","metrics":{"time_to_hire_days":N,"time_to_hire_trend":"improving|stable|worsening","candidates_screened":N,"interview_conversion_rate":"X%","offer_acceptance_rate":"X%","source_performance":[{"source":"LinkedIn","candidates":N,"hires":N,"conversion":"X%"},{"source":"Referral","candidates":N,"hires":N,"conversion":"X%"},{"source":"Indeed","candidates":N,"hires":N,"conversion":"X%"},{"source":"Agency","candidates":N,"hires":N,"conversion":"X%"}]},"highlights":["h1","h2"],"risks":["r1","r2"],"recommendations":[{"action":"...","impact":"High|Medium|Low","effort":"High|Medium|Low"}],"next_30_days":"..."}
ONLY JSON, no markdown.`,

  matcher: `You are an elite technical recruiter. Match resumes to a JD and return ONLY a valid JSON array:
[{"name":"...","match_score":N,"match_grade":"Excellent|Strong|Good|Weak|Poor","matched_requirements":["r1","r2"],"missing_requirements":["r1"],"standout_strengths":["s1","s2"],"concerns":[],"interview_priority":"Fast-track|Schedule|Maybe|Skip","one_liner":"..."}]
ONLY JSON array, no markdown.`,
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function callClaude(apiKey, system, userContent) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: userContent }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background:"#0f0f1a", border:"1px solid #1e1e35", borderRadius:12, padding:"18px 20px", marginBottom:14, cursor:onClick?"pointer":"default", ...style }}>{children}</div>;
}
function Label({ children, style }) {
  return <div style={{ fontSize:10, color:"#555", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, ...style }}>{children}</div>;
}
function Avatar({ initials, color, size=32 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:color+"30", border:`1.5px solid ${color}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:700, color, flexShrink:0 }}>{initials}</div>;
}
function Badge({ children, color="#6366f1" }) {
  return <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, background:color+"22", color, border:`1px solid ${color}44`, letterSpacing:"0.04em" }}>{children}</span>;
}
function Spinner({ text }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 0" }}>
      <div style={{ display:"flex", gap:5, justifyContent:"center", marginBottom:10 }}>
        {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#6366f1", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.2}s` }}/>)}
      </div>
      {text && <div style={{ color:"#555", fontSize:12 }}>{text}</div>}
    </div>
  );
}
function ErrorBox({ msg }) {
  return <div style={{ padding:14, background:"#1a0a0a", border:"1px solid #3a1a1a", borderRadius:10, color:"#f87171", fontSize:13, marginBottom:16 }}>{msg}</div>;
}
function PanelHeader({ title, subtitle }) {
  return <div style={{ marginBottom:24 }}><h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>{title}</h1><p style={{ color:"#555", fontSize:13, marginTop:4 }}>{subtitle}</p></div>;
}
function RunButton({ onClick, disabled, loading, label }) {
  return <button onClick={onClick} disabled={disabled} style={{ padding:"11px 26px", borderRadius:10, fontSize:13, fontWeight:600, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", border:"none", cursor:disabled?"not-allowed":"pointer", marginBottom:24, opacity:disabled?0.5:1, boxShadow:disabled?"none":"0 4px 20px rgba(99,102,241,0.3)" }}>{loading?"⟳ Running...":`⚡ ${label}`}</button>;
}
function ScoreRing({ score, color="#6366f1" }) {
  return (
    <div style={{ position:"relative", width:68, height:68, flexShrink:0 }}>
      <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="34" cy="34" r="28" fill="none" stroke="#1e1e35" strokeWidth="5"/>
        <circle cx="34" cy="34" r="28" fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${(score||0)*1.759} 175.9`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff" }}>{score}</div>
    </div>
  );
}
const textareaStyle = { width:"100%", background:"#0f0f1a", border:"1px solid #1e1e35", borderRadius:10, padding:"14px 16px", color:"#ccc", fontSize:13, lineHeight:1.7, resize:"vertical", marginBottom:14, fontFamily:"inherit", outline:"none" };
const smallBtn = { padding:"5px 12px", borderRadius:7, background:"#141420", border:"1px solid #1e1e35", color:"#888", fontSize:11, cursor:"pointer", fontFamily:"inherit" };
const prose = { color:"#ccc", fontSize:13, lineHeight:1.7 };

// ─── Onboarding ───────────────────────────────────────────────────────────────

function Onboarding({ onSave }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  async function verify() {
    if (!key.trim()) return;
    setTesting(true); setError("");
    try {
      await callClaude(key.trim(), "You are helpful.", "Say OK");
      onSave(key.trim());
    } catch(e) {
      setError("Invalid API key or network error. Check your key and try again.");
    } finally { setTesting(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div style={{ width:"100%", maxWidth:480, padding:"0 24px" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 20px" }}>⚡</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>HireIQ <span style={{color:"#6366f1"}}>Agent</span></h1>
          <p style={{ color:"#555", fontSize:15, marginTop:8 }}>AI-powered recruiting automation</p>
        </div>

        <div style={{ background:"#0f0f1a", border:"1px solid #1e1e35", borderRadius:16, padding:32 }}>
          <Label>Your Anthropic API Key</Label>
          <input
            type="password" value={key} onChange={e=>setKey(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&verify()}
            placeholder="sk-ant-..."
            style={{ ...textareaStyle, marginBottom:8, borderRadius:10, padding:"12px 16px", fontSize:14 }}
          />
          <div style={{ fontSize:11, color:"#444", marginBottom:20 }}>
            Get your key at{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:"#6366f1" }}>console.anthropic.com</a>
            {" "}· Your key stays in your browser only
          </div>
          {error && <ErrorBox msg={error} />}
          <button onClick={verify} disabled={testing||!key.trim()} style={{ width:"100%", padding:"13px", borderRadius:10, fontSize:14, fontWeight:700, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", border:"none", cursor:testing||!key.trim()?"not-allowed":"pointer", opacity:testing||!key.trim()?0.5:1 }}>
            {testing ? "Verifying..." : "Enter HireIQ →"}
          </button>

          <div style={{ marginTop:24, paddingTop:20, borderTop:"1px solid #1a1a2e" }}>
            <div style={{ fontSize:11, color:"#333", textAlign:"center", marginBottom:12 }}>What you get</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {["📄 Resume Scoring","⭐ Candidate Ranking","🎯 JD Matching","🔁 Auto Follow-Ups","📋 Hiring Reports","📊 Analytics"].map(f=>(
                <div key={f} style={{ fontSize:11, color:"#666", padding:"6px 10px", background:"#080810", borderRadius:8, border:"1px solid #1a1a2e" }}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

function ResumeAnalyzer({ apiKey, onAnalyzed }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const recColor = { "Strong Hire":"#22c55e","Hire":"#84cc16","Maybe":"#f59e0b","Pass":"#ef4444" };

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const r = await callClaude(apiKey, PROMPTS.resume, input);
      setResult(r);
      onAnalyzed(r);
    } catch(e) { setError(e.message||"Analysis failed. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PanelHeader title="Resume Analyzer" subtitle="Paste any resume for instant AI scoring and extraction" />
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={8} placeholder={"Paste a resume here — name, work history, skills, education...\n\nExample:\nJane Smith\nSenior Product Manager at Stripe (4 years)\nPrev: Google, LinkedIn | MBA Wharton\nSkills: Product strategy, SQL, A/B testing, roadmapping"} style={textareaStyle} />
      <RunButton onClick={run} disabled={loading||!input.trim()} loading={loading} label="Analyze Resume" />
      {loading && <Spinner text="Analyzing resume..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{ animation:"fadeUp 0.4s ease" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card>
              <Label>Candidate</Label>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", fontFamily:"'Syne',sans-serif" }}>{result.name}</div>
              <div style={{ color:"#888", fontSize:13, marginTop:4 }}>{result.title}</div>
              <div style={{ color:"#555", fontSize:12, marginTop:3 }}>{result.experience_years} yrs · {result.education}</div>
            </Card>
            <Card style={{ display:"flex", alignItems:"center", gap:16 }}>
              <ScoreRing score={result.fit_score} color={recColor[result.recommendation]||"#6366f1"} />
              <div>
                <Label>AI Fit Score</Label>
                <div style={{ fontSize:15, fontWeight:700, color:recColor[result.recommendation]||"#fff" }}>{result.recommendation}</div>
              </div>
            </Card>
          </div>
          <Card><Label>Summary</Label><div style={prose}>{result.summary}</div></Card>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card>
              <Label>Top Skills</Label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{result.top_skills?.map((s,i)=><Badge key={i} color="#6366f1">{s}</Badge>)}</div>
            </Card>
            <Card>
              <Label>Strengths</Label>
              {result.strengths?.map((s,i)=><div key={i} style={{ fontSize:13, color:"#ccc", padding:"4px 0", borderBottom:"1px solid #1a1a2e" }}>✓ {s}</div>)}
            </Card>
          </div>
          {result.red_flags?.length>0 && <Card style={{borderColor:"#3a1a1a"}}><Label>Red Flags</Label>{result.red_flags.map((f,i)=><div key={i} style={{fontSize:13,color:"#f87171"}}>⚠ {f}</div>)}</Card>}
        </div>
      )}
    </div>
  );
}

function BulkUpload({ apiKey, onAnalyzed }) {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const recColor = { "Strong Hire":"#22c55e","Hire":"#84cc16","Maybe":"#f59e0b","Pass":"#ef4444" };
  const statusColor = { queued:"#555", analyzing:"#6366f1", done:"#22c55e", error:"#ef4444" };

  function addFiles(newFiles) {
    const arr = Array.from(newFiles).map((f,i)=>({ id:Date.now()+i, name:f.name, file:f, size:(f.size/1024).toFixed(1)+"KB", status:"queued", result:null }));
    setFiles(prev=>[...prev,...arr]);
  }
  function onDrop(e) { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }

  async function processAll() {
    const queued = files.filter(f=>f.status==="queued");
    if (!queued.length) return;
    setProcessing(true); setProgress(0);
    for (let i=0; i<queued.length; i++) {
      const fid = queued[i].id;
      setFiles(prev=>prev.map(f=>f.id===fid?{...f,status:"analyzing"}:f));
      try {
        // Read actual file text
        const text = await new Promise((res,rej)=>{
          const reader = new FileReader();
          reader.onload = e=>res(e.target.result);
          reader.onerror = ()=>rej(new Error("Could not read file"));
          reader.readAsText(queued[i].file);
        });
        const r = await callClaude(apiKey, PROMPTS.resume, text||`File: ${queued[i].name}`);
        setFiles(prev=>prev.map(f=>f.id===fid?{...f,status:"done",result:r}:f));
        setResults(prev=>[...prev,{...r,fileName:queued[i].name}]);
        onAnalyzed(r);
      } catch {
        setFiles(prev=>prev.map(f=>f.id===fid?{...f,status:"error"}:f));
      }
      setProgress(Math.round(((i+1)/queued.length)*100));
    }
    setProcessing(false);
  }

  return (
    <div>
      <PanelHeader title="Bulk Resume Upload" subtitle="Drop up to 100 resumes — AI analyzes them all and ranks by fit score" />
      <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop} onClick={()=>fileInputRef.current?.click()}
        style={{ border:`2px dashed ${dragging?"#6366f1":"#1e1e35"}`, borderRadius:14, padding:"40px 24px", textAlign:"center", cursor:"pointer", marginBottom:20, transition:"all 0.2s", background:dragging?"#0f0f2a":"#09090f" }}>
        <div style={{ fontSize:36, marginBottom:10 }}>📂</div>
        <div style={{ color:"#ccc", fontSize:14, fontWeight:500 }}>Drag & drop resumes here</div>
        <div style={{ color:"#555", fontSize:12, marginTop:4 }}>TXT files work best · PDF and DOC text is extracted · up to 100 files</div>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={e=>addFiles(e.target.files)} />
      </div>
      {files.length>0 && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ color:"#888", fontSize:13 }}>{files.length} file{files.length!==1?"s":""} queued</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{setFiles([]);setResults([]);setProgress(0)}} style={{...smallBtn,color:"#f87171",borderColor:"#3a1a1a"}}>Clear All</button>
              <button onClick={processAll} disabled={processing||!files.some(f=>f.status==="queued")} style={{...smallBtn,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",opacity:(processing||!files.some(f=>f.status==="queued"))?0.5:1}}>
                {processing?`Processing... ${progress}%`:"⚡ Analyze All"}
              </button>
            </div>
          </div>
          {processing && <div style={{marginBottom:14}}><div style={{height:4,background:"#1e1e35",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",transition:"width 0.4s ease",borderRadius:2}}/></div><div style={{fontSize:11,color:"#555",marginTop:4}}>{progress}% complete</div></div>}
          <div style={{ maxHeight:220, overflowY:"auto", marginBottom:20 }}>
            {files.map(f=>(
              <div key={f.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:"#0f0f1a", borderRadius:8, marginBottom:4, border:"1px solid #1a1a2e" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:16 }}>{f.status==="done"?"✅":f.status==="error"?"❌":f.status==="analyzing"?"⟳":"📄"}</div>
                  <div><div style={{fontSize:12,color:"#ccc"}}>{f.name}</div><div style={{fontSize:11,color:"#555"}}>{f.size}</div></div>
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:statusColor[f.status] }}>{f.status==="analyzing"?"Analyzing...":f.status}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {results.length>0 && (
        <>
          <Label>Results — {results.length} candidates ranked by score</Label>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{borderBottom:"1px solid #1e1e35"}}>{["#","Name","Title","Exp","Score","Recommendation","Top Skills"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#555",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</th>)}</tr></thead>
              <tbody>
                {results.sort((a,b)=>b.fit_score-a.fit_score).map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #1a1a2e"}}>
                    <td style={{padding:"10px 12px",color:i===0?"#fcd34d":i===1?"#94a3b8":i===2?"#cd7c4a":"#555",fontWeight:700}}>#{i+1}</td>
                    <td style={{padding:"10px 12px",color:"#fff",fontWeight:500}}>{r.name}</td>
                    <td style={{padding:"10px 12px",color:"#888"}}>{r.title}</td>
                    <td style={{padding:"10px 12px",color:"#888"}}>{r.experience_years}y</td>
                    <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{height:4,width:50,background:"#1e1e35",borderRadius:2}}><div style={{height:"100%",width:`${r.fit_score}%`,background:"#6366f1",borderRadius:2}}/></div><span style={{color:"#a5b4fc",fontWeight:700}}>{r.fit_score}</span></div></td>
                    <td style={{padding:"10px 12px"}}><Badge color={recColor[r.recommendation]||"#888"}>{r.recommendation}</Badge></td>
                    <td style={{padding:"10px 12px",color:"#666"}}>{r.top_skills?.slice(0,2).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AIRanking({ apiKey }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tierColor = { "S-Tier":"#fcd34d","A-Tier":"#22c55e","B-Tier":"#6366f1","C-Tier":"#888" };
  const actionColor = { "Call today":"#22c55e","Schedule this week":"#6366f1","Keep warm":"#f59e0b","Archive":"#555" };

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try { setResult(await callClaude(apiKey, PROMPTS.ranking, input)); }
    catch(e) { setError(e.message||"Ranking failed."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PanelHeader title="AI Candidate Ranking ⭐" subtitle="Paste any list of candidates — get a ranked top 10 with tiers and actions" />
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={8}
        placeholder={"Paste candidate details or full resumes here...\n\nExample:\n1. Jane Smith – 8yr PM, ex-Google, MBA Stanford\n2. Alex Lee – 5yr PM, Series B startup, strong growth\n3. Marco R – 3yr APM, no leadership yet\n\nOr paste full resume text for each candidate"}
        style={textareaStyle} />
      <RunButton onClick={run} disabled={loading||!input.trim()} loading={loading} label="Rank Candidates" />
      {loading && <Spinner text="AI is ranking your candidate pool..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{ animation:"fadeUp 0.4s ease" }}>
          <Card style={{ borderColor:"#2a1a5e", marginBottom:16 }}>
            <Label>Role Benchmark</Label>
            <div style={{ color:"#a5b4fc", fontSize:14, marginBottom:12 }}>{result.role_summary}</div>
            <div style={{ background:"#080810", borderRadius:8, padding:"10px 14px", marginBottom:10 }}>
              <div style={{ fontSize:11, color:"#6366f1", fontWeight:700, marginBottom:4 }}>💡 Hiring Insight</div>
              <div style={{ color:"#888", fontSize:13, lineHeight:1.6 }}>{result.hiring_insight}</div>
            </div>
            <div style={{ background:"#0a1a0a", borderRadius:8, padding:"10px 14px" }}>
              <div style={{ fontSize:11, color:"#22c55e", fontWeight:700, marginBottom:4 }}>⚡ Next 24 Hours</div>
              <div style={{ color:"#86efac", fontSize:13 }}>{result.recommended_next_step}</div>
            </div>
          </Card>
          <Label>Ranked Candidates</Label>
          {result.top_10?.map((c,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"#0f0f1a", border:`1px solid ${i===0?"#fcd34d33":i<3?"#6366f133":"#1e1e35"}`, borderRadius:12, marginBottom:8 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:i===0?"linear-gradient(135deg,#fcd34d,#f59e0b)":i===1?"linear-gradient(135deg,#94a3b8,#cbd5e1)":i===2?"linear-gradient(135deg,#cd7c4a,#a16207)":"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:i<3?"#0a0a0f":"#555" }}>#{c.rank}</div>
              <div style={{ textAlign:"center", flexShrink:0, width:44 }}>
                <div style={{ fontSize:20, fontWeight:800, color:tierColor[c.tier]||"#888", fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{c.score}</div>
                <div style={{ fontSize:9, color:"#555", marginTop:2 }}>/100</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{c.name}</div>
                  <Badge color={tierColor[c.tier]||"#888"}>{c.tier}</Badge>
                </div>
                <div style={{ fontSize:12, color:"#666", marginBottom:3 }}>{c.why_ranked_here}</div>
                <div style={{ fontSize:11, color:"#555" }}>✨ {c.differentiator}</div>
              </div>
              <div style={{ flexShrink:0 }}>
                <div style={{ padding:"5px 10px", borderRadius:8, fontSize:11, fontWeight:700, background:(actionColor[c.immediate_action]||"#555")+"22", color:actionColor[c.immediate_action]||"#555", border:`1px solid ${(actionColor[c.immediate_action]||"#555")}44`, whiteSpace:"nowrap" }}>{c.immediate_action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JDMatcher({ apiKey }) {
  const [jd, setJd] = useState("");
  const [resumes, setResumes] = useState([{id:1,text:""}]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("ranked");
  const gradeColor = { Excellent:"#22c55e",Strong:"#84cc16",Good:"#f59e0b",Weak:"#f97316",Poor:"#ef4444" };
  const priorityColor = { "Fast-track":"#22c55e","Schedule":"#6366f1","Maybe":"#f59e0b","Skip":"#ef4444" };

  async function run() {
    const filled = resumes.filter(r=>r.text.trim());
    if (!jd.trim()||!filled.length) return;
    setLoading(true); setResults(null); setError(null);
    try {
      const prompt = `JOB DESCRIPTION:\n${jd}\n\n---\n\nRESUMES:\n${filled.map((r,i)=>`RESUME ${i+1}:\n${r.text}`).join("\n\n---\n\n")}`;
      const data = await callClaude(apiKey, PROMPTS.matcher, prompt);
      setResults((Array.isArray(data)?data:[data]).sort((a,b)=>b.match_score-a.match_score));
    } catch(e) { setError(e.message||"Matching failed."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PanelHeader title="JD → Resume Matcher 🎯" subtitle="Paste a job description and resumes — get ranked match scores" />
      <Label>Job Description</Label>
      <textarea value={jd} onChange={e=>setJd(e.target.value)} rows={5} placeholder="Paste the full job description here..." style={textareaStyle} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <Label style={{marginBottom:0}}>Resumes ({resumes.length})</Label>
        <button onClick={()=>setResumes(p=>[...p,{id:Date.now(),text:""}])} disabled={resumes.length>=10} style={{...smallBtn,color:"#a5b4fc",borderColor:"#2a2a4f"}}>+ Add Resume</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:resumes.length>1?"1fr 1fr":"1fr", gap:10, marginBottom:16 }}>
        {resumes.map((r,i)=>(
          <div key={r.id} style={{position:"relative"}}>
            <div style={{fontSize:11,color:"#555",marginBottom:4,fontWeight:600}}>CANDIDATE {i+1}</div>
            <textarea value={r.text} onChange={e=>setResumes(p=>p.map(x=>x.id===r.id?{...x,text:e.target.value}:x))} rows={5} placeholder={`Paste resume ${i+1}...`} style={{...textareaStyle,marginBottom:0,fontSize:12}}/>
            {resumes.length>1 && <button onClick={()=>setResumes(p=>p.filter(x=>x.id!==r.id))} style={{position:"absolute",top:20,right:8,background:"transparent",border:"none",color:"#444",cursor:"pointer",fontSize:14,padding:"2px 6px"}}>✕</button>}
          </div>
        ))}
      </div>
      <RunButton onClick={run} disabled={loading||!jd.trim()||!resumes.some(r=>r.text.trim())} loading={loading} label={`Match ${resumes.filter(r=>r.text.trim()).length} Resume${resumes.filter(r=>r.text.trim()).length!==1?"s":""}`} />
      {loading && <Spinner text="Analyzing fit across all candidates..." />}
      {error && <ErrorBox msg={error} />}
      {results && !loading && (
        <div style={{animation:"fadeUp 0.4s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[{label:"Candidates",value:results.length},{label:"Excellent/Strong",value:results.filter(r=>["Excellent","Strong"].includes(r.match_grade)).length,color:"#22c55e"},{label:"Fast-track",value:results.filter(r=>r.interview_priority==="Fast-track").length,color:"#6366f1"},{label:"Top Score",value:results[0]?.match_score,color:"#f59e0b"}].map((s,i)=>(
              <Card key={i} style={{textAlign:"center",padding:"14px 10px",marginBottom:0}}>
                <div style={{fontSize:24,fontWeight:800,color:s.color||"#a5b4fc",fontFamily:"'Syne',sans-serif"}}>{s.value}</div>
                <div style={{fontSize:10,color:"#555",marginTop:3}}>{s.label}</div>
              </Card>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {["ranked","detail"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,background:view===v?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f0f1a",color:view===v?"#fff":"#555",border:view===v?"none":"1px solid #1e1e35",cursor:"pointer"}}>{v==="ranked"?"📊 Ranked":"🔍 Detail"}</button>)}
          </div>
          {view==="ranked" && (
            <Card>
              {results.map((r,i)=>(
                <div key={i} onClick={()=>{setSelected(r);setView("detail");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<results.length-1?"1px solid #1a1a2e":"none",cursor:"pointer"}}>
                  <div style={{width:28,textAlign:"center",fontSize:13,fontWeight:800,color:i===0?"#fcd34d":i===1?"#94a3b8":i===2?"#cd7c4a":"#333"}}>#{i+1}</div>
                  <div style={{position:"relative",width:44,height:44,flexShrink:0}}>
                    <svg width="44" height="44" viewBox="0 0 44 44" style={{transform:"rotate(-90deg)"}}>
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#1e1e35" strokeWidth="3.5"/>
                      <circle cx="22" cy="22" r="18" fill="none" stroke={gradeColor[r.match_grade]||"#6366f1"} strokeWidth="3.5" strokeDasharray={`${r.match_score*1.131} 113.1`} strokeLinecap="round"/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>{r.match_score}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{r.name}</div>
                    <div style={{fontSize:11,color:"#666",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.one_liner}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <Badge color={gradeColor[r.match_grade]||"#888"}>{r.match_grade}</Badge>
                    <Badge color={priorityColor[r.interview_priority]||"#888"}>{r.interview_priority}</Badge>
                  </div>
                </div>
              ))}
            </Card>
          )}
          {view==="detail" && (()=>{
            const r = selected||results[0];
            return (
              <div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                  {results.map((x,i)=><button key={i} onClick={()=>setSelected(x)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,background:selected?.name===x.name||(!selected&&i===0)?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f0f1a",color:selected?.name===x.name||(!selected&&i===0)?"#fff":"#666",border:"none",cursor:"pointer"}}>{x.name} · {x.match_score}</button>)}
                </div>
                <Card style={{borderColor:(gradeColor[r.match_grade]||"#6366f1")+"44"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div><div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{r.name}</div><div style={{fontSize:13,color:"#888",marginTop:4,fontStyle:"italic"}}>{r.one_liner}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:32,fontWeight:800,color:gradeColor[r.match_grade],fontFamily:"'Syne',sans-serif"}}>{r.match_score}</div><Badge color={priorityColor[r.interview_priority]||"#888"}>{r.interview_priority}</Badge></div>
                  </div>
                  <div style={{height:6,background:"#1e1e35",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${r.match_score}%`,background:`linear-gradient(90deg,#6366f1,${gradeColor[r.match_grade]})`,borderRadius:3}}/></div>
                </Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <Card><Label>✅ Matched</Label>{r.matched_requirements?.map((m,i)=><div key={i} style={{fontSize:13,color:"#86efac",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>✓ {m}</div>)}</Card>
                  <Card><Label>❌ Missing</Label>{r.missing_requirements?.length>0?r.missing_requirements.map((m,i)=><div key={i} style={{fontSize:13,color:"#f87171",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>✗ {m}</div>):<div style={{fontSize:13,color:"#555"}}>No critical gaps</div>}</Card>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <Card><Label>⭐ Strengths</Label>{r.standout_strengths?.map((s,i)=><div key={i} style={{fontSize:13,color:"#fcd34d",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>→ {s}</div>)}</Card>
                  <Card><Label>⚠ Concerns</Label>{r.concerns?.length>0?r.concerns.map((c,i)=><div key={i} style={{fontSize:13,color:"#fb923c",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>⚠ {c}</div>):<div style={{fontSize:13,color:"#555"}}>No major concerns</div>}</Card>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function AutoFollowUps({ apiKey }) {
  const [candidate, setCandidate] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState("Applied");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const STAGES = ["Applied","Phone Screen","Technical Interview","Final Round","Offer Extended"];
  const channelIcon = {Email:"📧",SMS:"💬",LinkedIn:"🔗"};
  const riskColor = {Low:"#22c55e",Medium:"#f59e0b",High:"#ef4444"};

  async function run() {
    if (!candidate.trim()||!role.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try { setResult(await callClaude(apiKey, PROMPTS.followup, `Candidate: ${candidate}\nRole: ${role}\nCurrent Stage: ${stage}`)); }
    catch(e) { setError(e.message||"Generation failed."); }
    finally { setLoading(false); }
  }

  function copy(text, i) { navigator.clipboard.writeText(text); setCopiedIdx(i); setTimeout(()=>setCopiedIdx(null),2000); }

  return (
    <div>
      <PanelHeader title="Auto Follow-Ups 🔁" subtitle="Generate smart follow-up sequences for any candidate at any stage" />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><Label>Candidate Name</Label><input value={candidate} onChange={e=>setCandidate(e.target.value)} placeholder="e.g. Sarah Chen" style={{...textareaStyle,marginBottom:0,padding:"10px 14px",borderRadius:10}}/></div>
        <div><Label>Role</Label><input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Senior Engineer" style={{...textareaStyle,marginBottom:0,padding:"10px 14px",borderRadius:10}}/></div>
      </div>
      <div style={{marginBottom:20}}>
        <Label>Current Stage</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {STAGES.map(s=><button key={s} onClick={()=>setStage(s)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:stage===s?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f0f1a",color:stage===s?"#fff":"#555",border:stage===s?"none":"1px solid #1e1e35",cursor:"pointer"}}>{s}</button>)}
        </div>
      </div>
      <RunButton onClick={run} disabled={loading||!candidate.trim()||!role.trim()} loading={loading} label="Generate Follow-Ups" />
      {loading && <Spinner text="Building your follow-up sequence..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{animation:"fadeUp 0.4s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <Card style={{marginBottom:0}}><Label>Dropout Risk</Label><div style={{fontSize:24,fontWeight:800,color:riskColor[result.dropout_risk],fontFamily:"'Syne',sans-serif"}}>{result.dropout_risk}</div><div style={{fontSize:12,color:"#666",marginTop:4}}>{result.dropout_reason}</div></Card>
            <Card style={{marginBottom:0,borderColor:"#1a2a1a"}}><Label>💡 Nurture Tip</Label><div style={{fontSize:13,color:"#86efac",lineHeight:1.6}}>{result.nurture_tip}</div></Card>
          </div>
          {result.sequences?.map((seq,i)=>(
            <Card key={i} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{channelIcon[seq.channel]||"📧"}</span>
                  <div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{seq.channel} · <span style={{color:"#6366f1"}}>{seq.tone}</span></div><div style={{fontSize:11,color:"#555"}}>Trigger: {seq.trigger}</div></div>
                </div>
                <button onClick={()=>copy(`Subject: ${seq.subject}\n\n${seq.body}`,i)} style={smallBtn}>{copiedIdx===i?"✓ Copied":"Copy"}</button>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:"#a5b4fc",marginBottom:8}}>Subject: {seq.subject}</div>
              <div style={{fontSize:13,color:"#888",lineHeight:1.8,whiteSpace:"pre-line",borderTop:"1px solid #1a1a2e",paddingTop:8}}>{seq.body}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function HiringReports({ apiKey }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const impactColor = {High:"#22c55e",Medium:"#f59e0b",Low:"#888"};
  const effortColor = {High:"#ef4444",Medium:"#f59e0b",Low:"#22c55e"};
  const trendColor = {improving:"#22c55e",stable:"#f59e0b",worsening:"#ef4444"};
  const trendIcon = {improving:"↑",stable:"→",worsening:"↓"};

  async function run() {
    const prompt = input.trim() || "Generate a hiring report for a fast-growing Series B SaaS startup that has been hiring for 6 months across engineering and product. They use LinkedIn, employee referrals, and one recruiting agency.";
    setLoading(true); setResult(null); setError(null);
    try { setResult(await callClaude(apiKey, PROMPTS.report, prompt)); }
    catch(e) { setError(e.message||"Report failed."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PanelHeader title="Hiring Reports 📋" subtitle="Generate full hiring health reports with metrics, charts, and recommendations" />
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={4}
        placeholder={"Describe your hiring context (or leave blank for a sample)...\n\nExample: Q2 report, 20-person startup, screened 80 candidates, 4 roles, 3 hires, avg 24 days. Sources: LinkedIn, referrals."}
        style={textareaStyle} />
      <RunButton onClick={run} disabled={loading} loading={loading} label="Generate Report" />
      {loading && <Spinner text="Building your hiring report..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{animation:"fadeUp 0.4s ease"}}>
          <Card style={{borderColor:"#2a1a5e",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{result.report_title}</div><div style={{color:"#555",fontSize:12,marginTop:4}}>{result.period}</div></div>
              <Badge color="#6366f1">AI GENERATED</Badge>
            </div>
            <div style={{color:"#888",fontSize:13,lineHeight:1.7,marginTop:12,paddingTop:12,borderTop:"1px solid #1e1e35"}}>{result.executive_summary}</div>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"Time to Hire",value:result.metrics?.time_to_hire_days+"d",sub:trendIcon[result.metrics?.time_to_hire_trend]+" "+result.metrics?.time_to_hire_trend,color:trendColor[result.metrics?.time_to_hire_trend]||"#888"},
              {label:"Screened",value:result.metrics?.candidates_screened,sub:"candidates",color:"#6366f1"},
              {label:"Interview→Hire",value:result.metrics?.interview_conversion_rate,sub:"conversion",color:"#22c55e"},
              {label:"Offer Accept",value:result.metrics?.offer_acceptance_rate,sub:"acceptance",color:"#f59e0b"},
            ].map((k,i)=>(
              <Card key={i} style={{textAlign:"center",padding:"14px 10px",marginBottom:0}}>
                <div style={{fontSize:22,fontWeight:800,color:k.color,fontFamily:"'Syne',sans-serif"}}>{k.value}</div>
                <div style={{fontSize:10,color:"#ccc",marginTop:3,fontWeight:600}}>{k.label}</div>
                <div style={{fontSize:10,color:k.color,marginTop:2}}>{k.sub}</div>
              </Card>
            ))}
          </div>
          <Card style={{marginBottom:14}}>
            <Label>Source Performance</Label>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"1px solid #1e1e35"}}>{["Source","Candidates","Hires","Conversion"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#555",fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
              <tbody>
                {result.metrics?.source_performance?.map((s,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #1a1a2e"}}>
                    <td style={{padding:"9px 10px",color:"#fff",fontWeight:500}}>{s.source}</td>
                    <td style={{padding:"9px 10px",color:"#888"}}>{s.candidates}</td>
                    <td style={{padding:"9px 10px",color:"#22c55e",fontWeight:600}}>{s.hires}</td>
                    <td style={{padding:"9px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{height:4,width:50,background:"#1e1e35",borderRadius:2}}><div style={{height:"100%",width:s.conversion,background:"#6366f1",borderRadius:2}}/></div><span style={{color:"#a5b4fc",fontWeight:700}}>{s.conversion}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card style={{marginBottom:0,borderColor:"#1a2a1a"}}><Label>✅ Highlights</Label>{result.highlights?.map((h,i)=><div key={i} style={{fontSize:13,color:"#86efac",padding:"5px 0",borderBottom:"1px solid #1a1a2e"}}>✓ {h}</div>)}</Card>
            <Card style={{marginBottom:0,borderColor:"#2a1a1a"}}><Label>⚠ Risks</Label>{result.risks?.map((r,i)=><div key={i} style={{fontSize:13,color:"#f87171",padding:"5px 0",borderBottom:"1px solid #1a1a2e"}}>⚠ {r}</div>)}</Card>
          </div>
          <Card>
            <Label>Recommendations</Label>
            {result.recommendations?.map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1a1a2e"}}>
                <div style={{fontSize:13,color:"#ccc",flex:1}}>{r.action}</div>
                <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:12}}><Badge color={impactColor[r.impact]||"#888"}>Impact: {r.impact}</Badge><Badge color={effortColor[r.effort]||"#888"}>Effort: {r.effort}</Badge></div>
              </div>
            ))}
          </Card>
          <Card style={{borderColor:"#1a2a3a"}}><Label>🎯 Next 30 Days</Label><div style={{color:"#60a5fa",fontSize:13,lineHeight:1.7}}>{result.next_30_days}</div></Card>
        </div>
      )}
    </div>
  );
}

function JDWriter({ apiKey }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try { setResult(await callClaude(apiKey, PROMPTS.jd, input)); }
    catch(e) { setError(e.message||"Failed."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PanelHeader title="Job Description Writer ✍️" subtitle="Generate compelling, inclusive JDs that attract top talent" />
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={5} placeholder="Describe the role...\n\nExample: Senior Frontend Engineer, B2B SaaS startup, Series B, 100% remote, React + design systems, competitive equity" style={textareaStyle} />
      <RunButton onClick={run} disabled={loading||!input.trim()} loading={loading} label="Generate JD" />
      {loading && <Spinner text="Writing your job description..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{animation:"fadeUp 0.4s ease"}}>
          <Card style={{borderColor:"#2a1a5e"}}><div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:"'Syne',sans-serif"}}>{result.title}</div><div style={{color:"#a5b4fc",fontSize:14,marginTop:6,fontStyle:"italic"}}>{result.tagline}</div><div style={{color:"#6366f1",fontSize:12,marginTop:8,fontWeight:600}}>{result.salary_range}</div></Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <Card><Label>About</Label><div style={prose}>{result.about_company}</div></Card>
              <Card><Label>Role Overview</Label><div style={prose}>{result.role_overview}</div></Card>
              <Card><Label>What We Offer</Label>{result.what_we_offer?.map((b,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>🎁 {b}</div>)}</Card>
            </div>
            <div>
              <Card><Label>Responsibilities</Label>{result.responsibilities?.map((r,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>→ {r}</div>)}</Card>
              <Card><Label>Requirements</Label>{result.requirements?.map((r,i)=><div key={i} style={{fontSize:13,color:"#ccc",padding:"4px 0",borderBottom:"1px solid #1a1a2e"}}>• {r}</div>)}<div style={{marginTop:10}}><Label>Nice to Have</Label>{result.nice_to_have?.map((r,i)=><div key={i} style={{fontSize:12,color:"#666",padding:"3px 0"}}>○ {r}</div>)}</div></Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OutreachPanel({ apiKey }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try { setResult(await callClaude(apiKey, PROMPTS.outreach, input)); }
    catch(e) { setError(e.message||"Failed."); }
    finally { setLoading(false); }
  }

  function copy(text, key) { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),2000); }
  const emails = result?[result.email_1,result.email_2,result.email_3].filter(Boolean):[];

  return (
    <div>
      <PanelHeader title="Outreach Emails 📧" subtitle="Generate 3-touch sequences with high response rates" />
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={5} placeholder="Describe the role and target candidate...\n\nExample: Reaching out to a Senior ML Engineer at FAANG for a Lead AI role at our fintech startup. We offer equity and work on fraud detection at scale." style={textareaStyle} />
      <RunButton onClick={run} disabled={loading||!input.trim()} loading={loading} label="Generate Sequence" />
      {loading && <Spinner text="Writing your outreach sequence..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{animation:"fadeUp 0.4s ease"}}>
          <Card style={{borderColor:"#1a2a1e"}}><Label>Subject Line</Label><div style={{fontSize:16,fontWeight:600,color:"#fff"}}>{result.subject}</div></Card>
          {emails.map((e,i)=>(
            <Card key={i}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Label style={{marginBottom:0}}>{e.label}</Label><button onClick={()=>copy(e.body,i)} style={smallBtn}>{copied===i?"✓ Copied":"Copy"}</button></div>
              <div style={{color:"#ccc",fontSize:13,lineHeight:1.8,whiteSpace:"pre-line"}}>{e.body}</div>
            </Card>
          ))}
          <Card style={{borderColor:"#1a2a3a"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Label style={{marginBottom:0}}>LinkedIn InMail</Label><button onClick={()=>copy(result.linkedin_message,"li")} style={smallBtn}>{copied==="li"?"✓":"Copy"}</button></div>
            <div style={{color:"#ccc",fontSize:13,lineHeight:1.7}}>{result.linkedin_message}</div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ScreeningPanel({ apiKey }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const weightColor = {High:"#6366f1",Medium:"#f59e0b",Low:"#555"};

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try { setResult(await callClaude(apiKey, PROMPTS.screening, input)); }
    catch(e) { setError(e.message||"Failed."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PanelHeader title="Screening Automation 🔍" subtitle="Build structured interview frameworks and scorecards" />
      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={4} placeholder="Enter the job title or role details...\n\nExample: Head of Growth Marketing for a D2C e-commerce brand, $50M ARR, need someone with paid social and retention experience" style={textareaStyle} />
      <RunButton onClick={run} disabled={loading||!input.trim()} loading={loading} label="Build Framework" />
      {loading && <Spinner text="Building your screening framework..." />}
      {error && <ErrorBox msg={error} />}
      {result && !loading && (
        <div style={{animation:"fadeUp 0.4s ease"}}>
          <Card><Label>Screening Questions</Label>{result.screening_questions?.map((q,i)=><div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #1a1a2e"}}><div style={{fontSize:13,color:"#fff",fontWeight:500,marginBottom:4}}>Q{i+1}: {q.question}</div><div style={{fontSize:12,color:"#666"}}>👂 {q.what_to_listen_for}</div></div>)}</Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card><Label>Scorecard</Label>{result.scorecard?.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #1a1a2e"}}><div style={{fontSize:13,color:"#ccc"}}>{s.criteria}</div><Badge color={weightColor[s.weight]||"#888"}>{s.weight}</Badge></div>)}</Card>
            <div>
              <Card><Label>✅ Green Flags</Label>{result.green_flags?.map((f,i)=><div key={i} style={{fontSize:13,color:"#86efac",padding:"3px 0"}}>✓ {f}</div>)}</Card>
              <Card><Label>❌ Disqualifiers</Label>{result.disqualifiers?.map((f,i)=><div key={i} style={{fontSize:13,color:"#f87171",padding:"3px 0"}}>✗ {f}</div>)}</Card>
            </div>
          </div>
          <Card style={{borderColor:"#2a2a1a"}}><Label>⚡ Speed Tip</Label><div style={{color:"#fcd34d",fontSize:13,lineHeight:1.6}}>{result.time_to_hire_tip}</div></Card>
        </div>
      )}
    </div>
  );
}

function ATSSync() {
  const [ats, setAts] = useState([
    {id:"greenhouse",name:"Greenhouse",logo:"🌱",connected:false,synced:null,candidates:0,jobs:0},
    {id:"lever",     name:"Lever",      logo:"⚙️", connected:false,synced:null,candidates:0,jobs:0},
    {id:"ashby",     name:"Ashby",      logo:"🔷",connected:false,synced:null,candidates:0,jobs:0},
    {id:"workday",   name:"Workday",    logo:"☁️", connected:false,synced:null,candidates:0,jobs:0},
    {id:"icims",     name:"iCIMS",      logo:"🔵",connected:false,synced:null,candidates:0,jobs:0},
    {id:"smartrec",  name:"SmartRecruiters",logo:"⚡",connected:false,synced:null,candidates:0,jobs:0},
  ]);
  const [connecting, setConnecting] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const connected = ats.filter(a=>a.connected);

  async function toggle(id) {
    const cur = ats.find(a=>a.id===id);
    if (cur.connected) { setAts(p=>p.map(a=>a.id===id?{...a,connected:false,synced:null,candidates:0,jobs:0}:a)); return; }
    setConnecting(id);
    await new Promise(r=>setTimeout(r,1800));
    setAts(p=>p.map(a=>a.id===id?{...a,connected:true,synced:"just now",candidates:Math.floor(Math.random()*200+50),jobs:Math.floor(Math.random()*15+3)}:a));
    setConnecting(null);
  }

  async function syncNow(id) {
    setSyncing(id);
    await new Promise(r=>setTimeout(r,1500));
    setAts(p=>p.map(a=>a.id===id?{...a,synced:"just now",candidates:a.candidates+Math.floor(Math.random()*10)}:a));
    setSyncing(null);
  }

  return (
    <div>
      <PanelHeader title="ATS Integration 🔗" subtitle="Connect your recruiting stack — sync candidates and jobs automatically" />
      {connected.length>0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
          {[{label:"Total Candidates",value:connected.reduce((s,a)=>s+a.candidates,0)},{label:"Active Jobs",value:connected.reduce((s,a)=>s+a.jobs,0)},{label:"Connected ATSes",value:connected.length}].map((s,i)=>(
            <Card key={i} style={{textAlign:"center",padding:"16px 12px",marginBottom:0}}><div style={{fontSize:28,fontWeight:800,color:"#a5b4fc",fontFamily:"'Syne',sans-serif"}}>{s.value}</div><div style={{fontSize:11,color:"#555",marginTop:4}}>{s.label}</div></Card>
          ))}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {ats.map(a=>(
          <Card key={a.id} style={{marginBottom:0,borderColor:a.connected?"#1e2a3a":"#1e1e35"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:26}}>{a.logo}</div>
                <div><div style={{fontWeight:600,color:"#fff",fontSize:14}}>{a.name}</div>{a.connected?<div style={{fontSize:11,color:"#22c55e",marginTop:2}}>● Connected · {a.synced}</div>:<div style={{fontSize:11,color:"#555",marginTop:2}}>Not connected</div>}</div>
              </div>
              <button onClick={()=>toggle(a.id)} disabled={connecting===a.id} style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:a.connected?"#1a1a2e":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:a.connected?"#f87171":"#fff",opacity:connecting===a.id?0.6:1}}>
                {connecting===a.id?"Connecting...":a.connected?"Disconnect":"Connect"}
              </button>
            </div>
            {a.connected && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1e1e35"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:16}}><div style={{fontSize:12,color:"#888"}}><span style={{color:"#a5b4fc",fontWeight:700}}>{a.candidates}</span> candidates</div><div style={{fontSize:12,color:"#888"}}><span style={{color:"#a5b4fc",fontWeight:700}}>{a.jobs}</span> jobs</div></div>
                  <button onClick={()=>syncNow(a.id)} disabled={syncing===a.id} style={{...smallBtn,opacity:syncing===a.id?0.6:1}}>{syncing===a.id?"Syncing...":"↻ Sync"}</button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Card style={{marginTop:6,borderColor:"#1a2a1a"}}>
        <Label>Webhook Endpoint</Label>
        <div style={{background:"#080810",borderRadius:8,padding:"12px 14px",fontFamily:"monospace",fontSize:12,color:"#86efac"}}>
          POST https://hireiq.app/api/webhooks/ats<br/>
          <span style={{color:"#555"}}>Authorization: Bearer {"<YOUR_API_KEY>"}</span>
        </div>
      </Card>
    </div>
  );
}

function TeamPanel({ analyzedCandidates }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [teamMembers] = useState([
    {id:1,name:"You",avatar:"YO",color:"#f59e0b",active:true,role:"Recruiter"},
  ]);

  const candidateNames = analyzedCandidates.map(c=>c.name).filter(Boolean);
  useEffect(()=>{ if(candidateNames.length>0&&!selectedCandidate) setSelectedCandidate(candidateNames[0]); },[analyzedCandidates]);

  function postComment() {
    if (!newComment.trim()||!selectedCandidate) return;
    setComments(p=>[{id:Date.now(),author:"You",avatar:"YO",color:"#f59e0b",time:"just now",text:newComment,candidate:selectedCandidate},...p]);
    setNewComment("");
  }

  return (
    <div>
      <PanelHeader title="Team Collaboration 👥" subtitle="Review candidates together and align on decisions" />
      {analyzedCandidates.length===0 ? (
        <Card style={{textAlign:"center",padding:"48px 24px",borderStyle:"dashed"}}>
          <div style={{fontSize:40,marginBottom:12}}>📄</div>
          <div style={{color:"#ccc",fontSize:14,fontWeight:500,marginBottom:8}}>No candidates yet</div>
          <div style={{color:"#555",fontSize:13}}>Analyze resumes first — they'll appear here for team review.</div>
        </Card>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:20}}>
            {analyzedCandidates.map((c,i)=>{
              const recColor = {"Strong Hire":"#22c55e","Hire":"#84cc16","Maybe":"#f59e0b","Pass":"#ef4444"};
              return (
                <Card key={i} onClick={()=>setSelectedCandidate(c.name)} style={{marginBottom:0,cursor:"pointer",borderColor:selectedCandidate===c.name?"#6366f1":"#1e1e35",padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:4}}>{c.name}</div>
                  <div style={{fontSize:11,color:"#666",marginBottom:6}}>{c.title}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <Badge color={recColor[c.recommendation]||"#888"}>{c.recommendation}</Badge>
                    <span style={{fontSize:12,fontWeight:700,color:"#a5b4fc"}}>{c.fit_score}</span>
                  </div>
                </Card>
              );
            })}
          </div>
          {selectedCandidate && (
            <Card>
              <Label>Comments — {selectedCandidate}</Label>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} rows={2} placeholder={`Add your assessment of ${selectedCandidate}...`} style={{...textareaStyle,marginBottom:0,flex:1,resize:"none"}} onKeyDown={e=>{if(e.key==="Enter"&&e.metaKey)postComment()}} />
                <button onClick={postComment} disabled={!newComment.trim()} style={{padding:"0 16px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,opacity:!newComment.trim()?0.5:1}}>Post</button>
              </div>
              {comments.filter(c=>c.candidate===selectedCandidate).length===0
                ? <div style={{fontSize:13,color:"#444",textAlign:"center",padding:"20px 0"}}>No comments yet. Be the first to weigh in.</div>
                : comments.filter(c=>c.candidate===selectedCandidate).map(c=>(
                    <div key={c.id} style={{display:"flex",gap:10,marginBottom:14,paddingBottom:14,borderBottom:"1px solid #1a1a2e"}}>
                      <Avatar initials={c.avatar} color={c.color} size={30}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:600,color:"#ccc"}}>{c.author}</span><span style={{fontSize:11,color:"#444"}}>{c.time}</span></div>
                        <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>{c.text}</div>
                      </div>
                    </div>
                  ))
              }
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AnalyticsPanel({ analyzedCandidates }) {
  const total = analyzedCandidates.length;
  const scores = analyzedCandidates.map(c=>c.fit_score||0);
  const avgScore = total>0 ? (scores.reduce((a,b)=>a+b,0)/total).toFixed(1) : "—";
  const strongHires = analyzedCandidates.filter(c=>["Strong Hire","Hire"].includes(c.recommendation)).length;
  const hireRate = total>0 ? ((strongHires/total)*100).toFixed(0)+"%" : "—";

  const scoreGroups = {
    "90-100": analyzedCandidates.filter(c=>c.fit_score>=90).length,
    "75-89":  analyzedCandidates.filter(c=>c.fit_score>=75&&c.fit_score<90).length,
    "60-74":  analyzedCandidates.filter(c=>c.fit_score>=60&&c.fit_score<75).length,
    "Below 60": analyzedCandidates.filter(c=>c.fit_score<60).length,
  };
  const scoreDistData = Object.entries(scoreGroups).map(([range,count])=>({range,count}));

  const skillFreq = {};
  analyzedCandidates.forEach(c=>c.top_skills?.forEach(s=>{ skillFreq[s]=(skillFreq[s]||0)+1; }));
  const topSkillsData = Object.entries(skillFreq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([skill,count])=>({skill,count}));

  const recBreakdown = [
    {label:"Strong Hire",count:analyzedCandidates.filter(c=>c.recommendation==="Strong Hire").length,color:"#22c55e"},
    {label:"Hire",       count:analyzedCandidates.filter(c=>c.recommendation==="Hire").length,       color:"#84cc16"},
    {label:"Maybe",      count:analyzedCandidates.filter(c=>c.recommendation==="Maybe").length,      color:"#f59e0b"},
    {label:"Pass",       count:analyzedCandidates.filter(c=>c.recommendation==="Pass").length,       color:"#ef4444"},
  ].filter(r=>r.count>0);

  if (total===0) return (
    <div>
      <PanelHeader title="Analytics 📊" subtitle="Your hiring insights will appear here as you analyze candidates" />
      <Card style={{textAlign:"center",padding:"48px 24px",borderStyle:"dashed"}}>
        <div style={{fontSize:40,marginBottom:12}}>📊</div>
        <div style={{color:"#ccc",fontSize:14,fontWeight:500,marginBottom:8}}>No data yet</div>
        <div style={{color:"#555",fontSize:13}}>Start analyzing resumes — your analytics dashboard will populate automatically.</div>
      </Card>
    </div>
  );

  return (
    <div>
      <PanelHeader title="Analytics 📊" subtitle="Live insights from your candidate pool" />
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Total Analyzed", value:total,        color:"#6366f1"},
          {label:"Avg AI Score",   value:avgScore,     color:"#f59e0b"},
          {label:"Hire Rate",      value:hireRate,     color:"#22c55e"},
          {label:"Strong Hires",   value:strongHires,  color:"#8b5cf6"},
        ].map((s,i)=>(
          <Card key={i} style={{textAlign:"center",padding:"16px 10px",marginBottom:0}}>
            <div style={{fontSize:26,fontWeight:800,color:s.color,fontFamily:"'Syne',sans-serif"}}>{s.value}</div>
            <div style={{fontSize:11,color:"#ccc",marginTop:4,fontWeight:500}}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Card style={{marginBottom:0}}>
          <Label>Score Distribution</Label>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={scoreDistData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35"/>
              <XAxis dataKey="range" tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:8,fontSize:11}}/>
              <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Candidates"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{marginBottom:0}}>
          <Label>Recommendation Breakdown</Label>
          {recBreakdown.length>0 ? (
            <div style={{marginTop:8}}>
              {recBreakdown.map((r,i)=>(
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#ccc"}}>{r.label}</span>
                    <span style={{fontSize:12,color:r.color,fontWeight:700}}>{r.count} <span style={{color:"#555",fontWeight:400}}>({total>0?((r.count/total)*100).toFixed(0):0}%)</span></span>
                  </div>
                  <div style={{height:6,background:"#1e1e35",borderRadius:3}}>
                    <div style={{height:"100%",width:`${total>0?(r.count/total)*100:0}%`,background:r.color,borderRadius:3,transition:"width 0.8s ease"}}/>
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{fontSize:13,color:"#555",marginTop:20}}>Analyze more candidates to see breakdown.</div>}
        </Card>
      </div>

      {topSkillsData.length>0 && (
        <Card>
          <Label>Top Skills in Your Candidate Pool</Label>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topSkillsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35"/>
              <XAxis type="number" allowDecimals={false} tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="skill" tick={{fill:"#888",fontSize:11}} axisLine={false} tickLine={false} width={80}/>
              <Tooltip contentStyle={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:8,fontSize:11}}/>
              <Bar dataKey="count" fill="#8b5cf6" radius={[0,4,4,0]} name="Candidates"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {analyzedCandidates.length>0 && (
        <Card>
          <Label>All Candidates — Score vs Recommendation</Label>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35"/>
              <XAxis type="number" dataKey="fit_score" name="Score" domain={[0,100]} tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="number" dataKey="idx" name="" hide/>
              <Tooltip contentStyle={{background:"#0f0f1a",border:"1px solid #1e1e35",borderRadius:8,fontSize:11}} formatter={(v,n,p)=>[p.payload.name+" · "+p.payload.recommendation,""]}/>
              <Scatter data={analyzedCandidates.map((c,i)=>({...c,idx:i+1}))} fill="#6366f1" opacity={0.85}/>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("hireiq_api_key")||""; } catch { return ""; }
  });
  const [active, setActive] = useState("analyzer");
  const [analyzedCandidates, setAnalyzedCandidates] = useState([]);

  function saveKey(key) {
    try { localStorage.setItem("hireiq_api_key", key); } catch {}
    setApiKey(key);
  }

  function onAnalyzed(candidate) {
    setAnalyzedCandidates(p => {
      const exists = p.find(c=>c.name===candidate.name);
      if (exists) return p.map(c=>c.name===candidate.name?candidate:c);
      return [...p, candidate];
    });
  }

  if (!apiKey) return <Onboarding onSave={saveKey} />;

  const props = { apiKey, analyzedCandidates, onAnalyzed };

  const panels = {
    analyzer:  <ResumeAnalyzer {...props} />,
    bulk:      <BulkUpload {...props} />,
    ranking:   <AIRanking {...props} />,
    matcher:   <JDMatcher {...props} />,
    followups: <AutoFollowUps {...props} />,
    reports:   <HiringReports {...props} />,
    jd:        <JDWriter {...props} />,
    outreach:  <OutreachPanel {...props} />,
    screening: <ScreeningPanel {...props} />,
    ats:       <ATSSync />,
    team:      <TeamPanel {...props} />,
    analytics: <AnalyticsPanel {...props} />,
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#e8e6f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#0a0a0f; }
        ::-webkit-scrollbar-thumb { background:#2a2a3f; border-radius:2px; }
        textarea:focus,input:focus { outline:none !important; border-color:#6366f1 !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        button:hover { opacity:0.9; }
      `}</style>

      {/* Top bar */}
      <div style={{ borderBottom:"1px solid #1a1a2e", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#0a0a0f", zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, letterSpacing:"-0.02em", color:"#fff" }}>HireIQ <span style={{color:"#6366f1"}}>Agent</span></div>
            <div style={{ fontSize:10, color:"#444" }}>AI Recruiting Platform</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {analyzedCandidates.length>0 && <div style={{ fontSize:11, color:"#555" }}>{analyzedCandidates.length} candidate{analyzedCandidates.length!==1?"s":""} analyzed</div>}
          <div style={{ padding:"5px 12px", borderRadius:16, background:"#0f0f1a", border:"1px solid #1e1e35", fontSize:11, color:"#6366f1", fontWeight:600 }}>● LIVE</div>
          <button onClick={()=>{try{localStorage.removeItem("hireiq_api_key")}catch{}setApiKey("");}} style={{...smallBtn,fontSize:10,color:"#444"}}>Sign out</button>
        </div>
      </div>

      <div style={{ display:"flex" }}>
        {/* Sidebar */}
        <div style={{ width:196, borderRight:"1px solid #1a1a2e", padding:"18px 10px", minHeight:"calc(100vh - 61px)", position:"sticky", top:61, alignSelf:"flex-start" }}>
          <div style={{ fontSize:9, color:"#2a2a3f", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8, paddingLeft:6 }}>Workspace</div>
          {NAV_ITEMS.map(item=>{
            const isActive = active===item.id;
            return (
              <button key={item.id} onClick={()=>setActive(item.id)} style={{ width:"100%", padding:"9px 10px", borderRadius:8, marginBottom:2, background:isActive?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent", color:isActive?"#fff":"#666", fontSize:12, fontWeight:isActive?600:400, textAlign:"left", display:"flex", alignItems:"center", gap:8, border:"none", cursor:"pointer", transition:"all 0.15s" }}>
                <span style={{fontSize:13}}>{item.icon}</span>
                {item.label}
                {item.id==="analytics"&&analyzedCandidates.length>0 && <span style={{marginLeft:"auto",fontSize:9,background:"#6366f122",color:"#6366f1",padding:"1px 5px",borderRadius:10,fontWeight:700}}>{analyzedCandidates.length}</span>}
                {item.id==="team"&&analyzedCandidates.length>0 && <span style={{marginLeft:"auto",fontSize:9,background:"#22c55e22",color:"#22c55e",padding:"1px 5px",borderRadius:10,fontWeight:700}}>{analyzedCandidates.length}</span>}
              </button>
            );
          })}
          {analyzedCandidates.length>0 && (
            <div style={{ marginTop:16, padding:10, background:"#0d0d18", borderRadius:8, border:"1px solid #1a1a2e" }}>
              <div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:6}}>Pool Summary</div>
              <div style={{fontSize:11,color:"#888"}}>{analyzedCandidates.length} analyzed</div>
              <div style={{fontSize:11,color:"#22c55e",marginTop:3}}>{analyzedCandidates.filter(c=>["Strong Hire","Hire"].includes(c.recommendation)).length} recommend hire</div>
              {analyzedCandidates.length>0 && <div style={{fontSize:11,color:"#f59e0b",marginTop:3}}>Avg score: {(analyzedCandidates.reduce((a,c)=>a+(c.fit_score||0),0)/analyzedCandidates.length).toFixed(0)}</div>}
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex:1, padding:"32px 36px", maxWidth:920, overflowY:"auto" }}>
          {panels[active]}
        </div>
      </div>
    </div>
  );
}
