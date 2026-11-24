/* =========================================================
   합! 결!  -  연습 모드 (기획서 v0.2 기준)
   ========================================================= */

/* ----- 설정값: 숫자는 여기서만 바꾸면 됩니다 ----- */
var CONFIG = {
  WRONG_PENALTY_SEC: 10,   // 오답 시 줄어드는 시간(초)
  HINT_MAX: 10,            // 처음에 가진 힌트 개수 (개수 제한 없음, 시간 충전 없음)
  THINK_REWARDS: [5, 4, 3],  // 생각해보기 정답 보상: 1번째 도전 5개, 2번째 4개, 3번째 3개
  THINK_WAIT_MIN: 10,      // 생각해보기를 틀린 뒤 다시 도전까지 기다리는 시간(분)
  LIFE_MAX: 5,             // 생명 최대 개수 (처음 개수)
  LIFE_CHARGE_MIN: 10,     // 생명 1개 충전 간격(분)
  REFILL_HAP_SEC: 60,      // 생명 채우기 ① 합 찾기 제한 시간(초)
  REFILL_MATH_SEC: 10,     // 생명 채우기 ② 수학 문제 제한 시간(초)
  REFILL_WRONG_LIMIT: 2,   // 합 찾기에서 이만큼 틀리면 실패
  REFILL_COSTS: [0, 2, 3, 5],  // 하루 도전 비용(힌트): 1번째 무료, 2번째 2개, 3번째 3개, 4번째 5개 (모두 합쳐 10개)
  ZERO_BOARD_RATE: 0.2,    // 41단계부터 합 0개 판이 나올 비율
  STAR3_RATE: 0.5,         // 남은 시간 50% 이상 → 별 3개
  STAR2_RATE: 0.25,        // 남은 시간 25% 이상 → 별 2개
  WARN_SEC: 10,            // 남은 시간이 이만큼이면 째깍 소리
  STAGE_COUNT: 100
};

/* 단계별 규칙 (기획서 5.2). 제한 시간 = 판 하나당 secPerBoard초 × 판 수 */
var TIERS = [
  { from: 1,  to: 10,  boards: 1, min: 1, max: 2, zero: false, secPerBoard: 180 },
  { from: 11, to: 20,  boards: 1, min: 2, max: 3, zero: false, secPerBoard: 180 },
  { from: 21, to: 30,  boards: 1, min: 3, max: 4, zero: false, secPerBoard: 150 },
  { from: 31, to: 40,  boards: 1, min: 4, max: 6, zero: false, secPerBoard: 150 },
  { from: 41, to: 50,  boards: 1, min: 0, max: 6, zero: true,  secPerBoard: 105 },
  { from: 51, to: 70,  boards: 2, min: 0, max: 6, zero: true,  secPerBoard: 105 },
  { from: 71, to: 90,  boards: 2, min: 4, max: 6, zero: true,  secPerBoard: 100 },
  { from: 91, to: 100, boards: 3, min: 0, max: 6, zero: true,  secPerBoard: 80 }
];

/* 타일 그리기용 색 */
var COLORS = ['#E53935', '#FBC02D', '#1E88E5'];  // 빨강 노랑 파랑
var BGS = ['#FFFFFF', '#9E9E9E', '#212121'];     // 흰색 회색 검정

/* ----- 생각해보기 10문제 (기획서 5.9) ----- */
/* 타일 번호 = 모양 + 색×3 + 배경×9  (모양 0○ 1△ 2□ / 색 0빨 1노 2파 / 배경 0흰 1회 2검) */
var THINK = {
  10: {
    q: '두 타일과 합을 이루는 세 번째 타일은 무엇일까요?',
    tiles: [0, 10],
    pic: true,
    choices: [2, 26, 20, 19],   // 빨강□흰, 파랑□검, 빨강□검, 빨강△검
    answer: 20,
    explain: '색은 빨강, 빨강으로 같으니 세 번째도 빨강이에요. 모양은 ○, △로 다르니 남은 □, 배경은 흰색, 회색으로 다르니 남은 검정이에요. 그래서 빨강 □ 검정 배경!'
  },
  20: {
    q: '타일은 모두 몇 종류일까요?',
    choices: ['9', '18', '27', '81'],
    answer: '27',
    explain: '모양 3가지 × 색 3가지 × 배경 3가지 = 27종류예요.'
  },
  30: {
    q: "27종 전체에서 '모양은 모두 다르고, 색과 배경은 각각 모두 같은' 합은 몇 개일까요?",
    choices: ['3', '6', '9', '27'],
    answer: '9',
    explain: '모양은 ○△□ 한 가지로 정해져요. 같은 색은 3가지, 같은 배경도 3가지 중에서 고르면 되니까 3 × 3 = 9개예요.'
  },
  40: {
    q: "27종 전체에서 '모양, 색, 배경이 모두 다 다른' 합은 몇 개일까요?",
    choices: ['6', '18', '27', '36'],
    answer: '36',
    explain: '○, △, □에 색을 하나씩 붙이는 방법은 3 × 2 × 1 = 6가지, 배경을 하나씩 붙이는 방법도 6가지예요. 그래서 6 × 6 = 36개예요.'
  },
  50: {
    q: "27종 전체에서 '빨강 ○ 흰 배경' 타일이 들어가는 합은 몇 개일까요?\n(힌트: 두 장을 정하면 세 번째는 딱 하나로 정해져요)",
    choices: ['9', '12', '13', '26'],
    answer: '13',
    explain: "'빨강 ○ 흰 배경'과 짝이 될 타일은 나머지 26장이에요. 짝을 하나 정하면 세 번째가 딱 하나로 정해지는데, 그 세 번째 타일과 짝을 지어도 같은 합이 나와요. 합 하나에 짝이 2장씩 들어 있으니 26 ÷ 2 = 13개예요."
  },
  60: {
    q: "27종 전체에서 '정확히 두 속성이 같은' 합은 몇 개일까요?",
    choices: ['9', '18', '27', '54'],
    answer: '27',
    explain: '같은 두 속성을 고르는 방법은 (모양·색), (모양·배경), (색·배경) 3가지예요. 고른 두 속성의 값은 3 × 3 = 9가지라서 3 × 9 = 27개예요. 30단계 문제는 이 가운데 (색·배경)인 경우였어요.'
  },
  70: {
    q: '27종에서 서로 다른 타일 3장을 무작위로 뽑을 때, 합이 될 확률은?',
    choices: ['1/3', '1/9', '1/25', '1/27'],
    answer: '1/25',
    explain: '처음 두 장은 무엇을 뽑아도 괜찮아요. 세 번째 장은 남은 25장 가운데 합을 완성하는 딱 1장을 뽑아야 하니까 확률은 1/25이에요.'
  },
  80: {
    q: '9장 판에서 합은 최대 몇 개까지 나올 수 있을까요?',
    choices: ['9', '12', '27', '84'],
    answer: '12',
    explain: '9장에서 두 장 짝을 고르는 방법은 9 × 8 ÷ 2 = 36쌍이에요. 짝 하나는 합 하나에만 들어가고, 합 하나에는 짝이 3쌍 들어 있어요. 그래서 합은 많아야 36 ÷ 3 = 12개예요.'
  },
  90: {
    q: '27종 전체에서 합은 모두 몇 개일까요?',
    choices: ['117', '234', '351', '2925'],
    answer: '117',
    explain: '27장에서 두 장 짝은 27 × 26 ÷ 2 = 351쌍이고, 합 하나에는 짝이 3쌍 들어 있으니 351 ÷ 3 = 117개예요. 40단계(36개)와 60단계(27개) 답에 \'한 속성만 같은 합\' 54개를 더해도 117개가 나와요.'
  },
  100: {
    q: '속성이 하나 더 늘어서 타일이 81종이 되면, 전체 합은 몇 개일까요?',
    choices: ['351', '1080', '3240', '6480'],
    answer: '1080',
    explain: '81장에서 두 장 짝은 81 × 80 ÷ 2 = 3240쌍이고, 합 하나에는 짝이 3쌍 들어 있으니 3240 ÷ 3 = 1080개예요. 90단계와 같은 생각이에요.'
  }
};

/* ----- 생각해보기 힌트 1: 떠올려야 할 개념이나 전략을 묻는 발문 (기획서 5.9) ----- */
var THINK_HINTS = {
  10: '세 속성을 하나씩 따로 생각해 보세요. 두 장의 색이 같다면 세 번째 색은? 두 장의 모양이 다르다면 세 번째 모양은?',
  20: "모양을 하나 정하면 색은 몇 가지로 고를 수 있을까요? 거기에 배경까지 고르면? '그리고'로 이어지는 선택은 곱하기로 셀 수 있었죠.",
  30: "모양은 ○, △, □ 한 세트로 정해져 있어요. 그렇다면 실제로 고를 수 있는 건 '어떤 색'과 '어떤 배경'뿐이에요. 각각 몇 가지일까요?",
  40: '○ 타일의 색을 먼저 고르면, △ 타일에는 몇 가지 색이 남나요? □ 타일은요? 배경도 같은 방법으로 세어 보세요.',
  50: "'빨강 ○ 흰 배경'과 짝이 될 두 번째 타일을 고르면 세 번째는 저절로 정해져요. 그런데 두 번째와 세 번째를 서로 바꿔 골라도 같은 합이 된다는 걸 생각해 보세요.",
  60: "30단계에서는 '색과 배경이 같은' 경우만 셌어요. 같은 두 속성을 고르는 방법이 그것 말고 또 있나요?",
  70: '첫 번째, 두 번째 타일은 무엇을 뽑아도 괜찮아요. 세 번째 타일을 뽑을 때 남은 타일은 몇 장이고, 그중 합을 완성하는 타일은 몇 장일까요?',
  80: "합 하나 안에는 '두 장 짝'이 몇 쌍 들어 있나요? 그리고 9장에서 만들 수 있는 '두 장 짝'은 모두 몇 쌍인가요?",
  90: '80단계 문제와 같은 생각을 27장 전체에 해 보세요. 27장에서 두 장 짝은 몇 쌍일까요?',
  100: '90단계에서 쓴 방법을 81장에 그대로 써 보세요. 두 장 짝의 수를 구한 다음, 합 하나에 들어 있는 짝의 수로 나눠요.'
};

