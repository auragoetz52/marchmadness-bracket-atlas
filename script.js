const SCENE = { width: 2000, height: 1540, cardW: 160, cardH: 60 };

const state = {
  data: null,
  scale: 1,
  tx: 0,
  ty: 0,
  drag: null,
  pinch: null,
  pointers: new Map(),
  focusedId: null,
  nodes: new Map(),
  championIds: new Set(),
};

const CONF = {
  'very high': 'rgba(16, 185, 129, 0.4)',
  high: 'rgba(59, 130, 246, 0.4)',
  medium: 'rgba(245, 158, 11, 0.3)',
  low: 'rgba(244, 63, 94, 0.3)',
};

const els = {
  gamesCountText: document.getElementById('gamesCountText'),
  viewport: document.getElementById('viewport'),
  scene: document.getElementById('bracketScene'),
  nodesLayer: document.getElementById('nodesLayer'),
  connectorLayer: document.getElementById('connectorLayer'),
  resetViewBtn: document.getElementById('resetViewBtn'),
  detailSheet: document.getElementById('detailSheet'),
  closeDetailBtn: document.getElementById('closeDetailBtn'),
  closeDetailBackdrop: document.getElementById('closeDetailBackdrop'),
  detailRound: document.getElementById('detailRound'),
  detailMatchup: document.getElementById('detailMatchup'),
  detailWinner: document.getElementById('detailWinner'),
  detailProbability: document.getElementById('detailProbability'),
  detailConfidence: document.getElementById('detailConfidence'),
  detailAnalysis: document.getElementById('detailAnalysis'),
  detailImage: document.getElementById('detailImage'),
  detailTitle: document.getElementById('detailTitle'),
  detailCaption: document.getElementById('detailCaption'),
};

async function init() {
  try {
    const data = await fetch('./data.json').then((r) => r.json());
    state.data = data;
    state.championIds = new Set(
      data.matchups.filter((m) => m.predicted_winner === data.champion).map((m) => m.id)
    );
    els.gamesCountText.textContent = `${data.total_matchups} Predictions • Champ: ${data.champion}`;

    renderScene();
    bindUI();
    
    // Slight delay for smooth load-in effect
    requestAnimationFrame(() => fitFull());
  } catch (error) {
    console.error('Failed to init app:', error);
    els.nodesLayer.innerHTML = '<div style="padding:40px;text-align:center;color:#f43f5e">Failed to load bracket data.</div>';
  }
}

function renderScene() {
  state.nodes.clear();
  els.nodesLayer.innerHTML = '';
  renderConnectorDefs();

  // Draw Regions Labels
  const labels = [
    { text: 'East', x: 40, y: 20 },
    { text: 'West', x: 40, y: 780 },
    { text: 'South', x: 1780, y: 20 },
    { text: 'Midwest', x: 1730, y: 780 },
    { text: 'Final Four', x: 880, y: 400 },
  ];
  labels.forEach(({text, x, y}) => {
    const el = document.createElement('div');
    el.className = 'region-label';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = text;
    els.nodesLayer.appendChild(el);
  });

  // Build symmetrical bracket
  renderRegion('East', 'left', 100);
  renderRegion('West', 'left', 860);
  renderRegion('South', 'right', 100);
  renderRegion('Midwest', 'right', 860);
  
  // Final Four and Championship
  renderFinals();
}

function renderRegion(division, side, yOffset) {
  const xCoords = side === 'left' ? [40, 240, 440, 640] : [1800, 1600, 1400, 1200];
  const rounds = [1, 2, 3, 4].map(r => state.data.matchups.filter(m => m.division === division && m.round === r));
  
  let prevIds = [];
  
  // Round 1
  rounds[0].forEach((game, index) => {
    const x = xCoords[0];
    const y = yOffset + (index * 84); // 84px spacing
    placeNode(game, x, y);
    prevIds.push(game.id);
  });

  // Round 2, 3, 4
  for (let r = 1; r < rounds.length; r++) {
    const currentIds = [];
    rounds[r].forEach((game, index) => {
      const sourceA = state.nodes.get(prevIds[index * 2]);
      const sourceB = state.nodes.get(prevIds[index * 2 + 1]);
      const x = xCoords[r];
      // Y is centered between the two parents
      const y = (sourceA.y + sourceB.y) / 2;
      placeNode(game, x, y);
      connect(sourceA, state.nodes.get(game.id), game.id);
      connect(sourceB, state.nodes.get(game.id), game.id);
      currentIds.push(game.id);
    });
    prevIds = currentIds;
  }
}

