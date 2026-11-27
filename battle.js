/* =========================================================
   합! 결! 대결 모드 (기획서 4.2)
   - Firebase 실시간 데이터베이스로 학생 크롬북끼리 잇는다
   - 인터넷과 링크(GitHub Pages)에서 동작. 이 파일이 동작하지 않아도 연습 모드는 그대로
   - script.js의 attrs, makeBoard, shapeSvg, sfx, openOverlay 등을 함께 쓴다
   ========================================================= */

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyDa1iFfVT3MvbucSaef3IpagLJM_3RtCxY",
  authDomain: "hapgyeol.firebaseapp.com",
  databaseURL: "https://hapgyeol-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hapgyeol",
  storageBucket: "hapgyeol.firebasestorage.app",
  messagingSenderId: "84310479080",
  appId: "1:84310479080:web:44d2606020087cbe49b95d"
};

/* ----- 설정값 (기획서 Q17~Q20) ----- */
var BT = {
  TURN_SEC: 40,     // 한 차례 제한 시간 (Q19-1)
  TOUT_END: 6,      // 두 학생이 연달아 3번씩(모두 6번) 시간 초과하면 판 끝 (Q19-3)
  BOARDS: 2,        // 예선(스위스) 한 경기 판 수, 짝수여야 선이 공평 (Q19-5, 2026-11-25 2판 → 4판, 2026-11-27 4판 → 2판)
  BOARDS_FINAL: 4,  // 4강·결승 한 경기 판 수 (2026-11-27)
  ZERO_RATE: 0.2,   // 합 0개 판 비율 (Q18-5)
  COIN_SEC: 10,     // 동전 고르기 (Q19-2)
  TB_SEC: 60,       // 결정판 (Q19-11)
  BUZZ_SEC: 10,     // 결정판: 버저 뒤 고르는 시간 (Q19-9-1)
  REST_SEC: 5,      // 결정판: 틀리면 쉬는 시간 (Q19-10)
  DISC_SEC: 60,     // 연결이 끊긴 학생을 기다리는 시간 (Q18-7)
  SHOW_MS: 4000,    // 동전 결과, 판 끝, 결정판 공개를 보여 주는 시간
  FX_MS: 3000,      // 방금 고른 3장의 테두리를 보여 주는 시간
  ROUNDS: 4,        // 스위스 라운드 기본값 (Q19-12, 2026-11-25 4 → 3, 2026-11-27 3 → 4)
  ROUND_CHOICES: [2, 3, 4],   // 선생님 화면의 라운드 수 버튼
  KEEP_DAYS: 14     // 오래된 방 자동 삭제 (Q20-5)
};
var BT_SAVE = 'hapgyeol-battle-v1';   // 이 크롬북이 들어가 있는 방 번호

/* 선생님 화면 비밀번호 (2026-11-25). 비밀번호 자체는 적지 않고, 바꾼 값만 적어 둔다.
   비밀번호를 바꾸려면 btPinHash('새 비밀번호')의 값을 BT_PIN_HASH에 넣는다 */
var BT_PIN_HASH = 303083462;
function btPinHash(pin) { return strHash('hapgyeol-teacher:' + pin, 1000000007); }

var bt = {
  ok: false, db: null, offset: 0,
  // 학생
  code: null, me: null, info: null, players: {}, mid: null, m: null, my: -1,
  subs: [], msub: null, sel: [], selKey: '', lastEv: {}, turnSeen: {}, wrote: {}, tickSec: -1,
  // 선생님
  tcode: null, R: null, tsub: null, tview: 'list', watch: null, tLastDraw: 0, tLastEv: {},
  busy: {}
};

/* =========================================================
   공통 도우미
   ========================================================= */
