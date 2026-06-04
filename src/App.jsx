import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ZONES = ['tl','tc','tr','bl','bc','br'];
const ZONE_LABELS = { tl:'Top Left', tc:'Top Centre', tr:'Top Right', bl:'Bottom Left', bc:'Bottom Centre', br:'Bottom Right' };
const ZONE_ICONS = { tl:'↖', tc:'↑', tr:'↗', bl:'↙', bc:'↓', br:'↘' };
const TOTAL_KICKS = 6;
const CHOOSE_TIME = 9; // seconds shown on client countdown

// ─── SWEEPSTAKE ───────────────────────────────────────────────────────────────
const SWEEPSTAKE_TIERS = [
  { tier:1, label:'Elite',       color:'#ffd700', teams:['France','Spain','Argentina','England','Portugal','Brazil','Netherlands','Morocco'] },
  { tier:2, label:'Contenders',  color:'#00c853', teams:['Belgium','Germany','Croatia','Colombia','Senegal','Mexico','United States','Uruguay'] },
  { tier:3, label:'Strong',      color:'#2196f3', teams:['Japan','Switzerland','Norway','Australia','Türkiye','Austria','Ecuador','Sweden'] },
  { tier:4, label:'Competitive', color:'#ff9800', teams:['Iran','Scotland','Egypt','Panama','Ivory Coast','Canada','Algeria','Paraguay'] },
  { tier:5, label:'Underdogs',   color:'#9c27b0', teams:['South Korea','Tunisia','Czechia','DR Congo','Uzbekistan','South Africa','Iraq','Qatar'] },
  { tier:6, label:'Dark Horses', color:'#607d8b', teams:['Saudi Arabia','Jordan','Bosnia & Herzegovina','Cape Verde','Ghana','Curaçao','Haiti','New Zealand'] },
];
const ALL_WC_TEAMS   = SWEEPSTAKE_TIERS.flatMap(t => t.teams);
const TEAM_TIER_MAP  = Object.fromEntries(SWEEPSTAKE_TIERS.flatMap(({ tier, color, teams }) => teams.map(t => [t, { tier, color }])));
const SW_ROUNDS      = ['r32','r16','qf','sf','runner_up','winner'];
const SW_ROUND_PTS   = { r32:5, r16:10, qf:20, sf:35, runner_up:50, winner:100 };
const SW_ROUND_LABELS = { r32:'Round of 32', r16:'Round of 16', qf:'Quarter-Final', sf:'Semi-Final', runner_up:'Runner-up', winner:'Winner' };
const SW_ROUND_SHORT  = { r32:'R32', r16:'R16', qf:'QF', sf:'SF', runner_up:'Final', winner:'WINNER' };
const swTeamPts = td => {
  if (!td) return 0;
  let pts = td.groupPts || 0;
  const idx = SW_ROUNDS.indexOf(td.reached);
  if (idx >= 0) for (let i = 0; i <= idx; i++) pts += SW_ROUND_PTS[SW_ROUNDS[i]];
  if (td.topScorer) pts += 15;
  if (td.cleanSheetFinal) pts += 10;
  pts += (td.upsets || 0) * 10;
  pts += (td.firstGoals || 0) * 2;
  return pts;
};
const swParticipantPts = (p, teamData) =>
  (p.teams || []).reduce((sum, t) => sum + swTeamPts(teamData?.[t]), 0);

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
    0% { transform: translate(-50%,-50%) scale(3.2) rotate(-12deg); opacity: 0; }
    40% { transform: translate(-50%,-50%) scale(0.86) rotate(4deg); opacity: 1; }
    65% { transform: translate(-50%,-50%) scale(1.06) rotate(-2.5deg); }
    100% { transform: translate(-50%,-50%) scale(1) rotate(-2deg); opacity: 1; }
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
    0%,100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); }
    50% { box-shadow: 0 0 30px 8px rgba(0,200,83,0.4); }
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
    0% { background: rgba(0,200,83,0); }
    15% { background: rgba(0,200,83,0.18); }
    100% { background: rgba(0,200,83,0); }
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
  @keyframes floodBeam {
    0%,100% { opacity: 0.13; transform: rotate(-28deg) scaleY(1); }
    50%      { opacity: 0.22; transform: rotate(-28deg) scaleY(1.04); }
  }
  @keyframes floodBeam2 {
    0%,100% { opacity: 0.10; transform: rotate(28deg) scaleY(1); }
    50%      { opacity: 0.18; transform: rotate(28deg) scaleY(1.04); }
  }
  @keyframes tickerSlide {
    0%   { transform: translateY(32px); opacity: 0; }
    15%  { transform: translateY(0);    opacity: 1; }
    80%  { transform: translateY(0);    opacity: 1; }
    100% { transform: translateY(-32px); opacity: 0; }
  }
  @keyframes logoReveal {
    0%   { opacity:0; transform: scale(0.7) translateY(20px); filter: blur(12px) brightness(2); }
    60%  { opacity:1; transform: scale(1.04) translateY(-4px); filter: blur(0) brightness(1.2); }
    100% { opacity:1; transform: scale(1) translateY(0);       filter: blur(0) brightness(1); }
  }
  @keyframes crowd {
    0%,100% { opacity: 0.18; }
    50%     { opacity: 0.28; }
  }
  @keyframes loadBar {
    0%   { width: 0%; }
    40%  { width: 55%; }
    70%  { width: 78%; }
    100% { width: 100%; }
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
    border-color: rgba(0,200,83,0.7);
    background: rgba(0,200,83,0.1);
    color: #00c853;
    transform: scale(1.04);
    box-shadow: 0 0 16px rgba(0,200,83,0.25);
  }
  .zone-btn.selected {
    border-color: #00c853;
    background: rgba(0,200,83,0.18);
    color: #00c853;
    box-shadow: 0 0 22px rgba(0,200,83,0.5);
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
    border-color: #00c853 !important; background: rgba(0,200,83,0.22) !important;
    color: #00c853 !important;
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
    background: linear-gradient(135deg,#00c853,#00a651);
    color: #000; border: none; border-radius: 12px;
    font-weight: 800; font-size: 14px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; transition: all 0.2s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .prim-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,200,83,0.45); }
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

const TICKER_PHRASES = [
  'DAF WORLD CUP 2026',
  '48 NATIONS',
  'ONE CHAMPION',
  'PENALTY SHOOTOUT',
  'WHO TAKES THE GLORY?',
];

function LoadingTicker() {
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % TICKER_PHRASES.length);
      setKey(k => k + 1);
    }, 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{position:'absolute',bottom:60,left:0,right:0,textAlign:'center',zIndex:11,overflow:'hidden',height:40,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div
        key={key}
        style={{
          fontFamily:"'Big Shoulders Display',sans-serif",
          fontSize:22,
          letterSpacing:8,
          color:'rgba(255,255,255,0.75)',
          animation:'tickerSlide 2.6s ease forwards',
          textTransform:'uppercase',
          textShadow:'0 0 40px rgba(0,200,83,0.6)',
        }}
      >
        {TICKER_PHRASES[idx]}
      </div>
    </div>
  );
}

function StadiumBg({ pulse }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:0, overflow:'hidden',
      background:'url(/bg.png) center/cover no-repeat',
      animation: pulse ? 'goalFlashBg 0.8s ease' : 'none',
    }}>
      <div style={{
        position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)',
        width:700, height:400,
        background:'radial-gradient(ellipse, rgba(0,20,80,0.5) 0%, transparent 65%)',
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
    color:['#00c853','#00a651','#00e676','#004225','#ff6b35','#ffffff'][Math.floor(Math.random()*6)],
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
        background:'rgba(0,0,0,0.95)', color:'#ff0', fontSize:12, fontFamily:"'DM Sans',system-ui,sans-serif",
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
                {showReveal && isShot && isGoal  && <span style={{fontSize:11,fontWeight:900,letterSpacing:1}}>GOAL</span>}
                {showReveal && isShot && !isGoal && isSave && <span style={{fontSize:11,fontWeight:900,letterSpacing:1}}>SAVED</span>}
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
        }}><span style={{fontSize:9,fontWeight:900,letterSpacing:0.5,color:'#fff'}}>GK</span></div>
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

