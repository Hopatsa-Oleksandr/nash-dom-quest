import React, { useEffect, useState } from 'react';
import { GameState, PlayerRole, RemoteSceneEffect, SceneViewConfig } from '../types/game';

export type InterferenceLevel = 'idle' | 'data' | 'radio';

export interface SceneFocusPoint {
  x: number;
  y: number;
  active: boolean;
}

interface SceneArtworkProps {
  view: SceneViewConfig;
  gameState: GameState;
  interferenceLevel?: InterferenceLevel;
  remoteEffect?: RemoteSceneEffect | null;
  playerRole?: PlayerRole;
  focusPoint?: SceneFocusPoint | null;
  smokeActive?: boolean;
}

const DEFAULT_SCENE_BACKGROUNDS: Record<SceneViewConfig['illustrationId'], string> = {
  'scene1-shared': '/assets/scene1.jpg',
  'scene2-p1': '/assets/scene2-p1.jpg',
  'scene2-p2': '/assets/scene2-p2.jpg',
};

export const SceneArtwork: React.FC<SceneArtworkProps> = ({
  view,
  gameState,
  interferenceLevel = 'idle',
  remoteEffect = null,
  playerRole = 'p1',
  focusPoint = null,
  smokeActive,
}) => {
  const resolvedBackgroundUrl =
    view.backgroundUrl || DEFAULT_SCENE_BACKGROUNDS[view.illustrationId];
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const isSmokeActive = smokeActive ?? gameState.phase === 'victory';

  // Depth-of-Field radial mask: keeps the active/hovered hotspot sharp while subtly blurring surrounding areas
  const dofCenterX = focusPoint ? `${focusPoint.x}%` : '50%';
  const dofCenterY = focusPoint ? `${focusPoint.y}%` : '50%';
  const dofMask = focusPoint?.active
    ? `radial-gradient(circle at ${dofCenterX} ${dofCenterY}, transparent 0%, transparent 11%, rgba(0, 0, 0, 0.55) 22%, black 36%)`
    : `radial-gradient(circle at ${dofCenterX} ${dofCenterY}, transparent 0%, transparent 14%, rgba(0, 0, 0, 0.5) 26%, black 42%)`;

  const depthOfFieldOverlay = (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out ${
        focusPoint ? (focusPoint.active ? 'opacity-100' : 'opacity-90') : 'opacity-0'
      }`}
      style={{
        backdropFilter: focusPoint?.active ? 'blur(6px) brightness(0.88)' : 'blur(3.5px) brightness(0.94)',
        WebkitBackdropFilter: focusPoint?.active ? 'blur(6px) brightness(0.88)' : 'blur(3.5px) brightness(0.94)',
        maskImage: dofMask,
        WebkitMaskImage: dofMask,
      }}
      aria-hidden="true"
    />
  );

  const smokeOverlay = (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000 ease-out ${
        isSmokeActive ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {isSmokeActive && (
        <>
          <div className="absolute -inset-24 scene-smoke-layer-a" />
          <div className="absolute -inset-24 scene-smoke-layer-b" />
          <div className="absolute inset-x-0 bottom-0 h-[68%] scene-smoke-rise" />
        </>
      )}
    </div>
  );

  // Remote commands from Carriage B (p1) visibly target Vestibule A (p2) and shared Scene 1
  const showRemoteEffect =
    Boolean(remoteEffect) && (playerRole === 'p2' || view.illustrationId === 'scene1-shared');

  const remoteOverlayClass =
    showRemoteEffect && remoteEffect
      ? remoteEffect.kind === 'light'
        ? 'remote-effect-light'
        : remoteEffect.kind === 'alarm'
          ? 'remote-effect-alarm'
          : remoteEffect.kind === 'surge'
            ? 'remote-effect-surge'
            : 'remote-effect-ping'
      : '';

  const aberrationClass =
    interferenceLevel === 'radio'
      ? 'scene-aberration-radio'
      : interferenceLevel === 'data'
        ? 'scene-aberration-data'
        : 'scene-aberration-idle';

  const fringeClass =
    interferenceLevel === 'radio'
      ? 'scene-rgb-fringe-radio'
      : interferenceLevel === 'data'
        ? 'scene-rgb-fringe-data'
        : 'scene-rgb-fringe-idle';

  // Reset image status whenever the scene background path changes
  useEffect(() => {
    setImgStatus('loading');
  }, [resolvedBackgroundUrl]);

  const chromaticFilterDefs = (
    <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
      <defs>
        {/* Medium RGB chromatic aberration for PeerJS data packets */}
        <filter id="chromatic-aberration-data" x="-5%" y="-5%" width="110%" height="110%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          <feOffset in="red" dx="-2.2" dy="0" result="redShift" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="cyan"
          />
          <feOffset in="cyan" dx="2.2" dy="0" result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>

        {/* Strong RGB chromatic aberration when holding PTT Radio */}
        <filter id="chromatic-aberration-radio" x="-5%" y="-5%" width="110%" height="110%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          <feOffset in="red" dx="-4.5" dy="-0.5" result="redShift" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="cyan"
          />
          <feOffset in="cyan" dx="4.5" dy="0.5" result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>
      </defs>
    </svg>
  );

  const keypadSolved = gameState.flags.includes('keypad_unlocked');
  const fuseInserted = gameState.flags.includes('fuse_inserted');
  const fuseTaken = gameState.solvedHotspots.includes('hs-luggage-rack');
  const hatchOpened = gameState.solvedHotspots.includes('hs-seat-hatch');
  const trashTaken = gameState.solvedHotspots.includes('hs-trashbin');
  const clueRead = gameState.scene1.clueRead;
  const hatchHasItem = Boolean(gameState.transferHatchItem);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#090b10] select-none pointer-events-none">
      {chromaticFilterDefs}
      <div className={`relative w-full h-full ${aberrationClass}`}>
        {/* Primary photo background: automatically tries /assets/scene1.jpg, scene2-p1.jpg, scene2-p2.jpg first */}
        {imgStatus !== 'error' && (
          <img
            key={resolvedBackgroundUrl}
            src={resolvedBackgroundUrl}
            alt={view.locationLabel}
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth > 0) {
                setImgStatus('loaded');
              } else {
                setImgStatus('error');
              }
            }}
            onError={() => setImgStatus('error')}
            className={`absolute inset-0 w-full h-full object-cover brightness-[0.84] contrast-[1.06] transition-opacity duration-200 ${
              imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Fallback SVG illustration rendered only when the photo fails to load (or while fetching) */}
        {imgStatus !== 'loaded' && (
          <>
      {view.illustrationId === 'scene1-shared' && (
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            {/* Dark Stuttgart S-Bahn ceiling & wall gradients */}
            <linearGradient id="s1Ceiling" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e222b" />
              <stop offset="55%" stopColor="#2b303c" />
              <stop offset="100%" stopColor="#171b24" />
            </linearGradient>
            <linearGradient id="s1Wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#323846" />
              <stop offset="55%" stopColor="#252a35" />
              <stop offset="100%" stopColor="#161922" />
            </linearGradient>
            <linearGradient id="s1Floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#191c23" />
              <stop offset="100%" stopColor="#0b0d12" />
            </linearGradient>
            <linearGradient id="dbDoorRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a31c24" />
              <stop offset="50%" stopColor="#82141b" />
              <stop offset="100%" stopColor="#560d12" />
            </linearGradient>
            <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#060b18" />
              <stop offset="65%" stopColor="#0e1a30" />
              <stop offset="100%" stopColor="#162238" />
            </linearGradient>
            <radialGradient id="emergWarmGlow" cx="50%" cy="20%" r="70%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.18" />
              <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#090b10" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="phoneGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
            {/* Iconic Stuttgart S-Bahn blue checkered seat fabric */}
            <pattern id="sbahnCheck" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#1b3a73" />
              <rect x="2" y="2" width="6" height="6" rx="1" fill="#0f234c" />
              <rect x="10" y="10" width="5" height="5" rx="1" fill="#2c59a8" opacity="0.7" />
              <rect x="10" y="2" width="4" height="4" fill="#142d5e" />
            </pattern>
            {/* Perforated ceiling & grille pattern */}
            <pattern id="perfDots" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.4" fill="#0f1218" opacity="0.6" />
            </pattern>
            {/* Floor speckles */}
            <pattern id="floorSpeckle" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="10" r="1.1" fill="#52525b" opacity="0.35" />
              <circle cx="22" cy="6" r="0.9" fill="#a1a1aa" opacity="0.2" />
              <circle cx="16" cy="24" r="1.3" fill="#3f3f46" opacity="0.4" />
              <circle cx="28" cy="20" r="0.8" fill="#71717a" opacity="0.25" />
            </pattern>
          </defs>

          {/* Main Cabin Shell */}
          <rect width="1600" height="900" fill="#10131a" />
          {/* Curved ceiling panel */}
          <path d="M0 0 H1600 V245 Q800 185 0 245 Z" fill="url(#s1Ceiling)" />
          <path d="M290 65 H1390 L1330 225 H345 Z" fill="url(#perfDots)" opacity="0.85" />
          {/* Emergency warm ceiling light diffuser strip */}
          <rect x="0" y="42" width="1600" height="16" fill="#fef3c7" opacity="0.28" className="animate-led-flicker" />
          <rect x="0" y="58" width="1600" height="5" fill="#f59e0b" opacity="0.22" />
          {/* Recessed square ceiling LEDs */}
          {[140, 320, 520, 740, 960, 1180, 1400].map((lx) => (
            <g key={lx}>
              <rect x={lx} y="14" width="14" height="12" rx="2" fill="#fde68a" opacity="0.55" />
              <rect x={lx - 4} y="10" width="22" height="20" rx="4" fill="#fbbf24" opacity="0.12" />
            </g>
          ))}

          {/* Main Side Wall */}
          <rect x="290" y="210" width="1080" height="450" fill="url(#s1Wall)" />
          {/* Speckled Floor */}
          <polygon points="0,660 1600,660 1600,900 0,900" fill="url(#s1Floor)" />
          <polygon points="0,660 1600,660 1600,900 0,900" fill="url(#floorSpeckle)" />
          {/* Red doorway floor safety mat on left */}
          <polygon points="0,665 305,665 255,830 0,830" fill="#5e1b22" opacity="0.8" />
          <line x1="255" y1="830" x2="305" y2="665" stroke="#a1a1aa" strokeWidth="3" opacity="0.45" />

          {/* LEFT: Iconic DB Red S-Bahn Sliding Doors */}
          <g>
            <rect x="0" y="195" width="235" height="475" fill="url(#dbDoorRed)" />
            <line x1="115" y1="195" x2="115" y2="670" stroke="#2d070a" strokeWidth="5" />
            {/* Left & Right Door Windows */}
            <rect x="18" y="245" width="80" height="215" rx="14" fill="url(#nightSky)" stroke="#18181b" strokeWidth="6" />
            <rect x="132" y="245" width="80" height="215" rx="14" fill="url(#nightSky)" stroke="#18181b" strokeWidth="6" />
            {/* Faint distant platform lights in door windows */}
            <circle cx="58" cy="375" r="3" fill="#fde68a" opacity="0.7" />
            <circle cx="176" cy="368" r="2.5" fill="#fbbf24" opacity="0.6" />
            <line x1="22" y1="415" x2="94" y2="415" stroke="#1e293b" strokeWidth="8" />
            <line x1="136" y1="415" x2="208" y2="415" stroke="#1e293b" strokeWidth="8" />
            {/* Door open button (dim red) */}
            <circle cx="115" cy="515" r="14" fill="#27272a" stroke="#71717a" strokeWidth="2" />
            <circle cx="115" cy="515" r="8" fill="#dc2626" opacity="0.8" />
          </g>

          {/* Door Pillar & SPRECHSTELLE Intercom Panel (Hotspot x:16%, y:47% -> 256, 423) */}
          <rect x="235" y="190" width="68" height="480" fill="#232833" stroke="#14171f" strokeWidth="2" />
          <g transform="translate(242, 368)">
            <rect width="50" height="112" rx="6" fill="#181b22" stroke="#52525b" strokeWidth="2" />
            {/* Red emergency stripe */}
            <rect x="4" y="4" width="42" height="18" rx="3" fill="#b91c1c" />
            <text x="25" y="16" fill="#fef2f2" fontSize="6.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              NOTRUF
            </text>
            {/* Speaker grille */}
            {[30, 36, 42, 48, 54].map((gy) => (
              <line key={gy} x1="10" y1={gy} x2="40" y2={gy} stroke="#52525b" strokeWidth="2" />
            ))}
            {/* Triangular DB keyhole */}
            <circle cx="25" cy="76" r="9" fill="#27272a" stroke="#a1a1aa" strokeWidth="1.5" />
            <polygon points="25,71 30,80 20,80" fill="#090b10" />
            {/* Status LED */}
            <circle cx="25" cy="98" r="4" fill="#ef4444" className="animate-led-flicker" />
          </g>

          {/* Overhead Green "S-Bahn Stuttgart" Poster (inspired by user photo!) */}
          <g transform="translate(650, 148)">
            <rect width="380" height="58" rx="4" fill="#1b4328" stroke="#0f2918" strokeWidth="2" />
            <rect x="12" y="10" width="52" height="12" rx="2" fill="#22c55e" opacity="0.85" />
            <text x="16" y="19" fill="#052e16" fontSize="8" fontWeight="800" fontFamily="sans-serif">
              S-Bahn S2
            </text>
            <text x="14" y="37" fill="#dcfce7" fontSize="13" fontWeight="700" fontFamily="sans-serif">
              Ein Ticket, unzählige Möglichkeiten.
            </text>
            <text x="14" y="50" fill="#86efac" fontSize="8" opacity="0.75" fontFamily="sans-serif">
              S-Bahn Stuttgart · VVS Tarifzone
            </text>
            {/* Mini D-Ticket graphic on right */}
            <rect x="322" y="8" width="44" height="42" rx="3" fill="#e4e4e7" opacity="0.9" />
            <rect x="330" y="16" width="28" height="22" fill="#18181b" opacity="0.75" />
          </g>

          {/* Overhead Perforated Metal Luggage Rack */}
          <g transform="translate(465, 224)">
            <rect width="750" height="24" rx="4" fill="#3f4654" stroke="#64748b" strokeWidth="1.5" />
            <rect x="10" y="4" width="730" height="14" fill="url(#perfDots)" />
            <rect x="0" y="20" width="750" height="5" fill="#1f242e" />
          </g>

          {/* LARGE S-BAHN SIDE WINDOW (Night exterior outside Stuttgart) */}
          <g>
            <rect
              x="605"
              y="265"
              width="580"
              height="215"
              rx="22"
              fill="url(#nightSky)"
              stroke="#1e2430"
              strokeWidth="12"
            />
            {/* Night hills, railway catenary poles & misty lights */}
            <path d="M615 440 Q760 400 920 432 T1175 415 V472 H615 Z" fill="#09111f" />
            {/* Catenary wires */}
            <line x1="615" y1="320" x2="1175" y2="338" stroke="#334155" strokeWidth="1.5" opacity="0.55" />
            <line x1="615" y1="335" x2="1175" y2="352" stroke="#334155" strokeWidth="1" opacity="0.4" />
            {/* Distant mast & signal lamp */}
            <rect x="745" y="285" width="7" height="180" fill="#111827" />
            <circle cx="755" cy="340" r="4" fill="#ef4444" opacity="0.85" />
            <circle cx="755" cy="340" r="14" fill="#ef4444" opacity="0.2" />
            {/* Blurry Stuttgart night lights */}
            <circle cx="960" cy="405" r="3" fill="#fde68a" opacity="0.7" />
            <circle cx="1015" cy="396" r="2.5" fill="#fbbf24" opacity="0.55" />
            <circle cx="1075" cy="410" r="3.5" fill="#38bdf8" opacity="0.4" />
            {/* Subtle glass reflection */}
            <path d="M640 275 L735 275 L665 465 L615 465 Z" fill="#ffffff" opacity="0.035" />
          </g>

          {/* TRASH BIN UNDER WINDOW (Hotspot x:56%, y:59% -> 896, 531) */}
          <g transform="translate(845, 498)">
            {/* Side wall mounts like the Stuttgart photo */}
            <circle cx="-30" cy="28" r="10" fill="#2c323f" stroke="#475569" strokeWidth="2" />
            <circle cx="132" cy="28" r="10" fill="#2c323f" stroke="#475569" strokeWidth="2" />
            {/* Metal hinged trash bin */}
            <rect width="102" height="66" rx="6" fill="#2c313b" stroke="#64748b" strokeWidth="2" />
            <rect x="6" y="6" width="90" height="12" rx="2" fill="#181b22" />
            <line x1="16" y1="36" x2="86" y2="36" stroke="#475569" strokeWidth="2" />
            {/* Glint of screwdriver handle peeking out only after reading conductor SMS */}
            {clueRead && !trashTaken && (
              <path d="M64 14 L78 4 L84 9 L70 18 Z" fill="#dc2626" stroke="#fca5a5" strokeWidth="1" />
            )}
          </g>

          {/* Radiator grille under trash bin */}
          <rect x="755" y="582" width="285" height="72" rx="4" fill="#1d222c" stroke="#334155" strokeWidth="1.5" />
          {[594, 606, 618, 630, 642].map((ry) => (
            <line key={ry} x1="768" y1={ry} x2="1028" y2={ry} stroke="#0f1218" strokeWidth="3" />
          ))}

          {/* LEFT FACING BLUE CHECKERED S-BAHN SEATS */}
          <g>
            {/* Seat outer molded grey frame */}
            <path d="M345 360 L440 360 L462 535 L650 540 L650 615 L445 640 L345 640 Z" fill="#525a69" stroke="#272c36" strokeWidth="3" />
            {/* Under-seat base box */}
            <rect x="358" y="625" width="235" height="118" rx="4" fill="#262c38" stroke="#3f4756" strokeWidth="2" />
            <rect x="385" y="645" width="175" height="82" fill="url(#perfDots)" />
            {/* Dark charcoal headrest */}
            <path d="M350 340 Q350 322 374 322 L434 322 Q450 322 452 342 L456 400 L350 400 Z" fill="#1e232d" stroke="#334155" strokeWidth="2" />
            {/* Backrest blue checkered cushion */}
            <polygon points="360,402 452,402 478,540 385,540" fill="url(#sbahnCheck)" stroke="#10254a" strokeWidth="2" />
            {/* Seat bench blue checkered cushion */}
            <polygon points="385,540 645,540 622,608 380,608" fill="url(#sbahnCheck)" stroke="#10254a" strokeWidth="2" />
            {/* Curved silver grab pole (just like the photo!) */}
            <path d="M350 165 Q300 400 342 750" stroke="#94a3b8" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M350 165 Q300 400 342 750" stroke="#e2e8f0" strokeWidth="3" fill="none" opacity="0.45" />
          </g>

          {/* FORGOTTEN SMARTPHONE ON LEFT SEAT (Hotspot x:34%, y:62% -> 544, 558) */}
          <g transform="translate(520, 540)">
            <ellipse cx="26" cy="18" rx="48" ry="24" fill="url(#phoneGlow)" />
            <g transform="rotate(-14 24 18)">
              <rect x="2" y="4" width="46" height="28" rx="5" fill="#090d16" stroke="#64748b" strokeWidth="2" />
              <rect x="6" y="7" width="38" height="22" rx="2.5" fill="#0ea5e9" opacity="0.85" />
              <line x1="12" y1="14" x2="36" y2="14" stroke="#e0f2fe" strokeWidth="2" />
              <line x1="12" y1="20" x2="29" y2="20" stroke="#bae6fd" strokeWidth="1.5" />
            </g>
          </g>

          {/* RIGHT FACING BLUE CHECKERED S-BAHN SEATS + UNDER-SEAT HATCH (Hotspot x:72%, y:78% -> 1152, 702) */}
          <g>
            {/* Under-seat technical box with HATCH */}
            <rect x="1038" y="635" width="245" height="135" rx="5" fill="#232934" stroke="#475569" strokeWidth="2.5" />
            {/* Maintenance hatch panel */}
            <rect
              x="1062"
              y="652"
              width="192"
              height="102"
              rx="4"
              fill={hatchOpened ? '#0b0e14' : '#2d3545'}
              stroke={hatchOpened ? '#10b981' : '#64748b'}
              strokeWidth="2.5"
            />
            {!hatchOpened ? (
              <>
                <rect x="1076" y="666" width="164" height="74" fill="url(#perfDots)" />
                {/* 4 corner screws */}
                <circle cx="1074" cy="664" r="4" fill="#94a3b8" />
                <circle cx="1242" cy="664" r="4" fill="#94a3b8" />
                <circle cx="1074" cy="742" r="4" fill="#94a3b8" />
                <circle cx="1242" cy="742" r="4" fill="#94a3b8" />
                {/* Subtle metallic glint inside */}
                <path d="M1140 704 L1176 704" stroke="#f59e0b" strokeWidth="2" opacity="0.45" />
              </>
            ) : (
              <text x="1158" y="708" fill="#10b981" fontSize="13" fontFamily="monospace" textAnchor="middle">
                ЛЮК ВІДКРИТО
              </text>
            )}

            {/* Right seat frame & blue checkered cushions */}
            <path d="M1285 360 L1185 360 L1160 540 L975 545 L975 618 L1190 642 L1285 642 Z" fill="#525a69" stroke="#272c36" strokeWidth="3" />
            <path d="M1280 340 Q1280 322 1256 322 L1192 322 Q1176 322 1174 342 L1170 400 L1280 400 Z" fill="#1e232d" stroke="#334155" strokeWidth="2" />
            <polygon points="1266,402 1172,402 1146,542 1242,542" fill="url(#sbahnCheck)" stroke="#10254a" strokeWidth="2" />
            <polygon points="1240,542 982,542 1004,610 1246,610" fill="url(#sbahnCheck)" stroke="#10254a" strokeWidth="2" />
          </g>

          {/* RIGHT EDGE: Black accordion gangway bellows (just like the photo!) */}
          <g>
            <rect x="1365" y="135" width="235" height="630" fill="#0d1016" />
            {[1380, 1418, 1456, 1494, 1532, 1570].map((bx) => (
              <rect
                key={bx}
                x={bx}
                y="145"
                width="22"
                height="610"
                rx="8"
                fill="#1b202b"
                stroke="#090b10"
                strokeWidth="4"
              />
            ))}
          </g>

          {/* Warm emergency lighting wash & cinematic vignette */}
          <rect width="1600" height="900" fill="url(#emergWarmGlow)" />
          <rect
            width="1600"
            height="900"
            fill="none"
            stroke="#06080c"
            strokeWidth="120"
            opacity="0.52"
          />
        </svg>
      )}

      {view.illustrationId === 'scene2-p2' && (
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="p1Wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e232e" />
              <stop offset="60%" stopColor="#262c38" />
              <stop offset="100%" stopColor="#13161e" />
            </linearGradient>
            <linearGradient id="p1RedDoor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>
            <pattern id="hazardStripes" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="24" fill="#eab308" />
              <rect x="12" width="12" height="24" fill="#18181b" />
            </pattern>
            <radialGradient id="redAlarmWash" cx="30%" cy="22%" r="55%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#090b10" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Vestibule A Bulkhead Background (p2) */}
          <rect width="1600" height="900" fill="url(#p1Wall)" />
          {/* Ceiling strip */}
          <rect x="0" y="0" width="1600" height="125" fill="#141820" />
          <rect x="280" y="88" width="1040" height="12" rx="4" fill="#ef4444" opacity="0.4" className="animate-led-flicker" />
          {/* Floor */}
          <rect x="0" y="700" width="1600" height="200" fill="#101319" />
          <line x1="0" y1="700" x2="1600" y2="700" stroke="#334155" strokeWidth="4" />

          {/* LEFT: Sealed Red Emergency Door with dark window */}
          <rect x="0" y="125" width="285" height="575" fill="url(#p1RedDoor)" stroke="#290707" strokeWidth="4" />
          <rect x="52" y="195" width="175" height="275" rx="18" fill="#070d1a" stroke="#18181b" strokeWidth="10" />
          <line x1="90" y1="220" x2="80" y2="275" stroke="#94a3b8" strokeWidth="1.5" opacity="0.25" />
          <line x1="160" y1="255" x2="148" y2="335" stroke="#94a3b8" strokeWidth="1.5" opacity="0.2" />
          <text x="140" y="540" fill="#fecaca" fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="monospace" opacity="0.8">
            GESPERRT · ЗАБЛОКОВАНО
          </text>

          {/* Pneumatic Transfer Chute ("ШЛЮЗ ПЕРЕДАЧІ") between cars (Hotspot x:9%, y:69%) */}
          <g transform="translate(65, 585)">
            <rect
              width="156"
              height="76"
              rx="8"
              fill={hatchHasItem ? '#062c22' : '#181c24'}
              stroke={hatchHasItem ? '#34d399' : '#38bdf8'}
              strokeWidth={hatchHasItem ? '3' : '2'}
              opacity="0.95"
            />
            <rect x="14" y="14" width="128" height="28" rx="4" fill="#090c12" stroke={hatchHasItem ? '#10b981' : '#334155'} strokeWidth="1.5" />
            {hatchHasItem && (
              <rect x="46" y="21" width="64" height="14" rx="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" />
            )}
            <text x="78" y="61" fill={hatchHasItem ? '#6ee7b7' : '#7dd3fc'} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              {hatchHasItem ? 'ОТРИМАНО ПРЕДМЕТ!' : 'ШЛЮЗ ПЕРЕДАЧІ'}
            </text>
          </g>

          {/* CENTER-LEFT: RED NOTBREMSE EMERGENCY BOX + KEYPAD (Hotspot x:31%, y:48%) */}
          <g transform="translate(382, 295)">
            <rect width="228" height="272" rx="12" fill="#991b1b" stroke="#f87171" strokeWidth="3" />
            <rect x="14" y="14" width="200" height="40" rx="6" fill="#450a0a" />
            <text x="114" y="40" fill="#fef2f2" fontSize="22" fontWeight="800" textAnchor="middle" fontFamily="Oswald, sans-serif" letterSpacing="2">
              NOTBREMSE
            </text>
            {/* Digital LCD screen — NEVER leaks code before solved */}
            <rect x="24" y="70" width="180" height="52" rx="6" fill="#090d12" stroke="#52525b" strokeWidth="2" />
            <text
              x="114"
              y="104"
              fill={keypadSolved ? '#34d399' : '#f59e0b'}
              fontSize="24"
              fontWeight="700"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {keypadSolved ? 'OK · ВІДКР.' : '----'}
            </text>
            {/* Tactile 3x3 keypad grid */}
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={34 + col * 58}
                  y={136 + row * 38}
                  width="44"
                  height="28"
                  rx="4"
                  fill="#1f2937"
                  stroke="#6b7280"
                  strokeWidth="1.5"
                />
              ))
            )}
            <circle cx="192" cy="34" r="6" fill={keypadSolved ? '#10b981' : '#ef4444'} />
          </g>

          {/* CENTER-RIGHT: FUSE PANEL / ЩИТОК SICHERUNG 32A (Hotspot x:56%, y:54%) */}
          <g transform="translate(790, 368)">
            <rect width="212" height="232" rx="10" fill="#272e3a" stroke="#64748b" strokeWidth="3" />
            <rect x="16" y="14" width="180" height="28" rx="4" fill="#181c24" />
            <text x="106" y="32" fill="#e2e8f0" fontSize="13" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              SICHERUNG · 32A
            </text>
            <rect x="22" y="54" width="168" height="156" rx="6" fill="#11151d" stroke="#334155" strokeWidth="2" />
            <path d="M52 132 H160" stroke={fuseInserted ? '#34d399' : '#475569'} strokeWidth="4" />
            <rect x="44" y="112" width="18" height="40" rx="3" fill="#ca8a04" />
            <rect x="150" y="112" width="18" height="40" rx="3" fill="#ca8a04" />
            {fuseInserted ? (
              <g>
                <rect x="56" y="117" width="100" height="30" rx="5" fill="#1e293b" stroke="#34d399" strokeWidth="2.5" />
                <path d="M68 132 H88 L96 123 L112 141 L122 132 H144" stroke="#38bdf8" strokeWidth="3" fill="none" />
                <text x="106" y="190" fill="#34d399" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="monospace">
                  ЖИВЛЕННЯ АКТИВНЕ
                </text>
              </g>
            ) : (
              <text x="106" y="190" fill="#f59e0b" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="monospace">
                НЕМАЄ ЗАПОБІЖНИКА
              </text>
            )}
          </g>

          {/* RIGHT: EMERGENCY LEVER A (Hotspot x:78%, y:52%) */}
          <g transform="translate(1152, 318)">
            <rect width="192" height="300" rx="12" fill="#1e2430" stroke="#64748b" strokeWidth="3" />
            <rect x="10" y="10" width="172" height="24" rx="4" fill="url(#hazardStripes)" />
            <text x="96" y="56" fill="#f8fafc" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
              ВАЖІЛЬ А
            </text>
            <rect x="82" y="76" width="28" height="170" rx="14" fill="#090c12" stroke="#475569" strokeWidth="2" />
            <g transform={`translate(0, ${gameState.leverHold.p2 ? 82 : 0})`}>
              <rect x="89" y="92" width="14" height="58" rx="6" fill="#94a3b8" />
              <rect x="34" y="88" width="124" height="34" rx="10" fill={keypadSolved && fuseInserted ? '#dc2626' : '#64748b'} stroke="#fca5a5" strokeWidth="2.5" />
              <text x="96" y="110" fill="#ffffff" fontSize="13" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                {gameState.leverHold.p2 ? 'ТРИМАЮ!' : 'ТЯГНИ ВНИЗ'}
              </text>
            </g>
            <circle cx="96" cy="272" r="9" fill={keypadSolved && fuseInserted ? '#10b981' : '#ef4444'} />
          </g>

          <rect width="1600" height="900" fill="url(#redAlarmWash)" />
        </svg>
      )}

      {view.illustrationId === 'scene2-p1' && (
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="p2Cabin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b202b" />
              <stop offset="55%" stopColor="#242a36" />
              <stop offset="100%" stopColor="#10131a" />
            </linearGradient>
            <linearGradient id="p2Sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#050a14" />
              <stop offset="100%" stopColor="#132138" />
            </linearGradient>
            <pattern id="p2Check" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#1b3a73" />
              <rect x="2" y="2" width="5" height="5" fill="#0e2249" />
              <rect x="8" y="8" width="5" height="5" fill="#2b58a6" opacity="0.7" />
            </pattern>
            <pattern id="p2Perf" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.5" fill="#0b0e14" opacity="0.65" />
            </pattern>
            <pattern id="p2Hazard" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="24" fill="#eab308" />
              <rect x="12" width="12" height="24" fill="#18181b" />
            </pattern>
            <radialGradient id="amberLedGlow" cx="48%" cy="23%" r="45%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#090b10" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Carriage B Interior (p1) */}
          <rect width="1600" height="900" fill="url(#p2Cabin)" />
          <path d="M0 0 H1600 V135 Q800 95 0 135 Z" fill="#171b24" />
          <rect x="0" y="690" width="1600" height="210" fill="#0f1218" />

          {/* CENTER-TOP: OVERHEAD S-BAHN LED MATRIX DISPLAY (Hotspot x:48%, y:23%) */}
          <g transform="translate(462, 138)">
            <rect width="612" height="132" rx="12" fill="#11141b" stroke="#475569" strokeWidth="4" />
            <rect x="16" y="16" width="580" height="100" rx="6" fill="#07090d" stroke="#1e293b" strokeWidth="2" />
            <g className="animate-led-flicker">
              <text x="34" y="54" fill="#f59e0b" fontSize="21" fontWeight="700" fontFamily="monospace" letterSpacing="1">
                S2 → 4   ·   Beutelsbach → 7
              </text>
              <text x="34" y="96" fill="#fbbf24" fontSize="21" fontWeight="700" fontFamily="monospace" letterSpacing="1">
                Filderstadt → 1   ·   Stuttgart → 9
              </text>
            </g>
          </g>

          {/* LEFT: OVERHEAD LUGGAGE RACK WITH FUSE 32A (Hotspot x:24%, y:35%) */}
          <g transform="translate(105, 290)">
            <rect x="30" y="34" width="14" height="32" fill="#334155" />
            <rect x="440" y="34" width="14" height="32" fill="#334155" />
            <rect width="486" height="42" rx="6" fill="#3f4756" stroke="#64748b" strokeWidth="2" />
            <rect x="12" y="8" width="462" height="24" fill="url(#p2Perf)" />
            {!fuseTaken && (
              <g transform="translate(242, -16)">
                <ellipse cx="38" cy="24" rx="46" ry="18" fill="#fbbf24" opacity="0.22" />
                <rect x="6" y="8" width="14" height="22" rx="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.5" />
                <rect x="56" y="8" width="14" height="22" rx="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.5" />
                <rect x="20" y="10" width="36" height="18" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                <path d="M23 19 H30 L34 14 L42 24 L46 19 H53" stroke="#38bdf8" strokeWidth="2.2" fill="none" />
              </g>
            )}
          </g>

          {/* Side night window below luggage rack */}
          <rect x="145" y="388" width="420" height="185" rx="18" fill="url(#p2Sky)" stroke="#1e2430" strokeWidth="10" />
          <circle cx="245" cy="495" r="3" fill="#fbbf24" opacity="0.65" />
          <circle cx="385" cy="482" r="2.5" fill="#fde68a" opacity="0.5" />

          {/* Blue checkered seats on left */}
          <g transform="translate(155, 555)">
            <rect x="0" y="45" width="380" height="90" rx="10" fill="url(#p2Check)" stroke="#0f234c" strokeWidth="3" />
            <rect x="18" y="128" width="340" height="65" fill="#232934" stroke="#3f4756" strokeWidth="2" />
          </g>

          {/* CENTER: Sealed Inter-Car Partition Door + Transfer Hatch (Hotspot x:51%, y:67%) */}
          <g transform="translate(650, 315)">
            <rect width="345" height="378" rx="8" fill="#7f1d1d" stroke="#290707" strokeWidth="4" />
            <rect x="52" y="32" width="240" height="185" rx="14" fill="#111827" stroke="#18181b" strokeWidth="8" />
            <rect x="64" y="44" width="216" height="161" rx="8" fill="#dc2626" opacity="0.1" />
            <text x="172" y="132" fill="#94a3b8" fontSize="14" fontFamily="monospace" textAnchor="middle" opacity="0.7">
              МІЖВАГОННІ ДВЕРІ
            </text>
            {/* Transfer chute slot */}
            <rect
              x="86"
              y="254"
              width="172"
              height="70"
              rx="8"
              fill={hatchHasItem ? '#062c22' : '#181c24'}
              stroke={hatchHasItem ? '#34d399' : '#38bdf8'}
              strokeWidth={hatchHasItem ? '3' : '2'}
            />
            <rect x="102" y="268" width="140" height="24" rx="4" fill="#090c12" stroke={hatchHasItem ? '#10b981' : '#334155'} strokeWidth="1.5" />
            <text x="172" y="311" fill={hatchHasItem ? '#6ee7b7' : '#7dd3fc'} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              {hatchHasItem ? 'У ШЛЮЗІ Є ПРЕДМЕТ' : 'ШЛЮЗ ПЕРЕДАЧІ → ТАМБУР А'}
            </text>
          </g>

          {/* RIGHT: EMERGENCY LEVER B (Hotspot x:79%, y:53%) */}
          <g transform="translate(1168, 326)">
            <rect width="192" height="300" rx="12" fill="#1e2430" stroke="#64748b" strokeWidth="3" />
            <rect x="10" y="10" width="172" height="24" rx="4" fill="url(#p2Hazard)" />
            <text x="96" y="56" fill="#f8fafc" fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
              ВАЖІЛЬ Б
            </text>
            <rect x="82" y="76" width="28" height="170" rx="14" fill="#090c12" stroke="#475569" strokeWidth="2" />
            <g transform={`translate(0, ${gameState.leverHold.p1 ? 82 : 0})`}>
              <rect x="89" y="92" width="14" height="58" rx="6" fill="#94a3b8" />
              <rect x="34" y="88" width="124" height="34" rx="10" fill={keypadSolved && fuseInserted ? '#dc2626' : '#64748b'} stroke="#fca5a5" strokeWidth="2.5" />
              <text x="96" y="110" fill="#ffffff" fontSize="13" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                {gameState.leverHold.p1 ? 'ТРИМАЮ!' : 'ТЯГНИ ВНИЗ'}
              </text>
            </g>
            <circle cx="96" cy="272" r="9" fill={keypadSolved && fuseInserted ? '#10b981' : '#ef4444'} />
          </g>

          <rect width="1600" height="900" fill="url(#amberLedGlow)" />
        </svg>
      )}
          </>
        )}
      </div>

      {/* Depth-of-Field subtle bokeh blur around non-active areas */}
      {depthOfFieldOverlay}

      {/* Gritty night-train static grain, subtle interference, remote P2 effects, chromatic fringe & dim radial vignette */}
      <div className="absolute -inset-4 scene-static-grain pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 scene-interference-lines pointer-events-none" aria-hidden="true" />
      {showRemoteEffect && remoteOverlayClass && (
        <div className={`absolute inset-0 pointer-events-none ${remoteOverlayClass}`} aria-hidden="true" />
      )}
      {interferenceLevel !== 'idle' && (
        <div
          className="absolute inset-x-0 top-0 h-24 scene-glitch-tear pointer-events-none"
          aria-hidden="true"
        />
      )}
      <div className={`absolute inset-0 pointer-events-none ${fringeClass}`} aria-hidden="true" />
      {smokeOverlay}
      <div className="absolute inset-0 scene-vignette pointer-events-none" aria-hidden="true" />

      {/* Subtle top and bottom measured scrims so HUD text always meets 4.5:1 contrast */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#090b10]/85 via-[#090b10]/45 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#090b10]/90 via-[#090b10]/50 to-transparent pointer-events-none" />
    </div>
  );
};
