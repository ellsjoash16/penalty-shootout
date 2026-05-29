import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ZONES = ['tl','tc','tr','bl','bc','br'];
const ZONE_LABELS = { tl:'Top Left', tc:'Top Centre', tr:'Top Right', bl:'Bottom Left', bc:'Bottom Centre', br:'Bottom Right' };
const ZONE_ICONS = { tl:'↖', tc:'↑', tr:'↗', bl:'↙', bc:'↓', br:'↘' };
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
  try { return JSON.parse(text); } catch { return { error: `Server error (${r.status}) — try again` }; }
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
    0%,100% { box-shadow: 0 0 0 0 rgba(201,162,39,0); }
    50% { box-shadow: 0 0 30px 8px rgba(201,162,39,0.4); }
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
    0% { background: rgba(201,162,39,0); }
    15% { background: rgba(201,162,39,0.18); }
    100% { background: rgba(201,162,39,0); }
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
    border-color: rgba(201,162,39,0.7);
    background: rgba(201,162,39,0.1);
    color: #C9A227;
    transform: scale(1.04);
    box-shadow: 0 0 16px rgba(201,162,39,0.25);
  }
  .zone-btn.selected {
    border-color: #C9A227;
    background: rgba(201,162,39,0.18);
    color: #C9A227;
    box-shadow: 0 0 22px rgba(201,162,39,0.5);
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
    border-color: #C9A227 !important; background: rgba(201,162,39,0.22) !important;
    color: #C9A227 !important;
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
    background: linear-gradient(135deg,#C9A227,#A07D1C);
    color: #000; border: none; border-radius: 12px;
    font-weight: 800; font-size: 14px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; transition: all 0.2s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .prim-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(201,162,39,0.45); }
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
        backgroundImage:'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.035) 1px, transparent 0)',
        backgroundSize:'22px 14px',
        maskImage:'linear-gradient(180deg,rgba(0,0,0,0.8) 0%,transparent 100%)',
        WebkitMaskImage:'linear-gradient(180deg,rgba(0,0,0,0.8) 0%,transparent 100%)',
      }}/>
    </div>
  );
}

