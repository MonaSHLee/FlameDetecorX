const BOARD_SIZE = 36;
const MAX_TIME = 60;
const SCORE_PER_FIRE = 1000;
const FAST_BONUS_TIME = 5;
const FAST_HIT_WINDOW = 1000;
const MISS_PENALTY = 3;
const FAKE_LIFETIME = 2000;
const RANKINGS_KEY = "flame-detector-rankings";

const STAGE_CONFIG = [
  { stage: 1,  spawnInterval: 1300, burnTime: 2400, fakeChance: 0.15, maxFires: 1 },
  { stage: 2,  spawnInterval: 1100, burnTime: 2000, fakeChance: 0.20, maxFires: 1 },
  { stage: 3,  spawnInterval:  980, burnTime: 1750, fakeChance: 0.25, maxFires: 1 },
  { stage: 4,  spawnInterval:  900, burnTime: 2000, fakeChance: 0.30, maxFires: 2 },
  { stage: 5,  spawnInterval:  810, burnTime: 1850, fakeChance: 0.35, maxFires: 2 },
  { stage: 6,  spawnInterval:  730, burnTime: 1700, fakeChance: 0.40, maxFires: 2 },
  { stage: 7,  spawnInterval:  660, burnTime: 1560, fakeChance: 0.44, maxFires: 2 },
  { stage: 8,  spawnInterval:  600, burnTime: 1440, fakeChance: 0.47, maxFires: 2 },
  { stage: 9,  spawnInterval:  550, burnTime: 1340, fakeChance: 0.49, maxFires: 2 },
  { stage: 10, spawnInterval:  510, burnTime: 1250, fakeChance: 0.50, maxFires: 2 },
];

const board = document.querySelector("#board");
const stageEl = document.querySelector("#stage");
const timeEl = document.querySelector("#time");
const scoreEl = document.querySelector("#score");
const messageEl = document.querySelector("#message");
const startScreen = document.querySelector("#startScreen");
const gameOverScreen = document.querySelector("#gameOverScreen");
const countdownEl = document.querySelector("#countdown");
const stageBannerEl = document.querySelector("#stageBanner");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const resetButton = document.querySelector("#resetButton");
const finalScoreEl = document.querySelector("#finalScore");
const finalStageEl = document.querySelector("#finalStage");
const bestScoreEl = document.querySelector("#bestScore");
const gameOverReasonEl = document.querySelector("#gameOverReason");
const newRecordEl = document.querySelector("#newRecord");
const fireFlashEl = document.querySelector("#fireFlash");
const rankingListEl = document.querySelector("#rankingList");
const gameOverRankingEl = document.querySelector("#gameOverRanking");
const nameInputScreenEl = document.querySelector("#nameInputScreen");
const nameInputEl = document.querySelector("#nameInput");
const nameConfirmButtonEl = document.querySelector("#nameConfirmButton");
const rankEntryTitleEl = document.querySelector("#rankEntryTitle");
const rankNoticeEl = document.querySelector("#rankNotice");
const bgmEl = document.querySelector("#bgm");
const howtoButton = document.querySelector("#howtoButton");
const howtoPanelEl = document.querySelector("#howtoPanel");
const titlePanelEl = document.querySelector("#titlePanel");

// ── 효과음 ──────────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

function playHit(fast = false) {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // 메인 chirp: 삼각파 빠른 상승 (청량한 전자 Blip)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(fast ? 900 : 600, now);
  osc.frequency.exponentialRampToValueAtTime(fast ? 2400 : 1600, now + 0.08);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc.start(now);
  osc.stop(now + 0.13);
  // 보조 사인파: 짧은 Blip 레이어로 확인감 강조
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(fast ? 1800 : 1200, now + 0.03);
  gain2.gain.setValueAtTime(0.15, now + 0.03);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc2.start(now + 0.03);
  osc2.stop(now + 0.14);
}

