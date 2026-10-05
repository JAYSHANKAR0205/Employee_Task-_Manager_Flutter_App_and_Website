import React, { useState, useEffect } from 'react';

export const ANIM_STYLE = `
  @keyframes orb-float-1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(40px,-50px) scale(1.1); }
    66%      { transform: translate(-30px,30px) scale(0.95); }
  }
  @keyframes orb-float-2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(-50px,40px) scale(1.08); }
    70%     { transform: translate(30px,-20px) scale(0.93); }
  }
  @keyframes orb-float-3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(20px,60px) scale(1.12); }
  }
  @keyframes grid-drift {
    0%   { transform: translateY(0); }
    100% { transform: translateY(60px); }
  }
  @keyframes ring-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ring-spin-rev {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes dash-flow {
    0%   { stroke-dashoffset: 800; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes pulse-glow {
    0%,100% { opacity:0.6; transform:scale(1); }
    50%     { opacity:1;   transform:scale(1.04); }
  }
  @keyframes card-float {
    0%,100% { transform: translateY(0px) rotate(-1.5deg); }
    50%     { transform: translateY(-12px) rotate(-1.5deg); }
  }
  @keyframes card2-float {
    0%,100% { transform: translateY(0px) rotate(2deg); }
    50%     { transform: translateY(-8px) rotate(2deg); }
  }
  @keyframes badge-pop {
    0%   { transform: scale(0.8); opacity:0; }
    60%  { transform: scale(1.05); opacity:1; }
    100% { transform: scale(1);   opacity:1; }
  }
  @keyframes counter-up {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes twinkle {
    0%,100% { opacity:0.2; transform:scale(0.8); }
    50%     { opacity:1;   transform:scale(1.2); }
  }
  @keyframes sweep-line {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
`;

const STARS = [
  {top:'12%',left:'18%',delay:'0s'},
  {top:'22%',left:'72%',delay:'0.8s'},
  {top:'55%',left:'8%', delay:'1.4s'},
  {top:'68%',left:'80%',delay:'0.3s'},
  {top:'80%',left:'30%',delay:'1.8s'},
  {top:'38%',left:'90%',delay:'0.6s'},
  {top:'90%',left:'55%',delay:'2.1s'},
  {top:'6%', left:'45%',delay:'1.1s'},
];

const BARS = [
  { label:'UI Design', pct:'55%',  from:'#a855f7', to:'#22d3ee' },
  { label:'Branding',  pct:'73%',  from:'#22d3ee', to:'#ec4899' },
  { label:'Motion',    pct:'88%',  from:'#ec4899', to:'#a855f7' },
];

