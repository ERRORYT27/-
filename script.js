let gameTimer = null;
let isAnimating = false;
let currentN = 0;
let currentK = 0;
let currentResult = null;
let circleDrawn = false;
let challengeAutoFireInterval = null;

const PERSON_RADIUS = 15; //小人的判定半径
const BULLET_BASE_SPEED = 8; // 基础子弹速度
const BULLET_SPEED = BULLET_BASE_SPEED * 2; // 所有子弹统一为一般速度的 2 倍
const circleElement = document.getElementById("circle");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupImg = document.getElementById("popupImg");
const nInput = document.getElementById("n");
const kInput = document.getElementById("k");
const speedInput = document.getElementById("speed");
const guessInput = document.getElementById("guess");

const deathAudio = new Audio("sounds/gunshot.mp3");
deathAudio.preload = "auto";
const bgMusic = new Audio("sounds/M.Graveyard - you.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;
const normalBGM = new Audio("sounds/M.Graveyard - Hope.mp3");
normalBGM.loop = true;
normalBGM.volume = 0.5;
const challengeBGM = new Audio("sounds/yym.flac");
challengeBGM.loop = true;
challengeBGM.volume = 0.5;
const normalModeBtn = document.getElementById("normalModeBtn");
const challengeModeBtn = document.getElementById("challengeModeBtn");
const gameModal = document.getElementById("gameModal");
const modalInner = document.getElementById("modalInner");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalOverlay = document.getElementById("modalOverlay");
const challengeModal = document.getElementById("challengeModal");
const challengeOverlay = document.getElementById("challengeOverlay");
const challengeCloseBtn = document.getElementById("challengeCloseBtn");
const challengeRandomBtn = document.getElementById("challengeRandomBtn");
const challengeN = document.getElementById("challengeN");
const challengeK = document.getElementById("challengeK");
const challengeGuess = document.getElementById("challengeGuess");
let normalModeWonOnce = false;
const challengeResultBtn = document.getElementById("challengeResultBtn");
const challengeStartBtn = document.getElementById("challengeStartBtn");
const challengeStopBtn = document.getElementById("challengeStopBtn");
const challengeBulletsDisplay = document.getElementById("challengeBullets");
const challengePlayArea = document.getElementById("challengePlayArea");
const gamePlaceholder = document.getElementById("gamePlaceholder");
const gameArea = document.getElementById("gameArea");

const challengeAudio = new Audio("sounds/gunshot.mp3");
const emptyAudio = new Audio("sounds/dry_fire.mp3");

challengeAudio.preload = "auto";
emptyAudio.preload = "auto";
let challengeTimer = null;
let challengePanicShootTimer = null;
let challengePanicFireInterval = null;
let challengePeople = [];
let challengeObstacles = [];
let challengeMazeLayout = null;
let challengeFinalFiveActivated = false;
let challengeBullets = 0;
let challengeActive = false;
let challengeAutoFirePointerId = null;
let challengePanicBullets = [];
let challengeExpectedOrder = [];
let challengeCurrentKillIndex = 0;
let challengePerfectSequence = false;
let challengeExpectedSurvivor = null;
let challengeGuessValue = null;
let challengeFinalFiveCount = 5;
let challengeFinalFivePhaseActive = false;
let challengeFinalFivePhaseTimer = null;
let challengeFinalFiveShootTimer = null;
let challengeFinalFivePhaseStartedAt = 0;
let challengeFinalFivePhaseDuration = 15000;

function josephus(n, k) {
    let ans = 0;
    for (let i = 2; i <= n; i++) {
        ans = (ans + k) % i;
    }
    return ans + 1;
}

function getRadius(n) {
    const width = circleElement.clientWidth || 500;
    const height = circleElement.clientHeight || 500;
    const minDimension = Math.min(width, height);
    const maxRadius = Math.floor(minDimension / 2 - 40);

    // 随人数增加适当放大：每人约 4px，受容器限制
    const proposed = 60 + Math.floor(n * 4);
    const radius = Math.max(60, Math.min(maxRadius, proposed));
    return radius;
}

function drawPeople(n) {
    circleElement.innerHTML = "";
    if (n <= 0 || n > 100) {
        circleDrawn = false;
        return;
    }

    const radius = getRadius(n);
    const centerX = circleElement.clientWidth / 2;
    const centerY = circleElement.clientHeight / 2;
    const fontSize = Math.max(12, Math.min(26, Math.floor(28 - n / 3)));

    for (let i = 0; i < n; i++) {
        const person = document.createElement("div");
        person.className = "person";
        person.id = "person" + i;
        person.innerHTML = `<span class="challenge-icon">🧍</span><span class="challenge-number">${i + 1}</span>`;
        person.style.fontSize = `${fontSize}px`;

        const angle = (2 * Math.PI * i) / n;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        person.style.left = `${centerX + x}px`;
        person.style.top = `${centerY + y}px`;
        // 以自身中心定位，方便后续 scale 变换保持位置
        person.style.transform = 'translate(-50%,-50%)';
        person.style.transition = 'transform 0.3s ease, font-size 0.3s ease';
        circleElement.appendChild(person);
    }

    circleDrawn = circleElement.children.length > 0;
    currentN = n;
}

function getKillOrder(n, k) {
    const people = [];
    for (let i = 1; i <= n; i++) {
        people.push(i);
    }

    let index = 0;
    const order = [];

    while (people.length > 1) {
        index = (index + k - 1) % people.length;
        order.push(people[index]);
        people.splice(index, 1);
    }

    return {
        order,
        survivor: people[0],
    };
}

function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}

function validateNK(n, k) {
    if (!isPositiveInteger(n) || !isPositiveInteger(k)) {
        alert("请输入正整数的总人数和步长。");
        return false;
    }
    return true;
}

function validateGuess(guess) {
    if (!isPositiveInteger(guess)) {
        alert("请输入正整数的猜测编号。");
        return false;
    }
    return true;
}

function playDeathSound() {
    const speed = Number(speedInput.value) || 1;
    deathAudio.playbackRate = speed;
    deathAudio.currentTime = 0;
    deathAudio.play().catch(() => {
        // ignore play failures when triggered repeatedly
    });
}

function stopGame() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    if(circleDrawn){
        drawPeople(currentN);
    }
    isAnimating = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function updateMusicBtnIcon() {
    const btn = document.getElementById('musicPlayBtn');
    if (btn) btn.textContent = bgMusic.paused ? '▶' : '⏸';
}

function openNormalMode() {
    if (!gameArea || !modalInner || !gameModal) return;
    bgMusic.pause();
    normalBGM.currentTime = 0;
    normalBGM.play().catch(() => {});
    updateMusicBtnIcon();
    // 移动 gameArea 到 modalInner
    modalInner.appendChild(gameArea);
    gameModal.classList.remove("hidden");
    gameModal.style.display = 'flex';
    gameModal.setAttribute('aria-hidden','false');
    // 重绘以适配新的容器尺寸
    drawPeople(Number(nInput.value) || currentN);
}

function closeNormalMode() {
    if (!gameArea || !gamePlaceholder || !gameModal) return;
    gamePlaceholder.appendChild(gameArea);
    gameModal.classList.add("hidden");
    gameModal.setAttribute('aria-hidden','true');
    // 重绘以适配返回后的尺寸
    drawPeople(Number(nInput.value) || currentN);
    normalBGM.pause();
    bgMusic.play().catch(() => {});
    updateMusicBtnIcon();
}

// 关闭弹窗时停止所有程序（动画、音频等）并恢复最简页面状态
function closeModalAndStopAll() {
    stopGame();
    normalBGM.pause();
    try {
        deathAudio.pause();
        deathAudio.currentTime = 0;
    } catch (e) {}
    closeNormalMode();
    // 强制隐藏 modal（防止被其他 CSS 规则覆盖）
    try { gameModal.classList.add('hidden'); gameModal.style.display = 'none'; } catch (e) {}
}

const CHALLENGE_AREA_W = 1000;
const CHALLENGE_AREA_H = 600;

/**
 * 根据可用空间计算缩放比例，让游戏区自适应窗口
 */