function makeDragHandler(setter) {
  return (e) => {
    e.preventDefault(); e.stopPropagation();
    const startMX = e.clientX, startMY = e.clientY;
    let startEX = 0, startEY = 0;
    setter(p => { startEX = p.x; startEY = p.y; return p; });
    const onMove = (me) => setter(p => ({ ...p, x: startEX + me.clientX - startMX, y: startEY + me.clientY - startMY }));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
}

const WC2026 = [
  'Argentina','Australia','Austria','Belgium','Brazil','Cameroon','Canada','Colombia',
  'Costa Rica','Croatia','Denmark','DR Congo','Ecuador','Egypt','England','France',
  'Germany','Honduras','Hungary','Indonesia','Iran','Iraq','Japan','Jordan',
  'Mali','Mexico','Morocco','Netherlands','New Zealand','Nigeria','Panama','Portugal',
  'Romania','Saudi Arabia','Scotland','Senegal','Serbia','Slovakia','South Africa',
  'South Korea','Spain','Switzerland','Tunisia','Turkey','Ukraine','United States',
  'Uruguay','Uzbekistan',
].sort();

function CountryPicker({ onPick }) {
  const [search, setSearch] = useState('');
  const filtered = WC2026.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{minHeight:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px',position:'relative',overflow:'hidden',background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
      <style>{CSS}</style>
      <StadiumBg/>
      <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:380,display:'flex',flexDirection:'column',gap:12}}>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:10,letterSpacing:'0.25em',textTransform:'uppercase',textAlign:'center',marginBottom:2}}>Step 2 of 2</p>
        <h2 style={{color:'#fff',fontSize:18,fontWeight:900,letterSpacing:'0.05em',textAlign:'center',margin:0}}>Pick your country</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,textAlign:'center',margin:0}}>48 nations · 2026 World Cup</p>
        <Input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{marginTop:4}}
        />
        <div style={{maxHeight:340,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
          {filtered.map(c => (
            <button key={c} onClick={() => onPick(c)} style={{
              background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:6,padding:'10px 14px',color:'#fff',fontSize:13,fontWeight:600,
              textAlign:'left',cursor:'pointer',transition:'background 0.15s',letterSpacing:'0.02em',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(0,200,83,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
            >
              {c}
            </button>
          ))}
          {filtered.length === 0 && <p style={{color:'rgba(255,255,255,0.3)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No match</p>}
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ serverState, onJoined, onCPU, onAdminView, onAdminManage }) {
  const [name, setName]         = useState('');
  const [tCode, setTCode]       = useState('');
  const isValidEmail = v => /^[^\s@]+@dialaflight\.co\.uk$/.test(v);
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [myCode, setMyCode]     = useState(null);
  const [pickCountry, setPickCountry] = useState(false);
  const [managing, setManaging]         = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const noTournament = !serverState?.bracket;
  const logoPos = { x: 0, y: -117 };

  const formPos = { x: 0, y: 74 };

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) { setErr('Enter your email'); return; }
    if (!isValidEmail(n)) { setErr('Must be a @dialaflight.co.uk email'); return; }
    if (!noTournament && !tCode.trim()) { setErr('Enter the tournament code'); return; }
    if (!noTournament && tCode.trim().length < 4) { setErr('Tournament code must be 4 characters'); return; }
    if (noTournament && !tournamentName.trim()) { setErr('Give the tournament a name'); return; }
    setBusy(true); setErr('');
    const endpoint = noTournament ? '/api/tournament/create' : '/api/join';
    try {
      const res = await api(endpoint, { name: n, tournamentCode: tCode.trim().toUpperCase(), tournamentName: tournamentName.trim() });
      if (res.error) { setErr(res.error); setBusy(false); return; }
      localStorage.setItem('psc_code', res.code);
      localStorage.setItem('psc_name', n);
      if (res.tournamentCode) localStorage.setItem('psc_tcode', res.tournamentCode);
      if (res.tournamentName) localStorage.setItem('psc_tname', res.tournamentName);
      setMyCode(res.code);
    } catch (e) {
      setErr(`Network error on ${endpoint} — ${e.message}`);
    }
    setBusy(false);
  };

  if (pickCountry) return (
    <CountryPicker onPick={country => {
      localStorage.setItem('psc_country', country);
      onJoined(myCode, name.trim());
    }}/>
  );

  // Creator: show tournament code to share, then go in
  const storedTCode = localStorage.getItem('psc_tcode');
  if (myCode === null && storedTCode && storedTCode !== 'undefined') return (
    <div style={{minHeight:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px',background:'#030d1a',position:'relative',overflow:'hidden'}}>
      <style>{CSS}</style>
      <StadiumBg/>
      <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:320,display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
        {/* Card */}
        <div style={{width:'100%',background:'rgba(4,16,32,0.95)',border:'1px solid rgba(0,200,83,0.2)',borderRadius:16,padding:'32px 28px',display:'flex',flexDirection:'column',alignItems:'center',gap:6,boxShadow:'0 0 60px rgba(0,200,83,0.08), 0 24px 48px rgba(0,0,0,0.6)'}}>
          <p style={{color:'#00c853',fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',fontWeight:700,margin:0}}>Tournament Created</p>
          {localStorage.getItem('psc_tname') && (
            <p style={{color:'#fff',fontSize:18,fontWeight:800,margin:0,letterSpacing:'0.03em',textAlign:'center',fontFamily:"'Big Shoulders Display',sans-serif",textTransform:'uppercase'}}>{localStorage.getItem('psc_tname')}</p>
          )}
          <div style={{height:1,width:'100%',background:'rgba(255,255,255,0.07)',margin:'10px 0'}}/>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:0,letterSpacing:'0.08em'}}>Share this code with your players</p>
          {/* Big code */}
          <div style={{
            fontSize:56,letterSpacing:'0.22em',color:'#00c853',lineHeight:1,
            fontFamily:"'Big Shoulders Display',sans-serif",textTransform:'uppercase',
            textShadow:'0 0 30px rgba(0,200,83,0.5)',
            animation:'scaleIn 0.4s ease',padding:'8px 0',
          }}>
            {storedTCode}
          </div>
          <div style={{height:1,width:'100%',background:'rgba(255,255,255,0.07)',margin:'10px 0'}}/>
          <Button className="w-full" size="lg" onClick={() => onJoined(null, name.trim())}>
            Go to Admin View →
          </Button>
        </div>
      </div>
    </div>
  );

  // Player joined — skip code screen, go straight to country picker or tournament
  if (myCode) {
    if (!localStorage.getItem('psc_country')) {
      // use effect-free defer
      setTimeout(() => setPickCountry(true), 0);
      return null;
    }
    setTimeout(() => onJoined(myCode, name.trim()), 0);
    return null;
  }

  const [step, setStep]               = useState(1);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [adminPrompt, setAdminPrompt] = useState(false);
  const [adminEmail, setAdminEmail]   = useState('');
  const [adminPass, setAdminPass]     = useState('');
  const [adminErr, setAdminErr]       = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(() => !!sessionStorage.getItem('psc_admin'));
  const [newTourneyModal, setNewTourneyModal] = useState(false);
  const [newTourneyName, setNewTourneyName]   = useState('');
  const [newTourneyBusy, setNewTourneyBusy]   = useState(false);
  const [newTourneyErr, setNewTourneyErr]     = useState('');

  const createNewTourney = async () => {
    const tname = newTourneyName.trim();
    if (!tname) { setNewTourneyErr('Enter a tournament name'); return; }
    setNewTourneyBusy(true);
    await api('/api/tournament/reset', {});
    const res = await api('/api/tournament/create', { name: 'TheHub@dialaflight.co.uk', tournamentName: tname });
    setNewTourneyBusy(false);
    if (res.error) { setNewTourneyErr(res.error); return; }
    if (res.tournamentCode) localStorage.setItem('psc_tcode', res.tournamentCode);
    localStorage.setItem('psc_tname', tname);
    localStorage.removeItem('psc_code');
    setNewTourneyModal(false);
    onAdminView(res.tournamentCode, tname);
  };

  return (
    <div style={{minHeight:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 28px',position:'relative',overflow:'hidden',background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
      <style>{CSS}</style>
      <StadiumBg/>

      {/* Admin login prompt */}
      {adminPrompt && (
        <div style={{position:'fixed',inset:0,zIndex:10001,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseDown={e => { if (e.target === e.currentTarget) { setAdminPrompt(false); setAdminErr(''); } }}>
          <div style={{background:'#060f1e',border:'1px solid rgba(0,200,83,0.2)',borderRadius:10,padding:'24px 20px',width:280,display:'flex',flexDirection:'column',gap:10}}
            onMouseDown={e => e.stopPropagation()}>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',margin:0}}>Admin access</p>
            <Input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} autoFocus/>
            <Input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') {
                if (adminEmail.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && adminPass === 'Mexico@#1000') {
                  sessionStorage.setItem('psc_admin','1'); setAdminUnlocked(true); setAdminPrompt(false); setMenuOpen(true); setAdminErr('');
                } else { setAdminErr('Invalid credentials'); }
              }}}/>
            {adminErr && <p style={{color:'#ff4444',fontSize:11,margin:0}}>{adminErr}</p>}
            <Button size="sm" onClick={() => {
              if (adminEmail.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && adminPass === 'Mexico@#1000') {
                sessionStorage.setItem('psc_admin','1'); setAdminUnlocked(true); setAdminPrompt(false); setMenuOpen(true); setAdminErr('');
              } else { setAdminErr('Invalid credentials'); }
            }}>Unlock</Button>
          </div>
        </div>
      )}

      {/* New Tournament Modal */}
      {newTourneyModal && (
        <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={() => !newTourneyBusy && setNewTourneyModal(false)}>
          <div style={{background:'#060f1e',border:'1px solid rgba(0,200,83,0.25)',borderRadius:12,padding:'28px 24px',width:300,display:'flex',flexDirection:'column',gap:12}}
            onClick={e => e.stopPropagation()}>
            <p style={{color:'#fff',fontSize:15,fontWeight:900,margin:0,letterSpacing:'0.05em'}}>New Tournament</p>
            <Input
              autoFocus
              placeholder="Tournament name"
              value={newTourneyName}
              onChange={e => setNewTourneyName(e.target.value)}
              onKeyDown={async e => { if (e.key === 'Enter') await createNewTourney(); }}
            />
            {newTourneyErr && <p style={{color:'#ff4444',fontSize:11,margin:0}}>{newTourneyErr}</p>}
            <Button disabled={newTourneyBusy} onClick={createNewTourney}>
              {newTourneyBusy ? '…' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Hamburger trigger */}
      <button onClick={() => {
        if (adminUnlocked) { setMenuOpen(o => !o); }
        else { setAdminPrompt(true); setAdminEmail(''); setAdminPass(''); setAdminErr(''); }
      }} style={{
        position:'fixed',top:16,left:16,zIndex:10000,background:'none',border:'none',
        cursor:'pointer',padding:6,display:'flex',flexDirection:'column',gap:5,
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{display:'block',width:24,height:2.5,background:'#00c853',borderRadius:2,
            transition:'transform 0.2s, opacity 0.2s',
            transform: menuOpen ? (i===0?'translateY(7.5px) rotate(45deg)':i===2?'translateY(-7.5px) rotate(-45deg)':'') : '',
            opacity: menuOpen && i===1 ? 0 : 1,
          }}/>
        ))}
      </button>

      {/* Shadcn Sheet sidebar */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 flex flex-col p-0 gap-0">
          <SheetHeader className="px-5 pt-14 pb-5">
            <SheetTitle className="text-base">Admin Panel</SheetTitle>
            <SheetDescription>DAF World Cup 2026</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 px-4 py-4 flex-1">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                const n = name.trim();
                if (!n) { setErr('Enter your email first'); setMenuOpen(false); return; }
                if (!isValidEmail(n)) { setErr('Must be a @dialaflight.co.uk email'); setMenuOpen(false); return; }
                localStorage.setItem('psc_name', n);
                setMenuOpen(false);
                onCPU(n);
              }}
            >
              Play Solo vs CPU
            </Button>

            <Separator className="my-1 bg-white/[0.06]" />

            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                setMenuOpen(false);
                setNewTourneyName('');
                setNewTourneyErr('');
                setNewTourneyModal(true);
              }}
            >
              New Tournament
            </Button>

            {serverState?.bracket && (
              <Button
                variant="secondary"
                className="w-full justify-start gap-3"
                onClick={() => { setMenuOpen(false); onAdminManage(); }}
              >
                Manage Tournament
              </Button>
            )}

            {serverState?.bracket && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                onClick={async () => {
                  setMenuOpen(false);
                  const res = await api('/api/tournament/seed-nations', {});
                  if (res.error) alert(res.error);
                }}
              >
                Seed FIFA Nations
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Management panel */}
      {managing && (
        <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.85)',overflowY:'auto'}} onClick={() => setManaging(false)}>
          <div style={{
            minHeight:'100%',maxWidth:480,margin:'0 auto',padding:'24px 16px',
            display:'flex',flexDirection:'column',gap:12,
          }} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <h2 style={{color:'#fff',fontSize:16,fontWeight:900,margin:0,letterSpacing:'0.05em'}}>Manage Tournament</h2>
                {(serverState?.tournamentName || localStorage.getItem('psc_tname')) && (
                  <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:'2px 0 0',letterSpacing:'0.05em'}}>{serverState?.tournamentName || localStorage.getItem('psc_tname')}</p>
                )}
              </div>
              <button onClick={() => setManaging(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
            </div>
            {localStorage.getItem('psc_tcode') && localStorage.getItem('psc_tcode') !== 'undefined' && (
              <div style={{background:'rgba(0,200,83,0.08)',border:'1px solid rgba(0,200,83,0.2)',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{color:'rgba(255,255,255,0.5)',fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase'}}>Tournament Code</span>
                <span style={{color:'#00c853',fontSize:20,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.25em'}}>{localStorage.getItem('psc_tcode')}</span>
              </div>
            )}
            {(() => {
              const allPlayers = (serverState.bracket.r32 || []).flatMap(m => [m.p1, m.p2]);
              const joined = allPlayers.filter(p => p.name).length;
              const total = allPlayers.length || 32;
              return (
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,overflow:'hidden'}}>
                  <div style={{background:'rgba(255,255,255,0.05)',padding:'6px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{color:'#fff',fontSize:11,fontWeight:800,letterSpacing:'0.15em'}}>PLAYERS</span>
                    <span style={{color:joined===total?'#00c853':'rgba(255,255,255,0.3)',fontSize:10,fontWeight:700}}>{joined}/{total} joined</span>
                  </div>
                  {allPlayers.map(p => (
                    <div key={p.code} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:p.name?'#00c853':'rgba(255,255,255,0.15)',flexShrink:0}}/>
                      {p.name
                        ? <span style={{fontSize:12,color:'#fff',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                        : <AdminPlayerInput slotCode={p.code}/>
                      }
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:340,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center'}}>

        <img src="/daf-logo.png" draggable={false} aria-hidden style={{
          position:'fixed', left:`calc(50% + ${logoPos.x}px)`, top:`calc(50% + ${logoPos.y}px)`,
          transform:'translate(-50%,-50%)',
          height:420,objectFit:'contain',opacity:0.35,pointerEvents:'none',filter:'grayscale(1)',zIndex:5,
        }}/>

        <div style={{width:'100%',transform:`translate(${formPos.x}px,${formPos.y}px)`}} className="flex flex-col gap-3">
          {step === 1 ? (
            <>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') {
                  const n = name.trim();
                  if (!n) { setErr('Enter your email'); return; }
                  if (!isValidEmail(n)) { setErr('Must be a @dialaflight.co.uk email'); return; }
                  setErr(''); setStep(noTournament ? 'create' : 2);
                }}}
                type="email"
                placeholder="Enter your email"
                autoFocus
              />
              {err && <p style={{color:'#ff4444',fontSize:11,letterSpacing:'0.05em',textAlign:'left'}}>{err}</p>}
              <Button className="w-full" size="lg" onClick={() => {
                const n = name.trim();
                if (!n) { setErr('Enter your email'); return; }
                if (!isValidEmail(n)) { setErr('Must be a @dialaflight.co.uk email'); return; }
                setErr(''); setStep(noTournament ? 'create' : 2);
              }}>
                Next
              </Button>
            </>
          ) : step === 2 ? (
            <>
              <button onClick={() => { setStep(1); setErr(''); }} style={{background:'none',border:'none',color:'rgba(255,50,50,0.7)',fontSize:11,cursor:'pointer',textAlign:'left',padding:0,letterSpacing:'0.05em'}}>← {name}</button>
              <Input
                value={tCode}
                onChange={e => setTCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Tournament code"
                maxLength={4}
                autoFocus
                style={{letterSpacing:'0.25em',fontWeight:700,textTransform:'uppercase'}}
              />
              {err && <p style={{color:'#ff4444',fontSize:11,letterSpacing:'0.05em',textAlign:'left'}}>{err}</p>}
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={busy}>
                {busy ? '…' : 'Join Tournament'}
              </Button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setErr(''); }} style={{background:'none',border:'none',color:'rgba(255,50,50,0.7)',fontSize:11,cursor:'pointer',textAlign:'left',padding:0,letterSpacing:'0.05em'}}>← {name}</button>
              <Input
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Tournament name (e.g. DAF World Cup 2026)"
                autoFocus
              />
              {err && <p style={{color:'#ff4444',fontSize:11,letterSpacing:'0.05em',textAlign:'left'}}>{err}</p>}
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={busy}>
                {busy ? '…' : 'Create Tournament'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASYNC MATCH SUBMISSION SCREEN
// ═══════════════════════════════════════════════════════════════

const ZONE_ROWS = [['tl','tc','tr'],['bl','bc','br']];

function ZoneGrid({ selected, onSelect, color = '#00c853', disabled }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
      {ZONE_ROWS.flat().map(z => (
        <button key={z} onClick={() => !disabled && onSelect(z)} style={{
          padding:'7px 0',borderRadius:4,fontSize:14,fontWeight:800,
          background: selected===z ? color : 'rgba(255,255,255,0.06)',
          border:`1px solid ${selected===z ? color : 'rgba(255,255,255,0.1)'}`,
          color: selected===z ? '#000' : 'rgba(255,255,255,0.55)',
          cursor: disabled ? 'default' : 'pointer',transition:'all 0.12s',
        }}>
          {ZONE_ICONS[z]}
        </button>
      ))}
    </div>
  );
}

function SubmitMatchScreen({ match, myCode, onClose }) {
  const isP1    = match.p1.code === myCode;
  const myKey   = isP1 ? 'p1' : 'p2';
  const oppKey  = isP1 ? 'p2' : 'p1';
  const me      = isP1 ? match.p1 : match.p2;
  const opp     = isP1 ? match.p2 : match.p1;

  const mySub   = match.submissions?.[myKey];
  const oppSub  = match.submissions?.[oppKey];
  const played  = match.played;

  const [shots, setShots] = useState(['','','','','']);
  const [saves, setSaves] = useState(['','','','','']);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  const allFilled = shots.every(Boolean) && saves.every(Boolean);

  const handleSubmit = async () => {
    if (!allFilled) { setErr('Pick a shot and a save for every round'); return; }
    setBusy(true); setErr('');
    const res = await api('/api/match/submit', { code: myCode, matchId: match.id, shots, saves });
    setBusy(false);
    if (res.error) setErr(res.error);
  };

  const Overlay = ({ children }) => (
    <div style={{
      position:'absolute',inset:0,zIndex:40,background:'rgba(0,0,0,0.92)',
      display:'flex',flexDirection:'column',overflowY:'auto',
    }}>
      <div style={{maxWidth:420,width:'100%',margin:'0 auto',padding:'20px 16px 40px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase'}}>{match.id.replace(/_/g,' ').toUpperCase()}</div>
            <div style={{color:'#fff',fontSize:15,fontWeight:800,marginTop:2}}>{me.name} <span style={{color:'rgba(255,255,255,0.3)'}}>vs</span> {opp.name}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:22,cursor:'pointer',lineHeight:1}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );

  // Match complete — don't reveal result to players
  if (played) {
    return (
      <Overlay>
        <div style={{textAlign:'center',padding:'40px 0'}}>
          <div style={{color:'#fff',fontSize:18,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase'}}>Match Complete</div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginTop:8}}>The admin will announce the result.</div>
        </div>
      </Overlay>
    );
  }

  // Waiting view — submitted, waiting for opponent or admin
  if (mySub) {
    const bothIn = !!oppSub;
    return (
      <Overlay>
        <div style={{textAlign:'center',padding:'30px 0'}}>
          <div style={{color:'#00c853',fontSize:16,fontWeight:800}}>Shots & saves locked in</div>
          <div style={{color:'rgba(255,255,255,0.45)',fontSize:12,marginTop:8}}>
            {bothIn ? 'Waiting for the admin to confirm the result.' : `Waiting for ${opp.name.split(' ')[0]} to submit…`}
          </div>
        </div>
      </Overlay>
    );
  }

  // Submission view
  return (
    <Overlay>
      {oppSub && (
        <div style={{background:'rgba(0,200,83,0.1)',border:'1px solid rgba(0,200,83,0.25)',borderRadius:6,padding:'8px 12px',fontSize:11,color:'#00c853',fontWeight:700}}>
          {opp.name.split(' ')[0]} has already submitted — submit yours to resolve the match!
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:4}}>
        <div style={{color:'#00c853',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Shot</div>
        <div style={{color:'#ff6b35',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Save</div>
      </div>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{display:'flex',flexDirection:'column',gap:6}}>
          <div style={{color:'rgba(255,255,255,0.25)',fontSize:9,letterSpacing:'0.1em'}}>ROUND {i+1}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <ZoneGrid selected={shots[i]} onSelect={z => setShots(s => { const n=[...s]; n[i]=z; return n; })} color='#00c853'/>
            <ZoneGrid selected={saves[i]} onSelect={z => setSaves(s => { const n=[...s]; n[i]=z; return n; })} color='#ff6b35'/>
          </div>
        </div>
      ))}
      {err && <p style={{color:'#ff4444',fontSize:11,margin:0}}>{err}</p>}
      <button onClick={handleSubmit} disabled={busy || !allFilled} style={{
        marginTop:8,padding:'14px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
        background: allFilled ? 'linear-gradient(135deg,#00c853,#00a651)' : 'rgba(255,255,255,0.06)',
        border: allFilled ? 'none' : '1px solid rgba(255,255,255,0.1)',
        color: allFilled ? '#000' : 'rgba(255,255,255,0.3)',
        cursor: allFilled && !busy ? 'pointer' : 'default',
      }}>
        {busy ? 'Submitting…' : allFilled ? 'Submit Shots & Saves' : `${shots.filter(Boolean).length}/5 shots · ${saves.filter(Boolean).length}/5 saves`}
      </button>
    </Overlay>
  );
}

// placeholder so old references don't crash during transition
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
      background:'#030d1a url(/bg.png) center/cover no-repeat fixed', fontFamily:"'DM Sans',system-ui,sans-serif",
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
                fontSize:44,color:'#fff',minWidth:52,textAlign:'center',lineHeight:1,
                fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.06em',
                padding:'3px 10px',background:'rgba(0,0,0,0.5)',borderRadius:3,
                border:'1px solid rgba(0,200,83,0.12)',animation:'scorePopIn 0.35s ease',
              }}>{am.p1Score}</div>
              <div style={{color:'rgba(255,255,255,0.2)',fontSize:18,fontWeight:100,padding:'0 2px'}}>—</div>
              <div key={am.p2Score+100} style={{
                fontSize:44,color:'#fff',minWidth:52,textAlign:'center',lineHeight:1,
                fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.06em',
                padding:'3px 10px',background:'rgba(0,0,0,0.5)',borderRadius:3,
                border:'1px solid rgba(0,200,83,0.12)',animation:'scorePopIn 0.35s ease',
              }}>{am.p2Score}</div>
            </div>
            <div style={{ color:'rgba(255,255,255,0.28)', fontSize:9, letterSpacing:2, textTransform:'uppercase', marginTop:1 }}>
              {am.isSuddenDeath ? 'SUDDEN DEATH' : `Kick ${Math.min(am.currentKick, TOTAL_KICKS)}/${TOTAL_KICKS}`}
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
                  background: !pk ? 'rgba(255,255,255,0.08)' : pk.isGoal ? '#00c853' : 'rgba(255,255,255,0.25)',
                  border:`1px solid ${!pk ? 'rgba(255,255,255,0.15)' : pk.isGoal ? '#00c853' : 'rgba(255,255,255,0.4)'}`,
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
              fontFamily:"'Big Shoulders Display',sans-serif",
              letterSpacing:4, textTransform:'uppercase',
              color: isGoal ? '#00c853' : '#ff1744',
              textShadow: isGoal
                ? '0 0 60px rgba(0,200,83,0.95),0 0 120px rgba(0,200,83,0.5)'
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
                ? `${(kr.scorer === 'p1' ? am.p1.name : am.p2.name).split(' ')[0]} scored`
                : `Saved`}
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
              fontFamily:"'Big Shoulders Display',sans-serif", textTransform:'uppercase', letterSpacing:4,
              color: am.winner === myCode ? '#00c853' : '#ff6b35',
              textShadow: am.winner === myCode ? '0 0 50px rgba(0,200,83,0.6)' : 'none',
            }}>
              {am.winner === myCode ? 'You Win' : 'You Lose'}
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
            border: `1px solid ${iAmShooter ? 'rgba(0,166,81,0.6)' : 'rgba(64,196,255,0.5)'}`,
            borderRadius:20, padding:'6px 16px',
            backdropFilter:'blur(8px)',
          }}>
            <span style={{fontSize:9,fontWeight:900,letterSpacing:1,opacity:0.7}}>{iAmShooter ? 'ATK' : 'DEF'}</span>
            <span style={{
              color: iAmShooter ? '#00a651' : '#40c4ff',
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
            {am.isSuddenDeath && <span style={{color:'#00c853',fontSize:9,fontWeight:800,letterSpacing:2,marginLeft:4}}>SD</span>}
          </div>
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:9,letterSpacing:2.5,textTransform:'uppercase',textAlign:'center',minHeight:14,textShadow:'0 1px 4px rgba(0,0,0,0.9)'}}>
            {am.phase === 'picking' && !iHaveSubmitted
              ? (iAmShooter ? 'Tap to aim your shot' : 'Tap to choose dive direction')
              : localPhase === 'animating' ? 'Resolving...' : ''}
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
      background:'#030d1a url(/bg.png) center/cover no-repeat fixed', fontFamily:"'DM Sans',system-ui,sans-serif",
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
              <div key={am.p1Score} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:"'Big Shoulders Display',sans-serif",lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{am.p1Score}</div>
              <div style={{color:'rgba(255,255,255,0.25)',fontSize:20,fontWeight:200}}>:</div>
              <div key={am.p2Score+100} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:"'Big Shoulders Display',sans-serif",lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{am.p2Score}</div>
            </div>
            <div style={{color:'rgba(255,255,255,0.28)',fontSize:9,letterSpacing:2,textTransform:'uppercase',marginTop:1}}>
              {am.isSuddenDeath ? 'SUDDEN DEATH' : `Kick ${Math.min(am.currentKick, TOTAL_KICKS)}/${TOTAL_KICKS}`}
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
                <div style={{ width:10,height:10,borderRadius:'50%', background:!pk?'rgba(255,255,255,0.08)':pk.isGoal?'#00c853':'rgba(255,255,255,0.25)', border:`1px solid ${!pk?'rgba(255,255,255,0.15)':pk.isGoal?'#00c853':'rgba(255,255,255,0.4)'}`, transition:'all 0.3s' }}/>
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
              fontFamily:"'Big Shoulders Display',sans-serif", letterSpacing:1, textTransform:'uppercase',
              color: kr?.isGoal ? '#00c853' : '#ff1744',
              textShadow: kr?.isGoal ? '0 0 60px rgba(0,200,83,0.95)' : '0 0 60px rgba(255,23,68,0.9)',
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
// BRACKET TREE (knockout: R16 → QF → SF → Final)
// ═══════════════════════════════════════════════════════════════

function BracketTree({ bracket, myCode, onMatchClick }) {
  const isAdmin = !myCode;
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // 9 columns: R32(0), R16(1), QF(2), SF(3), Final(4), SF(5), QF(6), R16(7), R32(8)
  const MH   = 72;
  const MW   = 160;
  const GAP  = 10;
  const STEP = 96;
  const PX   = 14;
  const PY   = 28;

  const colX = c => c * (MW + GAP);
  const NATURAL_W = colX(8) + MW + PX * 2;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const TOP_BAR = 56;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const availH = window.innerHeight - TOP_BAR;
      const scaleW = w > 0 ? w / NATURAL_W : 1;
      const scaleH = availH > 0 ? availH / naturalH : 1;
      setScale(Math.min(scaleW, scaleH));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    window.addEventListener('resize', measure);
    return () => { obs.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const r32Top = i => i * STEP;
  const r16Top = i => (r32Top(i * 2) + r32Top(i * 2 + 1)) / 2;
  const qfTop  = i => (r16Top(i * 2) + r16Top(i * 2 + 1)) / 2;
  const sfTop  = (qfTop(0) + qfTop(1)) / 2;
  const fTop   = sfTop;

  const TOTAL_H = r32Top(7) + MH;
  const TOTAL_W = colX(8) + MW;
  const naturalH = TOTAL_H + PY + 16;

  const ph = id => ({ id, _ph: true });

  const r32 = bracket.r32?.length === 16 ? bracket.r32 : Array.from({ length: 16 }, (_, i) => ph(`r32p${i}`));
  const r16 = bracket.r16?.length === 8  ? bracket.r16 : Array.from({ length: 8  }, (_, i) => ph(`r16p${i}`));
  const qf  = bracket.qf?.length  === 4  ? bracket.qf  : Array.from({ length: 4  }, (_, i) => ph(`qfp${i}`));
  const sf  = bracket.sf?.length  === 2  ? bracket.sf  : Array.from({ length: 2  }, (_, i) => ph(`sfp${i}`));
  const fin = bracket.final || ph('fin');

  const LC = 'rgba(255,255,255,0.18)';
  const cy = top => top + MH / 2;
  const lines = [];

  const bracket2to1 = (fromX, tops2, toX, toTop, prefix) => {
    const midX = (fromX + toX) / 2;
    const cy0 = cy(tops2[0]), cy1 = cy(tops2[1]), cyt = cy(toTop);
    lines.push(
      <line key={`${prefix}h0`} x1={fromX} y1={cy0} x2={midX} y2={cy0} stroke={LC} strokeWidth={1}/>,
      <line key={`${prefix}h1`} x1={fromX} y1={cy1} x2={midX} y2={cy1} stroke={LC} strokeWidth={1}/>,
      <line key={`${prefix}v`}  x1={midX}  y1={cy0} x2={midX} y2={cy1} stroke={LC} strokeWidth={1}/>,
      <line key={`${prefix}t`}  x1={midX}  y1={cyt} x2={toX}  y2={cyt} stroke={LC} strokeWidth={1}/>,
    );
  };

  // Left side: col 0 → 1 → 2 → 3 → 4
  for (let i = 0; i < 4; i++)
    bracket2to1(colX(0)+MW, [r32Top(i*2), r32Top(i*2+1)], colX(1), r16Top(i), `ll${i}`);
  for (let i = 0; i < 2; i++)
    bracket2to1(colX(1)+MW, [r16Top(i*2), r16Top(i*2+1)], colX(2), qfTop(i), `ql${i}`);
  bracket2to1(colX(2)+MW, [qfTop(0), qfTop(1)], colX(3), sfTop, 'sl');
  lines.push(<line key="sl-f" x1={colX(3)+MW} y1={cy(sfTop)} x2={colX(4)} y2={cy(fTop)} stroke={LC} strokeWidth={1}/>);

  // Right side: col 8 → 7 → 6 → 5 → 4
  for (let i = 0; i < 4; i++)
    bracket2to1(colX(8), [r32Top(i*2), r32Top(i*2+1)], colX(7)+MW, r16Top(i), `rr${i}`);
  for (let i = 0; i < 2; i++)
    bracket2to1(colX(7), [r16Top(i*2), r16Top(i*2+1)], colX(6)+MW, qfTop(i), `qr${i}`);
  bracket2to1(colX(6), [qfTop(0), qfTop(1)], colX(5)+MW, sfTop, 'sr');
  lines.push(<line key="sr-f" x1={colX(5)} y1={cy(sfTop)} x2={colX(4)+MW} y2={cy(fTop)} stroke={LC} strokeWidth={1}/>);

  const Card = ({ m, x, top }) => {
    if (m._ph) return (
      <div style={{position:'absolute',left:x+PX,top:top+PY,width:MW,height:MH,
        background:'rgba(4,14,28,0.7)',border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:7,overflow:'hidden',boxSizing:'border-box',display:'flex',flexDirection:'column'}}>
        {[0,1].map(i => (
          <div key={i} style={{flex:1,display:'flex',alignItems:'center',gap:7,padding:'0 8px',
            ...(i===1?{borderTop:'1px solid rgba(255,255,255,0.06)'}:{})}}>
            <div style={{width:14,height:14,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}/>
            <span style={{color:'rgba(255,255,255,0.18)',fontSize:9,fontStyle:'italic'}}>TBD</span>
          </div>
        ))}
      </div>
    );

    const hasPlayers = m.p1?.name && m.p2?.name;
    const showPlay = !!m.watchUrl;

    const Slot = ({ p, won, label }) => (
      <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'0 8px',
        opacity: m.played && !won ? 0.35 : 1}}>
        <div style={{width:14,height:14,borderRadius:'50%',flexShrink:0,
          background:won?'rgba(0,200,83,0.25)':'rgba(255,255,255,0.07)',
          border:`1.5px solid ${won?'#00c853':'rgba(255,255,255,0.12)'}`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:7,fontWeight:900,color:won?'#00c853':'rgba(255,255,255,0.4)'}}>
          {label}
        </div>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center'}}>
          <span style={{fontSize:13,fontWeight:won?700:500,
            color:p?.name?'#fff':'rgba(255,255,255,0.22)',
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>
            {p?.name||'TBD'}
          </span>
          {p?.player && (
            <span style={{fontSize:9,color:'rgba(255,255,255,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',marginTop:2}}>
              {p.player}
            </span>
          )}
        </div>
        {won && <span style={{color:'#00c853',fontSize:9,flexShrink:0}}>✓</span>}
      </div>
    );

    const matchNum = m.id === 'final' ? null : +m.id.split('_').pop() + 1;

    return (
      <>
        {matchNum !== null && (
          <div style={{
            position:'absolute',left:x+PX,top:top+PY-18,width:MW,
            fontSize:9,fontWeight:700,letterSpacing:'0.12em',
            color:'#ff1744',fontFamily:"'DM Sans',system-ui,sans-serif",
            textTransform:'uppercase',
          }}>
            Match {matchNum}
          </div>
        )}
      <div style={{
        position:'absolute',left:x+PX,top:top+PY,width:MW,height:MH,
        border:`1px solid ${m.played?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.1)'}`,
        borderRadius:7,background:'rgba(4,14,28,0.92)',
        display:'flex',flexDirection:'row',overflow:'hidden',boxSizing:'border-box',
        backdropFilter:'blur(8px)',boxShadow:'0 2px 10px rgba(0,0,0,0.5)',
      }}>
        {/* Player rows */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
          <Slot p={m.p1} won={m.winner?.code===m.p1?.code} label="A"/>
          <div style={{height:1,background:'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {m.played && (
              <span style={{background:'rgba(4,14,28,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4,padding:'1px 5px',fontSize:8,fontWeight:800,color:'#fff',fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:1}}>{m.p1Score}-{m.p2Score}</span>
            )}
          </div>
          <Slot p={m.p2} won={m.winner?.code===m.p2?.code} label="B"/>
        </div>
        {/* Play button — opens Rise 360 URL */}
        {showPlay && (
          <a href={m.watchUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
            width:26,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            borderLeft:'1px solid rgba(0,200,83,0.3)',
            background:'rgba(0,200,83,0.12)',
            color:'#00c853',fontSize:11,
            textDecoration:'none',cursor:'pointer',
          }}>▶</a>
        )}
      </div>
      </>
    );
  };

  const LABELS = ['R32','R16','QF','SF','Final','SF','QF','R16','R32'];

  return (
    <div ref={containerRef} style={{width:'100%',overflow:'hidden',height:naturalH*scale}}>
      <div style={{position:'relative',width:NATURAL_W,height:naturalH,transform:`scale(${scale})`,transformOrigin:'top left'}}>
        {LABELS.map((label, col) => (
          <div key={col} style={{position:'absolute',left:colX(col)+PX,top:4,width:MW,
            textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:8,
            letterSpacing:2,textTransform:'uppercase',fontWeight:700}}>{label}</div>
        ))}
        <svg style={{position:'absolute',left:PX,top:PY,pointerEvents:'none',overflow:'visible'}} width={TOTAL_W} height={TOTAL_H}>
          {lines}
        </svg>
        {r32.slice(0,8).map((m,i)  => <Card key={m.id} m={m} x={colX(0)} top={r32Top(i)}/>)}
        {r16.slice(0,4).map((m,i)  => <Card key={m.id} m={m} x={colX(1)} top={r16Top(i)}/>)}
        {qf.slice(0,2).map((m,i)   => <Card key={m.id} m={m} x={colX(2)} top={qfTop(i)}/>)}
        <Card m={sf[0]} x={colX(3)} top={sfTop}/>
        {/* Trophy above final */}
        <div style={{position:'absolute',left:colX(4)+PX+MW/2,top:fTop+PY-128,transform:'translateX(-50%)',pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <img src="/wc-trophy.png" alt="World Cup Trophy" draggable={false} style={{height:120,width:'auto',objectFit:'contain',filter:'drop-shadow(0 0 10px rgba(245,166,35,0.5))'}}/>
        </div>
        <Card m={fin}   x={colX(4)} top={fTop}/>
        <Card m={sf[1]} x={colX(5)} top={sfTop}/>
        {qf.slice(2,4).map((m,i)   => <Card key={m.id} m={m} x={colX(6)} top={qfTop(i)}/>)}
        {r16.slice(4,8).map((m,i)  => <Card key={m.id} m={m} x={colX(7)} top={r16Top(i)}/>)}
        {r32.slice(8,16).map((m,i) => <Card key={m.id} m={m} x={colX(8)} top={r32Top(i)}/>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CPU TOURNAMENT MODE
// ═══════════════════════════════════════════════════════════════

const CPU_ROUNDS = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'];

function CPUMatchScreen({ playerName, roundLabel, onDone }) {
  const [shots, setShots] = useState(['','','','','']);
  const [saves, setSaves] = useState(['','','','','']);
  const [result, setResult] = useState(null);

  const allFilled = shots.every(Boolean) && saves.every(Boolean);

  const handleSubmit = () => {
    if (!allFilled) return;
    const cpuShots = Array.from({length:5}, rz);
    const cpuSaves = Array.from({length:5}, rz);
    let p1Score = 0, p2Score = 0;
    const kicks = shots.map((shot, i) => {
      const p1Goal = shot !== cpuSaves[i];
      const p2Goal = cpuShots[i] !== saves[i];
      if (p1Goal) p1Score++;
      if (p2Goal) p2Score++;
      return { round: i+1, playerShot: shot, playerSave: saves[i], cpuShot: cpuShots[i], cpuSave: cpuSaves[i], p1Goal, p2Goal };
    });
    setResult({ kicks, p1Score, p2Score, won: p1Score > p2Score });
  };

  if (result) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#030d1a url(/bg.png) center/cover no-repeat fixed',fontFamily:"'DM Sans',system-ui,sans-serif",overflowY:'auto'}}>
        <StadiumBg/>
        <div style={{maxWidth:420,width:'100%',margin:'0 auto',padding:'24px 16px 40px',display:'flex',flexDirection:'column',gap:14,position:'relative',zIndex:1}}>
          <div style={{textAlign:'center',padding:'12px 0 4px'}}>
            <div style={{fontSize:52,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",textTransform:'uppercase',letterSpacing:2,color:result.won?'#00c853':'#ff6b35',textShadow:result.won?'0 0 40px rgba(0,200,83,0.5)':'none'}}>
              {result.won ? 'You Win' : 'You Lose'}
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:22,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",marginTop:4,letterSpacing:4}}>
              {result.p1Score} – {result.p2Score}
            </div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',marginTop:4}}>{roundLabel}</div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {result.kicks.map(k => (
              <div key={k.round} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:'10px 12px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{color:k.p1Goal?'#00c853':'rgba(255,255,255,0.3)',fontSize:11,fontWeight:700}}>{k.p1Goal ? 'GOAL' : 'SAVED'}</span>
                    <span style={{color:'rgba(255,255,255,0.25)',fontSize:9}}>{ZONE_ICONS[k.playerShot]}→{ZONE_ICONS[k.cpuSave]}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{color:k.p2Goal?'#ff1744':'rgba(255,255,255,0.3)',fontSize:11,fontWeight:700}}>{k.p2Goal ? 'CPU GOAL' : 'YOU SAVED'}</span>
                    <span style={{color:'rgba(255,255,255,0.25)',fontSize:9}}>{ZONE_ICONS[k.cpuShot]}→{ZONE_ICONS[k.playerSave]}</span>
                  </div>
                </div>
                <div style={{color:'rgba(255,255,255,0.2)',fontSize:9,letterSpacing:'0.1em',textAlign:'center'}}>R{k.round}</div>
                <div/>
              </div>
            ))}
          </div>

          <button onClick={() => onDone(result.won)} style={{
            marginTop:8,padding:'14px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
            background:result.won?'linear-gradient(135deg,#00c853,#00a651)':'rgba(255,255,255,0.08)',
            border:'none',color:result.won?'#000':'rgba(255,255,255,0.7)',cursor:'pointer',
          }}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#030d1a url(/bg.png) center/cover no-repeat fixed',fontFamily:"'DM Sans',system-ui,sans-serif",overflowY:'auto'}}>
      <StadiumBg/>
      <div style={{maxWidth:420,width:'100%',margin:'0 auto',padding:'20px 16px 40px',display:'flex',flexDirection:'column',gap:14,position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase'}}>{roundLabel} · vs CPU</div>
            <div style={{color:'#fff',fontSize:15,fontWeight:800,marginTop:2}}>{playerName}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:4}}>
          <div style={{color:'#00c853',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Shot</div>
          <div style={{color:'#ff6b35',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Save</div>
        </div>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{color:'rgba(255,255,255,0.25)',fontSize:9,letterSpacing:'0.1em'}}>ROUND {i+1}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <ZoneGrid selected={shots[i]} onSelect={z => setShots(s => { const n=[...s]; n[i]=z; return n; })} color='#00c853'/>
              <ZoneGrid selected={saves[i]} onSelect={z => setSaves(s => { const n=[...s]; n[i]=z; return n; })} color='#ff6b35'/>
            </div>
          </div>
        ))}
        <button onClick={handleSubmit} disabled={!allFilled} style={{
          marginTop:8,padding:'14px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
          background: allFilled ? 'linear-gradient(135deg,#00c853,#00a651)' : 'rgba(255,255,255,0.06)',
          border: allFilled ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: allFilled ? '#000' : 'rgba(255,255,255,0.3)',
          cursor: allFilled ? 'pointer' : 'default',
        }}>
          {allFilled ? 'Submit Shots & Saves' : `${shots.filter(Boolean).length}/5 shots · ${saves.filter(Boolean).length}/5 saves`}
        </button>
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
      <div className="h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-10" style={{background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
        <StadiumBg/>
        <Confetti/>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <img src="/daf-logo.png" draggable={false} style={{height:100,objectFit:'contain',animation:'floatBob 2s ease-in-out infinite',filter:'drop-shadow(0 0 30px rgba(0,166,81,0.7))'}} alt=""/>
          <div className="text-5xl font-black uppercase tracking-widest" style={{fontFamily:"'Big Shoulders Display',sans-serif",color:'#00c853',textShadow:'0 0 60px rgba(0,200,83,0.6)',animation:'scaleIn 0.5s ease'}}>CHAMPION!</div>
          <div className="text-xl font-bold text-foreground">{playerName}</div>
          <Badge variant="warning" className="text-xs tracking-widest uppercase">Beat all {CPU_ROUNDS.length} CPU rounds</Badge>
          <Button variant="secondary" className="mt-6" onClick={onExit}>← Back to Menu</Button>
        </div>
      </div>
    );
  }

  if (done === 'eliminated') {
    return (
      <div className="h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-10" style={{background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
        <StadiumBg/>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="text-4xl font-black uppercase tracking-widest" style={{fontFamily:"'Big Shoulders Display',sans-serif",color:'#ff6b35'}}>ELIMINATED</div>
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
    <div className="h-full flex flex-col relative overflow-hidden" style={{background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
      <StadiumBg/>
      <div className="flex items-center gap-3 px-4 py-3 relative z-10" style={{background:'rgba(0,0,0,0.55)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <Button variant="ghost" size="icon" onClick={onExit} className="text-muted-foreground text-lg">←</Button>
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-green-400">Solo vs CPU</div>
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
                background: isNext ? 'rgba(0,200,83,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isNext ? 'rgba(0,200,83,0.35)' : res ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)'}`,
                opacity: !res && !isNext ? 0.35 : 1,
              }}>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black" style={{
                  background: res==='win'?'rgba(0,200,83,0.15)':res==='loss'?'rgba(255,23,68,0.15)':isNext?'rgba(0,200,83,0.1)':'rgba(255,255,255,0.04)',
                  border:`1.5px solid ${res==='win'?'#00c853':res==='loss'?'#ff1744':isNext?'rgba(0,200,83,0.45)':'rgba(255,255,255,0.1)'}`,
                  color: res==='win'?'#00c853':res==='loss'?'#ff1744':isNext?'#00c853':'rgba(255,255,255,0.4)',
                }}>
                  {res === 'win' ? '✓' : res === 'loss' ? '✗' : isNext ? '▶' : `${i+1}`}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{color:isNext?'#00c853':res==='win'?'#00c853':res==='loss'?'#ff4444':'rgba(255,255,255,0.5)'}}>{label}</div>
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
// GROUP STAGE VIEW
// ═══════════════════════════════════════════════════════════════

function GroupStageView_UNUSED({ bracket, myCode, onMatchClick }) {
  const groups = bracket.groups || [];
  const isAdmin = !myCode;
  return (
    <div style={{padding:'16px 12px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,maxWidth:1200,margin:'0 auto'}}>
        {groups.map(group => {
          const played = group.matches.filter(m=>m.played).length;
          const done = group.runnerUp != null;
          return (
          <div key={group.id} style={{background:'rgba(4,16,32,0.92)',border:`1px solid ${done?'rgba(0,200,83,0.35)':'rgba(255,255,255,0.12)'}`,borderRadius:10,overflow:'hidden',backdropFilter:'blur(8px)'}}>

            {/* Header */}
            <div style={{background:done?'rgba(0,200,83,0.13)':'rgba(255,255,255,0.05)',borderBottom:`1px solid ${done?'rgba(0,200,83,0.25)':'rgba(255,255,255,0.08)'}`,padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#00c853',fontSize:12,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase'}}>Group {group.label}</span>
              {done
                ? <span style={{color:'#00c853',fontSize:10,fontWeight:700,letterSpacing:'0.1em'}}>COMPLETE</span>
                : <span style={{color:'rgba(255,255,255,0.3)',fontSize:10}}>{played}/6 played</span>
              }
            </div>

            {/* Standings */}
            <div style={{padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'2px 12px 4px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:9,width:14,flexShrink:0}}>#</span>
                <span style={{flex:1,color:'rgba(255,255,255,0.2)',fontSize:9}}>PLAYER</span>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:9,width:24,textAlign:'right'}}>GD</span>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:9,width:22,textAlign:'right'}}>GF</span>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:9,width:24,textAlign:'right'}}>PTS</span>
                <span style={{width:22}}/>
              </div>
              {(() => {
                const sorted = [...group.players].sort((a,b) =>
                  b.points!==a.points ? b.points-a.points :
                  (b.gd||0)!==(a.gd||0) ? (b.gd||0)-(a.gd||0) : (b.gf||0)-(a.gf||0)
                );
                return sorted.map((p, i) => {
                  const isFirst  = group.winner?.code   === p.code;
                  const isSecond = group.runnerUp?.code === p.code;
                  const isThird  = group.third?.code    === p.code;
                  const wcQual   = isThird && group.third?.qualified === true;
                  const wcOut    = isThird && done && group.third?.qualified === false;
                  let badge = null, bg = 'transparent';
                  if (isFirst)                 { badge = <span style={{color:'#00c853',fontSize:9,fontWeight:800}}>Q1</span>; bg='rgba(0,200,83,0.09)'; }
                  else if (isSecond)           { badge = <span style={{color:'#4fc3f7',fontSize:9,fontWeight:800}}>Q2</span>; bg='rgba(56,142,255,0.07)'; }
                  else if (wcQual)             { badge = <span style={{color:'#ffc107',fontSize:9,fontWeight:800}}>WC</span>; bg='rgba(255,193,7,0.07)'; }
                  else if (wcOut || (!isThird && done)) { badge = <span style={{color:'rgba(255,68,68,0.6)',fontSize:9}}>✕</span>; }
                  else if (isThird && !done)   { badge = <span style={{color:'rgba(255,193,7,0.5)',fontSize:9}}>WC?</span>; }
                  return (
                    <div key={p.code} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:bg}}>
                      <span style={{color:'rgba(255,255,255,0.3)',fontSize:10,width:14,flexShrink:0}}>{i+1}</span>
                      <span style={{flex:1,fontSize:11,color:p.name?'#fff':'rgba(255,255,255,0.25)',fontWeight:p.name?600:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name||'—'}</span>
                      <span style={{color:'rgba(255,255,255,0.45)',fontSize:10,width:24,textAlign:'right'}}>{(p.gd||0)>0?'+':''}{p.gd||0}</span>
                      <span style={{color:'rgba(255,255,255,0.45)',fontSize:10,width:22,textAlign:'right'}}>{p.gf||0}</span>
                      <span style={{color:isFirst?'#00c853':isSecond?'#4fc3f7':'rgba(255,255,255,0.6)',fontSize:11,fontWeight:800,width:24,textAlign:'right'}}>{p.points||0}</span>
                      <span style={{width:22,textAlign:'center'}}>{badge}</span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Matches */}
            <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:5}}>
              {group.matches.map(m => {
                const myKey  = m.p1.code === myCode ? 'p1' : m.p2.code === myCode ? 'p2' : null;
                const isMine = !!myKey;
                const mySub  = m.submissions?.[myKey];
                const waiting = isMine && mySub && !m.played;
                const canPlay = isMine && !m.played && m.p1?.name && m.p2?.name && !mySub;
                const clickable = canPlay || waiting || (m.played && (isMine || isAdmin));
                return (
                  <div key={m.id} onClick={() => clickable && onMatchClick(m)} style={{
                    display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:6,
                    cursor:clickable?'pointer':'default',
                    background:canPlay?'rgba(0,200,83,0.1)':waiting?'rgba(255,107,0,0.08)':m.played?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.02)',
                    border:`1px solid ${canPlay?'rgba(0,200,83,0.5)':waiting?'rgba(255,107,0,0.4)':m.played?'rgba(255,255,255,0.09)':'rgba(255,255,255,0.06)'}`,
                  }}>
                    <span style={{flex:1,fontSize:10,fontWeight:600,color:m.played&&m.winner?.code!==m.p1?.code?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'?'}</span>
                    <span style={{color:m.played?'#fff':'rgba(255,255,255,0.3)',fontSize:10,fontWeight:700,flexShrink:0,minWidth:26,textAlign:'center'}}>
                      {m.played?`${m.p1Score}-${m.p2Score}`:'vs'}
                    </span>
                    <span style={{flex:1,fontSize:10,fontWeight:600,color:m.played&&m.winner?.code!==m.p2?.code?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{m.p2?.name||'?'}</span>
                    {canPlay  && <span style={{color:'#00c853',fontSize:10,flexShrink:0}}>▶</span>}
                    {waiting  && <span style={{color:'#ff6b35',fontSize:10,flexShrink:0}}>⏳</span>}
                    {m.played&&(isMine||isAdmin)&&<span style={{color:'rgba(255,255,255,0.35)',fontSize:9,flexShrink:0}}>👁</span>}
                  </div>
                );
              })}
            </div>

          </div>
          );
        })}
      </div>
      <div style={{textAlign:'center',padding:'14px 0 4px',color:'rgba(255,255,255,0.18)',fontSize:9,letterSpacing:'0.15em'}}>
        Q1 = GROUP WINNER · Q2 = RUNNER-UP · WC? = WILD CARD CANDIDATE · WC = QUALIFIED · ✕ = ELIMINATED
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN PLAYER INPUT — lets admin name an empty slot directly
// ═══════════════════════════════════════════════════════════════

function AdminPlayerInput({ slotCode }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    const n = val.trim();
    if (!n) return;
    const res = await api('/api/register', { code: slotCode, name: n });
    if (res.error) { setErr(res.error); return; }
    setDone(true);
  };

  if (done) return <span style={{ color: '#00c853', fontSize: 11 }}>✓ Added</span>;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <input
        type="text"
        placeholder="Add player name…"
        value={val}
        onChange={e => { setVal(e.target.value); setErr(''); }}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
        style={{
          width: '100%', padding: '3px 7px', borderRadius: 4,
          background: '#0a1628', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.8)', fontSize: 11,
          fontFamily: "'DM Sans',system-ui,sans-serif", outline: 'none',
        }}
      />
      {err && <span style={{ color: '#ff4444', fontSize: 10 }}>{err}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WATCH URL INPUT — controlled local state, doesn't fight polling
// ═══════════════════════════════════════════════════════════════

function WatchUrlInput({ matchId, initialUrl, placeholder = 'Watch URL…' }) {
  const [val, setVal] = useState(initialUrl || '');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await api('/api/match/watchurl', { matchId, url: val });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="url"
        placeholder={placeholder}
        value={val}
        onChange={e => { setVal(e.target.value); setSaved(false); }}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); e.target.blur(); } }}
        style={{
          flex: 1, padding: '6px 8px', borderRadius: 5,
          background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.75)', fontSize: 11,
          fontFamily: "'DM Sans',system-ui,sans-serif", outline: 'none',
        }}
      />
      {saved && <span style={{ color: '#00c853', fontSize: 11, flexShrink: 0 }}>✓</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEAM PICKER — shown each round so players pick a fresh team
// ═══════════════════════════════════════════════════════════════

function TeamPicker({ bracket, playerName: initialPlayerName, onPicked }) {
  const [playerName, setPlayerNameState] = useState(initialPlayerName || '');
  const [nameConfirmed, setNameConfirmed] = useState(!!initialPlayerName);
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const confirmName = () => {
    const n = nameInput.trim();
    if (!n) { setErr('Enter your name or email'); return; }
    localStorage.setItem('psc_name', n);
    setPlayerNameState(n);
    setNameConfirmed(true);
    setErr('');
  };

  if (!nameConfirmed) return (
    <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{textAlign:'center'}}>
          <p style={{color:'#ff1744',fontSize:9,letterSpacing:'0.25em',textTransform:'uppercase',fontWeight:700,margin:0}}>Welcome</p>
          <p style={{color:'#fff',fontSize:22,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',margin:'4px 0 0'}}>Who Are You?</p>
        </div>
        <Input
          autoFocus
          placeholder="Your name or email"
          value={nameInput}
          onChange={e => { setNameInput(e.target.value); setErr(''); }}
          onKeyDown={e => e.key === 'Enter' && confirmName()}
        />
        {err && <p style={{color:'#ff4444',fontSize:11,margin:0,textAlign:'center'}}>{err}</p>}
        <Button onClick={confirmName}>Continue →</Button>
      </div>
    </div>
  );

  const stage = bracket.stage;
  const stageLabel = { r32:'Round of 32', r16:'Round of 16', qf:'Quarter-Finals', sf:'Semi-Finals', final:'Final' }[stage] || stage;

  const matches = stage === 'final' ? (bracket.final ? [bracket.final] : []) : (bracket[stage] || []);
  const slots = matches.flatMap(m => [
    { ...m.p1, matchId: m.id, side: 'p1' },
    { ...m.p2, matchId: m.id, side: 'p2' },
  ]).filter(s => s?.name);

  const pick = async (slot) => {
    if (busy) return;
    setBusy(true); setErr('');
    const res = await api('/api/tournament/claim-team', { playerName, slotCode: slot.code });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    localStorage.setItem('psc_code', res.code);
    onPicked(res.code);
  };

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:10003,
      background:'rgba(0,0,0,0.85)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'center',justifyContent:'center',
      padding:'20px 16px',overflowY:'auto',
    }}>
      <div style={{width:'100%',maxWidth:360,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{textAlign:'center'}}>
          <p style={{color:'#ff1744',fontSize:9,letterSpacing:'0.25em',textTransform:'uppercase',fontWeight:700,margin:0}}>{stageLabel}</p>
          <p style={{color:'#fff',fontSize:20,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',margin:'4px 0 0'}}>Pick Your Team</p>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:11,margin:'4px 0 0'}}>{playerName}</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'60vh',overflowY:'auto'}}>
          {slots.map(slot => (
            <button key={slot.code} disabled={!!slot.player || busy} onClick={() => pick(slot)} style={{
              display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
              background: slot.player ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${slot.player ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'}`,
              borderRadius:8,cursor:slot.player?'default':'pointer',
              transition:'all 0.12s',opacity:slot.player?0.4:1,
              fontFamily:"'DM Sans',system-ui,sans-serif",
            }}
            onMouseEnter={e => { if (!slot.player) e.currentTarget.style.background='rgba(0,200,83,0.12)'; }}
            onMouseLeave={e => { if (!slot.player) e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
            >
              <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,
                background: slot.player ? 'rgba(255,255,255,0.05)' : 'rgba(0,200,83,0.15)',
                border:`1.5px solid ${slot.player?'rgba(255,255,255,0.1)':'rgba(0,200,83,0.4)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontWeight:900,color:slot.player?'rgba(255,255,255,0.3)':'#00c853',
              }}>
                {slot.seed}
              </div>
              <div style={{flex:1,textAlign:'left'}}>
                <div style={{color:'#fff',fontSize:13,fontWeight:700}}>{slot.name}</div>
                {slot.player && <div style={{color:'rgba(255,255,255,0.3)',fontSize:10,marginTop:1}}>Taken</div>}
              </div>
              {!slot.player && <span style={{color:'rgba(255,255,255,0.3)',fontSize:11}}>→</span>}
            </button>
          ))}
        </div>
        {err && <p style={{color:'#ff4444',fontSize:11,textAlign:'center',margin:0}}>{err}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SWEEPSTAKE COMPONENTS
// ═══════════════════════════════════════════════════════════════

function TeamProgressEditor({ team, td, color, onSave }) {
  const [groupPts, setGroupPts]   = useState(td?.groupPts ?? 0);
  const [reached, setReached]     = useState(td?.reached ?? '');
  const [topScorer, setTopScorer] = useState(td?.topScorer ?? false);
  const [cleanSheet, setCleanSheet] = useState(td?.cleanSheetFinal ?? false);
  const [upsets, setUpsets]       = useState(td?.upsets ?? 0);
  const [firstGoals, setFirstGoals] = useState(td?.firstGoals ?? 0);

  return (
    <div style={{padding:'8px 10px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:10,flexShrink:0}}>Group pts</span>
          <input type="number" min={0} value={groupPts}
            onChange={e => setGroupPts(parseInt(e.target.value)||0)}
            onBlur={() => onSave({ groupPts })}
            style={{width:52,padding:'3px 7px',borderRadius:5,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:12,fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,flex:1,minWidth:140}}>
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:10,flexShrink:0}}>Reached</span>
          <select value={reached} onChange={e => { setReached(e.target.value); onSave({ reached: e.target.value || null }); }}
            style={{flex:1,padding:'3px 5px',borderRadius:5,background:'#0a1628',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:10,fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}>
            <option value="">Group stage only</option>
            {SW_ROUNDS.map(r => <option key={r} value={r}>{SW_ROUND_LABELS[r]}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'4px 14px',alignItems:'center'}}>
        {[[topScorer,setTopScorer,'topScorer','Top scorer +15'],[cleanSheet,setCleanSheet,'cleanSheetFinal','Clean sheet final +10']].map(([val,set,key,label]) => (
          <label key={key} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
            <input type="checkbox" checked={!!val} onChange={e => { set(e.target.checked); onSave({[key]:e.target.checked}); }} style={{accentColor:color}}/>
            <span style={{color:'rgba(255,255,255,0.45)',fontSize:10}}>{label}</span>
          </label>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>Upsets</span>
          <input type="number" min={0} value={upsets}
            onChange={e => setUpsets(parseInt(e.target.value)||0)}
            onBlur={() => onSave({ upsets })}
            style={{width:38,padding:'2px 5px',borderRadius:4,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:11,fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}/>
          <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>×10</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>1st goals</span>
          <input type="number" min={0} value={firstGoals}
            onChange={e => setFirstGoals(parseInt(e.target.value)||0)}
            onBlur={() => onSave({ firstGoals })}
            style={{width:38,padding:'2px 5px',borderRadius:4,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:11,fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}/>
          <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>×2</span>
        </div>
      </div>
    </div>
  );
}

function SweepstakeAdminPanel({ sweepstake, onClose }) {
  const [tab, setTab]               = useState('participants');
  const [newName, setNewName]       = useState('');
  const [busy, setBusy]             = useState(false);
  const [editingP, setEditingP]     = useState(null);
  const [editTeams, setEditTeams]   = useState([]);
  const [expandedTeam, setExpandedTeam] = useState(null);

  const { participants = [], teamData = {} } = sweepstake || {};

  const addParticipant = async () => {
    const n = newName.trim();
    if (!n || busy) return;
    setBusy(true);
    await api('/api/sweepstake/assign', { participantName: n, teams: [] });
    setNewName(''); setBusy(false);
  };

  const removeParticipant = async name => {
    setBusy(true);
    await api('/api/sweepstake/remove-participant', { participantName: name });
    setBusy(false);
  };

  const saveParticipantTeams = async () => {
    if (!editingP) return;
    setBusy(true);
    await api('/api/sweepstake/assign', { participantName: editingP, teams: editTeams });
    setEditingP(null); setBusy(false);
  };

  const toggleTeam = team => setEditTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]);

  const saveTeamData = async (team, updates) => {
    await api('/api/sweepstake/update-team', { team, ...updates });
  };

  const assignedByOther = name => participants.filter(p => p.name !== name).flatMap(p => p.teams || []);

  return (
    <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.88)',overflowY:'auto'}} onClick={onClose}>
      <div style={{minHeight:'100%',maxWidth:520,margin:'0 auto',padding:'16px',display:'flex',flexDirection:'column',gap:12}} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2 style={{color:'#fff',fontSize:16,fontWeight:900,margin:0,letterSpacing:'0.05em'}}>Sweepstake</h2>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:'2px 0 0'}}>
              {participants.length} participants · {new Set(participants.flatMap(p => p.teams||[])).size}/48 teams assigned
            </p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:3,background:'rgba(255,255,255,0.05)',borderRadius:8,padding:3}}>
          {[['participants','Participants'],['teams','Teams']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex:1,padding:'7px',borderRadius:6,border:'none',cursor:'pointer',
              background:tab===id?'rgba(0,200,83,0.2)':'transparent',
              color:tab===id?'#00c853':'rgba(255,255,255,0.45)',
              fontSize:11,fontWeight:700,letterSpacing:'0.05em',
              fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>{label}</button>
          ))}
        </div>

        {/* ── Participants tab ── */}
        {tab === 'participants' && (<>
          <div style={{display:'flex',gap:8}}>
            <input placeholder="Participant name" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addParticipant()}
              style={{flex:1,padding:'8px 10px',borderRadius:7,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:13,fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}/>
            <button onClick={addParticipant} disabled={busy||!newName.trim()} style={{padding:'8px 14px',borderRadius:7,background:'#00c853',border:'none',color:'#000',fontSize:12,fontWeight:800,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",opacity:newName.trim()?1:0.5}}>Add</button>
          </div>

          {participants.map(p => (
            <div key={p.name} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px'}}>
                <span style={{color:'#fff',fontSize:13,fontWeight:700,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                <span style={{color:'rgba(255,255,255,0.3)',fontSize:10,flexShrink:0}}>{(p.teams||[]).length} teams</span>
                <button onClick={() => { setEditingP(p.name); setEditTeams([...(p.teams||[])]); }}
                  style={{background:'rgba(0,200,83,0.15)',border:'1px solid rgba(0,200,83,0.3)',color:'#00c853',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0}}>Edit teams</button>
                <button onClick={() => removeParticipant(p.name)}
                  style={{background:'rgba(255,23,68,0.1)',border:'1px solid rgba(255,23,68,0.25)',color:'#ff1744',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0}}>Remove</button>
              </div>
              {(p.teams||[]).length > 0 && (
                <div style={{padding:'0 12px 10px',display:'flex',flexWrap:'wrap',gap:4}}>
                  {(p.teams||[]).map(t => {
                    const ti = TEAM_TIER_MAP[t];
                    const pts = swTeamPts(teamData[t]);
                    return (
                      <span key={t} style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${ti?.color||'#666'}22`,color:ti?.color||'#aaa',border:`1px solid ${ti?.color||'#666'}44`}}>
                        {t}{pts > 0 ? ` ${pts}pts` : ''}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </>)}

        {/* ── Teams tab ── */}
        {tab === 'teams' && SWEEPSTAKE_TIERS.map(({ tier, label, color, teams }) => (
          <div key={tier} style={{display:'flex',flexDirection:'column',gap:3}}>
            <div style={{color:color,fontSize:9,letterSpacing:'0.2em',fontWeight:700,textTransform:'uppercase',fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:1}}>Tier {tier} — {label}</div>
            {teams.map(team => {
              const td   = teamData[team] || {};
              const owner = participants.find(p => p.teams?.includes(team));
              const isOpen = expandedTeam === team;
              return (
                <div key={team} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${isOpen?color+'55':'rgba(255,255,255,0.07)'}`,borderRadius:8,overflow:'hidden',transition:'border-color 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',cursor:'pointer'}} onClick={() => setExpandedTeam(t => t===team?null:team)}>
                    <div style={{width:6,height:6,borderRadius:1,background:color,flexShrink:0}}/>
                    <span style={{color:'#fff',fontSize:12,fontWeight:600,flex:1}}>{team}</span>
                    {owner && <span style={{color:'rgba(255,255,255,0.35)',fontSize:10,flexShrink:0}}>{owner.name}</span>}
                    {td.reached && <span style={{color:color,fontSize:10,fontWeight:700,flexShrink:0}}>{SW_ROUND_SHORT[td.reached]}</span>}
                    {!td.reached && td.groupPts > 0 && <span style={{color:'rgba(255,255,255,0.3)',fontSize:10,flexShrink:0}}>{td.groupPts}pts</span>}
                  </div>
                  {isOpen && (
                    <TeamProgressEditor key={`${team}-editor`} team={team} td={td} color={color} onSave={updates => saveTeamData(team, updates)}/>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Edit participant teams overlay */}
      {editingP && (
        <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.9)',overflowY:'auto'}} onClick={() => setEditingP(null)}>
          <div style={{maxWidth:480,margin:'0 auto',padding:'20px 16px',display:'flex',flexDirection:'column',gap:12,width:'100%'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <h3 style={{color:'#fff',fontSize:14,fontWeight:900,margin:0}}>Assign Teams</h3>
                <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:'2px 0 0'}}>{editingP} · {editTeams.length} assigned</p>
              </div>
              <button onClick={saveParticipantTeams} style={{background:'#00c853',border:'none',color:'#000',fontSize:12,fontWeight:800,padding:'8px 16px',borderRadius:7,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif"}}>Save</button>
            </div>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:10,margin:0}}>Tap to assign/remove. Greyed = assigned to someone else.</p>
            {SWEEPSTAKE_TIERS.map(({ tier, label, color, teams }) => (
              <div key={tier}>
                <div style={{color:color,fontSize:9,letterSpacing:'0.18em',fontWeight:700,textTransform:'uppercase',marginBottom:5}}>Tier {tier} — {label}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {teams.map(team => {
                    const selected   = editTeams.includes(team);
                    const takenByOther = assignedByOther(editingP).includes(team);
                    return (
                      <button key={team} onClick={() => !takenByOther && toggleTeam(team)} disabled={takenByOther} style={{
                        padding:'4px 9px',borderRadius:6,fontSize:11,fontWeight:700,
                        cursor:takenByOther?'default':'pointer',
                        background:selected?`${color}33`:takenByOther?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.06)',
                        border:selected?`1.5px solid ${color}`:`1px solid ${takenByOther?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.15)'}`,
                        color:selected?color:takenByOther?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.7)',
                        fontFamily:"'DM Sans',system-ui,sans-serif",
                        transition:'all 0.1s',
                      }}>
                        {selected && '✓ '}{team}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SweepstakeLeaderboard({ sweepstake }) {
  const [expanded, setExpanded] = useState(null);
  const { participants = [], teamData = {} } = sweepstake || {};

  if (!participants.length) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'50vh',gap:8,opacity:0.45}}>
      <div style={{color:'#fff',fontSize:14,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.1em',textTransform:'uppercase'}}>Sweepstake Not Started</div>
      <div style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>Admin will add participants and assign teams</div>
    </div>
  );

  const ranked = [...participants]
    .map(p => ({ ...p, pts: swParticipantPts(p, teamData) }))
    .sort((a, b) => b.pts - a.pts);

  const progressRows = SW_ROUNDS.map(r => ({
    round: r,
    teams: ALL_WC_TEAMS.filter(t => SW_ROUNDS.indexOf(teamData[t]?.reached) >= SW_ROUNDS.indexOf(r)),
  })).filter(row => row.teams.length > 0);

  const medalColor = i => i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : null;

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'10px 12px 40px',display:'flex',flexDirection:'column',gap:6}}>

      {/* Scoring key */}
      <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px 12px',marginBottom:2}}>
        <div style={{color:'rgba(255,255,255,0.3)',fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:700,marginBottom:4}}>Points</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'3px 10px'}}>
          {[['Group Win','3'],['Draw','1'],['R32','5'],['R16','10'],['QF','20'],['SF','35'],['Runner-up','50'],['Winner','100'],['Top scorer','+15'],['Clean sheet final','+10'],['Upset win','+10'],['First goal','+2']].map(([k,v]) => (
            <span key={k} style={{fontSize:9,color:'rgba(255,255,255,0.35)'}}>
              <span style={{color:'rgba(255,255,255,0.6)',fontWeight:600}}>{k}</span> {v}pts
            </span>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {ranked.map((p, i) => {
        const mc = medalColor(i);
        const isOpen = expanded === p.name;
        return (
          <div key={p.name}
            onClick={() => setExpanded(e => e === p.name ? null : p.name)}
            style={{
              background:'rgba(255,255,255,0.04)',
              border:`1px solid ${isOpen?'rgba(0,200,83,0.3)':'rgba(255,255,255,0.08)'}`,
              borderRadius:10,overflow:'hidden',cursor:'pointer',transition:'border-color 0.15s',
            }}
          >
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
              <div style={{
                width:28,height:28,borderRadius:'50%',flexShrink:0,
                background:mc?`${mc}22`:'rgba(255,255,255,0.05)',
                border:`1.5px solid ${mc||'rgba(255,255,255,0.15)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:11,fontWeight:900,color:mc||'rgba(255,255,255,0.4)',
                fontFamily:"'Big Shoulders Display',sans-serif",
              }}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'#fff',fontSize:13,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:3}}>
                  {(p.teams||[]).map(t => {
                    const ti = TEAM_TIER_MAP[t];
                    const td = teamData[t];
                    return (
                      <span key={t} style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:`${ti?.color||'#666'}22`,color:ti?.color||'#aaa',border:`1px solid ${ti?.color||'#666'}33`}}>
                        {t}{td?.reached ? ` · ${SW_ROUND_SHORT[td.reached]}` : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{color:'#00c853',fontSize:22,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",lineHeight:1}}>{p.pts}</div>
                <div style={{color:'rgba(255,255,255,0.3)',fontSize:8,letterSpacing:'0.1em'}}>PTS</div>
              </div>
            </div>
            {isOpen && (
              <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'8px 12px',display:'flex',flexDirection:'column',gap:5}}>
                {(p.teams||[]).map(t => {
                  const ti  = TEAM_TIER_MAP[t];
                  const td  = teamData[t];
                  const pts = swTeamPts(td);
                  return (
                    <div key={t} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:7,height:7,borderRadius:1,background:ti?.color||'#666',flexShrink:0}}/>
                      <span style={{color:'rgba(255,255,255,0.8)',fontSize:11,fontWeight:600,flex:1}}>{t}</span>
                      <span style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>{td?.reached ? SW_ROUND_LABELS[td.reached] : td?.groupPts ? 'Group stage' : 'No pts yet'}</span>
                      <span style={{color:'#00c853',fontSize:12,fontWeight:800,fontFamily:"'Big Shoulders Display',sans-serif",minWidth:32,textAlign:'right'}}>{pts}pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Tournament progression */}
      {progressRows.length > 0 && (
        <div style={{marginTop:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}>
          <div style={{color:'rgba(255,255,255,0.3)',fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:700}}>Tournament Progression</div>
          {progressRows.map(({ round, teams }) => (
            <div key={round} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
              <span style={{color:'rgba(255,255,255,0.3)',fontSize:9,fontWeight:700,letterSpacing:'0.08em',width:58,flexShrink:0,paddingTop:2}}>{SW_ROUND_SHORT[round]}</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                {teams.map(t => {
                  const ti    = TEAM_TIER_MAP[t];
                  const owner = participants.find(p => p.teams?.includes(t));
                  return (
                    <span key={t} title={owner?.name} style={{fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:3,background:`${ti?.color||'#666'}22`,color:ti?.color||'#aaa',border:`1px solid ${ti?.color||'#666'}33`}}>{t}</span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════

function HomeScreen({ serverState, onSelect }) {
  const bracket    = serverState?.bracket;
  const sw         = serverState?.sweepstake;
  const stage      = bracket?.stage;
  const stageLabel = {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',sf:'Semi-Finals',final:'Final',champion:'Champion'}[stage];
  const swParts    = sw?.participants?.length || 0;
  const swLeader   = swParts
    ? [...sw.participants].sort((a,b) => swParticipantPts(b,sw.teamData||{}) - swParticipantPts(a,sw.teamData||{}))[0]
    : null;

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      <StadiumBg/>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-10 pt-5 pb-4">
        <img src="/daf-logo.png" style={{height:80,objectFit:'contain',filter:'drop-shadow(0 0 16px rgba(0,200,83,0.4))'}} draggable={false} alt=""/>
        <div className="flex flex-col">
          <span style={{fontFamily:"'Big Shoulders Display',sans-serif",fontSize:26,fontWeight:900,letterSpacing:'0.05em',textTransform:'uppercase',color:'#fff',lineHeight:1}}>DAF World Cup 2026</span>
          <span style={{color:'rgba(255,255,255,0.35)',fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:600}}>Select a mode</span>
        </div>
      </div>

      {/* Cards */}
      <div className="relative z-10 grid grid-cols-2 gap-4 px-5 pb-5 flex-1 min-h-0">
        {/* Penalties card */}
        <Card
          onClick={() => onSelect('bracket')}
          className="cursor-pointer transition-transform duration-150 hover:-translate-y-1"
          style={{background:'rgba(4,16,32,0.88)',border:'1px solid rgba(255,255,255,0.08)',borderTop:'4px solid #00c853',borderRadius:16}}
        >
          <CardContent className="p-10 h-full flex flex-col justify-between">
            <span style={{fontFamily:"'Big Shoulders Display',sans-serif",fontSize:'clamp(40px,5vw,96px)',fontWeight:900,letterSpacing:'0.03em',textTransform:'uppercase',color:'#fff',lineHeight:1}}>
              Penalties
            </span>
            <div className="flex flex-col gap-3">
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:14,lineHeight:1.5}}>
                Penalty shootout bracket tournament
              </span>
              <Badge variant={!!bracket && stage !== 'champion' ? 'default' : 'outline'} className="w-fit text-[12px] tracking-wide px-3 py-1">
                {stageLabel || (bracket ? 'Active' : 'No tournament')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sweepstake card */}
        <Card
          onClick={() => onSelect('sweepstake')}
          className="cursor-pointer transition-transform duration-150 hover:-translate-y-1"
          style={{background:'rgba(4,16,32,0.88)',border:'1px solid rgba(255,255,255,0.08)',borderTop:'4px solid #ffd700',borderRadius:16}}
        >
          <CardContent className="p-10 h-full flex flex-col justify-between">
            <span style={{fontFamily:"'Big Shoulders Display',sans-serif",fontSize:'clamp(40px,5vw,96px)',fontWeight:900,letterSpacing:'0.03em',textTransform:'uppercase',color:'#fff',lineHeight:1}}>
              Sweepstake
            </span>
            <div className="flex flex-col gap-3">
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:14,lineHeight:1.5}}>
                World Cup team draw &amp; live leaderboard
              </span>
              {swLeader
                ? <Badge variant="outline" className="w-fit text-[12px] tracking-wide px-3 py-1" style={{color:'#ffd700',borderColor:'rgba(255,215,0,0.35)'}}>
                    {swLeader.name}
                  </Badge>
                : <Badge variant="outline" className="w-fit text-[12px] tracking-wide px-3 py-1">
                    {swParts ? `${swParts} players` : 'Not started'}
                  </Badge>
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT SCREEN
// ═══════════════════════════════════════════════════════════════

function TournamentScreen({ bracket, myCode, setMyCode, isAdmin, sweepstake, tournamentCode, tournamentName, startManaging, initialSwMode, onHome, onLeave, onLogout, onDeleteTournament, onCPU, onJoined, onAdminLogin, onTournamentCreated, onCodeEntered }) {
  const [submitMatch] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Code entry — shown when no local tournament code saved and user isn't admin
  const [codeInput, setCodeInput] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const needsCode = !isAdmin && !localStorage.getItem('psc_tcode');

  const submitCode = () => {
    const c = codeInput.trim().toUpperCase();
    if (!c) { setCodeErr('Enter the tournament code'); return; }
    if (!tournamentCode) { setCodeErr('No active tournament found'); return; }
    if (c !== tournamentCode.toUpperCase()) { setCodeErr('Wrong code — check with your admin'); return; }
    localStorage.setItem('psc_tcode', c);
    if (tournamentName) localStorage.setItem('psc_tname', tournamentName);
    onCodeEntered();
  };

  const playerName = localStorage.getItem('psc_name');
  // Show team picker when: not admin, bracket exists, not finished, and player hasn't claimed a team this round (or hasn't identified yet)
  const needsPick = !isAdmin && !!bracket && bracket.stage !== 'champion' && (() => {
    if (!playerName) return true;
    const stage = bracket.stage;
    const matches = stage === 'final' ? (bracket.final ? [bracket.final] : []) : (bracket[stage] || []);
    return !matches.some(m => m.p1?.player === playerName || m.p2?.player === playerName);
  })();
  const [menuOpen, setMenuOpen] = useState(false);
  const [managing, setManaging] = useState(!!startManaging);
  const [swMode, setSwMode] = useState(initialSwMode || 'bracket');
  const [managingSweepstake, setManagingSweepstake] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [winnerSelections, setWinnerSelections] = useState({});

  // Join modal
  const [joinModal, setJoinModal] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState('');

  // Admin login modal
  const [adminPrompt, setAdminPrompt] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminErr, setAdminErr] = useState('');

  // New tournament modal
  const [newTourneyModal, setNewTourneyModal] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyBusy, setNewTourneyBusy] = useState(false);
  const [newTourneyErr, setNewTourneyErr] = useState('');

  const stageLabel = {r32:'ROUND OF 32',r16:'ROUND OF 16',qf:'QUARTER-FINALS',sf:'SEMI-FINALS',final:'FINAL',champion:'CHAMPION'}[bracket?.stage] || '';

  const openMatch = (match) => setSubmitMatch(match);

  const resolveMatch = async (matchId, winnerCode) => {
    if (!winnerCode || resolvingId) return;
    setResolvingId(matchId);
    try { await api('/api/match/resolve', { matchId, winnerCode }); } catch(e) {}
    setResolvingId(null);
  };


  const handleJoin = async () => {
    if (!joinName.trim()) { setJoinErr('Enter your name'); return; }
    if (!joinCode.trim()) { setJoinErr('Enter the tournament code'); return; }
    setJoinBusy(true); setJoinErr('');
    const res = await api('/api/join', { name: joinName.trim(), tournamentCode: joinCode.trim().toUpperCase() });
    setJoinBusy(false);
    if (res.error) { setJoinErr(res.error); return; }
    localStorage.setItem('psc_code', res.code);
    localStorage.setItem('psc_name', joinName.trim());
    setJoinModal(false);
    onJoined(res.code);
  };

  const doAdminLogin = () => {
    if (adminEmail.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && adminPass === 'Mexico@#1000') {
      sessionStorage.setItem('psc_admin', '1');
      setAdminPrompt(false); setAdminErr('');
      onAdminLogin();
    } else { setAdminErr('Invalid credentials'); }
  };

  const createNewTourney = async () => {
    const tname = newTourneyName.trim();
    if (!tname) { setNewTourneyErr('Enter a tournament name'); return; }
    setNewTourneyBusy(true);
    await api('/api/tournament/reset', {});
    const res = await api('/api/tournament/create', { name: 'TheHub@dialaflight.co.uk', tournamentName: tname });
    setNewTourneyBusy(false);
    if (res.error) { setNewTourneyErr(res.error); return; }
    if (res.tournamentCode) localStorage.setItem('psc_tcode', res.tournamentCode);
    localStorage.setItem('psc_tname', tname);
    localStorage.removeItem('psc_code');
    setNewTourneyModal(false);
    onTournamentCreated(res.tournamentCode, tname);
  };

  return (
    <div style={{height:'100%',overflowY:'auto',WebkitOverflowScrolling:'touch',position:'relative',background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
      <StadiumBg/>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 flex flex-col p-0 gap-0">
          <SheetHeader className="px-5 pt-6 pb-4 border-b border-white/[0.07]">
            <SheetTitle className="text-xl uppercase tracking-wide leading-none" style={{fontFamily:"'Big Shoulders Display',sans-serif"}}>
              {tournamentName || 'DAF World Cup 2026'}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2 mt-1">
              {stageLabel && <span className="text-[10px] tracking-widest uppercase font-semibold text-muted-foreground">{stageLabel}</span>}
              {tournamentCode && <Badge variant="outline" className="text-[11px] tracking-widest text-primary border-primary/30 font-bold">{tournamentCode}</Badge>}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col flex-1 overflow-y-auto py-2">
            {isAdmin && bracket && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium" onClick={() => setManaging(true)}>
                  Manage Tournament
                </Button>
              </SheetClose>
            )}

            {!isAdmin && !myCode && bracket && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium" onClick={() => { setJoinName(''); setJoinCode(tournamentCode||''); setJoinErr(''); setJoinModal(true); }}>
                  Join Tournament
                </Button>
              </SheetClose>
            )}

            {myCode && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium" onClick={onLeave}>
                  Leave Tournament
                </Button>
              </SheetClose>
            )}

            <Separator className="my-1 bg-white/[0.06]" />

            <SheetClose asChild>
              <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium" onClick={() => onCPU(myCode ? localStorage.getItem('psc_name') : 'Player')}>
                Solo vs CPU
              </Button>
            </SheetClose>

            {isAdmin && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium" onClick={() => { setNewTourneyName(''); setNewTourneyErr(''); setNewTourneyModal(true); }}>
                  New Tournament
                </Button>
              </SheetClose>
            )}

            {isAdmin && bracket && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium text-yellow-400 hover:text-yellow-300" onClick={async () => {
                  const res = await api('/api/tournament/seed-nations', {});
                  if (res.error) alert(res.error);
                }}>
                  Seed FIFA Nations
                </Button>
              </SheetClose>
            )}

            {isAdmin && (
              <SheetClose asChild>
                <Button variant="ghost" className="justify-start rounded-none h-12 px-5 text-sm font-medium" style={{color:'#ffd700'}} onClick={() => setManagingSweepstake(true)}>
                  Sweepstake
                </Button>
              </SheetClose>
            )}
          </div>

          <div className="px-4 pb-6 pt-3 flex flex-col gap-2 border-t border-white/[0.07]">
            {onHome && (
              <SheetClose asChild>
                <Button variant="ghost" className="w-full justify-start" onClick={onHome}>
                  Home
                </Button>
              </SheetClose>
            )}
            {isAdmin ? (
              <>
                <SheetClose asChild>
                  <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                    Delete Tournament
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="outline" className="w-full" onClick={onLogout}>
                    Logout
                  </Button>
                </SheetClose>
              </>
            ) : (
              <SheetClose asChild>
                <Button variant="outline" className="w-full" onClick={() => { setAdminEmail(''); setAdminPass(''); setAdminErr(''); setAdminPrompt(true); }}>
                  Admin Login
                </Button>
              </SheetClose>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Admin login modal */}
      {adminPrompt && (
        <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseDown={e => { if (e.target === e.currentTarget) { setAdminPrompt(false); setAdminErr(''); } }}>
          <div style={{background:'#060f1e',border:'1px solid rgba(0,200,83,0.2)',borderRadius:10,padding:'24px 20px',width:280,display:'flex',flexDirection:'column',gap:10}}
            onMouseDown={e => e.stopPropagation()}>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',margin:0}}>Admin Access</p>
            <Input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} autoFocus/>
            <Input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doAdminLogin()}/>
            {adminErr && <p style={{color:'#ff4444',fontSize:11,margin:0}}>{adminErr}</p>}
            <Button size="sm" onClick={doAdminLogin}>Unlock</Button>
          </div>
        </div>
      )}

      {/* Join tournament modal */}
      {joinModal && (
        <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseDown={e => { if (e.target === e.currentTarget) setJoinModal(false); }}>
          <div style={{background:'#060f1e',border:'1px solid rgba(0,200,83,0.25)',borderRadius:12,padding:'24px 20px',width:290,display:'flex',flexDirection:'column',gap:10}}
            onMouseDown={e => e.stopPropagation()}>
            <p style={{color:'#fff',fontSize:15,fontWeight:900,margin:0}}>Join Tournament</p>
            <Input placeholder="Your name" value={joinName} onChange={e => setJoinName(e.target.value)} autoFocus/>
            <Input placeholder="Tournament code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={4}
              style={{letterSpacing:'0.25em',fontWeight:700,textTransform:'uppercase'}}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}/>
            {joinErr && <p style={{color:'#ff4444',fontSize:11,margin:0}}>{joinErr}</p>}
            <Button disabled={joinBusy} onClick={handleJoin}>{joinBusy ? '…' : 'Join'}</Button>
          </div>
        </div>
      )}

      {/* New tournament modal */}
      {newTourneyModal && (
        <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseDown={e => { if (e.target === e.currentTarget && !newTourneyBusy) setNewTourneyModal(false); }}>
          <div style={{background:'#060f1e',border:'1px solid rgba(0,200,83,0.25)',borderRadius:12,padding:'28px 24px',width:300,display:'flex',flexDirection:'column',gap:12}}
            onMouseDown={e => e.stopPropagation()}>
            <p style={{color:'#fff',fontSize:15,fontWeight:900,margin:0,letterSpacing:'0.05em'}}>New Tournament</p>
            <Input autoFocus placeholder="Tournament name" value={newTourneyName} onChange={e => setNewTourneyName(e.target.value)}
              onKeyDown={async e => { if (e.key === 'Enter') await createNewTourney(); }}/>
            {newTourneyErr && <p style={{color:'#ff4444',fontSize:11,margin:0}}>{newTourneyErr}</p>}
            <Button disabled={newTourneyBusy} onClick={createNewTourney}>{newTourneyBusy ? '…' : 'Create'}</Button>
          </div>
        </div>
      )}

      {managing && bracket && (
        <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.75)',display:'flex',justifyContent:'flex-end'}}
          onClick={() => setManaging(false)}>
          <div style={{
            width:340,height:'100%',background:'#060f1e',
            borderLeft:'1px solid rgba(255,255,255,0.1)',
            display:'flex',flexDirection:'column',overflow:'hidden',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{padding:'18px 18px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <span style={{color:'#fff',fontSize:14,fontWeight:800,letterSpacing:'0.04em',fontFamily:"'DM Sans',system-ui,sans-serif"}}>Manage Tournament</span>
                <button onClick={() => setManaging(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:18,cursor:'pointer',lineHeight:1,padding:2}}>✕</button>
              </div>
              {tournamentCode && (
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:'rgba(255,255,255,0.3)',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',fontFamily:"'DM Sans',system-ui,sans-serif"}}>Code</span>
                  <span style={{color:'#00c853',fontSize:16,fontWeight:900,letterSpacing:'0.25em',fontFamily:"'Big Shoulders Display',sans-serif"}}>{tournamentCode}</span>
                </div>
              )}
              {(tournamentName || localStorage.getItem('psc_tname')) && (
                <div style={{color:'rgba(255,255,255,0.3)',fontSize:10,marginTop:3,letterSpacing:'0.04em'}}>{tournamentName || localStorage.getItem('psc_tname')}</div>
              )}
            </div>

            <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:14}}>

              {/* ── Teams this round ── */}
              {(() => {
                const stage = bracket.stage;
                if (stage === 'champion') return null;
                const matches = stage === 'final' ? (bracket.final ? [bracket.final] : []) : (bracket[stage] || []);
                const slots = matches.flatMap(m => [m.p1, m.p2]).filter(s => s?.name);
                if (!slots.length) return null;
                const stageNames = {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',sf:'Semi-Finals',final:'Final'};
                return (
                  <div>
                    <div style={{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                      {stageNames[stage] || stage} — Teams
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {slots.map(s => (
                        <div key={s.code} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:6}}>
                          <div style={{width:7,height:7,borderRadius:'50%',background:s.player?'#00c853':'rgba(255,255,255,0.15)',flexShrink:0}}/>
                          <span style={{flex:1,fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</span>
                          {s.player
                            ? <span style={{fontSize:10,color:'rgba(255,255,255,0.45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{s.player}</span>
                            : <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>Unclaimed</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── All fixtures by round ── */}
              {(() => {
                const rounds = [
                  { key:'r32', label:'Round of 32' },
                  { key:'r16', label:'Round of 16' },
                  { key:'qf',  label:'Quarter-Finals' },
                  { key:'sf',  label:'Semi-Finals' },
                ];
                const sections = [];
                for (const { key, label } of rounds) {
                  const matches = bracket[key] || [];
                  if (!matches.length) continue;
                  sections.push(
                    <div key={key}>
                      <div style={{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8,fontFamily:"'DM Sans',system-ui,sans-serif"}}>{label}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {matches.map((m, i) => {
                          const sel = winnerSelections[m.id] || '';
                          const busy = resolvingId === m.id;
                          return (
                            <div key={m.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${m.played?'rgba(0,200,83,0.2)':'rgba(255,255,255,0.08)'}`,borderRadius:7,overflow:'hidden'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 10px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                <span style={{color:'#ff1744',fontSize:8,fontWeight:700,letterSpacing:'0.12em',fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:'uppercase'}}>Match {i+1}</span>
                                {m.played && <span style={{color:'#00c853',fontSize:9,fontWeight:700}}>✓ {m.winner?.name}</span>}
                              </div>
                              <div style={{padding:'7px 10px',display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{color:m.played&&m.winner?.code===m.p1?.code?'#00c853':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</div>
                                  {m.p1?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:9,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1.player}</div>}
                                </div>
                                <span style={{color:'rgba(255,255,255,0.2)',fontSize:10,flexShrink:0}}>
                                  {m.played ? `${m.p1Score??'–'}-${m.p2Score??'–'}` : 'vs'}
                                </span>
                                <div style={{flex:1,minWidth:0,textAlign:'right'}}>
                                  <div style={{color:m.played&&m.winner?.code===m.p2?.code?'#00c853':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2?.name||'TBD'}</div>
                                  {m.p2?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:9,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2.player}</div>}
                                </div>
                              </div>
                              <div style={{padding:'0 10px 8px'}}>
                                <WatchUrlInput matchId={m.id} initialUrl={m.watchUrl} placeholder="Rise 360 URL…"/>
                              </div>
                              {!m.played && m.p1?.name && m.p2?.name && (
                                <div style={{padding:'0 10px 10px',display:'flex',gap:6}}>
                                  <select value={sel} onChange={e => setWinnerSelections(prev => ({...prev,[m.id]:e.target.value}))}
                                    style={{flex:1,borderRadius:6,fontSize:11,padding:'5px 8px',background:'#0a1628',border:'1px solid rgba(255,255,255,0.15)',color:sel?'#fff':'rgba(255,255,255,0.4)',outline:'none',cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                                    <option value="">Winner…</option>
                                    <option value={m.p1.code}>{m.p1.name}</option>
                                    <option value={m.p2.code}>{m.p2.name}</option>
                                  </select>
                                  <button disabled={!sel||busy} onClick={() => resolveMatch(m.id, sel)}
                                    style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:700,cursor:sel&&!busy?'pointer':'default',background:sel?'rgba(0,200,83,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${sel?'rgba(0,200,83,0.5)':'rgba(255,255,255,0.1)'}`,color:sel?'#00c853':'rgba(255,255,255,0.3)',fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                                    {busy?'…':'Confirm'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                // Final
                if (bracket.final) {
                  const m = bracket.final;
                  const sel = winnerSelections[m.id] || '';
                  const busy = resolvingId === m.id;
                  sections.push(
                    <div key="final">
                      <div style={{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8,fontFamily:"'DM Sans',system-ui,sans-serif"}}>Final</div>
                      <div style={{background:'rgba(255,200,0,0.05)',border:`1px solid ${m.played?'rgba(0,200,83,0.3)':'rgba(255,200,0,0.2)'}`,borderRadius:7,overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 10px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                          <span style={{color:'#ffc107',fontSize:8,fontWeight:700,letterSpacing:'0.12em',fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:'uppercase'}}>Final</span>
                          {m.played && <span style={{color:'#00c853',fontSize:9,fontWeight:700}}>✓ {m.winner?.name}</span>}
                        </div>
                        <div style={{padding:'7px 10px',display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:m.played&&m.winner?.code===m.p1?.code?'#00c853':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</div>
                            {m.p1?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:9,marginTop:1}}>{m.p1.player}</div>}
                          </div>
                          <span style={{color:'rgba(255,255,255,0.2)',fontSize:10,flexShrink:0}}>{m.played?`${m.p1Score??'–'}-${m.p2Score??'–'}`:'vs'}</span>
                          <div style={{flex:1,minWidth:0,textAlign:'right'}}>
                            <div style={{color:m.played&&m.winner?.code===m.p2?.code?'#00c853':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2?.name||'TBD'}</div>
                            {m.p2?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:9,marginTop:1}}>{m.p2.player}</div>}
                          </div>
                        </div>
                        <div style={{padding:'0 10px 8px'}}>
                          <WatchUrlInput matchId={m.id} initialUrl={m.watchUrl} placeholder="Rise 360 URL…"/>
                        </div>
                        {!m.played && m.p1?.name && m.p2?.name && (
                          <div style={{padding:'0 10px 10px',display:'flex',gap:6}}>
                            <select value={sel} onChange={e => setWinnerSelections(prev => ({...prev,[m.id]:e.target.value}))}
                              style={{flex:1,borderRadius:6,fontSize:11,padding:'5px 8px',background:'#0a1628',border:'1px solid rgba(255,255,255,0.15)',color:sel?'#fff':'rgba(255,255,255,0.4)',outline:'none',cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                              <option value="">Winner…</option>
                              <option value={m.p1.code}>{m.p1.name}</option>
                              <option value={m.p2.code}>{m.p2.name}</option>
                            </select>
                            <button disabled={!sel||busy} onClick={() => resolveMatch(m.id, sel)}
                              style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:700,cursor:sel&&!busy?'pointer':'default',background:sel?'rgba(0,200,83,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${sel?'rgba(0,200,83,0.5)':'rgba(255,255,255,0.1)'}`,color:sel?'#00c853':'rgba(255,255,255,0.3)',fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                              {busy?'…':'Confirm'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return sections;
              })()}

            </div>
          </div>
        </div>
      )}

      {/* Confirm delete overlay */}
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={() => setConfirmDelete(false)}>
          <div style={{background:'#060f1e',border:'1px solid rgba(255,68,68,0.3)',borderRadius:12,padding:'28px 24px',width:280,display:'flex',flexDirection:'column',gap:14}}
            onClick={e => e.stopPropagation()}>
            <p style={{color:'#fff',fontSize:15,fontWeight:900,margin:0}}>Delete Tournament?</p>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,margin:0}}>This will permanently wipe all bracket data and cannot be undone.</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={() => setConfirmDelete(false)} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,color:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:700,padding:'10px',cursor:'pointer'}}>Cancel</button>
              <button onClick={onDeleteTournament} style={{flex:1,background:'rgba(255,23,68,0.12)',border:'1px solid #ff1744',borderRadius:8,color:'#ff1744',fontSize:13,fontWeight:700,padding:'10px',cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{position:'sticky',top:0,zIndex:10,background:'#030d1a',display:'flex',flexDirection:'column'}}>
        {/* Full-width top accent */}
        <div style={{height:3,background:'linear-gradient(90deg,#00c853 0%,rgba(0,200,83,0.5) 100%)',flexShrink:0}}/>
        {/* Row */}
        <div style={{height:50,display:'flex',alignItems:'stretch'}}>
          {/* Left accent rail */}
          <div style={{width:3,background:'linear-gradient(180deg,#00c853,rgba(0,200,83,0.2))',flexShrink:0}}/>
          {/* Hamburger */}
          <button onClick={() => setMenuOpen(v => !v)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 12px',display:'flex',flexDirection:'column',gap:4,flexShrink:0,justifyContent:'center',alignItems:'flex-start'}}>
            <span style={{display:'block',width:20,height:2,background:'rgba(255,255,255,0.9)',borderRadius:1}}/>
            <span style={{display:'block',width:26,height:2,background:'rgba(255,255,255,0.9)',borderRadius:1}}/>
            <span style={{display:'block',width:15,height:2,background:'rgba(255,255,255,0.9)',borderRadius:1}}/>
          </button>
          {/* Title + logo — centred absolutely */}
          <div style={{position:'absolute',left:0,right:0,height:53,display:'flex',alignItems:'center',justifyContent:'center',gap:10,pointerEvents:'none'}}>
            <span style={{color:'#fff',fontSize:19,fontWeight:900,letterSpacing:'0.05em',textTransform:'uppercase',fontFamily:"'Big Shoulders Display',sans-serif",lineHeight:1}}>
              {tournamentName || 'DAF World Cup 2026'}
            </span>
            <img src="/daf-logo.png" alt="" style={{height:56,width:'auto',objectFit:'contain',opacity:0.9,filter:'drop-shadow(0 0 6px rgba(0,200,83,0.3))'}} draggable={false}/>
          </div>
          {/* Stage + code — right */}
          <div style={{marginLeft:'auto',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'flex-end',padding:'0 12px',gap:3,flexShrink:0}}>
            {stageLabel && <span style={{color:'rgba(255,255,255,0.25)',fontSize:8,letterSpacing:'0.22em',textTransform:'uppercase',fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:700,lineHeight:1}}>{stageLabel}</span>}
            {tournamentCode && <span style={{color:'#00c853',fontFamily:"'DM Sans',system-ui,sans-serif",fontSize:14,letterSpacing:'0.2em',fontWeight:800,lineHeight:1}}>{tournamentCode}</span>}
          </div>
        </div>
        {/* Mode tabs */}
        <div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          {[['bracket','Bracket'],['sweepstake','Sweepstake']].map(([mode,label]) => (
            <button key={mode} onClick={() => setSwMode(mode)} style={{
              flex:1,padding:'8px 0',border:'none',cursor:'pointer',background:'transparent',
              fontSize:9,fontWeight:800,letterSpacing:'0.18em',textTransform:'uppercase',
              color:swMode===mode?'#00c853':'rgba(255,255,255,0.3)',
              borderBottom:`2px solid ${swMode===mode?'#00c853':'transparent'}`,
              fontFamily:"'DM Sans',system-ui,sans-serif",transition:'color 0.15s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Sweepstake leaderboard */}
      {swMode === 'sweepstake' && <SweepstakeLeaderboard sweepstake={sweepstake}/>}

      {/* Bracket tree + admin URL panel */}
      {swMode === 'bracket' && (<>
      {bracket ? (
        <div style={{display:'flex',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:0}}>
            <BracketTree bracket={bracket} myCode={myCode} onMatchClick={openMatch}/>
          </div>
          {isAdmin && (
            <div style={{
              width:220,flexShrink:0,
              borderLeft:'1px solid rgba(255,255,255,0.07)',
              background:'rgba(3,13,26,0.95)',
              minHeight:'calc(100vh - 53px)',
              padding:'12px 10px',
              display:'flex',flexDirection:'column',gap:6,
            }}>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:700,marginBottom:4,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                {['r32','r16','qf','sf','final'].includes(bracket.stage) ? {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',sf:'Semi-Finals',final:'Final'}[bracket.stage] : 'Matches'} · URLs
              </div>
              {(bracket.stage === 'final' ? [bracket.final].filter(Boolean) : (bracket[bracket.stage] || [])).map((m, i) => {
                const num = m.id === 'final' ? null : i + 1;
                return (
                  <div key={m.id} style={{display:'flex',flexDirection:'column',gap:4,padding:'8px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:6}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      {num && <span style={{color:'#ff1744',fontSize:8,fontWeight:700,letterSpacing:'0.12em',fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:'uppercase'}}>Match {num}</span>}
                      {m.played && <span style={{color:'#00c853',fontSize:8,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.7)',display:'flex',gap:4,alignItems:'center'}}>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</span>
                      <span style={{color:'rgba(255,255,255,0.25)',flexShrink:0,fontSize:9}}>vs</span>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{m.p2?.name||'TBD'}</span>
                    </div>
                    <WatchUrlInput matchId={m.id} initialUrl={m.watchUrl} placeholder="Rise 360 URL…"/>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:12,opacity:0.5}}>
          <div style={{color:'#fff',fontSize:16,fontWeight:700,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.1em',textTransform:'uppercase'}}>No Active Tournament</div>
          {isAdmin && <div style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>Create one via the menu</div>}
        </div>
      )}

      </>)}

      {needsPick && (
        <TeamPicker
          bracket={bracket}
          playerName={playerName}
          onPicked={code => setMyCode(code)}
        />
      )}

      {/* Code entry — shown when no saved tournament code */}
      {needsCode && (
        <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{textAlign:'center'}}>
              <p style={{color:'#ff1744',fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',fontWeight:700,margin:0}}>DAF World Cup 2026</p>
              <p style={{color:'#fff',fontSize:22,fontWeight:900,fontFamily:"'Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',margin:'6px 0 0'}}>Enter Tournament Code</p>
              <p style={{color:'rgba(255,255,255,0.35)',fontSize:12,margin:'6px 0 0'}}>Get the 4-letter code from your admin</p>
            </div>
            <input
              autoFocus
              maxLength={4}
              placeholder="e.g. ABCD"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeErr(''); }}
              onKeyDown={e => e.key === 'Enter' && submitCode()}
              style={{
                width:'100%',padding:'14px 16px',borderRadius:8,fontSize:22,fontWeight:800,
                letterSpacing:'0.3em',textAlign:'center',textTransform:'uppercase',
                background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.2)',
                color:'#fff',outline:'none',fontFamily:"'DM Sans',system-ui,sans-serif",
              }}
            />
            {codeErr && <p style={{color:'#ff4444',fontSize:12,margin:0,textAlign:'center'}}>{codeErr}</p>}
            <button onClick={submitCode} style={{
              padding:'13px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
              background:'linear-gradient(135deg,#00c853,#00a651)',border:'none',color:'#000',cursor:'pointer',
              fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>
              Load Tournament →
            </button>
            <button onClick={() => { setAdminPrompt(true); setAdminEmail(''); setAdminPass(''); setAdminErr(''); }} style={{
              background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:11,cursor:'pointer',
              letterSpacing:'0.05em',fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>
              Admin? Log in instead
            </button>
          </div>
        </div>
      )}
      {managingSweepstake && (
        <SweepstakeAdminPanel sweepstake={sweepstake} onClose={() => setManagingSweepstake(false)}/>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAMPION SCREEN
// ═══════════════════════════════════════════════════════════════

function ChampionScreen({ name, onBack }) {
  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden text-center p-7" style={{background:'#030d1a url(/bg.png) center/cover no-repeat fixed'}}>
      <StadiumBg pulse/>
      <Confetti/>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <img src="/daf-logo.png" draggable={false} style={{height:110,objectFit:'contain',animation:'floatBob 1.5s ease-in-out infinite',filter:'drop-shadow(0 0 30px rgba(0,166,81,0.7))'}} alt=""/>
        <p className="text-[11px] tracking-[0.4em] uppercase font-black text-green-400" style={{textShadow:'0 0 25px rgba(0,200,83,0.5)'}}>DAF World Cup 2026</p>
        <div className="text-4xl font-black tracking-wide text-foreground" style={{fontFamily:"'Big Shoulders Display',sans-serif",animation:'scaleIn 0.7s ease'}}>{name}</div>
        <Badge variant="success" className="text-xs tracking-widest uppercase px-4 py-1">DAF World Cup 2026 Champion</Badge>
        <Button size="lg" className="mt-6" onClick={onBack}>Play Again</Button>
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
  const [screen, setScreen] = useState('loading'); // loading | home | tournament | champion | cpu
  const [cpuName, setCpuName] = useState('');
  const [adminSession, setAdminSession] = useState(() => !!sessionStorage.getItem('psc_admin'));
  const [startManaging, setStartManaging] = useState(false);
  const [initialSwMode, setInitialSwMode] = useState('bracket');

  // Poll server state every 1.5s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await fetch('/api/state', { signal: AbortSignal.timeout(3000) }).then(r => r.json());
        if (!cancelled) {
          setServerState(data);
          setScreen(prev => prev === 'loading' ? 'home' : prev);
        }
      } catch (_) {
        if (!cancelled) setScreen(prev => prev === 'loading' ? 'tournament' : prev);
      }
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

  const handleAdminView = (_tcode, _tname) => {
    sessionStorage.setItem('psc_admin', '1');
    setAdminSession(true);
    setMyCode(null);
    setStartManaging(false);
    setScreen('tournament');
  };

  const handleAdminManage = () => {
    sessionStorage.setItem('psc_admin', '1');
    setAdminSession(true);
    setMyCode(null);
    setStartManaging(true);
    setScreen('tournament');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('psc_admin');
    setAdminSession(false);
    setMyCode(null);
    localStorage.removeItem('psc_code');
    localStorage.removeItem('psc_name');
    localStorage.removeItem('psc_tcode');
    localStorage.removeItem('psc_tname');
  };

  const handleCPU = (name) => {
    setCpuName(name || 'Player');
    setScreen('cpu');
  };

  const handleHome = () => setScreen('home');

  const handleSelectMode = (mode) => {
    setInitialSwMode(mode);
    setScreen('tournament');
  };

  const handleReset = async () => {
    await api('/api/tournament/reset', {});
    setMyCode(null);
    localStorage.removeItem('psc_code');
    localStorage.removeItem('psc_name');
    localStorage.removeItem('psc_tcode');
    localStorage.removeItem('psc_tname');
  };

  const handleAdminLogin = () => {
    setAdminSession(true);
    setMyCode(null);
    setStartManaging(false);
  };

  const handleTournamentCreated = (tcode, tname) => {
    if (tcode) localStorage.setItem('psc_tcode', tcode);
    if (tname) localStorage.setItem('psc_tname', tname);
    setAdminSession(true);
    setMyCode(null);
  };

  // Forces a re-render after code is saved to localStorage
  const [codeKey, setCodeKey] = useState(0);
  const handleCodeEntered = () => setCodeKey(k => k + 1);

  const W = { height:'100%', overflow:'hidden', background:'#030d1a url(/bg.png) center/cover no-repeat fixed' };
  const bracket = serverState?.bracket;

  return (
    <div style={{ height:'100vh', overflow:'hidden', background:'#030d1a url(/bg.png) center/cover no-repeat fixed', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* Film grain overlay */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9998,opacity:0.045,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>

      {screen === 'loading' && (
        <div style={{height:'100%',background:'#020b14',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {/* Stadium background photo */}
          <div style={{position:'absolute',inset:0,backgroundImage:'url(/bg.png)',backgroundSize:'cover',backgroundPosition:'center',opacity:0.45}}/>
          {/* Dark vignette overlay */}
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, rgba(2,11,20,0.7) 60%, rgba(2,11,20,0.96) 100%)'}}/>
          {/* Crowd texture pulse */}
          <div style={{position:'absolute',inset:0,backgroundImage:'url(/bg.png)',backgroundSize:'cover',backgroundPosition:'center top',animation:'crowd 4s ease-in-out infinite',opacity:0.18}}/>

          {/* Left floodlight beam */}
          <div style={{
            position:'absolute',top:'-5%',left:'8%',
            width:220,height:'110%',
            background:'linear-gradient(to bottom, rgba(255,255,220,0.28) 0%, rgba(255,255,220,0.04) 60%, transparent 100%)',
            transformOrigin:'top center',
            animation:'floodBeam 5s ease-in-out infinite',
            pointerEvents:'none',
          }}/>
          {/* Right floodlight beam */}
          <div style={{
            position:'absolute',top:'-5%',right:'8%',
            width:220,height:'110%',
            background:'linear-gradient(to bottom, rgba(255,255,220,0.22) 0%, rgba(255,255,220,0.04) 60%, transparent 100%)',
            transformOrigin:'top center',
            animation:'floodBeam2 5s ease-in-out infinite 1.4s',
            pointerEvents:'none',
          }}/>

          {/* Ticker phrases cycling */}
          <LoadingTicker/>

          {/* Centre content */}
          <div style={{position:'relative',zIndex:10,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
            {/* Logo with dramatic reveal */}
            <img
              src="/daf-logo.png"
              style={{
                height:160,objectFit:'contain',
                animation:'logoReveal 1.4s cubic-bezier(0.22,1,0.36,1) forwards',
                filter:'drop-shadow(0 0 60px rgba(255,255,255,0.55)) drop-shadow(0 0 120px rgba(0,200,83,0.3))',
              }}
              alt="DAF World Cup 2026"
            />
            <div style={{color:'rgba(255,255,255,0.55)',fontSize:13,letterSpacing:5,textTransform:'uppercase',fontFamily:"'Big Shoulders Display',sans-serif"}}>
              DAF WORLD CUP 2026
            </div>
          </div>

          {/* Bottom progress bar */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'rgba(255,255,255,0.07)'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#00c853,#a3ff7a,#00c853)',animation:'loadBar 2.2s ease-in-out forwards',backgroundSize:'200% 100%'}}/>
          </div>
        </div>
      )}

      {screen === 'home' && (
        <div style={W}>
          <HomeScreen serverState={serverState} onSelect={handleSelectMode} />
        </div>
      )}

      {screen === 'cpu' && (
        <div style={W}>
          <CPUBracketScreen
            playerName={cpuName || localStorage.getItem('psc_name') || 'Player'}
            onExit={() => setScreen('tournament')}
          />
        </div>
      )}

      {screen === 'tournament' && (
        <div style={W}>
          <TournamentScreen
            key={codeKey}
            bracket={bracket}
            myCode={myCode}
            setMyCode={setMyCode}
            isAdmin={adminSession}
            sweepstake={serverState?.sweepstake}
            tournamentCode={serverState?.tournamentCode || localStorage.getItem('psc_tcode')}
            tournamentName={serverState?.tournamentName || localStorage.getItem('psc_tname')}
            startManaging={startManaging}
            initialSwMode={initialSwMode}
            onHome={handleHome}
            onLeave={() => {
              setMyCode(null);
              localStorage.removeItem('psc_code');
              localStorage.removeItem('psc_name');
            }}
            onLogout={handleAdminLogout}
            onDeleteTournament={handleReset}
            onCPU={handleCPU}
            onJoined={(code) => setMyCode(code)}
            onAdminLogin={handleAdminLogin}
            onTournamentCreated={handleTournamentCreated}
            onCodeEntered={handleCodeEntered}
          />
        </div>
      )}

      {screen === 'champion' && bracket?.champion && (
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
