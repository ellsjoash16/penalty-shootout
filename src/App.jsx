import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ZONES = ['tl','tc','tr','bl','bc','br'];
const ZONE_LABELS = { tl:'Top Left', tc:'Top Centre', tr:'Top Right', bl:'Bottom Left', bc:'Bottom Centre', br:'Bottom Right' };
const ZONE_ICONS = { tl:'↖', tc:'↑', tr:'↗', bl:'↙', bc:'↓', br:'↘' };
const ZONE_POS = {
  tl:{x:16,y:23}, tc:{x:50,y:23}, tr:{x:84,y:23},
  bl:{x:16,y:66}, bc:{x:50,y:66}, br:{x:84,y:66},
};
const TOTAL_KICKS = 6;
const CHOOSE_TIME = 9; // seconds shown on client countdown

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const rz = () => ZONES[Math.floor(Math.random() * ZONES.length)];

const api = async (path, body) => {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: `${r.status} @ ${location.origin}${path}` }; }
};

// ═══════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════

const CSS = `
  @keyframes stampIn {
    0% { transform: translate(-50%,-50%) scale(3) rotate(-8deg); opacity: 0; }
    40% { transform: translate(-50%,-50%) scale(0.88) rotate(2deg); opacity: 1; }
    65% { transform: translate(-50%,-50%) scale(1.04) rotate(-1deg); }
    100% { transform: translate(-50%,-50%) scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes floatBob {
    0%,100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes confettiFall {
    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(105vh) rotate(900deg); opacity: 0; }
  }
  @keyframes pulseGreen {
    0%,100% { box-shadow: 0 0 0 0 rgba(0,230,118,0); }
    50% { box-shadow: 0 0 30px 8px rgba(0,230,118,0.25); }
  }
  @keyframes scaleIn {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes timerUrgent {
    0%,100% { color: #ff4444; transform: scale(1); }
    50% { color: #ff0000; transform: scale(1.15); }
  }
  @keyframes goalFlashBg {
    0% { background: rgba(0,230,118,0); }
    15% { background: rgba(0,230,118,0.12); }
    100% { background: rgba(0,230,118,0); }
  }
  @keyframes savedFlashBg {
    0% { background: rgba(255,23,68,0); }
    15% { background: rgba(255,23,68,0.1); }
    100% { background: rgba(255,23,68,0); }
  }
  @keyframes scorePopIn {
    0% { transform: scale(0.5) translateY(8px); opacity: 0; }
    60% { transform: scale(1.15) translateY(-2px); }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes netBulge {
    0% { transform: scaleX(1) scaleY(1); }
    25% { transform: scaleX(1.03) scaleY(1.05); }
    100% { transform: scaleX(1) scaleY(1); }
  }
  @keyframes fadeSlideUp {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes kickDot {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#root { height:100%; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
  input { font-family: inherit; }
  button { font-family: inherit; }
  .zone-btn {
    cursor: pointer; border-radius: 8px; display:flex;
    flex-direction:column; align-items:center; justify-content:center;
    transition: all 0.12s ease; user-select:none; position:relative; overflow:hidden;
    border: 1.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.4);
    gap: 2px;
  }
  .zone-btn:hover:not(:disabled) {
    border-color: rgba(0,230,118,0.7);
    background: rgba(0,230,118,0.1);
    color: #00e676;
    transform: scale(1.04);
    box-shadow: 0 0 16px rgba(0,230,118,0.2);
  }
  .zone-btn.selected {
    border-color: #00e676;
    background: rgba(0,230,118,0.18);
    color: #00e676;
    box-shadow: 0 0 22px rgba(0,230,118,0.35);
    animation: pulseGreen 1.5s ease infinite;
  }
  .zone-btn:disabled { cursor: default; pointer-events: none; }
  .zone-btn.keeper-sel {
    border-color: #ff6b35;
    background: rgba(255,107,53,0.15);
    color: #ff6b35;
    box-shadow: 0 0 16px rgba(255,107,53,0.25);
  }
  .zone-btn.reveal-shot-goal {
    border-color: #00e676 !important; background: rgba(0,230,118,0.2) !important;
    color: #00e676 !important;
  }
  .zone-btn.reveal-shot-saved {
    border-color: #ff1744 !important; background: rgba(255,23,68,0.2) !important;
    color: #ff1744 !important;
  }
  .zone-btn.reveal-save {
    border-color: rgba(255,107,53,0.6) !important; background: rgba(255,107,53,0.12) !important;
  }
  .zone-btn.reveal-none { opacity: 0.2; }
  .prim-btn {
    background: linear-gradient(135deg,#00e676,#00bf62);
    color: #000; border: none; border-radius: 12px;
    font-weight: 800; font-size: 14px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; transition: all 0.2s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .prim-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,230,118,0.4); }
  .prim-btn:active { transform: translateY(0); }
  .prim-btn:disabled { opacity: 0.4; cursor: default; pointer-events: none; }
  .sec-btn {
    background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75);
    border: 1px solid rgba(255,255,255,0.13); border-radius: 11px;
    font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
    display:flex; align-items:center; justify-content:center; gap:6px;
  }
  .sec-btn:hover { background: rgba(255,255,255,0.11); border-color: rgba(255,255,255,0.25); }
`;