function updateChallengeAreaScale() {
    const wrapper = document.querySelector('.challenge-play-area-wrapper');
    const area = challengePlayArea;
    if (!wrapper || !area) return;
    // 获取 wrapper 可用尺寸
    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;
    if (availW <= 0 || availH <= 0) return;
    // 计算缩放：等比例缩放，铺满 wrapper
    const scaleX = availW / CHALLENGE_AREA_W;
    const scaleY = availH / CHALLENGE_AREA_H;
    const scale = Math.min(scaleX, scaleY, 1.5); // 最大放大 1.5 倍
    area.style.transform = `scale(${scale})`;
    // 因为 transform-origin 是 top-left，需要补偿偏移使之居中
    const finalW = CHALLENGE_AREA_W * scale;
    const finalH = CHALLENGE_AREA_H * scale;
    area.style.marginLeft = `${(availW - finalW) / 2}px`;
    area.style.marginTop = `${(availH - finalH) / 2}px`;
    // 保存缩放比例供点击坐标修正
    area._scale = scale;
}

function openChallengeMode() {
    if (!challengeModal) return;
    bgMusic.pause();
    challengeBGM.currentTime = 0;
    challengeBGM.play().catch(() => {});
    updateMusicBtnIcon();
    challengeModal.classList.remove('hidden');
    challengeModal.style.display = 'flex';
    challengeModal.setAttribute('aria-hidden', 'false');
    challengeN.value = '';
    challengeK.value = '';
    challengeGuess.value = '';
    // 打开后立即计算一次缩放
    requestAnimationFrame(() => updateChallengeAreaScale());
}

function closeChallengeMode() {
    if (!challengeModal) return;
    stopChallengeMovement();
    challengeModal.classList.add('hidden');
    challengeModal.style.display = 'none';
    challengeModal.setAttribute('aria-hidden', 'true');
    challengeBGM.pause();
    bgMusic.play().catch(() => {});
    updateMusicBtnIcon();
}

function updateChallengeBullets() {
    if (challengeBulletsDisplay) {
        challengeBulletsDisplay.value = challengeBullets;
    }
    if (challengePlayArea) {
        challengePlayArea.style.cursor = challengeBullets > 0 ? 'crosshair' : 'not-allowed';
    }
}

function stopChallengeMovement() {
    if (challengeTimer) {
        clearInterval(challengeTimer);
        challengeTimer = null;
    }
    if (challengePanicShootTimer) {
        clearInterval(challengePanicShootTimer);
        challengePanicShootTimer = null;
    }
    if (challengeAutoFireInterval) {
        clearInterval(challengeAutoFireInterval);
        challengeAutoFireInterval = null;
    }
    if (challengePanicFireInterval) {
        clearInterval(challengePanicFireInterval);
        challengePanicFireInterval = null;
    }
    if (challengeFinalFiveShootTimer) {
        clearInterval(challengeFinalFiveShootTimer);
        challengeFinalFiveShootTimer = null;
    }
    if (challengeFinalFivePhaseTimer) {
        clearTimeout(challengeFinalFivePhaseTimer);
        challengeFinalFivePhaseTimer = null;
    }
    challengeActive = false;
    challengeFinalFivePhaseActive = false;
    if (challengePlayArea) {
        challengePlayArea.innerHTML = '';
        challengePlayArea.style.cursor = 'default';
    }
    challengePeople.forEach((item) => {
        if (item.panicShotTimerId) {
            clearTimeout(item.panicShotTimerId);
            item.panicShotTimerId = null;
        }
    });
    cleanupChallengeObstacles();
    challengePeople = [];
    challengePanicBullets = [];
    if (challengeStopBtn) {
        challengeStopBtn.disabled = true;
    }
}

function setChallengePersonState(person, state) {
    if (!person || !person.element) return;
    const previousState = person.state;
    if (state === 'dead' && person.panicShotTimerId) {
        clearTimeout(person.panicShotTimerId);
        person.panicShotTimerId = null;
    }
    person.state = state;
    const numberText = person.element.querySelector('.challenge-number')?.textContent || '';
    person.element.classList.remove('panic', 'dead');

    if (state === 'dead') {
        person.panicShotsFired = 0;
        person.panicShotTimerId = null;
        person.element.innerHTML = `<span class="challenge-icon">💀</span><span class="challenge-number">${numberText}</span>`;
        person.element.classList.add('dead');
    } else if (state === 'panic') {
        if (previousState !== 'panic' && person.alive) {
            person.panicShotsFired = 0;
        }
        person.element.innerHTML = `<span class="challenge-icon">😱</span><span class="challenge-number">${numberText}</span>`;
        person.element.classList.add('panic');
    } else {
        person.element.innerHTML = `<span class="challenge-icon">🧍</span><span class="challenge-number">${numberText}</span>`;
    }
}

function shootPanicBullet(person) {
    if (!challengePlayArea || !person || !person.alive || person.state !== 'panic') return;
    const angle = Math.random() * Math.PI * 2;
    const speed = BULLET_SPEED;
    const offset = PERSON_RADIUS * 2;
    const startX = person.x + Math.cos(angle) * offset;
    const startY = person.y + Math.sin(angle) * offset;
    const bullet = document.createElement('div');
    bullet.className = 'challenge-bullet';
    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;
    challengePlayArea.appendChild(bullet);
    challengePanicBullets.push({
        element: bullet,
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        alive: true,
        bounceCount: 0
    });
}

function triggerPanicOnNormalPeople() {
    const totalCount = challengePeople.length;
    const deadCount = challengePeople.filter((item) => item.state === 'dead').length;
    const n = Math.max(1, totalCount - deadCount);
    const panicChance = 1 / (4 * n);

    challengePeople.forEach((item) => {
        if (!item.alive || item.state !== 'normal' || item.isGuessedSurvivor) return;
        if (Math.random() < panicChance) {
            setChallengePersonState(item, 'panic');
        }
    });
}

function cleanupChallengeObstacles() {
    challengeObstacles.forEach((obs) => {
        if (obs.element && obs.element.parentNode) {
            obs.element.remove();
        }
    });
    challengeObstacles = [];
    challengeMazeLayout = null;
    challengeFinalFiveActivated = false;
}

function clearChallengeBullets() {
    // 标记所有子弹为不可用，防止filter残留对象继续造成伤害
    challengePanicBullets.forEach((bullet) => {
        bullet.alive = false;
        if (bullet.element && bullet.element.parentNode) {
            bullet.element.remove();
        }
    });
    challengePanicBullets = [];
    // 额外清理场景中可能残留的子弹DOM元素（防止极少数漏网之鱼）
    if (challengePlayArea) {
        challengePlayArea.querySelectorAll('.challenge-bullet').forEach((el) => el.remove());
    }
}

function startFinalFiveSpecialPhase() {
    clearChallengeBullets();
    challengeFinalFivePhaseActive = true;
    challengeFinalFivePhaseStartedAt = Date.now();

    if (challengeFinalFiveShootTimer) {
        clearInterval(challengeFinalFiveShootTimer);
    }
    if (challengeFinalFivePhaseTimer) {
        clearTimeout(challengeFinalFivePhaseTimer);
    }

    // 延迟3秒后第一次射击，之后每5秒射击一次
    const npcShoot = () => {
        if (!challengeActive || !challengeFinalFivePhaseActive) return;
        const player = challengePeople.find((item) => item.alive && item.isGuessedSurvivor);
        const shooters = challengePeople.filter((item) => item.alive && !item.isGuessedSurvivor && item.isFinalFiveNpc);
        shooters.forEach((person) => {
            // 瞄准玩家方向，加一些随机散布使其更真实
            let angle;
            if (player) {
                const baseAngle = Math.atan2(player.y - person.y, player.x - person.x);
                // ±25度随机散布
                const spread = (Math.random() - 0.5) * Math.PI / 3.6;
                angle = baseAngle + spread;
            } else {
                angle = Math.random() * Math.PI * 2;
            }
            const bullet = document.createElement('div');
            bullet.className = 'challenge-bullet';
            const offset = PERSON_RADIUS * 2;
            const startX = person.x + Math.cos(angle) * offset;
            const startY = person.y + Math.sin(angle) * offset;
            bullet.style.left = `${startX}px`;
            bullet.style.top = `${startY}px`;
            challengePlayArea.appendChild(bullet);
            challengePanicBullets.push({
                element: bullet,
                x: startX,
                y: startY,
                dx: Math.cos(angle) * BULLET_SPEED,
                dy: Math.sin(angle) * BULLET_SPEED,
                alive: true,
                bounceCount: 0,
                shooterId: person === player ? 'player' : ('npc_' + (person.element.querySelector('.challenge-number')?.textContent || ''))
            });
        });
    };
    setTimeout(() => {
        npcShoot();
        challengeFinalFiveShootTimer = setInterval(npcShoot, 5000);
    }, 3000);

    // 决战模式持续进行，不超时停止
    if (challengeFinalFivePhaseTimer) {
        clearTimeout(challengeFinalFivePhaseTimer);
        challengeFinalFivePhaseTimer = null;
    }
}

