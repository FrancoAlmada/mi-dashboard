import { useState, useEffect } from "react";

const PALETTE = {
  bg:       "#fdf6ec",
  surface:  "#fef9f3",
  border:   "#e8d9c4",
  border2:  "#d4c0a0",
  text:     "#3d2f1e",
  muted:    "#9c8570",
  faint:    "#c4aa8a",
};

const HABITS = [
  { id: 0, name: "Dormir 7hrs",        icon: "🛏️", color: "#b08d6e", light: "#f3e8dc" },
  { id: 1, name: "Comer Saludable",    icon: "🍎", color: "#7a9e7e", light: "#e4f0e5" },
  { id: 2, name: "Higiene",            icon: "🫧", color: "#7ea8b8", light: "#deedf4" },
  { id: 3, name: "No FAP",             icon: "🚫", color: "#b07878", light: "#f2e2e2" },
  { id: 4, name: "3hr de Celu",        icon: "📵", color: "#c8a05e", light: "#f7edda" },
  { id: 5, name: "Ejercicio",          icon: "🏋️", color: "#9b7eb8", light: "#ede4f5" },
  { id: 6, name: "UNI 90min",          icon: "📖", color: "#6e96b0", light: "#ddeaf4" },
  { id: 7, name: "30min Aprendizaje",  icon: "✏️", color: "#7dab8a", light: "#e2f0e6" },
  { id: 8, name: "1 Prioridad del día",icon: "⭐", color: "#c49a45", light: "#faf0d7" },
];

const DS = ["L","M","X","J","V","S","D"];
const DF = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const MN = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function getMonday() {
  const n = new Date(), d = n.getDay();
  const m = new Date(n); m.setDate(n.getDate() + (d===0?-6:1-d)); m.setHours(0,0,0,0);
  return m;
}
function getWeekKey() {
  const m = getMonday();
  return `wk_${m.getFullYear()}_${m.getMonth()}_${m.getDate()}`;
}
function getWeekDates() {
  const m = getMonday();
  return Array.from({length:7},(_,i)=>{ const d=new Date(m); d.setDate(m.getDate()+i); return d; });
}
function getTodayIdx() { const d=new Date().getDay(); return d===0?6:d-1; }
const mkDefault = () => ({ checks: Array.from({length:9},()=>Array(7).fill(false)), priorities: Array(7).fill("") });

