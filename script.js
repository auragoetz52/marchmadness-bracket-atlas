const SCENE = { width: 1800, height: 1320, cardW: 220, cardH: 84 };

const state = {
  data: null,
  rounds: [],
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
  'very high': 'rgba(121,255,191,.16)',
  high: 'rgba(4,207,255,.14)',
  medium: 'rgba(255,200,87,.16)',
  low: 'rgba(255,113,150,.16)',
};

const LABELS = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite Eight',
  5: 'Final Four',
  6: 'National Championship',
};

const els = {
  championName: document.getElementById('championName'),
  gamesCount: document.getElementById('gamesCount'),
  regionButtons: document.getElementById('regionButtons'),
  roundButtons: document.getElementById('roundButtons'),
  championPath: document.getElementById('championPath'),
  viewport: document.getElementById('viewport'),
  scene: document.getElementById('bracketScene'),
  nodesLayer: document.getElementById('nodesLayer'),
  connectorLayer: document.getElementById('connectorLayer'),
  viewLabel: document.getElementById('viewLabel'),
  resetViewBtn: document.getElementById('resetViewBtn'),
  fitChampionBtn: document.getElementById('fitChampionBtn'),
  fitFinalBtn: document.getElementById('fitFinalBtn'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  detailSheet: document.getElementById('detailSheet'),
  closeDetailBtn: document.getElementById('closeDetailBtn'),
  detailRound: document.getElementById('detailRound'),
  detailMatchup: document.getElementById('detailMatchup'),
  detailWinner: document.getElementById('detailWinner'),
  detailProbability: document.getElementById('detailProbability'),
  detailConfidence: document.getElementById('detailConfidence'),
  detailAnalysis: document.getElementById('detailAnalysis'),
  detailImage: document.getElementById('detailImage'),
  detailTitle: document.getElementById('detailTitle'),
  detailCaption: document.getElementById('detailCaption'),
  detailReason: document.getElementById('detailReason'),
  detailSource: document.getElementById('detailSource'),
};

async function init() {
  const data = await fetch('./data.json').then((r) => r.json());
  state.data = data;
  state.rounds = groupRounds(data.matchups);
  state.championIds = new Set(
    data.matchups.filter((m) => m.predicted_winner === data.champion).map((m) => m.id)
  );

  els.championName.textContent = data.champion;
  els.gamesCount.textContent = String(data.total_matchups);

  renderRegionButtons();
  renderRoundButtons();
  renderChampionPath();
  renderScene();
  bindUI();
  requestAnimationFrame(() => fitFull());
}

function groupRounds(matchups) {
  return [...new Set(matchups.map((m) => m.round))]
    .sort((a, b) => a - b)
    .map((round) => ({
      round,
      name: LABELS[round] || `Round ${round}`,
      games: matchups.filter((m) => m.round === round),
    }));
}

function renderRegionButtons() {
  const regions = ['East', 'West', 'South', 'Midwest', 'Final Four'];
  els.regionButtons.innerHTML = '';
  regions.forEach((region) => {
    const btn = document.createElement('button');
    btn.className = 'region-btn';
    btn.type = 'button';
    btn.innerHTML = `<strong>${region}</strong><span>focus bracket area</span>`;
    btn.addEventListener('click', () => focusPreset(region));
    els.regionButtons.appendChild(btn);
  });
}

function renderRoundButtons() {
  els.roundButtons.innerHTML = '';
  state.rounds.forEach((round) => {
    const btn = document.createElement('button');
    btn.className = 'round-btn';
    btn.type = 'button';
    btn.innerHTML = `<strong>${round.name}</strong><span>${round.games.length} games</span>`;
    btn.addEventListener('click', () => focusRound(round.round));
    els.roundButtons.appendChild(btn);
  });
}

function renderChampionPath() {
  const path = state.data.matchups
    .filter((m) => m.predicted_winner === state.data.champion)
    .sort((a, b) => a.round - b.round);

  els.championPath.innerHTML = '';
  path.forEach((game) => {
    const item = document.createElement('button');
    item.className = 'path-item';
    item.type = 'button';
    item.innerHTML = `<strong>${game.round_name}</strong><p>${game.matchup} → <b>${game.predicted_winner}</b> (${pct(game.win_probability)})</p>`;
    item.addEventListener('click', () => {
      focusMatchup(game.id);
      openDetail(game);
    });
    els.championPath.appendChild(item);
  });
}

function renderScene() {
  state.nodes.clear();
  els.nodesLayer.innerHTML = '';
  renderConnectorDefs();

  const labels = [
    ['East', 76, 30],
    ['West', 1512, 30],
    ['South', 76, 710],
    ['Midwest', 1468, 710],
    ['Final Four', 812, 28],
  ];

  labels.forEach(([text, x, y]) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'region-label';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.textContent = text;
    el.addEventListener('click', () => focusPreset(text));
    els.nodesLayer.appendChild(el);
  });

  renderRegion('East', 'left', 92);
  renderRegion('West', 'right', 92);
  renderRegion('South', 'left', 770);
  renderRegion('Midwest', 'right', 770);
  renderFinalRounds();
}