// 线段与圆的碰撞检测，用于防止子弹穿透
function lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    const a = dx * dx + dy * dy;
    // a为0表示子弹原地未移动，退化为点距检测
    if (a === 0) {
        return fx * fx + fy * fy <= r * r;
    }
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = px - x1;
    const wy = py - y1;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) {
        return Math.sqrt(wx * wx + wy * wy);
    }
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) {
        const dx = px - x2;
        const dy = py - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
    const t = c1 / c2;
    const projX = x1 + vx * t;
    const projY = y1 + vy * t;
    const dx = px - projX;
    const dy = py - projY;
    return Math.sqrt(dx * dx + dy * dy);
}

function reflectVector(dx, dy, nx, ny) {
    const dot = dx * nx + dy * ny;
    return {
        dx: dx - 2 * dot * nx,
        dy: dy - 2 * dot * ny
    };
}

function createObstacle(x1, y1, x2, y2, options = {}) {
    const element = document.createElement('div');
    element.className = 'challenge-obstacle';
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    element.style.width = `${length}px`;
    element.style.left = `${midX}px`;
    element.style.top = `${midY}px`;
    element.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    challengePlayArea.appendChild(element);
    challengeObstacles.push({ element, x1, y1, x2, y2, radius: 3, isBoundary: Boolean(options.isBoundary) });
}

function positionIsClear(x1, y1, x2, y2) {
    const minDist = PERSON_RADIUS + 12;
    for (const person of challengePeople) {
        if (!person.alive) continue;
        const dist = pointToSegmentDistance(person.x, person.y, x1, y1, x2, y2);
        if (dist < minDist) {
            return false;
        }
    }
    for (const obstacle of challengeObstacles) {
        const dx = x1 - obstacle.x1;
        const dy = y1 - obstacle.y1;
        const endDist = Math.sqrt(dx * dx + dy * dy);
        if (endDist < 24) {
            return false;
        }
    }
    return true;
}

function getChallengeSpeed() {
    return Number(document.getElementById('challengeSpeed')?.value) || 1;
}

function setupFinalFiveFormation() {
    const alivePeople = challengePeople.filter((item) => item.alive);
    if (challengeFinalFiveActivated || alivePeople.length !== challengeFinalFiveCount) return;
    const w = challengePlayArea.clientWidth;
    const h = challengePlayArea.clientHeight;

    clearChallengeBullets();

    // 把存活者重置为 normal
    alivePeople.forEach((person) => {
        setChallengePersonState(person, 'normal');
        person.panicShotsFired = 0;
    });

    createMazeObstacles(w, h);

    const layout = challengeMazeLayout;
    const total = challengeFinalFiveCount;
    const positions = [];

    if (layout) {
        // 玩家在中央
        const centerCell = { row: Math.floor(layout.rows / 2), col: Math.floor(layout.cols / 2) };
        const centerPos = getCellCenter(centerCell.col, centerCell.row, layout);
        positions.push(centerPos);
        // NPC分散在远离中央的位置，以像素为单位分布，确保间隔足够
        const spreadDist = Math.min(w, h) * 0.35;
        for (let i = 1; i < total; i++) {
            const angle = (2 * Math.PI * (i - 1)) / (total - 1) - Math.PI / 2;
            let nx = centerPos.x + Math.cos(angle) * spreadDist;
            let ny = centerPos.y + Math.sin(angle) * spreadDist;
            // 限制在场景范围内
            nx = Math.max(PERSON_RADIUS * 2, Math.min(w - PERSON_RADIUS * 2, nx));
            ny = Math.max(PERSON_RADIUS * 2, Math.min(h - PERSON_RADIUS * 2, ny));
            positions.push({ x: nx, y: ny });
        }
    } else {
        const centerX = w / 2;
        const centerY = h / 2;
        positions.push({ x: centerX, y: centerY });
        const spreadRadius = Math.min(w, h) * 0.38;
        for (let i = 1; i < total; i++) {
            const angle = (2 * Math.PI * (i - 1)) / (total - 1) - Math.PI / 2;
            positions.push({
                x: centerX + Math.cos(angle) * spreadRadius,
                y: centerY + Math.sin(angle) * spreadRadius
            });
        }
    }

    const guessedIndex = alivePeople.findIndex((item) => {
        const num = Number(item.element.querySelector('.challenge-number')?.textContent || '');
        return challengeGuessValue !== null && num === challengeGuessValue;
    });
    const orderedPeople = alivePeople.slice();
    if (guessedIndex !== -1) {
        const guessedPerson = orderedPeople.splice(guessedIndex, 1)[0];
        orderedPeople.unshift(guessedPerson);
    }

    orderedPeople.forEach((person, idx) => {
        const pos = positions[idx];
        person.x = pos.x;
        person.y = pos.y;
        person.isFinalFiveNpc = !person.isGuessedSurvivor;
        if (person.isGuessedSurvivor) {
            person.dx = 0;
            person.dy = 0;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 * getChallengeSpeed();
            person.aiState = 'seek_cover'; 
            person.targetX = person.x; // 先设为自己当前位置
            person.targetY = person.y;
            person.dx = Math.cos(angle) * speed;
            person.dy = Math.sin(angle) * speed;
            person.aiState = 'wander'; 
            person.lastDodgeTime = 0; 
        }
        person.element.style.left = `${person.x - PERSON_RADIUS}px`;
        person.element.style.top = `${person.y - PERSON_RADIUS}px`;
    });
    challengeFinalFiveActivated = true;
    startFinalFiveSpecialPhase();
}

function getCellCenter(col, row, layout) {
    return {
        x: layout.originX + col * layout.cellSize + layout.cellSize / 2,
        y: layout.originY + row * layout.cellSize + layout.cellSize / 2
    };
}

function createMazeObstacles(w, h) {
    const padding = 60;
    const minCell = 100;
    const cols = Math.max(3, Math.floor((w - padding * 2) / minCell));
    const rows = Math.max(3, Math.floor((h - padding * 2) / minCell));
    const cellSize = Math.min((w - padding * 2) / cols, (h - padding * 2) / rows);
    const originX = (w - cols * cellSize) / 2;
    const originY = (h - rows * cellSize) / 2;
    challengeMazeLayout = { originX, originY, cols, rows, cellSize, width: w, height: h };

    createObstacle(0, 0, w, 0, { isBoundary: true });
    createObstacle(0, h, w, h, { isBoundary: true });
    createObstacle(0, 0, 0, h, { isBoundary: true });
    createObstacle(w, 0, w, h, { isBoundary: true });

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const verticalWalls = Array.from({ length: rows }, () => Array(cols + 1).fill(true));
    const horizontalWalls = Array.from({ length: rows + 1 }, () => Array(cols).fill(true));

    function removeWall(r1, c1, r2, c2) {
        if (r1 === r2) {
            const col = Math.min(c1, c2) + 1;
            verticalWalls[r1][col] = false;
        } else {
            const row = Math.min(r1, r2) + 1;
            horizontalWalls[row][c1] = false;
        }
    }

    function carve(r, c) {
        visited[r][c] = true;
        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        for (const dir of dirs) {
            const nr = r + dir.dr;
            const nc = c + dir.dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
                removeWall(r, c, nr, nc);
                carve(nr, nc);
            }
        }
    }

    carve(Math.floor(rows / 2), Math.floor(cols / 2));

    const wallThickness = 4;
    for (let r = 0; r < rows; r++) {
        for (let c = 1; c < cols; c++) {
            if (!verticalWalls[r][c]) continue;
            const x = originX + c * cellSize;
            const y1 = originY + r * cellSize;
            const y2 = originY + (r + 1) * cellSize;
            createObstacle(x, y1, x, y2);
        }
    }
    for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!horizontalWalls[r][c]) continue;
            const y = originY + r * cellSize;
            const x1 = originX + c * cellSize;
            const x2 = originX + (c + 1) * cellSize;
            createObstacle(x1, y, x2, y);
        }
    }
}