function renderFinals() {
  const ffGames = state.data.matchups.filter((m) => m.round === 5);
  const titleGame = state.data.matchups.find((m) => m.round === 6);
  
  if (!ffGames.length || !titleGame) return;

  // Final Four connections (Left side champion vs Right side champion usually)
  // East + West connect to Left FF. South + Midwest connect to Right FF.
  const eastChamp = state.nodes.get(state.data.matchups.find(m => m.division === 'East' && m.round === 4)?.id);
  const westChamp = state.nodes.get(state.data.matchups.find(m => m.division === 'West' && m.round === 4)?.id);
  const southChamp = state.nodes.get(state.data.matchups.find(m => m.division === 'South' && m.round === 4)?.id);
  const midWestChamp = state.nodes.get(state.data.matchups.find(m => m.division === 'Midwest' && m.round === 4)?.id);

  const leftFFY = ((eastChamp?.y || 0) + (westChamp?.y || 0)) / 2;
  const rightFFY = ((southChamp?.y || 0) + (midWestChamp?.y || 0)) / 2;

  // Place Final Four
  placeNode(ffGames[0], 800, leftFFY);
  placeNode(ffGames[1], 1040, rightFFY);

  if (eastChamp && westChamp) {
    connect(eastChamp, state.nodes.get(ffGames[0].id), ffGames[0].id);
    connect(westChamp, state.nodes.get(ffGames[0].id), ffGames[0].id);
  }
  if (southChamp && midWestChamp) {
    connect(southChamp, state.nodes.get(ffGames[1].id), ffGames[1].id);
    connect(midWestChamp, state.nodes.get(ffGames[1].id), ffGames[1].id);
  }

  // Place Title Game perfectly centered
  const titleY = (leftFFY + rightFFY) / 2;
  placeNode(titleGame, 920, titleY, true);

  connect(state.nodes.get(ffGames[0].id), state.nodes.get(titleGame.id), titleGame.id);
  connect(state.nodes.get(ffGames[1].id), state.nodes.get(titleGame.id), titleGame.id);
}

