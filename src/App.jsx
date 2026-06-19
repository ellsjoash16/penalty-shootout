import { useState, useEffect, useRef, useCallback, Component } from "react";
import { createPortal } from "react-dom";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.error) return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:40,gap:16,minHeight:200}}>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:13,margin:0}}>Something went wrong.</p>
        <pre style={{color:'rgba(255,100,100,0.7)',fontSize:12,maxWidth:400,whiteSpace:'pre-wrap',margin:0}}>{this.state.error?.message}</pre>
        <button onClick={() => this.setState({ error: null })} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:12,fontWeight:700,padding:'8px 20px',borderRadius:8,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif"}}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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
  { tier:2, label:'Contenders',  color:'#22c55e', teams:['Belgium','Germany','Croatia','Colombia','Senegal','Mexico','United States','Uruguay'] },
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
  let pts = 0;
  const idx = SW_ROUNDS.indexOf(td.reached);
  if (idx >= 0) for (let i = 0; i <= idx; i++) pts += SW_ROUND_PTS[SW_ROUNDS[i]];
  if (td.topScorer) pts += 15;
  if (td.groupWinner) pts += 10;
  pts += (td.cleanSheets || 0) * 5;
  pts += (td.wins || 0) * 3;
  pts += (td.draws || 0) * 1;
  pts += (td.upsets || 0) * 3;
  pts += (td.firstGoals || 0) * 2;
  return pts;
};
const swParticipantPts = (p, teamData) =>
  (p.teams || []).reduce((sum, t) => sum + swTeamPts(teamData?.[t]), 0);

const WC_GROUPS = {
  A: ['Mexico','South Africa','South Korea','Czechia'],
  B: ['Canada','Bosnia & Herzegovina','Qatar','Switzerland'],
  C: ['Brazil','Morocco','Haiti','Scotland'],
  D: ['United States','Paraguay','Australia','Türkiye'],
  E: ['Germany','Curaçao','Ivory Coast','Ecuador'],
  F: ['Netherlands','Japan','Sweden','Tunisia'],
  G: ['Belgium','Egypt','Iran','New Zealand'],
  H: ['Spain','Cape Verde','Saudi Arabia','Uruguay'],
  I: ['France','Senegal','Iraq','Norway'],
  J: ['Argentina','Algeria','Austria','Jordan'],
  K: ['Portugal','DR Congo','Uzbekistan','Colombia'],
  L: ['England','Croatia','Ghana','Panama'],
};

// ─── TEAM LOGOS ──────────────────────────────────────────────────────────────
const TEAM_LOGO_MAP = {
  'France':               '/logos/france.png',
  'Spain':                '/logos/spain.png',
  'Argentina':            '/logos/argentina.png',
  'England':              '/logos/england.png',
  'Portugal':             '/logos/portugal.png',
  'Brazil':               '/logos/brazil.png',
  'Netherlands':          '/logos/netherlands.png',
  'Morocco':              '/logos/morocco.png',
  'Belgium':              '/logos/belgium.png',
  'Germany':              '/logos/germany.png',
  'Croatia':              '/logos/croatia.png',
  'Colombia':             '/logos/colombia.png',
  'Senegal':              '/logos/senegal.png',
  'Mexico':               '/logos/mexico.png',
  'United States':        '/logos/usa.png',
  'Uruguay':              '/logos/uruguay.png',
  'Japan':                '/logos/japan.png',
  'Switzerland':          '/logos/switzerland.png',
  'Norway':               '/logos/norway.png',
  'Australia':            '/logos/australia.png',
  'Türkiye':              '/logos/turkey.png',
  'Austria':              '/logos/austria.png',
  'Ecuador':              '/logos/ecuador.png',
  'Sweden':               '/logos/sweden.png',
  'Iran':                 '/logos/iran.png',
  'Scotland':             '/logos/scotland.png',
  'Egypt':                '/logos/egypt.png',
  'Panama':               '/logos/panama.png',
  'Ivory Coast':          '/logos/ivory-coast.png',
  'Canada':               '/logos/canada.png',
  'Algeria':              '/logos/algeria.png',
  'Paraguay':             '/logos/paraguay.png',
  'South Korea':          '/logos/south-korea.png',
  'Tunisia':              '/logos/tunisia.png',
  'Czechia':              '/logos/czechia.png',
  'DR Congo':             '/logos/dr-congo.png',
  'Uzbekistan':           '/logos/uzbekistan.png',
  'South Africa':         '/logos/south-africa.png',
  'Iraq':                 '/logos/iraq.png',
  'Qatar':                '/logos/qatar.png',
  'Saudi Arabia':         '/logos/saudi-arabia.png',
  'Jordan':               '/logos/jordan.png',
  'Bosnia & Herzegovina': '/logos/bosnia.png',
  'Cape Verde':           '/logos/cape-verde.png',
  'Ghana':                '/logos/ghana.png',
  'Curaçao':              '/logos/curacao.png',
  'Haiti':                '/logos/haiti.png',
  'New Zealand':          '/logos/new-zealand.png',
};

function TeamLogo({ name, size = 16, style }) {
  const src = TEAM_LOGO_MAP[name];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{width:size,height:size,objectFit:'contain',flexShrink:0,...style}}
    />
  );
}

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
  @keyframes loadDot {
    0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
    40%           { opacity: 1;    transform: translateY(-6px); }
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
  @keyframes cardFloat {
    0%,100% { transform: translateY(0px); box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3); }
    50%      { transform: translateY(-10px); box-shadow: 0 22px 48px rgba(0,0,0,0.55), 0 8px 20px rgba(0,0,0,0.35); }
  }
  @keyframes marqueeScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes shimmerBorder {
    0%,100% { opacity: 0.55; }
    50%     { opacity: 1; }
  }
  @keyframes heroGlow {
    0%,100% { text-shadow: 0 0 40px rgba(255,215,0,0.25), 0 2px 4px rgba(0,0,0,0.8); }
    50%     { text-shadow: 0 0 80px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.8); }
  }
  .home-card {
    transition: transform 0.18s ease, filter 0.18s ease;
  }
  .home-card:hover {
    transform: scale(1.025);
    filter: brightness(1.12);
  }
  .flag-marquee { overflow: hidden; width: 100%; position: relative; }
  .flag-track { display: flex; gap: 14px; width: max-content; animation: marqueeScroll 28s linear infinite; }
  .flag-track:hover { animation-play-state: paused; }
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
    color: #22c55e;
    transform: scale(1.04);
    box-shadow: 0 0 16px rgba(0,200,83,0.25);
  }
  .zone-btn.selected {
    border-color: #22c55e;
    background: rgba(0,200,83,0.18);
    color: #22c55e;
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
    border-color: #22c55e !important; background: rgba(0,200,83,0.22) !important;
    color: #22c55e !important;
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
    background: linear-gradient(135deg,#22c55e,#00a651);
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
          fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",
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
      position:'fixed', inset:0, zIndex:0, overflow:'hidden',
      background:'url(/bg.png) center/cover no-repeat',
      animation: pulse ? 'goalFlashBg 0.8s ease' : 'none',
    }}>
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
    color:['#22c55e','#00a651','#00e676','#004225','#ff6b35','#ffffff'][Math.floor(Math.random()*6)],
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
                  minHeight:0, gap:1,
                }}>
                {!showReveal && (
                  <span style={{fontSize:16,filter:'drop-shadow(0 1px 4px rgba(0,0,0,1))'}}>
                    {ZONE_ICONS[z]}
                  </span>
                )}
                {showReveal && isShot && isGoal  && <span style={{fontSize:13,fontWeight:900,letterSpacing:1}}>GOAL</span>}
                {showReveal && isShot && !isGoal && isSave && <span style={{fontSize:13,fontWeight:900,letterSpacing:1}}>SAVED</span>}
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
        }}><span style={{fontSize:12,fontWeight:900,letterSpacing:0.5,color:'#fff'}}>GK</span></div>
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
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,letterSpacing:'0.25em',textTransform:'uppercase',textAlign:'center',marginBottom:2}}>Step 2 of 2</p>
        <h2 style={{color:'#fff',fontSize:18,fontWeight:900,letterSpacing:'0.05em',textAlign:'center',margin:0}}>Pick your country</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,textAlign:'center',margin:0}}>48 nations · 2026 World Cup</p>
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
  const isValidEmail = v => /^[^\s@]+@dialaflight\.co\.uk$/i.test(v);
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [myCode, setMyCode]     = useState(null);
  const [pickCountry, setPickCountry] = useState(false);
  const [managing, setManaging]         = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const noTournament = !serverState?.bracket;
  const logoPos = { x: 0, y: -117 };

  const formPos = { x: 0, y: 74 };

  const ADMIN_EMAIL = 'thehub@dialaflight.co.uk';

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) { setErr('Enter your email'); return; }
    if (!isValidEmail(n)) { setErr('Must be a @dialaflight.co.uk email'); return; }

    // Admin email — bypass player slot entirely
    if (n.toLowerCase() === ADMIN_EMAIL) {
      if (noTournament) {
        if (!tournamentName.trim()) { setErr('Give the tournament a name'); return; }
        setBusy(true); setErr('');
        await api('/api/tournament/reset', {});
        const res = await api('/api/tournament/create', { name: ADMIN_EMAIL, tournamentName: tournamentName.trim() });
        setBusy(false);
        if (res.error) { setErr(res.error); return; }
        if (res.tournamentCode) localStorage.setItem('psc_tcode', res.tournamentCode);
        localStorage.setItem('psc_tname', tournamentName.trim());
        localStorage.removeItem('psc_code');
        onAdminView(res.tournamentCode, tournamentName.trim());
      } else {
        // Tournament exists — just go to admin view (no player slot)
        if (!tCode.trim()) { setErr('Enter the tournament code'); return; }
        const state = await api('/api/state');
        if (state.tournamentCode && tCode.trim().toUpperCase() !== state.tournamentCode.toUpperCase()) {
          setErr('Invalid tournament code'); return;
        }
        if (state.tournamentCode) localStorage.setItem('psc_tcode', state.tournamentCode);
        if (state.tournamentName) localStorage.setItem('psc_tname', state.tournamentName);
        localStorage.removeItem('psc_code');
        onAdminView(state.tournamentCode, state.tournamentName);
      }
      return;
    }

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
          <p style={{color:'#22c55e',fontSize:12,letterSpacing:'0.3em',textTransform:'uppercase',fontWeight:700,margin:0}}>Tournament Created</p>
          {localStorage.getItem('psc_tname') && (
            <p style={{color:'#fff',fontSize:18,fontWeight:800,margin:0,letterSpacing:'0.03em',textAlign:'center',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",textTransform:'uppercase'}}>{localStorage.getItem('psc_tname')}</p>
          )}
          <div style={{height:1,width:'100%',background:'rgba(255,255,255,0.07)',margin:'10px 0'}}/>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,margin:0,letterSpacing:'0.08em'}}>Share this code with your players</p>
          {/* Big code */}
          <div style={{
            fontSize:56,letterSpacing:'0.22em',color:'#22c55e',lineHeight:1,
            fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",textTransform:'uppercase',
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
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',margin:0}}>Admin access</p>
            <Input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} autoFocus/>
            <Input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') {
                if (adminEmail.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && adminPass === 'Mexico@#1000') {
                  sessionStorage.setItem('psc_admin','1'); setAdminUnlocked(true); setAdminPrompt(false); setMenuOpen(true); setAdminErr('');
                } else { setAdminErr('Invalid credentials'); }
              }}}/>
            {adminErr && <p style={{color:'#ff4444',fontSize:13,margin:0}}>{adminErr}</p>}
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
            {newTourneyErr && <p style={{color:'#ff4444',fontSize:13,margin:0}}>{newTourneyErr}</p>}
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
          <span key={i} style={{display:'block',width:24,height:2.5,background:'#22c55e',borderRadius:2,
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
          </div>
        </SheetContent>
      </Sheet>

      {/* Management panel */}
      {managing && (
        <div style={{position:'fixed',inset:0,zIndex:10002,background:'rgba(0,0,0,0.85)',overflowY:'auto'}} onClick={() => setManaging(false)}>
          <div style={{
            minHeight:'100%',maxWidth:480,margin:'0 auto',padding:'24px 16px 86px',
            display:'flex',flexDirection:'column',gap:12,
          }} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <h2 style={{color:'#fff',fontSize:16,fontWeight:900,margin:0,letterSpacing:'0.05em'}}>Manage Tournament</h2>
                {(serverState?.tournamentName || localStorage.getItem('psc_tname')) && (
                  <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,margin:'2px 0 0',letterSpacing:'0.05em'}}>{serverState?.tournamentName || localStorage.getItem('psc_tname')}</p>
                )}
              </div>
              <button onClick={() => setManaging(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
            </div>
            {localStorage.getItem('psc_tcode') && localStorage.getItem('psc_tcode') !== 'undefined' && (
              <div style={{background:'rgba(0,200,83,0.08)',border:'1px solid rgba(0,200,83,0.2)',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{color:'rgba(255,255,255,0.5)',fontSize:12,letterSpacing:'0.15em',textTransform:'uppercase'}}>Tournament Code</span>
                <span style={{color:'#22c55e',fontSize:20,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.25em'}}>{localStorage.getItem('psc_tcode')}</span>
              </div>
            )}
            {(() => {
              const allPlayers = (serverState.bracket.r32 || []).flatMap(m => [m.p1, m.p2]);
              const joined = allPlayers.filter(p => p.name).length;
              const total = allPlayers.length || 32;
              return (
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,overflow:'hidden'}}>
                  <div style={{background:'rgba(255,255,255,0.05)',padding:'6px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{color:'#fff',fontSize:13,fontWeight:800,letterSpacing:'0.15em'}}>PLAYERS</span>
                    <span style={{color:joined===total?'#22c55e':'rgba(255,255,255,0.3)',fontSize:12,fontWeight:700}}>{joined}/{total} joined</span>
                  </div>
                  {allPlayers.map(p => (
                    <div key={p.code} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:p.name?'#22c55e':'rgba(255,255,255,0.15)',flexShrink:0}}/>
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
              {err && <p style={{color:'#ff4444',fontSize:13,letterSpacing:'0.05em',textAlign:'left'}}>{err}</p>}
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
              <button onClick={() => { setStep(1); setErr(''); }} style={{background:'none',border:'none',color:'rgba(255,50,50,0.7)',fontSize:13,cursor:'pointer',textAlign:'left',padding:0,letterSpacing:'0.05em'}}>← {name}</button>
              <Input
                value={tCode}
                onChange={e => setTCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Tournament code"
                maxLength={4}
                autoFocus
                style={{letterSpacing:'0.25em',fontWeight:700,textTransform:'uppercase'}}
              />
              {err && <p style={{color:'#ff4444',fontSize:13,letterSpacing:'0.05em',textAlign:'left'}}>{err}</p>}
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={busy}>
                {busy ? '…' : 'Join Tournament'}
              </Button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setErr(''); }} style={{background:'none',border:'none',color:'rgba(255,50,50,0.7)',fontSize:13,cursor:'pointer',textAlign:'left',padding:0,letterSpacing:'0.05em'}}>← {name}</button>
              <Input
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Tournament name (e.g. DAF World Cup 2026)"
                autoFocus
              />
              {err && <p style={{color:'#ff4444',fontSize:13,letterSpacing:'0.05em',textAlign:'left'}}>{err}</p>}
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

function ZoneGrid({ selected, onSelect, color = '#22c55e', disabled }) {
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
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase'}}>{match.id.replace(/_/g,' ').toUpperCase()}</div>
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
          <div style={{color:'#fff',fontSize:18,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase'}}>Match Complete</div>
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
          <div style={{color:'#22c55e',fontSize:16,fontWeight:800}}>Shots & saves locked in</div>
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
        <div style={{background:'rgba(0,200,83,0.1)',border:'1px solid rgba(0,200,83,0.25)',borderRadius:6,padding:'8px 12px',fontSize:13,color:'#22c55e',fontWeight:700}}>
          {opp.name.split(' ')[0]} has already submitted — submit yours to resolve the match!
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:4}}>
        <div style={{color:'#22c55e',fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Shot</div>
        <div style={{color:'#ff6b35',fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Save</div>
      </div>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{display:'flex',flexDirection:'column',gap:6}}>
          <div style={{color:'rgba(255,255,255,0.25)',fontSize:12,letterSpacing:'0.1em'}}>ROUND {i+1}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <ZoneGrid selected={shots[i]} onSelect={z => setShots(s => { const n=[...s]; n[i]=z; return n; })} color='#22c55e'/>
            <ZoneGrid selected={saves[i]} onSelect={z => setSaves(s => { const n=[...s]; n[i]=z; return n; })} color='#ff6b35'/>
          </div>
        </div>
      ))}
      {err && <p style={{color:'#ff4444',fontSize:13,margin:0}}>{err}</p>}
      <button onClick={handleSubmit} disabled={busy || !allFilled} style={{
        marginTop:8,padding:'14px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
        background: allFilled ? 'linear-gradient(135deg,#22c55e,#00a651)' : 'rgba(255,255,255,0.06)',
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
                fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.06em',
                padding:'3px 10px',background:'rgba(0,0,0,0.5)',borderRadius:3,
                border:'1px solid rgba(0,200,83,0.12)',animation:'scorePopIn 0.35s ease',
              }}>{am.p1Score}</div>
              <div style={{color:'rgba(255,255,255,0.2)',fontSize:18,fontWeight:100,padding:'0 2px'}}>—</div>
              <div key={am.p2Score+100} style={{
                fontSize:44,color:'#fff',minWidth:52,textAlign:'center',lineHeight:1,
                fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.06em',
                padding:'3px 10px',background:'rgba(0,0,0,0.5)',borderRadius:3,
                border:'1px solid rgba(0,200,83,0.12)',animation:'scorePopIn 0.35s ease',
              }}>{am.p2Score}</div>
            </div>
            <div style={{ color:'rgba(255,255,255,0.28)', fontSize:12, letterSpacing:2, textTransform:'uppercase', marginTop:1 }}>
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
                  background: !pk ? 'rgba(255,255,255,0.08)' : pk.isGoal ? '#22c55e' : 'rgba(255,255,255,0.25)',
                  border:`1px solid ${!pk ? 'rgba(255,255,255,0.15)' : pk.isGoal ? '#22c55e' : 'rgba(255,255,255,0.4)'}`,
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
              fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",
              letterSpacing:4, textTransform:'uppercase',
              color: isGoal ? '#22c55e' : '#ff1744',
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
              fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif", textTransform:'uppercase', letterSpacing:4,
              color: am.winner === myCode ? '#22c55e' : '#ff6b35',
              textShadow: am.winner === myCode ? '0 0 50px rgba(0,200,83,0.6)' : 'none',
            }}>
              {am.winner === myCode ? 'You Win' : 'You Lose'}
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:18,marginTop:8}}>{am.p1Score} – {am.p2Score}</div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:13,marginTop:16,letterSpacing:2}}>
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
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:13,letterSpacing:2}}>
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
            <span style={{fontSize:12,fontWeight:900,letterSpacing:1,opacity:0.7}}>{iAmShooter ? 'ATK' : 'DEF'}</span>
            <span style={{
              color: iAmShooter ? '#00a651' : '#40c4ff',
              fontSize:12, fontWeight:800, letterSpacing:2.5, textTransform:'uppercase',
            }}>
              {me.name.split(' ')[0]} — {iAmShooter ? 'SHOOT' : 'SAVE'}
            </span>
            {am.phase === 'picking' && !iHaveSubmitted && (
              <span style={{
                marginLeft:4, minWidth:20, textAlign:'center',
                fontSize:13, fontWeight:900,
                color: timerUrgent ? '#ff1744' : 'rgba(255,255,255,0.6)',
                animation: timerUrgent ? 'timerUrgent 0.6s ease infinite' : 'none',
              }}>{timer}s</span>
            )}
            {am.isSuddenDeath && <span style={{color:'#22c55e',fontSize:12,fontWeight:800,letterSpacing:2,marginLeft:4}}>SD</span>}
          </div>
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,letterSpacing:2.5,textTransform:'uppercase',textAlign:'center',minHeight:14,textShadow:'0 1px 4px rgba(0,0,0,0.9)'}}>
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
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, letterSpacing:2, textTransform:'uppercase' }}>P1</div>
            <div style={{ color:'#fff', fontSize:12, fontWeight:700, marginTop:2 }}>{am.p1.name}</div>
          </div>
          <div style={{ textAlign:'center', padding:'0 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div key={am.p1Score} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{am.p1Score}</div>
              <div style={{color:'rgba(255,255,255,0.25)',fontSize:20,fontWeight:200}}>:</div>
              <div key={am.p2Score+100} style={{fontSize:36,fontWeight:900,color:'#fff',minWidth:36,textAlign:'center',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",lineHeight:1,animation:'scorePopIn 0.35s ease'}}>{am.p2Score}</div>
            </div>
            <div style={{color:'rgba(255,255,255,0.28)',fontSize:12,letterSpacing:2,textTransform:'uppercase',marginTop:1}}>
              {am.isSuddenDeath ? 'SUDDEN DEATH' : `Kick ${Math.min(am.currentKick, TOTAL_KICKS)}/${TOTAL_KICKS}`}
            </div>
          </div>
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12, letterSpacing:2, textTransform:'uppercase' }}>P2</div>
            <div style={{ color:'#ff6b35', fontSize:12, fontWeight:700, marginTop:2 }}>{am.p2.name}</div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:3, marginTop:8 }}>
          {Array.from({length: Math.ceil(TOTAL_KICKS / 2)}, (_, i) => {
            const pk = p1Kicks[i]; const ak = p2Kicks[i];
            return (
              <div key={i} style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'center' }}>
                <div style={{ width:10,height:10,borderRadius:'50%', background:!pk?'rgba(255,255,255,0.08)':pk.isGoal?'#22c55e':'rgba(255,255,255,0.25)', border:`1px solid ${!pk?'rgba(255,255,255,0.15)':pk.isGoal?'#22c55e':'rgba(255,255,255,0.4)'}`, transition:'all 0.3s' }}/>
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
              fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif", letterSpacing:1, textTransform:'uppercase',
              color: kr?.isGoal ? '#22c55e' : '#ff1744',
              textShadow: kr?.isGoal ? '0 0 60px rgba(0,200,83,0.95)' : '0 0 60px rgba(255,23,68,0.9)',
              animation:'stampIn 0.42s cubic-bezier(0.2,0,0.2,1) forwards',
            }}>{kr?.isGoal ? 'GOAL!' : 'SAVED!'}</div>
          </div>
        )}
        <div style={{position:'absolute',bottom:16,left:0,right:0,zIndex:15,display:'flex',justifyContent:'center'}}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, letterSpacing:3, textTransform:'uppercase',textShadow:'0 1px 4px rgba(0,0,0,0.9)' }}>
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