function bounceOffObstacles(person) {
    const w = challengePlayArea ? challengePlayArea.clientWidth : 0;
    const h = challengePlayArea ? challengePlayArea.clientHeight : 0;
    if (person.x < PERSON_RADIUS) {
        person.x = PERSON_RADIUS;
        person.dx = Math.abs(person.dx) * 0.8;
    } else if (person.x > w - PERSON_RADIUS) {
        person.x = w - PERSON_RADIUS;
        person.dx = -Math.abs(person.dx) * 0.8;
    }
    if (person.y < PERSON_RADIUS) {
        person.y = PERSON_RADIUS;
        person.dy = Math.abs(person.dy) * 0.8;
    } else if (person.y > h - PERSON_RADIUS) {
        person.y = h - PERSON_RADIUS;
        person.dy = -Math.abs(person.dy) * 0.8;
    }
    person.element.style.left = `${person.x - PERSON_RADIUS}px`;
    person.element.style.top = `${person.y - PERSON_RADIUS}px`;

    // 检查所有障碍物碰撞，最多迭代 5 次防止死循环
    let iterations = 0;
    const maxIter = 5;
    while (iterations < maxIter) {
        let collided = false;
        for (const obstacle of challengeObstacles) {
            if (obstacle.isBoundary) continue;
            const dist = pointToSegmentDistance(person.x, person.y, obstacle.x1, obstacle.y1, obstacle.x2, obstacle.y2);
            const minDist = PERSON_RADIUS + 12;
            if (dist > 0 && dist < minDist) {
                const segdx = obstacle.x2 - obstacle.x1;
                const segdy = obstacle.y2 - obstacle.y1;
                const segLen = Math.sqrt(segdx * segdx + segdy * segdy) || 1;
                // 墙壁法向量（指向远离墙壁的方向）
                let nx = -segdy / segLen;
                let ny = segdx / segLen;
                // 确保法向量指向人远离墙壁的方向
                const toPersonX = person.x - (obstacle.x1 + obstacle.x2) / 2;
                const toPersonY = person.y - (obstacle.y1 + obstacle.y2) / 2;
                const dotPerson = toPersonX * nx + toPersonY * ny;
                if (dotPerson < 0) {
                    nx = -nx;
                    ny = -ny;
                }
                // 推开避免卡墙
                const overlap = minDist - dist + 2;
                person.x += nx * overlap;
                person.y += ny * overlap;
                
                // 保留沿墙壁方向的速度（滑行），去掉垂直方向的速度
                const tangentDx = segdx / segLen;
                const tangentDy = segdy / segLen;
                const speedAlongWall = person.dx * tangentDx + person.dy * tangentDy;
                person.dx = tangentDx * speedAlongWall * 0.8;
                person.dy = tangentDy * speedAlongWall * 0.8;
                
                person.element.style.left = `${person.x - PERSON_RADIUS}px`;
                person.element.style.top = `${person.y - PERSON_RADIUS}px`;
                collided = true;
                break; // 每次只处理一个碰撞，然后重新检查所有墙壁
            }
        }
        if (!collided) break;
        iterations++;
    }
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const orientation = (ax, ay, bx, by, cx, cy) => {
        const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
        return value > 0 ? 1 : value < 0 ? 2 : 0;
    };
    const onSegment = (ax, ay, bx, by, cx, cy) => {
        return Math.min(ax, bx) <= cx && cx <= Math.max(ax, bx) && Math.min(ay, by) <= cy && cy <= Math.max(ay, by);
    };
    const o1 = orientation(x1, y1, x2, y2, x3, y3);
    const o2 = orientation(x1, y1, x2, y2, x4, y4);
    const o3 = orientation(x3, y3, x4, y4, x1, y1);
    const o4 = orientation(x3, y3, x4, y4, x2, y2);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
    if (o2 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;
    if (o3 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
    if (o4 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
    return false;
}

function segmentToSegmentDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
    if (segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
        return 0;
    }
    return Math.min(
        pointToSegmentDistance(x1, y1, x3, y3, x4, y4),
        pointToSegmentDistance(x2, y2, x3, y3, x4, y4),
        pointToSegmentDistance(x3, y3, x1, y1, x2, y2),
        pointToSegmentDistance(x4, y4, x1, y1, x2, y2)
    );
}

function handleChallengePersonKill(targetPerson, allowNonNormal = true) {
    if (!targetPerson || !targetPerson.alive) return false;
    if (!allowNonNormal && targetPerson.state !== 'normal') return false;

    targetPerson.alive = false;
    targetPerson.dx = 0;
    targetPerson.dy = 0;
    const numberText = targetPerson.element.querySelector('.challenge-number')?.textContent || '';
    const killedNum = Number(numberText);
    const isOrderedKill = challengePerfectSequence && challengeCurrentKillIndex < challengeExpectedOrder.length && killedNum === challengeExpectedOrder[challengeCurrentKillIndex];
    if (isOrderedKill) {
        challengeCurrentKillIndex += 1;
    } else {
        challengePerfectSequence = false;
        // 决战模式下不会引发恐慌
        if (!challengeFinalFiveActivated) {
            triggerPanicOnNormalPeople();
        }
    }
    setChallengePersonState(targetPerson, 'dead');

    if (challengeGuessValue !== null && killedNum === challengeGuessValue) {
        showChallengeBadGuess();
    }

    const aliveCount = challengePeople.filter(item => item.alive).length;
    const lastAlive = challengePeople.find(item => item.alive);
    if (aliveCount === challengeFinalFiveCount && !challengePerfectSequence) {
        setupFinalFiveFormation();
    }
    if (aliveCount === 1 && lastAlive) {
        const lastNum = Number(lastAlive.element.querySelector('.challenge-number')?.textContent || '');
        const isCorrectSurvivor = challengeGuessValue !== null && lastNum === challengeGuessValue && lastNum === challengeExpectedSurvivor;
        const isPerfect = challengePerfectSequence && challengeCurrentKillIndex === challengeExpectedOrder.length && lastNum === challengeGuessValue;
        // 猜的编号不是约瑟夫解，但最终活了下来
        const isWrongGuessButSurvived = challengeGuessValue !== null && lastNum === challengeGuessValue && lastNum !== challengeExpectedSurvivor;
        if (isPerfect) {
            showChallengePerfect();
        } else if (isCorrectSurvivor) {
            showChallengeCunning();
        } else if (isWrongGuessButSurvived) {
            showChallengeDevil();
        }
    }

    setTimeout(() => {
        if (targetPerson.element.parentNode) {
            targetPerson.element.remove();
        }
        const idx = challengePeople.indexOf(targetPerson);
        if (idx !== -1) {
            challengePeople.splice(idx, 1);
        }
    }, 800);

    return true;
}

function generateChallengePreset() {
    const minN = Number(document.getElementById('challengeMinN').value);
    const maxN = Number(document.getElementById('challengeMaxN').value);
    if (minN >= maxN) {
        alert('最小值必须小于最大值');
        return;
    }
    const n = Math.floor(Math.random() * (maxN - minN + 1)) + minN;
    const k = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    challengeN.value = n;
    challengeK.value = k;
    challengeFinalFiveCount = Number(document.getElementById('challengeFinalCount').value);
}

function validateChallengeInputs() {
    const n = Number(challengeN.value);
    const k = Number(challengeK.value);
    const guess = Number(challengeGuess.value);
    if (!isPositiveInteger(n) || !isPositiveInteger(k)) {
        alert('请先点击随机生成按钮获取总人数和步长。');
        return null;
    }
    if (!isPositiveInteger(guess)) {
        alert('请输入正确的猜测编号，然后才能开始游戏。');
        return null;
    }
    return { n, k, guess };
}

function challengeShowAnswer() {
    const n = Number(challengeN.value);
    const k = Number(challengeK.value);
    if (!isPositiveInteger(n) || !isPositiveInteger(k)) {
        alert('请先点击随机生成按钮获取总人数和步长。');
        return;
    }
    const answer = getKillOrder(n, k).survivor;
    challengeGuess.value = answer;
}

function challengeStartGame() {
    const validated = validateChallengeInputs();
    if (!validated) return;
    if (validated.n > 100) {
        alert('游戏模式预设人数最多 100。');
        return;
    }
    if (!challengePlayArea) return;
    stopChallengeMovement();
    challengeBullets = validated.n + 5;
    updateChallengeBullets();
    challengeActive = true;
    const josephusInfo = getKillOrder(validated.n, validated.k);
    challengeExpectedOrder = josephusInfo.order;
    challengeExpectedSurvivor = josephusInfo.survivor;
    challengeGuessValue = Number.isInteger(validated.guess) ? validated.guess : null;
    challengeCurrentKillIndex = 0;
    challengePerfectSequence = challengeGuessValue === challengeExpectedSurvivor && challengeGuessValue !== null;
    challengeFinalFiveCount = Number(document.getElementById('challengeFinalCount').value);
    if (challengeStopBtn) {
        challengeStopBtn.disabled = false;
    }

    let width = challengePlayArea.clientWidth;
    let height = challengePlayArea.clientHeight;
    if (width === 0) {
        width = 900;
    }
    if (height === 0) {
        height = 320;
    }
    challengePeople = [];
    challengePanicBullets = [];
    const speedFactor = getChallengeSpeed();
    for (let i = 0; i < validated.n; i++) {
        const person = document.createElement('div');
        person.className = 'challenge-person';
        person.id = 'challengePerson' + i;
        person.innerHTML = `<span class="challenge-icon">🧍</span><span class="challenge-number">${i + 1}</span>`;
        const x = Math.random() * (width - 2 * PERSON_RADIUS) + PERSON_RADIUS;
        const y = Math.random() * (height - 2 * PERSON_RADIUS) + PERSON_RADIUS;
        person.style.left = `${x - PERSON_RADIUS}px`;
        person.style.top = `${y - PERSON_RADIUS}px`;
        challengePlayArea.appendChild(person);
        const isGuessedSurvivor = challengeGuessValue !== null && challengeGuessValue === i + 1;
        const personData = { 
            element: person, 
            x, 
            y, 
            dx: isGuessedSurvivor ? 0 : (Math.random() * 4 - 2) * 0.8 * speedFactor,
            dy: isGuessedSurvivor ? 0 : (Math.random() * 4 - 2) * 0.8 * speedFactor,
            alive: true, 
            state: 'normal', 
            panicShotsFired: 0, 
            panicShotTimerId: null, 
            isGuessedSurvivor,
            isFinalFiveNpc: false,
            
            aiState: 'wander', // 状态机：'wander'(游荡), 'seek_cover'(找掩体), 'dodge'(躲避)
            targetX: x,        // 寻路目标点
            targetY: y,
            lastSeenThreat: 0,  // 上次受到威胁的时间，用于恢复游荡
            dodgeDir: 1         // 躲避方向（左/右），进入躲避时确定，不再每帧随机
        };

        if (isGuessedSurvivor) {
            person.classList.add('guessed-survivor');
        }
        challengePeople.push(personData);
    }
    if (challengePeople.length === challengeFinalFiveCount) {
        setupFinalFiveFormation();
    }
    challengeTimer = setInterval(function () {
    const w = challengePlayArea.clientWidth;
    const h = challengePlayArea.clientHeight;
    const radius = PERSON_RADIUS;

    challengePeople.forEach((item) => {
        if (item.isFinalFiveNpc && item.alive && item.state === 'normal') {
            // --- 1. 检测威胁 (躲避子弹) ---
            let closestBullet = null;
            let closestBulletDist = Infinity;
            for (const bullet of challengePanicBullets) {
                if (!bullet.alive) continue;
                const toBulletX = bullet.x - item.x;
                const toBulletY = bullet.y - item.y;
                const bulletDist = Math.sqrt(toBulletX * toBulletX + toBulletY * toBulletY);
                if (bulletDist < 200 && bulletDist < closestBulletDist) {
                    closestBullet = bullet;
                    closestBulletDist = bulletDist;
                }
            }

            if (closestBullet) {
                // 计算子弹朝向我的方向（子弹速度方向的反方向指向我）
                const toBulletX = closestBullet.x - item.x;
                const toBulletY = closestBullet.y - item.y;
                // 子弹飞行方向
                const bulletMoveAngle = Math.atan2(closestBullet.dy, closestBullet.dx);
                // 从我到子弹的方向
                const toBulletAngle = Math.atan2(toBulletY, toBulletX);
                // 角度差：子弹是否正在朝我飞来
                let angleDiff = bulletMoveAngle - toBulletAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // 如果子弹朝我飞来（角度差接近π）且距离足够近
                if (Math.abs(Math.abs(angleDiff) - Math.PI) < Math.PI / 3 && closestBulletDist < 180) {
                    item.aiState = 'dodge';
                    item.lastSeenThreat = Date.now();
                    // 确定躲避方向：垂直于子弹飞行方向，朝远离子弹的一侧躲避
                    // 计算从子弹指向我的方向
                    const threatAngle = Math.atan2(-toBulletY, -toBulletX);
                    // 固定选择顺时针90度作为躲避方向，如果撞墙会自然反弹
                    item.dodgeDir = 1;
                }
            }

            // --- 2. 状态机逻辑 ---
            const speed = 3 * getChallengeSpeed();
            
            // A. 躲避状态 (Dodge)
            if (item.aiState === 'dodge') {
                // 找到最近的朝我飞来的子弹，计算垂直方向移动
                let dodgeBullet = null;
                let dodgeBulletDist = Infinity;
                for (const bullet of challengePanicBullets) {
                    if (!bullet.alive) continue;
                    const toBulletX = bullet.x - item.x;
                    const toBulletY = bullet.y - item.y;
                    const bulletDist = Math.sqrt(toBulletX * toBulletX + toBulletY * toBulletY);
                    if (bulletDist < dodgeBulletDist) {
                        dodgeBullet = bullet;
                        dodgeBulletDist = bulletDist;
                    }
                }
                
                if (dodgeBullet) {
                    // 计算垂直于子弹速度方向的方向
                    const bulletAngle = Math.atan2(dodgeBullet.dy, dodgeBullet.dx);
                    // 顺时针旋转90度为躲避方向，用存储的dodgeDir保持方向一致
                    const dodgeAngle = bulletAngle + Math.PI / 2 * item.dodgeDir;
                    item.dx = Math.cos(dodgeAngle) * speed;
                    item.dy = Math.sin(dodgeAngle) * speed;
                } else {
                    // 没有子弹了，保持当前方向继续移动
                }
                
                // 如果过了0.8秒没被威胁，恢复游荡
                if (Date.now() - item.lastSeenThreat > 800) {
                    item.aiState = 'seek_cover';
                    item.targetX = item.x;
                    item.targetY = item.y;
                }
            } 
            // B. 游荡状态 (Wander)
            else {
                // 到达目标附近后选一个新目标
                const toTargetX = item.targetX - item.x;
                const toTargetY = item.targetY - item.y;
                const distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);
                
                if (distToTarget < 30 || Math.random() < 0.005) {
                    item.targetX = Math.random() * (w - 2 * PERSON_RADIUS) + PERSON_RADIUS;
                    item.targetY = Math.random() * (h - 2 * PERSON_RADIUS) + PERSON_RADIUS;
                }

                // 向目标点移动，速度恒定
                const tx = item.targetX - item.x;
                const ty = item.targetY - item.y;
                const tDist = Math.sqrt(tx * tx + ty * ty) || 1;
                item.dx = (tx / tDist) * speed;
                item.dy = (ty / tDist) * speed;
            }
        }

        if (!item.alive) return;
        const speedMultiplier = item.state === 'panic' || item.isFinalFiveNpc ? 2 : 1;
        item.x += item.dx * speedMultiplier;
        item.y += item.dy * speedMultiplier;

        // 边界碰撞：反弹而非骤停，保持速度大小不变
        if (item.x < radius) { item.x = radius; item.dx = Math.abs(item.dx); }
        else if (item.x > w - radius) { item.x = w - radius; item.dx = -Math.abs(item.dx); }
        if (item.y < radius) { item.y = radius; item.dy = Math.abs(item.dy); }
        else if (item.y > h - radius) { item.y = h - radius; item.dy = -Math.abs(item.dy); }

        bounceOffObstacles(item);
        item.element.style.left = `${item.x - PERSON_RADIUS}px`;
        item.element.style.top = `${item.y - PERSON_RADIUS}px`;
    });

    const n = challengePeople.length;
    for (let i = 0; i < n; i++) {
        const a = challengePeople[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < n; j++) {
            const b = challengePeople[j];
            if (!b.alive) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = 2 * radius;

            if (dist < minDist && dist > 0.0001) {
                const nx = dx / dist;
                const ny = dy / dist;
                const gap = 1.0;
                const overlap = (minDist - dist + gap) / 2;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
                a.element.style.left = `${a.x - PERSON_RADIUS}px`;
                a.element.style.top = `${a.y - PERSON_RADIUS}px`;
                b.element.style.left = `${b.x - PERSON_RADIUS}px`;
                b.element.style.top = `${b.y - PERSON_RADIUS}px`;
            }
        }
    }

    // ... 在 challengePanicFireInterval 的 setInterval 内部 ...

// 子弹移动与碰撞处理
    challengePanicBullets = challengePanicBullets.filter((bullet) => {
        if (!bullet.alive) return false;

        // 1. 计算新位置
        const prevX = bullet.x;
        const prevY = bullet.y;
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        let reflected = false;
        let boundaryReflected = false;

        // 2. 边界碰撞 (保持原样)
        if (bullet.x <= 0 || bullet.x >= w) {
            bullet.dx = -bullet.dx;
            bullet.x = Math.min(Math.max(bullet.x, 0), w);
            boundaryReflected = true;
        }
        if (bullet.y <= 0 || bullet.y >= h) {
            bullet.dy = -bullet.dy;
            bullet.y = Math.min(Math.max(bullet.y, 0), h);
            boundaryReflected = true;
        }

        if (boundaryReflected) {
            bullet.bounceCount = (bullet.bounceCount || 0) + 1;
            reflected = true;
        } 
        // 3. 障碍物碰撞 (核心修改区域)
        else {
            for (const obstacle of challengeObstacles) {
                if (obstacle.isBoundary) continue;
                
                // 计算线段到线段的距离 (上一帧位置 -> 当前位置 与 墙壁线段)
                const dist = segmentToSegmentDistance(prevX, prevY, bullet.x, bullet.y, obstacle.x1, obstacle.y1, obstacle.x2, obstacle.y2);
                
                // 如果距离小于子弹半径 (8)，说明发生碰撞
                if (dist <= 8) {
                    // --- 物理反弹计算 ---
                    const segdx = obstacle.x2 - obstacle.x1;
                    const segdy = obstacle.y2 - obstacle.y1;
                    const segLen = Math.sqrt(segdx * segdx + segdy * segdy) || 1;
                    
                    // 计算墙壁的法向量 (垂直于墙壁的方向)
                    // 注意：这里可能需要根据你的墙壁绘制逻辑调整 nx/ny 的正负号
                    let nx = -segdy / segLen; 
                    let ny = segdx / segLen;
                    
                    // 确保法向量指向子弹 (点积为正说明方向一致，需要反转)
                    const dot = bullet.dx * nx + bullet.dy * ny;
                    if (dot > 0) {
                        nx = -nx;
                        ny = -ny;
                    }

                    // 执行反弹公式
                    const reflectedVelocity = reflectVector(bullet.dx, bullet.dy, nx, ny);
                    bullet.dx = reflectedVelocity.dx;
                    bullet.dy = reflectedVelocity.dy;
                    
                    // --- 关键修复：防止卡墙 ---
                    // 计算子弹需要“推开”的距离
                    // overlap 是子弹中心距离墙壁的差距 (正值表示穿入了墙壁)
                    const overlap = 8 - dist + 1; // +1 是额外的安全距离
                    
                    // 强制将子弹中心沿法线方向推开
                    bullet.x += nx * overlap;
                    bullet.y += ny * overlap;

                    // 增加反弹计数
                    bullet.bounceCount = (bullet.bounceCount || 0) + 1;
                    reflected = true;
                    
                    // 一旦发生碰撞，跳出循环 (一颗子弹只处理一次碰撞)
                    break;
                }
            }
        }

        // 4. 更新 DOM 位置
        bullet.element.style.left = `${bullet.x}px`;
        bullet.element.style.top = `${bullet.y}px`;

        // 5. 处理多次反弹 —— 只销毁，不再跳过人员碰撞检测
        if (reflected && bullet.bounceCount >= 10) {
            bullet.element.remove();
            return false;
        }

        // 6. 人员碰撞检测（使用线段-圆检测，防止高速度下子弹穿透人物）
        for (const item of challengePeople) {
            if (!item.alive) continue;
            // NPC子弹不伤害其他NPC（只打玩家）
            if (bullet.shooterId && bullet.shooterId !== 'player' && !item.isGuessedSurvivor) continue;
            // 用子弹上一帧位置→当前位置的线段检测是否穿过人物圆圈
            const hit = lineIntersectsCircle(prevX, prevY, bullet.x, bullet.y, item.x, item.y, PERSON_RADIUS);
            if (hit) {
                bullet.alive = false;
                if (bullet.element.parentNode) {
                    bullet.element.remove();
                }
                handleChallengePersonKill(item, true);
                return false;
            }
        }

        // 7. 屏幕外销毁
        if (bullet.x < -50 || bullet.x > w + 50 || bullet.y < -50 || bullet.y > h + 50) {
            bullet.element.remove();
            return false;
        }

        return true;
    });

}, 50);

    challengePanicFireInterval = setInterval(function () {
        if (!challengeActive) return;
        challengePeople.forEach((item) => {
            if (!item.alive || item.state !== 'panic') return;
            shootPanicBullet(item);
            item.panicShotsFired += 1;
        });
    }, 1000);
}

function animateJosephus(n, k) {
    if (isAnimating) {
        return;
    }
    if (!Number.isInteger(n) || n <= 0 || !Number.isInteger(k) || k <= 0) {
        alert("请输入正整数的总人数和步长。");
        return;
    }
    const guess = Number(guessInput.value);
    if (!Number.isInteger(guess) || guess <= 0) {
        alert("请输入正整数的猜测编号。");
        return;
    }
    if (n > 100) {
        // 超出上限时直接判断，不画圆
        const answer = getKillOrder(n, k).survivor;
        if (answer === guess) {
            showWin();
        } else {
            showLose(answer);
        }
        return;
    }
    if (!circleDrawn) {
        alert("请先生成人员圆圈");
        return;
    }

    const result = getKillOrder(n, k);
    currentResult = result;
    currentK = k;

    const order = result.order;
    let step = 0;
    const speed = Number(speedInput.value) || 1;

    isAnimating = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    gameTimer = setInterval(function () {
        if (step >= order.length) {
            // 停止计时器但不重绘圆圈，保留骷髅头和皇冠
            if (gameTimer) {
                clearInterval(gameTimer);
                gameTimer = null;
            }
            isAnimating = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;

            const survivorIndex = result.survivor - 1;
            const survivorPerson = document.getElementById("person" + survivorIndex);
            if (survivorPerson) {
                // 先设置为皇冠，然后逐渐放大
                survivorPerson.innerHTML = `👑${result.survivor}`;
                survivorPerson.style.fontSize = "20px";
                survivorPerson.style.transition = "transform 1.2s ease, font-size 1.2s ease";
                // 用 requestAnimationFrame 确保 transition 生效
                requestAnimationFrame(() => {
                    survivorPerson.style.fontSize = "36px";
                    survivorPerson.style.transform = "translate(-50%,-50%) scale(1.6)";
                });
            }

            setTimeout(onfinish, 1300);
            return;
        }

        const personNum = order[step];
        const person = document.getElementById("person" + (personNum - 1));
        if (person) {
            person.innerHTML = "💀";
            playDeathSound();
        }
        step++;
    }, 1000 / speed);
}

function onfinish() {
    const guess = Number(guessInput.value);
    if (!currentResult) {
        return;
    }

    const answer = currentResult.survivor;
    const killOrder = currentResult.order;
    setTimeout(function(){
        if (answer === guess) {
            showWin(killOrder);
        } else {
            showLose(answer);
        }
    }, 1000);
}

function hidePopupMedia() {
    const img = document.getElementById('popupImg');
    const video = document.getElementById('popupVideo');
    if (img) img.style.display = 'none';
    if (video) { video.style.display = 'none'; video.pause(); }
}

function showWin(killOrder) {
    hidePopupMedia();
    popup.classList.remove("hidden");
    document.getElementById('popupImg').style.display = 'block';
    const orderStr = killOrder ? killOrder.join(' → ') : '';
    popupText.innerHTML = `美好的夏天，作为奖励，这里的BGM名为hope<br><small style="font-size:14px;color:#666;">击杀顺序：${orderStr}</small>`;
    popupImg.src = "pictures/美好的夏天.png";
    if (!normalModeWonOnce) {
        normalModeWonOnce = true;
        document.getElementById('resultBtn').style.display = '';
    }
}

function showLose(ans) {
    hidePopupMedia();
    popup.classList.remove("hidden");
    document.getElementById('popupImg').style.display = 'block';
    popupText.innerHTML = `再一次，by the way，主界面的歌曲名是一个英文单词`;
    popupImg.src = "pictures/再一次.png";
}

function showChallengePerfect() {
    setTimeout(() => {
        hidePopupMedia();
        popup.classList.remove("hidden");
        document.getElementById('popupImg').style.display = 'block';
        popupText.innerHTML = "天空的尽头是什么呢？作为你完全按照规矩办事的奖励，这里的BGM名为妖妖梦";
        popupImg.src = "pictures/天空.png";
    }, 1500);
}

function showChallengeCunning() {
    setTimeout(() => {
        hidePopupMedia();
        popup.classList.remove("hidden");
        document.getElementById('popupImg').style.display = 'block';
        popupText.innerHTML = "血雾弥漫，尸横遍野";
        popupImg.src = "pictures/残酷.png";
    }, 1500);
}

function showChallengeBadGuess() {
    setTimeout(() => {
        hidePopupMedia();
        popup.classList.remove("hidden");
        document.getElementById('popupImg').style.display = 'block';
        popupText.innerHTML = "真的是太逊了";
        popupImg.src = "pictures/逊.jpg";
    }, 1500);
}

function showChallengeRegret() {
    stopChallengeMovement();
    setTimeout(() => {
        hidePopupMedia();
        popup.classList.remove("hidden");
        document.getElementById('popupImg').style.display = 'block';
        popupImg.src = "pictures/命运.png";
        popupText.innerHTML = "就算是死，也绝不屈服于命运";
    }, 1500);
}

function showChallengeDevil() {
    stopChallengeMovement();
    setTimeout(() => {
        hidePopupMedia();
        popup.classList.remove("hidden");
        // 尝试播放视频，如果不存在则降级为图片
        const video = document.getElementById('popupVideo');
        video.style.display = 'block';
        video.src = "videos/奶龙.mp4";
        video.loop = true;
        video.play().catch(() => {
            video.style.display = 'none';
            document.getElementById('popupImg').style.display = 'block';
            popupImg.src = "pictures/彩蛋.jpg";
        });
        popupText.innerHTML = "我们之中混进来一个恶魔";
    }, 1500);
}

function endChallengeGame() {
    stopChallengeMovement();
}

function closePopup() {
    popup.classList.add("hidden");
    // 关闭弹窗时停止视频播放
    const video = document.getElementById('popupVideo');
    if (video) {
        video.pause();
        video.src = '';
        video.load();
    }
    endChallengeGame();
}

function handleInputChange() {
    const n = Number(nInput.value);
    if (circleDrawn && !isAnimating) {
        drawPeople(n);
    }
}

function handleRandomResult() {
    const minN = Number(document.getElementById("minN").value);
    const maxN = Number(document.getElementById("maxN").value);
    if (minN > maxN) {
        alert("最小人数不能大于最大人数");
        return;
    }
    const n = Math.floor(Math.random() * (maxN - minN + 1)) + minN;
    const k = Math.floor(Math.random() * 5) + 1;
    nInput.value = n;
    kInput.value = k;
    if (!isAnimating) {
        drawPeople(n);
    }
}

function showAnswer() {
    const n = Number(nInput.value);
    const k = Number(kInput.value);
    const answer = getKillOrder(n, k).survivor;
    guessInput.value = answer;
}

function init() {
    document.getElementById("randomBtn").onclick = handleRandomResult;
    document.getElementById("drawBtn").onclick = function () {
        const n = Number(nInput.value);
        const k = Number(kInput.value);
        if (!Number.isInteger(n) || n <= 0 || !Number.isInteger(k) || k <= 0) {
            alert("请输入正整数的总人数和步长。超限时不会绘制圆圈。" );
            return;
        }
        if (n > 100) {
            alert("人数超过100时不会绘制圆圈，请直接点击开始游戏查看结果。");
            return;
        }
        drawPeople(n);
    };
    startBtn.onclick = function () {
        const n = Number(nInput.value);
        const k = Number(kInput.value);
        animateJosephus(n, k);
    };
    stopBtn.onclick = stopGame;
    document.getElementById("resultBtn").onclick = showAnswer;
    nInput.addEventListener("input", handleInputChange);
    kInput.addEventListener("input", function () {
        if (!isAnimating && circleDrawn) {
            drawPeople(Number(nInput.value));
        }
    });
    if (normalModeBtn) normalModeBtn.onclick = openNormalMode;
    if (challengeModeBtn) challengeModeBtn.onclick = openChallengeMode;
    document.getElementById('hintBtn').onclick = function() {
        document.getElementById('hintModal').classList.remove('hidden');
        document.getElementById('hintModal').style.display = 'flex';
        document.getElementById('hintModal').setAttribute('aria-hidden', 'false');
    };
    document.getElementById('hintCloseBtn').onclick = function() {
        document.getElementById('hintModal').classList.add('hidden');
        document.getElementById('hintModal').style.display = 'none';
        document.getElementById('hintModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('mathBtn').onclick = function() {
        document.getElementById('mathPdfViewer').src = 'documents/约瑟夫问题.pdf';
        document.getElementById('mathModal').classList.remove('hidden');
        document.getElementById('mathModal').style.display = 'flex';
        document.getElementById('mathModal').setAttribute('aria-hidden', 'false');
    };
    document.getElementById('mathCloseBtn').onclick = function() {
        document.getElementById('mathPdfViewer').src = '';
        document.getElementById('mathModal').classList.add('hidden');
        document.getElementById('mathModal').style.display = 'none';
        document.getElementById('mathModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('thanksBtn').onclick = function() {
        document.getElementById('thanksModal').classList.remove('hidden');
        document.getElementById('thanksModal').style.display = 'flex';
        document.getElementById('thanksModal').setAttribute('aria-hidden', 'false');
    };
    document.getElementById('thanksCloseBtn').onclick = function() {
        document.getElementById('thanksModal').classList.add('hidden');
        document.getElementById('thanksModal').style.display = 'none';
        document.getElementById('thanksModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('thanksOverlay').onclick = function() {
        document.getElementById('thanksModal').classList.add('hidden');
        document.getElementById('thanksModal').style.display = 'none';
        document.getElementById('thanksModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('afterwordBtn').onclick = function() {
        var unlocked = localStorage.getItem('afterwordUnlocked') === 'true';
        if (unlocked) {
            // 已解锁，直接显示内容
            document.getElementById('afterwordQuizSection').style.display = 'none';
            document.getElementById('afterwordContentSection').style.display = 'block';
        } else {
            // 未解锁，重置问答状态
            document.getElementById('afterwordQ1').value = '';
            document.getElementById('afterwordQ2').value = '';
            document.getElementById('afterwordQ3').value = '';
            document.getElementById('afterwordError').style.display = 'none';
            document.getElementById('afterwordQuizSection').style.display = 'block';
            document.getElementById('afterwordContentSection').style.display = 'none';
        }
        document.getElementById('afterwordModal').classList.remove('hidden');
        document.getElementById('afterwordModal').style.display = 'flex';
        document.getElementById('afterwordModal').setAttribute('aria-hidden', 'false');
    };
    document.getElementById('afterwordSubmitBtn').onclick = function() {
        var q1 = document.getElementById('afterwordQ1').value.trim();
        var q2 = document.getElementById('afterwordQ2').value.trim();
        var q3 = document.getElementById('afterwordQ3').value.trim();
        if (q1 === 'you' && q2 === 'Hope' && q3 === '妖妖梦') {
            localStorage.setItem('afterwordUnlocked', 'true');
            document.getElementById('afterwordQuizSection').style.display = 'none';
            document.getElementById('afterwordContentSection').style.display = 'block';
            document.getElementById('afterwordError').style.display = 'none';
        } else {
            document.getElementById('afterwordError').textContent = '答案有误，请再想想！';
            document.getElementById('afterwordError').style.display = 'block';
        }
    };
    document.getElementById('afterwordHintBtn').onclick = function() {
        var hints = document.getElementById('afterwordHints');
        hints.style.display = hints.style.display === 'none' ? 'block' : 'none';
    };
    document.getElementById('afterwordCloseBtn').onclick = function() {
        document.getElementById('afterwordModal').classList.add('hidden');
        document.getElementById('afterwordModal').style.display = 'none';
        document.getElementById('afterwordModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('afterwordOverlay').onclick = function() {
        document.getElementById('afterwordModal').classList.add('hidden');
        document.getElementById('afterwordModal').style.display = 'none';
        document.getElementById('afterwordModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('mathOverlay').onclick = function() {
        document.getElementById('mathPdfViewer').src = '';
        document.getElementById('mathModal').classList.add('hidden');
        document.getElementById('mathModal').style.display = 'none';
        document.getElementById('mathModal').setAttribute('aria-hidden', 'true');
    };
    document.getElementById('hintOverlay').onclick = function() {
        document.getElementById('hintModal').classList.add('hidden');
        document.getElementById('hintModal').style.display = 'none';
        document.getElementById('hintModal').setAttribute('aria-hidden', 'true');
    };
    if (modalCloseBtn) modalCloseBtn.onclick = closeModalAndStopAll;
    if (challengeRandomBtn) challengeRandomBtn.onclick = generateChallengePreset;
    if (challengeResultBtn) challengeResultBtn.onclick = challengeShowAnswer;
    if (challengeStartBtn) challengeStartBtn.onclick = challengeStartGame;
    if (challengeStopBtn) challengeStopBtn.onclick = endChallengeGame;
    if (challengeCloseBtn) challengeCloseBtn.onclick = closeChallengeMode;
    if (challengePlayArea) {
        const controlState = { w: false, a: false, s: false, d: false };

        const fireBullet = function (clickX, clickY) {
            if (!challengeActive || !challengePlayArea) return;
            const shooter = challengePeople.find((item) => item.alive && item.isGuessedSurvivor);
            if (!shooter) return;
            if (challengeBullets <= 0) {
                emptyAudio.currentTime = 0;
                emptyAudio.play().catch(() => {});
                return;
            }

            challengeBullets -= 1;
            updateChallengeBullets();

            // 子弹打空后检查是否还有2人及以上存活
            if (challengeBullets === 0) {
                const aliveCount = challengePeople.filter(item => item.alive).length;
                if (aliveCount >= 2) {
                    showChallengeRegret();
                    return;
                }
            }

            const dx = clickX - shooter.x;
            const dy = clickY - shooter.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const angle = Math.atan2(dy, dx);
            // 决战环节玩家子弹速度翻倍
            const speed = challengeFinalFivePhaseActive ? BULLET_SPEED * 1.5 : BULLET_SPEED;
            const startX = shooter.x + Math.cos(angle) * (PERSON_RADIUS * 2);
            const startY = shooter.y + Math.sin(angle) * (PERSON_RADIUS * 2);

            const bullet = document.createElement('div');
            bullet.className = 'challenge-bullet';
            bullet.style.left = `${startX}px`;
            bullet.style.top = `${startY}px`;
            challengePlayArea.appendChild(bullet);
            challengePanicBullets.push({
                element: bullet,
                x: startX,
                y: startY,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                alive: true,
                bounceCount: 0,
                shooterId: 'player'
            });

            challengeAudio.currentTime = 0;
            challengeAudio.play().catch(() => {});
        };

        const updateControlledMovement = function () {
            if (!challengeActive) return;
            const shooter = challengePeople.find((item) => item.alive && item.isGuessedSurvivor);
            if (!shooter) return;
            const x = (controlState.d ? 1 : 0) - (controlState.a ? 1 : 0);
            const y = (controlState.s ? 1 : 0) - (controlState.w ? 1 : 0);
            if (x === 0 && y === 0) {
                shooter.dx = 0;
                shooter.dy = 0;
                return;
            }
            const norm = Math.sqrt(x * x + y * y) || 1;
            // 5人决战中，速度翻倍
            const finalFiveSpeed = challengeFinalFivePhaseActive ? 10 : 10.5;
            const speed = finalFiveSpeed * getChallengeSpeed();
            shooter.dx = (x / norm) * speed;
            shooter.dy = (y / norm) * speed;
        };

        challengePlayArea.addEventListener('mousedown', function (event) {
            if (event.button !== 0) return;
            event.preventDefault();
            const rect = challengePlayArea.getBoundingClientRect();
            const scale = challengePlayArea._scale || 1;
            const x = (event.clientX - rect.left) / scale;
            const y = (event.clientY - rect.top) / scale;
            fireBullet(x, y);
        });

        document.addEventListener('keydown', function (event) {
            if (!challengeActive) return;
            const key = event.key.toLowerCase();
            if (!['w', 'a', 's', 'd'].includes(key)) return;
            event.preventDefault();
            controlState[key] = true;
            updateControlledMovement();
        });

        document.addEventListener('keyup', function (event) {
            if (!challengeActive) return;
            const key = event.key.toLowerCase();
            if (!['w', 'a', 's', 'd'].includes(key)) return;
            event.preventDefault();
            controlState[key] = false;
            updateControlledMovement();
        });
    }

    const toggleHitboxBtn = document.getElementById('toggleHitboxBtn');

    // 切换判定框显示
    if (toggleHitboxBtn) {
        toggleHitboxBtn.addEventListener('click', function() {
            const persons = document.querySelectorAll('.challenge-person');
            if (persons.length === 0) {
                alert('请先点击“开始游戏”生成小人！');
                return;
            }
            
            // 切换所有小人的 .show-hitbox 类
            const isShowing = persons[0].classList.contains('show-hitbox');
            persons.forEach(p => p.classList.toggle('show-hitbox'));
            
            // 更新按钮文字
            this.textContent = isShowing ? '🔍 显示判定框' : '🔍 隐藏判定框';
            this.style.background = isShowing ? '#f0f0f0' : '#98d6f3';
        });
    }

    // 音乐控件
    const musicPlayBtn = document.getElementById('musicPlayBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');

    if (musicPlayBtn) {
        musicPlayBtn.addEventListener('click', () => {
            if (bgMusic.paused) {
                bgMusic.play().catch(() => {});
            } else {
                bgMusic.pause();
            }
            updateMusicBtnIcon();
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            const val = Number(volumeSlider.value);
            const volume = val / 100;
            bgMusic.volume = volume;
            normalBGM.volume = volume;
            challengeBGM.volume = volume;
            volumeIcon.textContent = val === 0 ? '🔇' : val < 50 ? '🔉' : '🔊';
        });
    }

    // 窗口缩放时重新计算游戏区尺寸
    window.addEventListener('resize', () => {
        if (challengePlayArea && !challengeModal.classList.contains('hidden')) {
            updateChallengeAreaScale();
        }
    });

    // 主界面循环播放背景音乐
    bgMusic.play().catch(() => {});
}

init();