/* ----- 생명 채우기용 수학 복습 30문제 (기획서 5.5-2) ----- */
/* [단원, 문제, 정답, [오답 3개]] */
var MATH_QS = [
  ['중1 · 정수와 유리수', '(−3) × (+4) = ?', '−12', ['12', '−7', '7']],
  ['중1 · 소인수분해', '24를 소인수분해하면?', '2³ × 3', ['2² × 6', '2 × 3 × 4', '2³ × 3²']],
  ['중1 · 소인수분해', '12와 18의 최대공약수는?', '6', ['3', '2', '36']],
  ['중1 · 정수와 유리수', '|−7| + |+2| = ?', '9', ['5', '−5', '−9']],
  ['중1 · 문자와 식', 'x = 3일 때 2x − 1의 값은?', '5', ['4', '6', '7']],
  ['중1 · 일차방정식', '3x + 2 = 11의 해는?', 'x = 3', ['x = 2', 'x = 4', 'x = −3']],
  ['중1 · 좌표평면과 그래프', 'y = 2x에서 x = 4일 때 y의 값은?', '8', ['2', '6', '16']],
  ['중1 · 좌표평면과 그래프', '점 (−2, 3)은 제몇 사분면 위의 점?', '제2사분면', ['제1사분면', '제3사분면', '제4사분면']],
  ['중1 · 평면도형', '삼각형의 세 내각의 크기의 합은?', '180°', ['90°', '270°', '360°']],
  ['중1 · 평면도형', '한 내각의 크기가 60°인 정다각형은?', '정삼각형', ['정사각형', '정오각형', '정육각형']],
  ['중2 · 유리수와 순환소수', '0.333…을 분수로 나타내면?', '1/3', ['3/10', '1/30', '33/100']],
  ['중2 · 식의 계산', 'a² × a³ = ?', 'a⁵', ['a⁶', '2a⁵', 'a']],
  ['중2 · 식의 계산', '(2x)² = ?', '4x²', ['2x²', '4x', '2x']],
  ['중2 · 연립방정식', 'x + y = 5, x − y = 1의 해는?', 'x = 3, y = 2', ['x = 2, y = 3', 'x = 4, y = 1', 'x = 1, y = 4']],
  ['중2 · 일차부등식', 'x + 3 > 5의 해는?', 'x > 2', ['x < 2', 'x > 8', 'x < 8']],
  ['중2 · 일차함수', 'y = 3x − 2의 기울기는?', '3', ['−2', '2', '−3']],
  ['중2 · 일차함수', 'y = 2x + 4의 y절편은?', '4', ['2', '−2', '−4']],
  ['중2 · 피타고라스 정리', '직각삼각형에서 빗변이 아닌 두 변이 3, 4일 때 빗변의 길이는?', '5', ['6', '7', '12']],
  ['중2 · 닮음', '닮음비가 1 : 2인 두 정사각형의 넓이의 비는?', '1 : 4', ['1 : 2', '1 : 8', '2 : 1']],
  ['중2 · 확률', '주사위 1개를 던질 때 짝수의 눈이 나올 확률은?', '1/2', ['1/3', '1/6', '2/3']],
  ['중3 · 제곱근과 실수', '√49 = ?', '7', ['±7', '−7', '49']],
  ['중3 · 제곱근과 실수', '√2 × √8 = ?', '4', ['√10', '8', '16']],
  ['중3 · 다항식의 곱셈', '(x + 1)(x − 1) = ?', 'x² − 1', ['x² + 1', 'x² − 2x + 1', 'x² + 2x − 1']],
  ['중3 · 이차방정식', 'x² = 9의 해는?', 'x = ±3', ['x = 3', 'x = 9', 'x = ±9']],
  ['중3 · 이차방정식', 'x² − 5x + 6 = 0의 해는?', 'x = 2 또는 x = 3', ['x = −2 또는 x = −3', 'x = 1 또는 x = 6', 'x = −1 또는 x = −6']],
  ['중3 · 이차함수', 'y = x²의 그래프의 꼭짓점은?', '(0, 0)', ['(1, 1)', '(0, 1)', '(1, 0)']],
  ['중3 · 삼각비', 'sin 30°의 값은?', '1/2', ['√3/2', '√2/2', '1']],
  ['중3 · 원의 성질', '반원에 대한 원주각의 크기는?', '90°', ['45°', '60°', '180°']],
  ['중3 · 대푯값', '자료 1, 3, 3, 5, 8의 중앙값은?', '3', ['1', '4', '5']],
  ['중3 · 대푯값', '자료 1, 3, 3, 5, 8의 최빈값은?', '3', ['1', '4', '8']]
];

/* =========================================================
   저장 (브라우저 localStorage)
   ========================================================= */
var SAVE_KEY = 'hapgyeol-save-v1';
var state = {
  unlocked: 1,         // 도전할 수 있는 가장 높은 단계
  stars: {},           // 단계별 최고 별 수
  think: {},           // 생각해보기를 맞힌 문제: 'correct'
  thinkTry: {},        // 생각해보기 도전 상황: { tries: 틀린 횟수, picks: 고른 오답들, until: 다시 도전 가능 시각, lockDay: 오늘 잠긴 날 }
  hints: CONFIG.HINT_MAX,
  chargeStart: null,   // (쓰지 않음: 예전 힌트 충전용)
  lives: CONFIG.LIFE_MAX,
  lifeStart: null,     // 생명 충전 시작 시각 (충전 중이 아니면 null)
  activeStage: null,   // 생명을 쓰고 진행 중인 단계 (클리어하면 null로)
  refill: { day: '', tries: 0, used: false },  // 오늘의 생명 채우기 도전 상황
  refillLog: [],       // 생명 채우기에 성공한 시각들 (최근 14일)
  student: null,       // { id: '30512', name: '김OO' } 맨 처음에 입력
  daily: { day: '', start: 0 },  // 오늘 처음 켰을 때의 도달 단계 (성적표 '오늘 깬 단계'용)
  resetLog: [],        // 초기화한 시각들 (선생님 플레이 기록에 표시)
  resumeLog: [],       // 이어하기 코드로 되살린 시각들 (선생님 플레이 기록에 표시)
  sound: true,
  tutorialSeen: false,
  playMs: 0,           // 누적 플레이 시간 (화면이 켜져 있던 시간)
  plog: []             // 선생님용 플레이 기록: [[시작 시각, 끝 시각, 플레이 ms], …]
};

function loadState() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      for (var k in saved) {
        if (saved.hasOwnProperty(k)) state[k] = saved[k];
      }
    }
  } catch (e) { /* 저장을 못 읽어도 처음 상태로 진행 */ }
  // 예전 방식('틀림', '넘김')으로 저장된 생각해보기는 처음 도전부터 다시 풀 수 있게
  for (var n in state.think) {
    if (state.think.hasOwnProperty(n) && state.think[n] !== 'correct') delete state.think[n];
  }
  if (!state.thinkTry) state.thinkTry = {};
}

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
}

/* =========================================================
   타일과 합
   ========================================================= */
function attrs(id) {
  return [id % 3, Math.floor(id / 3) % 3, Math.floor(id / 9)];  // [모양, 색, 배경]
}

function isHap(a, b, c) {
  var A = attrs(a), B = attrs(b), C = attrs(c);
  for (var i = 0; i < 3; i++) {
    if ((A[i] + B[i] + C[i]) % 3 !== 0) return false;  // 모두 같거나 모두 다르면 합이 3의 배수
  }
  return true;
}

function shapeSvg(id) {
  var at = attrs(id), color = COLORS[at[1]], s;
  if (at[0] === 0) s = '<circle cx="20" cy="20" r="13" fill="' + color + '"/>';
  else if (at[0] === 1) s = '<polygon points="20,6 34,32 6,32" fill="' + color + '"/>';
  else s = '<rect x="8" y="8" width="24" height="24" fill="' + color + '"/>';
  return '<svg viewBox="0 0 40 40">' + s + '</svg>';
}

function tileHtml(id, cls) {
  return '<span class="' + cls + '" style="background:' + BGS[attrs(id)[2]] + '">' + shapeSvg(id) + '</span>';
}

/* 9장을 뽑아서 합을 모두 찾는다 */
function findHaps(tiles) {
  var list = [];
  for (var a = 0; a < 9; a++)
    for (var b = a + 1; b < 9; b++)
      for (var c = b + 1; c < 9; c++)
        if (isHap(tiles[a], tiles[b], tiles[c])) list.push(a + '-' + b + '-' + c);
  return list;
}

/* 합 개수가 min~max인 판이 나올 때까지 다시 뽑는다 */
function makeBoard(min, max) {
  while (true) {
    var all = [];
    for (var i = 0; i < 27; i++) all.push(i);
    for (var j = 26; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = all[j]; all[j] = all[k]; all[k] = t;
    }
    var tiles = all.slice(0, 9);
    var haps = findHaps(tiles);
    if (haps.length >= min && haps.length <= max) return { tiles: tiles, haps: haps };
  }
}

function ruleOf(stage) {
  for (var i = 0; i < TIERS.length; i++) {
    if (stage >= TIERS[i].from && stage <= TIERS[i].to) return TIERS[i];
  }
  return TIERS[TIERS.length - 1];
}

/* =========================================================
   소리 (Web Audio로 직접 만듦)
   ========================================================= */
var audioCtx = null;

function tone(freq, start, dur, type, gain, freqEnd) {
  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var t = audioCtx.currentTime + start;
    var o = audioCtx.createOscillator();
    var v = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.01);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v);
    v.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* 소리가 안 나도 게임은 계속 */ }
}

var sfx = {
  hap: function () { tone(660, 0, 0.12, 'triangle', 0.25); tone(990, 0.11, 0.22, 'triangle', 0.25); },
  wrong: function () { tone(220, 0, 0.3, 'square', 0.08, 140); },
  hint: function () { tone(1500, 0, 0.15, 'sine', 0.15, 2400); tone(2400, 0.12, 0.15, 'sine', 0.1); },
  gyeol: function () {
    [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.11, 0.14, 'triangle', 0.22); });
    tone(1047, 0.33, 0.4, 'triangle', 0.25);
  },
  star: function (i) { tone(1100 + i * 220, 0, 0.25, 'sine', 0.2); },
  tick: function () { tone(1000, 0, 0.04, 'square', 0.06); },
  over: function () { tone(400, 0, 0.8, 'sawtooth', 0.08, 120); },
  reward: function () {
    [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.18, 'triangle', 0.2); });
    tone(1319, 0.42, 0.4, 'triangle', 0.2);
  }
};

/* =========================================================
   힌트 주머니 (기획서 5.5)
   ========================================================= */
/* 힌트는 시간으로 충전되지 않는다. 생각해보기를 맞혀야 늘어난다 (2026-11-24) */
function updateHints() {
  drawHintStatus();
}

function drawHintStatus() {
  document.getElementById('hintStatus').textContent = '힌트 ' + state.hints;   // 가진 개수만 표시 (개수 제한 없음)
}

function addHints(n) {
  state.hints += n;
  saveState();
  drawHintStatus();
}

/* =========================================================
   생명 (기획서 5.5-1)
   - 단계를 시작할 때 1개를 먼저 쓰고, 클리어하면 돌려준다
     → 시간 초과, 나가기, 창 닫기 모두 똑같이 1개를 잃는다
   - 5개보다 적어지는 순간부터 충전, 5개까지
   ========================================================= */
function lifeMs() { return CONFIG.LIFE_CHARGE_MIN * 60 * 1000; }

function updateLives() {
  var changed = false;
  while (state.lifeStart !== null && Date.now() >= state.lifeStart + lifeMs()) {
    state.lives++;
    state.lifeStart += lifeMs();
    if (state.lives >= CONFIG.LIFE_MAX) state.lifeStart = null;
    changed = true;
  }
  if (changed) saveState();
  drawLifeStatus();
}