const AnimationPanel: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 184200;
    const step = Math.ceil(target / 80);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="hidden lg:flex lg:w-[40%] relative overflow-hidden items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1a0533 40%,#0f2027 100%)' }}
    >
      {/* Grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ animation:'grid-drift 8s linear infinite alternate' }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="agrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0L0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#agrid)" />
      </svg>

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{position:'absolute',top:'-10%',right:'-5%',width:'420px',height:'420px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.35) 0%,transparent 70%)',animation:'orb-float-1 14s ease-in-out infinite',filter:'blur(2px)'}}/>
        <div style={{position:'absolute',bottom:'-5%',left:'-8%',width:'380px',height:'380px',borderRadius:'50%',background:'radial-gradient(circle,rgba(34,211,238,0.28) 0%,transparent 70%)',animation:'orb-float-2 18s ease-in-out infinite',filter:'blur(2px)'}}/>
        <div style={{position:'absolute',top:'35%',left:'30%',width:'260px',height:'260px',borderRadius:'50%',background:'radial-gradient(circle,rgba(236,72,153,0.22) 0%,transparent 70%)',animation:'orb-float-3 11s ease-in-out infinite',filter:'blur(1px)'}}/>
      </div>

      {/* Concentric rotating rings + centre orb */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outer ring */}
        <div style={{position:'absolute',width:'480px',height:'480px',borderRadius:'50%',border:'1px dashed rgba(168,85,247,0.25)',animation:'ring-spin 30s linear infinite'}}>
          <div style={{position:'absolute',top:'-4px',left:'50%',transform:'translateX(-50%)',width:'8px',height:'8px',borderRadius:'50%',background:'rgba(168,85,247,0.9)',boxShadow:'0 0 12px 4px rgba(168,85,247,0.5)'}}/>
        </div>
        {/* Mid ring */}
        <div style={{position:'absolute',width:'320px',height:'320px',borderRadius:'50%',border:'1px dashed rgba(34,211,238,0.2)',animation:'ring-spin-rev 20s linear infinite'}}>
          <div style={{position:'absolute',bottom:'-4px',left:'50%',transform:'translateX(-50%)',width:'6px',height:'6px',borderRadius:'50%',background:'rgba(34,211,238,0.9)',boxShadow:'0 0 10px 3px rgba(34,211,238,0.5)'}}/>
        </div>
        {/* Inner ring */}
        <div style={{position:'absolute',width:'180px',height:'180px',borderRadius:'50%',border:'1px solid rgba(236,72,153,0.18)',animation:'ring-spin 12s linear infinite'}}>
          <div style={{position:'absolute',top:'-3px',right:'-3px',width:'6px',height:'6px',borderRadius:'50%',background:'rgba(236,72,153,0.9)',boxShadow:'0 0 8px 3px rgba(236,72,153,0.5)'}}/>
        </div>
        {/* Centre pulse */}
        <div style={{width:'60px',height:'60px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.8) 0%,rgba(34,211,238,0.4) 100%)',boxShadow:'0 0 30px 10px rgba(168,85,247,0.3)',animation:'pulse-glow 3s ease-in-out infinite'}}/>
      </div>

      {/* Arc path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(168,85,247,0)"/>
            <stop offset="50%"  stopColor="rgba(168,85,247,0.8)"/>
            <stop offset="100%" stopColor="rgba(34,211,238,0)"/>
          </linearGradient>
        </defs>
        <path d="M -50 400 Q 150 100 300 300 T 650 200" fill="none" stroke="url(#arcGrad)" strokeWidth="1.5" strokeDasharray="800" style={{animation:'dash-flow 6s linear infinite'}}/>
      </svg>

      {/* Twinkling stars */}
      {STARS.map((s,i) => (
        <div key={i} style={{position:'absolute',top:s.top,left:s.left,width:'4px',height:'4px',borderRadius:'50%',background:'white',animation:`twinkle ${2.5+i*0.3}s ease-in-out infinite`,animationDelay:s.delay}}/>
      ))}

      {/* Card 1 — live counter */}
      <div style={{position:'absolute',top:'14%',left:'8%',background:'rgba(255,255,255,0.07)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'14px 18px',minWidth:'170px',animation:'card-float 5s ease-in-out infinite',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'6px'}}>Global Creatives</p>
        <p style={{color:'white',fontSize:'26px',fontWeight:900,letterSpacing:'-0.02em',lineHeight:1,animation:'counter-up 1s ease-out forwards'}}>
          {count.toLocaleString()}
        </p>
        <div style={{marginTop:'8px',height:'3px',borderRadius:'2px',background:'linear-gradient(90deg,#a855f7,#22d3ee)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)',animation:'sweep-line 2s linear infinite'}}/>
        </div>
      </div>

      {/* Card 2 — activity bars */}
      <div style={{position:'absolute',bottom:'20%',right:'6%',background:'rgba(255,255,255,0.07)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'14px 18px',minWidth:'160px',animation:'card2-float 6s ease-in-out infinite',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:'8px'}}>Live Activity</p>
        {BARS.map(b => (
          <div key={b.label} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}>
            <div style={{width:b.pct,height:'4px',borderRadius:'2px',background:`linear-gradient(90deg,${b.from},${b.to})`}}/>
            <span style={{color:'rgba(255,255,255,0.6)',fontSize:'9px',fontWeight:600,whiteSpace:'nowrap'}}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Badge — new member */}
      <div style={{position:'absolute',bottom:'32%',left:'7%',background:'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(34,211,238,0.15))',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(168,85,247,0.3)',borderRadius:'50px',padding:'8px 14px',display:'flex',alignItems:'center',gap:'8px',animation:'badge-pop 1.5s cubic-bezier(0.34,1.56,0.64,1) forwards',boxShadow:'0 0 20px rgba(168,85,247,0.2)'}}>
        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 8px 2px rgba(74,222,128,0.6)'}}/>
        <span style={{color:'white',fontSize:'11px',fontWeight:700}}>New member joined</span>
      </div>

      {/* Bottom headline */}
      <div style={{position:'absolute',bottom:'48px',left:'40px',right:'40px',zIndex:20}}>
        <h2 style={{fontSize:'clamp(22px,2.8vw,32px)',fontWeight:900,color:'white',lineHeight:1.2,letterSpacing:'-0.02em',marginBottom:'10px',textShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>
          Discover the world's top<br/>designers &amp; creatives.
        </h2>
        <p style={{color:'rgba(255,255,255,0.6)',fontSize:'13px',fontWeight:500,lineHeight:1.6}}>
          Join millions of designers and agencies sharing their portfolio and finding their next gig.
        </p>
      </div>
    </div>
  );
};

export default AnimationPanel;