function renderRegion(division, side, yBase) {
  const xCols = side === 'left' ? [58, 334, 612, 838] : [1522, 1246, 968, 742];
  const round1 = state.data.matchups.filter((m) => m.division === division && m.round === 1);
  const round2 = state.data.matchups.filter((m) => m.division === division && m.round === 2);
  const round3 = state.data.matchups.filter((m) => m.division === division && m.round === 3);
  const round4 = state.data.matchups.filter((m) => m.division === division && m.round === 4);
  const rounds = [round1, round2, round3, round4];
  const prevIds = [];

  round1.forEach((game, index) => {
    const x = xCols[0];
    const y = yBase + index * 76;
    placeNode(game, x, y);
    prevIds.push(game.id);
  });

  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex += 1) {
    const games = rounds[roundIndex];
    const currentIds = [];
    games.forEach((game, index) => {
      const sourceA = state.nodes.get(prevIds[index * 2]);
      const sourceB = state.nodes.get(prevIds[index * 2 + 1]);
      const x = xCols[roundIndex];
      const y = ((sourceA.y + sourceB.y) / 2);
      placeNode(game, x, y);
      connectNodes(sourceA, state.nodes.get(game.id), game.id);
      connectNodes(sourceB, state.nodes.get(game.id), game.id);
      currentIds.push(game.id);
    });
    prevIds.length = 0;
    prevIds.push(...currentIds);
  }
}

function renderFinalRounds() {
  const finalFour = state.data.matchups.filter((m) => m.round === 5);
  const title = state.data.matchups.find((m) => m.round === 6);

  placeNode(finalFour[0], 790, 448);
  placeNode(finalFour[1], 790, 792);
  placeNode(title, 790, 620, true);

  connectNodes(state.nodes.get(finalFour[0].id), state.nodes.get(title.id), title.id);
  connectNodes(state.nodes.get(finalFour[1].id), state.nodes.get(title.id), title.id);
}

function placeNode(game, x, y, champion = false) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `match-card${champion ? ' is-champion' : ''}`;
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
  card.dataset.id = game.id;
  card.setAttribute('aria-label', `${game.round_name}${game.division ? ` ${game.division}` : ''} ${game.matchup} ${game.predicted_winner} ${pct(game.win_probability)}`);

  const confidence = game.website_notes?.confidence || 'medium';
  card.innerHTML = `
    <span class="match-card__round">${game.round_name}${game.division ? ` • ${game.division}` : ''}</span>
    <div class="match-card__teams">${game.matchup}</div>
    <div class="match-card__meta">
      <span class="match-card__winner">${game.predicted_winner} • ${pct(game.win_probability)}</span>
      <span class="conf-dot" style="background:${CONF[confidence] || CONF.medium}">${confidence}</span>
    </div>
  `;

  card.addEventListener('click', () => {
    focusMatchup(game.id);
    openDetail(game);
  });

  els.nodesLayer.appendChild(card);
  state.nodes.set(game.id, {
    id: game.id,
    game,
    x,
    y,
    cx: x + SCENE.cardW / 2,
    cy: y + SCENE.cardH / 2,
    left: x,
    right: x + SCENE.cardW,
    top: y,
    bottom: y + SCENE.cardH,
    el: card,
  });
}

function connectNodes(source, target, targetId) {
  const isChampion = state.championIds.has(source.id) && state.championIds.has(targetId);
  const startX = source.cx < target.cx ? source.right : source.left;
  const endX = source.cx < target.cx ? target.left : target.right;
  const midX = startX + (endX - startX) / 2;
  const d = [
    `M ${startX} ${source.cy}`,
    `L ${midX} ${source.cy}`,
    `L ${midX} ${target.cy}`,
    `L ${endX} ${target.cy}`,
  ].join(' ');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', `connector-line${isChampion ? ' is-champion' : ''}`);
  els.connectorLayer.appendChild(path);
}