function nextLifeText() {
  return mmss(Math.max(0, state.lifeStart + lifeMs() - Date.now()));
}

function drawLifeStatus() {
  var text = '❤ ' + state.lives + ' / ' + CONFIG.LIFE_MAX;
  if (state.lifeStart !== null) text += ' · 다음 충전 ' + nextLifeText();
  $('lifeStatus').textContent = text;
  if ($('noLifeTime')) {   // '생명이 없어요' 창이 떠 있으면 시간도 갱신
    $('noLifeTime').textContent = state.lives > 0 ? '충전 완료!' : nextLifeText();
  }
}

function spendLife() {
  state.lives--;
  if (state.lives < CONFIG.LIFE_MAX && state.lifeStart === null) state.lifeStart = Date.now();
  saveState();
  drawLifeStatus();
}

function refundLife() {
  state.lives = Math.min(CONFIG.LIFE_MAX, state.lives + 1);
  if (state.lives >= CONFIG.LIFE_MAX) state.lifeStart = null;
  saveState();
  drawLifeStatus();
}

function showNoLives() {
  openOverlay(
    '<h2>생명이 없어요</h2>' +
    '<p class="ov-text" style="font-size:22px;text-align:center">❤ 0 / ' + CONFIG.LIFE_MAX + '</p>' +
    '<p class="ov-text" style="text-align:center">다음 충전까지 <b id="noLifeTime">' + nextLifeText() + '</b></p>' +
    '<p class="ov-text">기다리는 동안 단계 고르기 화면 아래의 <b>수학 생각해보기</b>를 풀어 보세요. 맞히면 힌트를 받아요.</p>' +
    '<div class="ov-buttons"><div class="right"><button id="ovSelect" class="btn-main">단계 고르기</button></div></div>'
  );
  $('ovSelect').onclick = showSelect;
}

/* =========================================================
   공통 도우미
   ========================================================= */
function $(id) { return document.getElementById(id); }