function PitchBg({ pulse }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:0,
      backgroundImage:'url(/stadium.png)',
      backgroundSize:'cover',
      backgroundPosition:'top center',
      backgroundRepeat:'no-repeat',
    }}>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        animation: pulse ? 'goalFlashBg 0.8s ease' : 'none',
      }}/>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({length:55},(_,i)=>({
    id:i, x:Math.random()*100,
    delay:Math.random()*1.5,
    dur:2.2+Math.random()*2.5,
    color:['#ffd700','#C9A227','#00e676','#004225','#ff6b35','#ffffff'][Math.floor(Math.random()*6)],
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
// PENALTY OVERLAY — zones/ball/keeper as absolute overlays on PitchBg
// ═══════════════════════════════════════════════════════════════

const CALIBRATE = false;

// ── Goal position in stadium.png (fractions of image dimensions 1366×1450) ──
// Calibrated 2026-05-29 (exact from readout)
const IMG_W     = 1366;
const IMG_H     = 1450;
const GOAL_XL   = 0.2810;  // left post
const GOAL_XR   = 0.7190;  // right post
const GOAL_YTOP = 0.1301;  // crossbar
const GOAL_YBOT = 0.3384;  // goal ground
const SPOT_Y    = 0.6221;  // penalty spot

// Computes goal/ball/keeper positions as % of the main area at the current window size.
// Re-runs on every resize so the grid always tracks the goal in the image.
function useGoalLayout(areaRef) {
  const [layout, setLayout] = useState(null);

  const compute = useCallback(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Score bar top offset — use ref if available, else fall back to 0
    const areaTop = areaRef.current ? areaRef.current.getBoundingClientRect().top : 0;
    const areaH = H - areaTop;
    if (!W || !areaH) return;

    // cover scaling
    const scale = Math.max(W / IMG_W, H / IMG_H);
    const rw = IMG_W * scale;
    const rh = IMG_H * scale;
    const ox = (W - rw) / 2;

    const vL = ox + GOAL_XL * rw;
    const vR = ox + GOAL_XR * rw;
    const vT = GOAL_YTOP * rh;
    const vB = GOAL_YBOT * rh;
    const vS = SPOT_Y * rh;

    // main area spans full width, starts at areaTop
    const px = vx => vx / W * 100;
    const py = vy => (vy - areaTop) / areaH * 100;

    const gL = px(vL), gR = 100 - px(vR);
    const gT = py(vT), gB = 100 - py(vB);
    const gW = 100 - gL - gR;
    const gH = 100 - gT - gB;
    const cx = c => gL + gW / 3 * (c + 0.5);
    const cy = r => gT + gH / 2 * (r + 0.5);

    setLayout({
      grid:    { top:`${gT}%`, left:`${gL}%`, right:`${gR}%`, bottom:`${gB}%` },
      centers: {
        tl:{x:cx(0),y:cy(0)}, tc:{x:cx(1),y:cy(0)}, tr:{x:cx(2),y:cy(0)},
        bl:{x:cx(0),y:cy(1)}, bc:{x:cx(1),y:cy(1)}, br:{x:cx(2),y:cy(1)},
      },
      ball:   { x:50, y: Math.min(93, py(vS)) },
      keeper: { x:50, y: gT + gH / 2 },
    });
  }, []);

  useEffect(() => {
    // rAF ensures the DOM has finished layout before we measure
    const id = requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', compute); };
  }, [compute]);

  return layout;
}

// Ball-only calibration — drag the ball to the penalty spot, read SPOT_Y
function CalibBallOnly({ areaRef }) {
  const [ball, setBall] = useState({ x:50, y:72 });
  const clientXY = e => e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
  const onDown = e => {
    e.preventDefault(); e.stopPropagation();
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const onMove = me => {
      const [cx, cy] = clientXY(me);
      setBall({
        x: Math.max(0, Math.min(100, (cx - rect.left) / rect.width * 100)),
        y: Math.max(0, Math.min(100, (cy - rect.top)  / rect.height * 100)),
      });
    };
    const onUp = () => { window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); window.removeEventListener('touchmove',onMove); window.removeEventListener('touchend',onUp); };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
    window.addEventListener('touchmove',onMove,{passive:false}); window.addEventListener('touchend',onUp);
  };

  // Compute SPOT_Y from ball position
  const el = areaRef.current;
  let spotY = '…';
  if (el) {
    const areaTop = el.getBoundingClientRect().top;
    const H = window.innerHeight, W = window.innerWidth;
    const scale = Math.max(W / IMG_W, H / IMG_H);
    const rh = IMG_H * scale;
    const vBallY = ball.y / 100 * (H - areaTop) + areaTop;
    spotY = (vBallY / rh).toFixed(4);
  }

  return (
    <>
      {/* draggable ball */}
      <div onMouseDown={onDown} onTouchStart={onDown} style={{
        position:'absolute', left:`${ball.x}%`, top:`${ball.y}%`,
        transform:'translate(-50%,-50%)', zIndex:35, touchAction:'none', cursor:'grab',
        width:22, height:22, borderRadius:'50%',
        background:'radial-gradient(circle at 38% 35%,#fff 0%,#e0e0e0 55%,#bbb 100%)',
        border:'3px solid #ff0', boxShadow:'0 0 0 2px #000, 0 2px 8px rgba(0,0,0,0.9)',
      }}/>
      {/* readout */}
      <div style={{
        position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
        background:'rgba(0,0,0,0.95)', color:'#ff0', fontSize:12, fontFamily:'monospace',
        padding:'6px 14px', borderRadius:6, whiteSpace:'nowrap', zIndex:40,
        border:'1px solid #ff0', letterSpacing:1,
      }}>
        SPOT_Y: {spotY}
      </div>
    </>
  );
}

function PenaltyOverlay({ phase, shotZone, saveZone, isGoal, picking, myZone, onPick }) {
  const areaRef    = useRef(null);
  const layout     = useGoalLayout(areaRef);
  const isAnim     = phase === 'animating' || phase === 'result';
  const showReveal = phase === 'result';

  const centers = layout?.centers;
  const ballPos = isAnim && shotZone && centers ? centers[shotZone] : (layout?.ball  ?? { x:50, y:72 });
  const keepPos = isAnim && saveZone && centers ? centers[saveZone] : (layout?.keeper ?? { x:50, y:20 });

  let keeperRotate = 0;
  if (saveZone) {
    if (saveZone.includes('l')) keeperRotate = -40;
    if (saveZone.includes('r')) keeperRotate = 40;
    if (saveZone.startsWith('t')) keeperRotate *= 0.6;
  }

  return (
    <div ref={areaRef} style={{ position:'absolute', inset:0, pointerEvents: CALIBRATE ? 'all' : 'none' }}>

      {CALIBRATE && <CalibBallOnly areaRef={areaRef}/>}

      {/* 3×2 zone grid — dynamically positioned over the goal */}
      {layout && (
        <div style={{
          position:'absolute', ...layout.grid,
          display:'grid', gridTemplate:'1fr 1fr / 1fr 1fr 1fr',
          gap:3, zIndex:8, pointerEvents:'all',
        }}>
          {ZONES.map(z => {
            const isShot = z === shotZone;
            const isSave = z === saveZone;
            let cls = 'zone-btn';
            if (picking) {
              if (myZone === z) cls += ' selected';
            } else if (showReveal) {
              if (isShot) cls += isGoal ? ' reveal-shot-goal' : ' reveal-shot-saved';
              else if (isSave && !isGoal) cls += ' reveal-save';
              else cls += ' reveal-none';
            }
            return (
              <button key={z} className={cls}
                onClick={() => picking && !myZone && onPick && onPick(z)}
                disabled={!picking || !!myZone}
                style={{
                  opacity: picking && myZone && myZone !== z ? 0.4 : 1,
                  background: cls === 'zone-btn' ? 'rgba(0,0,0,0.35)' : undefined,
                  borderColor: cls === 'zone-btn' ? 'rgba(255,255,255,0.55)' : undefined,
                  minHeight:0, gap:1, backdropFilter:'blur(2px)',
                }}>
                {!showReveal && (
                  <span style={{fontSize:16,filter:'drop-shadow(0 1px 4px rgba(0,0,0,1))'}}>
                    {ZONE_ICONS[z]}
                  </span>
                )}
                {showReveal && isShot && isGoal  && <span style={{fontSize:16}}>⚽</span>}
                {showReveal && isShot && !isGoal && isSave && <span style={{fontSize:16}}>🧤</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Keeper */}
      <div style={{
        position:'absolute',
        left:`${keepPos.x}%`, top:`${keepPos.y}%`,
        transform:`translate(-50%,-50%) rotate(${isAnim ? keeperRotate : 0}deg)`,
        transition: isAnim ? 'all 0.62s cubic-bezier(0.2,0,0.4,1)' : 'none',
        zIndex:9,
      }}>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          background:'linear-gradient(135deg,#ff6b35,#e55100)',
          border:'2.5px solid rgba(255,255,255,0.9)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, boxShadow:'0 2px 14px rgba(0,0,0,0.9)',
        }}>🧤</div>
      </div>

      {/* Ball */}
      <div style={{
        position:'absolute',
        left:`${ballPos.x}%`, top:`${ballPos.y}%`,
        transform:'translate(-50%,-50%)',
        transition: isAnim ? 'all 0.72s cubic-bezier(0.25,0,0.3,1)' : 'none',
        zIndex:10,
        width:22, height:22, borderRadius:'50%',
        background:'radial-gradient(circle at 38% 35%,#fff 0%,#e0e0e0 55%,#bbb 100%)',
        border:'1px solid rgba(0,0,0,0.3)',
        boxShadow:'0 2px 12px rgba(0,0,0,0.95)',
      }}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════

function LoginScreen({ serverState, onJoined, onCPU }) {
  const [name, setName]     = useState('');
  const [err, setErr]       = useState('');
  const [busy, setBusy]     = useState(false);
  const [myCode, setMyCode] = useState(null);

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

  if (myCode) return (
    <div className="min-h-full flex flex-col items-center justify-center p-10 relative overflow-hidden" style={{background:'#080b14'}}>
      <style>{CSS}</style>
      <StadiumBg/>
      <div className="relative z-10 w-full max-w-xs text-center">
        <div className="text-4xl mb-4">🎟️</div>
        <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">You're in! Your code is</p>
        <div className="text-6xl font-black font-mono tracking-[0.3em] text-primary mb-2" style={{textShadow:'0 0 40px rgba(201,162,39,0.6)',animation:'scaleIn 0.4s ease'}}>
          {myCode}
        </div>
        <p className="text-xs text-muted-foreground mb-8">Remember this — you'll need it to log back in from another device</p>
        <Button className="w-full" size="lg" onClick={() => onJoined(myCode, name.trim())}>
          Let's Go →
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-10 relative overflow-hidden" style={{background:'#080b14'}}>
      <style>{CSS}</style>
      <StadiumBg/>
      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="mb-4" style={{animation:'floatBob 3s ease-in-out infinite'}}>
          <img src="/daf-logo.png" style={{height:88,objectFit:'contain',filter:'drop-shadow(0 0 24px rgba(201,162,39,0.45))'}} alt="DAF World Cup 2026"/>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-widest mb-1" style={{fontFamily:'Impact,"Arial Narrow Bold",sans-serif',textShadow:'0 0 40px rgba(201,162,39,0.35)'}}>
          DAF <span style={{color:'#C9A227'}}>WORLD CUP</span>
        </h1>
        <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8">2026</p>

        <Card className="bg-transparent border-border/40 text-left">
          <CardContent className="pt-6 flex flex-col gap-4">
            {noTournament && (
              <p className="text-xs text-muted-foreground leading-relaxed text-center">
                No tournament running yet — enter your name to create one
              </p>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] tracking-[0.2em] uppercase font-bold text-muted-foreground">Your Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your name..."
                autoFocus
              />
            </div>
            {err && <p className="text-destructive text-xs">{err}</p>}
            <Button className="w-full" size="lg" disabled={busy} onClick={handleSubmit}>
              {busy ? '…' : noTournament ? '🏟️ Create Tournament' : '⚽ Join Tournament'}
            </Button>
            <div className="flex items-center gap-3">
              <Separator className="flex-1"/>
              <span className="text-[10px] tracking-widest text-muted-foreground">OR</span>
              <Separator className="flex-1"/>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => {
                const n = name.trim();
                if (!n) { setErr('Enter your name first'); return; }
                localStorage.setItem('psc_name', n);
                onCPU(n);
              }}
            >
              🤖 Play Solo vs CPU
            </Button>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground mt-5 tracking-wide">
          {noTournament ? "48 slots · you'll be assigned a bracket code" : "You'll be assigned a random slot in the bracket"}
        </p>
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
      <PitchBg pulse={showReveal && isGoal}/>

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
                  background: !pk ? 'rgba(255,255,255,0.08)' : pk.isGoal ? '#C9A227' : 'rgba(255,255,255,0.25)',
                  border:`1px solid ${!pk ? 'rgba(255,255,255,0.15)' : pk.isGoal ? '#C9A227' : 'rgba(255,255,255,0.4)'}`,
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

        <PenaltyOverlay
          phase={localPhase}
          shotZone={kr?.shotZone}
          saveZone={kr?.saveZone}
          isGoal={kr?.isGoal}
          picking={am.phase === 'picking' && !iHaveSubmitted}
          myZone={myZone}
          onPick={submitZone}
        />

        {/* GOAL / SAVED stamp */}
        {showReveal && (
          <div style={{position:'absolute',inset:0,zIndex:20,pointerEvents:'none'}}>
            <div style={{
              position:'absolute', left:'50%', top:'42%',
              fontSize:58, fontWeight:900,
              fontFamily:'Impact,"Arial Narrow Bold",sans-serif',
              letterSpacing:1, textTransform:'uppercase',
              color: isGoal ? '#C9A227' : '#ff1744',
              textShadow: isGoal
                ? '0 0 60px rgba(201,162,39,0.95),0 0 120px rgba(201,162,39,0.5)'
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

        {/* Role pill + hint — pinned to bottom of main area */}
        <div style={{position:'absolute',bottom:16,left:0,right:0,zIndex:15,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            background: iAmShooter ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.55)',
            border: `1px solid ${iAmShooter ? 'rgba(201,162,39,0.6)' : 'rgba(64,196,255,0.5)'}`,
            borderRadius:20, padding:'6px 16px',
            backdropFilter:'blur(8px)',
          }}>
            <span style={{fontSize:14}}>{iAmShooter ? '⚽' : '🧤'}</span>
            <span style={{
              color: iAmShooter ? '#C9A227' : '#40c4ff',
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
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:9,letterSpacing:2.5,textTransform:'uppercase',textAlign:'center',minHeight:14,textShadow:'0 1px 4px rgba(0,0,0,0.9)'}}>
            {am.phase === 'picking' && !iHaveSubmitted
              ? (iAmShooter ? 'Tap to aim your shot' : 'Tap to choose dive direction')
              : localPhase === 'animating' ? '⚡ Resolving...' : ''}
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
      <PitchBg pulse={localPhase === 'result' && kr?.isGoal}/>

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
                <div style={{ width:10,height:10,borderRadius:'50%', background:!pk?'rgba(255,255,255,0.08)':pk.isGoal?'#C9A227':'rgba(255,255,255,0.25)', border:`1px solid ${!pk?'rgba(255,255,255,0.15)':pk.isGoal?'#C9A227':'rgba(255,255,255,0.4)'}`, transition:'all 0.3s' }}/>
                <div style={{ width:10,height:10,borderRadius:'50%', background:!ak?'rgba(255,255,255,0.08)':ak.isGoal?'#ff1744':'rgba(255,255,255,0.25)', border:`1px solid ${!ak?'rgba(255,255,255,0.15)':ak.isGoal?'#ff1744':'rgba(255,255,255,0.4)'}`, transition:'all 0.3s' }}/>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
        <PenaltyOverlay
          phase={localPhase}
          shotZone={kr?.shotZone}
          saveZone={kr?.saveZone}
          isGoal={kr?.isGoal}
        />
        {localPhase === 'result' && (
          <div style={{ position:'absolute', inset:0, zIndex:20, pointerEvents:'none' }}>
            <div style={{
              position:'absolute', left:'50%', top:'42%',
              fontSize:58, fontWeight:900,
              fontFamily:'Impact,sans-serif', letterSpacing:1, textTransform:'uppercase',
              color: kr?.isGoal ? '#C9A227' : '#ff1744',
              textShadow: kr?.isGoal ? '0 0 60px rgba(201,162,39,0.95)' : '0 0 60px rgba(255,23,68,0.9)',
              animation:'stampIn 0.42s cubic-bezier(0.2,0,0.2,1) forwards',
            }}>{kr?.isGoal ? 'GOAL!' : 'SAVED!'}</div>
          </div>
        )}
        <div style={{position:'absolute',bottom:16,left:0,right:0,zIndex:15,display:'flex',justifyContent:'center'}}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:9, letterSpacing:3, textTransform:'uppercase',textShadow:'0 1px 4px rgba(0,0,0,0.9)' }}>
            {am.phase === 'picking'
              ? `${am.choicesSubmitted.p1 ? '✓' : '○'} ${am.p1.name.split(' ')[0]}  ·  ${am.choicesSubmitted.p2 ? '✓' : '○'} ${am.p2.name.split(' ')[0]}`
              : ''}
          </div>
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
  const WL = 'rgba(201,162,39,0.28)';
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
      <div style={{width:14,height:14,borderRadius:'50%',flexShrink:0,background:won?'rgba(201,162,39,0.2)':'rgba(255,255,255,0.06)',border:`1px solid ${won?'#C9A227':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:900,color:won?'#C9A227':'rgba(255,255,255,0.3)'}}>
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
      {won&&<span style={{color:'#C9A227',fontSize:8}}>✓</span>}
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
          else if (canPlay)   { bc='rgba(201,162,39,0.6)';    bg='rgba(201,162,39,0.05)'; }
          return (
            <div key={m.id} onClick={()=>canPlay&&onMatchClick(m)} style={{
              position:'absolute',left:PX+colX(col),top:HEADER_H+rawTop(col,idx),
              width:MW,height:MH,border:`1px solid ${bc}`,borderRadius:6,background:bg,
              cursor:canPlay?'pointer':'default',display:'flex',flexDirection:'column',
              overflow:'hidden',boxSizing:'border-box',
              boxShadow:isActive?'0 0 12px rgba(255,215,0,0.15)':canPlay?'0 0 8px rgba(201,162,39,0.15)':'none',
            }}>
              {isPH ? <PHSlot/> : <TSlot p={m.p1} won={m.winner?.code===m.p1?.code} played={m.played} isWCSlot={false}/>}
              <div style={{height:1,background:'rgba(255,255,255,0.05)'}}/>
              {isPH ? <PHSlot/> : <TSlot p={m.p2} won={m.winner?.code===m.p2?.code} played={m.played} isWCSlot={col===1&&!m.p2}/>}
              {isActive&&<div style={{position:'absolute',inset:'auto 0 0',height:9,background:'rgba(255,215,0,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#ffd700',fontSize:6,fontWeight:800,letterSpacing:1.5}}>LIVE {activeMatch.p1Score}–{activeMatch.p2Score}</span></div>}
              {canPlay&&<div style={{position:'absolute',inset:'auto 0 0',height:8,background:'rgba(201,162,39,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#C9A227',fontSize:5.5,fontWeight:800,letterSpacing:1.5}}>▶ PLAY</span></div>}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CPU TOURNAMENT MODE
// ═══════════════════════════════════════════════════════════════

const CPU_ROUNDS = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'];

function CPUMatchScreen({ playerName, roundLabel, onDone }) {
  const [kicks, setKicks]   = useState([]);
  const [phase, setPhase]   = useState('picking');
  const [myZone, setMyZone] = useState(null);
  const [kr, setKr]         = useState(null);
  const [winner, setWinner] = useState(null);
  const [sd, setSd]         = useState(false);
  const busyRef             = useRef(false);
  const kicksRef            = useRef([]);
  const sdRef               = useRef(false);

  const kickNum    = kicksRef.current.length + 1;
  const iAmShooter = kickNum % 2 === 1;

  const p1Score         = kicks.filter((k, i) => i % 2 === 0 && k.isGoal).length;
  const p2Score         = kicks.filter((k, i) => i % 2 !== 0 && k.isGoal).length;
  const playerShotKicks = kicks.filter((_, i) => i % 2 === 0);
  const cpuShotKicks    = kicks.filter((_, i) => i % 2 !== 0);

  const handlePick = async (zone) => {
    if (busyRef.current || phase !== 'picking') return;
    busyRef.current = true;
    setMyZone(zone);
    setKr(null);
    setPhase('animating');

    await new Promise(r => setTimeout(r, 600));
    const cpuZone = rz();
    const kn = kicksRef.current.length + 1;
    const playerShootsNow = kn % 2 === 1;
    const shotZone = playerShootsNow ? zone : cpuZone;
    const saveZone = playerShootsNow ? cpuZone : zone;
    const isGoal   = shotZone !== saveZone;
    const scorer   = isGoal ? (playerShootsNow ? 'player' : 'cpu') : null;
    const result   = { shotZone, saveZone, isGoal, scorer };

    const newKicks = [...kicksRef.current, result];
    kicksRef.current = newKicks;
    setKicks(newKicks);
    setKr(result);

    await new Promise(r => setTimeout(r, 750));
    setPhase('result');

    const np1 = newKicks.filter((k, i) => i % 2 === 0 && k.isGoal).length;
    const np2 = newKicks.filter((k, i) => i % 2 !== 0 && k.isGoal).length;

    await new Promise(r => setTimeout(r, 1800));

    const total = newKicks.length;
    if (!sdRef.current) {
      if (total >= TOTAL_KICKS) {
        if (np1 !== np2) {
          setWinner(np1 > np2 ? 'player' : 'cpu');
          setPhase('done');
          busyRef.current = false;
          return;
        }
        sdRef.current = true;
        setSd(true);
      }
    } else {
      const sdCount = total - TOTAL_KICKS;
      if (sdCount % 2 === 0 && np1 !== np2) {
        setWinner(np1 > np2 ? 'player' : 'cpu');
        setPhase('done');
        busyRef.current = false;
        return;
      }
    }

    setMyZone(null);
    setPhase('picking');
    busyRef.current = false;
  };

  const showReveal = phase === 'result';
  const isGoalNow  = kr?.isGoal;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#080b14',fontFamily:"'Trebuchet MS','Gill Sans',Calibri,sans-serif",position:'relative',overflow:'hidden'}}>
      <PitchBg pulse={showReveal && isGoalNow}/>

      <div style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'10px 16px',position:'relative',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{flex:1}}>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>{roundLabel}</div>
            <div style={{color:'#fff',fontSize:12,fontWeight:700}}>{playerName}</div>
          </div>
          <div style={{textAlign:'center',padding:'0 12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div key={p1Score} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:'Impact,"Arial Narrow Bold",sans-serif',lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{p1Score}</div>
              <div style={{color:'rgba(255,255,255,0.25)',fontSize:20,fontWeight:200}}>:</div>
              <div key={p2Score+100} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:'Impact,"Arial Narrow Bold",sans-serif',lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{p2Score}</div>
            </div>
            <div style={{color:'rgba(255,255,255,0.28)',fontSize:9,letterSpacing:2,textTransform:'uppercase',marginTop:1}}>
              {sd ? '⚡ SD' : `Kick ${Math.min(kickNum, TOTAL_KICKS)}/${TOTAL_KICKS}`}
            </div>
          </div>
          <div style={{flex:1,textAlign:'right'}}>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>vs</div>
            <div style={{color:'#ff6b35',fontSize:12,fontWeight:700}}>CPU</div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:3,marginTop:8}}>
          {Array.from({length:Math.ceil(TOTAL_KICKS/2)},(_,i)=>{
            const pk=playerShotKicks[i]; const ck=cpuShotKicks[i];
            return (
              <div key={i} style={{display:'flex',flexDirection:'column',gap:2,alignItems:'center'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:!pk?'rgba(255,255,255,0.08)':pk.isGoal?'#C9A227':'rgba(255,255,255,0.25)',border:`1px solid ${!pk?'rgba(255,255,255,0.15)':pk.isGoal?'#C9A227':'rgba(255,255,255,0.4)'}`,transition:'all 0.3s'}}/>
                <div style={{width:10,height:10,borderRadius:'50%',background:!ck?'rgba(255,255,255,0.08)':ck.isGoal?'#ff1744':'rgba(255,255,255,0.25)',border:`1px solid ${!ck?'rgba(255,255,255,0.15)':ck.isGoal?'#ff1744':'rgba(255,255,255,0.4)'}`,transition:'all 0.3s'}}/>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',zIndex:1,overflow:'hidden'}}>
        <PenaltyOverlay
          phase={phase}
          shotZone={kr?.shotZone}
          saveZone={kr?.saveZone}
          isGoal={kr?.isGoal}
          picking={phase === 'picking'}
          myZone={myZone}
          onPick={handlePick}
        />

        {showReveal && (
          <div style={{position:'absolute',inset:0,zIndex:20,pointerEvents:'none'}}>
            <div style={{position:'absolute',left:'50%',top:'42%',fontSize:58,fontWeight:900,fontFamily:'Impact,"Arial Narrow Bold",sans-serif',letterSpacing:1,textTransform:'uppercase',color:isGoalNow?'#C9A227':'#ff1744',textShadow:isGoalNow?'0 0 60px rgba(201,162,39,0.95),0 0 120px rgba(201,162,39,0.5)':'0 0 60px rgba(255,23,68,0.9)',animation:'stampIn 0.42s cubic-bezier(0.2,0,0.2,1) forwards'}}>
              {isGoalNow ? 'GOAL!' : 'SAVED!'}
            </div>
            <div style={{position:'absolute',left:'50%',top:'62%',transform:'translateX(-50%)',color:'rgba(255,255,255,0.65)',fontSize:12,letterSpacing:1.5,textTransform:'uppercase',textAlign:'center',animation:'fadeSlideUp 0.5s 0.25s ease both'}}>
              {isGoalNow ? `🔥 ${kr.scorer==='player' ? playerName.split(' ')[0] : 'CPU'} scored!` : '🧤 Saved!'}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{position:'absolute',inset:0,zIndex:25,background:'rgba(0,0,0,0.78)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',animation:'scaleIn 0.5s ease'}}>
            <div style={{fontSize:52,fontWeight:900,fontFamily:'Impact,sans-serif',textTransform:'uppercase',letterSpacing:1,color:winner==='player'?'#ffd700':'#ff6b35',textShadow:winner==='player'?'0 0 50px rgba(255,215,0,0.6)':'none'}}>
              {winner === 'player' ? '🏆 You Win!' : '💀 You Lose'}
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:18,marginTop:8}}>{p1Score} – {p2Score}</div>
            <Button onClick={() => onDone(winner === 'player')} size="lg" style={{marginTop:24}}>Continue →</Button>
          </div>
        )}

        {/* Role pill + hint pinned to bottom */}
        <div style={{position:'absolute',bottom:16,left:0,right:0,zIndex:15,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,0.55)',border:`1px solid ${iAmShooter?'rgba(201,162,39,0.6)':'rgba(64,196,255,0.5)'}`,borderRadius:20,padding:'6px 16px',backdropFilter:'blur(8px)'}}>
            <span style={{fontSize:14}}>{iAmShooter ? '⚽' : '🧤'}</span>
            <span style={{color:iAmShooter?'#C9A227':'#40c4ff',fontSize:10,fontWeight:800,letterSpacing:2.5,textTransform:'uppercase'}}>
              {playerName.split(' ')[0]} — {iAmShooter ? 'SHOOT' : 'SAVE'}
            </span>
            {sd && <span style={{color:'#ffd700',fontSize:9,fontWeight:800,letterSpacing:2,marginLeft:4}}>⚡SD</span>}
          </div>
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:9,letterSpacing:2.5,textTransform:'uppercase',textAlign:'center',minHeight:14,textShadow:'0 1px 4px rgba(0,0,0,0.9)'}}>
            {phase === 'picking' ? (iAmShooter ? 'Tap to aim your shot' : 'Tap to choose dive direction') : phase === 'animating' ? '⚡ Resolving...' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}


function CPUBracketScreen({ playerName, onExit }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [inMatch, setInMatch]   = useState(false);
  const [results, setResults]   = useState([]);
  const [done, setDone]         = useState(null);

  const handleMatchDone = (won) => {
    const newResults = [...results, won ? 'win' : 'loss'];
    setResults(newResults);
    setInMatch(false);
    if (!won) {
      setDone('eliminated');
    } else if (roundIdx === CPU_ROUNDS.length - 1) {
      setDone('champion');
    } else {
      setRoundIdx(prev => prev + 1);
    }
  };

  if (inMatch) {
    return (
      <CPUMatchScreen
        playerName={playerName}
        roundLabel={CPU_ROUNDS[roundIdx]}
        onDone={handleMatchDone}
      />
    );
  }

  if (done === 'champion') {
    return (
      <div className="h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-10" style={{background:'#080b14'}}>
        <StadiumBg/>
        <Confetti/>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="text-7xl" style={{animation:'floatBob 2s ease-in-out infinite'}}>🏆</div>
          <div className="text-5xl font-black uppercase tracking-widest" style={{fontFamily:'Impact,"Arial Narrow Bold",sans-serif',color:'#ffd700',textShadow:'0 0 60px rgba(255,215,0,0.6)',animation:'scaleIn 0.5s ease'}}>CHAMPION!</div>
          <div className="text-xl font-bold text-foreground">{playerName}</div>
          <Badge variant="warning" className="text-xs tracking-widest uppercase">Beat all {CPU_ROUNDS.length} CPU rounds</Badge>
          <Button variant="secondary" className="mt-6" onClick={onExit}>← Back to Menu</Button>
        </div>
      </div>
    );
  }

  if (done === 'eliminated') {
    return (
      <div className="h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-10" style={{background:'#080b14'}}>
        <StadiumBg/>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="text-6xl">💀</div>
          <div className="text-4xl font-black uppercase tracking-widest" style={{fontFamily:'Impact,"Arial Narrow Bold",sans-serif',color:'#ff6b35'}}>ELIMINATED</div>
          <p className="text-muted-foreground text-sm">You reached the {CPU_ROUNDS[roundIdx]}</p>
          <p className="text-muted-foreground text-xs tracking-wide">
            Won {results.filter(r => r === 'win').length} of {results.length} round{results.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onExit}>← Menu</Button>
            <Button onClick={() => { setRoundIdx(0); setInMatch(false); setResults([]); setDone(null); }}>🔄 Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{background:'#080b14'}}>
      <StadiumBg/>
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{background:'rgba(0,0,0,0.55)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <Button variant="ghost" size="icon" onClick={onExit} className="text-muted-foreground text-lg">←</Button>
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-yellow-400">🤖 Solo vs CPU</div>
          <div className="text-muted-foreground text-[10px] mt-0.5">DAF World Cup 2026</div>
        </div>
        <span className="ml-auto text-sm font-semibold text-foreground/70">{playerName}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-5 relative z-10">
        <div className="max-w-sm mx-auto flex flex-col gap-3">
          {CPU_ROUNDS.map((label, i) => {
            const isNext = i === roundIdx;
            const res = results[i];
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all" style={{
                background: isNext ? 'rgba(201,162,39,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isNext ? 'rgba(201,162,39,0.35)' : res ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)'}`,
                opacity: !res && !isNext ? 0.35 : 1,
              }}>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black" style={{
                  background: res==='win'?'rgba(201,162,39,0.15)':res==='loss'?'rgba(255,23,68,0.15)':isNext?'rgba(201,162,39,0.1)':'rgba(255,255,255,0.04)',
                  border:`1.5px solid ${res==='win'?'#C9A227':res==='loss'?'#ff1744':isNext?'rgba(201,162,39,0.45)':'rgba(255,255,255,0.1)'}`,
                  color: res==='win'?'#C9A227':res==='loss'?'#ff1744':isNext?'#C9A227':'rgba(255,255,255,0.4)',
                }}>
                  {res === 'win' ? '✓' : res === 'loss' ? '✗' : isNext ? '▶' : `${i+1}`}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{color:isNext?'#C9A227':res==='win'?'#C9A227':res==='loss'?'#ff4444':'rgba(255,255,255,0.5)'}}>{label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {res === 'win' ? 'Won ✓' : res === 'loss' ? 'Lost ✗' : isNext ? 'Up next' : 'Locked'}
                  </div>
                </div>
                {isNext && <Button size="sm" onClick={() => setInMatch(true)}>Play</Button>}
              </div>
            );
          })}
        </div>
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
    <div className="h-full flex flex-col relative overflow-hidden" style={{background:'#080b14'}}>
      <StadiumBg/>
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{background:'rgba(0,0,0,0.55)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground text-lg">←</Button>
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-yellow-400">🏆 Tournament Bracket</div>
          <div className="text-muted-foreground text-[10px] mt-0.5">
            {myCode && <span className="font-mono text-primary mr-1.5">{myCode}</span>}
            DAF World Cup 2026
          </div>
        </div>
        <div className="ml-auto">
          <Badge variant="warning" className="text-[9px] tracking-widest uppercase">{stageLabel}</Badge>
        </div>
      </div>

      <BracketTree bracket={bracket} activeMatch={activeMatch} onMatchClick={openMatch}/>

      {pendingMatch && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6" style={{background:'rgba(0,0,0,0.93)'}}>
          <Card className="w-full max-w-xs">
            <CardContent className="pt-6 flex flex-col gap-4">
              <p className="text-center text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                {pendingMatch.id.replace(/_/g,' ').toUpperCase()}
              </p>
              {[
                {slot:pendingMatch.p1, color:'#C9A227', label:'Player 1'},
                {slot:pendingMatch.p2, color:'#ff6b35', label:'Player 2'},
              ].map(({slot,color,label}) => (
                <div key={label} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${slot?.name ? color+'44' : 'rgba(255,255,255,0.08)'}`}}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-black tracking-widest px-2 py-0.5 rounded" style={{color,background:`${color}18`}}>{slot?.code}</span>
                    <span className="text-[9px] tracking-widest uppercase text-muted-foreground">{label}</span>
                  </div>
                  <div className="text-sm" style={{color:slot?.name?'#fff':'rgba(255,255,255,0.35)',fontWeight:slot?.name?600:400}}>
                    {slot?.name || <em className="text-[11px]">Not registered yet</em>}
                  </div>
                </div>
              ))}
              {err && <p className="text-destructive text-xs text-center">{err}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setPendingMatch(null); setErr(''); }}>Cancel</Button>
                <Button className="flex-[2]" disabled={busy || !pendingMatch.p1?.name || !pendingMatch.p2?.name} onClick={handleKickOff}>
                  {busy ? '…' : '⚽ Kick Off'}
                </Button>
              </div>
              {(!pendingMatch.p1?.name || !pendingMatch.p2?.name) && (
                <p className="text-muted-foreground text-[10px] text-center">Both players need to register first</p>
              )}
            </CardContent>
          </Card>
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
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-7" style={{background:'#080b14'}}>
      <StadiumBg pulse/>
      <Confetti/>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="text-7xl" style={{animation:'floatBob 1.5s ease-in-out infinite',filter:'drop-shadow(0 0 30px rgba(255,215,0,0.6))'}}>🏆</div>
        <p className="text-[11px] tracking-[0.4em] uppercase font-black text-yellow-400" style={{textShadow:'0 0 25px rgba(255,215,0,0.5)'}}>DAF World Cup 2026</p>
        <div className="text-4xl font-black tracking-wide text-foreground" style={{fontFamily:'Impact,sans-serif',animation:'scaleIn 0.7s ease'}}>{name}</div>
        <Badge variant="success" className="text-xs tracking-widest uppercase px-4 py-1">DAF World Cup 2026 Champion</Badge>
        <Button size="lg" className="mt-6" onClick={onBack}>🎉 Play Again</Button>
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
  const [screen, setScreen] = useState('loading'); // loading | login | tournament | champion | cpu
  const [cpuName, setCpuName] = useState('');

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

  const handleCPU = (name) => {
    setCpuName(name);
    setScreen('cpu');
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
          <LoginScreen serverState={serverState} onJoined={handleJoined} onCPU={handleCPU}/>
        </div>
      )}

      {screen === 'cpu' && (
        <div style={W}>
          <CPUBracketScreen
            playerName={cpuName || localStorage.getItem('psc_name') || 'Player'}
            onExit={() => setScreen('login')}
          />
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