function renderConnectorDefs() {
  els.connectorLayer.innerHTML = `
    <defs>
      <linearGradient id="connectorGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(124,92,255,0.95)" />
        <stop offset="100%" stop-color="rgba(4,207,255,0.82)" />
      </linearGradient>
      <linearGradient id="championGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(255,200,87,0.98)" />
        <stop offset="100%" stop-color="rgba(255,128,64,0.96)" />
      </linearGradient>
    </defs>
  `;
}

function bindUI() {
  els.resetViewBtn.addEventListener('click', fitFull);
  els.fitChampionBtn.addEventListener('click', () => focusPreset('Champion path'));
  els.fitFinalBtn.addEventListener('click', () => focusPreset('Final Four'));
  els.zoomInBtn.addEventListener('click', () => zoomBy(1.18));
  els.zoomOutBtn.addEventListener('click', () => zoomBy(1 / 1.18));
  els.closeDetailBtn.addEventListener('click', closeDetail);
  els.detailSheet.querySelector('.detail-sheet__backdrop').addEventListener('click', closeDetail);

  const viewport = els.viewport;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.match-card')) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture(e.pointerId);

    if (state.pointers.size === 1) {
      state.drag = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
      state.pinch = null;
    } else if (state.pointers.size === 2) {
      state.drag = null;
      state.pinch = getPinchState();
    }
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!state.pointers.has(e.pointerId)) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 2) {
      const pinch = getPinchState();
      if (!state.pinch) {
        state.pinch = pinch;
        return;
      }

      const multiplier = pinch.distance / state.pinch.distance;
      const nextScale = clamp(state.pinch.startScale * multiplier, 0.42, 2.75);
      state.scale = nextScale;
      state.tx = pinch.center.x - state.pinch.sceneCenter.x * nextScale;
      state.ty = pinch.center.y - state.pinch.sceneCenter.y * nextScale;
      applyTransform();
      return;
    }

    if (state.drag) {
      state.tx = state.drag.tx + (e.clientX - state.drag.x);
      state.ty = state.drag.ty + (e.clientY - state.drag.y);
      applyTransform(false);
    }
  });

  const clearPointer = (e) => {
    state.pointers.delete(e.pointerId);

    if (state.pointers.size === 1) {
      const [remaining] = [...state.pointers.values()];
      state.drag = { x: remaining.x, y: remaining.y, tx: state.tx, ty: state.ty };
      state.pinch = null;
    } else {
      state.drag = null;
      state.pinch = null;
    }

    clampTransform();
    applyTransform(false);
  };

  viewport.addEventListener('pointerup', clearPointer);
  viewport.addEventListener('pointercancel', clearPointer);
  viewport.addEventListener('pointerleave', clearPointer);
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08, e.offsetX, e.offsetY);
  }, { passive: false });

  window.addEventListener('resize', () => applyTransform());
}

function fitFull() {
  state.focusedId = null;
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;
  const scale = Math.min(vw / SCENE.width, vh / SCENE.height) * 0.98;
  state.scale = clamp(scale, 0.42, 1);
  state.tx = (vw - SCENE.width * state.scale) / 2;
  state.ty = Math.max(16, (vh - SCENE.height * state.scale) / 2);
  els.viewLabel.textContent = 'Full bracket overview';
  updateFocusedCard();
  applyTransform();
}

function focusPreset(name) {
  const presets = {
    East: { x: 10, y: 20, w: 920, h: 640, label: 'East region' },
    West: { x: 870, y: 20, w: 920, h: 640, label: 'West region' },
    South: { x: 10, y: 700, w: 920, h: 620, label: 'South region' },
    Midwest: { x: 870, y: 700, w: 920, h: 620, label: 'Midwest region' },
    'Final Four': { x: 720, y: 410, w: 420, h: 470, label: 'Final Four' },
    'Champion path': { x: 720, y: 430, w: 390, h: 360, label: 'Champion path' },
  };
  if (!presets[name]) return;
  state.focusedId = null;
  updateFocusedCard();
  fitRect(presets[name]);
}

function focusRound(round) {
  const games = state.data.matchups.filter((m) => m.round === round).map((m) => state.nodes.get(m.id));
  const bounds = boundsForNodes(games);
  state.focusedId = null;
  updateFocusedCard();
  fitRect({ ...bounds, label: LABELS[round] || `Round ${round}` });
}

function focusMatchup(id) {
  const node = state.nodes.get(id);
  if (!node) return;
  state.focusedId = id;
  updateFocusedCard();
  fitRect({ x: node.x - 70, y: node.y - 80, w: 360, h: 240, label: node.game.matchup });
}