function placeNode(game, x, y, isChampionItem = false) {
  const el = document.createElement('button');
  el.className = `match-card ${isChampionItem ? 'is-champion' : ''}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.dataset.id = game.id;
  
  el.innerHTML = `
    <p class="card-teams">${game.matchup}</p>
    <p class="card-winner">Pick: <span class="card-winner-highlight">${game.predicted_winner}</span> (${pct(game.win_probability)})</p>
  `;

  el.addEventListener('click', () => {
    state.nodes.forEach(n => n.el.classList.remove('is-focused'));
    el.classList.add('is-focused');
    openDetail(game);
  });

  els.nodesLayer.appendChild(el);

  state.nodes.set(game.id, {
    id: game.id,
    game,
    x, y,
    cx: x + SCENE.cardW / 2,
    cy: y + SCENE.cardH / 2,
    left: x,
    right: x + SCENE.cardW,
    el
  });
}

function connect(source, target, targetId) {
  if (!source || !target) return;
  const isChampionLine = state.championIds.has(source.id) && state.championIds.has(targetId);
  
  // Decide routing. Normally, from right of left-node to left of right-node.
  // We determine left-to-right visually.
  const startX = source.cx < target.cx ? source.right : source.left;
  const endX = source.cx < target.cx ? target.left : target.right;
  const midX = startX + (endX - startX) / 2;
  
  const d = [
    `M ${startX} ${source.cy}`,
    `C ${midX} ${source.cy}, ${midX} ${target.cy}, ${endX} ${target.cy}`
  ].join(' ');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', `connector-line ${isChampionLine ? 'is-champion' : ''}`);
  els.connectorLayer.appendChild(path);
}

function renderConnectorDefs() {
  els.connectorLayer.innerHTML = `
    <defs>
      <linearGradient id="championGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#10b981" />
        <stop offset="50%" stop-color="#3b82f6" />
        <stop offset="100%" stop-color="#10b981" />
      </linearGradient>
    </defs>
  `;
}

// -------------------------------------------------------------
// Viewport & Pan/Zoom Logic
// -------------------------------------------------------------
function bindUI() {
  els.resetViewBtn.addEventListener('click', fitFull);
  
  els.closeDetailBtn.addEventListener('click', closeDetail);
  els.closeDetailBackdrop.addEventListener('click', closeDetail);

  const vp = els.viewport;

  vp.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.match-card') || els.detailSheet.classList.contains('is-open')) return;
    
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    vp.setPointerCapture(e.pointerId);

    if (state.pointers.size === 1) {
      state.drag = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
      state.pinch = null;
    } else if (state.pointers.size === 2) {
      state.drag = null;
      state.pinch = getPinchState();
    }
  });

  vp.addEventListener('pointermove', (e) => {
    if (!state.pointers.has(e.pointerId)) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 2) {
      const pinch = getPinchState();
      if (!state.pinch) { state.pinch = pinch; return; }
      
      const multiplier = pinch.dist / state.pinch.dist;
      const nextScale = clamp(state.pinch.startScale * multiplier, 0.15, 3.0);
      state.scale = nextScale;
      state.tx = pinch.center.x - state.pinch.sceneCenter.x * nextScale;
      state.ty = pinch.center.y - state.pinch.sceneCenter.y * nextScale;
      applyTransform(false);
      return;
    }

    if (state.drag) {
      state.tx = state.drag.tx + (e.clientX - state.drag.x);
      state.ty = state.drag.ty + (e.clientY - state.drag.y);
      applyTransform(false);
    }
  });

  const clearPtr = (e) => {
    state.pointers.delete(e.pointerId);
    if (state.pointers.size === 1) {
      const rem = [...state.pointers.values()][0];
      state.drag = { x: rem.x, y: rem.y, tx: state.tx, ty: state.ty };
      state.pinch = null;
    } else {
      state.drag = null; state.pinch = null;
    }
    applyTransform(true); // Clamp upon release
  };

  vp.addEventListener('pointerup', clearPtr);
  vp.addEventListener('pointercancel', clearPtr);
  vp.addEventListener('pointerleave', clearPtr);

  vp.addEventListener('wheel', (e) => {
    if(els.detailSheet.classList.contains('is-open')) return;
    e.preventDefault();
    const mult = e.deltaY < 0 ? 1.1 : 0.9;
    zoomBy(mult, e.clientX, e.clientY);
  }, { passive: false });

  window.addEventListener('resize', () => applyTransform(true));
}

function fitFull() {
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;
  const targetScale = Math.min(vw / (SCENE.width + 40), vh / (SCENE.height + 140));
  
  state.scale = clamp(targetScale, 0.15, 1);
  state.tx = (vw - SCENE.width * state.scale) / 2;
  state.ty = vw < 768 ? 140 : (vh - SCENE.height * state.scale) / 2;
  applyTransform(true);
}

function zoomBy(multiplier, ox, oy) {
  const nextScale = clamp(state.scale * multiplier, 0.15, 3.0);
  const sceneX = (ox - state.tx) / state.scale;
  const sceneY = (oy - state.ty) / state.scale;
  
  state.scale = nextScale;
  state.tx = ox - sceneX * nextScale;
  state.ty = oy - sceneY * nextScale;
  applyTransform(true);
}

function applyTransform(doClamp = true) {
  if (doClamp) clampTransform();
  els.scene.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
}

function clampTransform() {
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;
  const sw = SCENE.width * state.scale;
  const sh = SCENE.height * state.scale;
  
  const buffer = 150;
  const minTx = vw - sw - buffer;
  const maxTx = buffer;
  const minTy = vh - sh - buffer;
  const maxTy = buffer;
  
  state.tx = clamp(state.tx, Math.min(minTx, maxTx), Math.max(minTx, maxTx));
  state.ty = clamp(state.ty, Math.min(minTy, maxTy), Math.max(minTy, maxTy));
}

function getPinchState() {
  const [a, b] = [...state.pointers.values()];
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    center: { x: cx, y: cy },
    dist,
    startScale: state.pinch?.startScale ?? state.scale,
    sceneCenter: state.pinch?.sceneCenter ?? { x: (cx - state.tx)/state.scale, y: (cy - state.ty)/state.scale }
  };
}

// -------------------------------------------------------------
// Details UI
// -------------------------------------------------------------
function openDetail(m) {
  els.detailRound.textContent = `${m.round_name}${m.division ? ` • ${m.division}` : ''}`;
  els.detailMatchup.textContent = m.matchup;
  els.detailWinner.textContent = `Pick: ${m.predicted_winner}`;
  els.detailProbability.textContent = `${pct(m.win_probability)} Win Prob`;
  
  const conf = m.website_notes?.confidence || 'medium';
  els.detailConfidence.textContent = `${conf} Confidence`;
  els.detailConfidence.style.color = '#fff';
  els.detailConfidence.style.backgroundColor = CONF[conf] || CONF.medium;

  els.detailAnalysis.textContent = m.prediction_analysis;
  
  if (m.key_prediction_attribute) {
    els.detailImage.src = m.key_prediction_attribute.image_url || '';
    els.detailTitle.textContent = m.website_notes?.popup_title || m.key_prediction_attribute.name;
    els.detailCaption.textContent = m.website_notes?.popup_caption || m.key_prediction_attribute.reason;
  }
  
  els.detailSheet.classList.add('is-open');
  els.detailSheet.setAttribute('aria-hidden', 'false');
  
  // Also slightly adjust pan to ensure node is visible above bottom sheet in mobile
  if (window.innerWidth < 768) {
    const nodeYOnScreen = (state.nodes.get(m.id).cy * state.scale) + state.ty;
    const sheetTop = window.innerHeight * 0.4; // rough estimate of sheet height top
    if (nodeYOnScreen > sheetTop) {
      state.ty -= (nodeYOnScreen - sheetTop + 50);
      applyTransform(true);
    }
  }
}

function closeDetail() {
  els.detailSheet.classList.remove('is-open');
  els.detailSheet.setAttribute('aria-hidden', 'true');
  state.nodes.forEach(n => n.el.classList.remove('is-focused'));
}

// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
function pct(v) { return `${Math.round((v || 0) * 100)}%`; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

init();