function playMiss() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // 메인: 낮은 톱니파 급강하 (로봇 버저음)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.26);
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc.start(now);
  osc.stop(now + 0.28);
  // 디스코드 레이어: 미묘하게 다른 주파수 → beating으로 불쾌감 강조
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(290, now);
  osc2.frequency.exponentialRampToValueAtTime(70, now + 0.26);
  gain2.gain.setValueAtTime(0.18, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc2.start(now);
  osc2.stop(now + 0.28);
}

function playStartClick() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.start(now);
  osc.stop(now + 0.14);
}

function playCountdownBeep() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // 묵직한 사각파: 440Hz→330Hz 빠른 하강 (테크노풍 전자 비프)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.005); // 날카로운 어택
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
  osc.start(now);
  osc.stop(now + 0.13);
  // 날카로운 고음 레이어: 사인파 880Hz로 선명함 추가
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(880, now);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.12, now + 0.003);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc2.start(now);
  osc2.stop(now + 0.07);
}

function playGameStartSfx() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // 1. White Noise + Lowpass 필터: 화염 폭발 Whoosh
  //    랜덤 샘플로 직접 버퍼를 채워 White Noise를 생성
  const bufferSize = Math.ceil(ctx.sampleRate * 0.5);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  // Lowpass 주파수를 빠르게 낮춰 폭발이 꺼지는 느낌을 냄
  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = "lowpass";
  lpFilter.frequency.setValueAtTime(3000, now);
  lpFilter.frequency.exponentialRampToValueAtTime(200, now + 0.45);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  noiseSource.connect(lpFilter);
  lpFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  noiseSource.stop(now + 0.5);
  // 2. 저음 톱니파: 저주파 상승→하강으로 폭발 충격파 표현
  const oscLow = ctx.createOscillator();
  const gainLow = ctx.createGain();
  oscLow.connect(gainLow);
  gainLow.connect(ctx.destination);
  oscLow.type = "sawtooth";
  oscLow.frequency.setValueAtTime(60, now);
  oscLow.frequency.exponentialRampToValueAtTime(300, now + 0.15);
  oscLow.frequency.exponentialRampToValueAtTime(80, now + 0.45);
  gainLow.gain.setValueAtTime(0, now);
  gainLow.gain.linearRampToValueAtTime(0.35, now + 0.04);
  gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  oscLow.start(now);
  oscLow.stop(now + 0.5);
  // 3. 고음 사인파 상승: 에너지가 솟구치는 느낌
  const oscHigh = ctx.createOscillator();
  const gainHigh = ctx.createGain();
  oscHigh.connect(gainHigh);
  gainHigh.connect(ctx.destination);
  oscHigh.type = "sine";
  oscHigh.frequency.setValueAtTime(350, now + 0.05);
  oscHigh.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
  gainHigh.gain.setValueAtTime(0, now + 0.05);
  gainHigh.gain.linearRampToValueAtTime(0.22, now + 0.1);
  gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  oscHigh.start(now + 0.05);
  oscHigh.stop(now + 0.4);
}

function playGameOver() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // 1. 메인 파워다운: 톱니파 고음→저음 급강하 (에너지 방전)
  const oscMain = ctx.createOscillator();
  const gainMain = ctx.createGain();
  oscMain.connect(gainMain);
  gainMain.connect(ctx.destination);
  oscMain.type = "sawtooth";
  oscMain.frequency.setValueAtTime(380, now);
  oscMain.frequency.exponentialRampToValueAtTime(35, now + 0.85);
  gainMain.gain.setValueAtTime(0.35, now);
  gainMain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  oscMain.start(now);
  oscMain.stop(now + 0.9);
  // 2. White Noise + Highpass 필터: 시스템 방전 지직거림
  //    고주파→저주파로 필터를 낮춰 불꽃 튀다 꺼지는 느낌
  const bufferSize = Math.ceil(ctx.sampleRate * 0.5);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = "highpass";
  hpFilter.frequency.setValueAtTime(4000, now);
  hpFilter.frequency.exponentialRampToValueAtTime(300, now + 0.5);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.18, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  noiseSource.connect(hpFilter);
  hpFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  noiseSource.stop(now + 0.5);
  // 3. 계단식 주파수 하강: 사각파로 시스템 다운 스텝 표현
  [280, 190, 120, 70].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    const t = now + i * 0.19;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.17);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.19);
  });
}
// ────────────────────────────────────────────────────────────────────────────