function btNow() { return Date.now() + bt.offset; }
function btSec(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
function btEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function btRef(code, path) { return bt.db.ref('rooms/' + code + (path ? '/' + path : '')); }
function btKey(pos) { return pos.slice().sort(function (a, b) { return a - b; }).join('-'); }
function btShort(full) { var s = String(full || '').split(' '); return s.length > 1 ? s.slice(1).join(' ') : s[0]; }
function btLoadRoom() { try { var o = JSON.parse(localStorage.getItem(BT_SAVE) || 'null'); return o && o.room ? o.room : null; } catch (e) { return null; } }
function btSaveRoom(code) {
  try { if (code) localStorage.setItem(BT_SAVE, JSON.stringify({ room: code })); else localStorage.removeItem(BT_SAVE); } catch (e) { /* 무시 */ }
}
function btOn() { return !$('screenBattle').classList.contains('hidden'); }
function btOnT() { return !$('screenTeacher').classList.contains('hidden'); }

/* 화면 전환: 연습 모드의 showScreen에 대결 화면 2개를 더한다 */
var btShowScreenBase = showScreen;
showScreen = function (name) {
  btShowScreenBase(name);
  $('screenBattle').classList.toggle('hidden', name !== 'battle');
  $('screenTeacher').classList.toggle('hidden', name !== 'teacher');
  btBanner();
};

/* Firebase는 빈 배열을 저장하지 않는다 → 읽을 때마다 채워 넣기 */
function btNorm(m) {
  if (!m) return m;
  m.sc = m.sc || [0, 0];
  m.pen = m.pen || [0, 0];
  m.bs = m.bs || [];
  for (var i = 0; i < btNB(m); i++) if (!m.bs[i]) m.bs[i] = [0, 0];
  m.p = m.p || [];
  m.nm = m.nm || [];
  if (m.coin) m.coin.pick = m.coin.pick || ['', ''];
  if (m.b) {
    m.b.found = m.b.found || [];
    m.b.fby = m.b.fby || [];
    m.b.haps = m.b.haps || [];
    m.b.lock = m.b.lock || [false, false];
  }
  if (m.tb) {
    m.tb.haps = m.tb.haps || [];
    m.tb.hint = m.tb.hint || [];
    m.tb.rest = m.tb.rest || [0, 0];
    if (!m.tb.buzz) m.tb.buzz = { by: -1, until: 0 };
  }
  return m;
}

/* 경기 한 개를 서버 기준 순서로 바꾼다. fn이 true를 돌려줄 때만 저장 */
function btAct(code, mid, fn) {
  if (!bt.ok || !code || !mid) return;
  btRef(code, 'matches/' + mid).transaction(function (m) {
    if (!m) return m;
    btNorm(m);
    if (fn(m, btNow()) !== true) return;   // 바꿀 것 없음 → 취소
    return m;
  });
}

/* 화면에 보여 줄 '방금 일어난 일' */
function btEvent(m, o) {
  m.ev = (m.ev || 0) + 1;
  o.n = m.ev;
  o.at = btNow();
  for (var k in o) if (o.hasOwnProperty(k) && o[k] === undefined) delete o[k];
  m.last = o;
}

/* =========================================================
   경기 규칙 (모든 기기가 같은 규칙으로 서버 값을 바꾼다)
   ========================================================= */
function btZeros(n) { var a = []; for (var i = 0; i < n; i++) a.push([0, 0]); return a; }

/* 이 경기의 판 수 (예선 2판, 4강·결승 4판). nb가 없는 예전 경기는 4판 */
function btNB(m) { return m.nb || 4; }

function btNewMatch(kind, round, a, b, t, seat) {
  var nb = kind === 'swiss' ? BT.BOARDS : BT.BOARDS_FINAL;
  var m = {
    kind: kind, round: round,
    p: [a.pid, b.pid], nm: [a.id + ' ' + a.name, b.id + ' ' + b.name],
    ph: 'coin', coin: { pick: ['', ''], dl: t + BT.COIN_SEC * 1000 },
    sc: [0, 0], pen: [0, 0], bs: btZeros(nb), nb: nb, bn: 0, ev: 0, created: t
  };
  if (seat) m.seat = seat;
  return m;
}

function btBoard(m, t, turn) {
  var bd = Math.random() < BT.ZERO_RATE ? makeBoard(0, 0) : makeBoard(1, 12);
  m.b = { tiles: bd.tiles, haps: bd.haps, found: [], fby: [], turn: turn,
          tid: (m.b ? m.b.tid + 1 : 1), dl: t + BT.TURN_SEC * 1000, tout: 0, lock: [false, false] };
  m.bend = null;
  m.ph = 'play';
}

function btNextTurn(m, t) {
  m.b.turn = 1 - m.b.turn;
  m.b.tid++;
  m.b.dl = t + BT.TURN_SEC * 1000;
}

function btEndBoard(m, t, why, by) {
  m.ph = 'bend';
  m.nextAt = t + BT.SHOW_MS;
  m.bend = { why: why, by: by === undefined ? -1 : by };
}

function btEnd(m, win, why) {
  m.ph = 'done';
  m.res = { win: win, why: why };
  m.disc = null;
}

/* 마지막 판이 끝나면: 점수 → 감점 → 결정판 (Q19-5) */
function btFinish(m, t) {
  if (m.sc[0] !== m.sc[1]) { var w = m.sc[0] > m.sc[1] ? 0 : 1; btEnd(m, w, 'score'); btEvent(m, { t: 'end', by: w }); return; }
  if (m.pen[0] !== m.pen[1]) { var w2 = m.pen[0] < m.pen[1] ? 0 : 1; btEnd(m, w2, 'pen'); btEvent(m, { t: 'end', by: w2 }); return; }
  btTbBoard(m, t, 1);
  btEvent(m, { t: 'tbStart' });
}

/* 결정판: 합이 1개뿐이고, 그 합은 '두 속성이 같은' 가장 쉬운 유형 (Q19-13) */
function btTbBoard(m, t, n) {
  var bd, h;
  do {
    bd = makeBoard(1, 1);
    h = bd.haps[0].split('-').map(Number);
    var x = attrs(bd.tiles[h[0]]), y = attrs(bd.tiles[h[1]]), same = 0;
    for (var i = 0; i < 3; i++) if (x[i] === y[i]) same++;
  } while (same !== 2);
  var order = shuffle(h), hint = [];
  if (n >= 2) hint.push(order[0]);   // 2번째: 1장 표시
  if (n >= 3) hint.push(order[1]);   // 3번째부터: 2장 표시
  m.tb = { n: n, tiles: bd.tiles, haps: bd.haps, hint: hint, dl: t + BT.TB_SEC * 1000, buzz: { by: -1, until: 0 }, rest: [0, 0] };
  m.ph = 'tb';
}

function btCoinFlip(m, t) {
  var res = Math.random() < 0.5 ? '앞' : '뒤';
  m.coin.res = res;
  m.first = m.coin.pick[0] === res ? 0 : 1;
  m.ph = 'coinShow';
  m.nextAt = t + BT.SHOW_MS;
  btEvent(m, { t: 'coin' });
}

/* 연결이 끊겼다가 돌아오면 그동안의 시간만큼 마감 시각을 뒤로 민다 */
function btShift(m, d) {
  if (m.coin && m.coin.dl) m.coin.dl += d;
  if (m.nextAt) m.nextAt += d;
  if (m.b) m.b.dl += d;
  if (m.tb) {
    m.tb.dl += d;
    if (m.tb.buzz.by >= 0) m.tb.buzz.until += d;
    for (var i = 0; i < 2; i++) if (m.tb.rest[i]) m.tb.rest[i] += d;
  }
}

/* ----- 학생이 하는 일 ----- */
function btActHap(pos) {
  var me = bt.my;
  btAct(bt.code, bt.mid, function (m, t) {
    if (m.ph !== 'play' || m.disc) return;
    var b = m.b;
    if (b.turn !== me || t > b.dl + 500) return;
    var key = btKey(pos), bi = m.bn - 1;
    var ok = b.haps.indexOf(key) >= 0 && b.found.indexOf(key) < 0;   // 이미 찾은 합은 오답
    if (ok) { b.found.push(key); b.fby.push(me); m.sc[me]++; m.bs[bi][me]++; b.lock = [false, false]; }
    else { m.sc[me]--; m.bs[bi][me]--; m.pen[me]++; }
    b.tout = 0;
    btEvent(m, { t: ok ? 'hap' : 'wrong', by: me, h: pos.slice() });
    btNextTurn(m, t);
    return true;
  });
}

function btActGyeol() {
  var me = bt.my;
  btAct(bt.code, bt.mid, function (m, t) {
    if (m.ph !== 'play' || m.disc) return;
    var b = m.b, bi = m.bn - 1;
    if (b.lock[me]) return;
    var left = b.haps.filter(function (h) { return b.found.indexOf(h) < 0; });
    if (left.length === 0) {
      m.sc[me] += 3; m.bs[bi][me] += 3;
      btEvent(m, { t: 'gyeol', by: me });
      btEndBoard(m, t, 'gyeol', me);
    } else {
      m.sc[me]--; m.bs[bi][me]--; m.pen[me]++;
      b.lock[me] = true;   // 새 합이 나올 때까지 결 잠김 (Q19-6)
      btEvent(m, { t: 'gyeolX', by: me });
    }
    return true;
  });
}

function btActCoin(face) {
  var me = bt.my;
  btAct(bt.code, bt.mid, function (m, t) {
    if (m.ph !== 'coin' || m.coin.pick[0] || m.coin.pick[1]) return;
    m.coin.pick[me] = face;
    m.coin.pick[1 - me] = face === '앞' ? '뒤' : '앞';
    btCoinFlip(m, t);
    return true;
  });
}

function btActBuzz() {
  var me = bt.my;
  btAct(bt.code, bt.mid, function (m, t) {
    if (m.ph !== 'tb' || m.disc) return;
    var tb = m.tb;
    if (tb.buzz.by >= 0 || t < tb.rest[me] || t >= tb.dl) return;
    tb.buzz = { by: me, until: t + BT.BUZZ_SEC * 1000 };
    btEvent(m, { t: 'buzz', by: me });
    return true;
  });
}

function btActTbPick(pos) {
  var me = bt.my;
  btAct(bt.code, bt.mid, function (m, t) {
    if (m.ph !== 'tb' || m.disc) return;
    var tb = m.tb;
    if (tb.buzz.by !== me || t > tb.buzz.until + 500) return;
    if (tb.haps.indexOf(btKey(pos)) >= 0) {
      btEnd(m, me, 'tb');
      btEvent(m, { t: 'tbOk', by: me, h: pos.slice() });
    } else {
      tb.rest[me] = t + BT.REST_SEC * 1000;
      tb.buzz = { by: -1, until: 0 };
      btEvent(m, { t: 'tbWrong', by: me, h: pos.slice() });
    }
    return true;
  });
}

/* ----- 시간이 지나면 일어나는 일 (학생 기기와 선생님 기기가 모두 확인. 서버가 한 번만 받아들임) ----- */
function btCheck(code, mid, m, online) {
  if (!m || m.ph === 'done' || m.kind === 'bye') return;
  var t = btNow(), bk = code + '/' + mid;
  if (bt.busy[bk] && t - bt.busy[bk] < 1200) return;
  var fire = function (fn) { bt.busy[bk] = t; btAct(code, mid, fn); };

  // 연결 끊김 (Q18-7)
  var off = !online(0) ? 0 : (!online(1) ? 1 : -1);
  if (!m.disc && off >= 0) {
    fire(function (x, t2) { if (x.ph === 'done' || x.disc) return; x.disc = { who: off, since: t2 }; return true; });
    return;
  }
  if (m.disc) {
    if (online(m.disc.who)) {
      fire(function (x, t2) { if (!x.disc) return; btShift(x, t2 - x.disc.since); x.disc = null; return true; });
    } else if (t - m.disc.since >= BT.DISC_SEC * 1000) {
      fire(function (x, t2) {
        if (!x.disc || x.ph === 'done' || t2 - x.disc.since < BT.DISC_SEC * 1000) return;
        var w = 1 - x.disc.who;
        btEnd(x, w, 'forfeit');
        btEvent(x, { t: 'end', by: w });
        return true;
      });
    }
    return;
  }

  if (m.ph === 'coin' && t >= m.coin.dl) {
    fire(function (x, t2) {   // 아무도 안 고르면 자동으로 나눔
      if (x.ph !== 'coin' || t2 < x.coin.dl) return;
      var f = Math.random() < 0.5 ? '앞' : '뒤';
      x.coin.pick = [f, f === '앞' ? '뒤' : '앞'];
      btCoinFlip(x, t2);
      return true;
    });
  } else if (m.ph === 'coinShow' && t >= m.nextAt) {
    fire(function (x, t2) {
      if (x.ph !== 'coinShow' || t2 < x.nextAt) return;
      x.bn = 1;
      btBoard(x, t2, x.first);
      btEvent(x, { t: 'start' });
      return true;
    });
  } else if (m.ph === 'play' && t >= m.b.dl) {
    var tid = m.b.tid;
    fire(function (x, t2) {
      if (x.ph !== 'play' || x.disc || x.b.tid !== tid || t2 < x.b.dl) return;
      var who = x.b.turn;
      x.b.tout++;
      btEvent(x, { t: 'tout', by: who });
      if (x.b.tout >= BT.TOUT_END) btEndBoard(x, t2, 'tout');
      else btNextTurn(x, t2);
      return true;
    });
  } else if (m.ph === 'bend' && t >= m.nextAt) {
    fire(function (x, t2) {
      if (x.ph !== 'bend' || t2 < x.nextAt) return;
      if (x.bn < btNB(x)) {
        x.bn++;
        btBoard(x, t2, (x.first + x.bn - 1) % 2);   // 판마다 선을 번갈아 (Q19-4)
        btEvent(x, { t: 'start' });
      } else {
        btFinish(x, t2);
      }
      return true;
    });
  } else if (m.ph === 'tb') {
    if (m.tb.buzz.by >= 0 && t > m.tb.buzz.until) {
      fire(function (x, t2) {   // 버저 뒤 10초 안에 못 고름 → 틀린 것과 같게 (Q19-15)
        if (x.ph !== 'tb' || x.disc || x.tb.buzz.by < 0 || t2 <= x.tb.buzz.until) return;
        var w = x.tb.buzz.by;
        x.tb.rest[w] = t2 + BT.REST_SEC * 1000;
        x.tb.buzz = { by: -1, until: 0 };
        btEvent(x, { t: 'tbTout', by: w });
        return true;
      });
    } else if (m.tb.buzz.by < 0 && t >= m.tb.dl) {
      fire(function (x, t2) {   // 60초 동안 아무도 못 찾음 → 공개
        if (x.ph !== 'tb' || x.disc || x.tb.buzz.by >= 0 || t2 < x.tb.dl) return;
        x.ph = 'tbShow';
        x.nextAt = t2 + BT.SHOW_MS;
        btEvent(x, { t: 'tbReveal' });
        return true;
      });
    }
  } else if (m.ph === 'tbShow' && t >= m.nextAt) {
    fire(function (x, t2) {   // 더 쉬운 결정판으로 다시
      if (x.ph !== 'tbShow' || t2 < x.nextAt) return;
      btTbBoard(x, t2, x.tb.n + 1);
      btEvent(x, { t: 'tbStart' });
      return true;
    });
  }
}

/* =========================================================
   경기 화면 그리기 (학생: v = 내 번호 0/1, 관전: v = -1)
   ========================================================= */
function btKindLabel(m) {
  if (m.kind === 'semi1') return '🏆 4강 1경기';
  if (m.kind === 'semi2') return '🏆 4강 2경기';
  if (m.kind === 'final') return '🏆 결승';
  return m.round + '라운드';
}
function btWho(m, i, v) { return i === v ? '나' : btEsc(btShort(m.nm[i])); }
function btSide(i, v) { var a = v < 0 ? 0 : v; return i === a ? 'me' : 'op'; }

function btMsg(m, v) {
  var L = m.last;
  if (m.ph === 'bend') {
    var tx = m.bn + '판 끝! ';
    if (m.bend && m.bend.why === 'gyeol') tx += btWho(m, m.bend.by, v) + ': 결! 성공 (+3)';
    else tx += '연달아 시간 초과 ' + BT.TOUT_END + '번 · 남은 합을 공개해요';
    return [tx, 'info'];
  }
  if (!L) return ['', ''];
  var w = (typeof L.by === 'number' && L.by >= 0) ? btWho(m, L.by, v) : '';
  switch (L.t) {
    case 'hap': return [w + ': 합! (+1)', 'good'];
    case 'wrong': return [w + ': 합이 아니에요 (−1)', 'bad'];
    case 'gyeol': return [w + ': 결! 성공 (+3)', 'good'];
    case 'gyeolX': return [w + ': 결 실패. 아직 합이 남아 있어요 (−1)', 'bad'];
    case 'tout': return [w + ': 시간 초과 (0점)', 'info'];
    case 'start': return [m.bn + '판 시작!', 'info'];
    case 'buzz': return [w + ': 합! → 고르는 중…', 'info'];
    case 'tbWrong': return [w + ': 틀렸어요. ' + BT.REST_SEC + '초 쉬기', 'bad'];
    case 'tbTout': return [w + ': ' + BT.BUZZ_SEC + '초 안에 못 골랐어요. ' + BT.REST_SEC + '초 쉬기', 'bad'];
    case 'tbReveal': return ['아무도 못 찾았어요. 더 쉬운 판으로 다시!', 'info'];
    case 'tbStart': return ['점수와 감점이 같아요. 결정판!', 'info'];
    default: return ['', ''];
  }
}

function btCards(m, v, turnIdx, big) {
  var order = v === 1 ? [1, 0] : [0, 1];
  var card = function (i) {
    var cls = 'bt-p ' + btSide(i, v) + (i === turnIdx ? ' turn' : '');
    var label = v < 0 ? (m.seat ? btEsc(m.seat[i]) : '') : (i === v ? '나' : '상대');
    return '<div class="' + cls + '"><div class="who">' + label + '</div><div class="nm">' + btEsc(m.nm[i]) + '</div>' +
      '<span class="sc">' + m.sc[i] + '</span><span class="pen">감점 ' + m.pen[i] + '</span></div>';
  };
  return '<div class="bt-players' + (big ? ' w-big' : '') + '">' + card(order[0]) + '<div class="bt-vs">VS</div>' + card(order[1]) + '</div>';
}

function btCanPick(m, v) {
  if (v < 0 || m.disc) return false;
  if (m.ph === 'play') return m.b.turn === v;
  if (m.ph === 'tb') return m.tb.buzz.by === v;
  return false;
}

function btGameHtml(m, v, big) {
  var t = btNow(), isTb = m.ph === 'tb' || m.ph === 'tbShow';
  var B = isTb ? m.tb : m.b;
  var turnIdx = m.ph === 'play' ? m.b.turn : (m.ph === 'tb' && m.tb.buzz.by >= 0 ? m.tb.buzz.by : -1);

  // 가운데 줄: 판 · 차례 · 시간
  var label = btKindLabel(m) + ' · ' + (isTb ? '결정판 ' + m.tb.n + '번째 · 합이 딱 1개!' : m.bn + '판 / ' + btNB(m) + '판');
  var turnTx = '', turnCls = '';
  if (m.ph === 'play') {
    turnCls = btSide(m.b.turn, v);
    turnTx = v < 0 ? btWho(m, m.b.turn, v) + ' 차례' : (m.b.turn === v ? '내 차례' : '상대 차례');
  } else if (m.ph === 'bend') turnTx = '판 끝';
  else if (m.ph === 'tb') {
    if (m.tb.buzz.by >= 0) { turnCls = btSide(m.tb.buzz.by, v); turnTx = btWho(m, m.tb.buzz.by, v) + ' 고르는 중'; }
    else turnTx = '찾으면 합!';
  } else if (m.ph === 'tbShow') turnTx = '정답 공개';

  // 판
  var canPick = btCanPick(m, v), L = m.last, fxOn = L && L.h && t - L.at < BT.FX_MS;
  var tiles = '';
  for (var i = 0; i < 9; i++) {
    var id = B.tiles[i], at = attrs(id), cls = 'tile';
    if (!canPick) cls += ' wait';
    if (canPick && bt.sel.indexOf(i) >= 0) cls += ' sel';
    if (isTb && m.tb.hint.indexOf(i) >= 0) cls += ' hint';
    if (fxOn && L.h.indexOf(i) >= 0) {
      if (L.t === 'hap' || L.t === 'tbOk') cls += btSide(L.by, v) === 'me' ? ' ok' : ' opok';
      else if (L.t === 'wrong' || L.t === 'tbWrong') cls += ' bad';
    }
    if (m.ph === 'tbShow' && m.tb.haps[0].split('-').map(Number).indexOf(i) >= 0) cls += ' ok';
    tiles += '<div class="' + cls + '" data-pos="' + i + '" style="background:' + BGS[at[2]] + '">' +
      '<span class="num" style="color:' + (at[2] === 0 ? '#222' : '#fff') + '">' + (i + 1) + '</span>' + shapeSvg(id) + '</div>';
  }

  // 오른쪽
  var msg = btMsg(m, v);
  if (m.ph === 'play' && v >= 0 && m.b.turn === v && (!L || L.t === 'start')) {
    msg = [m.bn + '판 시작! 내 차례예요. 합 1개를 골라요 (' + BT.TURN_SEC + '초)', 'info'];
  }
  var right = '<div class="msg ' + msg[1] + '">' + msg[0] + '</div>';
  if (m.disc) right += '<div class="bt-disc">⏸ ' + btEsc(btShort(m.nm[m.disc.who])) + ' 연결이 끊겼어요. 기다리는 중… <span id="btDisc"></span></div>';

  if (!isTb) {
    var found = '';
    m.b.found.forEach(function (k, j) {
      var by = m.b.fby[j];
      found += '<div class="found-item"><span class="nums">' + hapLabel(k) + '</span>' + hapMinis(k, m.b.tiles) +
        '<span class="who-' + btSide(by, v) + '" style="margin-left:auto">' + btWho(m, by, v) + ' +1</span></div>';
    });
    if (m.ph === 'bend') {
      m.b.haps.forEach(function (k) {
        if (m.b.found.indexOf(k) >= 0) return;
        found += '<div class="found-item"><span class="nums">' + hapLabel(k) + '</span>' + hapMinis(k, m.b.tiles) +
          '<span class="who-miss" style="margin-left:auto">놓친 합</span></div>';
      });
      if (!m.b.haps.length) found += '<div class="found-item" style="color:var(--muted)">이 판에는 합이 없었어요</div>';
    }
    right += '<div class="found-box card"' + (big ? ' style="box-shadow:none;border:1px solid var(--line)"' : '') + '><h3>찾은 합</h3>' + found + '</div>';
    if (v >= 0) {
      right += '<div class="bt-tout">' + (m.ph === 'play' && m.b.turn === v
        ? '타일 3장째를 누르면 바로 판정해요. 3장째 전에는 다시 눌러 취소할 수 있어요.<br>'
        : '상대 차례에는 판을 보며 생각할 수 있어요. <b>결!</b>은 언제든 누를 수 있어요.<br>') +
        '합 +1 · 틀리면 −1 · 시간 초과 0 · 결 +3 · 결 실패 −1<br>' +
        '연달아 시간 초과: <b>' + (m.b.tout || 0) + ' / ' + BT.TOUT_END + '</b> (' + BT.TOUT_END + '번이면 판 끝)</div>';
      var lock = m.b.lock[v];
      right += '<button class="btn-gyeol" data-act="gyeol"' + (m.ph !== 'play' || m.disc || lock ? ' disabled' : '') + '>' + (lock ? '결! (새 합이 나오면 다시)' : '결!') + '</button>';
    }
  } else {
    if (m.ph === 'tb' && m.tb.buzz.by >= 0) {
      right += '<div class="bt-buzz">' + (m.tb.buzz.by === v ? '내가 합!을 눌렀어요 · 10초 안에 3장 고르기' : btWho(m, m.tb.buzz.by, v) + ' 고르는 중…') + '</div>';
    }
    right += '<div class="bt-tout">점수와 감점이 같아서 <b>결정판</b>이에요.<br>찾았으면 <b>합!</b>을 먼저 누르고 ' + BT.BUZZ_SEC + '초 안에 3장을 골라요. 그동안 상대는 못 골라요.<br>' +
      '틀리면 ' + BT.REST_SEC + '초 동안 못 눌러요. ' + BT.TB_SEC + '초 안에 아무도 못 찾으면 더 쉬운 판으로 다시!' +
      (m.tb.hint.length ? '<br><span class="bt-tag">노란 점선 = 합에 들어가는 타일</span>' : '') + '</div>';
    if (v >= 0) right += '<button id="btBuzz" class="btn-hap" data-act="buzz" disabled>합!</button>';
  }

  return '<div class="game">' +
    '<div class="game-left card">' + btCards(m, v, turnIdx, big) +
      '<div class="game-info"><span class="board-label">' + label + '</span><span class="bt-turn ' + turnCls + '">' + turnTx + '</span><span id="btTime" class="time-text"></span></div>' +
      '<div class="timebar"><div id="btBar" class="timebar-fill" style="width:0"></div></div>' +
      '<div class="board-wrap"><div class="board">' + tiles + '</div><div id="btBig" class="big-text"></div></div>' +
    '</div>' +
    '<div class="game-right">' + right + '</div></div>';
}

function btCoinHtml(m, v) {
  var head = '<span class="bt-tag">' + btKindLabel(m) + ' · 선·후 정하기</span>';
  var vs = v < 0 ? btEsc(m.nm[0]) + ' vs ' + btEsc(m.nm[1]) : '상대: ' + btEsc(m.nm[1 - v]);
  var h = '<div class="card bt-center">' + head + '<h2 style="margin:12px 0 4px">' + vs + '</h2>';
  if (m.disc) h += '<div class="bt-disc">⏸ ' + btEsc(btShort(m.nm[m.disc.who])) + ' 연결이 끊겼어요. 기다리는 중… <span id="btDisc"></span></div>';
  if (m.ph === 'coin') {
    h += '<div class="coin">?</div>' +
      '<p class="ov-text">앞·뒤 중 하나를 고르세요. <b>먼저 누른 사람</b>이 그 면을 가져가요.<br>동전에서 나온 면을 고른 사람이 <b>1판 선</b>이에요. 그다음 판부터는 번갈아.</p>';
    if (v >= 0) h += '<div class="coin-btns"><button data-act="coin:앞">앞</button><button data-act="coin:뒤">뒤</button></div>';
    h += '<p class="ov-text" style="font-size:14px"><span id="btTime"></span> 안에 아무도 안 고르면 자동으로 나눠요.</p>';
  } else {
    var c = m.coin, first = m.first;
    h += '<div class="coin spin">' + c.res + '</div>' +
      '<p class="ov-text">' + btWho(m, 0, v) + ': <b>' + c.pick[0] + '</b> / ' + btWho(m, 1, v) + ': <b>' + c.pick[1] + '</b></p>' +
      '<p style="font-size:22px;font-weight:bold" class="who-' + btSide(first, v) + '">' + c.res + '! → ' + btWho(m, first, v) + ' 1판 선</p>';
  }
  return h + '</div>';
}

function btWhyText(m, v) {
  var r = m.res, w = r.win;
  if (r.why === 'pen') return '점수가 같아서 감점이 적은 쪽이 이겼어요.';
  if (r.why === 'tb') return '점수와 감점이 같아서 결정판에서 먼저 찾은 쪽이 이겼어요.';
  if (r.why === 'forfeit') return v >= 0 ? (w === v ? '상대 연결이 끊겨서 기권승이에요.' : '연결이 끊겨서 기권패가 되었어요.') : btEsc(btShort(m.nm[1 - w])) + ' 연결이 끊겨 기권';
  if (r.why === 'teacher') return '선생님이 결과를 정했어요.';
  return '';
}

function btRecord() {
  var me = bt.players[bt.me] || {}, res = me.res || {}, w = 0, l = 0;
  for (var k in res) if (res.hasOwnProperty(k)) { if (res[k] === 'w') w++; else if (res[k] === 'l') l++; }
  return w + '승 ' + l + '패';
}

function btResultHtml(m, v) {
  var w = m.res.win, title;
  if (v < 0) title = '<span class="who-me">' + btEsc(m.nm[w]) + '</span> 승리!';
  else if (w === v) title = m.kind === 'final' ? '우승! 🏆' : '이겼어요! 🎉';
  else title = '아쉽게 졌어요';
  var a = v === 1 ? 1 : 0, b = 1 - a;
  var row = function (lab, x, y, bold) { return '<tr><td>' + lab + '</td><td>' + (bold ? '<b>' + x + '</b>' : x) + '</td><td>' + (bold ? '<b>' + y + '</b>' : y) + '</td></tr>'; };
  var tbl = '<table class="t-table"><tr><th></th><th>' + (v < 0 ? btEsc(btShort(m.nm[a])) : '나') + '</th><th>' + btEsc(btShort(m.nm[b])) + '</th></tr>';
  for (var i = 0; i < btNB(m); i++) tbl += row((i + 1) + '판', m.bs[i][a], m.bs[i][b]);
  tbl += row('<b>합계</b>', m.sc[a], m.sc[b], true) + row('<span style="color:var(--muted)">감점</span>', m.pen[a], m.pen[b]) + '</table>';
  var h = '<div class="card bt-center"><span class="bt-tag">' + btKindLabel(m) + '</span>' +
    '<h2 style="font-size:32px;margin:10px 0 4px;color:' + (v < 0 || w === v ? 'var(--blue)' : 'var(--muted)') + '">' + title + '</h2>' +
    '<p class="ov-text" style="margin:0 0 8px">' + btWhyText(m, v) + '</p>' + tbl;
  if (v >= 0) {
    if (m.kind === 'swiss') h += '<p class="ov-text" style="margin-top:14px">지금 전적: <b>' + btRecord() + '</b><br>다른 경기가 끝나면 선생님이 다음 라운드를 시작해요.</p>';
    else if (m.kind !== 'final') h += '<p class="ov-text" style="margin-top:14px">' + (w === v ? '결승에 올라가요! 다음 경기를 기다려요.' : '4강까지 올라온 것도 대단해요!') + '</p>';
    h += '<div class="ov-buttons"><div class="right"><button data-act="practice">기다리는 동안 연습 모드</button></div></div>';
  }
  return h + '</div>';
}

function btWaitHtml() {
  var info = bt.info || {}, n = 0;
  for (var k in bt.players) if (bt.players.hasOwnProperty(k) && bt.players[k].online) n++;
  var tx = !info.round ? '선생님이 시작하기를 기다리고 있어요…'
    : info.fin ? '결승이 진행 중이에요. 전자칠판을 봐 주세요!'
    : '다음 라운드를 기다리고 있어요…';
  return '<div class="card bt-center">' +
    '<span class="bt-tag">' + btEsc(info.name || '') + ' · ' + bt.code + '번 방</span>' +
    '<p style="font-size:22px;font-weight:bold;margin:16px 0 6px">' + tx + '</p>' +
    '<p class="ov-text">' + btEsc(state.student.id + ' ' + state.student.name) + ' · 지금 전적 <b>' + btRecord() + '</b><br>지금 들어와 있는 학생: <b>' + n + '명</b></p>' +
    '<p class="ov-text" style="font-size:14px">짝은 선생님이 시작을 누르면 자동으로 정해져요. 기다리는 동안 연습 모드를 해도 돼요. 시작되면 위쪽에 알림이 떠요.</p>' +
    '<div class="ov-buttons"><button data-act="leave">방 나가기</button><div class="right"><button class="btn-main" data-act="practice">연습 모드</button></div></div>' +
    '</div>';
}

function btByeHtml() {
  return '<div class="card bt-center"><span class="bt-tag">' + (bt.info ? bt.info.round : '') + '라운드</span>' +
    '<h2 style="margin:12px 0">이번 라운드는 부전승이에요! (1승)</h2>' +
    '<p class="ov-text">인원이 홀수라서 한 명이 쉬어요. 한 학생은 한 번만 쉬어요.<br>지금 전적: <b>' + btRecord() + '</b></p>' +
    '<div class="ov-buttons"><div class="right"><button class="btn-main" data-act="practice">연습 모드 하기</button></div></div></div>';
}

/* ----- 학생 화면 ----- */
function btStuRender() {
  var el = $('screenBattle');
  if (!bt.code || !state.student) { el.innerHTML = ''; return; }
  var m = bt.m, v = m ? m.p.indexOf(bt.me) : -1, html;
  bt.my = v;
  // 차례나 판이 바뀌면 고르던 타일은 지운다
  var key = m ? (bt.mid + ':' + m.ph + ':' + (m.b ? m.b.tid : '') + ':' + (m.tb ? m.tb.n + '/' + m.tb.buzz.until : '')) : '';
  if (key !== bt.selKey) { bt.sel = []; bt.selKey = key; }

  if (!m || v < 0) html = btWaitHtml();
  else if (m.kind === 'bye') html = btByeHtml();
  else if (m.ph === 'done') html = btResultHtml(m, v);
  else if (m.ph === 'coin' || m.ph === 'coinShow') html = btCoinHtml(m, v);
  else html = btGameHtml(m, v, false);
  el.innerHTML = html;
  btTimeUi();
}

/* 시간 글자와 막대, 결정판 버튼만 0.25초마다 바꾼다 (판 전체를 다시 그리면 클릭이 씹힐 수 있어서) */
function btTimeUi() {
  var m = bt.m, v = bt.my, t = btNow();
  if (!m || v < 0 || !btOn()) return;
  var el = $('btTime'), bar = $('btBar'), rem = 0, total = 1, txt = '';
  if (m.ph === 'coin') { rem = m.coin.dl - t; txt = btSec(rem) + '초'; }
  else if (m.ph === 'play') { rem = m.b.dl - t; total = BT.TURN_SEC * 1000; txt = btSec(rem) + '초'; }
  else if (m.ph === 'tb') {
    if (m.tb.buzz.by >= 0) { rem = m.tb.buzz.until - t; total = BT.BUZZ_SEC * 1000; txt = btSec(rem) + '초'; }
    else { rem = m.tb.dl - t; total = BT.TB_SEC * 1000; txt = mmss(Math.max(0, rem)); }
  }
  if (m.disc) { txt = '⏸'; var d = $('btDisc'); if (d) d.textContent = btSec(m.disc.since + BT.DISC_SEC * 1000 - t) + '초'; }
  if (el) { el.textContent = txt; el.classList.toggle('warn', m.ph === 'play' && rem <= 10000); }
  if (bar) {
    if (!m.disc) bar.style.width = Math.max(0, Math.min(100, rem / total * 100)) + '%';
    bar.style.background = m.ph === 'tb' ? 'var(--yellow)' : (m.ph === 'play' && m.b.turn !== v ? '#d84315' : '');
  }
  var bz = $('btBuzz');
  if (bz && m.ph === 'tb') {
    var restLeft = m.tb.rest[v] - t;
    bz.disabled = !!m.disc || m.tb.buzz.by >= 0 || restLeft > 0 || t >= m.tb.dl;
    bz.textContent = restLeft > 0 ? '합! (' + btSec(restLeft) + ')' : '합!';
  }
  // 내 차례 마지막 10초: 째깍
  if (m.ph === 'play' && m.b.turn === v && !m.disc && rem <= 10000 && rem > 0) {
    var s = btSec(rem);
    if (s !== bt.tickSec) { bt.tickSec = s; sfx.tick(); }
  }
}

function btPop(text, color) {
  var el = $('btBig');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

/* 새로 일어난 일 → 소리, 큰 글자 */
function btFx(store, mid, m, v) {
  var L = m.last;
  if (!L) return;
  var seen = store[mid];
  store[mid] = L.n;
  if (seen === undefined || seen === L.n) return;   // 처음 열었을 때는 조용히
  var mine = v >= 0 && L.by === v;
  if (m.ph === 'done') {
    if (v >= 0) { if (m.res.win === v) sfx.reward(); else sfx.over(); }
    else sfx.reward();
    if (L.t === 'tbOk') btPop('합!', '#43A047');
  } else if (L.t === 'hap') { sfx.hap(); btPop('합!', mine || v < 0 ? '#43A047' : '#d84315'); }
  else if (L.t === 'gyeol') { sfx.gyeol(); btPop('결!', '#1E88E5'); }
  else if (L.t === 'wrong' || L.t === 'gyeolX' || L.t === 'tbWrong' || L.t === 'tbTout') sfx.wrong();
  else if (L.t === 'buzz') sfx.hint();
  else if (L.t === 'coin' || L.t === 'start' || L.t === 'tbStart') sfx.star(0);
  else if (L.t === 'tout') tone(300, 0, 0.25, 'sine', 0.12);
  if (L.h) setTimeout(function () { if (store === bt.lastEv) btStuRender(); else btTRender(); }, BT.FX_MS + 50);
}

/* =========================================================
   학생: 방 들어가기, 나가기
   ========================================================= */
function btOpenJoin() {
  if (!bt.ok) {
    openOverlay('<h2>대결은 인터넷이 필요해요</h2><p class="ov-text">대결 모드는 선생님이 알려 준 <b>링크</b>로 열고, 인터넷에 연결되어 있어야 해요.</p>' +
      '<div class="ov-buttons"><div class="right"><button class="btn-main" id="btNoNet">확인</button></div></div>');
    $('btNoNet').onclick = closeOverlay;
    return;
  }
  if (!state.student) { openStudentForm(btOpenJoin); return; }
  if (bt.code) { btGoBattle(); return; }
  openOverlay(
    '<h2>⚔ 대결 들어가기</h2>' +
    '<p class="ov-text">선생님이 알려 준 <b>방 번호 4자리</b>를 넣으세요.</p>' +
    '<div class="form-row"><label>내 이름</label><b style="font-size:18px">' + btEsc(state.student.id + ' ' + state.student.name) + '</b></div>' +
    '<div class="form-row"><label for="btCodeIn">방 번호</label><input id="btCodeIn" class="code-input" inputmode="numeric" maxlength="4" style="font-size:28px;text-align:center"></div>' +
    '<p class="msg bad" id="btJoinMsg"></p>' +
    '<div class="ov-buttons"><button id="btJoinNo">닫기</button><div class="right"><button id="btJoinGo" class="btn-main">들어가기</button></div></div>'
  );
  $('btCodeIn').focus();
  $('btJoinNo').onclick = closeOverlay;
  var go = function () {
    var code = $('btCodeIn').value.trim();
    if (!/^\d{4}$/.test(code)) { $('btJoinMsg').textContent = '방 번호는 숫자 4자리예요.'; return; }
    $('btJoinMsg').textContent = '들어가는 중…';
    btJoin(code, false);
  };
  $('btJoinGo').onclick = go;
  $('btCodeIn').onkeydown = function (e) { if (e.key === 'Enter') go(); };
}

function btJoin(code, quiet) {
  btRef(code, 'info').once('value').then(function (s) {
    if (!s.val()) {
      if (quiet) btSaveRoom(null);
      else $('btJoinMsg').textContent = '그런 방이 없어요. 번호를 다시 확인해 주세요.';
      return;
    }
    bt.code = code;
    bt.me = state.student.id;
    btSaveRoom(code);
    btPresence();
    btSubscribe();
    if (!quiet) { closeOverlay(); showScreen('battle'); }
    btStuRender();
    btBanner();
  }).catch(function () {
    if (!quiet && $('btJoinMsg')) $('btJoinMsg').textContent = '연결에 실패했어요. 인터넷을 확인해 주세요.';
  });
}

function btPresence() {
  if (!bt.code || !bt.me || !state.student) return;
  var ref = btRef(bt.code, 'players/' + bt.me);
  ref.onDisconnect().update({ online: false });
  ref.update({ id: state.student.id, name: state.student.name, online: true, seen: firebase.database.ServerValue.TIMESTAMP });
}

function btListen(ref, cb) { ref.on('value', cb); bt.subs.push([ref, cb]); }

function btSubscribe() {
  btListen(btRef(bt.code, 'info'), function (s) {
    var v = s.val();
    if (!v) { btRoomClosed(); return; }
    bt.info = v;
    if (btOn()) btStuRender();
  });
  btListen(btRef(bt.code, 'players'), function (s) {
    bt.players = s.val() || {};
    var cur = (bt.players[bt.me] || {}).cur || '';
    if (cur !== (bt.mid || '')) btWatchMatch(cur);
    else if (btOn() && (!bt.m || bt.m.ph === 'done' || bt.m.kind === 'bye')) btStuRender();   // 기다리는 화면의 인원·전적
  });
}

function btWatchMatch(mid) {
  if (bt.msub) { bt.msub[0].off('value', bt.msub[1]); bt.msub = null; }
  bt.mid = mid || null;
  bt.m = null;
  if (!mid) { if (btOn()) btStuRender(); btBanner(); return; }
  var isNew = true;
  var ref = btRef(bt.code, 'matches/' + mid);
  var cb = function (s) {
    var m = btNorm(s.val());
    bt.m = m;
    if (!m) { if (btOn()) btStuRender(); return; }
    var v = m.p.indexOf(bt.me);
    bt.my = v;
    // 새 경기가 배정되면 알림 소리
    if (isNew) { isNew = false; if (m.ph !== 'done') sfx.hint(); }
    // 끝난 경기 전적 남기기 (스위스·부전승만, 한 번만)
    if (m.ph === 'done' && v >= 0 && (m.kind === 'swiss' || m.kind === 'bye') && !bt.wrote[mid]) {
      bt.wrote[mid] = true;
      btRef(bt.code, 'players/' + bt.me + '/res/' + mid).set(m.res.win === v ? 'w' : 'l');
    }
    // 내 차례가 되면 알림
    if (m.ph === 'play' && v >= 0 && m.b.turn === v && bt.turnSeen[mid] !== m.b.tid) { bt.turnSeen[mid] = m.b.tid; bt.tickSec = -1; }
    if (btOn()) { btStuRender(); btFx(bt.lastEv, mid, m, v); }
    else bt.lastEv[mid] = m.last ? m.last.n : bt.lastEv[mid];
    btBanner();
  };
  ref.on('value', cb);
  bt.msub = [ref, cb];
}

function btLeave(closed) {
  if (bt.code && bt.me) {
    var ref = btRef(bt.code, 'players/' + bt.me);
    ref.onDisconnect().cancel();
    if (!closed) ref.update({ online: false });
  }
  bt.subs.forEach(function (s) { s[0].off('value', s[1]); });
  bt.subs = [];
  if (bt.msub) { bt.msub[0].off('value', bt.msub[1]); bt.msub = null; }
  bt.code = null; bt.info = null; bt.players = {}; bt.mid = null; bt.m = null; bt.my = -1;
  btSaveRoom(null);
  btBanner();
}

function btRoomClosed() {
  var on = btOn();
  btLeave(true);
  if (on) {
    showSelect();
    openOverlay('<h2>대결 방이 닫혔어요</h2><p class="ov-text">선생님이 방을 닫았어요. 연습 모드를 계속할 수 있어요.</p>' +
      '<div class="ov-buttons"><div class="right"><button class="btn-main" id="btClosedOk">확인</button></div></div>');
    $('btClosedOk').onclick = closeOverlay;
  }
}

function btGoBattle() {
  if (typeof game !== 'undefined' && game && !game.over) {
    quitGame();                      // 연습 중이면 '나가면 생명 1개' 확인
    if (game && !game.over) return;
  }
  stopRefill();
  closeOverlay();
  showScreen('battle');
  btStuRender();
}

/* 위쪽 알림: 대결 방에 들어가 있는데 다른 화면에 있을 때 */
function btBanner() {
  var el = $('btBanner');
  if (!el) return;
  var show = !!bt.code && !btOn() && !btOnT();
  var html = '';
  if (show) {
    var m = bt.m, active = m && bt.my >= 0 && m.ph !== 'done' && m.kind !== 'bye';
    html = active
      ? '<span>⚔ 대결이 시작됐어요! 지금 바로 가세요.</span><button class="btn-main" data-act="battle">대결로 가기</button>'
      : '<span style="color:var(--muted);font-weight:normal">⚔ ' + bt.code + '번 대결 방에 들어가 있어요.</span><button data-act="battle">대결 화면</button>';
  }
  if (el.getAttribute('data-h') !== html) {
    el.setAttribute('data-h', html);
    el.innerHTML = html;
    el.classList.toggle('hidden', !show);
  }
}

function btStuClick(e) {
  var el = e.target.closest ? e.target.closest('[data-act],[data-pos]') : null;
  if (!el) return;
  var act = el.getAttribute('data-act');
  if (act) {
    if (act === 'gyeol') btActGyeol();
    else if (act === 'buzz') btActBuzz();
    else if (act.indexOf('coin:') === 0) btActCoin(act.slice(5));
    else if (act === 'practice') showSelect();
    else if (act === 'battle') btGoBattle();
    else if (act === 'leave') { if (confirm('대결 방에서 나갈까요? (다시 들어오려면 방 번호를 넣어야 해요)')) { btLeave(false); showSelect(); } }
    return;
  }
  // 타일 고르기
  if (el.classList.contains('wait')) return;
  var m = bt.m;
  if (!m || !btCanPick(m, bt.my)) return;
  var pos = +el.getAttribute('data-pos');
  var at = bt.sel.indexOf(pos);
  if (at >= 0) { bt.sel.splice(at, 1); el.classList.remove('sel'); return; }
  bt.sel.push(pos);
  el.classList.add('sel');
  if (bt.sel.length === 3) {
    var picks = bt.sel.slice();
    bt.sel = [];
    if (m.ph === 'play') btActHap(picks); else btActTbPick(picks);
  }
}

/* =========================================================
   선생님 화면 (Ctrl + Alt + B)
   ========================================================= */
function btOpenTeacher(pinOk) {
  if (!bt.ok) { alert('대결 모드는 인터넷과 링크(GitHub Pages)에서만 열려요.'); return; }
  if (typeof game !== 'undefined' && game && !game.over) return;
  if (pinOk !== true) { btAskPin(); return; }   // 열 때마다 비밀번호 묻기
  stopRefill();
  closeOverlay();
  btTOff();
  bt.tview = 'list';
  showScreen('teacher');
  btTList();
}

/* 선생님 비밀번호 묻기. 기억하지 않고 선생님 화면을 열 때마다 묻는다 */
function btAskPin() {
  openOverlay(
    '<h2>선생님 확인</h2>' +
    '<p class="ov-text">대결 방을 관리하는 선생님 화면이에요. 비밀번호를 넣어 주세요.</p>' +
    '<div class="form-row"><label for="btPin">비밀번호</label><input id="btPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>' +
    '<p class="msg bad" id="btPinMsg"></p>' +
    '<div class="ov-buttons"><button id="btPinNo">닫기</button><div class="right"><button id="btPinOk" class="btn-main">확인</button></div></div>'
  );
  $('btPin').focus();
  $('btPinNo').onclick = closeOverlay;
  var check = function () {
    if (btPinHash($('btPin').value.trim()) !== BT_PIN_HASH) {
      $('btPinMsg').textContent = '비밀번호가 달라요.';
      $('btPin').value = '';
      $('btPin').focus();
      return;
    }
    closeOverlay();
    btOpenTeacher(true);
  };
  $('btPinOk').onclick = check;
  $('btPin').onkeydown = function (e) { if (e.key === 'Enter') check(); };
}

function btTOff() {
  if (bt.tsub) { bt.tsub[0].off('value', bt.tsub[1]); bt.tsub = null; }
  bt.tcode = null; bt.R = null;
}

/* 방 목록 + 새 방 만들기. 14일이 지난 방, 정보가 없는 방은 지운다 */
function btTList() {
  var el = $('screenTeacher');
  el.innerHTML = '<div class="card"><p class="ov-text">불러오는 중…</p></div>';
  bt.db.ref('rooms').once('value').then(function (s) {
    var all = s.val() || {}, rows = [], t = btNow();
    Object.keys(all).forEach(function (code) {
      var R = all[code], info = R && R.info;
      if (!info || t - (info.created || 0) > BT.KEEP_DAYS * 86400000) { bt.db.ref('rooms/' + code).remove(); return; }
      rows.push({ code: code, R: R });
    });
    rows.sort(function (a, b) { return b.R.info.created - a.R.info.created; });
    var body = rows.map(function (r) {
      var d = new Date(r.R.info.created);
      return '<tr><td><b>' + btEsc(r.R.info.name) + '</b></td><td>' + r.code + '</td><td>' + btRoomStatus(r.R) + '</td>' +
        '<td>' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일</td><td><button class="btn-main" style="font-size:14px;padding:5px 12px" data-act="tOpen:' + r.code + '">열기</button></td></tr>';
    }).join('');
    el.innerHTML = '<div class="card">' +
      '<div class="t-head"><h2>선생님 · 대결</h2><button class="btn-small" data-act="tExit">연습 화면으로</button></div>' +
      '<h3 style="margin:16px 0 6px">새 방 만들기</h3>' +
      '<div class="form-row"><label for="tName">반 이름</label><input id="tName" maxlength="12" placeholder="3학년 2반"><button class="btn-main" style="font-size:16px;padding:8px 18px" data-act="tCreate">만들기</button></div>' +
      '<p class="msg bad" id="tMsg"></p>' +
      '<h3 style="margin:18px 0 6px">열려 있는 방</h3>' +
      (rows.length ? '<table class="t-table"><tr><th>반</th><th>방 번호</th><th>진행</th><th>만든 날</th><th></th></tr>' + body + '</table>'
                   : '<p class="ov-text">아직 열린 방이 없어요.</p>') +
      '<p class="lg-note">만든 지 ' + BT.KEEP_DAYS + '일이 지난 방은 자동으로 지워져요. 기록이 서버에 있어서 다른 컴퓨터에서 열어도 똑같이 이어져요.<br>결승은 다음 시간에 해도 돼요. 방을 닫지 않으면 그대로 남아요.</p>' +
      '</div>';
  }).catch(function () {
    el.innerHTML = '<div class="card"><p class="ov-text">서버에 연결하지 못했어요. 인터넷을 확인해 주세요.</p><button data-act="tExit">연습 화면으로</button></div>';
  });
}

function btRoundDone(R) {
  var info = R.info, M = R.matches || {}, r = info.round || 0, any = false;
  if (!r) return false;
  for (var k in M) {
    if (!M.hasOwnProperty(k)) continue;
    if (M[k].round === r && (M[k].kind === 'swiss' || M[k].kind === 'bye')) { any = true; if (M[k].ph !== 'done') return false; }
  }
  return any;
}

function btSwissDone(R) { return (R.info.round || 0) >= (R.info.rounds || BT.ROUNDS) && btRoundDone(R); }

function btRoomStatus(R) {
  var info = R.info, M = R.matches || {};
  if (info.fin) return M.f3 && M.f3.ph === 'done' ? '결승 끝' : '<b style="color:#8a5a00">결승 중</b>';
  var r = info.round || 0;
  if (!r) return '대기 중';
  if (btSwissDone(R)) return r + '라운드 끝 · <b style="color:#8a5a00">결승 전</b>';
  return r + '라운드 ' + (btRoundDone(R) ? '끝' : '진행 중');
}

function btCreateRoom() {
  var name = $('tName').value.trim();
  if (!name) { $('tMsg').textContent = '반 이름을 적어 주세요.'; return; }
  var tries = 0;
  var attempt = function () {
    var code = String(1000 + Math.floor(Math.random() * 9000));
    btRef(code, 'info').transaction(function (cur) {
      if (cur) return;   // 이미 있는 번호 → 다른 번호로
      return { name: name, created: btNow(), rounds: BT.ROUNDS, round: 0 };
    }, function (err, ok) {
      if (err) { $('tMsg').textContent = '방을 만들지 못했어요. 인터넷을 확인해 주세요.'; return; }
      if (!ok) { if (++tries < 10) attempt(); return; }
      btTOpenRoom(code);
    });
  };
  attempt();
}

function btTOpenRoom(code) {
  btTOff();
  bt.tcode = code;
  bt.tview = 'games';
  var ref = btRef(code);
  var cb = function (s) {
    var R = s.val();
    if (!R || !R.info) { btTOff(); bt.tview = 'list'; btTList(); return; }
    bt.R = R;
    var M = R.matches || {};
    for (var k in M) if (M.hasOwnProperty(k)) btNorm(M[k]);
    if (bt.tview === 'watch' && bt.watch && M[bt.watch]) btFx(bt.tLastEv, bt.watch, M[bt.watch], -1);
    btTRender();
  };
  ref.on('value', cb);
  bt.tsub = [ref, cb];
}

/* ----- 순위 계산 (스위스 경기와 부전승만) ----- */
function btStats(R) {
  var P = R.players || {}, M = R.matches || {}, S = {};
  Object.keys(P).forEach(function (pid) {
    S[pid] = { pid: pid, id: P[pid].id || pid, name: P[pid].name || '', online: !!P[pid].online, w: 0, pts: 0, pen: 0, games: 0, opps: {}, bye: false };
  });
  Object.keys(M).forEach(function (mid) {
    var m = M[mid];
    if (m.kind === 'bye') { var s0 = S[m.p[0]]; if (s0) { s0.bye = true; s0.w++; } return; }
    if (m.kind !== 'swiss') return;
    m.p.forEach(function (pid, i) {
      var s = S[pid];
      if (!s) return;
      s.opps[m.p[1 - i]] = true;
      if (m.ph !== 'done') return;
      s.games++;
      if (m.res && m.res.win === i) s.w++;
      s.pts += m.sc[i];
      s.pen += m.pen[i];
    });
  });
  return S;
}

function btRankList(R) {
  var S = btStats(R), list = Object.keys(S).map(function (k) { return S[k]; });
  list.sort(function (a, b) { return b.w - a.w || b.pts - a.pts || (a.id < b.id ? -1 : 1); });
  list.forEach(function (s, i) {   // 승점 → 총 득점, 같으면 공동 순위 (Q18-8)
    var p = list[i - 1];
    s.rank = p && p.w === s.w && p.pts === s.pts ? p.rank : i + 1;
  });
  return list;
}

/* ----- 스위스 짝 짓기 (Q17-2, Q17-3) ----- */
function btPairRec(list, strict, cnt) {
  if (!list.length) return [];
  if (++cnt.n > 50000) return null;
  var a = list[0];
  for (var j = 1; j < list.length; j++) {
    var b = list[j];
    if (strict && a.opps[b.pid]) continue;
    var rest = list.slice(1, j).concat(list.slice(j + 1));
    var r = btPairRec(rest, strict, cnt);
    if (r) return [[a, b]].concat(r);
  }
  return null;
}

function btStartRound() {
  var R = bt.R, info = R.info, P = R.players || {}, S = btStats(R);
  var on = Object.keys(P).filter(function (pid) { return P[pid].online; });
  if (on.length < 2) { alert('지금 들어와 있는 학생이 2명 이상이어야 시작할 수 있어요.'); return; }
  var r = (info.round || 0) + 1, t = btNow();
  var list = shuffle(on.map(function (pid) { return S[pid]; }));
  list.sort(function (a, b) { return b.w - a.w || b.pts - a.pts; });   // 섞은 뒤 정렬 → 같은 전적끼리는 무작위
  var bye = null;
  if (list.length % 2) {   // 부전승: 아직 안 쉰 학생 중 가장 아래 (Q17-3)
    for (var i = list.length - 1; i >= 0; i--) if (!list[i].bye) { bye = list.splice(i, 1)[0]; break; }
    if (!bye) bye = list.pop();
  }
  var pairs = btPairRec(list, true, { n: 0 }) || btPairRec(list, false, { n: 0 });
  var up = { 'info/round': r };
  Object.keys(P).forEach(function (pid) { up['players/' + pid + '/cur'] = ''; });
  pairs.forEach(function (pp, k) {
    var mid = 'r' + r + '-' + (k + 1);
    up['matches/' + mid] = btNewMatch('swiss', r, pp[0], pp[1], t);
    up['players/' + pp[0].pid + '/cur'] = mid;
    up['players/' + pp[1].pid + '/cur'] = mid;
  });
  if (bye) {
    var bm = 'r' + r + '-bye';
    up['matches/' + bm] = { kind: 'bye', round: r, p: [bye.pid], nm: [bye.id + ' ' + bye.name], ph: 'done', res: { win: 0, why: 'bye' }, sc: [0, 0], pen: [0, 0] };
    up['players/' + bye.pid + '/cur'] = bm;
  }
  btRef(bt.tcode).update(up);
}

/* ----- 결승 (Q20) ----- */
function btSeeds(R) {
  // 추첨은 방 번호+학번으로 정한 고정된 무작위 수 (화면을 다시 그려도 바뀌지 않게)
  var S = btStats(R), list = Object.keys(S).map(function (k) { var s = S[k]; s.rnd = strHash(bt.tcode + ':' + k, 100003); return s; })
    .filter(function (s) { return s.games > 0 || s.bye; });
  // 결승 진출: 승점 → 총 득점 → 감점 적은 순 → 추첨 (Q20-7)
  list.sort(function (a, b) { return b.w - a.w || b.pts - a.pts || a.pen - b.pen || a.rnd - b.rnd; });
  return list.slice(0, 4).map(function (s) { return s.pid; });
}

function btMakeFinal() {
  var seeds = btSeeds(bt.R);
  if (seeds.length < 2) { alert('결승을 하려면 경기를 한 학생이 2명 이상 있어야 해요.'); return; }
  btRef(bt.tcode, 'info/fin').set({ seeds: seeds, stage: 0 });
}

function btFinalPlan(R) {   // [경기 번호, 종류, 두 학생, 자리 이름]
  var fin = R.info.fin, s = fin.seeds || [], M = R.matches || {};
  var winOf = function (mid) { var m = M[mid]; return m && m.ph === 'done' ? m.p[m.res.win] : null; };
  if (s.length >= 4) return [
    ['f1', 'semi1', [s[0], s[3]], ['1위', '4위']],
    ['f2', 'semi2', [s[1], s[2]], ['2위', '3위']],
    ['f3', 'final', [winOf('f1'), winOf('f2')], ['4강 1경기 승자', '4강 2경기 승자']]
  ];
  return [['f3', 'final', [s[0], s[1]], ['1위', '2위']]];
}

function btFinalNext() {
  var R = bt.R, plan = btFinalPlan(R), M = R.matches || {}, P = R.players || {};
  for (var i = 0; i < plan.length; i++) {
    var f = plan[i];
    if (M[f[0]]) { if (M[f[0]].ph !== 'done') return; continue; }
    if (!f[2][0] || !f[2][1]) return;
    var pl = f[2].map(function (pid) { return { pid: pid, id: (P[pid] || {}).id || pid, name: (P[pid] || {}).name || '' }; });
    var up = {};
    Object.keys(P).forEach(function (pid) { up['players/' + pid + '/cur'] = ''; });
    up['matches/' + f[0]] = btNewMatch(f[1], 0, pl[0], pl[1], btNow(), f[3]);
    up['players/' + pl[0].pid + '/cur'] = f[0];
    up['players/' + pl[1].pid + '/cur'] = f[0];
    up['info/fin/stage'] = i + 1;
    btRef(bt.tcode).update(up);
    bt.watch = f[0];
    return;
  }
}

/* ----- 선생님 화면 그리기 ----- */
function btTRender() {
  var el = $('screenTeacher');
  if (!btOnT() || bt.tview === 'list' || !bt.R) return;
  bt.tLastDraw = Date.now();
  var R = bt.R, info = R.info, v = bt.tview;
  var nav = function (key, label) { return '<button class="' + (v === key ? 'on' : '') + '" data-act="tView:' + key + '">' + label + '</button>'; };
  var head = '<div class="t-head"><h2>' + btEsc(info.name) + ' <small style="font-size:15px;color:var(--muted)">· 방 ' + bt.tcode + '</small></h2>' +
    '<div class="t-nav">' + nav('games', '경기') + nav('rank', '순위표') + nav('final', '🏆 결승') +
    '<button data-act="tList">← 방 목록</button></div></div>';
  var body = v === 'games' ? btTGames(R) : v === 'rank' ? btTRank(R) : v === 'final' ? btTFinal(R) : btTWatch(R);
  el.innerHTML = '<div class="card">' + (v === 'watch' ? '' : head) + body + '</div>';
  if (v === 'watch') btTWatchTime();
}

function btTGames(R) {
  var info = R.info, P = R.players || {}, M = R.matches || {}, r = info.round || 0;
  var pids = Object.keys(P), on = pids.filter(function (k) { return P[k].online; });
  var seg = '<span class="t-seg">' + BT.ROUND_CHOICES.map(function (n) {
    return '<button class="' + ((info.rounds || BT.ROUNDS) === n ? 'on' : '') + '" data-act="tRounds:' + n + '"' + (n < r ? ' disabled' : '') + '>' + n + '</button>';
  }).join('') + '</span>';
  var chips = pids.sort().map(function (k) { return '<span class="t-chip' + (P[k].online ? '' : ' off') + '">' + btEsc(P[k].id + ' ' + P[k].name) + '</span>'; }).join('');

  if (!r) {
    return '<p class="ov-text" style="text-align:center;margin-bottom:0">학생들에게 이 번호를 알려 주세요</p>' +
      '<div class="t-code">' + bt.tcode + '</div>' +
      '<h3 style="margin:16px 0 4px">들어온 학생 <b style="color:#2e7d32">' + on.length + '명</b> <small style="color:var(--muted);font-weight:normal">/ 회색: 연결 안 됨</small></h3>' +
      '<div class="t-chips">' + (chips || '<span style="color:var(--muted)">아직 아무도 없어요</span>') + '</div>' +
      '<div class="t-row"><b>라운드 수</b>' + seg + '<span style="color:var(--muted);font-size:14px">한 경기 ' + BT.BOARDS + '판 · 한 라운드 넉넉히 약 15분 · 4라운드는 두 시간에 나눠 해도 돼요</span></div>' +
      '<div class="t-foot"><button data-act="tClose">방 닫기 (기록 삭제)</button><button class="btn-main" style="font-size:18px;padding:10px 22px" data-act="tStart">1라운드 시작</button></div>';
  }

  var mids = Object.keys(M).filter(function (k) { return M[k].round === r && (M[k].kind === 'swiss' || M[k].kind === 'bye'); })
    .sort(function (a, b) { return (M[a].kind === 'bye') - (M[b].kind === 'bye') || a.localeCompare(b, undefined, { numeric: true }); });
  var real = mids.filter(function (k) { return M[k].kind === 'swiss'; });
  var doneN = real.filter(function (k) { return M[k].ph === 'done'; }).length;
  var rounds = info.rounds || BT.ROUNDS, done = btRoundDone(R);
  var inRound = {};
  mids.forEach(function (k) { M[k].p.forEach(function (pid) { inRound[pid] = true; }); });
  var out = on.filter(function (k) { return !inRound[k]; }).map(function (k) { return btEsc(P[k].name); });

  var foot;
  if (info.fin) foot = '<button class="btn-main" data-act="tView:final">🏆 결승 보기</button>';
  else if (done && r >= rounds) foot = '<span style="align-self:center;font-weight:bold;color:#2e7d32">스위스 ' + rounds + '라운드 끝!</span><button data-act="tView:rank">순위표 보기</button><button class="btn-main" data-act="tView:final">🏆 결승 대진 보기</button>';
  else foot = '<button data-act="tView:rank">순위표 보기</button><button class="btn-main" data-act="tStart"' + (done ? '' : ' disabled') + '>' + (r + 1) + '라운드 시작' + (done ? '' : ' (모든 경기가 끝나면)') + '</button>';

  return '<div class="t-row" style="justify-content:space-between;margin-top:10px"><b style="font-size:18px">' + r + '라운드 / ' + rounds + '</b>' +
      '<span>끝난 경기 <b>' + doneN + ' / ' + real.length + '</b> · 라운드 수 ' + seg + '</span></div>' +
    '<div class="t-grid">' + mids.map(function (k) { return btTCard(k, M[k], P); }).join('') + '</div>' +
    '<p class="lg-note">경기 카드를 누르면 그 경기를 크게 볼 수 있어요 (전자칠판 관전).' +
      (out.length ? '<br>이번 라운드에 없는 학생(늦게 들어옴): ' + out.join(', ') + ' → 다음 라운드부터 들어가요.' : '') + '</p>' +
    '<div class="t-foot">' + foot + '</div>';
}

function btTCard(mid, m, P) {
  if (m.kind === 'bye') return '<div class="t-match" style="background:#f7f5ef;cursor:default"><div class="line"><span>' + btEsc(m.nm[0]) + '</span></div><span class="t-pill done">부전승 (1승)</span></div>';
  var win = m.ph === 'done' && m.res ? m.res.win : -1, t = btNow();
  var pill;
  if (m.disc) {
    pill = '<span class="t-pill cut">' + btEsc(btShort(m.nm[m.disc.who])) + ' 연결 끊김 · <span data-until="' + (m.disc.since + BT.DISC_SEC * 1000) + '">' + btSec(m.disc.since + BT.DISC_SEC * 1000 - t) + '초</span> 기다리는 중</span>' +
      '<div class="mini-btns"><button data-act="tWin:' + mid + ':0">' + btEsc(btShort(m.nm[0])) + ' 승</button><button data-act="tWin:' + mid + ':1">' + btEsc(btShort(m.nm[1])) + ' 승</button></div>';
  } else if (m.ph === 'done') {
    var why = { pen: ' · 감점으로 결정', tb: ' · 결정판으로 결정', forfeit: ' · 기권', teacher: ' · 선생님 결정' }[m.res.why] || '';
    pill = '<span class="t-pill done">끝' + why + '</span>';
  } else if (m.ph === 'coin' || m.ph === 'coinShow') pill = '<span class="t-pill">동전 던지기</span>';
  else if (m.ph === 'tb' || m.ph === 'tbShow') pill = '<span class="t-pill tb">결정판 ' + m.tb.n + '번째</span>';
  else pill = '<span class="t-pill">' + m.bn + '판 ' + (m.ph === 'bend' ? '끝' : '진행 중') + '</span>';
  var line = function (i) { return '<div class="line"><span class="' + (win === i ? 'win' : '') + '">' + btEsc(m.nm[i]) + '</span><span class="s">' + m.sc[i] + '</span></div>'; };
  return '<div class="t-match" data-act="tWatch:' + mid + '">' + line(0) + line(1) + pill + '</div>';
}

function btTRank(R) {
  var list = btRankList(R), info = R.info, seeds = info.fin ? info.fin.seeds || [] : (btSwissDone(R) ? btSeeds(R) : []);
  var rows = list.map(function (s) {
    var si = seeds.indexOf(s.pid);
    return '<tr class="' + (si >= 0 ? 'top' : '') + '"><td><b>' + s.rank + '</b></td><td>' + btEsc(s.id + ' ' + s.name) + '</td><td>' + s.w + '승</td><td>' + s.pts + '</td>' +
      '<td style="color:var(--muted)">' + s.pen + '</td><td style="color:#8a5a00;font-size:14px">' + (si >= 0 ? '✔ 결승 ' + (si + 1) + '번' : '') + '</td></tr>';
  }).join('');
  return '<p style="color:var(--muted);font-size:14px;margin:8px 0 0">' + (info.round || 0) + '라운드까지 · 승점 → 총 득점 순, 그래도 같으면 공동</p>' +
    '<table class="t-table"><tr><th>순위</th><th>학생</th><th>승점</th><th>총 득점</th><th>감점</th><th>결승</th></tr>' + rows + '</table>' +
    '<p class="lg-note">결승 진출(상위 4명)은 순위가 같으면 <b>감점 적은 순 → 컴퓨터 추첨</b>으로 정해요.<br>결승은 <b>다음 시간</b>에 해도 돼요. 방을 닫지 않으면 그대로 남아요.</p>' +
    '<div class="t-foot"><button data-act="tClose">방 닫기 (기록 삭제)</button><button class="btn-main" data-act="tPng">📷 순위표 저장 (PNG)</button>' +
    '<button class="btn-main" style="background:#8a5a00;border-color:#8a5a00" data-act="tView:final">🏆 결승 대진 보기</button></div>';
}

function btTFinal(R) {
  var info = R.info, P = R.players || {}, M = R.matches || {};
  if (!info.fin) {
    var ok = btSwissDone(R);
    return '<p class="ov-text" style="margin-top:14px">' + (ok
      ? '스위스 라운드가 모두 끝났어요. 상위 4명으로 결승 대진을 만들까요?<br><small>1위 vs 4위 → 2위 vs 3위 → 결승을 한 경기씩 관전해요. 다음 시간에 해도 돼요.</small>'
      : '스위스 라운드가 모두 끝나면 결승 대진을 만들 수 있어요. (지금 ' + (info.round || 0) + ' / ' + (info.rounds || BT.ROUNDS) + '라운드)') + '</p>' +
      '<div class="t-foot"><button class="btn-main" data-act="tMakeFinal"' + (ok ? '' : ' disabled') + '>🏆 결승 대진 만들기</button></div>';
  }
  var plan = btFinalPlan(R), name = function (pid) { return pid && P[pid] ? btEsc(P[pid].id + ' ' + P[pid].name) : ''; };
  var box = function (f) {
    var m = M[f[0]], st = !m ? '' : m.ph === 'done' ? '<span class="t-pill done">끝</span>' : '<span class="t-pill">진행 중</span>';
    var title = f[1] === 'semi1' ? '4강 1경기' : f[1] === 'semi2' ? '4강 2경기' : '결승';
    var line = function (i) {
      var win = m && m.ph === 'done' && m.res.win === i;
      var nm = f[2][i] ? (f[3][i].indexOf('승자') < 0 ? f[3][i] + ' ' : '') + name(f[2][i]) : '<span style="color:var(--muted)">' + f[3][i] + '</span>';
      return '<div class="line"><span class="' + (win ? 'win' : '') + '">' + nm + '</span><span class="s">' + (m ? m.sc[i] : '-') + '</span></div>';
    };
    return '<div class="br-m ' + (!m ? '' : m.ph === 'done' ? 'done' : 'now') + '"' + (m ? ' data-act="tWatch:' + f[0] + '" style="cursor:pointer"' : '') + '><div class="br-t">' + title + ' ' + st + '</div>' + line(0) + line(1) + '</div>';
  };
  var html = '<div class="br">';
  if (plan.length === 3) html += '<div class="br-col">' + box(plan[0]) + box(plan[1]) + '</div><div class="br-arrow">▶</div><div class="br-col">' + box(plan[2]) + '</div>';
  else html += '<div class="br-col">' + box(plan[0]) + '</div>';
  html += '</div>';

  // 다음에 시작할 경기
  var next = null, live = null;
  for (var i = 0; i < plan.length; i++) {
    var m = M[plan[i][0]];
    if (m && m.ph !== 'done') { live = plan[i]; break; }
    if (!m) { next = plan[i]; break; }
  }
  var champ = M.f3 && M.f3.ph === 'done' ? M.f3.nm[M.f3.res.win] : null;
  var label = next ? (next[1] === 'semi1' ? '4강 1경기 시작' : next[1] === 'semi2' ? '4강 2경기 시작' : '결승 시작') : '';
  var foot = '<button data-act="tView:rank">← 순위표</button>';
  if (live) foot += '<button class="btn-main" data-act="tWatch:' + live[0] + '">📺 관전 화면 크게</button>';
  else if (next) foot += '<button class="btn-main" data-act="tFinalNext">' + label + '</button>';
  else foot += '<button data-act="tClose">방 닫기 (기록 삭제)</button>';
  return html +
    (champ ? '<p style="text-align:center;font-size:28px;font-weight:bold;margin:18px 0 0">🏆 우승: ' + btEsc(champ) + '</p>' : '') +
    '<p class="lg-note">결승에 나가는 학생만 같은 방 번호(' + bt.tcode + ')로 들어와 있으면 돼요. 경기 규칙은 예선과 같고, 판만 ' + BT.BOARDS_FINAL + '판이에요 (' + BT.BOARDS_FINAL + '판 합산 → 감점 → 결정판).<br>시작하면 바로 관전 화면을 띄울 수 있어요.</p>' +
    '<div class="t-foot">' + foot + '</div>';
}

function btTWatch(R) {
  var M = R.matches || {}, m = M[bt.watch];
  var back = '<button class="btn-small" data-act="tView:' + (m && m.kind !== 'swiss' ? 'final' : 'games') + '">← 돌아가기</button>';
  if (!m) return '<div class="w-head"><span></span>' + back + '</div><p class="ov-text">경기를 찾을 수 없어요.</p>';
  var head = '<div class="w-head"><span class="bt-tag" style="font-size:16px">' + btKindLabel(m) + (m.seat ? ' · ' + btEsc(m.seat[0]) + ' vs ' + btEsc(m.seat[1]) : '') + '</span>' + back + '</div>';
  var body;
  if (m.ph === 'done') body = btResultHtml(m, -1);
  else if (m.ph === 'coin' || m.ph === 'coinShow') body = btCoinHtml(m, -1);
  else body = btGameHtml(m, -1, true);
  return head + body + '<p class="lg-note">고르는 중인 타일은 보여 주지 않아요. 결과만 보여요.</p>';
}

function btTWatchTime() {
  var m = bt.R && bt.R.matches ? bt.R.matches[bt.watch] : null, t = btNow();
  if (!m) return;
  var el = $('btTime'), bar = $('btBar'), rem = 0, total = 1, txt = '';
  if (m.ph === 'coin') { rem = m.coin.dl - t; txt = btSec(rem) + '초'; }
  else if (m.ph === 'play') { rem = m.b.dl - t; total = BT.TURN_SEC * 1000; txt = btSec(rem) + '초'; }
  else if (m.ph === 'tb') {
    if (m.tb.buzz.by >= 0) { rem = m.tb.buzz.until - t; total = BT.BUZZ_SEC * 1000; txt = btSec(rem) + '초'; }
    else { rem = m.tb.dl - t; total = BT.TB_SEC * 1000; txt = mmss(Math.max(0, rem)); }
  }
  if (m.disc) { txt = '⏸'; var d = $('btDisc'); if (d) d.textContent = btSec(m.disc.since + BT.DISC_SEC * 1000 - t) + '초'; }
  if (el) el.textContent = txt;
  if (bar && !m.disc) {
    bar.style.width = Math.max(0, Math.min(100, rem / total * 100)) + '%';
    bar.style.background = m.ph === 'tb' ? 'var(--yellow)' : (m.ph === 'play' && m.b.turn === 1 ? '#d84315' : '');
  }
}

/* 순위표 PNG (패들렛용, Q18-10) */
function btRankPng() {
  var R = bt.R, list = btRankList(R), info = R.info;
  var H = 200 + list.length * 46 + 40;
  var cv = document.createElement('canvas');
  cv.width = 1280; cv.height = H;
  var c = cv.getContext('2d'), F = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, 1280, H);
  c.fillStyle = '#ffffff'; roundRect(c, 30, 30, 1220, H - 60, 24); c.fill();
  var d = new Date();
  c.fillStyle = '#222'; c.font = 'bold 44px ' + F; c.textAlign = 'left'; c.fillText('합! 결! 대결 순위표', 70, 105);
  c.textAlign = 'right'; c.font = 'bold 30px ' + F; c.fillText(info.name, 1210, 92);
  c.font = '22px ' + F; c.fillStyle = '#6b6b6b';
  c.fillText(d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '. · ' + (info.round || 0) + '라운드까지', 1210, 124);
  var col = [90, 200, 720, 860, 1010], heads = ['순위', '학생', '승점', '총 득점', '감점'];
  c.textAlign = 'left'; c.font = '20px ' + F; c.fillStyle = '#6b6b6b';
  heads.forEach(function (h, i) { c.fillText(h, col[i], 175); });
  c.fillStyle = '#e2ddd2'; c.fillRect(70, 188, 1140, 2);
  list.forEach(function (s, i) {
    var y = 200 + i * 46;
    if (s.rank <= 3) { c.fillStyle = '#FFF8E1'; c.fillRect(70, y, 1140, 46); }
    c.fillStyle = '#222'; c.font = 'bold 24px ' + F; c.fillText(String(s.rank), col[0], y + 32);
    c.font = '24px ' + F; c.fillText(s.id + ' ' + s.name, col[1], y + 32);
    c.fillText(s.w + '승', col[2], y + 32); c.fillText(String(s.pts), col[3], y + 32);
    c.fillStyle = '#6b6b6b'; c.fillText(String(s.pen), col[4], y + 32);
  });
  var a = document.createElement('a');
  var mm = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + (d.getDate() < 10 ? '0' : '') + d.getDate();
  a.download = info.name + '_대결순위_' + mm + '.png';
  a.href = cv.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function btTClick(e) {
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el || el.disabled) return;
  var act = el.getAttribute('data-act'), arg = act.split(':');
  e.stopPropagation();
  switch (arg[0]) {
    case 'tExit': btTOff(); showSelect(); break;
    case 'tCreate': btCreateRoom(); break;
    case 'tOpen': btTOpenRoom(arg[1]); break;
    case 'tList': btTOff(); bt.tview = 'list'; btTList(); break;
    case 'tView': bt.tview = arg[1]; btTRender(); break;
    case 'tWatch': bt.watch = arg[1]; bt.tview = 'watch'; bt.tLastEv[arg[1]] = undefined; btTRender(); break;
    case 'tStart': btStartRound(); break;
    case 'tRounds': btRef(bt.tcode, 'info/rounds').set(+arg[1]); break;
    case 'tWin':
      if (!confirm(btShort(bt.R.matches[arg[1]].nm[+arg[2]]) + ' 승으로 정할까요?')) return;
      btAct(bt.tcode, arg[1], function (x) { if (x.ph === 'done') return; btEnd(x, +arg[2], 'teacher'); btEvent(x, { t: 'end', by: +arg[2] }); return true; });
      break;
    case 'tPng': btRankPng(); break;
    case 'tMakeFinal': btMakeFinal(); break;
    case 'tFinalNext': btFinalNext(); bt.tview = 'watch'; btTRender(); break;
    case 'tClose':
      if (!confirm('"' + bt.R.info.name + '" 방을 닫을까요?\n서버의 대결 기록(학생 이름 포함)이 모두 지워지고 되돌릴 수 없어요.\n순위표가 필요하면 먼저 PNG로 저장해 주세요.')) return;
      var code = bt.tcode;
      btTOff();
      bt.db.ref('rooms/' + code).remove().then(function () { bt.tview = 'list'; btTList(); });
      break;
  }
}

/* =========================================================
   0.25초마다: 시간 확인, 화면 시계
   ========================================================= */
function btTick() {
  // 학생: 내 경기
  if (bt.code && bt.m && bt.my >= 0 && bt.m.ph !== 'done') {
    var m = bt.m;
    btCheck(bt.code, bt.mid, m, function (i) { var p = bt.players[m.p[i]]; return !!(p && p.online); });
    btTimeUi();
  }
  // 선생님: 방의 모든 경기 (학생 기기가 멈춰도 진행되도록)
  if (bt.tcode && bt.R) {
    var R = bt.R, M = R.matches || {}, P = R.players || {};
    Object.keys(M).forEach(function (mid) {
      var x = M[mid];
      btCheck(bt.tcode, mid, x, function (i) { var p = P[x.p[i]]; return !!(p && p.online); });
    });
    // 화면은 데이터가 바뀔 때만 다시 그린다 (자주 다시 그리면 버튼 클릭이 씹힐 수 있음). 시계 글자만 여기서
    if (btOnT()) {
      if (bt.tview === 'watch') btTWatchTime();
      var now = btNow();
      [].forEach.call(document.querySelectorAll('#screenTeacher [data-until]'), function (el) {
        el.textContent = btSec(+el.getAttribute('data-until') - now) + '초';
      });
    }
  }
}

/* =========================================================
   시작
   ========================================================= */
function btInit() {
  $('btnBattle').onclick = btOpenJoin;
  $('screenBattle').addEventListener('click', btStuClick);
  $('btBanner').addEventListener('click', btStuClick);
  $('screenTeacher').addEventListener('click', btTClick);

  // 선생님 화면: Ctrl + Alt + B (연습 게임 중이 아닐 때)
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey && e.altKey && (e.code === 'KeyB' || e.key === 'b' || e.key === 'B'))) return;
    e.preventDefault();
    btOpenTeacher();
  });

  if (typeof firebase === 'undefined') return;   // 인터넷 없음 → 연습 모드만
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    bt.db = firebase.database();
    bt.ok = true;
  } catch (e) { bt.ok = false; return; }
  bt.db.ref('.info/serverTimeOffset').on('value', function (s) { bt.offset = s.val() || 0; });
  bt.db.ref('.info/connected').on('value', function (s) {
    if (s.val() === true && bt.code) btPresence();   // 다시 연결되면 '접속 중' 다시 표시
  });
  setInterval(btTick, 250);

  // 지난번에 들어가 있던 방으로 자동으로 다시 들어가기
  var saved = btLoadRoom();
  if (saved && state.student) btJoin(saved, true);
}

btInit();