function fitRect({ x, y, w, h, label }) {
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;
  const scale = Math.min(vw / w, vh / h) * 0.84;
  state.scale = clamp(scale, 0.62, 2.6);
  state.tx = vw / 2 - (x + w / 2) * state.scale;
  state.ty = vh / 2 - (y + h / 2) * state.scale;
  els.viewLabel.textContent = label;
  applyTransform();
}

function zoomBy(multiplier, originX, originY) {
  const oldScale = state.scale;
  const newScale = clamp(oldScale * multiplier, 0.42, 2.75);
  if (newScale === oldScale) return;

  const ox = originX ?? els.viewport.clientWidth / 2;
  const oy = originY ?? els.viewport.clientHeight / 2;
  const sceneX = (ox - state.tx) / oldScale;
  const sceneY = (oy - state.ty) / oldScale;

  state.scale = newScale;
  state.tx = ox - sceneX * newScale;
  state.ty = oy - sceneY * newScale;
  applyTransform();
}

function applyTransform(shouldClamp = true) {
  if (shouldClamp) clampTransform();
  els.scene.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
}

function clampTransform() {
  const vw = els.viewport.clientWidth;
  const vh = els.viewport.clientHeight;
  const sceneW = SCENE.width * state.scale;
  const sceneH = SCENE.height * state.scale;
  const minX = Math.min(40, vw - sceneW - 40);
  const maxX = Math.max(40, vw - sceneW + 40);
  const minY = Math.min(40, vh - sceneH - 40);
  const maxY = Math.max(40, vh - sceneH + 40);
  state.tx = clamp(state.tx, maxX, minX);
  state.ty = clamp(state.ty, maxY, minY);
}

function updateFocusedCard() {
  state.nodes.forEach((node) => {
    node.el.classList.toggle('is-focused', node.id === state.focusedId);
  });
}

function openDetail(matchup) {
  els.detailRound.textContent = `${matchup.round_name}${matchup.division ? ` • ${matchup.division}` : ''}`;
  els.detailMatchup.textContent = matchup.matchup;
  els.detailWinner.textContent = `Pick: ${matchup.predicted_winner}`;
  els.detailProbability.textContent = `${pct(matchup.win_probability)} win probability`;
  els.detailConfidence.textContent = `${matchup.website_notes?.confidence || 'medium'} confidence`;
  els.detailAnalysis.textContent = matchup.prediction_analysis;
  els.detailImage.src = matchup.key_prediction_attribute?.image_url || '';
  els.detailImage.alt = matchup.key_prediction_attribute?.name || 'Key factor';
  els.detailTitle.textContent = matchup.website_notes?.popup_title || matchup.key_prediction_attribute?.name || 'Key factor';
  els.detailCaption.textContent = matchup.website_notes?.popup_caption || matchup.key_prediction_attribute?.reason || '';
  els.detailReason.textContent = matchup.key_prediction_attribute?.reason || matchup.prediction_analysis;
  els.detailSource.textContent = matchup.key_prediction_attribute?.image_source || matchup.key_prediction_attribute?.type || 'Prediction data';
  els.detailSheet.classList.add('is-open');
  els.detailSheet.setAttribute('aria-hidden', 'false');
}

function closeDetail() {
  els.detailSheet.classList.remove('is-open');
  els.detailSheet.setAttribute('aria-hidden', 'true');
}

function boundsForNodes(nodes) {
  const filtered = nodes.filter(Boolean);
  const xs = filtered.map((n) => n.x);
  const ys = filtered.map((n) => n.y);
  const rights = filtered.map((n) => n.x + SCENE.cardW);
  const bottoms = filtered.map((n) => n.y + SCENE.cardH);
  return {
    x: Math.min(...xs) - 70,
    y: Math.min(...ys) - 70,
    w: Math.max(...rights) - Math.min(...xs) + 140,
    h: Math.max(...bottoms) - Math.min(...ys) + 140,
  };
}

function getPinchState() {
  const [a, b] = [...state.pointers.values()];
  const center = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    center,
    distance,
    startScale: state.pinch?.startScale ?? state.scale,
    sceneCenter: state.pinch?.sceneCenter ?? {
      x: (center.x - state.tx) / state.scale,
      y: (center.y - state.ty) / state.scale,
    },
  };
}

function pct(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

init().catch((error) => {
  console.error(error);
  els.nodesLayer.innerHTML = '<div style="padding:20px;color:white">Failed to load bracket data.</div>';
});