let cells = [];
let activeFires = new Map();
let activeFake = null;
let score = 0;
let timeLeft = MAX_TIME;
let stage = 1;
let stageClears = 0;
let running = false;
let countdownRunning = false;
let stageBannerActive = false;
let lastFrame = 0;
let lastSpawn = 0;
let animationFrame = 0;

function getRankings() {
  try { return JSON.parse(localStorage.getItem(RANKINGS_KEY)) || []; }
  catch { return []; }
}

function getBestScore() {
  const r = getRankings();
  return r.length > 0 ? r[0].score : 0;
}

function saveRanking(name, sc, stageNum) {
  const r = getRankings();
  const date = new Date();
  const label = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  r.push({ name, score: sc, stage: stageNum, date: label });
  r.sort((a, b) => b.score - a.score || b.stage - a.stage);
  localStorage.setItem(RANKINGS_KEY, JSON.stringify(r.slice(0, 3)));
}

function qualifiesForRanking(sc) {
  if (sc <= 0) return false;
  const r = getRankings();
  return r.length < 3 || sc > r[r.length - 1].score;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function renderRankings(container, highlightScore = -1) {
  if (!container) return;
  const r = getRankings();
  if (r.length === 0) {
    container.innerHTML = '<p class="rank-empty">— NO RECORDS YET —</p>';
    return;
  }
  container.innerHTML = r.map((entry, i) => {
    const hl = highlightScore > 0 && entry.score === highlightScore ? " highlight" : "";
    return `<div class="ranking-row rank-${i + 1}${hl}">
      <span class="rank-num">#${i + 1}</span>
      <span class="rank-name">${escapeHtml(entry.name)}</span>
      <span class="rank-score">${entry.score.toLocaleString("ko-KR")}</span>
      <span class="rank-stage">S.${entry.stage}</span>
    </div>`;
  }).join("");
}

function getStageConfig() {
  return STAGE_CONFIG[Math.min(stage, 10) - 1];
}

function getRequiredClearsForStage(currentStage) {
  return 8;
}

function createBoard() {
  board.innerHTML = "";
  cells = Array.from({ length: BOARD_SIZE }, (_, index) => {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.setAttribute("aria-label", `${index + 1}번 칸`);
    button.addEventListener("pointerdown", () => handleCellPress(index));
    board.appendChild(button);
    return button;
  });
}

function resetState() {
  activeFires.forEach((fire) => clearTimeout(fire.timeoutId));
  if (activeFake) {
    clearTimeout(activeFake.timeoutId);
  }
  activeFires.clear();
  activeFake = null;
  score = 0;
  timeLeft = MAX_TIME;
  stage = 1;
  stageClears = 0;
  running = false;
  countdownRunning = false;
  stageBannerActive = false;
  lastFrame = 0;
  lastSpawn = 0;
  cancelAnimationFrame(animationFrame);
  cells.forEach((cell) => {
    cell.className = "cell";
  });
  board.classList.remove("blur-out", "shake-hard");
  restartButton.classList.remove("btn-visible");
  hideStageBanner();
  updateHud();
}

function updateHud() {
  stageEl.textContent = stage;
  timeEl.textContent = timeLeft.toFixed(1);
  scoreEl.textContent = score.toLocaleString("ko-KR");

  if (timeLeft <= 10) {
    timeEl.style.color = "#ff2200";
    timeEl.classList.add("time-blink");
  } else if (timeLeft <= 30) {
    timeEl.style.color = "#ffee00";
    timeEl.classList.remove("time-blink");
  } else {
    timeEl.style.color = "#00ff41";
    timeEl.classList.remove("time-blink");
  }
}

function updateBestDisplay() {
  renderRankings(rankingListEl);
  bestScoreEl.textContent = getBestScore().toLocaleString("ko-KR");
}

function showMessage(text) {
  messageEl.textContent = text;
}

function showStageBanner(nextStage) {
  stageBannerActive = true;

  // 화재·가짜 징후 타이머 일시 중지
  activeFires.forEach((fire) => clearTimeout(fire.timeoutId));
  if (activeFake) clearTimeout(activeFake.timeoutId);

  stageBannerEl.textContent = `STAGE ${nextStage}`;
  stageBannerEl.classList.remove("hidden");
  stageBannerEl.setAttribute("aria-hidden", "false");
  stageBannerEl.style.animation = "none";
  void stageBannerEl.offsetWidth;
  stageBannerEl.style.animation = "";

  // 플레이어 터치 시 배너 종료
  // 현재 탭 이벤트가 완전히 종료된 뒤 리스너를 등록 (bleed-through 방지)
  setTimeout(() => {
    if (stageBannerActive) {
      stageBannerEl.addEventListener("pointerdown", hideStageBanner, { once: true });
    }
  }, 200);
}

function hideStageBanner() {
  playStartClick();
  stageBannerActive = false;
  stageBannerEl.classList.add("hidden");
  stageBannerEl.setAttribute("aria-hidden", "true");

  // 기존 화재·가짜 징후 전부 제거 후 새 스테이지 시작
  activeFires.forEach((fire) => clearTimeout(fire.timeoutId));
  activeFires.clear();
  if (activeFake) {
    clearTimeout(activeFake.timeoutId);
    activeFake = null;
  }
  cells.forEach((cell) => { cell.className = "cell"; });

  // 즉시 새 징후 스폰
  lastSpawn = performance.now() - getStageConfig().spawnInterval;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startCountdown() {
  countdownRunning = true;
  countdownEl.classList.remove("hidden");
  countdownEl.setAttribute("aria-hidden", "false");

  for (const [num, src] of [["3", "cd-three"], ["2", "cd-two"], ["1", "cd-one"]]) {
    countdownEl.innerHTML = `<img src="images/${src}.png" class="cd-img" alt="${num}">`;
    playCountdownBeep();
    await sleep(650);
  }

  countdownEl.innerHTML = `<img src="images/START Logo.png" class="start-logo-img" alt="START">`;
  playGameStartSfx();
  await sleep(450);
  countdownEl.classList.add("hidden");
  countdownEl.innerHTML = "";
  countdownEl.setAttribute("aria-hidden", "true");
  countdownRunning = false;
}

async function startGame() {
  if (countdownRunning) return;
  playStartClick();
  resetState();
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  nameInputScreenEl.classList.add("hidden");
  showMessage("붉은 칸을 빠르게 터치하세요.");
  bgmEl.volume = 0.2;
  bgmEl.currentTime = 0;
  bgmEl.play().catch(() => {});
  await startCountdown();
  running = true;
  lastFrame = performance.now();
  lastSpawn = lastFrame - getStageConfig().spawnInterval;
  animationFrame = requestAnimationFrame(tick);
}

function tick(now) {
  if (!running) {
    return;
  }

  const delta = (now - lastFrame) / 1000;
  lastFrame = now;

  if (!stageBannerActive) {
    timeLeft = Math.max(0, timeLeft - delta);

    if (timeLeft <= 0) {
      endGame("시간 종료");
      return;
    }

    const config = getStageConfig();
    if (now - lastSpawn >= config.spawnInterval) {
      spawnThreats(now, config);
      lastSpawn = now;
    }

    updateFireStages(now, config);
  }

  updateHud();
  animationFrame = requestAnimationFrame(tick);
}

function spawnThreats(now, config) {
  while (activeFires.size < config.maxFires) {
    const index = pickFreeCell();
    if (index === null) {
      break;
    }
    spawnFire(index, now, config.burnTime);
  }

  if (!activeFake && config.fakeChance > 0 && Math.random() < config.fakeChance) {
    const index = pickFreeCell();
    if (index !== null) {
      spawnFake(index);
    }
  }
}

function pickFreeCell() {
  const occupied = new Set(activeFires.keys());
  if (activeFake) {
    occupied.add(activeFake.index);
  }

  const freeCells = cells
    .map((_, index) => index)
    .filter((index) => !occupied.has(index));

  if (freeCells.length === 0) {
    return null;
  }

  return freeCells[Math.floor(Math.random() * freeCells.length)];
}

function spawnFire(index, createdAt, burnTime) {
  const timeoutId = setTimeout(() => {
    if (running && activeFires.has(index)) {
      endGame("실제 화재 발생", index);
    }
  }, burnTime);

  activeFires.set(index, { index, createdAt, burnTime, timeoutId });
  cells[index].className = "cell fire-stage-1";
}

function spawnFake(index) {
  const timeoutId = setTimeout(() => {
    if (activeFake && activeFake.index === index) {
      cells[index].className = "cell";
      activeFake = null;
    }
  }, FAKE_LIFETIME);

  activeFake = { index, timeoutId, createdAt: performance.now() };
  cells[index].className = "cell fake";
}

function updateFireStages(now) {
  activeFires.forEach((fire, index) => {
    const progress = (now - fire.createdAt) / fire.burnTime;
    const cell = cells[index];
    if (progress >= 0.72) {
      cell.className = "cell fire-stage-3";
    } else if (progress >= 0.38) {
      cell.className = "cell fire-stage-2";
    } else {
      cell.className = "cell fire-stage-1";
    }
  });
}

function handleCellPress(index) {
  if (!running || countdownRunning || stageBannerActive) {
    return;
  }

  if (activeFires.has(index)) {
    hitFire(index);
    return;
  }

  if (activeFake && activeFake.index === index) {
    clearTimeout(activeFake.timeoutId);
    activeFake = null;
    applyPenalty(index, "가짜 징후입니다. 시간 -3초");
    return;
  }

  applyPenalty(index, "빈 칸입니다. 시간 -3초");
}

function hitFire(index) {
  const fire = activeFires.get(index);
  clearTimeout(fire.timeoutId);
  activeFires.delete(index);

  score += SCORE_PER_FIRE;
  stageClears += 1;
  const previousStage = stage;

  while (stageClears >= getRequiredClearsForStage(stage)) {
    stageClears -= getRequiredClearsForStage(stage);
    stage += 1;
  }

  const reactionTime = performance.now() - fire.createdAt;
  const isFastHit = reactionTime <= FAST_HIT_WINDOW;
  if (isFastHit) {
    timeLeft = Math.min(MAX_TIME, timeLeft + FAST_BONUS_TIME);
  }

  if (stage > previousStage) {
    showStageBanner(stage);
    showMessage(`스테이지 ${stage} 진입!`);
  } else if (isFastHit) {
    showMessage("빠른 감지! 시간 +5초");
  } else {
    showMessage("화재 징후 제거! +1000점");
  }

  playHit(isFastHit);
  flashCell(index, "hit");
  updateHud();

  // 제거 즉시 다음 징후 스폰을 트리거
  lastSpawn = performance.now() - getStageConfig().spawnInterval;
}

function applyPenalty(index, text) {
  timeLeft = Math.max(0, timeLeft - MISS_PENALTY);
  playMiss();
  flashCell(index, "miss");
  board.classList.remove("shake");
  void board.offsetWidth;
  board.classList.add("shake");
  showMessage(text);
  updateHud();

  if (timeLeft <= 0) {
    endGame("시간 종료");
  }
}

function flashCell(index, className) {
  cells[index].className = `cell ${className}`;
  setTimeout(() => {
    if (!activeFires.has(index) && (!activeFake || activeFake.index !== index)) {
      cells[index].className = "cell";
    }
  }, 280);
}

let pendingEndReason = "";

function endGame(reason, fireIndex = -1) {
  running = false;
  cancelAnimationFrame(animationFrame);
  activeFires.forEach((fire) => clearTimeout(fire.timeoutId));
  if (activeFake) clearTimeout(activeFake.timeoutId);

  updateHud();
  playGameOver();
  showMessage("다시 시작해서 최고 점수를 갱신해보세요.");

  if (fireIndex >= 0) {
    triggerFireExplosion(fireIndex);
    setTimeout(() => afterGameEnd(reason), 850);
  } else {
    setTimeout(() => afterGameEnd(reason), 150);
  }
}

function afterGameEnd(reason) {
  board.classList.remove("blur-out");
  if (qualifiesForRanking(score)) {
    showNameInputScreen(reason);
  } else {
    displayGameOverScreen(reason);
  }
}

function showNameInputScreen(reason) {
  pendingEndReason = reason;
  const rankings = getRankings();
  const idx = rankings.findIndex((r) => score > r.score);
  const displayRank = idx === -1 ? rankings.length + 1 : idx + 1;
  rankEntryTitleEl.textContent = displayRank === 1 ? "NEW BEST!" : `TOP ${displayRank}!`;
  rankNoticeEl.textContent = `${displayRank}위 진입!`;
  nameInputEl.value = "";
  nameInputScreenEl.classList.remove("hidden");
  setTimeout(() => nameInputEl.focus(), 80);
}

function confirmName() {
  let name = nameInputEl.value.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  if (!name) name = "User1";
  saveRanking(name, score, stage);
  nameInputScreenEl.classList.add("hidden");
  displayGameOverScreen(pendingEndReason);
}

function displayGameOverScreen(reason) {
  const rankings = getRankings();
  const best = rankings.length > 0 ? rankings[0].score : 0;
  const isNewBest = score > 0 && rankings[0]?.score === score;

  gameOverReasonEl.textContent = reason;
  finalStageEl.textContent = stage;
  bestScoreEl.textContent = best.toLocaleString("ko-KR");
  newRecordEl.classList.toggle("hidden", !isNewBest);

  renderRankings(gameOverRankingEl, score);
  renderRankings(rankingListEl);

  restartButton.classList.remove("btn-visible");
  gameOverScreen.classList.remove("hidden");

  animateCount(finalScoreEl, score);
  setTimeout(() => restartButton.classList.add("btn-visible"), 1000);
}

function triggerFireExplosion(index) {
  cells[index].className = "cell explode";

  fireFlashEl.classList.remove("hidden");
  setTimeout(() => fireFlashEl.classList.add("hidden"), 420);

  board.classList.remove("shake-hard");
  void board.offsetWidth;
  board.classList.add("shake-hard");

  setTimeout(() => board.classList.add("blur-out"), 320);
}

function showGameOverScreen(reason, best, isNewRecord) {
  board.classList.remove("blur-out");

  gameOverReasonEl.textContent = reason;
  finalStageEl.textContent = stage;
  bestScoreEl.textContent = best.toLocaleString("ko-KR");
  newRecordEl.classList.toggle("hidden", !isNewRecord);

  restartButton.classList.remove("btn-visible");
  gameOverScreen.classList.remove("hidden");

  animateCount(finalScoreEl, score);
  setTimeout(() => restartButton.classList.add("btn-visible"), 1000);
}

function animateCount(el, target) {
  if (target === 0) { el.textContent = "0"; return; }
  const duration = 900;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.floor(eased * target).toLocaleString("ko-KR");
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString("ko-KR");
  }
  requestAnimationFrame(step);
}

// 한글 등 비허용 문자 실시간 차단
nameInputEl.addEventListener("input", () => {
  const cleaned = nameInputEl.value.replace(/[^a-zA-Z0-9 ]/g, "");
  if (cleaned !== nameInputEl.value) nameInputEl.value = cleaned;
});
nameInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmName();
});
nameConfirmButtonEl.addEventListener("click", confirmName);

startButton.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  startButton.classList.add("flash");
  startButton.addEventListener("animationend", () => startButton.classList.remove("flash"), { once: true });
  startGame();
});

howtoButton.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  howtoButton.classList.add("flash");
  howtoButton.addEventListener("animationend", () => howtoButton.classList.remove("flash"), { once: true });
  titlePanelEl.classList.add("hidden");
  howtoPanelEl.classList.remove("hidden");
});

howtoPanelEl.addEventListener("pointerdown", () => {
  howtoPanelEl.classList.add("hidden");
  titlePanelEl.classList.remove("hidden");
});

restartButton.addEventListener("click", startGame);
resetButton.addEventListener("click", startGame);

createBoard();
updateHud();