// Layout constants — must stay in sync with BracketTree's MH/MW/PX/PY locals
const BT_MH = 72, BT_MW = 160, BT_PX = 14, BT_PY = 28;

function BracketSlot({ p, won, played }) {
  return (
    <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'0 8px',
      opacity: played && !won ? 0.35 : 1}}>
      <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
        background:won?'#22c55e':'rgba(255,255,255,0.15)'}}/>

      {p?.name && <TeamLogo name={p.name} size={16}/>}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <span style={{fontSize:13,fontWeight:won?900:700,
          color:p?.name?'#fff':'rgba(255,255,255,0.22)',
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>
          {p?.name||'TBD'}
        </span>
        {p?.player && (
          <span style={{fontSize:12,color:'rgba(255,255,255,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',marginTop:2}}>
            {p.player}
          </span>
        )}
      </div>
      {won && <span style={{color:'#22c55e',fontSize:12,flexShrink:0}}>✓</span>}
    </div>
  );
}

function BracketCard({ m, x, top, myCode, onMatchClick }) {
  if (m._ph) return (
    <div style={{position:'absolute',left:x+BT_PX,top:top+BT_PY,width:BT_MW,height:BT_MH,
      background:'rgba(4,14,28,0.88)',border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:7,overflow:'hidden',boxSizing:'border-box',display:'flex',flexDirection:'column'}}>
      {[0,1].map(i => (
        <div key={i} style={{flex:1,display:'flex',alignItems:'center',gap:7,padding:'0 8px',
          ...(i===1?{borderTop:'1px solid rgba(255,255,255,0.06)'}:{})}}>
          <div style={{width:14,height:14,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}/>
          <span style={{color:'rgba(255,255,255,0.18)',fontSize:12,fontStyle:'italic'}}>TBD</span>
        </div>
      ))}
    </div>
  );

  const showPlay = !!m.watchUrl;
  const matchNum = m.id === 'final' ? null : +m.id.split('_').pop() + 1;
  const isMyMatch = myCode && (m.p1?.code === myCode || m.p2?.code === myCode);

  return (
    <>
      {matchNum !== null && (
        <div style={{
          position:'absolute',left:x+BT_PX,top:top+BT_PY-18,width:BT_MW,
          fontSize:12,fontWeight:700,letterSpacing:'0.12em',
          color:'#ff1744',fontFamily:"'DM Sans',system-ui,sans-serif",
          textTransform:'uppercase',
        }}>
          Match {matchNum}
        </div>
      )}
      <div
        onClick={isMyMatch && onMatchClick ? () => onMatchClick(m) : undefined}
        style={{
          position:'absolute',left:x+BT_PX,top:top+BT_PY,width:BT_MW,height:BT_MH,
          border:`1px solid ${isMyMatch?'rgba(0,200,83,0.4)':m.played?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.1)'}`,
          borderRadius:7,background:'rgba(4,14,28,0.92)',
          display:'flex',flexDirection:'row',overflow:'hidden',boxSizing:'border-box',
          boxShadow: isMyMatch ? '0 0 0 1px rgba(0,200,83,0.3), 0 2px 10px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.5)',
          cursor: isMyMatch && onMatchClick ? 'pointer' : 'default',
        }}>
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
          <BracketSlot p={m.p1} won={m.winner?.code===m.p1?.code} played={m.played}/>
          <div style={{height:1,background:'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {m.played && (
              <span style={{background:'rgba(4,14,28,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4,padding:'1px 5px',fontSize:12,fontWeight:800,color:'#fff',fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:1}}>{m.p1Score}-{m.p2Score}</span>
            )}
          </div>
          <BracketSlot p={m.p2} won={m.winner?.code===m.p2?.code} played={m.played}/>
        </div>
        {showPlay && (
          <a href={m.watchUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
            width:26,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            borderLeft:'1px solid rgba(0,200,83,0.3)',
            background:'rgba(0,200,83,0.12)',
            color:'#22c55e',fontSize:13,
            textDecoration:'none',cursor:'pointer',
          }}>▶</a>
        )}
      </div>
    </>
  );
}

function BracketTree({ bracket, myCode, onMatchClick }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // 9 columns: R32(0), R16(1), QF(2), SF(3), Final(4), SF(5), QF(6), R16(7), R32(8)
  const MH   = BT_MH;
  const MW   = BT_MW;
  const GAP  = 10;
  const STEP = 96;
  const PX   = BT_PX;
  const PY   = BT_PY;

  const colX = c => c * (MW + GAP);
  const NATURAL_W = colX(8) + MW + PX * 2;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setScale(w > 0 ? w / NATURAL_W : 1);
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

  const LABELS = ['R32','R16','QF','SF','Final','SF','QF','R16','R32'];

  return (
    <div ref={containerRef} style={{width:'100%',overflow:'hidden',height:naturalH*scale}}>
      <div style={{position:'relative',width:NATURAL_W,height:naturalH,transform:`scale(${scale})`,transformOrigin:'top left'}}>
        {LABELS.map((label, col) => (
          <div key={col} style={{position:'absolute',left:colX(col)+PX,top:4,width:MW,
            textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:12,
            letterSpacing:2,textTransform:'uppercase',fontWeight:700}}>{label}</div>
        ))}
        <svg style={{position:'absolute',left:PX,top:PY,pointerEvents:'none',overflow:'visible'}} width={TOTAL_W} height={TOTAL_H}>
          {lines}
        </svg>
        {r32.slice(0,8).map((m,i)  => <BracketCard key={m.id} m={m} x={colX(0)} top={r32Top(i)} myCode={myCode} onMatchClick={onMatchClick}/>)}
        {r16.slice(0,4).map((m,i)  => <BracketCard key={m.id} m={m} x={colX(1)} top={r16Top(i)} myCode={myCode} onMatchClick={onMatchClick}/>)}
        {qf.slice(0,2).map((m,i)   => <BracketCard key={m.id} m={m} x={colX(2)} top={qfTop(i)} myCode={myCode} onMatchClick={onMatchClick}/>)}
        <BracketCard m={sf[0]} x={colX(3)} top={sfTop} myCode={myCode} onMatchClick={onMatchClick}/>
        {/* Trophy above final */}
        <div style={{position:'absolute',left:colX(4)+PX+MW/2,top:fTop+PY-128,transform:'translateX(-50%)',pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <img src="/wc-trophy.png" alt="World Cup Trophy" draggable={false} style={{height:120,width:'auto',objectFit:'contain',filter:'drop-shadow(0 0 10px rgba(245,166,35,0.5))'}}/>
        </div>
        <BracketCard m={fin}   x={colX(4)} top={fTop} myCode={myCode} onMatchClick={onMatchClick}/>
        <BracketCard m={sf[1]} x={colX(5)} top={sfTop} myCode={myCode} onMatchClick={onMatchClick}/>
        {qf.slice(2,4).map((m,i)   => <BracketCard key={m.id} m={m} x={colX(6)} top={qfTop(i)} myCode={myCode} onMatchClick={onMatchClick}/>)}
        {r16.slice(4,8).map((m,i)  => <BracketCard key={m.id} m={m} x={colX(7)} top={r16Top(i)} myCode={myCode} onMatchClick={onMatchClick}/>)}
        {r32.slice(8,16).map((m,i) => <BracketCard key={m.id} m={m} x={colX(8)} top={r32Top(i)} myCode={myCode} onMatchClick={onMatchClick}/>)}
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
            <div style={{fontSize:52,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",textTransform:'uppercase',letterSpacing:2,color:result.won?'#22c55e':'#ff6b35',textShadow:result.won?'0 0 40px rgba(0,200,83,0.5)':'none'}}>
              {result.won ? 'You Win' : 'You Lose'}
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:22,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",marginTop:4,letterSpacing:4}}>
              {result.p1Score} – {result.p2Score}
            </div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',marginTop:4}}>{roundLabel}</div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {result.kicks.map(k => (
              <div key={k.round} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:'10px 12px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{color:k.p1Goal?'#22c55e':'rgba(255,255,255,0.3)',fontSize:13,fontWeight:700}}>{k.p1Goal ? 'GOAL' : 'SAVED'}</span>
                    <span style={{color:'rgba(255,255,255,0.25)',fontSize:12}}>{ZONE_ICONS[k.playerShot]}→{ZONE_ICONS[k.cpuSave]}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{color:k.p2Goal?'#ff1744':'rgba(255,255,255,0.3)',fontSize:13,fontWeight:700}}>{k.p2Goal ? 'CPU GOAL' : 'YOU SAVED'}</span>
                    <span style={{color:'rgba(255,255,255,0.25)',fontSize:12}}>{ZONE_ICONS[k.cpuShot]}→{ZONE_ICONS[k.playerSave]}</span>
                  </div>
                </div>
                <div style={{color:'rgba(255,255,255,0.2)',fontSize:12,letterSpacing:'0.1em',textAlign:'center'}}>R{k.round}</div>
                <div/>
              </div>
            ))}
          </div>

          <button onClick={() => onDone(result.won)} style={{
            marginTop:8,padding:'14px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
            background:result.won?'linear-gradient(135deg,#22c55e,#00a651)':'rgba(255,255,255,0.08)',
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
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase'}}>{roundLabel} · vs CPU</div>
            <div style={{color:'#fff',fontSize:15,fontWeight:800,marginTop:2}}>{playerName}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:4}}>
          <div style={{color:'#22c55e',fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Shot</div>
          <div style={{color:'#ff6b35',fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',textAlign:'center'}}>Save</div>
        </div>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{color:'rgba(255,255,255,0.25)',fontSize:12,letterSpacing:'0.1em'}}>ROUND {i+1}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <ZoneGrid selected={shots[i]} onSelect={z => setShots(s => { const n=[...s]; n[i]=z; return n; })} color='#22c55e'/>
              <ZoneGrid selected={saves[i]} onSelect={z => setSaves(s => { const n=[...s]; n[i]=z; return n; })} color='#ff6b35'/>
            </div>
          </div>
        ))}
        <button onClick={handleSubmit} disabled={!allFilled} style={{
          marginTop:8,padding:'14px',borderRadius:8,fontSize:14,fontWeight:800,letterSpacing:'0.05em',
          background: allFilled ? 'linear-gradient(135deg,#22c55e,#00a651)' : 'rgba(255,255,255,0.06)',
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
          <div className="text-5xl font-black uppercase tracking-widest" style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",color:'#22c55e',textShadow:'0 0 60px rgba(0,200,83,0.6)',animation:'scaleIn 0.5s ease'}}>CHAMPION!</div>
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
          <div className="text-4xl font-black uppercase tracking-widest" style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",color:'#ff6b35'}}>ELIMINATED</div>
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
          <div className="text-[12px] tracking-[0.25em] uppercase font-bold text-green-400">Solo vs CPU</div>
          <div className="text-muted-foreground text-[12px] mt-0.5">DAF World Cup 2026</div>
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
                  border:`1.5px solid ${res==='win'?'#22c55e':res==='loss'?'#ff1744':isNext?'rgba(0,200,83,0.45)':'rgba(255,255,255,0.1)'}`,
                  color: res==='win'?'#22c55e':res==='loss'?'#ff1744':isNext?'#22c55e':'rgba(255,255,255,0.4)',
                }}>
                  {res === 'win' ? '✓' : res === 'loss' ? '✗' : isNext ? '▶' : `${i+1}`}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{color:isNext?'#22c55e':res==='win'?'#22c55e':res==='loss'?'#ff4444':'rgba(255,255,255,0.5)'}}>{label}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
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
          <div key={group.id} style={{background:'rgba(4,16,32,0.92)',border:`1px solid ${done?'rgba(0,200,83,0.35)':'rgba(255,255,255,0.12)'}`,borderRadius:10,overflow:'hidden'}}>

            {/* Header */}
            <div style={{background:done?'rgba(0,200,83,0.13)':'rgba(255,255,255,0.05)',borderBottom:`1px solid ${done?'rgba(0,200,83,0.25)':'rgba(255,255,255,0.08)'}`,padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#22c55e',fontSize:12,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase'}}>Group {group.label}</span>
              {done
                ? <span style={{color:'#22c55e',fontSize:12,fontWeight:700,letterSpacing:'0.1em'}}>COMPLETE</span>
                : <span style={{color:'rgba(255,255,255,0.3)',fontSize:12}}>{played}/6 played</span>
              }
            </div>

            {/* Standings */}
            <div style={{padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'2px 12px 4px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:12,width:14,flexShrink:0}}>#</span>
                <span style={{flex:1,color:'rgba(255,255,255,0.2)',fontSize:12}}>PLAYER</span>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:12,width:24,textAlign:'right'}}>GD</span>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:12,width:22,textAlign:'right'}}>GF</span>
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:12,width:24,textAlign:'right'}}>PTS</span>
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
                  if (isFirst)                 { badge = <span style={{color:'#22c55e',fontSize:12,fontWeight:800}}>Q1</span>; bg='rgba(0,200,83,0.09)'; }
                  else if (isSecond)           { badge = <span style={{color:'#4fc3f7',fontSize:12,fontWeight:800}}>Q2</span>; bg='rgba(56,142,255,0.07)'; }
                  else if (wcQual)             { badge = <span style={{color:'#ffc107',fontSize:12,fontWeight:800}}>WC</span>; bg='rgba(255,193,7,0.07)'; }
                  else if (wcOut || (!isThird && done)) { badge = <span style={{color:'rgba(255,68,68,0.6)',fontSize:12}}>✕</span>; }
                  else if (isThird && !done)   { badge = <span style={{color:'rgba(255,193,7,0.5)',fontSize:12}}>WC?</span>; }
                  return (
                    <div key={p.code} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:bg}}>
                      <span style={{color:'rgba(255,255,255,0.3)',fontSize:12,width:14,flexShrink:0}}>{i+1}</span>
                      <span style={{flex:1,fontSize:13,color:p.name?'#fff':'rgba(255,255,255,0.25)',fontWeight:p.name?600:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name||'—'}</span>
                      <span style={{color:'rgba(255,255,255,0.45)',fontSize:12,width:24,textAlign:'right'}}>{(p.gd||0)>0?'+':''}{p.gd||0}</span>
                      <span style={{color:'rgba(255,255,255,0.45)',fontSize:12,width:22,textAlign:'right'}}>{p.gf||0}</span>
                      <span style={{color:isFirst?'#22c55e':isSecond?'#4fc3f7':'rgba(255,255,255,0.6)',fontSize:13,fontWeight:800,width:24,textAlign:'right'}}>{p.points||0}</span>
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
                    <span style={{flex:1,fontSize:12,fontWeight:600,color:m.played&&m.winner?.code!==m.p1?.code?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'?'}</span>
                    <span style={{color:m.played?'#fff':'rgba(255,255,255,0.3)',fontSize:12,fontWeight:700,flexShrink:0,minWidth:26,textAlign:'center'}}>
                      {m.played?`${m.p1Score}-${m.p2Score}`:'vs'}
                    </span>
                    <span style={{flex:1,fontSize:12,fontWeight:600,color:m.played&&m.winner?.code!==m.p2?.code?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{m.p2?.name||'?'}</span>
                    {canPlay  && <span style={{color:'#22c55e',fontSize:12,flexShrink:0}}>▶</span>}
                    {waiting  && <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff6b35" style={{flexShrink:0}}><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm.5 5v6l4.2 2.5-.8 1.3-5-3V7h1.6z"/></svg>}
                    {m.played&&(isMine||isAdmin)&&<svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)" style={{flexShrink:0}}><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>}
                  </div>
                );
              })}
            </div>

          </div>
          );
        })}
      </div>
      <div style={{textAlign:'center',padding:'14px 0 4px',color:'rgba(255,255,255,0.18)',fontSize:12,letterSpacing:'0.15em'}}>
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

  if (done) return <span style={{ color: '#22c55e', fontSize: 11 }}>✓ Added</span>;

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
          background: '#0d2444', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.8)', fontSize: 11,
          fontFamily: "'DM Sans',system-ui,sans-serif", outline: 'none',
        }}
      />
      {err && <span style={{ color: '#ff4444', fontSize: 10 }}>{err}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SLOT INPUT — admin assigns a player name to a team slot
// ═══════════════════════════════════════════════════════════════

function AdminSlotInput({ slotCode, teamName, initialPlayer }) {
  const [val, setVal] = useState(initialPlayer || '');
  const [saved, setSaved] = useState(false);
  const skipBlur = useRef(false);

  const save = async (v) => {
    await api('/api/tournament/assign-player', { slotCode, playerName: v });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 10px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
      <TeamLogo name={teamName} size={14}/>
      <span style={{flex:1,fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{teamName}</span>
      <input
        value={val}
        placeholder="Player name…"
        onChange={e => { setVal(e.target.value); setSaved(false); }}
        onBlur={() => { if (!skipBlur.current) save(val.trim()); }}
        onKeyDown={e => { if (e.key === 'Enter') { save(val.trim()); e.target.blur(); } }}
        style={{
          width:100,padding:'3px 7px',borderRadius:4,fontSize:11,
          background:'#0d2444',border:'1px solid rgba(255,255,255,0.12)',
          color:'rgba(255,255,255,0.85)',fontFamily:"'DM Sans',system-ui,sans-serif",
          outline:'none',
        }}
      />
      {val && (
        <button
          onMouseDown={() => { skipBlur.current = true; }}
          onClick={() => { skipBlur.current = false; setVal(''); setSaved(false); save(''); }}
          style={{all:'unset',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:14,lineHeight:1,flexShrink:0,padding:'0 2px'}}
          title="Clear name"
        >×</button>
      )}
      {saved && <span style={{color:'#22c55e',fontSize:10,flexShrink:0}}>✓</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN MATCH INPUT — assigns two players to a match randomly
// ═══════════════════════════════════════════════════════════════

function AdminMatchInput({ match, matchIndex }) {
  const [n1, setN1] = useState(match.p1?.player || '');
  const [n2, setN2] = useState(match.p2?.player || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep inputs in sync with server state so × appears even when player self-assigned
  useEffect(() => {
    if (!busy) {
      setN1(match.p1?.player || '');
      setN2(match.p2?.player || '');
    }
  }, [match.p1?.player, match.p2?.player]);

  const inputStyle = {
    flex:1,padding:'4px 7px',borderRadius:4,fontSize:11,minWidth:0,
    background:'#0d2444',border:'1px solid rgba(255,255,255,0.12)',
    color:'rgba(255,255,255,0.85)',fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none',
  };

  const assign = async () => {
    if (busy) return;
    setBusy(true);
    const [a, b] = Math.random() < 0.5 ? [n1.trim(), n2.trim()] : [n2.trim(), n1.trim()];
    await Promise.all([
      api('/api/tournament/assign-player', { slotCode: match.p1.code, playerName: a }),
      api('/api/tournament/assign-player', { slotCode: match.p2.code, playerName: b }),
    ]);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const clear = async () => {
    setN1(''); setN2(''); setSaved(false);
    await Promise.all([
      api('/api/tournament/assign-player', { slotCode: match.p1.code, playerName: '' }),
      api('/api/tournament/assign-player', { slotCode: match.p2.code, playerName: '' }),
    ]);
  };

  const isAssigned = match.p1?.player || match.p2?.player;

  return (
    <div style={{padding:'8px 10px',borderTop: matchIndex > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
        <span style={{fontSize:10,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)'}}>
          Match {matchIndex + 1}
        </span>
        {isAssigned && <span style={{color:'#22c55e',fontSize:10}}>✓ assigned</span>}
      </div>
      {isAssigned && (
        <div style={{display:'flex',gap:4,marginBottom:6}}>
          {[match.p1, match.p2].map(s => s && (
            <div key={s.code} style={{flex:1,display:'flex',alignItems:'center',gap:4,padding:'3px 6px',background:'rgba(0,200,83,0.06)',border:'1px solid rgba(0,200,83,0.15)',borderRadius:4}}>
              <TeamLogo name={s.name} size={11}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.player || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',gap:4}}>
        <input value={n1} onChange={e => setN1(e.target.value)} placeholder="Player 1" onKeyDown={e => e.key === 'Enter' && assign()} style={inputStyle}/>
        <input value={n2} onChange={e => setN2(e.target.value)} placeholder="Player 2" onKeyDown={e => e.key === 'Enter' && assign()} style={inputStyle}/>
        {(n1 || n2) && !busy && (
          <button onClick={clear} style={{all:'unset',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:14,lineHeight:1,padding:'0 3px'}} title="Clear">×</button>
        )}
        <button
          onClick={assign}
          disabled={busy || (!n1.trim() && !n2.trim())}
          style={{padding:'4px 8px',borderRadius:4,fontSize:12,fontWeight:800,cursor:'pointer',
            background: saved ? 'rgba(0,200,83,0.18)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${saved ? 'rgba(0,200,83,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: saved ? '#22c55e' : 'rgba(255,255,255,0.5)',
            flexShrink:0,fontFamily:"'DM Sans',system-ui,sans-serif"}}
          title="Randomly assign players to teams"
        >{busy ? '…' : saved ? '✓' : '↺'}</button>
      </div>
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
          background: '#0d2444', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.75)', fontSize: 11,
          fontFamily: "'DM Sans',system-ui,sans-serif", outline: 'none',
        }}
      />
      {saved && <span style={{ color: '#22c55e', fontSize: 11, flexShrink: 0 }}>✓</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH PICKER — enter name, pick a match, get randomly assigned
// ═══════════════════════════════════════════════════════════════

function MatchPicker({ bracket, onPicked, onBack }) {
  const [name, setName] = useState(localStorage.getItem('psc_name') || '');
  const [nameConfirmed, setNameConfirmed] = useState(!!localStorage.getItem('psc_name'));
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const confirmName = () => {
    const n = nameInput.trim();
    if (!n) { setErr('Enter your broker name'); return; }
    localStorage.setItem('psc_name', n);
    setName(n);
    setNameConfirmed(true);
    setErr('');
  };

  if (!nameConfirmed) return (
    <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{textAlign:'center'}}>
          <p style={{color:'#ff1744',fontSize:12,letterSpacing:'0.25em',textTransform:'uppercase',fontWeight:700,margin:0}}>DAF World Cup 2026</p>
          <p style={{color:'#fff',fontSize:22,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',margin:'4px 0 0'}}>Who Are You?</p>
        </div>
        <Input autoFocus placeholder="Your broker name" value={nameInput}
          onChange={e => { setNameInput(e.target.value); setErr(''); }}
          onKeyDown={e => e.key === 'Enter' && confirmName()}/>
        {err && <p style={{color:'#ff4444',fontSize:13,margin:0,textAlign:'center'}}>{err}</p>}
        <Button onClick={confirmName}>Continue →</Button>
        {onBack && <Button variant="ghost" style={{color:'rgba(255,255,255,0.5)',fontSize:13}} onClick={onBack}>← Back</Button>}
      </div>
    </div>
  );

  const stage = bracket.stage;
  const stageLabel = {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',sf:'Semi-Finals',final:'Final'}[stage] || stage;
  const matches = stage === 'final' ? (bracket.final ? [bracket.final] : []) : (bracket[stage] || []);
  const available = matches.filter(m => m.p1?.name && m.p2?.name && (!m.p1?.player || !m.p2?.player));

  const pick = async (matchId) => {
    if (busy) return;
    setBusy(true); setErr('');
    const res = await api('/api/tournament/claim-match', { matchId, playerName: name });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    localStorage.setItem('psc_code', res.code);
    localStorage.setItem('psc_name', name);
    onPicked(res.code);
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px 16px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:360,display:'flex',flexDirection:'column',gap:12}}>
        <div style={{textAlign:'center'}}>
          <p style={{color:'#ff1744',fontSize:12,letterSpacing:'0.25em',textTransform:'uppercase',fontWeight:700,margin:0}}>{stageLabel}</p>
          <p style={{color:'#fff',fontSize:20,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',margin:'4px 0 0'}}>Pick a Match</p>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:13,margin:'4px 0 0'}}>{name} · your team will be randomly assigned</p>
        </div>
        {available.length === 0 && (
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,textAlign:'center',margin:'8px 0'}}>All matches are full for this round.</p>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'60vh',overflowY:'auto'}}>
          {matches.map((m, i) => {
            const full = !!m.p1?.player && !!m.p2?.player;
            return (
              <button key={m.id} disabled={full || busy} onClick={() => pick(m.id)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
                background: full ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${full ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'}`,
                borderRadius:8,cursor:full?'default':'pointer',
                opacity:full?0.4:1,fontFamily:"'DM Sans',system-ui,sans-serif",
                transition:'all 0.12s',textAlign:'left',
              }}
              onMouseEnter={e => { if (!full) e.currentTarget.style.background='rgba(0,200,83,0.12)'; }}
              onMouseLeave={e => { if (!full) e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
              >
                <span style={{fontSize:11,fontWeight:800,letterSpacing:'0.15em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',flexShrink:0}}>M{i+1}</span>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:4,flex:1,minWidth:0}}>
                    <TeamLogo name={m.p1?.name} size={16}/>
                    <span style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</span>
                  </div>
                  <span style={{color:'rgba(255,255,255,0.25)',fontSize:11,flexShrink:0}}>vs</span>
                  <div style={{display:'flex',alignItems:'center',gap:4,flex:1,minWidth:0,justifyContent:'flex-end'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2?.name||'TBD'}</span>
                    <TeamLogo name={m.p2?.name} size={16}/>
                  </div>
                </div>
                {full
                  ? <span style={{color:'rgba(255,255,255,0.25)',fontSize:11,flexShrink:0}}>Full</span>
                  : <span style={{color:'rgba(255,255,255,0.3)',fontSize:13,flexShrink:0}}>→</span>
                }
              </button>
            );
          })}
        </div>
        {err && <p style={{color:'#ff4444',fontSize:13,textAlign:'center',margin:0}}>{err}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// SWEEPSTAKE COMPONENTS
// ═══════════════════════════════════════════════════════════════

function TeamProgressEditor({ team, td, color, onSave }) {
  const [groupPts, setGroupPts]       = useState(td?.groupPts ?? 0);
  const [groupPlayed, setGroupPlayed] = useState(td?.groupPlayed ?? 0);
  const [groupGF, setGroupGF]         = useState(td?.groupGF ?? 0);
  const [groupGA, setGroupGA]         = useState(td?.groupGA ?? 0);
  const [reached, setReached]         = useState(td?.reached ?? '');
  const [topScorer, setTopScorer]     = useState(td?.topScorer ?? false);
  const [cleanSheets, setCleanSheets]   = useState(td?.cleanSheets ?? 0);
  const [wins, setWins]                 = useState(td?.wins ?? 0);
  const [draws, setDraws]               = useState(td?.draws ?? 0);
  const [groupWinner, setGroupWinner]   = useState(td?.groupWinner ?? false);
  const [upsets, setUpsets]             = useState(td?.upsets ?? 0);
  const [firstGoals, setFirstGoals]     = useState(td?.firstGoals ?? 0);

  const numInput = (label, val, set, key, w=52) => (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <span style={{color:'rgba(255,255,255,0.4)',fontSize:13,flexShrink:0}}>{label}</span>
      <input type="number" min={0} value={val}
        onChange={e => set(parseInt(e.target.value)||0)}
        onBlur={() => onSave({ [key]: parseInt(val)||0 })}
        style={{width:w,padding:'5px 8px',borderRadius:5,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:13,fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}/>
    </div>
  );

  return (
    <div style={{padding:'8px 10px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:8}}>
      {/* Group stage stats */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{color:'rgba(255,255,255,0.25)',fontSize:12,letterSpacing:'0.1em',textTransform:'uppercase',width:'100%'}}>Group stage</span>
        {numInput('P', groupPlayed, setGroupPlayed, 'groupPlayed')}
        {numInput('GF', groupGF, setGroupGF, 'groupGF')}
        {numInput('GA', groupGA, setGroupGA, 'groupGA')}
        {numInput('Pts', groupPts, setGroupPts, 'groupPts')}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-xs text-muted-foreground shrink-0">Reached</Label>
        <Select value={reached || 'none'} onValueChange={v => { const val = v === 'none' ? '' : v; setReached(val); onSave({ reached: val || null }); }}>
          <SelectTrigger className="flex-1 min-w-[140px] h-8 text-xs">
            <SelectValue placeholder="Group stage only" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Group stage only</SelectItem>
            {SW_ROUNDS.map(r => <SelectItem key={r} value={r}>{SW_ROUND_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={!!topScorer} onCheckedChange={v => { setTopScorer(!!v); onSave({ topScorer: !!v }); }} />
          <span className="text-xs text-muted-foreground">Top scorer +15</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={!!groupWinner} onCheckedChange={v => { setGroupWinner(!!v); onSave({ groupWinner: !!v }); }} />
          <span className="text-xs text-muted-foreground">Group winner +10</span>
        </label>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Wins</Label>
          <Input type="number" min={0} value={wins} onChange={e => setWins(parseInt(e.target.value)||0)} onBlur={() => onSave({ wins })} className="w-14 h-9 text-sm px-2"/>
          <span className="text-xs text-muted-foreground">×3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Draws</Label>
          <Input type="number" min={0} value={draws} onChange={e => setDraws(parseInt(e.target.value)||0)} onBlur={() => onSave({ draws })} className="w-14 h-9 text-sm px-2"/>
          <span className="text-xs text-muted-foreground">×1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Clean sheets</Label>
          <Input type="number" min={0} value={cleanSheets} onChange={e => setCleanSheets(parseInt(e.target.value)||0)} onBlur={() => onSave({ cleanSheets })} className="w-14 h-9 text-sm px-2"/>
          <span className="text-xs text-muted-foreground">×5</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Upsets</Label>
          <Input type="number" min={0} value={upsets} onChange={e => setUpsets(parseInt(e.target.value)||0)} onBlur={() => onSave({ upsets })} className="w-14 h-9 text-sm px-2"/>
          <span className="text-xs text-muted-foreground">×6</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">1st goals</Label>
          <Input type="number" min={0} value={firstGoals} onChange={e => setFirstGoals(parseInt(e.target.value)||0)} onBlur={() => onSave({ firstGoals })} className="w-14 h-9 text-sm px-2"/>
          <span className="text-xs text-muted-foreground">×2</span>
        </div>
      </div>
    </div>
  );
}

const TIER3_PLUS_TEAMS = SWEEPSTAKE_TIERS.filter(t => t.tier >= 3).flatMap(t => t.teams);

function SweepstakeAdminPanel({ sweepstakes, onClose, onRefresh }) {
  const [selectedId, setSelectedId] = useState(() => sweepstakes?.[0]?.id || null);
  const [newName, setNewName]       = useState('');
  const [newSwName, setNewSwName]   = useState('');
  const [showNewSw, setShowNewSw]   = useState(false);
  const [busy, setBusy]             = useState(false);
  const [editingP, setEditingP]     = useState(null);
  const [editTeams, setEditTeams]   = useState([]);
  const [spinning, setSpinning]     = useState(false);
  const [wheelDisplay, setWheelDisplay] = useState(null);
  const [wheelResult, setWheelResult]   = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [syncMsg, setSyncMsg]       = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingParticipant, setRenamingParticipant] = useState(null);
  const [renameParticipantValue, setRenameParticipantValue] = useState('');

  const sweepstake = sweepstakes?.find(s => s.id === selectedId) || sweepstakes?.[0] || null;
  const sweepstakeId = sweepstake?.id || null;
  const { participants = [], teamData = {} } = sweepstake || {};

  const createSweepstake = async () => {
    const n = newSwName.trim();
    if (!n || busy) return;
    setBusy(true);
    const res = await api('/api/sweepstake/create', { name: n });
    if (res.id) setSelectedId(res.id);
    setNewSwName(''); setShowNewSw(false);
    await onRefresh?.(); setBusy(false);
  };

  const renameSweepstake = async () => {
    const n = renameValue.trim();
    if (!n || !renamingId || busy) return;
    setBusy(true);
    await api('/api/sweepstake/rename', { sweepstakeId: renamingId, name: n });
    setRenamingId(null);
    await onRefresh?.(); setBusy(false);
  };

  const deleteSweepstake = async () => {
    if (!sweepstakeId || busy) return;
    if (!confirm(`Delete "${sweepstake?.name}"? This cannot be undone.`)) return;
    setBusy(true);
    await api('/api/sweepstake/delete-sweepstake', { sweepstakeId });
    const remaining = sweepstakes?.filter(s => s.id !== sweepstakeId);
    setSelectedId(remaining?.[0]?.id || null);
    await onRefresh?.(); setBusy(false);
  };

  const addParticipant = async () => {
    const n = newName.trim();
    if (!n || busy || !sweepstakeId) return;
    setBusy(true);
    await api('/api/sweepstake/assign', { sweepstakeId, participantName: n, teams: [] });
    setNewName('');
    await onRefresh?.(); setBusy(false);
  };

  const removeParticipant = async name => {
    if (!sweepstakeId) return;
    setBusy(true);
    await api('/api/sweepstake/remove-participant', { sweepstakeId, participantName: name });
    await onRefresh?.(); setBusy(false);
  };

  const renameParticipant = async () => {
    const n = renameParticipantValue.trim();
    if (!n || !renamingParticipant || !sweepstakeId || busy) return;
    setBusy(true);
    await api('/api/sweepstake/rename-participant', { sweepstakeId, oldName: renamingParticipant, newName: n });
    if (editingP === renamingParticipant) setEditingP(n);
    setRenamingParticipant(null);
    await onRefresh?.();
    setBusy(false);
  };

  const saveParticipantTeams = async () => {
    if (!editingP || !sweepstakeId) return;
    setBusy(true);
    await api('/api/sweepstake/assign', { sweepstakeId, participantName: editingP, teams: editTeams });
    setEditingP(null);
    await onRefresh?.(); setBusy(false);
  };

  const toggleTeam = team => setEditTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]);

  const spinWheel = (available) => {
    if (spinning || available.length === 0) return;
    setSpinning(true);
    setWheelResult(null);
    const result = available[Math.floor(Math.random() * available.length)];
    let frame = 0;
    const totalFrames = 28;
    const tick = () => {
      frame++;
      if (frame < totalFrames) {
        setWheelDisplay(available[Math.floor(Math.random() * available.length)]);
        setTimeout(tick, 60 + (frame / totalFrames) * 220);
      } else {
        setWheelDisplay(result);
        setWheelResult(result);
        setSpinning(false);
      }
    };
    tick();
  };

  const saveTeamData = async (team, updates) => {
    if (!sweepstakeId) return;
    await api('/api/sweepstake/update-team', { sweepstakeId, team, ...updates });
  };

  const assignedByOther = name => participants.filter(p => p.name !== name).flatMap(p => p.teams || []);

  return (
    <div className="fixed inset-0 z-[10002] overflow-y-auto" style={{background:'rgba(0,0,0,0.88)'}} onClick={onClose}>
      <div className="min-h-full max-w-lg mx-auto p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black tracking-wide">Sweepstake</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={syncing} className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary" onClick={async () => {
              setSyncing(true); setSyncMsg('');
              try {
                const r = await api('/api/sync-standings');
                setSyncMsg(r.ok ? `Synced — ${r.groupsUpdated} teams, ${r.knockoutUpdated} knockout` : (r.error || 'Error'));
              } catch { setSyncMsg('Failed'); }
              setSyncing(false);
            }}>{syncing ? 'Syncing…' : 'Sync Live Data'}</Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground px-2">✕</Button>
          </div>
        </div>
        {syncMsg && <p className="text-xs text-muted-foreground text-right">{syncMsg}</p>}

        {/* Sweepstake selector */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-1.5 overflow-x-auto">
            {(sweepstakes||[]).map(s => {
              const active = s.id === sweepstakeId;
              if (renamingId === s.id) {
                return (
                  <div key={s.id} className="flex gap-1 shrink-0">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameSweepstake(); if (e.key === 'Escape') setRenamingId(null); }}
                      className="h-8 text-sm w-36"
                    />
                    <Button size="sm" onClick={renameSweepstake} disabled={busy||!renameValue.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)} className="px-2">✕</Button>
                  </div>
                );
              }
              return (
                <div key={s.id} className="flex items-center shrink-0 gap-0.5">
                  <Button size="sm" variant={active ? 'default' : 'outline'} onClick={() => setSelectedId(s.id)} className="text-xs rounded-r-none">
                    {s.name}
                  </Button>
                  <Button size="sm" variant={active ? 'default' : 'outline'} onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }} className="px-1.5 text-xs rounded-l-none border-l-0 opacity-60 hover:opacity-100">✎</Button>
                </div>
              );
            })}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewSw(v => !v)} className="shrink-0">+ New</Button>
        </div>

        {/* New sweepstake form */}
        {showNewSw && (
          <div className="flex gap-2">
            <Input autoFocus placeholder="Pool name (e.g. Office, Family)" value={newSwName} onChange={e => setNewSwName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createSweepstake()} className="flex-1 text-sm"/>
            <Button onClick={createSweepstake} disabled={busy||!newSwName.trim()}>Create</Button>
          </div>
        )}

        {/* Current pool info */}
        {sweepstake && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {participants.length} participants · {new Set(participants.flatMap(p => p.teams||[])).size}/48 teams assigned
            </p>
            {sweepstakes?.length > 0 && (
              <Button variant="ghost" size="sm" onClick={deleteSweepstake} className="text-destructive hover:text-destructive text-xs h-auto py-1">Delete pool</Button>
            )}
          </div>
        )}

        {/* ── Participants ── */}
        <div className="flex gap-2">
          <Input placeholder="Participant name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addParticipant()} className="flex-1"/>
          <Button onClick={addParticipant} disabled={busy||!newName.trim()}>Add</Button>
        </div>

        {participants.map(p => {
          const isEditing = editingP === p.name;
          return (
            <div key={p.name} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${isEditing?'rgba(0,200,83,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:10,overflow:'hidden',transition:'border-color 0.15s'}}>
              {/* Header row */}
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px'}}>
                {renamingParticipant === p.name ? (
                  <>
                    <input
                      autoFocus
                      value={renameParticipantValue}
                      onChange={e => setRenameParticipantValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameParticipant(); if (e.key === 'Escape') setRenamingParticipant(null); }}
                      style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:5,color:'#fff',fontSize:13,fontWeight:700,padding:'3px 8px',fontFamily:"'DM Sans',system-ui,sans-serif",outline:'none'}}
                    />
                    <button onClick={renameParticipant} disabled={busy || !renameParticipantValue.trim()}
                      style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',fontSize:12,fontWeight:700,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0}}>Save</button>
                    <button onClick={() => setRenamingParticipant(null)}
                      style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.4)',fontSize:14,fontWeight:700,padding:'3px 6px',borderRadius:5,cursor:'pointer',flexShrink:0}}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{color:'#fff',fontSize:13,fontWeight:700,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                    <button onClick={() => { setRenamingParticipant(p.name); setRenameParticipantValue(p.name); }}
                      style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.35)',fontSize:13,padding:'2px 4px',borderRadius:4,cursor:'pointer',flexShrink:0,lineHeight:1}} title="Rename">✎</button>
                    <span style={{color:'rgba(255,255,255,0.3)',fontSize:12,flexShrink:0}}>{(p.teams||[]).length} teams</span>
                    <button
                      onClick={() => {
                        if (isEditing) { setEditingP(null); setWheelResult(null); setWheelDisplay(null); }
                        else { setEditingP(p.name); setEditTeams([...(p.teams||[])]); setWheelResult(null); setWheelDisplay(null); }
                      }}
                      style={{background:isEditing?'rgba(0,200,83,0.25)':'rgba(0,200,83,0.15)',border:`1px solid ${isEditing?'rgba(0,200,83,0.5)':'rgba(0,200,83,0.3)'}`,color:'#22c55e',fontSize:12,fontWeight:700,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0}}>
                      {isEditing ? 'Close' : 'Edit teams'}
                    </button>
                    <button onClick={() => removeParticipant(p.name)}
                      style={{background:'rgba(255,23,68,0.1)',border:'1px solid rgba(255,23,68,0.25)',color:'#ff1744',fontSize:12,fontWeight:700,padding:'3px 8px',borderRadius:5,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0}}>Remove</button>
                  </>
                )}
              </div>

              {/* Assigned teams badges (collapsed view) */}
              {!isEditing && (p.teams||[]).length > 0 && (
                <div style={{padding:'0 12px 10px',display:'flex',flexWrap:'wrap',gap:4}}>
                  {(p.teams||[]).map(t => {
                    const ti = TEAM_TIER_MAP[t];
                    const pts = swTeamPts(teamData[t]);
                    return (
                      <span key={t} style={{fontSize:12,fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${ti?.color||'#666'}22`,color:ti?.color||'#aaa',border:`1px solid ${ti?.color||'#666'}44`,display:'inline-flex',alignItems:'center',gap:4}}>
                        <TeamLogo name={t} size={13}/>
                        {t}{pts > 0 ? ` ${pts}pts` : ''}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Inline team picker */}
              {isEditing && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',padding:'12px',display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <p style={{color:'rgba(255,255,255,0.35)',fontSize:12,margin:0}}>Tap to assign · greyed = taken · {editTeams.length} assigned</p>
                    <button onClick={saveParticipantTeams} style={{background:'#22c55e',border:'none',color:'#000',fontSize:12,fontWeight:800,padding:'6px 14px',borderRadius:7,cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0}}>Save</button>
                  </div>

                  {/* Spin the wheel — tier 3+ only */}
                  {(() => {
                    const available = TIER3_PLUS_TEAMS.filter(t => !editTeams.includes(t) && !assignedByOther(p.name).includes(t));
                    return (
                      <div style={{background:'rgba(33,150,243,0.07)',border:'1px solid rgba(33,150,243,0.2)',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <div>
                            <div style={{color:'#fff',fontSize:12,fontWeight:800,letterSpacing:'0.05em'}}>Spin the Wheel</div>
                            <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginTop:1}}>Tier 3–6 · {available.length} available</div>
                          </div>
                          <button onClick={() => spinWheel(available)} disabled={spinning || available.length === 0} style={{
                            background: spinning || !available.length ? 'rgba(255,255,255,0.06)' : 'rgba(33,150,243,0.25)',
                            border: `1px solid ${spinning || !available.length ? 'rgba(255,255,255,0.08)' : 'rgba(33,150,243,0.5)'}`,
                            color: spinning || !available.length ? 'rgba(255,255,255,0.3)' : '#2196f3',
                            fontSize:12,fontWeight:800,padding:'7px 14px',borderRadius:8,
                            cursor: spinning || !available.length ? 'default' : 'pointer',
                            fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:'0.05em',flexShrink:0,
                          }}>
                            {spinning ? 'Spinning…' : 'Spin'}
                          </button>
                        </div>
                        {wheelDisplay && (
                          <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'10px 12px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                            <div style={{
                              color: wheelResult ? '#2196f3' : 'rgba(255,255,255,0.5)',
                              fontSize: wheelResult ? 18 : 13,fontWeight:900,
                              fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",
                              letterSpacing:'0.05em',textTransform:'uppercase',
                              transition:'font-size 0.15s,color 0.15s',minHeight:22,display:'flex',alignItems:'center',
                            }}>
                              {wheelDisplay}
                            </div>
                            {wheelResult && (
                              <button onClick={() => { toggleTeam(wheelResult); setWheelResult(null); setWheelDisplay(null); }} style={{
                                background:'rgba(33,150,243,0.2)',border:'1px solid rgba(33,150,243,0.5)',
                                color:'#2196f3',fontSize:13,fontWeight:800,padding:'4px 14px',borderRadius:6,
                                cursor:'pointer',fontFamily:"'DM Sans',system-ui,sans-serif",letterSpacing:'0.05em',
                              }}>
                                + Add {wheelResult}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Teams by tier */}
                  {SWEEPSTAKE_TIERS.map(({ tier, label, color, teams }) => (
                    <div key={tier}>
                      <div style={{color:color,fontSize:12,letterSpacing:'0.18em',fontWeight:700,textTransform:'uppercase',marginBottom:5}}>Tier {tier} — {label}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {teams.map(team => {
                          const selected = editTeams.includes(team);
                          const takenByOther = assignedByOther(p.name).includes(team);
                          return (
                            <button key={team} onClick={() => !takenByOther && toggleTeam(team)} disabled={takenByOther} style={{
                              padding:'3px 8px',borderRadius:5,fontSize:12,fontWeight:700,
                              cursor:takenByOther?'default':'pointer',
                              background:selected?`${color}33`:takenByOther?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.06)',
                              border:selected?`1.5px solid ${color}`:`1px solid ${takenByOther?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.15)'}`,
                              color:selected?color:takenByOther?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.7)',
                              fontFamily:"'DM Sans',system-ui,sans-serif",transition:'all 0.1s',
                              display:'inline-flex',alignItems:'center',gap:4,
                            }}>
                              <TeamLogo name={team} size={13} style={{opacity:takenByOther?0.3:1}}/>
                              {selected && '✓ '}{team}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SWEEPSTAKE SCREENS
// ═══════════════════════════════════════════════════════════════

const P_COLORS = ['#e63946','#2196f3','#ffd700','#22c55e','#ff6b35','#9c27b0','#00bcd4','#ff9800','#4caf50','#e91e63','#3f51b5','#ff5722'];

function swOwnerMap(sw) {
  const byTeam = {}, byName = {};
  (sw?.participants || []).forEach((p, i) => {
    byName[p.name] = P_COLORS[i % P_COLORS.length];
    (p.teams || []).forEach(t => { byTeam[t] = p.name; });
  });
  return { byTeam, byName };
}

function SwSelectScreen({ sweepstakes, onSelect, isAdmin }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const doDelete = async (id) => {
    setDeleting(true);
    await api('/api/sweepstake/delete-sweepstake', { sweepstakeId: id });
    setDeleting(false);
    setConfirmDelete(null);
  };

  const doCreate = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    await api('/api/sweepstake/create', { name: newName.trim() });
    setNewName('');
    setCreating(false);
    setBusy(false);
  };

  return (
    <div style={{position:'relative',zIndex:1,padding:'32px 24px 80px'}}>
      <div style={{maxWidth:860,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:28,gap:16}}>
          <div>
            <div style={{color:'#0d2444',fontSize:12,letterSpacing:'0.28em',textTransform:'uppercase',fontWeight:700,marginBottom:5}}>Choose a pool</div>
            <div style={{color:'#0d2444',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:32,fontWeight:900,letterSpacing:'0.04em',textTransform:'uppercase',lineHeight:1}}>Sweepstake</div>
          </div>
          {isAdmin && (
            creating ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder="Pool name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') doCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                  className="w-44 h-9 text-sm"
                />
                <Button onClick={doCreate} disabled={busy || !newName.trim()} size="sm">
                  {busy ? '…' : 'Create'}
                </Button>
                <Button onClick={() => { setCreating(false); setNewName(''); }} size="sm" variant="outline">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setCreating(true)} size="default" className="bg-primary text-primary-foreground hover:bg-primary/90 font-black tracking-wide shrink-0 px-5">
                + New Sweepstake
              </Button>
            )
          )}
        </div>

        {!sweepstakes?.length ? (
          <div style={{color:'rgba(255,255,255,0.25)',fontSize:13,paddingTop:32,textAlign:'center'}}>No sweepstakes set up yet.</div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
            {sweepstakes.map((sw, idx) => {
              const td = sw.teamData || {};
              const parts = sw.participants || [];
              const ranked = [...parts].map(p => ({...p, pts: swParticipantPts(p, td)})).sort((a,b) => b.pts - a.pts);
              const leader = ranked[0];
              const color = P_COLORS[idx % P_COLORS.length];
              const isConfirming = confirmDelete === sw.id;
              return (
                <div key={sw.id} style={{
                  background:'rgba(4,14,28,0.82)',
                  border:`1px solid ${isConfirming?'rgba(255,68,68,0.4)':'rgba(255,255,255,0.1)'}`,
                  borderTop:`3px solid ${color}`,
                  borderRadius:14,padding:'22px 20px',
                  backdropFilter:'blur(8px)',
                  position:'relative',
                }}>
                  {/* Delete button — admin only */}
                  {isAdmin && !isConfirming && (
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(sw.id); }} style={{
                      all:'unset',position:'absolute',top:10,right:10,cursor:'pointer',
                      color:'rgba(255,255,255,0.2)',fontSize:14,lineHeight:1,padding:'2px 5px',
                      borderRadius:4,transition:'color 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color='#ff4444'}
                    onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.2)'}
                    >✕</button>
                  )}

                  {isConfirming ? (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{color:'#fff',fontSize:13,fontWeight:700}}>Delete <span style={{color:'#ff4444'}}>{sw.name}</span>?</div>
                      <div style={{color:'rgba(255,255,255,0.4)',fontSize:13}}>This cannot be undone.</div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={() => doDelete(sw.id)} disabled={deleting} style={{all:'unset',cursor:'pointer',flex:1,padding:'7px 0',borderRadius:7,background:'#ff4444',color:'#fff',fontSize:13,fontWeight:700,textAlign:'center'}}>
                          {deleting ? '...' : 'Delete'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} style={{all:'unset',cursor:'pointer',flex:1,padding:'7px 0',borderRadius:7,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:700,textAlign:'center'}}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => onSelect(sw.id)} style={{cursor:'pointer'}}>
                      <div style={{color:'#fff',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:22,fontWeight:900,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:10,lineHeight:1}}>{sw.name}</div>
                      <div style={{color:'rgba(255,255,255,0.38)',fontSize:13,marginBottom:10}}>{parts.length} participant{parts.length!==1?'s':''}</div>
                      {leader ? (
                        <div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:7,background:'rgba(255,215,0,0.07)',border:'1px solid rgba(255,215,0,0.15)'}}>
                          <span style={{color:'#ffd700',fontSize:12,fontWeight:800,letterSpacing:'0.18em',textTransform:'uppercase',flexShrink:0}}>Leader</span>
                          <span style={{color:'#fff',fontSize:12,fontWeight:700,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{leader.name}</span>
                          <span style={{color:'#22c55e',fontSize:13,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",flexShrink:0}}>{leader.pts}pts</span>
                        </div>
                      ) : (
                        <div style={{color:'rgba(255,255,255,0.18)',fontSize:13,fontStyle:'italic'}}>No data yet</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const SW_ROUND_ORDER = ['winner','runner_up','sf','qf','r16','r32'];

// ── WC Knockout Bracket Tree ───────────────────────────────────
const WCB = { MH:76, MW:195, GAP:12, STEP:98, PX:14, PY:24 };
const wcbColX  = c => c * (WCB.MW + WCB.GAP);
const wcbR32Top = i => i * WCB.STEP;
const wcbR16Top = i => (wcbR32Top(i*2) + wcbR32Top(i*2+1)) / 2;
const wcbQfTop  = i => (wcbR16Top(i*2) + wcbR16Top(i*2+1)) / 2;
const wcbSfTop  = (wcbQfTop(0) + wcbQfTop(1)) / 2;
const WCB_NATURAL_W = wcbColX(8) + WCB.MW + WCB.PX * 2;
const WCB_TOTAL_H   = wcbR32Top(7) + WCB.MH;
const WCB_TOTAL_W   = wcbColX(8) + WCB.MW;

function wcbPad(arr, len) {
  if (!arr?.length) return Array(len).fill(null);
  return arr.slice(0, len).concat(Array(Math.max(0, len - arr.length)).fill(null));
}

function WCMatchSlot({ name, won, dimmed, owner, ownerColor }) {
  const tc = name ? (TEAM_TIER_MAP[name]?.color || '#888') : null;
  return (
    <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'0 8px',opacity:dimmed?0.3:1}}>
      {TEAM_LOGO_MAP[name]
        ? <TeamLogo name={name} size={18}/>
        : <div style={{width:8,height:8,borderRadius:1,flexShrink:0,background:tc||'rgba(255,255,255,0.1)',border:tc?'none':'1px solid rgba(255,255,255,0.12)'}}/>
      }
      <span style={{fontSize:15,fontWeight:won?700:500,color:name?'#fff':'rgba(255,255,255,0.45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
        {name || 'TBD'}
      </span>
      {owner && <span style={{fontSize:13,fontWeight:700,color:ownerColor||'rgba(255,255,255,0.4)',whiteSpace:'nowrap',flexShrink:0,maxWidth:72,overflow:'hidden',textOverflow:'ellipsis'}}>{owner}</span>}
      {won && <span style={{color:'#22c55e',fontSize:15,flexShrink:0}}>✓</span>}
    </div>
  );
}

function WCMatchCard({ m, x, top, byTeam, byName }) {
  const { MH, MW, PX, PY } = WCB;
  const won1 = !!(m?.winner && m.winner === m?.t1);
  const won2 = !!(m?.winner && m.winner === m?.t2);
  const owner1 = m?.t1 && byTeam ? byTeam[m.t1] : null;
  const owner2 = m?.t2 && byTeam ? byTeam[m.t2] : null;
  return (
    <div style={{position:'absolute',left:x+PX,top:top+PY,width:MW,height:MH,
      background:'rgba(4,14,28,0.9)',border:`1px solid ${m?.winner?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)'}`,
      borderRadius:7,overflow:'hidden',display:'flex',flexDirection:'column',boxSizing:'border-box'}}>
      <WCMatchSlot name={m?.t1||null} won={won1} dimmed={!!(m?.winner && !won1)} owner={owner1} ownerColor={owner1&&byName?byName[owner1]:null}/>
      <div style={{height:1,background:'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {m?.winner && m.s1!=null && m.s2!=null && (
          <span style={{background:'rgba(4,14,28,0.95)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:3,padding:'1px 4px',fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.7)',letterSpacing:1}}>{m.s1}–{m.s2}</span>
        )}
      </div>
      <WCMatchSlot name={m?.t2||null} won={won2} dimmed={!!(m?.winner && !won2)} owner={owner2} ownerColor={owner2&&byName?byName[owner2]:null}/>
    </div>
  );
}

function WCBracketTree({ wcBracket, byTeam, byName, fitBoth }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const { PX, PY } = WCB;
  const naturalH = WCB_TOTAL_H + PY + 16;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (w <= 0) return;
      const wScale = w / WCB_NATURAL_W;
      setScale(fitBoth && h > 0 ? Math.min(wScale, h / naturalH) : wScale);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    window.addEventListener('resize', measure);
    return () => { obs.disconnect(); window.removeEventListener('resize', measure); };
  }, [fitBoth, naturalH]);
  const r32 = wcbPad(wcBracket?.r32, 16);
  const r16 = wcbPad(wcBracket?.r16, 8);
  const qf  = wcbPad(wcBracket?.qf, 4);
  const sf  = wcbPad(wcBracket?.sf, 2);
  const fin = wcBracket?.final || null;

  const LC = 'rgba(255,255,255,0.15)';
  const cy = top => top + WCB.MH / 2;
  const lines = [];
  const b2to1 = (fromX, tops2, toX, toTop, pfx) => {
    const midX = (fromX + toX) / 2;
    const cy0 = cy(tops2[0]), cy1 = cy(tops2[1]), cyt = cy(toTop);
    lines.push(
      <line key={`${pfx}h0`} x1={fromX} y1={cy0} x2={midX} y2={cy0} stroke={LC} strokeWidth={1}/>,
      <line key={`${pfx}h1`} x1={fromX} y1={cy1} x2={midX} y2={cy1} stroke={LC} strokeWidth={1}/>,
      <line key={`${pfx}v`}  x1={midX}  y1={cy0} x2={midX} y2={cy1} stroke={LC} strokeWidth={1}/>,
      <line key={`${pfx}t`}  x1={midX}  y1={cyt} x2={toX}  y2={cyt} stroke={LC} strokeWidth={1}/>,
    );
  };
  for (let i=0;i<4;i++) b2to1(wcbColX(0)+WCB.MW,[wcbR32Top(i*2),wcbR32Top(i*2+1)],wcbColX(1),wcbR16Top(i),`ll${i}`);
  for (let i=0;i<2;i++) b2to1(wcbColX(1)+WCB.MW,[wcbR16Top(i*2),wcbR16Top(i*2+1)],wcbColX(2),wcbQfTop(i),`ql${i}`);
  b2to1(wcbColX(2)+WCB.MW,[wcbQfTop(0),wcbQfTop(1)],wcbColX(3),wcbSfTop,'sl');
  lines.push(<line key="sl-f" x1={wcbColX(3)+WCB.MW} y1={cy(wcbSfTop)} x2={wcbColX(4)} y2={cy(wcbSfTop)} stroke={LC} strokeWidth={1}/>);
  for (let i=0;i<4;i++) b2to1(wcbColX(8),[wcbR32Top(i*2),wcbR32Top(i*2+1)],wcbColX(7)+WCB.MW,wcbR16Top(i),`rr${i}`);
  for (let i=0;i<2;i++) b2to1(wcbColX(7),[wcbR16Top(i*2),wcbR16Top(i*2+1)],wcbColX(6)+WCB.MW,wcbQfTop(i),`qr${i}`);
  b2to1(wcbColX(6),[wcbQfTop(0),wcbQfTop(1)],wcbColX(5)+WCB.MW,wcbSfTop,'sr');
  lines.push(<line key="sr-f" x1={wcbColX(5)} y1={cy(wcbSfTop)} x2={wcbColX(4)+WCB.MW} y2={cy(wcbSfTop)} stroke={LC} strokeWidth={1}/>);

  const innerStyle = fitBoth
    ? { transform:`scale(${scale})`, transformOrigin:'top center', width:WCB_NATURAL_W, height:naturalH, position:'absolute', left:'50%', marginLeft:-(WCB_NATURAL_W/2) }
    : { transform:`scale(${scale})`, transformOrigin:'top left',   width:WCB_NATURAL_W, height:naturalH, position:'absolute' };

  return (
    <div ref={containerRef} style={fitBoth ? {width:'100%',height:'100%',overflow:'hidden',position:'relative'} : {width:'100%',overflow:'hidden',position:'relative',height:scale>0?naturalH*scale:naturalH}}>
      <div style={innerStyle}>
        <svg style={{position:'absolute',left:PX,top:PY,width:WCB_TOTAL_W,height:WCB_TOTAL_H,overflow:'visible',pointerEvents:'none'}}>
          {lines}
        </svg>
        {r32.slice(0,8).map((m,i)  => <WCMatchCard key={`r32l${i}`} m={m} x={wcbColX(0)} top={wcbR32Top(i)} byTeam={byTeam} byName={byName}/>)}
        {r16.slice(0,4).map((m,i)  => <WCMatchCard key={`r16l${i}`} m={m} x={wcbColX(1)} top={wcbR16Top(i)} byTeam={byTeam} byName={byName}/>)}
        {qf.slice(0,2).map((m,i)   => <WCMatchCard key={`qfl${i}`}  m={m} x={wcbColX(2)} top={wcbQfTop(i)} byTeam={byTeam} byName={byName}/>)}
        {sf.slice(0,1).map((m,i)   => <WCMatchCard key="sfl"        m={m} x={wcbColX(3)} top={wcbSfTop} byTeam={byTeam} byName={byName}/>)}
        <div style={{position:'absolute',left:wcbColX(4)+WCB.PX+WCB.MW/2,top:wcbSfTop+WCB.PY-128,transform:'translateX(-50%)',pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <img src="/wc-trophy.png" alt="" draggable={false} style={{height:120,width:'auto',objectFit:'contain',filter:'drop-shadow(0 0 10px rgba(245,166,35,0.5))'}}/>
        </div>
        <WCMatchCard key="fin" m={fin} x={wcbColX(4)} top={wcbSfTop} byTeam={byTeam} byName={byName}/>
        {sf.slice(1,2).map((m,i)   => <WCMatchCard key="sfr"        m={m} x={wcbColX(5)} top={wcbSfTop} byTeam={byTeam} byName={byName}/>)}
        {qf.slice(2,4).map((m,i)   => <WCMatchCard key={`qfr${i}`}  m={m} x={wcbColX(6)} top={wcbQfTop(i)} byTeam={byTeam} byName={byName}/>)}
        {r16.slice(4,8).map((m,i)  => <WCMatchCard key={`r16r${i}`} m={m} x={wcbColX(7)} top={wcbR16Top(i)} byTeam={byTeam} byName={byName}/>)}
        {r32.slice(8,16).map((m,i) => <WCMatchCard key={`r32r${i}`} m={m} x={wcbColX(8)} top={wcbR32Top(i)} byTeam={byTeam} byName={byName}/>)}
      </div>
    </div>
  );
}

function SwDetailScreen({ sw, wcBracket, onBack }) {
  const { byTeam, byName } = swOwnerMap(sw);
  const { participants = [], teamData = {} } = sw;

  const ranked = [...participants]
    .map(p => ({ ...p, pts: swParticipantPts(p, teamData) }))
    .sort((a, b) => b.pts - a.pts);

  const medalC = i => i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':null;
  const [bracketWide, setBracketWide] = useState(false);

  return (
    <div style={{position:'relative',zIndex:1,width:'100%'}}>
      {/* Back bar */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)',background:'rgba(3,10,22,0.9)'}}>
        <button onClick={onBack} style={{all:'unset',cursor:'pointer',color:'rgba(255,255,255,0.45)',fontSize:13,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'4px 0'}}>
          ← Back
        </button>
        <span style={{color:'rgba(255,255,255,0.12)',fontSize:12}}>|</span>
        <span style={{color:'#fff',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:16,fontWeight:900,letterSpacing:'0.06em',textTransform:'uppercase'}}>{sw.name}</span>
        <span style={{marginLeft:'auto',color:'rgba(255,255,255,0.3)',fontSize:12}}>{participants.length} participants</span>
      </div>

      {/* Full-width bracket */}
      <div style={{position:'relative',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <WCBracketTree wcBracket={wcBracket} byTeam={byTeam} byName={byName}/>
        <Button size="sm" onClick={() => setBracketWide(true)} style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',background:'#f5c400',color:'#000',borderColor:'#f5c400'}} className="h-7 px-3 text-xs hover:opacity-90">
          Full view
        </Button>
      </div>

      <div style={{display:'flex',alignItems:'flex-start'}}>

        {/* LEFT — group stage */}
        <div style={{flex:'1 1 0',minWidth:0,borderRight:'1px solid rgba(255,255,255,0.07)'}}>

          {/* Group Stage — WC groups A–L */}
          <div className="px-3 pb-24 pt-3">
            <p className="text-[12px] font-black tracking-[0.22em] uppercase text-white/35 mb-2">Group Stage</p>
            <div className="grid gap-3" style={{gridTemplateColumns:'repeat(2,1fr)'}}>

              {Object.entries(WC_GROUPS).map(([letter, teams]) => {
                const sorted = [...teams].sort((a,b) => {
                  const pa = teamData[a], pb = teamData[b];
                  const pts = (pb?.groupPts||0) - (pa?.groupPts||0);
                  if (pts !== 0) return pts;
                  const gda = (pa?.groupGF||0) - (pa?.groupGA||0);
                  const gdb = (pb?.groupGF||0) - (pb?.groupGA||0);
                  return gdb - gda;
                });
                return (
                  <Card key={letter} className="rounded-sm border-white/10 bg-[rgba(4,14,28,0.9)] overflow-hidden">
                    {/* Group header */}
                    <div className="px-2 py-2 bg-[rgba(15,30,60,0.95)] border-b-2 border-white/10">
                      <span className="text-[15px] font-black tracking-[0.1em] uppercase text-white" style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif"}}>Group {letter}</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/8 hover:bg-transparent bg-white/[0.02]">
                          <TableHead className="w-7 text-[12px] font-black tracking-widest uppercase text-white/30 text-center px-1">#</TableHead>
                          <TableHead className="text-[12px] font-black tracking-widest uppercase text-white/30 px-2">Team</TableHead>
                          <TableHead className="text-[12px] font-black tracking-widest uppercase text-white/30 text-center w-8 px-1">P</TableHead>
                          <TableHead className="text-[12px] font-black tracking-widest uppercase text-white/30 text-center w-8 px-1">GF</TableHead>
                          <TableHead className="text-[12px] font-black tracking-widest uppercase text-white/30 text-center w-8 px-1">GA</TableHead>
                          <TableHead className="text-[12px] font-black tracking-widest uppercase text-white/30 text-center w-9 px-1">GD</TableHead>
                          <TableHead className="text-[12px] font-black tracking-widest uppercase text-white/30 text-center w-9 px-1">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((t, pos) => {
                          const td = teamData[t];
                          const owner = byTeam[t];
                          const ownerColor = owner ? byName[owner] : null;
                          const tierCol = TEAM_TIER_MAP[t]?.color || '#555';
                          const played = td?.groupPlayed ?? null;
                          const gf    = td?.groupGF    ?? null;
                          const ga    = td?.groupGA    ?? null;
                          const gd    = gf !== null && ga !== null ? gf - ga : null;
                          const pts   = td?.groupPts   ?? null;
                          const hasData = pts !== null;
                          const qualified = pos < 2 && hasData;
                          const dash = <span className="text-white/15 tabular-nums">—</span>;
                          return (
                            <TableRow
                              key={t}
                              className="border-white/[0.06] hover:bg-white/[0.03]"
                              style={{borderLeft: qualified ? '3px solid #22c55e' : '3px solid transparent'}}
                            >
                              <TableCell className="text-center px-1 py-2.5 text-[13px] font-bold text-white/35 w-7">{pos+1}</TableCell>
                              <TableCell className="px-2 py-2.5 min-w-0 max-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <TeamLogo name={t} size={16} style={{flexShrink:0}}/>
                                  <span className={`text-[15px] truncate shrink-0 ${qualified ? 'text-white font-bold' : 'text-white/75 font-medium'}`}>{t}</span>
                                  {owner && <span className="text-[14px] font-semibold truncate" style={{color: ownerColor || 'rgba(255,255,255,0.35)'}}>{owner}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center px-1 py-2.5 text-[13px] font-semibold text-white/60 tabular-nums w-8">{played ?? dash}</TableCell>
                              <TableCell className="text-center px-1 py-2.5 text-[13px] font-semibold text-white/60 tabular-nums w-8">{gf ?? dash}</TableCell>
                              <TableCell className="text-center px-1 py-2.5 text-[13px] font-semibold text-white/60 tabular-nums w-8">{ga ?? dash}</TableCell>
                              <TableCell className="text-center px-1 py-2.5 text-[13px] font-bold tabular-nums w-9" style={{color: gd === null ? undefined : gd>0?'#22c55e':gd<0?'#ff5555':'rgba(255,255,255,0.5)'}}>
                                {gd !== null ? `${gd>0?'+':''}${gd}` : dash}
                              </TableCell>
                              <TableCell className="text-center px-1 py-2.5 text-[13px] font-black text-white tabular-nums w-9">{pts ?? dash}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                );
              })}
            </div>
          </div>


        </div>

        {/* RIGHT — leaderboard */}
        <div style={{flex:'0 0 30%',position:'sticky',top:82,height:'calc(100vh - 82px)',overflowY:'auto',scrollbarWidth:'none',padding:'12px 10px',display:'flex',flexDirection:'column',gap:5}}>

          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'0 2px',marginBottom:2}}>
            <span style={{color:'#fff',fontSize:13,fontWeight:800,letterSpacing:'0.15em',textTransform:'uppercase'}}>Leaderboard</span>
            <span style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>{ranked.length} players</span>
          </div>

          {/* Rank pills */}
          {ranked.length === 0 ? (
            <div style={{color:'rgba(255,255,255,0.25)',fontSize:13,textAlign:'center',paddingTop:32}}>No participants yet.</div>
          ) : ranked.map((p, i) => {
            const podiumColor = i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':null;
            return (
              <div key={p.name} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'12px 14px',
                borderRadius:12,
                background:'rgba(4,14,28,0.75)',
                border:'1px solid rgba(255,255,255,0.09)',
                backdropFilter:'blur(8px)',
                boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
              }}>
                <span style={{width:20,fontSize:13,fontWeight:700,color:podiumColor||'rgba(255,255,255,0.6)',flexShrink:0,textAlign:'center'}}>{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:'#fff',fontSize:15,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                  {(p.teams||[]).length > 0 && (
                    <div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap'}}>
                      {(p.teams||[]).map(t => {
                        const tc = TEAM_TIER_MAP[t]?.color||'rgba(255,255,255,0.4)';
                        const td = teamData[t];
                        return (
                          <span key={t} style={{fontSize:16,color:tc,fontWeight:600,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}>
                            <TeamLogo name={t} size={18}/>
                            {t}{td?.reached?` · ${SW_ROUND_SHORT[td.reached]}`:''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span style={{fontSize:16,fontWeight:800,color:podiumColor||'rgba(255,255,255,0.9)',flexShrink:0}}>{p.pts}</span>
              </div>
            );
          })}

          {/* Points system pill */}
          <div style={{marginTop:4,padding:'10px 12px',borderRadius:10,background:'rgba(4,14,28,0.75)',border:'1px solid rgba(255,255,255,0.09)',backdropFilter:'blur(8px)',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.7)',fontWeight:700,marginBottom:7,textTransform:'uppercase',letterSpacing:'0.15em'}}>Points</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',rowGap:4,columnGap:12}}>
              {[['R32','5'],['R16','10'],['QF','20'],['SF','35'],['Runner-up','50'],['Winner','100']].map(([k,v]) => (
                <><span key={k} style={{fontSize:11,color:'rgba(255,255,255,0.65)'}}>{k}</span><span key={v} style={{fontSize:11,color:'#fff',fontWeight:700,textAlign:'right'}}>{v}</span></>
              ))}
              <div style={{gridColumn:'1/-1',height:1,background:'rgba(255,255,255,0.08)',margin:'2px 0'}}/>
              {[['Draw','+1'],['Win','+3'],['Group winner','+10'],['Clean sheet','+5'],['Top scorer','+15'],['Upset win','+6 (+3 bonus)']].map(([k,v]) => (
                <><span key={k} style={{fontSize:11,color:'rgba(255,255,255,0.65)'}}>{k}</span><span key={v} style={{fontSize:11,color:'#fff',fontWeight:700,textAlign:'right'}}>{v}</span></>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Full-width bracket overlay — portalled to body so fixed positioning escapes any scroll container */}
      {bracketWide && createPortal(
        <div style={{position:'fixed',inset:0,zIndex:10010,background:'rgba(3,10,22,0.97)',backdropFilter:'blur(12px)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
            <Button size="sm" onClick={() => setBracketWide(false)} style={{background:'#22c55e',color:'#000',borderColor:'#22c55e'}} className="hover:opacity-90">← Back</Button>
            <span style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:18,fontWeight:900,letterSpacing:'0.06em',textTransform:'uppercase',color:'#fff'}}>{sw.name} — Full Bracket</span>
          </div>
          <div style={{flex:1,minHeight:0,overflow:'hidden',padding:'12px'}}>
            <WCBracketTree wcBracket={wcBracket} byTeam={byTeam} byName={byName} fitBoth/>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════

function HomeScreen({ serverState, onSelect, onAdminLogin, isAdmin }) {
  const bracket     = serverState?.bracket;
  const sweepstakes = serverState?.sweepstakes || [];
  const stage       = bracket?.stage;
  const stageLabel  = {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',sf:'Semi-Finals',final:'Final',champion:'Champion'}[stage];

  const [swIdx, setSwIdx]             = useState(0);
  const swTouchX                      = useRef(null);
  const activeSw                      = sweepstakes[swIdx] || sweepstakes[0];

  useEffect(() => {
    if (sweepstakes.length < 2) return;
    const t = setInterval(() => setSwIdx(i => (i + 1) % sweepstakes.length), 4000);
    return () => clearInterval(t);
  }, [sweepstakes.length]);
  const swTop5 = activeSw
    ? [...(activeSw.participants||[])].sort((a,b) => swParticipantPts(b,activeSw.teamData||{}) - swParticipantPts(a,activeSw.teamData||{})).slice(0,7)
    : [];

  const [menuOpen, setMenuOpen]       = useState(false);
  const [loginOpen, setLoginOpen]     = useState(false);
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [loginErr, setLoginErr]       = useState('');


  const submitLogin = () => {
    if (email.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && password === 'Mexico@#1000') {
      sessionStorage.setItem('psc_admin', '1');
      setLoginOpen(false);
      setMenuOpen(false);
      onAdminLogin();
    } else {
      setLoginErr('Invalid credentials');
    }
  };

  const FLAGS = [
    'France','Spain','Argentina','England','Portugal','Brazil','Netherlands','Morocco',
    'Belgium','Germany','Croatia','Colombia','Senegal','Mexico','United States','Uruguay',
    'Japan','Switzerland','Norway','Australia','Türkiye','Austria','Ecuador','Sweden',
    'Iran','Scotland','Egypt','Panama','Ivory Coast','Canada','Algeria','Paraguay',
    'South Korea','Tunisia','Czechia','DR Congo','Uzbekistan','South Africa','Iraq','Qatar',
    'Saudi Arabia','Jordan','Bosnia & Herzegovina','Cape Verde','Ghana','Curaçao','Haiti','New Zealand',
  ];

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      <style>{CSS}</style>
      <StadiumBg/>

      {/* Free-position zone: logo + title float here */}
      <div className="relative z-10" style={{height:175,flexShrink:0,position:'relative'}}>

        {/* DAF Logo */}
        <div style={{position:'absolute',left:8,top:10,zIndex:12}}>
          <img src="/daf-logo.png" draggable={false} alt="" style={{height:160,objectFit:'contain',display:'block'}}/>
        </div>

        {/* Menu button — top-right corner */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{position:'absolute',top:62,right:16,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,cursor:'pointer',padding:'8px 10px',display:'flex',flexDirection:'column',gap:4,alignItems:'center',zIndex:13,backdropFilter:'blur(8px)'}}
        >
          <span style={{display:'block',width:18,height:1.5,background:'rgba(255,255,255,0.85)',borderRadius:1}}/>
          <span style={{display:'block',width:18,height:1.5,background:'rgba(255,255,255,0.85)',borderRadius:1}}/>
          <span style={{display:'block',width:18,height:1.5,background:'rgba(255,255,255,0.85)',borderRadius:1}}/>
        </button>

      </div>{/* end free zone */}

      {/* Flag banner — monochrome strip */}
      <div className="relative z-10 flag-marquee" style={{padding:'10px 0',marginTop:-18}}>
        <div className="flag-track">
          {[...FLAGS, ...FLAGS].map((name, i) => (
            <div key={i} style={{flexShrink:0,display:'flex',alignItems:'center',gap:0}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:68}}>
                <img src={TEAM_LOGO_MAP[name]} alt={name} draggable={false} style={{width:56,height:56,objectFit:'contain',opacity:0.5,filter:'grayscale(100%) brightness(1.8)'}}/>
              </div>
              <div style={{width:1,height:24,background:'rgba(255,255,255,0.08)',flexShrink:0}}/>
            </div>
          ))}
        </div>
      </div>

      {/* Cards — side by side */}
      <div className="relative z-10 grid grid-cols-2 gap-4 px-5 pb-5 flex-1 min-h-0">
        {/* Penalties card */}
        <Card
          onClick={() => onSelect('bracket')}
          className="home-card cursor-pointer"
          style={{background:'rgba(4,16,32,0.88)',border:'1px solid rgba(255,255,255,0.15)',borderTop:'4px solid rgba(255,255,255,0.9)',borderRadius:16,position:'relative',overflow:'hidden',}}
        >
          <div style={{position:'absolute',inset:0,borderRadius:16,overflow:'hidden',pointerEvents:'none'}}>
            <img src="/penalty-bg.jpg" alt="" draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:0.55}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(4,16,32,0.05) 0%,rgba(4,16,32,0.15) 40%,rgba(4,16,32,0.75) 75%,rgba(4,16,32,0.95) 100%)'}}/>
          </div>
          <CardContent className="p-4 pb-2 h-full flex flex-col justify-end" style={{position:'relative',zIndex:2}}>
            <div className="flex flex-col gap-1.5">
              <span style={{color:'rgba(255,255,255,0.45)',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',fontWeight:700}}>Bracket Tournament</span>
              <span style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:'clamp(24px,4vw,60px)',fontWeight:900,letterSpacing:'0.04em',textTransform:'uppercase',color:'#fff',lineHeight:1}}>Penalties</span>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:0}}>
                {bracket && stage !== 'champion' && <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px rgba(34,197,94,0.8)',flexShrink:0}}/>}
                <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.7)'}}>
                  {stageLabel || (bracket ? 'Active' : 'No tournament')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sweepstake card */}
        <Card
          onClick={() => onSelect('sweepstake')}
          className="home-card cursor-pointer"
          style={{background:'rgba(4,16,32,0.88)',border:'1px solid rgba(255,255,255,0.15)',borderTop:'4px solid rgba(255,255,255,0.9)',borderRadius:16,position:'relative',overflow:'hidden',}}
          onTouchStart={e => { swTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (swTouchX.current === null) return;
            const dx = e.changedTouches[0].clientX - swTouchX.current;
            if (Math.abs(dx) > 40) setSwIdx(i => dx < 0 ? Math.min(i+1, sweepstakes.length-1) : Math.max(i-1, 0));
            swTouchX.current = null;
          }}
        >
          <div style={{position:'absolute',inset:0,borderRadius:16,overflow:'hidden',pointerEvents:'none'}}>
            <img src="/sweepstake-bg.jpg" alt="" draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:0.55}}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(4,16,32,0.05) 0%,rgba(4,16,32,0.15) 40%,rgba(4,16,32,0.75) 75%,rgba(4,16,32,0.95) 100%)'}}/>
          </div>
          <CardContent className="p-4 h-full flex flex-col justify-end" style={{position:'relative',zIndex:2}}>
            <div className="flex flex-col gap-2">
              <span style={{color:'rgba(255,255,255,0.45)',fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',fontWeight:700}}>Live Leaderboard</span>
              {swTop5.length > 0
                ? <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {swTop5.map((p,i) => (
                      <div key={p.name} style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:11,fontWeight:800,color:i===0?'#ffd700':'rgba(255,255,255,0.3)',width:14,flexShrink:0}}>{i+1}</span>
                        <span style={{fontSize:14,fontWeight:700,color:'#fff',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</span>
                        <span style={{fontSize:13,fontWeight:800,color:i===0?'#ffd700':'rgba(255,255,255,0.6)'}}>{swParticipantPts(p,activeSw?.teamData||{})}pts</span>
                      </div>
                    ))}
                  </div>
                : <span style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No participants yet</span>
              }
              {/* Swipe dots */}
              {sweepstakes.length > 1 && (
                <div style={{display:'flex',gap:4,marginTop:2}}>
                  {sweepstakes.map((_,i) => (
                    <div key={i} style={{width:i===swIdx?14:5,height:5,borderRadius:3,background:i===swIdx?'#ffd700':'rgba(255,255,255,0.2)',transition:'width 0.2s ease,background 0.2s ease'}}/>
                  ))}
                </div>
              )}
              {/* Title */}
              <span style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:'clamp(24px,4vw,60px)',fontWeight:900,letterSpacing:'0.04em',textTransform:'uppercase',color:'#fff',lineHeight:1,marginTop:2}}>
                Sweepstake
              </span>
            </div>
          </CardContent>
        </Card>
      </div>{/* end cards */}

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:49}} onClick={() => setMenuOpen(false)}/>
          <div style={{position:'fixed',top:68,right:16,zIndex:50,background:'rgba(6,15,30,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,minWidth:180,boxShadow:'0 8px 32px rgba(0,0,0,0.6)',overflow:'hidden'}}>
            <button
              onClick={() => { setMenuOpen(false); setLoginOpen(true); setEmail(''); setPassword(''); setLoginErr(''); }}
              style={{display:'block',width:'100%',padding:'14px 18px',background:'none',border:'none',color:'rgba(255,255,255,0.85)',fontSize:13,fontWeight:600,textAlign:'left',cursor:'pointer',letterSpacing:'0.04em'}}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}
            >Admin Login</button>
          </div>
        </>
      )}

      {/* Admin login dialog */}
      <Dialog open={loginOpen} onOpenChange={v => { setLoginOpen(v); if (!v) setLoginErr(''); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Admin Login</DialogTitle></DialogHeader>
          <div style={{display:'flex',flexDirection:'column',gap:10,paddingTop:4}}>
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoFocus/>
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitLogin(); }}/>
            {loginErr && <p style={{color:'#ff4444',fontSize:12,margin:0}}>{loginErr}</p>}
            <Button onClick={submitLogin} className="w-full mt-1">Login</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT SCREEN
// ═══════════════════════════════════════════════════════════════

function TournamentScreen({ bracket, wcBracket, myCode, setMyCode, isAdmin, sweepstakes, tournamentCode, tournamentName, startManaging, initialSwMode, onHome, onLeave, onLogout, onDeleteTournament, onCPU, onJoined, onAdminLogin, onTournamentCreated, onCodeEntered, onRefresh }) {
  const [submitMatchId, setSubmitMatchId] = useState(null);
  const submitMatch = submitMatchId ? (() => {
    const all = [...(bracket?.r32||[]), ...(bracket?.r16||[]), ...(bracket?.qf||[]), ...(bracket?.sf||[]), ...(bracket?.final ? [bracket.final] : [])];
    return all.find(m => m.id === submitMatchId) || null;
  })() : null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Code entry — shown when no local tournament code saved and user isn't admin
  const [codeInput, setCodeInput] = useState('');
  const [codeErr, setCodeErr] = useState('');

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [managing, setManaging] = useState(!!startManaging);
  const [swMode, setSwMode] = useState(initialSwMode || 'bracket');
  const [selectedSwId, setSelectedSwId] = useState(null);
  useEffect(() => { setSwMode(initialSwMode || 'bracket'); }, [initialSwMode]);
  useEffect(() => { if (swMode !== 'sweepstake') setSelectedSwId(null); }, [swMode]);
  const needsCode = !isAdmin && !localStorage.getItem('psc_tcode') && swMode !== 'sweepstake';
  const needsPick = !isAdmin && swMode !== 'sweepstake' && !!bracket && bracket.stage !== 'champion' && (() => {
    const pName = localStorage.getItem('psc_name');
    if (!pName) return true;
    const stage = bracket.stage;
    const matches = stage === 'final' ? (bracket.final ? [bracket.final] : []) : (bracket[stage] || []);
    return !matches.some(m => m.p1?.player === pName || m.p2?.player === pName);
  })();
  const [managingSweepstake, setManagingSweepstake] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [winnerSelections, setWinnerSelections] = useState({});

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

  const openMatch = (match) => setSubmitMatchId(match.id);

  const resolveMatch = async (matchId, winnerCode) => {
    if (!winnerCode || resolvingId) return;
    setResolvingId(matchId);
    try { await api('/api/match/resolve', { matchId, winnerCode }); } catch(e) {}
    setResolvingId(null);
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
    <div style={{height:'100%',overflowY:'auto',WebkitOverflowScrolling:'touch',position:'relative',background:'#030d1a',paddingBottom:62}}>
      <StadiumBg/>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 flex flex-col p-0 gap-0 overflow-hidden border-r border-white/[0.08] z-[200]" style={{background:'#040e1c'}}>

          {/* Header */}
          <div style={{position:'relative',padding:'20px 16px 16px',background:'linear-gradient(160deg,rgba(0,200,83,0.13) 0%,transparent 65%)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#22c55e 0%,rgba(34,197,94,0.3) 60%,transparent 100%)'}}/>
            <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
              <img src="/daf-logo.png" alt="" draggable={false} style={{height:28,width:'auto',objectFit:'contain',filter:'drop-shadow(0 0 8px rgba(0,200,83,0.45))',flexShrink:0}}/>
              <span style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:14,fontWeight:900,letterSpacing:'0.07em',textTransform:'uppercase',color:'#fff',lineHeight:1.1}}>
                {tournamentName || 'DAF World Cup 2026'}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {stageLabel && <span style={{fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',fontWeight:700,color:'rgba(255,255,255,0.35)'}}>{stageLabel}</span>}
              {swMode === 'bracket' && stageLabel && tournamentCode && <span style={{color:'rgba(255,255,255,0.2)',fontSize:10}}>·</span>}
              {swMode === 'bracket' && tournamentCode && <span style={{fontSize:11,letterSpacing:'0.22em',fontWeight:800,color:'#22c55e'}}>{tournamentCode}</span>}
            </div>
          </div>

          {/* Nav */}
          <div style={{flex:1,overflowY:'auto',padding:'10px 8px',display:'flex',flexDirection:'column',gap:1}}>
            {isAdmin ? (
              <>
                <p style={{fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(255,255,255,0.22)',padding:'4px 8px 6px'}}>Tournament</p>
                {bracket && (
                  <SheetClose asChild>
                    <Button variant="ghost" className="justify-start h-10 px-3 gap-3 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.07] w-full" onClick={() => setManaging(true)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.7}}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
                      Manage Tournament
                    </Button>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <Button variant="ghost" className="justify-start h-10 px-3 gap-3 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.07] w-full" onClick={() => { setNewTourneyName(''); setNewTourneyErr(''); setNewTourneyModal(true); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.7}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    New Tournament
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="ghost" className="justify-start h-10 px-3 gap-3 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.07] w-full" onClick={() => setManagingSweepstake(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.7}}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                    Manage Sweepstake
                  </Button>
                </SheetClose>

                <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'8px 6px'}}/>
                <p style={{fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(255,255,255,0.22)',padding:'4px 8px 6px'}}>Other</p>

                <SheetClose asChild>
                  <Button variant="ghost" className="justify-start h-10 px-3 gap-3 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.07] w-full" onClick={() => onCPU(localStorage.getItem('psc_name') || 'Player')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.7}}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12v-2h2v2"/><path d="M7 12v2h2v-2"/></svg>
                    Solo vs CPU
                  </Button>
                </SheetClose>
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Button variant="ghost" className="justify-start h-10 px-3 gap-3 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.07] w-full" onClick={() => onCPU(myCode ? localStorage.getItem('psc_name') : 'Player')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.7}}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12v-2h2v2"/><path d="M7 12v2h2v-2"/></svg>
                    Solo vs CPU
                  </Button>
                </SheetClose>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{padding:'12px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',gap:6}}>
            {isAdmin ? (
              <>
                <SheetClose asChild>
                  <Button variant="destructive" size="sm" className="w-full gap-2 h-9" onClick={() => setConfirmDelete(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Delete Tournament
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2 h-9 border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-white/20" onClick={onLogout}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </Button>
                </SheetClose>
              </>
            ) : (
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 h-9 border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-white/20" onClick={() => { setAdminEmail(''); setAdminPass(''); setAdminErr(''); setAdminPrompt(true); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
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
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',margin:0}}>Admin Access</p>
            <Input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} autoFocus/>
            <Input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doAdminLogin()}/>
            {adminErr && <p style={{color:'#ff4444',fontSize:13,margin:0}}>{adminErr}</p>}
            <Button size="sm" onClick={doAdminLogin}>Unlock</Button>
          </div>
        </div>
      )}

      <Dialog open={newTourneyModal} onOpenChange={v => { if (!newTourneyBusy) setNewTourneyModal(v); }}>
        <DialogContent className="max-w-xs gap-4">
          <DialogHeader>
            <DialogTitle>New Tournament</DialogTitle>
          </DialogHeader>
          <Input autoFocus placeholder="Tournament name" value={newTourneyName} onChange={e => setNewTourneyName(e.target.value)} onKeyDown={async e => { if (e.key === 'Enter') await createNewTourney(); }}/>
          {newTourneyErr && <p className="text-destructive text-xs">{newTourneyErr}</p>}
          <DialogFooter>
            <Button className="w-full" disabled={newTourneyBusy} onClick={createNewTourney}>{newTourneyBusy ? '…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!(managing && bracket)} onOpenChange={v => !v && setManaging(false)}>
        <SheetContent side="right" className="w-[340px] flex flex-col p-0 gap-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
            <SheetTitle className="text-sm font-black tracking-wide">Manage Tournament</SheetTitle>
            {swMode === 'bracket' && tournamentCode && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[12px] tracking-widest uppercase text-muted-foreground">Code</span>
                <Badge variant="outline" className="text-primary border-primary/40 tracking-widest font-black text-sm">{tournamentCode}</Badge>
              </div>
            )}
            {(tournamentName || localStorage.getItem('psc_tname')) && (
              <p className="text-xs text-muted-foreground mt-1">{tournamentName || localStorage.getItem('psc_tname')}</p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col gap-4">

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
                    <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                      {stageNames[stage] || stage} — Teams
                    </div>
                    <div style={{display:'flex',flexDirection:'column',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:6,overflow:'hidden'}}>
                      {matches.map((m, i) => m.p1?.name && m.p2?.name && (
                        <AdminMatchInput key={m.id} match={m} matchIndex={i}/>
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
                      <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8,fontFamily:"'DM Sans',system-ui,sans-serif"}}>{label}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {matches.map((m, i) => {
                          const sel = winnerSelections[m.id] || '';
                          const busy = resolvingId === m.id;
                          return (
                            <div key={m.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${m.played?'rgba(0,200,83,0.2)':'rgba(255,255,255,0.08)'}`,borderRadius:7,overflow:'hidden'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 10px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                <span style={{color:'#ff1744',fontSize:12,fontWeight:700,letterSpacing:'0.12em',fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:'uppercase'}}>Match {i+1}</span>
                                {m.played && <span style={{color:'#22c55e',fontSize:12,fontWeight:700}}>✓ {m.winner?.name}</span>}
                              </div>
                              <div style={{padding:'7px 10px',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{color:m.played&&m.winner?.code===m.p1?.code?'#22c55e':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</div>
                                  {m.p1?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1.player}</div>}
                                </div>
                                <span style={{color:'rgba(255,255,255,0.2)',fontSize:12,flexShrink:0}}>
                                  {m.played ? `${m.p1Score??'–'}-${m.p2Score??'–'}` : 'vs'}
                                </span>
                                <div style={{flex:1,minWidth:0,textAlign:'right'}}>
                                  <div style={{color:m.played&&m.winner?.code===m.p2?.code?'#22c55e':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2?.name||'TBD'}</div>
                                  {m.p2?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2.player}</div>}
                                </div>
                              </div>
                              <div style={{padding:'0 10px 8px'}}>
                                <WatchUrlInput matchId={m.id} initialUrl={m.watchUrl} placeholder="Rise 360 URL…"/>
                              </div>
                              {!m.played && m.p1?.name && m.p2?.name && (
                                <div style={{padding:'0 10px 10px',display:'flex',gap:4}}>
                                  {[{code:m.p1.code,name:m.p1.name},{code:m.p2.code,name:m.p2.name}].map(opt => (
                                    <button key={opt.code}
                                      onClick={() => setWinnerSelections(prev => ({...prev,[m.id]:prev[m.id]===opt.code?'':opt.code}))}
                                      style={{flex:1,padding:'5px 4px',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${sel===opt.code?'rgba(34,197,94,0.5)':'rgba(255,255,255,0.09)'}`,background:sel===opt.code?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.03)',color:sel===opt.code?'#22c55e':'rgba(255,255,255,0.55)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'DM Sans',system-ui,sans-serif",transition:'all 0.12s'}}>
                                      {opt.name}
                                    </button>
                                  ))}
                                  <button disabled={!sel||busy} onClick={() => resolveMatch(m.id, sel)}
                                    style={{padding:'5px 10px',borderRadius:6,fontSize:13,fontWeight:800,cursor:sel&&!busy?'pointer':'default',background:sel?'rgba(0,200,83,0.18)':'rgba(255,255,255,0.03)',border:`1px solid ${sel?'rgba(0,200,83,0.45)':'rgba(255,255,255,0.07)'}`,color:sel?'#22c55e':'rgba(255,255,255,0.2)',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0,transition:'all 0.12s'}}>
                                    {busy?'…':'✓'}
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
                      <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:8,fontFamily:"'DM Sans',system-ui,sans-serif"}}>Final</div>
                      <div style={{background:'rgba(255,200,0,0.05)',border:`1px solid ${m.played?'rgba(0,200,83,0.3)':'rgba(255,200,0,0.2)'}`,borderRadius:7,overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 10px',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                          <span style={{color:'#ffc107',fontSize:12,fontWeight:700,letterSpacing:'0.12em',fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:'uppercase'}}>Final</span>
                          {m.played && <span style={{color:'#22c55e',fontSize:12,fontWeight:700}}>✓ {m.winner?.name}</span>}
                        </div>
                        <div style={{padding:'7px 10px',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:m.played&&m.winner?.code===m.p1?.code?'#22c55e':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</div>
                            {m.p1?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:1}}>{m.p1.player}</div>}
                          </div>
                          <span style={{color:'rgba(255,255,255,0.2)',fontSize:12,flexShrink:0}}>{m.played?`${m.p1Score??'–'}-${m.p2Score??'–'}`:'vs'}</span>
                          <div style={{flex:1,minWidth:0,textAlign:'right'}}>
                            <div style={{color:m.played&&m.winner?.code===m.p2?.code?'#22c55e':m.played?'rgba(255,255,255,0.3)':'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p2?.name||'TBD'}</div>
                            {m.p2?.player&&<div style={{color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:1}}>{m.p2.player}</div>}
                          </div>
                        </div>
                        <div style={{padding:'0 10px 8px'}}>
                          <WatchUrlInput matchId={m.id} initialUrl={m.watchUrl} placeholder="Rise 360 URL…"/>
                        </div>
                        {!m.played && m.p1?.name && m.p2?.name && (
                          <div style={{padding:'0 10px 10px',display:'flex',gap:4}}>
                            {[{code:m.p1.code,name:m.p1.name},{code:m.p2.code,name:m.p2.name}].map(opt => (
                              <button key={opt.code}
                                onClick={() => setWinnerSelections(prev => ({...prev,[m.id]:prev[m.id]===opt.code?'':opt.code}))}
                                style={{flex:1,padding:'5px 4px',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${sel===opt.code?'rgba(34,197,94,0.5)':'rgba(255,255,255,0.09)'}`,background:sel===opt.code?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.03)',color:sel===opt.code?'#22c55e':'rgba(255,255,255,0.55)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'DM Sans',system-ui,sans-serif",transition:'all 0.12s'}}>
                                {opt.name}
                              </button>
                            ))}
                            <button disabled={!sel||busy} onClick={() => resolveMatch(m.id, sel)}
                              style={{padding:'5px 10px',borderRadius:6,fontSize:13,fontWeight:800,cursor:sel&&!busy?'pointer':'default',background:sel?'rgba(0,200,83,0.18)':'rgba(255,255,255,0.03)',border:`1px solid ${sel?'rgba(0,200,83,0.45)':'rgba(255,255,255,0.07)'}`,color:sel?'#22c55e':'rgba(255,255,255,0.2)',fontFamily:"'DM Sans',system-ui,sans-serif",flexShrink:0,transition:'all 0.12s'}}>
                              {busy?'…':'✓'}
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
        </SheetContent>
      </Sheet>

      {/* How it works dialog */}
      <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DialogContent className="max-w-lg w-[92vw]">
          <DialogHeader>
            <DialogTitle style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:28,letterSpacing:'0.04em',textTransform:'uppercase'}}>How It Works</DialogTitle>
          </DialogHeader>
          {swMode === 'bracket' ? (
            <div style={{display:'flex',flexDirection:'column',gap:20,paddingTop:6,fontSize:15,color:'rgba(255,255,255,0.8)',lineHeight:1.7}}>
              <p style={{margin:0}}>A knockout penalty shootout tournament — each round, two teams face off in a <strong style={{color:'#fff'}}>penalty shootout played in Articulate Rise 360</strong>.</p>
              <div>
                <div style={{fontSize:12,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:10}}>How to play</div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {[
                    ['1', 'Pick a match from the bracket and choose Team A or Team B.'],
                    ['2', 'The penalty shootout plays out live in Rise 360 — tap the watch link to follow along.'],
                    ['3', 'The winner advances. Keep picking matches as the bracket progresses!'],
                  ].map(([n, text]) => (
                    <div key={n} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(0,200,83,0.15)',border:'1.5px solid #22c55e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:'#22c55e',flexShrink:0}}>{n}</div>
                      <span style={{color:'rgba(255,255,255,0.75)',fontSize:14,lineHeight:1.6,paddingTop:3}}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,0.3)'}}>The bracket updates automatically after each result. Last team standing wins!</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:20,paddingTop:6,fontSize:15,color:'rgba(255,255,255,0.8)',lineHeight:1.7}}>
              <p style={{margin:0}}>Each participant is randomly assigned <strong style={{color:'#fff'}}>World Cup teams</strong>. You earn points as your teams progress through the tournament.</p>
              <div>
                <div style={{fontSize:12,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:10}}>Points per round</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'8px 20px'}}>
                  {[['Round of 32','5 pts'],['Round of 16','10 pts'],['Quarter-Final','20 pts'],['Semi-Final','35 pts'],['Runner-up','50 pts'],['Winner','100 pts']].map(([k,v]) => (
                    <><span key={k} style={{color:'rgba(255,255,255,0.7)',fontSize:14}}>{k}</span><span key={v} style={{color:'#22c55e',fontWeight:800,textAlign:'right',fontSize:15}}>{v}</span></>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:800,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:10}}>Bonus points</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'8px 20px'}}>
                  {[['Draw (any game)','+1 pt each'],['Win (any game)','+3 pts each'],['Top of group','+10 pts'],['Clean sheet (any game)','+5 pts each'],['Top scorer in tournament','+15 pts'],['Upset win (ranked >25 beats a top-25 team)','+6 pts (+3 bonus)']].map(([k,v]) => (
                    <><span key={k} style={{color:'rgba(255,255,255,0.7)',fontSize:14}}>{k}</span><span key={v} style={{color:'#ffc107',fontWeight:800,textAlign:'right',fontSize:15}}>{v}</span></>
                  ))}
                </div>
              </div>
              <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,0.3)'}}>Upset wins also earn the regular +3 win bonus, so an upset win = +6 pts total. Points accumulate across all your teams. The person with the most points at the end wins!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(false)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Tournament?</DialogTitle>
            <DialogDescription>This will permanently wipe all bracket data and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDeleteTournament}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top bar */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(3,13,26,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        {/* Main row */}
        <div style={{display:'flex',alignItems:'center',height:52,paddingLeft:4,paddingRight:12}}>
          {/* Hamburger */}
          <button onClick={() => setMenuOpen(v => !v)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 12px',display:'flex',flexDirection:'column',gap:4,alignItems:'center',justifyContent:'center',height:'100%',flexShrink:0}}>
            <span style={{display:'block',width:18,height:2,background:'#fff',borderRadius:1}}/>
            <span style={{display:'block',width:24,height:2,background:'#fff',borderRadius:1}}/>
            <span style={{display:'block',width:14,height:2,background:'#fff',borderRadius:1}}/>
          </button>
          {/* How it works */}
          <Button size="sm" onClick={() => setHowItWorksOpen(true)} className="h-8 px-3 text-xs tracking-wide shrink-0">How it works</Button>
          {/* Title + logo — centred via flex margin, taps to go home */}
          <div onClick={onHome} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,minWidth:0,cursor:'pointer'}}>
            <span style={{color:'#fff',fontSize:17,fontWeight:900,letterSpacing:'0.05em',textTransform:'uppercase',fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {tournamentName || 'DAF World Cup 2026'}
            </span>
            <img src="/daf-logo.png" alt="" style={{height:44,width:'auto',objectFit:'contain',flexShrink:0,filter:'drop-shadow(0 0 6px rgba(0,200,83,0.3))'}} draggable={false}/>
          </div>
          {/* Code — right (penalties section only) */}
          {swMode === 'bracket' && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2,flexShrink:0}}>
              {stageLabel && <span style={{color:'rgba(255,255,255,0.3)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:700,lineHeight:1}}>{stageLabel}</span>}
              {tournamentCode && <span style={{color:'#22c55e',fontSize:13,letterSpacing:'0.18em',fontWeight:800,lineHeight:1}}>{tournamentCode}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Sweepstake leaderboard */}
      {swMode === 'sweepstake' && <div style={{position:'relative',zIndex:1}}><ErrorBoundary key={`sw-${selectedSwId||'select'}`}>{(() => {
        const activeSw = sweepstakes?.find(s => s.id === selectedSwId);
        if (activeSw) return <SwDetailScreen sw={activeSw} wcBracket={wcBracket} onBack={() => setSelectedSwId(null)}/>;
        return <SwSelectScreen sweepstakes={sweepstakes} onSelect={id => setSelectedSwId(id)} isAdmin={isAdmin}/>;
      })()}</ErrorBoundary></div>}

      {/* Bracket tree + admin URL panel */}
      {swMode === 'bracket' && (<>
      {bracket ? (
        <div style={{display:'flex',flexDirection:'column',position:'relative',zIndex:1}}>
          <BracketTree bracket={bracket} myCode={myCode} onMatchClick={openMatch}/>
          {isAdmin && (
            <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',padding:'16px 12px 24px'}}>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:700,marginBottom:10,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                {['r32','r16','qf','sf','final'].includes(bracket.stage) ? {r32:'Round of 32',r16:'Round of 16',qf:'Quarter-Finals',sf:'Semi-Finals',final:'Final'}[bracket.stage] : 'Matches'} · URLs
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8}}>
              {(bracket.stage === 'final' ? [bracket.final].filter(Boolean) : (bracket[bracket.stage] || [])).map((m, i) => {
                const num = m.id === 'final' ? null : i + 1;
                return (
                  <div key={m.id} style={{display:'flex',flexDirection:'column',gap:6,padding:'12px',background:'rgba(4,14,28,0.85)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:8,boxShadow:'0 2px 12px rgba(0,0,0,0.4)'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      {num && <span style={{color:'#ff1744',fontSize:12,fontWeight:700,letterSpacing:'0.12em',fontFamily:"'DM Sans',system-ui,sans-serif",textTransform:'uppercase'}}>Match {num}</span>}
                      {m.played && <span style={{color:'#22c55e',fontSize:12,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.7)',display:'flex',gap:4,alignItems:'center'}}>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.p1?.name||'TBD'}</span>
                      <span style={{color:'rgba(255,255,255,0.25)',flexShrink:0,fontSize:12}}>vs</span>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{m.p2?.name||'TBD'}</span>
                    </div>
                    <WatchUrlInput matchId={m.id} initialUrl={m.watchUrl} placeholder="Rise 360 URL…"/>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:12,opacity:0.5,position:'relative',zIndex:1}}>
          <div style={{color:'#fff',fontSize:16,fontWeight:700,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.1em',textTransform:'uppercase'}}>No Active Tournament</div>
          {isAdmin && <div style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>Create one via the menu</div>}
        </div>
      )}

      </>)}

      {needsPick && !needsCode && (
        <MatchPicker
          bracket={bracket}
          onPicked={code => setMyCode(code)}
          onBack={onHome}
        />
      )}

      {/* Code entry — shown when no saved tournament code */}
      {needsCode && (
        <div style={{position:'fixed',inset:0,zIndex:10003,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:14}}>
            <button onClick={onHome} style={{all:'unset',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              ← Back
            </button>
            <div style={{textAlign:'center'}}>
              <p style={{color:'#ff1744',fontSize:12,letterSpacing:'0.3em',textTransform:'uppercase',fontWeight:700,margin:0}}>DAF World Cup 2026</p>
              <p style={{color:'#fff',fontSize:22,fontWeight:900,fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",letterSpacing:'0.05em',textTransform:'uppercase',margin:'6px 0 0'}}>Enter Tournament Code</p>
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
              background:'linear-gradient(135deg,#22c55e,#00a651)',border:'none',color:'#000',cursor:'pointer',
              fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>
              Load Tournament →
            </button>
            <button onClick={() => { setAdminPrompt(true); setAdminEmail(''); setAdminPass(''); setAdminErr(''); }} style={{
              background:'none',border:'none',color:'rgba(255,255,255,0.3)',fontSize:13,cursor:'pointer',
              letterSpacing:'0.05em',fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>
              Admin? Log in instead
            </button>
          </div>
        </div>
      )}
      {managingSweepstake && (
        <SweepstakeAdminPanel sweepstakes={sweepstakes} onClose={() => setManagingSweepstake(false)} onRefresh={onRefresh}/>
      )}

      {submitMatch && (
        <SubmitMatchScreen match={submitMatch} myCode={myCode} onClose={() => setSubmitMatchId(null)}/>
      )}

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:200,background:'rgba(3,13,26,0.97)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,0.09)',display:'flex',height:62,userSelect:'none'}}>
        <button onClick={onHome} style={{flex:1,border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,color:'rgba(255,255,255,0.38)',WebkitTapHighlightColor:'transparent'}}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:"'DM Sans',system-ui,sans-serif"}}>Home</span>
        </button>
        {[
          ['bracket','Penalties', <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 2c.93 0 1.84.13 2.7.37l-1.1 3.38-1.6.52-1.6-.52-1.1-3.38A7.97 7.97 0 0 1 12 4zM4.27 16.17l2.96-2.15 1.63.53.6 1.95-1.8 2.47a8.04 8.04 0 0 1-3.39-2.8zm3.39 4.06 1.8-2.47h2.08l1.8 2.47a8.02 8.02 0 0 1-5.68 0zm7.08-.26-1.8-2.47.6-1.95 1.63-.53 2.96 2.15a8.04 8.04 0 0 1-3.39 2.8zm4.07-4.34-2.45-1.78.6-4.1 3.07-1V9c0 1.13-.24 2.2-.66 3.17l-.56 2.66zM12 9.5l1.56 1.13-.6 4.1H11.04l-.6-4.1L12 9.5zm-4.92-.55 3.07 1 .6 4.1-2.45 1.78-.56-2.66A7.98 7.98 0 0 1 7 9v-.05h.08zM19.6 7.9l-3.07 1-1.6-.52-1.1-3.38A7.99 7.99 0 0 1 19.6 7.9z"/></svg>],
          ['sweepstake','Sweepstake', <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3H4v5c0 1.66 1.34 3 3 3s3-1.34 3-3V3H7zm0 6c-.55 0-1-.45-1-1V5h2v3c0 .55-.45 1-1 1zm10-6h-3v5c0 1.66 1.34 3 3 3s3-1.34 3-3V3h-3zm0 6c-.55 0-1-.45-1-1V5h2v3c0 .55-.45 1-1 1zm-5 4v2H9v2h2v4h2v-4h2v-2h-3v-2c2.76 0 5-2.24 5-5H5c0 2.76 2.24 5 5 5h2z"/></svg>],
        ].map(([mode,label,icon]) => (
          <button key={mode} onClick={() => { setMenuOpen(false); setSwMode(mode); }} style={{
            flex:1,border:'none',background:'none',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
            color: swMode===mode ? '#22c55e' : 'rgba(255,255,255,0.38)',
            borderTop: `2px solid ${swMode===mode ? '#22c55e' : 'transparent'}`,
            WebkitTapHighlightColor:'transparent',
          }}>
            {icon}
            <span style={{fontSize:10,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:"'DM Sans',system-ui,sans-serif"}}>{label}</span>
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => swMode === 'sweepstake' ? setManagingSweepstake(true) : setManaging(true)} style={{
            flex:1,border:'none',background:'none',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
            color:'#ffd700',
            WebkitTapHighlightColor:'transparent',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm9 11v-1a7 7 0 0 0-14 0v1h2v-1a5 5 0 0 1 10 0v1h2zm-5-5.5-1.5 1.5-3-3 1.5-1.5 1.5 1.5L18.5 8 20 9.5l-4 4z"/></svg>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',fontFamily:"'DM Sans',system-ui,sans-serif"}}>Admin</span>
          </button>
        )}
      </div>
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
        <p className="text-[13px] tracking-[0.4em] uppercase font-black text-green-400" style={{textShadow:'0 0 25px rgba(0,200,83,0.5)'}}>DAF World Cup 2026</p>
        <div className="text-4xl font-black tracking-wide text-foreground" style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",animation:'scaleIn 0.7s ease'}}>{name}</div>
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
  const [globalAdminPrompt, setGlobalAdminPrompt] = useState(false);
  const [globalAdminEmail, setGlobalAdminEmail] = useState('');
  const [globalAdminPass, setGlobalAdminPass] = useState('');
  const [globalAdminErr, setGlobalAdminErr] = useState('');

  const refreshState = useCallback(async () => {
    try {
      const data = await fetch('/api/state', { cache: 'no-store' }).then(r => r.json());
      setServerState(data);
    } catch (_) {}
  }, []);

  // Poll server state — fast during active match, slow otherwise
  const serverStateRef = useRef(null);
  useEffect(() => { serverStateRef.current = serverState; }, [serverState]);
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const schedule = () => {
      const interval = serverStateRef.current?.activeMatch ? 1500 : 5000;
      timer = setTimeout(poll, interval);
    };
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
      if (!cancelled) schedule();
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
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
        <div style={{height:'100%',background:'#010d1a',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'url(/bg.png)',backgroundSize:'cover',backgroundPosition:'center',opacity:0.18}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(1,13,26,0.3) 0%,rgba(1,13,26,0.9) 100%)'}}/>
          <div style={{position:'relative',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:28}}>
            <img src="/daf-logo.png" alt="" style={{height:160,objectFit:'contain'}}/>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <span style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:38,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',color:'#fff'}}>DAF World Cup</span>
              <span style={{fontFamily:"'EA Sans Curves','Big Shoulders Display',sans-serif",fontSize:38,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',color:'#00c853'}}>2026</span>
            </div>
            {/* Thin progress bar */}
            <div style={{width:100,height:2,background:'rgba(255,255,255,0.1)',borderRadius:1,overflow:'hidden'}}>
              <div style={{height:'100%',background:'#00c853',animation:'loadBar 2s ease-in-out infinite',borderRadius:1}}/>
            </div>
          </div>
        </div>
      )}

      {screen === 'home' && (
        <div style={W}>
          <HomeScreen serverState={serverState} onSelect={handleSelectMode} onAdminLogin={handleAdminManage} isAdmin={adminSession} />
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
            sweepstakes={serverState?.sweepstakes || []}
            wcBracket={serverState?.wcBracket || null}
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
            onRefresh={refreshState}
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

      {/* Global admin login — available on every screen */}
      {!adminSession && (
        <button
          onClick={() => { setGlobalAdminEmail(''); setGlobalAdminPass(''); setGlobalAdminErr(''); setGlobalAdminPrompt(true); }}
          style={{position:'fixed',bottom:14,right:14,zIndex:10010,background:'rgba(6,15,30,0.85)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 12px',color:'rgba(255,255,255,0.35)',fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',backdropFilter:'blur(8px)',fontFamily:"'DM Sans',system-ui,sans-serif"}}
        >Admin</button>
      )}
      {globalAdminPrompt && (
        <div style={{position:'fixed',inset:0,zIndex:10011,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseDown={e => { if (e.target === e.currentTarget) { setGlobalAdminPrompt(false); setGlobalAdminErr(''); } }}>
          <div style={{background:'#060f1e',border:'1px solid rgba(0,200,83,0.2)',borderRadius:10,padding:'24px 20px',width:280,display:'flex',flexDirection:'column',gap:10}}
            onMouseDown={e => e.stopPropagation()}>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,letterSpacing:'0.2em',textTransform:'uppercase',margin:0}}>Admin Access</p>
            <Input type="email" placeholder="Email" value={globalAdminEmail} onChange={e => setGlobalAdminEmail(e.target.value)} autoFocus/>
            <Input type="password" placeholder="Password" value={globalAdminPass} onChange={e => setGlobalAdminPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') {
                if (globalAdminEmail.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && globalAdminPass === 'Mexico@#1000') {
                  sessionStorage.setItem('psc_admin', '1');
                  setAdminSession(true);
                  setGlobalAdminPrompt(false);
                  handleAdminLogin();
                } else { setGlobalAdminErr('Invalid credentials'); }
              }}}/>
            {globalAdminErr && <p style={{color:'#ff4444',fontSize:13,margin:0}}>{globalAdminErr}</p>}
            <Button size="sm" onClick={() => {
              if (globalAdminEmail.trim().toLowerCase() === 'thehub@dialaflight.co.uk' && globalAdminPass === 'Mexico@#1000') {
                sessionStorage.setItem('psc_admin', '1');
                setAdminSession(true);
                setGlobalAdminPrompt(false);
                handleAdminLogin();
              } else { setGlobalAdminErr('Invalid credentials'); }
            }}>Unlock</Button>
          </div>
        </div>
      )}
    </div>
  );
}