// ═══════════════════════════════════════════════════════════════
// VISUAL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StadiumBg({ pulse }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:0, overflow:'hidden',
      background:'linear-gradient(180deg,#050810 0%,#070c17 55%,#060a12 100%)',
      animation: pulse ? 'goalFlashBg 0.8s ease' : 'none',
    }}>
      <div style={{
        position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)',
        width:700, height:400,
        background:'radial-gradient(ellipse, rgba(0,35,5,0.5) 0%, transparent 65%)',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:'40%',
        backgroundImage:`radial-gradient(circle at 2px 2px, rgba(255,255,255,0.035) 1px, transparent 0)`,
        backgroundSize:'22px 14px',
        maskImage:'linear-gradient(180deg,rgba(0,0,0,0.8) 0%,transparent 100%)',
        WebkitMaskImage:'linear-gradient(180deg,rgba(0,0,0,0.8) 0%,transparent 100%)',
      }}/>
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'42%',
        background:'linear-gradient(180deg,transparent 0%,rgba(0,55,15,0.18) 100%)',
      }}/>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({length:55},(_,i)=>({
    id:i, x:Math.random()*100,
    delay:Math.random()*1.5,
    dur:2.2+Math.random()*2.5,
    color:['#00e676','#ffd700','#ff6b35','#e040fb','#40c4ff','#ffffff'][Math.floor(Math.random()*6)],
    size:5+Math.random()*7,
    isRect:Math.random()>0.5,
  }));
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:50}}>
      {pieces.map(p=>(
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:-20,
          width:p.size, height:p.size,
          background:p.color, borderRadius:p.isRect?'2px':'50%',
          animation:`confettiFall ${p.dur}s ${p.delay}s linear infinite`,
        }}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GOAL VISUAL
// ═══════════════════════════════════════════════════════════════

function GoalVisual({ phase, shotZone, saveZone, isGoal }) {
  const isAnim = phase==='animating'||phase==='result';
  const showReveal = phase==='result';

  const ballPos = isAnim && shotZone ? ZONE_POS[shotZone] : { x:50, y:93 };
  const keeperPos = isAnim && saveZone ? ZONE_POS[saveZone] : { x:50, y:42 };

  let keeperRotate = 0;
  if (saveZone) {
    if (saveZone.includes('l')) keeperRotate = -35;
    if (saveZone.includes('r')) keeperRotate = 35;
    if (saveZone.startsWith('t')) keeperRotate *= 0.6;
  }

  return (
    <div style={{ width:'100%', maxWidth:400, margin:'0 auto', position:'relative' }}>
      <div style={{
        position:'relative',
        width:'100%', paddingTop:'62%',
        border:'4px solid rgba(255,255,255,0.92)',
        borderBottom:'none', borderRadius:'3px 3px 0 0',
        background:'rgba(0,0,0,0.35)',
        overflow:'hidden',
        animation: showReveal&&isGoal ? 'netBulge 0.5s ease' : 'none',
      }}>
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`
            linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px)
          `,
          backgroundSize:'33.33% 50%',
        }}/>
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0.1) 60%,transparent 100%)',
        }}/>

        {/* Keeper */}
        <div style={{
          position:'absolute',
          left:`${keeperPos.x}%`, top:`${keeperPos.y}%`,
          transform:`translate(-50%,-50%) rotate(${isAnim?keeperRotate:0}deg)`,
          transition: isAnim ? 'all 0.62s cubic-bezier(0.2,0,0.4,1)' : 'none',
          zIndex:3,
        }}>
          <div style={{
            width:30, height:30, borderRadius:'50%',
            background:'linear-gradient(135deg,#ff6b35,#e55100)',
            border:'2.5px solid rgba(255,255,255,0.7)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, boxShadow:'0 2px 8px rgba(0,0,0,0.5)',
          }}>🧤</div>
          <div style={{
            width:22, height:10,
            background:'linear-gradient(135deg,#ff6b35,#e55100)',
            border:'1.5px solid rgba(255,255,255,0.5)',
            borderRadius:5, margin:'-4px auto 0',
            transform: saveZone?.includes('t') ? 'rotate(-30deg)' : 'none',
          }}/>
        </div>

        {/* Ball */}
        <div style={{
          position:'absolute',
          left:`${ballPos.x}%`, top:`${ballPos.y}%`,
          transform:'translate(-50%,-50%)',
          transition: isAnim ? 'all 0.72s cubic-bezier(0.25,0,0.3,1)' : 'none',
          zIndex:4,
          width:22, height:22,
          background:'radial-gradient(circle at 38% 35%,#fff 0%,#ddd 50%,#bbb 100%)',
          borderRadius:'50%',
          border:'1.5px solid rgba(0,0,0,0.25)',
          boxShadow:'2px 3px 8px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            position:'absolute', top:3, left:3, right:3, bottom:3,
            borderRadius:'50%', border:'1px solid rgba(0,0,0,0.18)',
          }}/>
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            width:6, height:6,
            background:'rgba(0,0,0,0.15)', borderRadius:1,
            transform:'translate(-50%,-50%) rotate(45deg)',
          }}/>
        </div>

        {/* Zone reveal */}
        {showReveal && (
          <div style={{
            position:'absolute', inset:'3px 3px 0',
            display:'grid', gridTemplate:'1fr 1fr / 1fr 1fr 1fr',
            gap:3, padding:4, zIndex:5,
          }}>
            {ZONES.map(z=>{
              const isShot = z===shotZone;
              const isSave = z===saveZone;
              return (
                <div key={z} style={{
                  borderRadius:5,
                  background: isShot&&isGoal ? 'rgba(0,230,118,0.22)'
                    : isShot&&!isGoal ? 'rgba(255,23,68,0.2)'
                    : isSave ? 'rgba(255,107,53,0.1)' : 'transparent',
                  border: isShot ? `2px solid ${isGoal?'#00e676':'#ff1744'}`
                    : isSave ? '1.5px solid rgba(255,107,53,0.4)' : 'none',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14,
                }}>
                  {isShot && isGoal && '⚽'}
                  {isShot && !isGoal && (isSave ? '🧤' : '')}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height:5, background:'rgba(255,255,255,0.92)', borderRadius:'0 0 2px 2px' }}/>
      <div style={{
        height:48,
        background:'linear-gradient(180deg,#1b4d22 0%,#143d1a 100%)',
        borderRadius:'0 0 4px 4px',
        position:'relative', overflow:'hidden',
      }}>
        {[0,1,2,3,4].map(i=>(
          <div key={i} style={{
            position:'absolute', top:0, bottom:0,
            left:`${i*20}%`, width:'10%',
            background:'rgba(255,255,255,0.025)',
          }}/>
        ))}
        <div style={{
          position:'absolute', bottom:-24, left:'50%', transform:'translateX(-50%)',
          width:80, height:50,
          border:'1.5px solid rgba(255,255,255,0.18)',
          borderRadius:'50%', borderBottom:'none',
        }}/>
        <div style={{
          position:'absolute', top:'35%', left:'50%', transform:'translate(-50%,-50%)',
          width:5, height:5, borderRadius:'50%',
          background:'rgba(255,255,255,0.35)',
        }}/>
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:1.5,
          background:'rgba(255,255,255,0.3)',
        }}/>
      </div>

      <div style={{
        position:'absolute', top:0, left:0, width:4,
        height:'calc(100% - 48px - 5px)',
        background:'rgba(255,255,255,0.92)',
        boxShadow:'2px 0 8px rgba(0,0,0,0.4)',
      }}/>
      <div style={{
        position:'absolute', top:0, right:0, width:4,
        height:'calc(100% - 48px - 5px)',
        background:'rgba(255,255,255,0.92)',
        boxShadow:'-2px 0 8px rgba(0,0,0,0.4)',
      }}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════

function LoginScreen({ serverState, onJoined }) {
  const [name, setName]       = useState('');
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);
  const [myCode, setMyCode]   = useState(null); // show code splash after joining

  const noTournament = !serverState?.bracket;

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) { setErr('Enter your name'); return; }
    setBusy(true); setErr('');
    const endpoint = noTournament ? '/api/tournament/create' : '/api/join';
    try {
      const res = await api(endpoint, { name: n });
      if (res.error) { setErr(res.error); setBusy(false); return; }
      localStorage.setItem('psc_code', res.code);
      localStorage.setItem('psc_name', n);
      setMyCode(res.code);
    } catch (e) {
      setErr(`Network error on ${endpoint} — ${e.message}`);
    }
    setBusy(false);
  };

  // Code splash — shown after getting assigned
  if (myCode) return (
    <div style={{minHeight:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 20px',background:'#080b14',fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",position:'relative',overflow:'hidden'}}>
      <style>{CSS}</style>
      <StadiumBg/>
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:340,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:16}}>🎟️</div>
        <div style={{color:'rgba(255,255,255,0.4)',fontSize:10,letterSpacing:3,textTransform:'uppercase',marginBottom:8}}>You're in! Your code is</div>
        <div style={{
          fontSize:56, fontWeight:900, fontFamily:'monospace', letterSpacing:10,
          color:'#00e676', textShadow:'0 0 40px rgba(0,230,118,0.5)',
          marginBottom:6, animation:'scaleIn 0.4s ease',
        }}>{myCode}</div>
        <div style={{color:'rgba(255,255,255,0.25)',fontSize:11,marginBottom:32}}>
          Remember this — you'll need it to log back in from another device
        </div>
        <button onClick={()=>onJoined(myCode, name.trim())} className="prim-btn" style={{width:'100%',padding:'15px',fontSize:14}}>
          Let's Go →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 20px',background:'#080b14',fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",position:'relative',overflow:'hidden'}}>
      <style>{CSS}</style>
      <StadiumBg/>
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:380,textAlign:'center'}}>
        <div style={{fontSize:56,animation:'floatBob 3s ease-in-out infinite',marginBottom:20}}>⚽</div>
        <h1 style={{color:'#fff',fontSize:32,fontWeight:900,fontFamily:'Impact,"Arial Narrow Bold",sans-serif',letterSpacing:2,textTransform:'uppercase',marginBottom:4,textShadow:'0 0 40px rgba(0,230,118,0.25)'}}>
          PENALTY <span style={{color:'#00e676'}}>SHOWDOWN</span>
        </h1>
        <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,letterSpacing:4,textTransform:'uppercase',marginBottom:32}}>
          Office Championship 2025
        </div>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:18,padding:28}}>
          {noTournament && (
            <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginBottom:20,lineHeight:1.5}}>
              No tournament running yet — enter your name to create one
            </div>
          )}
          <div style={{marginBottom:18,textAlign:'left'}}>
            <label style={{display:'block',color:'rgba(255,255,255,0.45)',fontSize:9,letterSpacing:2.5,textTransform:'uppercase',marginBottom:8,fontWeight:700}}>
              Your Name
            </label>
            <input
              value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
              placeholder="Enter your name..."
              autoFocus
              style={{width:'100%',padding:'13px 15px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#fff',fontSize:15,outline:'none'}}
              onFocus={e=>e.target.style.borderColor='#00e676'}
              onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.12)'}
            />
          </div>
          {err && <div style={{color:'#ff1744',fontSize:11,marginBottom:10}}>{err}</div>}
          <button onClick={handleSubmit} disabled={busy} className="prim-btn" style={{width:'100%',padding:'14px',fontSize:13}}>
            {busy ? '…' : noTournament ? '🏟️ Create Tournament' : '⚽ Join Tournament'}
          </button>
        </div>
        <div style={{color:'rgba(255,255,255,0.18)',fontSize:10,marginTop:20,letterSpacing:1}}>
          {noTournament ? '48 slots · you\'ll be assigned a bracket code' : 'You\'ll be assigned a random slot in the bracket'}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REAL-TIME MATCH SCREEN
