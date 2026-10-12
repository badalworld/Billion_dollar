import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { BotSystemState } from '../server/tradingBotEngine';

interface Office3DSceneProps {
  state: BotSystemState;
  sidebarExpanded: boolean;
}

type CameraPreset = 'OVERVIEW' | 'SCANNER_15S' | 'OPPORTUNIST_5S' | 'EXECUTION_ATR' | 'POSITIONS_1S' | 'PROFIT_VAULT';

interface PodMeshGroup {
  slot: number;
  baseMesh: THREE.Mesh;
  orbMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  labelCanvas: HTMLCanvasElement;
  labelTexture: THREE.CanvasTexture;
  labelSprite: THREE.Sprite;
}

export const Office3DScene: React.FC<Office3DSceneProps> = ({ state, sidebarExpanded }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<BotSystemState>(state);
  stateRef.current = state;

  const [activePreset, setActivePreset] = useState<CameraPreset>('OVERVIEW');
  const [selectedStageInfo, setSelectedStageInfo] = useState<string | null>(null);
  const targetCamPosRef = useRef(new THREE.Vector3(0, 18.5, 25.5));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 1.5, 0));

  const applyCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    switch (preset) {
      case 'OVERVIEW':
        targetCamPosRef.current.set(0, 18.5, 25.5);
        targetLookAtRef.current.set(0, 1.5, 0);
        setSelectedStageInfo(null);
        break;
      case 'SCANNER_15S':
        targetCamPosRef.current.set(-11.5, 6.2, 8.5);
        targetLookAtRef.current.set(-11.5, 2.3, -3.5);
        setSelectedStageInfo('STAGE 1: 15s Market Scanner — Top 100 Volatile MEXC Futures (Serially Ranked #1–#100)');
        break;
      case 'OPPORTUNIST_5S':
        targetCamPosRef.current.set(-4.2, 6.2, 6.5);
        targetLookAtRef.current.set(-4.2, 2.5, -5.5);
        setSelectedStageInfo('STAGE 2: 5s Opportunist Monitor — Boom Hunter Pro v1.022 (EOT 1/2/3 & LSMAWT)');
        break;
      case 'EXECUTION_ATR':
        targetCamPosRef.current.set(4.5, 6.2, 6.5);
        targetLookAtRef.current.set(4.5, 2.5, -5.5);
        setSelectedStageInfo('STAGE 3: Order Execution Engine — 8% Balance Margin • 10x Leverage • 5m TF • 3x ATR SL');
        break;
      case 'POSITIONS_1S':
        targetCamPosRef.current.set(0, 8.8, 12.2);
        targetLookAtRef.current.set(0, 1.8, 2.5);
        setSelectedStageInfo('STAGE 4: 1-2s Position & Risk Table — Max 10 Open Trades • Trail Stop @ 20% ROI (+10% Step)');
        break;
      case 'PROFIT_VAULT':
        targetCamPosRef.current.set(11.5, 6.2, 8.5);
        targetLookAtRef.current.set(11.5, 2.3, -3.5);
        setSelectedStageInfo('STAGE 5: Profit Vault & Ledger — Opposite Signal TP & Trailing Stop Captures');
        break;
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. SCENE & BRIGHT MINIMALIST STUDIO ENVIRONMENT (ZERO BLACK COLOR) ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef3f9); // Soft bright architectural daylight blue-alabaster
    scene.fog = new THREE.Fog(0xeef3f9, 34, 68);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      150
    );
    camera.position.copy(targetCamPosRef.current);
    const currentLookAt = new THREE.Vector3(0, 1.5, 0);
    camera.lookAt(currentLookAt);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- 2. BRIGHT PROFESSIONAL STUDIO LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.95);
    hemiLight.position.set(0, 25, 0);
    scene.add(hemiLight);

    const mainSun = new THREE.DirectionalLight(0xfffdf8, 1.45);
    mainSun.position.set(14, 26, 18);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 2;
    mainSun.shadow.camera.far = 65;
    const d = 24;
    mainSun.shadow.camera.left = -d;
    mainSun.shadow.camera.right = d;
    mainSun.shadow.camera.top = d;
    mainSun.shadow.camera.bottom = -d;
    mainSun.shadow.bias = -0.0005;
    scene.add(mainSun);

    const fillLightLeft = new THREE.PointLight(0xe0f2fe, 1.1, 35);
    fillLightLeft.position.set(-14, 10, 6);
    scene.add(fillLightLeft);

    const fillLightRight = new THREE.PointLight(0xfef3c7, 1.0, 35);
    fillLightRight.position.set(14, 10, 6);
    scene.add(fillLightRight);

    // --- 3. ARCHITECTURAL FLOOR & WALLS (CLEAN MINIMALIST TEXTURES, NO BLACK) ---
    const createFloorTileTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#F5F7FA';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }
      // Subtle geometric corner accents
      ctx.fillStyle = '#CBD5E1';
      for (let x = 0; x <= 512; x += 64) {
        for (let y = 0; y <= 512; y += 64) {
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 6);
      return tex;
    };

    const floorMat = new THREE.MeshStandardMaterial({
      map: createFloorTileTexture(),
      roughness: 0.35,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(36, 0.4, 26), floorMat);
    floorMesh.position.set(0, -0.2, 0);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Minimalist Alabaster Walls & Wood Slat Accents
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
      metalness: 0.05,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.3,
      metalness: 0.4,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xe5d3be,
      roughness: 0.45,
      metalness: 0.05,
    });
    const whiteFurnitureMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.1,
    });
    const silverMetalMat = new THREE.MeshStandardMaterial({
      color: 0xdbe4ee,
      roughness: 0.25,
      metalness: 0.65,
    });

    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 7.5, 0.4), wallMat);
    backWall.position.set(0, 3.75, -12.8);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.5, 26), wallMat);
    leftWall.position.set(-17.8, 3.75, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.5, 26), wallMat);
    rightWall.position.set(17.8, 3.75, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Nordic Oak Acoustic Slat Feature Panels on Back Wall
    for (let s = -15; s <= 15; s += 0.6) {
      if (Math.abs(s) < 4.8) continue; // Leave center open for Billion Dollar Brand Sign
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.2, 0.15), woodMat);
      slat.position.set(s, 3.8, -12.52);
      slat.castShadow = true;
      scene.add(slat);
    }

    // Center Back Wall "BILLION DOLLAR" Architectural Header Board (Bright Pearl & Gold/Emerald)
    const brandBoardCanvas = document.createElement('canvas');
    brandBoardCanvas.width = 1024;
    brandBoardCanvas.height = 256;
    const bCtx = brandBoardCanvas.getContext('2d')!;
    const drawBrandBoard = (s: BotSystemState) => {
      bCtx.fillStyle = '#F8FAFC';
      bCtx.fillRect(0, 0, 1024, 256);
      bCtx.strokeStyle = '#10B981';
      bCtx.lineWidth = 8;
      bCtx.strokeRect(8, 8, 1008, 240);

      bCtx.fillStyle = '#0F766E';
      bCtx.font = '900 54px Inter, sans-serif';
      bCtx.fillText('$B  BILLION DOLLAR', 48, 88);

      bCtx.fillStyle = '#0369A1';
      bCtx.font = '700 26px Inter, sans-serif';
      bCtx.fillText('MEXC FUTURES AUTOMATION • BOOM HUNTER PRO v1.022 (5M)', 48, 138);

      bCtx.fillStyle = '#334155';
      bCtx.font = '600 24px Inter, sans-serif';
      bCtx.fillText(
        `Balance: $${s.account.totalBalanceUsd.toLocaleString()}  |  Margin: 8% ($${s.account.nextTradeMarginUsd}) @ 10x  |  Open Trades: ${s.activePositions.length}/10  |  Win Rate: ${s.account.winRatePct}%`,
        48,
        192
      );

      bCtx.fillStyle = '#059669';
      bCtx.font = '700 22px Inter, sans-serif';
      bCtx.fillText(
        `RULES LOCKED: Top 100 Volatile (15s) • Opportunists (5s) • Active Monitor (1-2s) • TP Opposite Signal • SL 3x ATR • Trail 20% (+10% Step)`,
        48,
        228
      );
    };
    drawBrandBoard(stateRef.current);
    const brandBoardTex = new THREE.CanvasTexture(brandBoardCanvas);
    const brandBoardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 2.3),
      new THREE.MeshBasicMaterial({ map: brandBoardTex })
    );
    brandBoardMesh.position.set(0, 5.1, -12.48);
    scene.add(brandBoardMesh);

    // --- 4. HELPER TO BUILD MINIMALIST WORKSTATION DESKS WITH LIVE CANVAS SCREENS ---
    const createWorkstation = (
      x: number,
      z: number,
      rotY: number,
      accentHex: number
    ): {
      group: THREE.Group;
      screenCanvas: HTMLCanvasElement;
      screenTex: THREE.CanvasTexture;
    } => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotY;

      // Desk Tabletop (Warm Nordic Oak)
      const top = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.16, 2.4), woodMat);
      top.position.set(0, 1.5, 0);
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      // Desk Frame Legs (Matte White Steel)
      const legGeo = new THREE.BoxGeometry(0.16, 1.5, 2.2);
      const legL = new THREE.Mesh(legGeo, whiteFurnitureMat);
      legL.position.set(-2.5, 0.75, 0);
      legL.castShadow = true;
      group.add(legL);

      const legR = new THREE.Mesh(legGeo, whiteFurnitureMat);
      legR.position.set(2.5, 0.75, 0);
      legR.castShadow = true;
      group.add(legR);

      // Minimalist Ergonomic Chair (Pearl White & Silver)
      const chairSeat = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.14, 1.1),
        whiteFurnitureMat
      );
      chairSeat.position.set(0, 0.95, 1.45);
      chairSeat.castShadow = true;
      group.add(chairSeat);

      const chairBack = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 1.25, 0.14),
        whiteFurnitureMat
      );
      chairBack.position.set(0, 1.65, 1.95);
      chairBack.castShadow = true;
      group.add(chairBack);

      const chairPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.35, 0.9, 16),
        silverMetalMat
      );
      chairPedestal.position.set(0, 0.45, 1.45);
      group.add(chairPedestal);

      // Ultrawide Curved/Flat Monitor Frame (Anodized Silver)
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.65, 0.25),
        silverMetalMat
      );
      stand.position.set(0, 1.85, -0.55);
      group.add(stand);

      const monitorBezel = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 1.95, 0.12),
        silverMetalMat
      );
      monitorBezel.position.set(0, 2.75, -0.55);
      monitorBezel.castShadow = true;
      group.add(monitorBezel);

      // Live Canvas Screen Texture (Bright Minimalist UI, ZERO black!)
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = 768;
      screenCanvas.height = 340;
      const screenTex = new THREE.CanvasTexture(screenCanvas);
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.32, 1.78),
        new THREE.MeshBasicMaterial({ map: screenTex })
      );
      screenMesh.position.set(0, 2.75, -0.48);
      group.add(screenMesh);

      // Minimalist White Keyboard & Mouse Pad on Desk
      const keyboard = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.04, 0.42),
        whiteFurnitureMat
      );
      keyboard.position.set(0, 1.6, 0.35);
      group.add(keyboard);

      // Glowing Status Strip on front edge of desk
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.08, 0.06),
        new THREE.MeshBasicMaterial({ color: accentHex })
      );
      strip.position.set(0, 1.5, 1.21);
      group.add(strip);

      scene.add(group);
      return { group, screenCanvas, screenTex };
    };

    // Build the 4 Perimeter Workstations
    const wsScanner = createWorkstation(-11.5, -4.5, 0.22, 0x0284c7);
    const wsOpportunist = createWorkstation(-4.2, -6.5, 0.06, 0x7c3aed);
    const wsExecution = createWorkstation(4.5, -6.5, -0.06, 0xd97706);
    const wsVault = createWorkstation(11.5, -4.5, -0.22, 0x059669);

    // --- 5. CENTRAL COMMAND TABLE FOR UP TO 10 ACTIVE POSITIONS (1-2s MONITOR) ---
    const commandGroup = new THREE.Group();
    commandGroup.position.set(0, 0, 2.8);
    scene.add(commandGroup);

    // Architectural Oval/Rounded Command Table
    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 1.15, 32),
      whiteFurnitureMat
    );
    tableBase.position.set(0, 0.58, 0);
    tableBase.castShadow = true;
    tableBase.receiveShadow = true;
    commandGroup.add(tableBase);

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 5.6, 0.2, 48),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.2,
        metalness: 0.1,
      })
    );
    tableTop.position.set(0, 1.25, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    commandGroup.add(tableTop);

    const tableRim = new THREE.Mesh(
      new THREE.TorusGeometry(5.6, 0.09, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
    );
    tableRim.rotation.x = Math.PI / 2;
    tableRim.position.set(0, 1.26, 0);
    commandGroup.add(tableRim);

    // Create 10 Physical Position Pods arranged in a circle on the Command Table
    const pods: PodMeshGroup[] = [];
    for (let slot = 1; slot <= 10; slot++) {
      const angle = ((slot - 1) / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = 4.15;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.68, 0.18, 24),
        silverMetalMat.clone()
      );
      baseMesh.position.set(px, 1.44, pz);
      commandGroup.add(baseMesh);

      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.05, 12, 32),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(px, 1.54, pz);
      commandGroup.add(ringMesh);

      const orbMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 2),
        new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          roughness: 0.15,
          metalness: 0.3,
          emissive: 0x0284c7,
          emissiveIntensity: 0.35,
        })
      );
      orbMesh.position.set(px, 2.1, pz);
      orbMesh.castShadow = true;
      commandGroup.add(orbMesh);

      // Floating Light-Themed Holographic Card Sprite above each Pod (ZERO black)
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 320;
      labelCanvas.height = 150;
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
      });
      const labelSprite = new THREE.Sprite(spriteMat);
      labelSprite.scale.set(2.5, 1.18, 1);
      labelSprite.position.set(px, 3.35, pz);
      commandGroup.add(labelSprite);

      pods.push({
        slot,
        baseMesh,
        orbMesh,
        ringMesh,
        labelCanvas,
        labelTexture,
        labelSprite,
      });
    }

    // --- 6. MINIMALIST INDOOR PLANTS & GLASS PARTITIONS ---
    const addMinimalistPlant = (px: number, pz: number) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.42, 0.9, 20),
        whiteFurnitureMat
      );
      pot.position.set(px, 0.45, pz);
      pot.castShadow = true;
      scene.add(pot);

      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.4,
      });
      const bush1 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), foliageMat);
      bush1.position.set(px, 1.35, pz);
      bush1.castShadow = true;
      scene.add(bush1);

      const bush2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), foliageMat);
      bush2.position.set(px + 0.25, 1.85, pz - 0.15);
      scene.add(bush2);
    };

    addMinimalistPlant(-15.5, -10.5);
    addMinimalistPlant(15.5, -10.5);
    addMinimalistPlant(-15.5, 8.5);
    addMinimalistPlant(15.5, 8.5);

    // Minimalist Server Racks behind Execution Station (White & Brushed Silver)
    for (let r = 0; r < 3; r++) {
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 4.2, 1.1),
        whiteFurnitureMat
      );
      rack.position.set(3.2 + r * 1.55, 2.1, -10.6);
      rack.castShadow = true;
      scene.add(rack);

      const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 3.6, 0.05),
        new THREE.MeshBasicMaterial({ color: r === 1 ? 0x10b981 : 0x0ea5e9 })
      );
      ledStrip.position.set(3.2 + r * 1.55, 2.1, -10.02);
      scene.add(ledStrip);
    }

    // --- 7. ANIMATED REAL-TIME DATA CONDUITS & FLOWING PACKETS ---
    const flowPaths: Array<{
      curve: THREE.CatmullRomCurve3;
      color: number;
      particles: THREE.Mesh[];
    }> = [];

    const createDataFlowPath = (points: THREE.Vector3[], colorHex: number, count: number) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.06, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35,
      });
      scene.add(new THREE.Mesh(tubeGeo, tubeMat));

      const particles: THREE.Mesh[] = [];
      const sphereGeo = new THREE.SphereGeometry(0.16, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
      for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(sphereGeo, sphereMat);
        p.userData = { offset: i / count };
        scene.add(p);
        particles.push(p);
      }
      flowPaths.push({ curve, color: colorHex, particles });
    };

    // Path 1: 15s Scanner -> 5s Opportunist Desk
    createDataFlowPath(
      [
        new THREE.Vector3(-11.5, 0.25, -4.5),
        new THREE.Vector3(-8.0, 0.25, -5.8),
        new THREE.Vector3(-4.2, 0.25, -6.5),
      ],
      0x0284c7,
      6
    );

    // Path 2: 5s Opportunist Desk -> Execution & 3x ATR Engine
    createDataFlowPath(
      [
        new THREE.Vector3(-4.2, 0.25, -6.5),
        new THREE.Vector3(0, 0.25, -6.8),
        new THREE.Vector3(4.5, 0.25, -6.5),
      ],
      0x7c3aed,
      6
    );

    // Path 3: Execution Engine -> Central 1-2s Active Positions Command Table
    createDataFlowPath(
      [
        new THREE.Vector3(4.5, 0.25, -6.5),
        new THREE.Vector3(2.5, 0.25, -2.0),
        new THREE.Vector3(0, 0.25, 2.8),
      ],
      0xd97706,
      8
    );

    // Path 4: Active Positions Table -> Profit Vault & Performance Ledger
    createDataFlowPath(
      [
        new THREE.Vector3(0, 0.25, 2.8),
        new THREE.Vector3(6.5, 0.25, -0.5),
        new THREE.Vector3(11.5, 0.25, -4.5),
      ],
      0x059669,
      7
    );

    // --- 8. LIVE CANVAS TEXTURE UPDATER FOR WORKSTATIONS & 10 POSITION PODS ---
    const updateWorkstationScreens = () => {
      const s = stateRef.current;

      // Update Brand Board
      drawBrandBoard(s);
      brandBoardTex.needsUpdate = true;

      // 1) 15s Market Scanner Screen
      {
        const ctx = wsScanner.screenCanvas.getContext('2d')!;
        ctx.fillStyle = '#F0F9FF';
        ctx.fillRect(0, 0, 768, 340);
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(0, 0, 768, 54);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText(
          `STAGE 1: 15s VOLATILITY SCANNER (NEXT: ${s.timers.nextMarketScanInSec}s)`,
          20,
          36
        );

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText('TOP 100 VOLATILE MARKETS (SERIALLY SORTED #1 -> #100)', 20, 92);

        const top5 = s.top100VolatileMarkets.slice(0, 5);
        top5.forEach((m, idx) => {
          const y = 132 + idx * 40;
          ctx.fillStyle = idx % 2 === 0 ? '#E0F2FE' : '#F8FAFC';
          ctx.fillRect(16, y - 26, 736, 34);
          ctx.fillStyle = '#0369A1';
          ctx.font = 'bold 19px Inter, sans-serif';
          ctx.fillText(`#${m.serialRank} ${m.symbol}`, 28, y - 2);
          ctx.fillStyle = '#334155';
          ctx.fillText(`$${m.price}`, 240, y - 2);
          ctx.fillStyle = '#047857';
          ctx.fillText(`Vol: ${m.volatilityPct}%`, 420, y - 2);
          ctx.fillStyle = '#6D28D9';
          ctx.fillText(`Q1: ${m.q1}`, 600, y - 2);
        });
        wsScanner.screenTex.needsUpdate = true;
      }

      // 2) 5s Opportunist & Boom Hunter Pro Screen
      {
        const ctx = wsOpportunist.screenCanvas.getContext('2d')!;
        ctx.fillStyle = '#F5F3FF';
        ctx.fillRect(0, 0, 768, 340);
        ctx.fillStyle = '#7C3AED';
        ctx.fillRect(0, 0, 768, 54);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText(
          `STAGE 2: 5s OPPORTUNIST MONITOR (NEXT: ${s.timers.nextOpportunistScanInSec}s)`,
          20,
          36
        );

        ctx.fillStyle = '#1E1B4B';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText(
          `BOOM HUNTER PRO v1.022 QUALIFIED ASSETS (${s.opportunistAssets.length} READY)`,
          20,
          92
        );

        const opps = s.opportunistAssets.slice(0, 5);
        opps.forEach((o, idx) => {
          const y = 132 + idx * 40;
          ctx.fillStyle = idx % 2 === 0 ? '#EDE9FE' : '#F8FAFC';
          ctx.fillRect(16, y - 26, 736, 34);
          ctx.fillStyle = '#5B21B6';
          ctx.font = 'bold 19px Inter, sans-serif';
          ctx.fillText(`${o.symbol} (Rank #${o.serialRank})`, 28, y - 2);
          ctx.fillStyle = '#047857';
          ctx.fillText(`Score: ${o.opportunistScore}%`, 310, y - 2);
          ctx.fillStyle = '#B45309';
          ctx.fillText(`WT2: ${o.wt2} | Q1: ${o.q1}`, 490, y - 2);
        });
        wsOpportunist.screenTex.needsUpdate = true;
      }

      // 3) Execution & ATR 3x Risk Engine Screen
      {
        const ctx = wsExecution.screenCanvas.getContext('2d')!;
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(0, 0, 768, 340);
        ctx.fillStyle = '#D97706';
        ctx.fillRect(0, 0, 768, 54);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('STAGE 3: MEXC API EXECUTION & 3x ATR RISK ENGINE', 20, 36);

        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 21px Inter, sans-serif';
        ctx.fillText(`• Trade Margin: 8% Balance ($${s.account.nextTradeMarginUsd})`, 28, 105);
        ctx.fillText(`• Leverage: 10x Isolated ($${s.account.nextTradeNotionalUsd} Notional)`, 28, 145);
        ctx.fillText('• Timeframe: 5 Minutes (Min5) | Max Open Trades: 10', 28, 185);
        ctx.fillText('• Stop Loss: 3x ATR(14) | Take Profit: Opposite Signal', 28, 225);
        ctx.fillStyle = '#047857';
        ctx.fillText(
          '• Trail Stop: Activates @ 20% ROI • Steps +10% ROI (30% -> 20% Lock)',
          28,
          268
        );
        ctx.fillStyle = '#0284C7';
        ctx.fillText(
          `• MEXC API Signer: HMAC-SHA256 (${s.mexcConnection.configured ? 'KEYS CONFIGURED' : 'SIMULATED LIVE'})`,
          28,
          310
        );
        wsExecution.screenTex.needsUpdate = true;
      }

      // 4) Profit Vault & Performance Ledger Screen
      {
        const ctx = wsVault.screenCanvas.getContext('2d')!;
        ctx.fillStyle = '#ECFDF5';
        ctx.fillRect(0, 0, 768, 340);
        ctx.fillStyle = '#059669';
        ctx.fillRect(0, 0, 768, 54);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('STAGE 5: PROFIT VAULT & PERFORMANCE METRICS', 20, 36);

        ctx.fillStyle = '#065F46';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText(
          `Realized Net PnL: +$${s.account.realizedPnlUsd.toLocaleString()}  |  Win Rate: ${s.account.winRatePct}%`,
          26,
          104
        );
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillStyle = '#047857';
        ctx.fillText(`Gross Profit: +$${s.account.totalProfitUsd.toLocaleString()}`, 26, 146);
        ctx.fillStyle = '#E11D48';
        ctx.fillText(`Gross Loss: -$${s.account.totalLossUsd.toLocaleString()}`, 400, 146);

        s.tradeHistory.slice(0, 4).forEach((t, idx) => {
          const y = 194 + idx * 36;
          ctx.fillStyle = '#D1FAE5';
          ctx.fillRect(20, y - 24, 728, 30);
          ctx.fillStyle = '#064E3B';
          ctx.font = 'bold 18px Inter, sans-serif';
          ctx.fillText(
            `${t.symbol} ${t.side} 10x  |  ${t.roiPct >= 0 ? '+' : ''}${t.roiPct}% ROI ($${t.pnlUsd})  |  ${t.exitReason}`,
            30,
            y - 2
          );
        });
        wsVault.screenTex.needsUpdate = true;
      }

      // 5) Update all 10 Active Position Pods on the Central Command Table
      pods.forEach((pod) => {
        const pos = s.activePositions.find((p) => p.podSlot === pod.slot);
        const ctx = pod.labelCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, 320, 150);

        if (pos) {
          // Determine color theme from Trail Stop milestone (bright card, no black)
          let borderHex = '#0284C7';
          let bgHex = '#F0F9FF';
          let badgeText = 'MONITORING (1-2s)';
          let orbColor = 0x0ea5e9;

          if (pos.trailMilestoneRoi >= 40) {
            borderHex = '#7C3AED';
            bgHex = '#F5F3FF';
            badgeText = `TRAIL LOCKED: +${pos.trailLockedRoiPct}% ROI`;
            orbColor = 0x8b5cf6;
          } else if (pos.trailMilestoneRoi === 30) {
            borderHex = '#D97706';
            bgHex = '#FFFBEB';
            badgeText = '30% HIT -> LOCKED 20% ROI';
            orbColor = 0xf59e0b;
          } else if (pos.trailMilestoneRoi === 20) {
            borderHex = '#0891B2';
            bgHex = '#ECFEFF';
            badgeText = '20% HIT -> TRAIL ACTIVE';
            orbColor = 0x06b6d4;
          }

          (pod.orbMesh.material as THREE.MeshStandardMaterial).color.setHex(orbColor);
          (pod.orbMesh.material as THREE.MeshStandardMaterial).emissive.setHex(orbColor);
          (pod.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(orbColor);
          pod.orbMesh.visible = true;

          // Elevate orb height based on ROI %
          const extraHeight = Math.max(0, Math.min(1.4, pos.roiPct / 35));
          pod.orbMesh.position.y = 2.05 + extraHeight;
          pod.labelSprite.position.y = 3.25 + extraHeight;

          // Draw bright minimalist floating card
          ctx.fillStyle = bgHex;
          ctx.fillRect(6, 6, 308, 138);
          ctx.strokeStyle = borderHex;
          ctx.lineWidth = 6;
          ctx.strokeRect(6, 6, 308, 138);

          ctx.fillStyle = borderHex;
          ctx.fillRect(6, 6, 308, 36);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 19px Inter, sans-serif';
          ctx.fillText(`POD #${pod.slot}: ${pos.symbol} (${pos.side} 10x)`, 16, 31);

          ctx.fillStyle = pos.roiPct >= 0 ? '#047857' : '#E11D48';
          ctx.font = '900 26px Inter, sans-serif';
          ctx.fillText(
            `${pos.roiPct >= 0 ? '+' : ''}${pos.roiPct.toFixed(1)}% ROI ($${pos.pnlUsd.toFixed(0)})`,
            16,
            74
          );

          ctx.fillStyle = '#334155';
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.fillText(badgeText, 16, 104);
          ctx.fillText(`SL (3x ATR): $${pos.currentSlPrice}`, 16, 130);
        } else {
          // Standby Empty Slot Pod
          pod.orbMesh.visible = false;
          (pod.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0xcbd5e1);
          pod.labelSprite.position.y = 2.55;

          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(20, 30, 280, 84);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 4;
          ctx.strokeRect(20, 30, 280, 84);
          ctx.fillStyle = '#64748B';
          ctx.font = 'bold 19px Inter, sans-serif';
          ctx.fillText(`POD #${pod.slot} — STANDBY`, 58, 68);
          ctx.font = '600 15px Inter, sans-serif';
          ctx.fillText('Awaiting 5s Opportunist Signal', 48, 96);
        }

        pod.labelTexture.needsUpdate = true;
      });
    };

    updateWorkstationScreens();
    const screenRefreshInterval = setInterval(updateWorkstationScreens, 1000);

    // --- 9. MOUSE INTERACTION (ORBIT / PAN / ZOOM) ---
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let sphericalTheta = 0;
    let sphericalPhi = 0.65;
    let orbitRadius = 29;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      sphericalTheta -= dx * 0.0065;
      sphericalPhi = Math.max(0.25, Math.min(1.35, sphericalPhi - dy * 0.0055));

      const offsetX = orbitRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
      const offsetY = orbitRadius * Math.cos(sphericalPhi);
      const offsetZ = orbitRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);

      targetCamPosRef.current.set(
        targetLookAtRef.current.x + offsetX,
         Math.max(3.5, offsetY),
        targetLookAtRef.current.z + offsetZ
      );
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRadius = Math.max(11, Math.min(42, orbitRadius + e.deltaY * 0.015));
      const dir = targetCamPosRef.current
        .clone()
        .sub(targetLookAtRef.current)
        .normalize();
      targetCamPosRef.current.copy(
        targetLookAtRef.current.clone().add(dir.multiplyScalar(orbitRadius))
      );
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });

    // --- 10. 60FPS ANIMATION LOOP ---
    let animFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smoothly interpolate camera position and target
      camera.position.lerp(targetCamPosRef.current, 0.06);
      currentLookAt.lerp(targetLookAtRef.current, 0.08);
      camera.lookAt(currentLookAt);

      // Animate data flow spheres along conduits
      flowPaths.forEach((fp) => {
        fp.particles.forEach((p) => {
          const t = (elapsed * 0.24 + (p.userData.offset as number)) % 1;
          const pt = fp.curve.getPointAt(t);
          p.position.copy(pt);
        });
      });

      // Rotate active position orbs gently
      pods.forEach((pod, idx) => {
        if (pod.orbMesh.visible) {
          pod.orbMesh.rotation.y = elapsed * 1.4 + idx;
          pod.orbMesh.rotation.x = Math.sin(elapsed * 2 + idx) * 0.25;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(screenRefreshInterval);
      cancelAnimationFrame(animFrameId);
      domElem.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domElem.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [sidebarExpanded]);

  const latestAlert = state.alerts[0];

  return (
    <div className="relative w-full h-screen overflow-hidden select-none">
      {/* Fullscreen WebGL 3D Office Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Minimalist Floating Camera Stage Switcher at Bottom Center */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl">
        {(
          [
            { id: 'OVERVIEW', label: '3D Office Overview' },
            { id: 'SCANNER_15S', label: `15s Top 100 Scanner (${state.timers.nextMarketScanInSec}s)` },
            { id: 'OPPORTUNIST_5S', label: `5s Opportunists (${state.opportunistAssets.length})` },
            { id: 'EXECUTION_ATR', label: '8% Margin • 10x • 3x ATR' },
            { id: 'POSITIONS_1S', label: `1-2s Active Pods (${state.activePositions.length}/10)` },
            { id: 'PROFIT_VAULT', label: `Profit Vault (+$${state.account.realizedPnlUsd.toFixed(0)})` },
          ] as Array<{ id: CameraPreset; label: string }>
        ).map((btn) => (
          <button
            key={btn.id}
            onClick={() => applyCameraPreset(btn.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === btn.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Live Color-Coded Trail Stop Alert Ticker in Top-Right Corner */}
      {latestAlert && (
        <div className="absolute top-4 right-5 z-20 max-w-md px-4 py-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 shadow-xl flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 animate-ping ${
              latestAlert.colorCode === 'amber'
                ? 'bg-amber-400'
                : latestAlert.colorCode === 'cyan'
                  ? 'bg-cyan-400'
                  : latestAlert.colorCode === 'purple'
                    ? 'bg-purple-400'
                    : latestAlert.colorCode === 'rose'
                      ? 'bg-rose-400'
                      : 'bg-emerald-400'
            }`}
          />
          <div className="text-xs truncate">
            <span className="font-bold text-emerald-300 mr-1.5">{latestAlert.title}:</span>
            <span className="text-slate-300">{latestAlert.message}</span>
          </div>
        </div>
      )}

      {/* Selected Workstation Banner if Focused */}
      {selectedStageInfo && (
        <div className="absolute top-4 left-6 z-20 px-4 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-xs font-bold text-cyan-300 shadow-lg">
          {selectedStageInfo}
        </div>
      )}
    </div>
  );
};