function Ring({ pct, color, size=34 }) {
  const r=(size-5)/2, circ=2*Math.PI*r, dash=(pct/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={PALETTE.border} strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 0.4s ease"}}/>
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(mkDefault());
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(getTodayIdx());
  const [view, setView] = useState("day");
  const weekKey = getWeekKey();
  const dates = getWeekDates();
  const todayIdx = getTodayIdx();

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(weekKey);
        if (r) {
          const p = JSON.parse(r.value);
          while (p.checks.length < 9) p.checks.push(Array(7).fill(false));
          setData(p);
        }
      } catch {}
      setLoading(false);
    })();
  }, [weekKey]);

  const save = async (nd) => { setData(nd); try { await window.storage.set(weekKey, JSON.stringify(nd)); } catch {} };
  const toggle = (hId, dIdx) => save({ ...data, checks: data.checks.map((r,i)=>i===hId?r.map((v,j)=>j===dIdx?!v:v):r) });
  const setP = (dIdx, txt) => save({ ...data, priorities: data.priorities.map((p,i)=>i===dIdx?txt:p) });

  const dayTotals = Array.from({length:7},(_,d)=>data.checks.filter(r=>r[d]).length);
  const habTotals = data.checks.map(r=>r.filter(Boolean).length);
  const total = data.checks.flat().filter(Boolean).length;
  const pctAll = Math.round((total/63)*100);
  const dr = `${dates[0].getDate()} ${MN[dates[0].getMonth()]} — ${dates[6].getDate()} ${MN[dates[6].getMonth()]}`;

  if (loading) return (
    <div style={{background:PALETTE.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:PALETTE.faint,fontFamily:"Georgia,serif",fontSize:13}}>
      Cargando...
    </div>
  );

  return (
    <div style={{background:PALETTE.bg,minHeight:"100vh",fontFamily:"'Georgia',serif",color:PALETTE.text,maxWidth:500,margin:"0 auto",paddingBottom:48}}>

      {/* ── HEADER ── */}
      <div style={{padding:"28px 20px 20px",borderBottom:`1px solid ${PALETTE.border}`}}>
        <div style={{fontSize:10,color:PALETTE.faint,letterSpacing:3,textTransform:"uppercase",marginBottom:4,fontFamily:"system-ui,sans-serif"}}>Tracker Semanal</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
          <div style={{fontSize:20,fontWeight:700,color:PALETTE.text,letterSpacing:-0.3}}>{dr}</div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:34,fontWeight:800,color:"#c49a45",lineHeight:1}}>{pctAll}%</div>
            <div style={{fontSize:10,color:PALETTE.faint,fontFamily:"system-ui,sans-serif",marginTop:1}}>completado</div>
          </div>
        </div>
        <div style={{background:PALETTE.border,borderRadius:99,height:3,overflow:"hidden"}}>
          <div style={{background:"linear-gradient(90deg,#c49a45,#b07878,#9b7eb8)",width:`${pctAll}%`,height:"100%",borderRadius:99,transition:"width 0.5s ease"}}/>
        </div>
      </div>

      {/* ── VIEW TOGGLE ── */}
      <div style={{display:"flex",margin:"14px 16px 0",background:PALETTE.surface,borderRadius:10,padding:3,gap:2,border:`1px solid ${PALETTE.border}`}}>
        {[["day","Vista Día"],["week","Vista Semana"]].map(([v,lbl])=>(
          <button key={v} onClick={()=>setView(v)} style={{
            flex:1,padding:"7px",borderRadius:8,border:"none",cursor:"pointer",
            background:view===v?PALETTE.bg:"transparent",
            color:view===v?PALETTE.text:PALETTE.faint,
            fontSize:12,fontWeight:600,transition:"all 0.2s",
            fontFamily:"system-ui,sans-serif",
            boxShadow:view===v?`0 1px 4px ${PALETTE.border2}44`:"none",
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── DAY SCROLLER ── */}
      <div style={{display:"flex",gap:6,padding:"12px 16px",overflowX:"auto",scrollbarWidth:"none"}}>
        {dates.map((date,i)=>{
          const isT=i===todayIdx, isA=i===activeDay;
          const pct=Math.round((dayTotals[i]/9)*100);
          return (
            <button key={i} onClick={()=>setActiveDay(i)} style={{
              flex:"0 0 auto",borderRadius:14,padding:"9px 8px",cursor:"pointer",textAlign:"center",minWidth:48,
              background:isA?"#c49a45":PALETTE.surface,
              border:isT&&!isA?`1.5px solid #c49a45`:`1px solid ${PALETTE.border}`,
              color:isA?"#fff":PALETTE.muted,
              transition:"all 0.2s",
              boxShadow:isA?"0 2px 8px #c49a4530":"none",
            }}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,fontFamily:"system-ui,sans-serif"}}>{DS[i]}</div>
              <div style={{fontSize:17,fontWeight:700,margin:"3px 0",fontFamily:"system-ui,sans-serif"}}>{date.getDate()}</div>
              <div style={{position:"relative",width:34,height:34,margin:"0 auto"}}>
                <Ring pct={pct} color={isA?"rgba(255,255,255,0.9)":"#c49a45"} size={34}/>
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:9,fontWeight:700,color:isA?"rgba(255,255,255,0.9)":"#c49a45",fontFamily:"system-ui,sans-serif"}}>
                  {dayTotals[i]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {view==="day" ? (
        <div style={{padding:"0 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"2px 2px 10px"}}>
            <span style={{fontSize:15,fontWeight:600}}>{DF[activeDay]}</span>
            {activeDay===todayIdx&&<span style={{fontSize:9,background:"#c49a45",color:"#fff",padding:"2px 8px",borderRadius:99,fontWeight:700,letterSpacing:0.5,fontFamily:"system-ui,sans-serif"}}>HOY</span>}
            <span style={{marginLeft:"auto",fontSize:12,color:PALETTE.faint,fontFamily:"system-ui,sans-serif"}}>{dayTotals[activeDay]}/9</span>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {HABITS.map(h=>{
              const done=data.checks[h.id][activeDay];
              const isPrio=h.id===8;
              return (
                <div key={h.id} style={{
                  background:done?h.light:PALETTE.surface,
                  border:`1px solid ${done?h.color+"55":PALETTE.border}`,
                  borderRadius:13,overflow:"hidden",transition:"all 0.2s",
                }}>
                  <div onClick={()=>toggle(h.id,activeDay)} style={{
                    padding:isPrio?"12px 14px 8px":"12px 14px",
                    display:"flex",alignItems:"center",gap:11,cursor:"pointer",
                  }}>
                    <span style={{fontSize:17,flexShrink:0,lineHeight:1}}>{h.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:done?PALETTE.text:PALETTE.muted,marginBottom:5,fontFamily:"system-ui,sans-serif"}}>{h.name}</div>
                      <div style={{display:"flex",gap:4}}>
                        {Array.from({length:7},(_,d)=>(
                          <div key={d} style={{
                            width:6,height:6,borderRadius:"50%",
                            background:data.checks[h.id][d]?h.color:PALETTE.border,
                            border:d===activeDay?`1.5px solid ${h.color}`:"none",
                            transition:"all 0.15s",
                          }}/>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      width:22,height:22,borderRadius:6,flexShrink:0,
                      background:done?h.color:"transparent",
                      border:`2px solid ${done?h.color:PALETTE.border2}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      transition:"all 0.2s",
                    }}>
                      {done&&<span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
                    </div>
                  </div>
                  {isPrio&&(
                    <div style={{padding:"0 14px 12px"}}>
                      <input
                        value={data.priorities[activeDay]}
                        onChange={e=>setP(activeDay,e.target.value)}
                        onClick={e=>e.stopPropagation()}
                        placeholder="Escribí tu prioridad principal de hoy..."
                        style={{
                          width:"100%",background:PALETTE.bg,
                          border:`1px solid ${PALETTE.border}`,
                          borderRadius:8,padding:"8px 11px",color:PALETTE.text,
                          fontSize:12,outline:"none",boxSizing:"border-box",
                          fontFamily:"Georgia,serif",
                        }}
                        onFocus={e=>e.target.style.borderColor=PALETTE.border2}
                        onBlur={e=>e.target.style.borderColor=PALETTE.border}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{padding:"8px 14px 24px",overflowX:"auto"}}>
          <div style={{minWidth:360}}>
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 3px"}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",fontSize:10,color:PALETTE.faint,fontWeight:500,paddingBottom:10,paddingRight:8,fontFamily:"system-ui,sans-serif"}}></th>
                  {DS.map((d,i)=>(
                    <th key={i} onClick={()=>{setActiveDay(i);setView("day");}} style={{
                      textAlign:"center",fontSize:10,cursor:"pointer",
                      fontWeight:i===todayIdx?700:500,
                      color:i===todayIdx?"#c49a45":PALETTE.faint,
                      paddingBottom:10,width:34,fontFamily:"system-ui,sans-serif",
                    }}>{d}</th>
                  ))}
                  <th style={{textAlign:"center",fontSize:10,color:PALETTE.faint,fontWeight:500,paddingBottom:10,paddingLeft:6,fontFamily:"system-ui,sans-serif"}}>sem</th>
                </tr>
              </thead>
              <tbody>
                {HABITS.map(h=>(
                  <tr key={h.id}>
                    <td style={{paddingRight:8,paddingBottom:4}}>
                      <span style={{fontSize:11,color:PALETTE.muted,whiteSpace:"nowrap",fontFamily:"system-ui,sans-serif"}}>
                        {h.icon} {h.name.length>14?h.name.slice(0,13)+"…":h.name}
                      </span>
                    </td>
                    {Array.from({length:7},(_,d)=>(
                      <td key={d} style={{textAlign:"center",paddingBottom:4}}>
                        <div onClick={()=>toggle(h.id,d)} style={{
                          width:22,height:22,borderRadius:6,margin:"0 auto",cursor:"pointer",
                          background:data.checks[h.id][d]?h.color:PALETTE.surface,
                          border:d===todayIdx?`1.5px solid ${h.color}`:`1px solid ${PALETTE.border}`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          transition:"all 0.15s",
                        }}>
                          {data.checks[h.id][d]&&<span style={{fontSize:11,color:"#fff",fontWeight:700}}>✓</span>}
                        </div>
                      </td>
                    ))}
                    <td style={{textAlign:"center",paddingBottom:4,paddingLeft:6}}>
                      <span style={{fontSize:11,fontWeight:700,fontFamily:"system-ui,sans-serif",
                        color:habTotals[h.id]===7?"#7a9e7e":habTotals[h.id]>=5?"#c49a45":habTotals[h.id]>=3?"#b07878":PALETTE.faint
                      }}>{habTotals[h.id]}/7</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{paddingTop:10,fontSize:10,color:PALETTE.faint,borderTop:`1px solid ${PALETTE.border}`,paddingRight:8,fontFamily:"system-ui,sans-serif"}}>Total</td>
                  {dayTotals.map((t,i)=>(
                    <td key={i} style={{textAlign:"center",paddingTop:10,borderTop:`1px solid ${PALETTE.border}`}}>
                      <span style={{fontSize:11,fontWeight:700,color:i===todayIdx?"#c49a45":PALETTE.muted,fontFamily:"system-ui,sans-serif"}}>{t}</span>
                    </td>
                  ))}
                  <td style={{borderTop:`1px solid ${PALETTE.border}`,paddingTop:10,paddingLeft:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#c49a45",fontFamily:"system-ui,sans-serif"}}>{total}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{marginTop:20,background:PALETTE.surface,borderRadius:12,padding:"14px",border:`1px solid ${PALETTE.border}`}}>
            <div style={{fontSize:10,color:PALETTE.faint,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontFamily:"system-ui,sans-serif"}}>Prioridades de la semana</div>
            {data.priorities.map((p,i)=>(
              p ? (
                <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                  <span style={{fontSize:10,color:i===todayIdx?"#c49a45":PALETTE.faint,fontWeight:700,minWidth:16,paddingTop:1,fontFamily:"system-ui,sans-serif"}}>{DS[i]}</span>
                  <span style={{fontSize:12,color:PALETTE.muted}}>{p}</span>
                </div>
              ) : null
            ))}
            {!data.priorities.some(Boolean)&&<div style={{fontSize:12,color:PALETTE.border2,fontFamily:"system-ui,sans-serif"}}>Sin prioridades registradas aún.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