function mmss(ms) {
  var s = Math.ceil(ms / 1000);
  var m = Math.floor(s / 60);
  s = s % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function showScreen(name) {
  $('screenSelect').classList.toggle('hidden', name !== 'select');
  $('screenGame').classList.toggle('hidden', name !== 'game');
}

function openOverlay(html) {
  $('overlayBox').classList.remove('wide');
  $('overlayBox').innerHTML = html;
  $('overlay').classList.remove('hidden');
}

function closeOverlay() {
  $('overlayBox').classList.remove('wide');
  $('overlay').classList.add('hidden');
  $('overlayBox').innerHTML = '';
}

function hapLabel(key) {
  return key.split('-').map(function (p) { return +p + 1; }).join(' - ');
}

function hapMinis(key, tiles) {
  return '<span class="minis">' + key.split('-').map(function (p) {
    return tileHtml(tiles[+p], 'mini');
  }).join('') + '</span>';
}

/* =========================================================
   화면 1: 단계 고르기
   ========================================================= */
var page = 0;

function drawSelect() {
  var pages = Math.ceil(CONFIG.STAGE_COUNT / 20);
  if (page < 0) page = 0;
  if (page > pages - 1) page = pages - 1;
  var from = page * 20 + 1;
  var to = Math.min(from + 19, CONFIG.STAGE_COUNT);
  $('pageLabel').textContent = from + ' ~ ' + to + '단계 (' + (page + 1) + ' / ' + pages + ')';

  var html = '';
  for (var n = from; n <= to; n++) {
    var st = state.stars[n];
    if (st) {
      html += '<button class="stage-cell clear" data-stage="' + n + '">' + n +
              '<span class="cell-stars">' + '★'.repeat(st) + '☆'.repeat(3 - st) + '</span></button>';
    } else if (n === state.unlocked) {
      html += '<button class="stage-cell current" data-stage="' + n + '">' + n + '</button>';
    } else {
      html += '<button class="stage-cell locked" aria-label="' + n + '단계 잠김">🔒</button>';
    }
  }
  $('stageGrid').innerHTML = html;
  var cells = $('stageGrid').querySelectorAll('[data-stage]');
  for (var i = 0; i < cells.length; i++) {
    cells[i].onclick = function () { startStage(+this.getAttribute('data-stage')); };
  }
  drawThinkList();
}

function drawThinkList() {
  var html = '';
  for (var n = 10; n <= 100; n += 10) {
    var st = thinkStatus(n);
    if (st === 'correct') html += '<button class="think-chip correct">' + n + '단계 ✓ 맞힘</button>';
    else if (st === 'locked') html += '<button class="think-chip locked">' + n + '단계 🔒</button>';
    else if (st === 'today') html += '<button class="think-chip wrong">' + n + '단계 내일 다시</button>';
    else if (st === 'wait') html += '<button class="think-chip wrong">' + n + '단계 다시 풀기 ' + mmss(thinkTry(n).until - Date.now()) + ' 뒤</button>';
    else html += '<button class="think-chip open" data-think="' + n + '">' + n + '단계 ' + (thinkTry(n).tries > 0 ? '다시 풀기' : '풀기') + '</button>';
  }
  $('thinkList').innerHTML = html;
  var chips = $('thinkList').querySelectorAll('[data-think]');
  for (var i = 0; i < chips.length; i++) {
    chips[i].onclick = function () { openThink(+this.getAttribute('data-think'), 'select'); };
  }
}

/* =========================================================
   화면 2: 게임
   ========================================================= */
var game = null;
var loopTimer = null;

function startStage(stage) {
  updateLives();
  if (state.lives <= 0) { showNoLives(); return; }
  spendLife();                 // 시작할 때 1개를 쓰고, 클리어하면 돌려준다
  state.activeStage = stage;
  saveState();

  var rule = ruleOf(stage);
  var boards = [];
  var total = 0;
  for (var i = 0; i < rule.boards; i++) {
    var b = (rule.zero && Math.random() < CONFIG.ZERO_BOARD_RATE) ? makeBoard(0, 0) : makeBoard(rule.min, rule.max);
    boards.push(b);
    total += rule.secPerBoard * 1000;
  }
  game = {
    stage: stage,
    boards: boards,
    idx: 0,
    found: [],
    selected: [],
    hinted: [],
    total: total,
    deadline: Date.now() + total,
    lastSec: null,
    busy: false,
    over: false
  };
  closeOverlay();
  showScreen('game');
  $('stageLabel').textContent = stage + '단계';
  setMsg('', '');
  drawBoard();
  drawFound();
  drawBoardLabel();
  clearInterval(loopTimer);
  loopTimer = setInterval(gameLoop, 100);
  gameLoop();
}

function cur() { return game.boards[game.idx]; }

function drawBoardLabel() {
  $('boardLabel').textContent = game.boards.length > 1 ? '판 ' + (game.idx + 1) + ' / ' + game.boards.length : '';
}

function drawBoard() {
  var b = cur(), html = '';
  for (var i = 0; i < 9; i++) {
    var id = b.tiles[i];
    var numColor = attrs(id)[2] === 0 ? '#222' : '#fff';
    var cls = 'tile';
    if (game.hinted.indexOf(i) >= 0) cls += ' hint';
    html += '<div class="' + cls + '" data-pos="' + i + '" style="background:' + BGS[attrs(id)[2]] + '">' +
            '<span class="num" style="color:' + numColor + '">' + (i + 1) + '</span>' + shapeSvg(id) + '</div>';
  }
  $('board').innerHTML = html;
  var list = $('board').querySelectorAll('.tile');
  for (var n = 0; n < list.length; n++) list[n].onclick = onTile;
}

function drawFound() {
  var b = cur(), html = '';
  game.found.forEach(function (key) {
    html += '<div class="found-item"><span class="nums">' + hapLabel(key) + '</span>' + hapMinis(key, b.tiles) + '</div>';
  });
  $('foundList').innerHTML = html;
}

function setMsg(text, kind) {
  $('msg').textContent = text;
  $('msg').className = 'msg ' + kind;
}

function popText(text, color) {
  var el = $('bigText');
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function shakeBoard() {
  var el = $('board');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function gameLoop() {
  if (!game || game.over || game.frozen) return;
  var left = Math.max(0, game.deadline - Date.now());
  $('timeText').textContent = mmss(left);
  $('timeBar').style.width = (left / game.total * 100) + '%';
  var warn = left <= CONFIG.WARN_SEC * 1000;
  $('timeText').classList.toggle('warn', warn);
  $('timeBarBg').classList.toggle('warn', warn);
  if (warn && left > 0) {
    var sec = Math.ceil(left / 1000);
    if (sec !== game.lastSec) { game.lastSec = sec; sfx.tick(); }
  }
  if (left <= 0) failStage();
}

function onTile(e) {
  if (game.busy || game.over) return;
  var el = e.currentTarget;
  var pos = +el.getAttribute('data-pos');
  var k = game.selected.indexOf(pos);
  if (k >= 0) {
    game.selected.splice(k, 1);
    el.classList.remove('sel');
    return;
  }
  game.selected.push(pos);
  el.classList.add('sel');
  if (game.selected.length === 3) judge();
}

function penalty() {
  game.deadline -= CONFIG.WRONG_PENALTY_SEC * 1000;
  sfx.wrong();
  shakeBoard();
  popText('−' + CONFIG.WRONG_PENALTY_SEC + '초', '#E53935');
  gameLoop();
}

function judge() {
  var b = cur();
  var key = game.selected.slice().sort(function (x, y) { return x - y; }).join('-');
  var els = $('board').querySelectorAll('.tile');
  var picked = game.selected.slice();
  game.busy = true;

  if (b.haps.indexOf(key) >= 0 && game.found.indexOf(key) < 0) {
    game.found.push(key);
    drawFound();
    sfx.hap();
    popText('합!', '#43A047');
    setMsg('합! ' + hapLabel(key), 'good');
    picked.forEach(function (p) { els[p].classList.remove('sel'); els[p].classList.add('ok'); });
  } else {
    setMsg(game.found.indexOf(key) >= 0 ? '이미 찾은 합이에요' : '합이 아니에요', 'bad');
    penalty();
  }

  setTimeout(function () {
    picked.forEach(function (p) { els[p].classList.remove('sel'); els[p].classList.remove('ok'); });
    game.selected = [];
    game.busy = false;
  }, 550);
}

function onGyeol() {
  if (!game || game.busy || game.over) return;
  var b = cur();
  if (game.found.length === b.haps.length) {
    sfx.gyeol();
    popText('결!', '#1E88E5');
    setMsg('결! 성공', 'good');
    game.busy = true;
    // 연출하는 동안 시간을 멈춘다
    var left = Math.max(0, game.deadline - Date.now());
    game.frozen = true;
    setTimeout(function () {
      game.busy = false;
      if (game.over) return;
      if (game.idx < game.boards.length - 1) {
        game.frozen = false;
        game.deadline = Date.now() + left;
        game.idx++;
        game.found = [];
        game.selected = [];
        game.hinted = [];
        drawBoard();
        drawFound();
        drawBoardLabel();
        setMsg('다음 판! (판 ' + (game.idx + 1) + ' / ' + game.boards.length + ')', 'info');
      } else {
        clearStage(left);
      }
    }, 900);
  } else {
    setMsg('결이 아니에요. 아직 합이 남아 있어요', 'bad');
    penalty();
  }
}

function onHint() {
  if (!game || game.busy || game.over) return;
  updateHints();
  if (state.hints <= 0) {
    setMsg('힌트가 없어요. 10단계마다 나오는 생각해보기를 맞히면 받을 수 있어요', 'info');
    return;
  }
  var b = cur();
  var left = b.haps.filter(function (h) { return game.found.indexOf(h) < 0; });
  var pick = null;
  if (left.length > 0) {
    var cand = [];
    left.forEach(function (h) {
      h.split('-').forEach(function (p) {
        p = +p;
        if (game.hinted.indexOf(p) < 0 && cand.indexOf(p) < 0) cand.push(p);
      });
    });
    if (cand.length === 0) {
      setMsg('남은 합의 타일은 이미 힌트로 다 보여줬어요', 'info');
      return;  // 이 경우는 힌트를 쓰지 않음
    }
    pick = cand[Math.floor(Math.random() * cand.length)];
  }

  // 힌트 1개 사용
  state.hints--;
  saveState();
  drawHintStatus();
  sfx.hint();

  if (pick === null) {
    setMsg('보여줄 타일이 없어요', 'info');
  } else {
    game.hinted.push(pick);
    $('board').querySelectorAll('.tile')[pick].classList.add('hint');
    setMsg((pick + 1) + '번 타일이 들어가는 합이 있어요', 'info');
  }
}

function stopGame() {
  if (game) game.over = true;
  clearInterval(loopTimer);
  $('timeBarBg').classList.remove('warn');
}

function quitGame() {
  if (!game || game.over) { showSelect(); return; }
  if (!confirm('지금 나가면 실패로 처리되어 생명 1개를 잃어요. 나갈까요?')) return;
  stopGame();
  state.activeStage = null;
  saveState();
  showSelect();
}

function showSelect() {
  stopGame();
  stopRefill();
  closeOverlay();
  page = Math.floor((Math.min(state.unlocked, CONFIG.STAGE_COUNT) - 1) / 20);
  drawSelect();
  showScreen('select');
}

/* ----- 클리어 ----- */
function clearStage(left) {
  stopGame();
  ensureDaily();   // 자정을 넘겨 계속 켜 둔 경우에도 '오늘 시작 단계'를 맞게
  state.activeStage = null;
  refundLife();
  var rate = left / game.total;
  var stars = rate >= CONFIG.STAR3_RATE ? 3 : (rate >= CONFIG.STAR2_RATE ? 2 : 1);
  var stage = game.stage;
  if (!state.stars[stage] || state.stars[stage] < stars) state.stars[stage] = stars;
  if (state.unlocked < stage + 1) state.unlocked = Math.min(stage + 1, CONFIG.STAGE_COUNT + 1);
  saveState();

  var needThink = stage % 10 === 0 && THINK[stage] && thinkStatus(stage) === 'open';
  var last = stage >= CONFIG.STAGE_COUNT;
  var title = last ? '100단계까지 모두 깼어요!' : stage + '단계 클리어!';

  var btns = '<button id="ovSelect">단계 고르기</button><div class="right"><button id="ovRetry">다시 하기</button>';
  if (needThink) btns += '<button id="ovNext" class="btn-main">생각해보기 ▶</button>';
  else if (!last) btns += '<button id="ovNext" class="btn-main">다음 단계 ▶</button>';
  btns += '</div>';

  openOverlay(
    '<h2>' + title + '</h2>' +
    '<div class="stars-big" id="starBox"></div>' +
    '<p class="ov-text" style="text-align:center">남은 시간 ' + mmss(left) + '</p>' +
    (needThink ? '<p class="ov-text" style="text-align:center">' + stage + '단계 수학 생각해보기가 열렸어요. 맞히면 힌트 +' + CONFIG.THINK_REWARDS[thinkTry(stage).tries] + '!</p>' : '') +
    '<div class="ov-buttons">' + btns + '</div>'
  );

  var box = $('starBox');
  box.innerHTML = '<span class="off">★★★</span>';
  for (var i = 0; i < stars; i++) {
    (function (i) {
      setTimeout(function () {
        sfx.star(i);
        box.innerHTML = '★'.repeat(i + 1) + '<span class="off">' + '★'.repeat(3 - i - 1) + '</span>';
      }, 350 + i * 380);
    })(i);
  }

  $('ovSelect').onclick = showSelect;
  $('ovRetry').onclick = function () { startStage(stage); };
  if ($('ovNext')) {
    $('ovNext').onclick = needThink ? function () { openThink(stage, 'clear'); } : function () { startStage(stage + 1); };
  }
}

/* ----- 실패 ----- */
function failStage() {
  stopGame();
  state.activeStage = null;
  saveState();
  sfx.over();
  $('timeText').textContent = '0:00';
  $('timeBar').style.width = '0%';
  var b = cur();
  var missed = b.haps.filter(function (h) { return game.found.indexOf(h) < 0; });
  var list = missed.length === 0
    ? '<p class="ov-text">놓친 합은 없어요. 결을 외치기만 하면 됐어요!</p>'
    : '<p class="ov-text">이 판에서 놓친 합이에요.</p>' + missed.map(function (h) {
        return '<div class="missed-row"><span style="min-width:90px">' + hapLabel(h) + '</span>' + hapMinis(h, b.tiles) + '</div>';
      }).join('');
  var stage = game.stage;
  openOverlay(
    '<h2>시간 끝!</h2>' +
    '<p class="ov-text" style="color:#E53935">생명 1개를 잃었어요. (❤ ' + state.lives + ' / ' + CONFIG.LIFE_MAX + ')</p>' + list +
    '<div class="ov-buttons"><button id="ovSelect">단계 고르기</button>' +
    '<div class="right"><button id="ovRetry" class="btn-main">새 판으로 다시 하기</button></div></div>'
  );
  $('ovSelect').onclick = showSelect;
  $('ovRetry').onclick = function () { startStage(stage); };
}

/* =========================================================
   생각해보기 (기획서 5.9)
   ========================================================= */
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* 이 문제의 도전 상황. 날짜가 바뀌어 잠금이 풀렸으면 처음 도전으로 되돌린다 */
function thinkTry(n) {
  var t = state.thinkTry[n];
  if (t && t.lockDay && t.lockDay !== todayKey()) { delete state.thinkTry[n]; saveState(); t = null; }
  return t || { tries: 0, picks: [], until: 0, lockDay: '' };
}

/* 'correct' 맞힘 / 'locked' 아직 안 열림 / 'today' 오늘은 끝 / 'wait' 10분 기다리는 중 / 'open' 풀 수 있음 */
function thinkStatus(n) {
  if (state.think[n] === 'correct') return 'correct';
  if (!state.stars[n]) return 'locked';
  var t = thinkTry(n);
  if (t.lockDay) return 'today';
  if (t.until > Date.now()) return 'wait';
  return 'open';
}

/* 힌트 2: 지울 오답 2개. 학생이 이미 고른 오답부터 지운다 (남은 2개 중에서 고르게) */
function thinkRemoved(t, picks) {
  var wrongs = t.choices.filter(function (c) { return c !== t.answer; });
  var removed = [];
  picks.forEach(function (p) { if (wrongs.indexOf(p) >= 0 && removed.indexOf(p) < 0 && removed.length < 2) removed.push(p); });
  shuffle(wrongs).forEach(function (w) { if (removed.indexOf(w) < 0 && removed.length < 2) removed.push(w); });
  return removed;
}

/* from: 'clear'(단계 클리어 직후) 또는 'select'(단계 고르기 화면에서) */
function openThink(stage, from) {
  var t = THINK[stage];
  var tt = thinkTry(stage);
  var reward = CONFIG.THINK_REWARDS[tt.tries];
  var removed = tt.tries >= 2 ? thinkRemoved(t, tt.picks) : [];
  var choices = shuffle(t.choices);
  var top = '';
  if (t.tiles) {
    top = '<div class="ov-tiles">' + tileHtml(t.tiles[0], 'ov-tile') + tileHtml(t.tiles[1], 'ov-tile') +
          '<span class="ov-q">?</span></div>';
  }
  var hints = '';
  if (tt.tries >= 1) hints += '<b>힌트 1</b> ' + THINK_HINTS[stage];
  if (tt.tries >= 2) hints += '<br><b>힌트 2</b> 오답 2개를 지웠어요.';
  var btns = choices.map(function (c, i) {
    var label = t.pic ? tileHtml(c, 'ov-tile') : c;
    var gone = removed.indexOf(c) >= 0;
    return '<button class="choice' + (gone ? ' gone' : '') + '" data-i="' + i + '"' + (gone ? ' disabled' : '') + '>' +
      label + '<small>' + '①②③④'[i] + '</small></button>';
  }).join('');

  openOverlay(
    '<span class="think-badge">' + stage + '단계 · 수학 생각해보기 · ' + (tt.tries + 1) + '번째 도전' + (tt.tries === 2 ? ' (오늘 마지막)' : '') + '</span>' +
    '<span class="think-reward">맞히면 힌트 +' + reward + '</span>' +
    '<p class="think-q">' + t.q.replace(/\n/g, '<br>') + '</p>' + top +
    (hints ? '<div class="hint-box">' + hints + '</div>' : '') +
    '<div class="choices' + (t.pic ? ' pic' : '') + '" id="choiceBox">' + btns + '</div>' +
    '<div id="thinkResult"></div>' +
    '<div class="ov-buttons" id="thinkBtns"><button id="ovSkip">넘기기 (나중에 이어서 풀 수 있어요)</button></div>'
  );

  var els = $('choiceBox').querySelectorAll('.choice');
  for (var i = 0; i < els.length; i++) {
    els[i].onclick = function () {
      var picked = choices[+this.getAttribute('data-i')];
      for (var n = 0; n < els.length; n++) els[n].disabled = true;
      if (picked === t.answer) {
        state.think[stage] = 'correct';
        delete state.thinkTry[stage];
        saveState();
        this.classList.add('right');
        sfx.reward();
        addHints(reward);
        $('thinkResult').innerHTML = '<p class="result-line good">정답! 힌트 +' + reward + '</p><div class="explain">' + t.explain + '</div>';
      } else {
        this.classList.add('wrongpick');
        sfx.wrong();
        var nt = { tries: tt.tries + 1, picks: tt.picks.concat([picked]), until: 0, lockDay: '' };
        var html;
        if (nt.tries >= 3) {
          nt.lockDay = todayKey();
          html = '<p class="result-line bad">아쉬워요, 오늘은 이 문제를 더 풀 수 없어요</p>' +
            '<div class="explain">내일이 되면 처음부터(힌트 없이) 다시 도전할 수 있어요.</div>';
        } else {
          nt.until = Date.now() + CONFIG.THINK_WAIT_MIN * 60 * 1000;
          var at = new Date(nt.until);
          var when = (at.getHours() < 10 ? '0' : '') + at.getHours() + ':' + (at.getMinutes() < 10 ? '0' : '') + at.getMinutes();
          html = '<p class="result-line bad">아쉬워요, 틀렸어요</p>' +
            '<div class="hint-box">' + (nt.tries === 1
              ? '<b>힌트 1</b> ' + THINK_HINTS[stage]
              : '<b>힌트 2</b> 다음 도전에서는 오답 2개를 지워 드려요.') + '</div>' +
            '<p class="ov-text">' + CONFIG.THINK_WAIT_MIN + '분 뒤(' + when + '부터) 다시 도전할 수 있어요.</p>';
        }
        state.thinkTry[stage] = nt;
        saveState();
        $('thinkResult').innerHTML = html;
      }
      thinkEndButtons(stage, from);
    };
  }
  $('ovSkip').onclick = function () {
    if (from === 'select') showSelect();
    else afterThink(stage);
  };
}

function thinkEndButtons(stage, from) {
  var html = '<button id="ovSelect">단계 고르기</button>';
  if (from === 'clear' && stage < CONFIG.STAGE_COUNT) {
    html += '<div class="right"><button id="ovNext" class="btn-main">다음 단계 ▶</button></div>';
  }
  $('thinkBtns').innerHTML = html;
  $('ovSelect').onclick = showSelect;
  if ($('ovNext')) $('ovNext').onclick = function () { startStage(stage + 1); };
}

/* 넘기기를 누른 뒤 (클리어 직후) */
function afterThink(stage) {
  if (stage < CONFIG.STAGE_COUNT) startStage(stage + 1);
  else showSelect();
}

/* =========================================================
   규칙 설명 (기획서 5.10)
   ========================================================= */
var rulePage = 0;

function checkRow(name, text, ok, bad) {
  return '<div class="check-row' + (bad ? ' bad' : '') + '"><span>' + name + '</span><span>' + text + '</span>' +
         (ok === null ? '<span></span>' : '<span class="' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '✗') + '</span>') + '</div>';
}

function rulePages() {
  var ov = function (id) { return tileHtml(id, 'ov-tile'); };
  return [
    {
      title: '타일에는 세 가지가 있어요',
      body: '<div class="ov-tiles">' + ov(0) + ov(13) + ov(26) + '</div>' +
        checkRow('모양', '○ 동그라미, △ 세모, □ 네모', null) +
        checkRow('색', '빨강, 노랑, 파랑', null) +
        checkRow('배경', '흰색, 회색, 검정', null) +
        '<p class="ov-text">판에는 서로 다른 타일 9장이 놓여요.</p>'
    },
    {
      title: '합: 세 가지 모두 "다 같거나, 다 다르거나"',
      body: '<div class="ov-tiles">' + ov(0) + ov(10) + ov(20) + '</div>' +
        checkRow('모양', '○ △ □ 모두 다름', true) +
        checkRow('색', '빨강 빨강 빨강 모두 같음', true) +
        checkRow('배경', '흰색 회색 검정 모두 다름', true) +
        '<p class="ov-text" style="color:#43A047">세 가지 모두 통과했으니 합!</p>'
    },
    {
      title: '두 장만 같으면 합이 아니에요',
      body: '<div class="ov-tiles">' + ov(0) + ov(10) + ov(26) + '</div>' +
        checkRow('모양', '○ △ □ 모두 다름', true) +
        checkRow('색', '빨강 빨강 파랑, 두 장만 같음', false, true) +
        checkRow('배경', '흰색 회색 검정 모두 다름', true) +
        '<p class="ov-text" style="color:#E53935">하나라도 걸리면 합이 아니에요.</p>'
    },
    {
      title: '이렇게 진행해요',
      body:
        '<div class="how-row"><span class="ic">👆</span><span>타일 3장을 누르면 바로 판정해요.</span></div>' +
        '<div class="how-row"><span class="ic">🏁</span><span>합을 다 찾았다고 생각하면 <b>결!</b> 맞으면 단계 클리어.</span></div>' +
        '<div class="how-row"><span class="ic">⏱</span><span>틀린 합, 이미 찾은 합, 틀린 결은 시간 ' + CONFIG.WRONG_PENALTY_SEC + '초 감소.</span></div>' +
        '<div class="how-row"><span class="ic">❤</span><span>생명은 ' + CONFIG.LIFE_MAX + '개. 시간이 끝나거나 도중에 나가면 1개가 줄어요. ' +
          CONFIG.LIFE_MAX + '개보다 적으면 ' + CONFIG.LIFE_CHARGE_MIN + '분마다 1개씩 충전. 0개면 기다려야 해요.</span></div>' +
        '<div class="how-row"><span class="ic">💡</span><span>힌트는 타일 1장을 알려 줘요. 처음 ' + CONFIG.HINT_MAX + '개. 저절로 충전되지 않고, ' +
          '10단계마다 나오는 생각해보기를 맞히면 받아요 (처음 도전에 맞히면 ' + CONFIG.THINK_REWARDS[0] + '개).</span></div>' +
        '<div class="how-row"><span class="ic">⭐</span><span>남은 시간이 많을수록 별이 많아요.</span></div>'
    },
    {
      title: '꿀팁: 두 장을 먼저 보고, 세 번째를 찾아요',
      body: '<div class="ov-tiles">' + ov(6) + ov(4) + '<span class="ov-arrow">→</span><span class="ov-q">?</span></div>' +
        checkRow('모양', '○ △ 다름 → 남은 것 □', null) +
        checkRow('색', '파랑 노랑 다름 → 남은 것 빨강', null) +
        checkRow('배경', '흰색 흰색 같음 → 흰색', null) +
        '<div class="ov-tiles" style="justify-content:flex-start">' + ov(2) +
        '<span class="ov-text">두 장을 정하면 세 번째는 딱 하나!<br>이 타일이 판에 있는지 찾아보세요.</span></div>'
    }
  ];
}

function openRules(p) {
  rulePage = p || 0;
  var pages = rulePages();
  var pg = pages[rulePage];
  var last = rulePage === pages.length - 1;
  var left = rulePage === 0 ? '<button id="rSkip">건너뛰기</button>' : '<button id="rPrev">◀ 이전</button>';
  var doneLabel = state.tutorialSeen ? '닫기' : '시작하기';
  var right = last ? '<button id="rDone" class="btn-main">' + doneLabel + '</button>' : '<button id="rNext" class="btn-main">다음 ▶</button>';
  if (rulePage > 0 && !last) left += '<button id="rSkip">건너뛰기</button>';

  openOverlay(
    '<div class="ov-page">' + (rulePage + 1) + ' / ' + pages.length + (last ? ' · 꿀팁' : '') + '</div>' +
    '<h2>' + pg.title + '</h2>' + pg.body +
    '<div class="ov-buttons"><div style="display:flex;gap:8px">' + left + '</div><div class="right">' + right + '</div></div>'
  );
  if ($('rSkip')) $('rSkip').onclick = closeRules;
  if ($('rPrev')) $('rPrev').onclick = function () { openRules(rulePage - 1); };
  if ($('rNext')) $('rNext').onclick = function () { openRules(rulePage + 1); };
  if ($('rDone')) $('rDone').onclick = closeRules;
}

function closeRules() {
  state.tutorialSeen = true;
  saveState();
  closeOverlay();
}

/* =========================================================
   소리 버튼
   ========================================================= */
function drawSoundBtn() {
  $('btnSound').textContent = state.sound ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
}

/* =========================================================
   선생님 생명 채우기 (기획서 5.5-2)
   - 단계 고르기 화면 또는 '생명이 없어요' 창에서 Ctrl + Alt + H
   - ① 합 찾기(합 1개, 세 속성이 모두 다른 합, 1분, 2번 틀리면 실패)
     → ② 수학 4지선다(10초, 기회 한 번) → 성공하면 생명 5개
   - 하루에 한 번 채울 수 있음. 도전은 하루 4번까지: 무료 → 힌트 2개 → 3개 → 5개
   ========================================================= */
var refillGame = null;
var refillTimer = null;

function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function refillToday() {
  if (!state.refill || state.refill.day !== todayKey()) {
    state.refill = { day: todayKey(), tries: 0, used: false };
    saveState();
  }
  return state.refill;
}

/* 판에 합이 딱 1개이고, 그 합이 '모양, 색, 배경이 모두 다른' 합인 판 */
function makeHardBoard() {
  while (true) {
    var b = makeBoard(1, 1);
    var p = b.haps[0].split('-').map(function (x) { return b.tiles[+x]; });
    var allDiff = true;
    for (var i = 0; i < 3; i++) {
      if (attrs(p[0])[i] === attrs(p[1])[i]) allDiff = false;
    }
    if (allDiff) return b;
  }
}

function refillInfo(title, text) {
  openOverlay('<h2>' + title + '</h2><p class="ov-text">' + text + '</p>' +
    '<div class="ov-buttons"><div class="right"><button id="rfClose" class="btn-main">닫기</button></div></div>');
  $('rfClose').onclick = showSelect;
}

function costTable(r) {
  return '<div class="rf-costs">' + CONFIG.REFILL_COSTS.map(function (c, i) {
    var cls = i < r.tries ? 'done' : (i === r.tries ? 'now' : '');
    return '<div class="rf-cost ' + cls + '"><span>' + (i + 1) + '번째</span><span>' +
      (c === 0 ? '무료' : '힌트 ' + c + '개') + (i < r.tries ? ' ✗' : '') + '</span></div>';
  }).join('') + '</div>';
}

/* 단축키를 누르면 */
function openRefill() {
  updateLives();
  updateHints();
  var r = refillToday();
  if (r.used) { refillInfo('생명 채우기', '오늘은 이미 사용했어요. 내일 다시 할 수 있어요.'); return; }
  if (state.lives >= CONFIG.LIFE_MAX) { refillInfo('생명 채우기', '생명이 이미 가득해요. (❤ ' + state.lives + ' / ' + CONFIG.LIFE_MAX + ')'); return; }
  if (r.tries >= CONFIG.REFILL_COSTS.length) { refillInfo('생명 채우기', '오늘은 더 이상 도전할 수 없어요. 내일 다시 할 수 있어요.'); return; }
  refillIntro('');
}

/* 도전 안내 화면 (처음, 그리고 실패한 뒤) */
function refillIntro(failText) {
  var r = refillToday();
  var html = '<span class="think-badge">생명 채우기 도전</span>';
  if (failText) {
    html += '<h2 style="margin-top:10px">아쉬워요, 실패!</h2><p class="ov-text">' + failText + '</p>';
  } else {
    html += '<h2 style="margin-top:10px">❤ 생명 5개 채우기 도전!</h2>' +
      '<p class="ov-text">① 하나뿐인 합을 ' + CONFIG.REFILL_HAP_SEC + '초 안에 찾고 (' + CONFIG.REFILL_WRONG_LIMIT + '번 틀리면 실패)<br>' +
      '② 수학 문제를 ' + CONFIG.REFILL_MATH_SEC + '초 안에 맞히면 (기회 한 번) 생명이 가득 차요.</p>';
  }
  html += costTable(r);

  var canTry = r.tries < CONFIG.REFILL_COSTS.length;
  var cost = canTry ? CONFIG.REFILL_COSTS[r.tries] : 0;
  var right = '';
  if (canTry) {
    right = '<button id="rfStart" class="btn-main">' +
      (cost === 0 ? '도전 시작' : '힌트 ' + cost + '개 쓰고 ' + (failText ? '다시 ' : '') + '도전 (지금 힌트 ' + state.hints + '개)') + '</button>';
  } else {
    html += '<p class="ov-text">오늘은 더 이상 도전할 수 없어요. 내일 다시 할 수 있어요.</p>';
  }
  html += '<p class="msg info" id="rfMsg"></p>' +
    '<div class="ov-buttons"><button id="rfClose">닫기</button><div class="right">' + right + '</div></div>';
  openOverlay(html);
  $('rfClose').onclick = showSelect;
  if ($('rfStart')) {
    $('rfStart').onclick = function () {
      if (state.hints < cost) {
        $('rfMsg').textContent = '힌트가 ' + cost + '개 필요해요. (지금 ' + state.hints + '개)';
        return;
      }
      startRefillTry(cost);
    };
  }
}

/* 도전 시작: 비용을 내고, 도전 횟수를 바로 센다 (도중에 창을 닫아도 1번으로 침) */
function startRefillTry(cost) {
  var r = refillToday();
  if (cost > 0) {
    state.hints -= cost;
  }
  r.tries++;
  saveState();
  drawHintStatus();

  var b = makeHardBoard();
  refillGame = {
    step: 1,
    board: b,
    selected: [],
    wrong: 0,
    busy: false,
    total: CONFIG.REFILL_HAP_SEC * 1000,
    deadline: Date.now() + CONFIG.REFILL_HAP_SEC * 1000
  };

  var tiles = '';
  for (var i = 0; i < 9; i++) {
    var id = b.tiles[i];
    tiles += '<div class="tile" data-pos="' + i + '" style="background:' + BGS[attrs(id)[2]] + '">' +
      '<span class="num" style="color:' + (attrs(id)[2] === 0 ? '#222' : '#fff') + '">' + (i + 1) + '</span>' + shapeSvg(id) + '</div>';
  }
  openOverlay(
    '<span class="think-badge">생명 채우기 도전 · ' + r.tries + '번째</span>' +
    '<h2 style="margin-top:10px">① 하나뿐인 합을 찾으세요</h2>' +
    '<div class="rf-top"><span id="rfLeft" class="rf-pill">틀릴 수 있는 기회 ✗ ' + (CONFIG.REFILL_WRONG_LIMIT - 1) + '번 남음</span>' +
    '<span id="rfTime" class="rf-time"></span></div>' +
    '<div class="timebar"><div id="rfBar" class="timebar-fill"></div></div>' +
    '<div class="rf-board"><div class="board" id="rfBoard">' + tiles + '</div></div>' +
    '<p class="msg" id="rfMsg"></p>'
  );
  var els = $('rfBoard').querySelectorAll('.tile');
  for (var n = 0; n < els.length; n++) els[n].onclick = onRefillTile;
  clearInterval(refillTimer);
  refillTimer = setInterval(refillLoop, 100);
  refillLoop();
}

function refillLoop() {
  var g = refillGame;
  if (!g) return;
  var left = Math.max(0, g.deadline - Date.now());
  if ($('rfTime')) $('rfTime').textContent = g.step === 1 ? mmss(left) : (Math.ceil(left / 1000) + '초');
  if ($('rfBar')) {
    $('rfBar').style.width = (left / g.total * 100) + '%';
    $('rfBar').style.background = left <= g.total / 3 ? '#E53935' : '';
  }
  if (left <= 0) {
    if (g.step === 1) refillFail('합 찾기 시간이 끝났어요. 정답은 ' + hapLabel(g.board.haps[0]) + '번이었어요.');
    else refillFail('수학 문제 시간이 끝났어요. (정답: ' + g.q[2] + ')');
  }
}

function onRefillTile(e) {
  var g = refillGame;
  if (!g || g.busy || g.step !== 1) return;
  var el = e.currentTarget;
  var pos = +el.getAttribute('data-pos');
  var k = g.selected.indexOf(pos);
  if (k >= 0) { g.selected.splice(k, 1); el.classList.remove('sel'); return; }
  g.selected.push(pos);
  el.classList.add('sel');
  if (g.selected.length < 3) return;

  var key = g.selected.slice().sort(function (x, y) { return x - y; }).join('-');
  var els = $('rfBoard').querySelectorAll('.tile');
  var picked = g.selected.slice();
  g.busy = true;
  if (key === g.board.haps[0]) {
    sfx.hap();
    picked.forEach(function (p) { els[p].classList.remove('sel'); els[p].classList.add('ok'); });
    $('rfMsg').className = 'msg good';
    $('rfMsg').textContent = '합! 이제 수학 문제예요';
    setTimeout(refillMath, 900);
    return;
  }
  g.wrong++;
  sfx.wrong();
  var board = $('rfBoard');
  board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
  if (g.wrong >= CONFIG.REFILL_WRONG_LIMIT) {
    setTimeout(function () { refillFail(CONFIG.REFILL_WRONG_LIMIT + '번 틀렸어요. 정답은 ' + hapLabel(g.board.haps[0]) + '번이었어요.'); }, 500);
    return;
  }
  $('rfMsg').className = 'msg bad';
  $('rfMsg').textContent = '합이 아니에요. 한 번 더 틀리면 실패!';
  $('rfLeft').textContent = '틀릴 수 있는 기회 ✗ ' + (CONFIG.REFILL_WRONG_LIMIT - 1 - g.wrong) + '번 남음';
  setTimeout(function () {
    picked.forEach(function (p) { els[p].classList.remove('sel'); });
    g.selected = [];
    g.busy = false;
  }, 500);
}

/* ② 수학 문제 */
function refillMath() {
  var g = refillGame;
  if (!g) return;
  var q = MATH_QS[Math.floor(Math.random() * MATH_QS.length)];
  var choices = shuffle([q[2]].concat(q[3]));
  g.step = 2;
  g.q = q;
  g.busy = false;
  g.total = CONFIG.REFILL_MATH_SEC * 1000;
  g.deadline = Date.now() + g.total;
  openOverlay(
    '<span class="think-badge">생명 채우기 도전 · ' + refillToday().tries + '번째</span>' +
    '<h2 style="margin-top:10px">② 수학 문제 (기회 한 번)</h2>' +
    '<div class="rf-top"><span class="ov-page">' + q[0] + '</span><span id="rfTime" class="rf-time"></span></div>' +
    '<div class="timebar"><div id="rfBar" class="timebar-fill"></div></div>' +
    '<p class="think-q">' + q[1] + '</p>' +
    '<div class="choices" id="rfChoices">' + choices.map(function (c, i) {
      return '<button class="choice" data-i="' + i + '">' + '①②③④'[i] + ' ' + c + '</button>';
    }).join('') + '</div>'
  );
  var els = $('rfChoices').querySelectorAll('.choice');
  for (var i = 0; i < els.length; i++) {
    els[i].onclick = function () {
      if (g.busy) return;
      g.busy = true;
      if (choices[+this.getAttribute('data-i')] === q[2]) refillSuccess();
      else refillFail('틀렸어요. (정답: ' + q[2] + ')');
    };
  }
  refillLoop();
}

function stopRefill() {
  clearInterval(refillTimer);
  refillGame = null;
}

function refillSuccess() {
  stopRefill();
  var r = refillToday();
  r.used = true;
  state.lives = CONFIG.LIFE_MAX;
  state.lifeStart = null;
  state.refillLog = (state.refillLog || []).concat([Date.now()]);
  var cut = Date.now() - PLOG_KEEP_DAYS * 24 * 60 * 60 * 1000;
  state.refillLog = state.refillLog.filter(function (t) { return t >= cut; });
  saveState();
  drawLifeStatus();
  sfx.reward();
  openOverlay(
    '<h2>성공! 생명이 가득 찼어요</h2>' +
    '<p class="ov-text" style="font-size:28px;text-align:center;color:#E53935">❤ ' + state.lives + ' / ' + CONFIG.LIFE_MAX + '</p>' +
    '<div class="ov-buttons"><div class="right"><button id="rfClose" class="btn-main">단계 고르기</button></div></div>'
  );
  $('rfClose').onclick = showSelect;
}

function refillFail(text) {
  stopRefill();
  sfx.over();
  refillIntro(text);
}

/* =========================================================
   선생님용 플레이 기록 (사계몬 RPG와 같은 방식)
   - 단계 고르기 화면에서 Ctrl + Alt + L
   - 화면이 켜져 있던 시간만 셈. 5분 넘게 끊기면 새 줄. 최근 14일만 보관
   - 학생 화면에는 안내 없음
   ========================================================= */
var PLOG_GAP_MS = 5 * 60 * 1000;
var PLOG_KEEP_DAYS = 14;
var playLastTick = Date.now();
var plogLastWrite = 0;
var plogPending = 0;

/* 1초마다 불림: 화면이 보이는 동안의 시간만 더한다 */
function trackPlay() {
  var now = Date.now();
  var dt = Math.min(now - playLastTick, 2000);
  playLastTick = now;
  if (document.visibilityState !== 'visible') return;
  state.playMs = (state.playMs || 0) + dt;
  plogPending += dt;
  if (now - plogLastWrite >= 10000) writePlog();
}

/* 모아 둔 시간을 기록에 적고 저장한다 */
function writePlog() {
  var now = Date.now();
  plogLastWrite = now;
  if (plogPending <= 0) return;
  var L = state.plog || (state.plog = []);
  var last = L[L.length - 1];
  if (last && now >= last[1] && now - last[1] < PLOG_GAP_MS) {
    last[1] = now;
    last[2] = (last[2] || 0) + plogPending;
  } else {
    L.push([now - plogPending, now, plogPending]);
  }
  plogPending = 0;
  var cut = now - PLOG_KEEP_DAYS * 24 * 60 * 60 * 1000;
  while (L.length && L[0][1] < cut) L.shift();
  saveState();
}

function playLogHtml() {
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var hm = function (t) { var d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  var day = function (t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + '일월화수목금토'[d.getDay()] + ')'; };
  var mn = function (ms) {
    if (ms < 60000) return '1분 미만';
    if (ms >= 3600000) return Math.floor(ms / 3600000) + '시간 ' + Math.round(ms % 3600000 / 60000) + '분';
    return Math.round(ms / 60000) + '분';
  };
  var L = state.plog || [], days = [];
  L.forEach(function (s) {
    var k = day(s[0]), g = null;
    for (var i = 0; i < days.length; i++) if (days[i].k === k) g = days[i];
    if (!g) { g = { k: k, s: [] }; days.push(g); }
    g.s.push(s);
  });
  var rows = days.reverse().map(function (g) {
    var sum = g.s.reduce(function (a, s) { return a + (s[2] || 0); }, 0);
    return '<div class="lg-d"><b>' + g.k + '</b><div class="lg-list">' + g.s.map(function (s) {
      return '<div class="lg-r"><span class="lg-t">' + hm(s[0]) + ' ~ ' + hm(s[1]) + '</span><span class="lg-m">' + mn(s[2] || 0) + '</span></div>';
    }).join('') + '<div class="lg-sum">이날 합계 ' + mn(sum) + '</div></div></div>';
  }).join('');
  return '<h2>플레이 기록 <small class="lg-small">선생님 확인용 · 최근 ' + PLOG_KEEP_DAYS + '일</small></h2>' +
    '<p class="lg-total">누적 플레이 시간 <b>' + mn(state.playMs || 0) + '</b></p>' +
    '<div class="lg-rows">' + (rows || '<p>아직 기록이 없어요.</p>') + '</div>' +
    '<p class="lg-total" style="margin-top:12px">생명 채우기 사용 ' +
      ((state.refillLog || []).length
        ? (state.refillLog || []).slice().reverse().map(function (t) { return '<b>' + day(t) + ' ' + hm(t) + '</b>'; }).join(', ')
        : '<b>없음</b>') + '</p>' +
    '<p class="lg-total">초기화 ' +
      ((state.resetLog || []).length
        ? (state.resetLog || []).slice().reverse().map(function (t) { return '<b>' + day(t) + ' ' + hm(t) + '</b>'; }).join(', ')
        : '<b>없음</b>') + '</p>' +
    '<p class="lg-total">이어하기 ' +
      ((state.resumeLog || []).length
        ? (state.resumeLog || []).slice().reverse().map(function (t) { return '<b>' + day(t) + ' ' + hm(t) + '</b>'; }).join(', ')
        : '<b>없음</b>') + '</p>' +
    '<p class="lg-note">기록 시작 ' + (L.length ? day(L[0][0]) : '-') + ' · 5분 넘게 쉬면 새 줄 · 화면이 꺼져 있던 시간은 빼고 셈<br>' +
    '컴퓨터 시계를 바꾸거나 다른 기기·브라우저에서 한 것은 여기 안 나와요 · 아무 곳이나 누르면 닫힘</p>';
}

function openPlayLog() {
  writePlog();
  openOverlay(playLogHtml());
  $('overlay').onclick = function () {
    $('overlay').onclick = null;
    closeOverlay();
  };
}

/* =========================================================
   학번·이름 입력 (맨 처음 한 번)
   ========================================================= */
function openStudentForm(then) {
  openOverlay(
    '<h2>합! 결!에 온 걸 환영해요</h2>' +
    '<p class="ov-text">성적표에 들어갈 학번과 이름을 적어 주세요.</p>' +
    '<div class="form-row"><label for="fId">학번 (숫자 5자리)</label><input id="fId" inputmode="numeric" maxlength="5" placeholder="30512"></div>' +
    '<div class="form-row"><label for="fName">이름</label><input id="fName" maxlength="10" placeholder="김하늘"></div>' +
    '<p class="msg bad" id="fMsg"></p>' +
    '<div class="ov-buttons"><div class="right"><button id="fOk" class="btn-main">시작하기</button></div></div>'
  );
  $('fId').focus();
  $('fOk').onclick = function () {
    var id = $('fId').value.trim();
    var name = $('fName').value.trim();
    if (!/^\d{5}$/.test(id)) { $('fMsg').textContent = '학번은 숫자 5자리로 적어 주세요.'; return; }
    if (!name) { $('fMsg').textContent = '이름을 적어 주세요.'; return; }
    if (!confirm('학번 ' + id + ', 이름 ' + name + ' 맞나요?')) return;
    state.student = { id: id, name: name };
    saveState();
    closeOverlay();
    if (then) then();
  };
}

/* =========================================================
   초기화 (사계몬 RPG처럼, 한 번 확인)
   - 깬 단계·별·생각해보기를 지우고 1단계부터. 힌트 5개, 생명 5개
   - 학번·이름, 플레이 기록, 누적 플레이 시간, 오늘의 생명 채우기 도전 상황은 남긴다
   ========================================================= */
function openReset() {
  openOverlay(
    '<h2>정말 초기화할까요?</h2>' +
    '<p class="ov-text">깬 단계, 별, 생각해보기 기록이 모두 지워지고 1단계부터 다시 시작해요. 되돌릴 수 없어요.</p>' +
    '<div class="ov-buttons"><button id="rsNo">아니요</button><div class="right"><button id="rsYes" class="btn-danger">초기화</button></div></div>'
  );
  $('rsNo').onclick = closeOverlay;
  $('rsYes').onclick = function () {
    state.unlocked = 1;
    state.stars = {};
    state.think = {};
    state.thinkTry = {};
    state.hints = CONFIG.HINT_MAX;
    state.lives = CONFIG.LIFE_MAX;
    state.lifeStart = null;
    state.activeStage = null;
    state.daily = { day: todayKey(), start: 0 };
    state.resetLog = (state.resetLog || []).concat([Date.now()]);
    saveState();
    updateLives();
    updateHints();
    showSelect();
    openOverlay('<h2>초기화했어요</h2><p class="ov-text">1단계부터 다시 시작해요.</p>' +
      '<div class="ov-buttons"><div class="right"><button id="rsOk" class="btn-main">확인</button></div></div>');
    $('rsOk').onclick = closeOverlay;
  };
}

/* =========================================================
   성적표 (사계몬 RPG처럼 이미지로 저장)
   ========================================================= */
function reached() { return Math.min(state.unlocked - 1, CONFIG.STAGE_COUNT); }

/* 날짜가 바뀌었으면 '오늘 시작 단계'를 새로 적는다 */
function ensureDaily() {
  if (!state.daily || state.daily.day !== todayKey()) {
    state.daily = { day: todayKey(), start: reached() };
    saveState();
  }
}

function todayPlayMs() {
  writePlog();
  var d = new Date(), y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
  return (state.plog || []).reduce(function (a, s) {
    var t = new Date(s[0]);
    return (t.getFullYear() === y && t.getMonth() === m && t.getDate() === dd) ? a + (s[2] || 0) : a;
  }, 0);
}

function timeText(ms) {
  if (ms < 60000) return '1분 미만';
  if (ms >= 3600000) return Math.floor(ms / 3600000) + '시간 ' + Math.round(ms % 3600000 / 60000) + '분';
  return Math.round(ms / 60000) + '분';
}

function reportData() {
  ensureDaily();
  var stars = 0, three = 0;
  for (var k in state.stars) {
    if (state.stars.hasOwnProperty(k)) { stars += state.stars[k]; if (state.stars[k] === 3) three++; }
  }
  var think = 0;
  for (var t in state.think) if (state.think[t] === 'correct') think++;
  var d = new Date();
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  return {
    id: state.student ? state.student.id : '',
    name: state.student ? state.student.name : '',
    date: d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '(' + '일월화수목금토'[d.getDay()] + ') ' + p2(d.getHours()) + ':' + p2(d.getMinutes()),
    file: p2(d.getMonth() + 1) + p2(d.getDate()) + '_' + p2(d.getHours()) + p2(d.getMinutes()),
    reached: reached(),
    todayStart: state.daily.start,
    stars: stars,
    three: three,
    think: think,
    todayMs: todayPlayMs(),
    totalMs: state.playMs || 0,
    code: state.student ? makeResumeCode(state.student.id) : ''
  };
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* 1280 × 800 성적표를 캔버스에 그린다 (화면과 PNG가 똑같음) */
function drawReport(cv, r) {
  var c = cv.getContext('2d');
  var F = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, 1280, 800);
  c.fillStyle = '#ffffff'; roundRect(c, 30, 30, 1220, 740, 24); c.fill();

  c.textBaseline = 'alphabetic';
  c.fillStyle = '#222'; c.font = 'bold 44px ' + F; c.textAlign = 'left';
  c.fillText('합! 결! 성적표', 70, 105);
  c.textAlign = 'right';
  c.font = 'bold 30px ' + F; c.fillText(r.id + ' ' + r.name, 1210, 92);
  c.font = '22px ' + F; c.fillStyle = '#6b6b6b'; c.fillText(r.date, 1210, 124);

  // 도달 단계
  c.textAlign = 'left';
  c.fillStyle = '#6b6b6b'; c.font = '24px ' + F; c.fillText('도달 단계', 70, 200);
  c.fillStyle = '#222'; c.font = 'bold 64px ' + F; c.fillText(String(r.reached), 190, 212);
  var w = c.measureText(String(r.reached)).width;
  c.fillStyle = '#6b6b6b'; c.font = '28px ' + F; c.fillText('/ 100', 200 + w, 212);
  c.fillStyle = '#ece8df'; roundRect(c, 420, 180, 790, 22, 11); c.fill();
  if (r.reached > 0) { c.fillStyle = '#1E88E5'; roundRect(c, 420, 180, Math.max(22, 790 * r.reached / 100), 22, 11); c.fill(); }

  // 숫자 칸 6개
  var boxes = [
    ['오늘 깬 단계', (r.reached - r.todayStart) + '개', r.todayStart + ' → ' + r.reached + '단계'],
    ['모은 별', String(r.stars), '/ 300'],
    ['생각해보기', String(r.think), '/ 10 맞힘'],
    ['오늘 플레이', timeText(r.todayMs), ''],
    ['누적 플레이', timeText(r.totalMs), ''],
    ['별 3개 단계', r.three + '개', '']
  ];
  boxes.forEach(function (b, i) {
    var x = 70 + (i % 3) * 385, y = 250 + Math.floor(i / 3) * 120;
    c.fillStyle = '#f4f1ea'; roundRect(c, x, y, 365, 104, 14); c.fill();
    c.fillStyle = '#6b6b6b'; c.font = '20px ' + F; c.fillText(b[0], x + 22, y + 36);
    c.fillStyle = '#222'; c.font = 'bold 36px ' + F; c.fillText(b[1], x + 22, y + 82);
    var bw = c.measureText(b[1]).width;
    c.fillStyle = '#6b6b6b'; c.font = '20px ' + F; c.fillText(b[2], x + 32 + bw, y + 82);
  });

  // 100칸 진행표 (20 × 5)
  var colors = ['#ece8df', '#FAEEDA', '#FAC775', '#F2B705'];
  for (var n = 1; n <= 100; n++) {
    var col = (n - 1) % 20, row = Math.floor((n - 1) / 20);
    var x2 = 70 + col * 57, y2 = 510 + row * 46;
    c.fillStyle = colors[state.stars[n] || 0]; roundRect(c, x2, y2, 51, 40, 6); c.fill();
    c.fillStyle = state.stars[n] ? '#5a3d00' : '#a8a293'; c.font = '16px ' + F; c.textAlign = 'center';
    c.fillText(String(n), x2 + 25.5, y2 + 26);
  }
  c.textAlign = 'left';
  var lg = [['별 3개', 3], ['별 2개', 2], ['별 1개', 1], ['아직', 0]];
  lg.forEach(function (l, i) {
    var x3 = 70 + i * 140;
    c.fillStyle = colors[l[1]]; roundRect(c, x3, 744, 18, 18, 4); c.fill();
    c.fillStyle = '#6b6b6b'; c.font = '18px ' + F; c.fillText(l[0], x3 + 26, 760);
  });

  // 이어하기 코드 (맨 아래 오른쪽, 작게)
  if (r.code) {
    c.textAlign = 'right';
    c.fillStyle = '#222'; c.font = 'bold 22px Consolas, "Courier New", monospace';
    c.fillText(r.code, 1210, 760);
    var cw = c.measureText(r.code).width;
    c.fillStyle = '#6b6b6b'; c.font = '18px ' + F;
    c.fillText('이어하기 코드', 1200 - cw, 760);
    c.textAlign = 'left';
  }
}

/* =========================================================
   이어하기 코드 (기획서 5.8-5)
   - 담는 것: 도달 단계(7비트), 생각해보기 10문제(각 2비트), 힌트(7비트, 최대 127) + 확인용 10비트
   - 학번과 묶여 있어서 다른 학번으로는 안 됨. 헷갈리는 글자(0 O 1 I L)는 쓰지 않음
   - 9글자: XXX-XXX-XXX
   ========================================================= */
var CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // 31글자
var P34 = 17179869184;                               // 2^34

function strHash(s, mod) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h % mod;
}

function makeResumeCode(id) {
  var reachedNow = reached();
  var thinkBits = 0;
  for (var n = 100; n >= 10; n -= 10) {
    var r = state.think[n];
    thinkBits = thinkBits * 4 + (r === 'correct' ? 1 : (r === 'wrong' ? 2 : 0));
  }
  var hints = Math.max(0, Math.min(127, state.hints));
  var payload = (reachedNow * 1048576 + thinkBits) * 128 + hints;          // 7 + 20 + 7 = 34비트
  var mixed = (payload + strHash('id' + id, P34)) % P34;                     // 학번마다 다르게 섞기
  var check = strHash(id + '|' + payload + '|hapgyeol', 1024);
  var v = mixed * 1024 + check;
  var s = '';
  for (var i = 0; i < 9; i++) { s = CODE_CHARS[v % 31] + s; v = Math.floor(v / 31); }
  return s.slice(0, 3) + '-' + s.slice(3, 6) + '-' + s.slice(6);
}

/* 성공하면 { reached, think, hints }, 실패하면 오류 문장 */
function readResumeCode(id, code) {
  var s = code.toUpperCase().replace(/[\s-]/g, '');
  if (s.length !== 9) return '코드는 9글자예요. (예: K7P-Q2X-9RT)';
  var v = 0;
  for (var i = 0; i < 9; i++) {
    var k = CODE_CHARS.indexOf(s[i]);
    if (k < 0) return '코드에 없는 글자(' + s[i] + ')가 있어요. 0, O, 1, I, L은 코드에 쓰지 않아요.';
    v = v * 31 + k;
  }
  var check = v % 1024;
  var mixed = Math.floor(v / 1024);
  if (mixed >= P34) return '코드가 맞지 않아요. 학번과 코드를 다시 확인해 주세요.';
  var payload = (mixed - strHash('id' + id, P34) + P34) % P34;
  if (strHash(id + '|' + payload + '|hapgyeol', 1024) !== check) return '코드가 맞지 않아요. 학번과 코드를 다시 확인해 주세요.';
  var hints = payload % 128;
  var rest = Math.floor(payload / 128);
  var thinkBits = rest % 1048576;
  var reachedV = Math.floor(rest / 1048576);
  if (reachedV > CONFIG.STAGE_COUNT) return '코드가 맞지 않아요. 학번과 코드를 다시 확인해 주세요.';
  var think = {};
  for (var n = 10; n <= 100; n += 10) {
    var b = thinkBits % 4;
    thinkBits = Math.floor(thinkBits / 4);
    if (b === 1) think[n] = 'correct';
  }
  return { reached: reachedV, think: think, hints: hints };
}

/* 선생님 단축키 Ctrl + Alt + K */
function openResume() {
  var needName = !state.student;
  openOverlay(
    '<h2>이어하기 코드 입력</h2>' +
    '<p class="ov-text">패들렛에 올린 마지막 성적표의 코드를 적어 주세요.</p>' +
    '<div class="form-row"><label for="cId">학번</label><input id="cId" inputmode="numeric" maxlength="5" value="' + (state.student ? state.student.id : '') + '"></div>' +
    (needName ? '<div class="form-row"><label for="cName">이름</label><input id="cName" maxlength="10"></div>' : '') +
    '<div class="form-row"><label for="cCode">코드</label><input id="cCode" maxlength="11" placeholder="K7P-Q2X-9RT" class="code-input"></div>' +
    '<p class="msg" id="cMsg"></p>' +
    '<div class="ov-buttons"><button id="cClose">닫기</button><div class="right"><button id="cGo" class="btn-main">확인</button></div></div>'
  );
  var ready = null;
  $('cClose').onclick = function () {
    closeOverlay();
    if (!state.student) openStudentForm(function () { if (!state.tutorialSeen) openRules(0); });
  };
  var reset = function () { ready = null; $('cGo').textContent = '확인'; $('cMsg').textContent = ''; };
  $('cId').oninput = reset;
  $('cCode').oninput = reset;
  $('cGo').onclick = function () {
    var id = $('cId').value.trim();
    if (!/^\d{5}$/.test(id)) { $('cMsg').className = 'msg bad'; $('cMsg').textContent = '학번은 숫자 5자리로 적어 주세요.'; return; }
    if (needName && !$('cName').value.trim()) { $('cMsg').className = 'msg bad'; $('cMsg').textContent = '이름을 적어 주세요.'; return; }
    if (!ready) {
      var r = readResumeCode(id, $('cCode').value);
      if (typeof r === 'string') { $('cMsg').className = 'msg bad'; $('cMsg').textContent = r; return; }
      var tc = 0;
      for (var k in r.think) if (r.think[k] === 'correct') tc++;
      ready = r;
      $('cMsg').className = 'msg good';
      $('cMsg').textContent = r.reached + '단계까지, 생각해보기 ' + tc + '문제, 힌트 ' + r.hints + '개로 되살려요.';
      $('cGo').textContent = '되살리기';
      return;
    }
    applyResume(id, needName ? $('cName').value.trim() : state.student.name, ready);
  };
}

function applyResume(id, name, r) {
  state.student = { id: id, name: name };
  state.unlocked = r.reached + 1;
  state.stars = {};
  for (var n = 1; n <= r.reached; n++) state.stars[n] = 1;   // 깬 단계는 별 1개로
  state.think = r.think;
  state.thinkTry = {};
  state.hints = r.hints;
  state.lives = CONFIG.LIFE_MAX;
  state.lifeStart = null;
  state.activeStage = null;
  state.tutorialSeen = true;
  state.daily = { day: todayKey(), start: r.reached };
  state.resumeLog = (state.resumeLog || []).concat([Date.now()]);
  saveState();
  updateLives();
  updateHints();
  showSelect();
  openOverlay('<h2>되살렸어요</h2><p class="ov-text">' + r.reached + '단계까지 이어서 할 수 있어요. 깬 단계의 별은 1개로 되살아났으니, 다시 해서 별을 더 받을 수 있어요.</p>' +
    '<div class="ov-buttons"><div class="right"><button id="cOk" class="btn-main">확인</button></div></div>');
  $('cOk').onclick = closeOverlay;
}

function openReport() {
  var r = reportData();
  openOverlay(
    '<canvas id="rpCanvas" width="1280" height="800" class="report-canvas"></canvas>' +
    '<div class="ov-buttons"><button id="rpClose">닫기</button><div class="right"><button id="rpSave" class="btn-main">📷 이미지로 저장</button></div></div>'
  );
  $('overlayBox').classList.add('wide');
  drawReport($('rpCanvas'), r);
  $('rpClose').onclick = function () { $('overlayBox').classList.remove('wide'); closeOverlay(); };
  $('rpSave').onclick = function () {
    var a = document.createElement('a');
    a.download = r.id + '_' + r.name + '_' + r.file + '.png';
    a.href = $('rpCanvas').toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
}

/* =========================================================
   시작
   ========================================================= */
function init() {
  loadState();
  // 지난번에 단계 도중 창을 닫았다면 이미 생명을 쓴 상태 → 실패로 정리
  if (state.activeStage !== null) { state.activeStage = null; saveState(); }
  updateLives();
  updateHints();
  drawSoundBtn();

  $('btnPagePrev').onclick = function () { page--; drawSelect(); };
  $('btnPageNext').onclick = function () { page++; drawSelect(); };
  $('btnGyeol').onclick = onGyeol;
  $('btnHint').onclick = onHint;
  $('btnQuit').onclick = quitGame;
  $('btnRules').onclick = function () { openRules(0); };  // 게임 중에도 볼 수 있음 (시간은 계속 흐름)
  $('btnSound').onclick = function () {
    state.sound = !state.sound;
    saveState();
    drawSoundBtn();
  };

  setInterval(updateHints, 1000);   // 힌트 충전 시계
  setInterval(updateLives, 1000);   // 생명 충전 시계
  setInterval(function () {         // 생각해보기 '다시 풀기 m:ss 뒤' 시계
    if (!$('screenSelect').classList.contains('hidden')) drawThinkList();
  }, 1000);
  setInterval(trackPlay, 1000);     // 플레이 시간 기록

  // 화면을 떠날 때 남은 기록을 바로 저장
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') writePlog();
    playLastTick = Date.now();
  });
  window.addEventListener('pagehide', writePlog);

  // 선생님용 플레이 기록: 단계 고르기 화면에서 Ctrl + Alt + L
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey && e.altKey && (e.code === 'KeyL' || e.key === 'l' || e.key === 'L'))) return;
    if ($('screenSelect').classList.contains('hidden')) return;
    if (!$('overlay').classList.contains('hidden')) return;
    e.preventDefault();
    openPlayLog();
  });

  // 선생님 이어하기 코드 입력: 게임 중이 아닐 때 Ctrl + Alt + K (처음 학번 입력 창에서도)
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey && e.altKey && (e.code === 'KeyK' || e.key === 'k' || e.key === 'K'))) return;
    if (game && !game.over) return;
    if (refillGame) return;
    e.preventDefault();
    openResume();
  });

  // 선생님 생명 채우기: 단계 고르기 화면 또는 '생명이 없어요' 창에서 Ctrl + Alt + H
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey && e.altKey && (e.code === 'KeyH' || e.key === 'h' || e.key === 'H'))) return;
    if ($('screenSelect').classList.contains('hidden') && !$('noLifeTime')) return;
    if (!$('overlay').classList.contains('hidden') && !$('noLifeTime')) return;
    if (refillGame) return;
    e.preventDefault();
    openRefill();
  });

  ensureDaily();
  $('btnReport').onclick = openReport;
  $('btnReset').onclick = openReset;

  showSelect();
  var rulesIfNew = function () { if (!state.tutorialSeen) openRules(0); };
  if (!state.student) openStudentForm(rulesIfNew);   // 맨 처음: 학번·이름 → 규칙 설명
  else rulesIfNew();
}

init();