// ═══════════════════════════════════════════════════════════════

function RealtimeMatchScreen({ am, myCode }) {
  const isP1 = am.p1.code === myCode;
  const pKey = isP1 ? 'p1' : 'p2';
  const me = isP1 ? am.p1 : am.p2;
  const them = isP1 ? am.p2 : am.p1;

  // P1 shoots on odd kicks, P2 shoots on even kicks
  const iAmShooter = isP1 ? (am.currentKick % 2 === 1) : (am.currentKick % 2 === 0);

  const iHaveSubmitted = am.choicesSubmitted[pKey];
  const theyHaveSubmitted = am.choicesSubmitted[isP1 ? 'p2' : 'p1'];

  const [myZone, setMyZone] = useState(null);
  const [timer, setTimer] = useState(CHOOSE_TIME);
  const [localPhase, setLocalPhase] = useState('choosing');
  const kickRef = useRef(am.currentKick);
  const timerRef = useRef(null);
  const autoSubmitted = useRef(false);

  // Reset local state on each new kick
  useEffect(() => {
    if (kickRef.current !== am.currentKick) {
      kickRef.current = am.currentKick;
      setMyZone(null);
      autoSubmitted.current = false;
    }
  }, [am.currentKick]);

  // Drive local animation phase from server phase
  useEffect(() => {
    if (am.phase === 'picking') {
      setLocalPhase('choosing');
    } else if (am.phase === 'showing_result' || am.phase === 'done') {
      setLocalPhase('animating');
      const t = setTimeout(() => setLocalPhase('result'), 820);
      return () => clearTimeout(t);
    }
  }, [am.phase, am.lastKickResult]);

  // Countdown timer
  useEffect(() => {
    if (am.phase !== 'picking' || iHaveSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const computeRemaining = () =>
      Math.max(0, Math.round((am.kickStartedAt + CHOOSE_TIME * 1000 - Date.now()) / 1000));

    setTimer(computeRemaining());
    timerRef.current = setInterval(() => setTimer(computeRemaining()), 500);
    return () => clearInterval(timerRef.current);
  }, [am.phase, am.kickStartedAt, iHaveSubmitted]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timer === 0 && am.phase === 'picking' && !iHaveSubmitted && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submitZone(rz());
    }
  }, [timer]);

  const submitZone = async (zone) => {
    if (iHaveSubmitted || am.phase !== 'picking') return;
    setMyZone(zone);
    api('/api/match/choice', { code: myCode, zone });
  };

  const kr = am.lastKickResult;
  const isGoal = kr?.isGoal;
  const showReveal = localPhase === 'result';
  const timerUrgent = timer <= 3 && timer > 0 && !iHaveSubmitted;

  // P1 kicks are indices 0,2,4 (odd kick numbers); P2 kicks are 1,3,5 (even)
  const p1Kicks = am.kicks.filter((_, i) => i % 2 === 0);
  const p2Kicks = am.kicks.filter((_, i) => i % 2 !== 0);

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background:'#080b14', fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",
      position:'relative', overflow:'hidden',
    }}>
      <StadiumBg pulse={showReveal && isGoal}/>

      {/* Score bar */}
      <div style={{
        background:'rgba(0,0,0,0.65)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        padding:'10px 16px', position:'relative', zIndex:10,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff', fontSize:12, fontWeight:700, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:110 }}>
              {am.p1.name}
            </div>
          </div>
          <div style={{ textAlign:'center', padding:'0 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div key={am.p1Score} style={{
                fontSize:36, fontWeight:900, color:'#fff', minWidth:36, textAlign:'center',
                fontFamily:'Impact,"Arial Narrow Bold",sans-serif', lineHeight:1,
                animation:'scorePopIn 0.35s ease',
              }}>{am.p1Score}</div>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:20, fontWeight:200 }}>:</div>
              <div key={am.p2Score+100} style={{
                fontSize:36, fontWeight:900, color:'#fff', minWidth:36, textAlign:'center',
                fontFamily:'Impact,"Arial Narrow Bold",sans-serif', lineHeight:1,
                animation:'scorePopIn 0.35s ease',
              }}>{am.p2Score}</div>
            </div>
            <div style={{ color:'rgba(255,255,255,0.28)', fontSize:9, letterSpacing:2, textTransform:'uppercase', marginTop:1 }}>
              {am.isSuddenDeath ? '⚡ SD' : `Kick ${Math.min(am.currentKick, TOTAL_KICKS)}/${TOTAL_KICKS}`}
            </div>
          </div>
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ color:'#ff6b35', fontSize:12, fontWeight:700, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:110, marginLeft:'auto' }}>
              {am.p2.name}
            </div>
          </div>
        </div>

        {/* Kick history dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:3, marginTop:8 }}>
          {Array.from({length: Math.ceil(TOTAL_KICKS / 2)}, (_, i) => {
            const pk = p1Kicks[i];
            const ak = p2Kicks[i];
            return (
              <div key={i} style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'center' }}>
                <div style={{
                  width:10, height:10, borderRadius:'50%',
                  background: !pk ? 'rgba(255,255,255,0.08)' : pk.isGoal ? '#00e676' : 'rgba(255,255,255,0.25)',
                  border:`1px solid ${!pk ? 'rgba(255,255,255,0.15)' : pk.isGoal ? '#00e676' : 'rgba(255,255,255,0.4)'}`,
                  transition:'all 0.3s',
                }}/>
                <div style={{
                  width:10, height:10, borderRadius:'50%',
                  background: !ak ? 'rgba(255,255,255,0.08)' : ak.isGoal ? '#ff1744' : 'rgba(255,255,255,0.25)',
                  border:`1px solid ${!ak ? 'rgba(255,255,255,0.15)' : ak.isGoal ? '#ff1744' : 'rgba(255,255,255,0.4)'}`,
                  transition:'all 0.3s',
                }}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1, overflow:'hidden' }}>

        {/* GOAL / SAVED overlay */}
        {showReveal && (
          <div style={{
            position:'absolute', inset:0, zIndex:20,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            pointerEvents:'none',
          }}>
            <div style={{
              position:'absolute', left:'50%', top:'42%',
              fontSize:58, fontWeight:900,
              fontFamily:'Impact,"Arial Narrow Bold",sans-serif',
              letterSpacing:1, textTransform:'uppercase',
              color: isGoal ? '#00e676' : '#ff1744',
              textShadow: isGoal
                ? '0 0 60px rgba(0,230,118,0.9),0 0 120px rgba(0,230,118,0.4)'
                : '0 0 60px rgba(255,23,68,0.9)',
              animation:'stampIn 0.42s cubic-bezier(0.2,0,0.2,1) forwards',
            }}>
              {isGoal ? 'GOAL!' : 'SAVED!'}
            </div>
            <div style={{
              position:'absolute', left:'50%', top:'62%',
              transform:'translateX(-50%)',
              color:'rgba(255,255,255,0.65)', fontSize:12,
              letterSpacing:1.5, textTransform:'uppercase', textAlign:'center',
              animation:'fadeSlideUp 0.5s 0.25s ease both',
            }}>
              {isGoal
                ? `🔥 ${(kr.scorer === 'p1' ? am.p1.name : am.p2.name).split(' ')[0]} scored!`
                : `🧤 Saved!`}
            </div>
          </div>
        )}

        {/* MATCH DONE overlay */}
        {am.phase === 'done' && (
          <div style={{
            position:'absolute', inset:0, zIndex:25,
            background:'rgba(0,0,0,0.78)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            animation:'scaleIn 0.5s ease',
          }}>
            <div style={{
              fontSize:52, fontWeight:900,
              fontFamily:'Impact,sans-serif', textTransform:'uppercase', letterSpacing:1,
              color: am.winner === myCode ? '#ffd700' : '#ff6b35',
              textShadow: am.winner === myCode ? '0 0 50px rgba(255,215,0,0.6)' : 'none',
            }}>
              {am.winner === myCode ? '🏆 You Win!' : '💀 You Lose'}
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:18,marginTop:8}}>{am.p1Score} – {am.p2Score}</div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:16,letterSpacing:2}}>
              Returning to bracket…
            </div>
          </div>
        )}

        {/* Waiting overlay */}
        {am.phase === 'picking' && iHaveSubmitted && (
          <div style={{
            position:'absolute', inset:0, zIndex:20,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,0.7)',
          }}>
            <div style={{fontSize:36,marginBottom:14}}>⏳</div>
            <div style={{color:'#fff',fontSize:18,fontWeight:700,marginBottom:6}}>
              {theyHaveSubmitted ? 'Both in — resolving…' : `Waiting for ${them.name.split(' ')[0]}…`}
            </div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,letterSpacing:2}}>
              {myZone && `You picked ${ZONE_LABELS[myZone]}`}
            </div>
          </div>
        )}

        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'10px 16px 6px', gap:10 }}>

          {/* Role pill */}
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            background: iAmShooter ? 'rgba(0,230,118,0.1)' : 'rgba(64,196,255,0.1)',
            border: `1px solid ${iAmShooter ? 'rgba(0,230,118,0.35)' : 'rgba(64,196,255,0.35)'}`,
            borderRadius:20, padding:'5px 14px',
          }}>
            <span style={{fontSize:14}}>{iAmShooter ? '⚽' : '🧤'}</span>
            <span style={{
              color: iAmShooter ? '#00e676' : '#40c4ff',
              fontSize:10, fontWeight:800, letterSpacing:2.5, textTransform:'uppercase',
            }}>
              {me.name.split(' ')[0]} — {iAmShooter ? 'SHOOT' : 'SAVE'}
            </span>
            {am.phase === 'picking' && !iHaveSubmitted && (
              <span style={{
                marginLeft:4, minWidth:20, textAlign:'center',
                fontSize:11, fontWeight:900,
                color: timerUrgent ? '#ff1744' : 'rgba(255,255,255,0.6)',
                animation: timerUrgent ? 'timerUrgent 0.6s ease infinite' : 'none',
              }}>{timer}s</span>
            )}
            {am.isSuddenDeath && <span style={{color:'#ffd700',fontSize:9,fontWeight:800,letterSpacing:2,marginLeft:4}}>⚡SD</span>}
          </div>

          <GoalVisual
            phase={localPhase}
            shotZone={kr?.shotZone}
            saveZone={kr?.saveZone}
            isGoal={kr?.isGoal}
          />
        </div>

        {/* Zone picker */}
        <div style={{ padding:'0 16px 14px' }}>
          <div style={{
            color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:2.5,
            textTransform:'uppercase', textAlign:'center', marginBottom:7, minHeight:14,
          }}>
            {am.phase === 'picking' && !iHaveSubmitted
              ? (iAmShooter ? 'Choose shot direction' : 'Choose dive direction')
              : am.phase === 'picking' && iHaveSubmitted
              ? ''
              : localPhase === 'animating' ? '⚡ Resolving...' : ''}
          </div>
          <div style={{ display:'grid', gridTemplate:'repeat(2, 50px) / repeat(3, 1fr)', gap:5 }}>
            {ZONES.map(z => {
              let cls = 'zone-btn';
              const isPicking = am.phase === 'picking' && !iHaveSubmitted;
              if (isPicking) {
                if (myZone === z) cls += ' selected';
              } else if (showReveal) {
                if (z === kr?.shotZone) cls += isGoal ? ' reveal-shot-goal' : ' reveal-shot-saved';
                else if (z === kr?.saveZone && !isGoal) cls += ' reveal-save';
                else cls += ' reveal-none';
              }
              return (
                <button key={z} className={cls}
                  onClick={() => submitZone(z)}
                  disabled={!isPicking || !!myZone}
                  style={{ opacity: isPicking && myZone && myZone !== z ? 0.45 : 1 }}>
                  <span style={{fontSize:15}}>{ZONE_ICONS[z]}</span>
                  <span style={{fontSize:8.5,letterSpacing:0.5,fontWeight:700}}>{z.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SPECTATOR MATCH VIEW (read-only for non-participants)
// ═══════════════════════════════════════════════════════════════

function SpectatorMatchView({ am }) {
  const [localPhase, setLocalPhase] = useState('choosing');

  useEffect(() => {
    if (am.phase === 'picking') {
      setLocalPhase('choosing');
    } else if (am.phase === 'showing_result' || am.phase === 'done') {
      setLocalPhase('animating');
      const t = setTimeout(() => setLocalPhase('result'), 820);
      return () => clearTimeout(t);
    }
  }, [am.phase, am.lastKickResult]);

  const kr = am.lastKickResult;
  const p1Kicks = am.kicks.filter((_, i) => i % 2 === 0);
  const p2Kicks = am.kicks.filter((_, i) => i % 2 !== 0);

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background:'#080b14', fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",
      position:'relative', overflow:'hidden',
    }}>
      <StadiumBg pulse={localPhase === 'result' && kr?.isGoal}/>

      {/* Score bar */}
      <div style={{
        background:'rgba(0,0,0,0.65)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        padding:'10px 16px', position:'relative', zIndex:10,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ flex:1 }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:9, letterSpacing:2, textTransform:'uppercase' }}>P1</div>
            <div style={{ color:'#fff', fontSize:12, fontWeight:700, marginTop:2 }}>{am.p1.name}</div>
          </div>
          <div style={{ textAlign:'center', padding:'0 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div key={am.p1Score} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:'Impact,sans-serif',lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{am.p1Score}</div>
              <div style={{color:'rgba(255,255,255,0.25)',fontSize:20,fontWeight:200}}>:</div>
              <div key={am.p2Score+100} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:'Impact,sans-serif',lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{am.p2Score}</div>
            </div>
            <div style={{color:'rgba(255,255,255,0.28)',fontSize:9,letterSpacing:2,textTransform:'uppercase',marginTop:1}}>
              {am.isSuddenDeath ? '⚡ SD' : `Kick ${Math.min(am.currentKick, TOTAL_KICKS)}/${TOTAL_KICKS}`}
            </div>
          </div>
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:9, letterSpacing:2, textTransform:'uppercase' }}>P2</div>
            <div style={{ color:'#ff6b35', fontSize:12, fontWeight:700, marginTop:2 }}>{am.p2.name}</div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:3, marginTop:8 }}>
          {Array.from({length: Math.ceil(TOTAL_KICKS / 2)}, (_, i) => {
            const pk = p1Kicks[i]; const ak = p2Kicks[i];
            return (
              <div key={i} style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'center' }}>
                <div style={{ width:10,height:10,borderRadius:'50%', background:!pk?'rgba(255,255,255,0.08)':pk.isGoal?'#00e676':'rgba(255,255,255,0.25)', border:`1px solid ${!pk?'rgba(255,255,255,0.15)':pk.isGoal?'#00e676':'rgba(255,255,255,0.4)'}`, transition:'all 0.3s' }}/>
                <div style={{ width:10,height:10,borderRadius:'50%', background:!ak?'rgba(255,255,255,0.08)':ak.isGoal?'#ff1744':'rgba(255,255,255,0.25)', border:`1px solid ${!ak?'rgba(255,255,255,0.15)':ak.isGoal?'#ff1744':'rgba(255,255,255,0.4)'}`, transition:'all 0.3s' }}/>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
        {localPhase === 'result' && (
          <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{
              position:'absolute', left:'50%', top:'42%',
              fontSize:58, fontWeight:900,
              fontFamily:'Impact,sans-serif', letterSpacing:1, textTransform:'uppercase',
              color: kr?.isGoal ? '#00e676' : '#ff1744',
              textShadow: kr?.isGoal ? '0 0 60px rgba(0,230,118,0.9)' : '0 0 60px rgba(255,23,68,0.9)',
              animation:'stampIn 0.42s cubic-bezier(0.2,0,0.2,1) forwards',
            }}>{kr?.isGoal ? 'GOAL!' : 'SAVED!'}</div>
          </div>
        )}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:3, textTransform:'uppercase', marginBottom:12 }}>
            {am.phase === 'picking'
              ? `${am.choicesSubmitted.p1 ? '✓' : '○'} ${am.p1.name.split(' ')[0]}  ·  ${am.choicesSubmitted.p2 ? '✓' : '○'} ${am.p2.name.split(' ')[0]}`
              : ''}
          </div>
          <GoalVisual phase={localPhase} shotZone={kr?.shotZone} saveZone={kr?.saveZone} isGoal={kr?.isGoal}/>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BRACKET TREE
// ═══════════════════════════════════════════════════════════════

const MH = 56;   // match card height
const MW = 112;  // match card width
const CG = 28;   // column gap

function BracketTree({ bracket, activeMatch, onMatchClick }) {
  const colX = c => c * (MW + CG);
  const TOT_W = colX(5) + MW;
  const TOT_H = 16 * MH;
  const HEADER_H = 22;
  const PX = 8;

  const rawTop = (col, idx) => {
    if (col <= 1) return idx * MH;
    const p = Math.pow(2, col - 1);
    return idx * p * MH + (p / 2 - 0.5) * MH;
  };
  const cy = (col, idx) => rawTop(col, idx) + MH / 2;

  const LC = 'rgba(255,255,255,0.1)';
  const WL = 'rgba(0,230,118,0.22)';
  const lines = [];

  // WC → R32: dashed green arrows
  for (let i = 0; i < 16; i++) {
    const y = cy(0, i);
    lines.push(<line key={`w${i}`} x1={colX(0)+MW} y1={y} x2={colX(1)} y2={y} stroke={WL} strokeWidth={1.5} strokeDasharray="4 3"/>);
  }
  // Bracket connectors: R32→R16, R16→QF, QF→SF, SF→Final
  [[8,1,2],[4,2,3],[2,3,4],[1,4,5]].forEach(([pairs,sc,dc]) => {
    const x1=colX(sc)+MW, xm=x1+CG/2, x2=colX(dc);
    for (let i=0; i<pairs; i++) {
      const y1=cy(sc,2*i), y2=cy(sc,2*i+1), yd=cy(dc,i);
      lines.push(
        <line key={`${sc}a${i}`} x1={x1} y1={y1} x2={xm} y2={y1} stroke={LC} strokeWidth={1.5}/>,
        <line key={`${sc}b${i}`} x1={x1} y1={y2} x2={xm} y2={y2} stroke={LC} strokeWidth={1.5}/>,
        <line key={`${sc}c${i}`} x1={xm} y1={y1} x2={xm} y2={y2} stroke={LC} strokeWidth={1.5}/>,
        <line key={`${sc}d${i}`} x1={xm} y1={yd} x2={x2} y2={yd} stroke={LC} strokeWidth={1.5}/>,
      );
    }
  });

  const ph = (n,k) => Array.from({length:n},(_,i)=>({id:`${k}${i}`,_ph:true}));
  const rounds = [
    {col:0, label:'Wild Card', matches:(bracket.wc||[]).length  ? bracket.wc  : ph(16,'wcp')},
    {col:1, label:'R32',       matches:(bracket.r32||[]).length ? bracket.r32 : ph(16,'r32p')},
    {col:2, label:'R16',       matches:bracket.r16?.length      ? bracket.r16 : ph(8,'r16p')},
    {col:3, label:'QF',        matches:bracket.qf?.length       ? bracket.qf  : ph(4,'qfp')},
    {col:4, label:'SF',        matches:bracket.sf?.length       ? bracket.sf  : ph(2,'sfp')},
    {col:5, label:'Final',     matches:bracket.final            ? [bracket.final] : ph(1,'finp')},
  ];

  const TSlot = ({p, won, played, isWCSlot}) => (
    <div style={{flex:1,display:'flex',alignItems:'center',gap:5,padding:'0 6px',opacity:played&&!won?0.3:1}}>
      <div style={{width:14,height:14,borderRadius:'50%',flexShrink:0,background:won?'rgba(0,230,118,0.2)':'rgba(255,255,255,0.06)',border:`1px solid ${won?'#00e676':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:900,color:won?'#00e676':'rgba(255,255,255,0.3)'}}>
        {p?.name?.[0]||p?.code?.[0]||'?'}
      </div>
      <div style={{flex:1,overflow:'hidden',lineHeight:1}}>
        {p?.name
          ? <div style={{color:'#fff',fontSize:9,fontWeight:won?700:400,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
          : p?.code
            ? <div style={{color:'rgba(255,255,255,0.28)',fontSize:7.5,fontFamily:'monospace',letterSpacing:0.5}}>{p.code}</div>
            : <div style={{color:'rgba(255,255,255,0.15)',fontSize:8,fontStyle:'italic'}}>{isWCSlot?'WC winner':'TBD'}</div>
        }
      </div>
      {won&&<span style={{color:'#00e676',fontSize:8}}>✓</span>}
    </div>
  );

  const PHSlot = () => (
    <div style={{flex:1,display:'flex',alignItems:'center',gap:5,padding:'0 6px'}}>
      <div style={{width:14,height:14,borderRadius:'50%',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.04)'}}/>
      <div style={{color:'rgba(255,255,255,0.1)',fontSize:8,fontStyle:'italic'}}>TBD</div>
    </div>
  );

  return (
    <div style={{overflowX:'auto',overflowY:'auto',flex:1,WebkitOverflowScrolling:'touch',paddingBottom:16}}>
      <div style={{position:'relative',width:TOT_W+PX*2,height:TOT_H+HEADER_H+12,minWidth:TOT_W+PX*2}}>
        {rounds.map(({col,label})=>(
          <div key={col} style={{position:'absolute',left:PX+colX(col),top:4,width:MW,textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:7,letterSpacing:2,textTransform:'uppercase',fontWeight:600}}>{label}</div>
        ))}
        <svg style={{position:'absolute',left:PX,top:HEADER_H,pointerEvents:'none'}} width={TOT_W} height={TOT_H}>
          {lines}
        </svg>
        {rounds.map(({col,matches})=>matches.map((m,idx)=>{
          const isPH = m._ph;
          const isActive = !isPH && activeMatch?.matchId===m.id;
          const canPlay = !isPH && !m.played && m.p1?.name && m.p2?.name && !activeMatch;
          let bc='rgba(255,255,255,0.07)', bg='rgba(255,255,255,0.015)';
          if (isPH)       { bc='rgba(255,255,255,0.04)'; bg='transparent'; }
          else if (isActive)  { bc='rgba(255,215,0,0.65)';  bg='rgba(255,215,0,0.05)'; }
          else if (m.played)  { bc='rgba(255,255,255,0.05)'; bg='rgba(255,255,255,0.01)'; }
          else if (canPlay)   { bc='rgba(0,230,118,0.55)';   bg='rgba(0,230,118,0.05)'; }
          return (
            <div key={m.id} onClick={()=>canPlay&&onMatchClick(m)} style={{
              position:'absolute',left:PX+colX(col),top:HEADER_H+rawTop(col,idx),
              width:MW,height:MH,border:`1px solid ${bc}`,borderRadius:6,background:bg,
              cursor:canPlay?'pointer':'default',display:'flex',flexDirection:'column',
              overflow:'hidden',boxSizing:'border-box',
              boxShadow:isActive?'0 0 12px rgba(255,215,0,0.15)':canPlay?'0 0 8px rgba(0,230,118,0.1)':'none',
            }}>
              {isPH ? <PHSlot/> : <TSlot p={m.p1} won={m.winner?.code===m.p1?.code} played={m.played} isWCSlot={false}/>}
              <div style={{height:1,background:'rgba(255,255,255,0.05)'}}/>
              {isPH ? <PHSlot/> : <TSlot p={m.p2} won={m.winner?.code===m.p2?.code} played={m.played} isWCSlot={col===1&&!m.p2}/>}
              {isActive&&<div style={{position:'absolute',inset:'auto 0 0',height:9,background:'rgba(255,215,0,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#ffd700',fontSize:6,fontWeight:800,letterSpacing:1.5}}>LIVE {activeMatch.p1Score}–{activeMatch.p2Score}</span></div>}
              {canPlay&&<div style={{position:'absolute',inset:'auto 0 0',height:8,background:'rgba(0,230,118,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#00e676',fontSize:5.5,fontWeight:800,letterSpacing:1.5}}>▶ PLAY</span></div>}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT SCREEN
// ═══════════════════════════════════════════════════════════════

function TournamentScreen({ bracket, activeMatch, myCode, onBack }) {
  const [pendingMatch, setPendingMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const stageLabel = {wc:'WILD CARD',r32:'ROUND OF 32',r16:'ROUND OF 16',qf:'QUARTER-FINALS',sf:'SEMI-FINALS',final:'FINAL',champion:'CHAMPION'}[bracket.stage] || '';

  const handleKickOff = async () => {
    setBusy(true); setErr('');
    const res = await api('/api/match/start', { matchId: pendingMatch.id });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    setPendingMatch(null);
  };

  const openMatch = (match) => { setErr(''); setPendingMatch(match); };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#080b14',fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",position:'relative',overflow:'hidden'}}>
      <StadiumBg/>
      <div style={{padding:'13px 18px',background:'rgba(0,0,0,0.55)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:18,cursor:'pointer'}}>←</button>
        <div>
          <div style={{color:'#ffd700',fontSize:9,letterSpacing:2.5,textTransform:'uppercase',fontWeight:700}}>🏆 Tournament Bracket</div>
          <div style={{color:'rgba(255,255,255,0.3)',fontSize:10,marginTop:2}}>
            {myCode&&<span style={{fontFamily:'monospace',color:'#00e676',marginRight:6}}>{myCode}</span>}
            48-Player Championship
          </div>
        </div>
        <div style={{marginLeft:'auto'}}>
          <span style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.28)',color:'#ffd700',padding:'3px 10px',borderRadius:6,fontSize:9,fontWeight:800,letterSpacing:2,textTransform:'uppercase'}}>{stageLabel}</span>
        </div>
      </div>

      <BracketTree bracket={bracket} activeMatch={activeMatch} onMatchClick={openMatch}/>

      {pendingMatch&&(
        <div style={{position:'absolute',inset:0,zIndex:40,background:'rgba(0,0,0,0.93)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{width:'100%',maxWidth:320,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24}}>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:9,letterSpacing:2.5,textTransform:'uppercase',marginBottom:20,textAlign:'center'}}>
              {pendingMatch.id.replace(/_/g,' ').toUpperCase()}
            </div>
            {[
              {slot:pendingMatch.p1,color:'#00e676',label:'Player 1'},
              {slot:pendingMatch.p2,color:'#ff6b35',label:'Player 2'},
            ].map(({slot,color,label})=>(
              <div key={label} style={{marginBottom:14,padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:10,border:`1px solid ${slot?.name?color+'44':'rgba(255,255,255,0.08)'}`}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{fontFamily:'monospace',fontSize:11,fontWeight:800,color,letterSpacing:2,background:`${color}15`,padding:'2px 8px',borderRadius:4}}>{slot?.code}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:9,letterSpacing:1.5,textTransform:'uppercase'}}>{label}</div>
                </div>
                <div style={{marginTop:6,color:slot?.name?'#fff':'rgba(255,255,255,0.3)',fontSize:13,fontWeight:slot?.name?600:400}}>
                  {slot?.name||<span style={{fontStyle:'italic',fontSize:11}}>Not registered yet</span>}
                </div>
              </div>
            ))}
            {err&&<div style={{color:'#ff1744',fontSize:11,marginBottom:10,textAlign:'center'}}>{err}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setPendingMatch(null);setErr('');}} className="sec-btn" style={{flex:1,padding:'11px'}}>Cancel</button>
              <button onClick={handleKickOff} disabled={busy||!pendingMatch.p1?.name||!pendingMatch.p2?.name} className="prim-btn" style={{flex:2,padding:'11px'}}>
                {busy?'…':'⚽ Kick Off'}
              </button>
            </div>
            {(!pendingMatch.p1?.name||!pendingMatch.p2?.name)&&(
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:10,textAlign:'center',marginTop:10}}>Both players need to register first</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAMPION SCREEN
// ═══════════════════════════════════════════════════════════════

function ChampionScreen({ name, onBack }) {
  return (
    <div style={{
      height:'100%', display:'flex', flexDirection:'column',
      background:'#080b14', fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",
      alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden',
    }}>
      <StadiumBg pulse/>
      <Confetti/>
      <div style={{position:'relative',zIndex:1,textAlign:'center',padding:28}}>
        <div style={{fontSize:72,animation:'floatBob 1.5s ease-in-out infinite',marginBottom:16,
          filter:'drop-shadow(0 0 30px rgba(255,215,0,0.6))'}}>🏆</div>
        <div style={{color:'#ffd700',fontSize:11,letterSpacing:5,textTransform:'uppercase',fontWeight:800,marginBottom:10,
          textShadow:'0 0 25px rgba(255,215,0,0.5)'}}>
          Tournament Champion
        </div>
        <div style={{
          fontSize:36,fontWeight:900,fontFamily:'Impact,sans-serif',
          color:'#fff',letterSpacing:1,marginBottom:8,
          animation:'scaleIn 0.7s ease',
        }}>{name}</div>
        <div style={{
          display:'inline-block',padding:'4px 16px',borderRadius:20,marginBottom:28,
          background:'rgba(0,230,118,0.12)',
          border:'1px solid rgba(0,230,118,0.35)',
          color:'#00e676',fontSize:11,fontWeight:700,
        }}>
          Penalty Champion 2025
        </div>
        <div>
          <button onClick={onBack} className="prim-btn" style={{padding:'14px 32px',fontSize:13}}>
            🎉 Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [serverState, setServerState] = useState(null); // null = connecting
  const [myCode, setMyCode] = useState(() => localStorage.getItem('psc_code'));
  const [screen, setScreen] = useState('loading'); // loading | login | tournament | champion

  // Poll server state every 1.5s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await fetch('/api/state').then(r => r.json());
        if (!cancelled) {
          setServerState(data);
          setScreen(prev => prev === 'loading' ? (myCode ? 'tournament' : 'login') : prev);
        }
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Navigate to champion screen when tournament ends
  useEffect(() => {
    if (serverState?.bracket?.stage === 'champion' && screen === 'tournament') {
      setScreen('champion');
    }
  }, [serverState?.bracket?.stage]);

  const handleJoined = (code, _name) => {
    setMyCode(code);
    setScreen('tournament');
  };

  const handleReset = async () => {
    await api('/api/tournament/reset', {});
    setMyCode(null);
    localStorage.removeItem('psc_code');
    localStorage.removeItem('psc_name');
    setScreen('login');
  };

  const W = { height:'100%', overflow:'hidden', background:'#080b14' };
  const am = serverState?.activeMatch;
  const bracket = serverState?.bracket;

  // Determine if I'm in the active match
  const imInMatch = am && myCode && (am.p1.code === myCode || am.p2.code === myCode);

  return (
    <div style={{ height:'100vh', overflow:'hidden', background:'#080b14', fontFamily:"'Trebuchet MS',sans-serif" }}>
      <style>{CSS}</style>

      {screen === 'loading' && (
        <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#080b14',position:'relative',overflow:'hidden'}}>
          <StadiumBg/>
          <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
            <div style={{fontSize:48,animation:'floatBob 1.5s ease-in-out infinite',marginBottom:16}}>⚽</div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:11,letterSpacing:3,textTransform:'uppercase'}}>Connecting…</div>
          </div>
        </div>
      )}

      {screen === 'login' && serverState && (
        <div style={{height:'100%',overflowY:'auto'}}>
          <LoginScreen serverState={serverState} onJoined={handleJoined}/>
        </div>
      )}

      {/* Active match — shown over the bracket for participants */}
      {(screen === 'tournament' || screen === 'champion') && am && imInMatch && (
        <div style={W}>
          <RealtimeMatchScreen am={am} myCode={myCode}/>
        </div>
      )}

      {/* Active match spectator view */}
      {screen === 'tournament' && am && !imInMatch && (
        <div style={W}>
          <SpectatorMatchView am={am}/>
        </div>
      )}

      {/* Tournament bracket — shown when no active match */}
      {screen === 'tournament' && !am && bracket && (
        <div style={W}>
          <TournamentScreen
            bracket={bracket}
            activeMatch={am}
            myCode={myCode}
            onBack={() => {
              setMyCode(null);
              localStorage.removeItem('psc_code');
              localStorage.removeItem('psc_name');
              setScreen('login');
            }}
          />
        </div>
      )}

      {screen === 'champion' && !am && bracket?.champion && (
        <div style={W}>
          <ChampionScreen
            name={bracket.champion.name}
            onBack={handleReset}
          />
        </div>
      )}
    </div>
  );
}
