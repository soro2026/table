{
  const D = JSON.parse(document.getElementById('data').textContent);
  const scene = document.querySelector('.scene');
  const door = document.querySelector('.door');
  const name = document.querySelector('.name');
  const room = document.getElementById('room');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── 화면 1 · 불 켜지는 문 ── */
  const fitName = () => {
    name.style.fontSize = '';
    const room = door.clientWidth * 0.84;
    let size = parseFloat(getComputedStyle(name).fontSize);
    while (name.scrollWidth > room && size > 16) { size -= 1; name.style.fontSize = size + 'px'; }
  };
  const placeGlow = () => {
    const s = scene.getBoundingClientRect(), d = door.getBoundingClientRect();
    scene.style.setProperty('--door-mid', (d.top - s.top + d.height * 0.62) + 'px');
  };
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => { fitName(); placeGlow(); });
  const doorRO = new ResizeObserver(() => { fitName(); placeGlow(); });
  doorRO.observe(door);
  setTimeout(() => scene.classList.add('on'), 700);

  /* ── 화면 2 · 불 꺼진 전시실 벽 ── */
  const now = new Date();
  const M = now.getMonth() + 1, next = M % 12 + 1, late = now.getDate() >= 26;
  const span = n => { const i = (n - 1) % 5; return `${i * 5 + 1}~${i * 5 + 5}일`; };
  // 받은 그림 — 이 폰에 기억(시연판). 지우는 단추는 두지 않는다
  const KEY = `table:${D.code}:have`;
  let have = new Set();
  try { have = new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...have])); } catch (e) {} };
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
  const work = no => D.exhibit.works.find(w => w.no === no);

  const plateHTML = w => `<span class="t1">${esc(w.en)} · ${esc(D.exhibit.artist_en)}, ${w.year} · ${esc(w.museum_en)}</span><span class="t2">${esc(D.shop.en)}</span>`;
  // 명패 두 줄이 놋쇠판(나사 사이)을 넘지 않게 — 넘치면 그 줄만 줄인다(cqh라 크기가 바뀌어도 그대로 맞음)
  const fitPlate = pl => {
    const h = pl.clientHeight, room = pl.clientWidth * 0.78; if (!h) return;
    pl.querySelectorAll('span').forEach(t => {
      t.style.fontSize = '';
      const w = t.scrollWidth;
      if (w > room) t.style.fontSize = (parseFloat(getComputedStyle(t).fontSize) * room / w / h * 100).toFixed(2) + 'cqh';
    });
  };

  const slot = no => {
    const w = work(no);
    if (w && have.has(no)) {
      const f = D.frames[w.id], p = f.plate;
      return `<button class="slot lit n${no}" type="button" data-no="${no}" aria-label="${no}번 ${esc(w.name)} 가까이 보기">
        <span class="spot" aria-hidden="true"></span>
        <span class="framed"><img src="${D.art[w.id].frame}" alt="" width="780" height="${Math.round(780 / f.frame_ratio)}">
          <span class="plate" style="left:${p[0] * 100}%;top:${p[1] * 100}%;width:${(p[2] - p[0]) * 100}%;height:${(p[3] - p[1]) * 100}%">${plateHTML(w)}</span></span>
        <span class="tag"><b>${no}</b> · ${esc(w.name)}</span></button>`;
    }
    const when = late ? `놓쳤다면 지금,<br>요청사항에 「그림 ${no}번」` : `${no}번 · ${M}월 ${span(no)}에 와요`;
    return `<button class="slot dark n${no}" type="button" aria-label="${no}번 엽서 찍기"><span class="framed empty"><span class="q">?</span></span><span class="tag">${when}</span></button>`;
  };
  const wallEl = document.getElementById('wall');
  const renderWall = () => {
    wallEl.innerHTML = [1, 2, 3, 4, 5].map(slot).join('');
    const got = have.size;
    room.classList.toggle('has', got > 0);   // 한 점이라도 걸면 단추 아래 안내 줄은 거둔다
    document.getElementById('dots').innerHTML = Array.from({ length: 7 }, (_, i) => `<span class="dot${i < got ? ' on' : ''}"></span>`).join('')
      + '<svg viewBox="0 0 26 22" aria-hidden="true"><rect x="1.5" y="1.5" width="23" height="19" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="6" y="6" width="14" height="10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
    document.getElementById('count').innerHTML = got ? `지금 <b>${got}점</b> · ${7 - got}점 더 모으면 액자가 와요` : '아직 걸린 그림이 없어요';
    if (!room.hidden) ready.then(() => wallEl.querySelectorAll('.plate').forEach(fitPlate));
  };
  renderWall();
  document.getElementById('nextLabel').textContent = `${next}월, 이어서 걸릴 다섯 점`;
  document.getElementById('minis').innerHTML = [6, 7, 8, 9, 10].map(no =>
    `<div class="mini"><span class="empty"><span class="q">?</span></span><span>${no}번<br>${span(no)}</span></div>`).join('');

  // 카카오로 입장 — 시연판은 확인 없이 문 안으로 걸어 들어간다
  // 들어가면 주소 끝에 #room을 달아, 폰의 뒤로 가기가 「전시실 → 문 앞」이 되게 한다
  let inRoom = false;
  const walkIn = () => {
    if (inRoom) return; inRoom = true;
    scene.classList.remove('bye', 'dim', 'back');
    scene.classList.add('leave');
    setTimeout(() => {
      document.body.classList.add('inroom');
      room.hidden = false; room.classList.remove('going');
      window.scrollTo(0, 0);
      ready.then(() => document.querySelectorAll('.wall .plate').forEach(fitPlate));
      loadVision().catch(() => {});
    }, 820);
  };

  // 다음 그림이 오는 날 — 배웅 인사에 넣는다
  const nextComing = () => {
    const d = now.getDate();
    if (d <= 20) { const n = Math.floor((d - 1) / 5) + 2; return `${n}번 그림은 ${M}월 ${span(n)}에 와요.`; }
    return `6번 그림은 ${next}월 1~5일에 와요.`;
  };
  let dimT;
  const walkOut = () => {
    if (!inRoom) return; inRoom = false;
    dropZoom();
    [document.getElementById('zoom'), document.getElementById('guide'), document.getElementById('look')].forEach(el => { if (el) el.hidden = true; });
    document.body.style.overflow = '';
    room.classList.add('going');
    setTimeout(() => {
      room.hidden = true; document.body.classList.remove('inroom');
      document.getElementById('byeNext').textContent = nextComing();
      scene.classList.remove('leave'); scene.classList.add('bye', 'back');
      window.scrollTo(0, 0); placeGlow();
      clearTimeout(dimT); dimT = setTimeout(() => scene.classList.add('dim'), 4200);   // 다 읽을 즈음 불이 천천히 꺼진다
    }, 450);
  };
  const toRoom = () => { if (location.hash === '#room') walkIn(); else location.hash = 'room'; };
  addEventListener('hashchange', () => { if (location.hash === '#room') walkIn(); else walkOut(); });
  if (location.hash === '#room') history.replaceState(null, '', location.pathname + location.search);   // 새로고침은 늘 문 앞에서
  document.querySelector('.kakao').addEventListener('click', toRoom);
  document.getElementById('again').addEventListener('click', () => { clearTimeout(dimT); toRoom(); });
  document.getElementById('exitBtn').addEventListener('click', () => { if (location.hash === '#room') history.back(); else walkOut(); });

  /* ── 화면 4 · 가까이 보기 — 액자 속 그림으로 빨려 들어가고, 아래로 도슨트가 선다 ── */
  const zoom = document.getElementById('zoom');
  const bg = zoom.querySelector('.zoom-bg');
  const art = zoom.querySelector('.zoom-art');
  const zplate = zoom.querySelector('.zoom-plate');
  const cap = zoom.querySelector('.zoom-cap');
  const docent = document.getElementById('docent');
  const sceneLine = document.getElementById('sceneLine');
  const layersEl = document.getElementById('layers');
  const ease = 'cubic-bezier(.22,.7,.12,1)';
  let cur = null;

  // 해설 글의 *기울임* · **굵게** 표시를 화면 글씨로 — 한글은 기울이면 어색해서 결(색 · 무게)로만 바꾼다
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const LAYERS = [['knowledge', '이 그림은'], ['thought', '곰곰이'], ['connection', '이어지는 이야기'], ['curation', '다음에 만나면']];

  // 음성 해설 — 폰은 저절로 소리 내지 않으니 손님이 단추를 눌러야 시작. 미리 받지도 않는다(preload none)
  const voice = document.getElementById('voice');
  const listen = document.getElementById('listen'), listenT = document.getElementById('listenT');
  const listenM = document.getElementById('listenM'), listenBar = document.getElementById('listenBar');
  const clock = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const longTime = s => { s = Math.floor(s || 0); const m = Math.floor(s / 60), r = s % 60; return m ? (r ? `${m}분 ${r}초` : `${m}분`) : `${r}초`; };
  let vWork = null, vSec = 0;
  const WORDS = { idle: '음성 해설 듣기', wait: '불러오는 중…', play: '잠시 멈춤', pause: '이어 듣기', end: '다시 듣기', err: '지금은 들을 수 없어요' };
  const paintVoice = st => {
    if (st) listen.dataset.st = st;
    st = listen.dataset.st;
    const t = voice.currentTime || 0, dur = (isFinite(voice.duration) && voice.duration) || vSec;
    listenT.textContent = WORDS[st];
    listenM.textContent = st === 'idle' || st === 'end' ? longTime(vSec) : st === 'play' || st === 'pause' ? `${clock(t)} / ${clock(dur)}` : '';
    listenBar.style.width = (st === 'idle' ? 0 : st === 'end' ? 100 : dur ? Math.min(100, t / dur * 100) : 0) + '%';
  };
  const setVoice = (w, v) => {
    listen.hidden = !v;
    if (!v) return;
    if (vWork !== w.id) {   // 다른 그림이면 처음부터 · 같은 그림을 다시 열면 멈춘 데서 이어 듣는다
      voice.pause(); voice.src = v.src; vWork = w.id; vSec = v.sec;
      paintVoice('idle');
    } else paintVoice();
  };
  const mediaMeta = w => {
    try {
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({
        title: w.name, artist: D.exhibit.artist, album: `${D.shop.name} 식탁미술관`,
        artwork: [{ src: new URL(D.art[w.id].full, location.href).href, type: 'image/webp' }] });
    } catch (e) {}
  };
  listen.addEventListener('click', () => {
    const st = listen.dataset.st;
    if (st === 'play' || st === 'wait') { voice.pause(); return; }
    if (st === 'end') voice.currentTime = 0;
    if (st === 'err') voice.load();
    paintVoice('wait');
    if (cur) mediaMeta(cur.w);
    const p = voice.play();
    if (p) p.catch(() => { if (!voice.error) paintVoice(voice.currentTime > 0 ? 'pause' : 'idle'); });
  });
  voice.addEventListener('playing', () => paintVoice('play'));
  voice.addEventListener('waiting', () => { if (!voice.paused) paintVoice('wait'); });
  voice.addEventListener('pause', () => { if (!voice.ended && listen.dataset.st !== 'err') paintVoice(voice.currentTime > 0 ? 'pause' : 'idle'); });
  voice.addEventListener('ended', () => paintVoice('end'));
  voice.addEventListener('timeupdate', () => { if (listen.dataset.st === 'play') paintVoice(); });
  voice.addEventListener('error', () => { if (voice.getAttribute('src')) paintVoice('err'); });

  const fillDocent = w => {
    const d = (D.docent || {})[w.id] || {}, L = d.layers || {};
    sceneLine.innerHTML = L.scene ? md(L.scene) : ''; sceneLine.hidden = !L.scene;
    layersEl.innerHTML = LAYERS.filter(([k]) => L[k]).map(([k, t]) => `<section class="layer"><h3>${t}</h3><p>${md(L[k])}</p></section>`).join('');
    setVoice(w, d.voice);
  };

  const startRects = (btn, w) => {
    const f = D.frames[w.id], r = btn.querySelector('.framed').getBoundingClientRect();
    const box = b => ({ x: r.left + b[0] * r.width, y: r.top + b[1] * r.height, w: (b[2] - b[0]) * r.width, h: (b[3] - b[1]) * r.height });
    return { paint: box(f.paint), plate: box(f.plate), framed: r };
  };
  const artFrom = (S, F) => {
    const s = Math.max(S.w / F.width, S.h / F.height);
    const dx = S.x + S.w / 2 - (F.left + F.width / 2), dy = S.y + S.h / 2 - (F.top + F.height / 2);
    const ix = Math.max(0, (F.width - S.w / s) / 2), iy = Math.max(0, (F.height - S.h / s) / 2);
    return { transform: `translate(${dx}px,${dy}px) scale(${s})`, clipPath: `inset(${iy}px ${ix}px)` };
  };
  const plateFrom = (S, F) => {
    const s = S.w / F.width;
    return { transform: `translate(${S.x + S.w / 2 - (F.left + F.width / 2)}px,${S.y + S.h / 2 - (F.top + F.height / 2)}px) scale(${s})` };
  };
  const swallow = (S, r) => {
    const cx = S.paint.x + S.paint.w / 2 - r.left, cy = S.paint.y + S.paint.h / 2 - r.top;
    return { origin: `${cx}px ${cy}px`, grow: Math.min(innerWidth / S.paint.w, innerHeight / S.paint.h) * 1.15 };
  };

  const open = async btn => {
    const w = work(+btn.dataset.no); if (!w || cur) return;
    const f = D.frames[w.id];
    cur = { btn, w };
    art.src = D.art[w.id].full; art.alt = `${w.name} · ${D.exhibit.artist}, ${w.year}`;
    zplate.style.aspectRatio = f.plate_ratio; zplate.style.backgroundImage = `url("${D.art[w.id].plate}")`;
    zplate.innerHTML = plateHTML(w);
    cap.textContent = `${w.name} · ${D.exhibit.artist}, ${w.year} · ${w.museum}`;
    fillDocent(w);
    try { await art.decode(); } catch (e) {}
    const S = startRects(btn, w);
    zoom.hidden = false; zoom.scrollTop = 0; document.body.style.overflow = 'hidden';
    // 폰의 뒤로 가기 = 벽으로(전시실 밖으로 나가지 않게)
    try { history.pushState({ look: 1 }, '', location.href); } catch (e) {}
    fitPlate(zplate);
    const F = art.getBoundingClientRect(), P = zplate.getBoundingClientRect();
    const framed = btn.querySelector('.framed'), sw = swallow(S, S.framed);
    framed.style.transformOrigin = sw.origin;
    const opt = { duration: 760, easing: ease, fill: 'both' };
    framed.animate([{ transform: 'none', opacity: 1 }, { transform: `scale(${sw.grow})`, opacity: 0 }], opt);
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease', fill: 'both' });
    art.animate([artFrom(S.paint, F), { transform: 'none', clipPath: `inset(0px 0px)` }], opt);
    zplate.animate([plateFrom(S.plate, P), { transform: 'none' }], opt);
    cap.animate([{ opacity: 0 }, { opacity: 0, offset: .6 }, { opacity: 1 }], { duration: 900, fill: 'both' });
    docent.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 0, transform: 'translateY(12px)', offset: .55 }, { opacity: 1, transform: 'none' }], { duration: 1200, easing: 'ease', fill: 'both' });
    zoom.querySelector('.zoom-x').focus({ preventScroll: true });
  };

  const settle = (btn, framed) => {
    zoom.hidden = true; document.body.style.overflow = '';
    [zoom, art, zplate, bg, cap, docent, framed].forEach(el => el && el.getAnimations().forEach(x => x.cancel()));
    if (btn) btn.focus({ preventScroll: true });
  };
  const close = () => {
    if (!cur) return;
    const { btn, w } = cur; cur = null;
    voice.pause();   // 멈춘 자리는 기억 — 같은 그림을 다시 열면 「이어 듣기」
    const framed = btn.querySelector('.framed');
    framed.getAnimations().forEach(a => a.cancel());
    // 해설을 읽으러 아래로 내려와 있었다면 — 그림이 날아오지 않고 스르르 걷히며 벽의 액자가 다시 선다
    if (zoom.scrollTop > 60) {
      framed.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 480, easing: 'ease', fill: 'both' });
      zoom.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 340, easing: 'ease', fill: 'both' }).finished.then(() => settle(btn, framed));
      return;
    }
    const S = startRects(btn, w);
    const F = art.getBoundingClientRect(), P = zplate.getBoundingClientRect(), sw = swallow(S, S.framed);
    framed.style.transformOrigin = sw.origin;
    const opt = { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' };
    framed.animate([{ transform: `scale(${sw.grow})`, opacity: 0 }, { transform: 'none', opacity: 1 }], opt);
    bg.animate([{ opacity: 1 }, { opacity: 0 }], opt);
    cap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' });
    docent.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' });
    zplate.animate([{ transform: 'none' }, plateFrom(S.plate, P)], opt);
    art.animate([{ transform: 'none', clipPath: 'inset(0px 0px)' }, artFrom(S.paint, F)], opt).finished.then(() => settle(btn, framed));
  };
  // ✕ · 「벽으로 돌아가기」 · Esc는 뒤로 가기와 같은 길 — 쌓아 둔 한 칸을 걷으면서 닫는다
  const askClose = () => { if (!cur) return; if (history.state && history.state.look) history.back(); else close(); };
  addEventListener('popstate', () => { if (cur && !(history.state && history.state.look)) close(); });
  // 전시실을 나갈 때 가까이 보기가 열려 있었다면 조용히 거둔다(벽의 액자가 투명한 채 남지 않게)
  const dropZoom = () => {
    voice.pause();
    if (!cur) return;
    const framed = cur.btn.querySelector('.framed'); cur = null;
    settle(null, framed);
  };

  wallEl.addEventListener('click', e => {
    const b = e.target.closest('button.slot'); if (!b) return;
    if (b.classList.contains('lit')) open(b); else openGuide();
  });
  zoom.querySelector('.zoom-x').addEventListener('click', askClose);
  document.getElementById('backWall').addEventListener('click', askClose);
  addEventListener('keydown', e => { if (e.key === 'Escape') askClose(); });

  /* ── 화면 3 · 도장(시연판은 엽서만) ── */
  let visionP = null;
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const loadVision = () => visionP || (visionP = new Promise((ok, no) => {
    const sc = document.createElement('script'); sc.src = D.vision.cv; sc.async = true;
    sc.onload = ok; sc.onerror = () => no(new Error('cv')); document.head.appendChild(sc);
  }).then(async () => {
    let cv = window.cv;
    if (cv instanceof Promise) cv = window.cv = await cv;
    else if (!cv.Mat) await new Promise(r => { cv.onRuntimeInitialized = r; });
    const orb = new cv.ORB(5000), refs = [];
    for (const w of D.exhibit.works) {
      const img = await loadImg(D.vision.refs[w.id]);
      const m = cv.imread(img), g = new cv.Mat(), none = new cv.Mat();
      cv.cvtColor(m, g, cv.COLOR_RGBA2GRAY);
      const kp = new cv.KeyPointVector(), des = new cv.Mat();
      orb.detectAndCompute(g, none, kp, des);
      refs.push({ w, kp, des }); m.delete(); g.delete(); none.delete();
    }
    return { cv, orb, refs };
  }).catch(e => { visionP = null; throw e; }));

  const findCard = ({ cv, orb, refs }, canvas) => {
    const rgba = cv.imread(canvas), g = new cv.Mat(); cv.cvtColor(rgba, g, cv.COLOR_RGBA2GRAY); rgba.delete();
    const kp = new cv.KeyPointVector(), des = new cv.Mat(), none = new cv.Mat();
    orb.detectAndCompute(g, none, kp, des);
    const bf = new cv.BFMatcher(cv.NORM_HAMMING, false), out = [];
    for (const r of refs) {
      let inl = 0;
      if (des.rows > 10 && r.des.rows > 10) {
        const mm = new cv.DMatchVectorVector(); bf.knnMatch(r.des, des, mm, 2);
        const src = [], dst = [];
        for (let i = 0; i < mm.size(); i++) {
          const p = mm.get(i); if (p.size() < 2) continue;
          const a = p.get(0), b = p.get(1);
          if (a.distance < 0.78 * b.distance) { const s = r.kp.get(a.queryIdx).pt, d = kp.get(a.trainIdx).pt; src.push(s.x, s.y); dst.push(d.x, d.y); }
        }
        mm.delete();
        if (src.length / 2 >= 10) {
          const sM = cv.matFromArray(src.length / 2, 1, cv.CV_32FC2, src), dM = cv.matFromArray(dst.length / 2, 1, cv.CV_32FC2, dst);
          const mask = new cv.Mat(), H = cv.findHomography(sM, dM, cv.RANSAC, 6, mask);
          if (!H.empty()) inl = cv.countNonZero(mask);
          sM.delete(); dM.delete(); mask.delete(); H.delete();
        }
      }
      out.push({ w: r.w, inl });
    }
    g.delete(); kp.delete(); des.delete(); none.delete(); bf.delete();
    out.sort((a, b) => b.inl - a.inl);
    return out[0].inl >= 15 && out[0].inl >= (out[1] ? out[1].inl : 0) * 2 ? out[0].w : null;
  };

  const look = document.getElementById('look'), lookImg = document.getElementById('lookImg');
  const lookMsg = document.getElementById('lookMsg'), lookBtns = document.getElementById('lookBtns');
  const toastEl = document.getElementById('toast');
  let toastT;
  const toast = t => { toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2800); };
  const closeLook = () => { look.hidden = true; document.body.style.overflow = ''; };

  const lightUp = w => {
    const no = w.no;
    if (have.has(no)) {
      toast(`「${w.name}」${josa(w.name, '은', '는').slice(-1)} 이미 벽에 걸려 있어요.`);
      wallEl.querySelector('.slot.n' + no).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      return;
    }
    have.add(no); save(); renderWall();
    const el = wallEl.querySelector('.slot.n' + no);
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setTimeout(() => el.classList.add('just'), 380);
    toast(`${no}번 「${w.name}」${josa(w.name, '이', '가').slice(-1)} 벽에 걸렸어요.`);
  };

  const onPhoto = async file => {
    if (!file) return;
    look.hidden = false; lookBtns.hidden = true; document.body.style.overflow = 'hidden';
    lookMsg.textContent = '그림을 알아보는 중이에요…';
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { lookMsg.textContent = '사진을 열지 못했어요. 다시 찍어 주실래요?'; lookBtns.hidden = false; return; }
    const fit = max => { const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); return [Math.round(bmp.width * k), Math.round(bmp.height * k)]; };
    const [pw, ph] = fit(560); lookImg.width = pw; lookImg.height = ph; lookImg.getContext('2d').drawImage(bmp, 0, 0, pw, ph);
    const work = document.createElement('canvas'); const [ww, wh] = fit(1280); work.width = ww; work.height = wh;
    work.getContext('2d').drawImage(bmp, 0, 0, ww, wh); bmp.close();
    let V;
    const slow = setTimeout(() => { lookMsg.textContent = '그림 보는 눈을 깨우는 중이에요…'; }, 900);
    try { V = await loadVision(); } catch (e) { clearTimeout(slow); lookMsg.textContent = '지금은 그림을 볼 수 없어요. 잠시 뒤에 다시 해 주세요.'; lookBtns.hidden = false; return; }
    clearTimeout(slow); lookMsg.textContent = '그림을 알아보는 중이에요…';
    await new Promise(r => setTimeout(r, 40));
    const w = findCard(V, work);
    if (w) { closeLook(); lightUp(w); }
    else { lookMsg.innerHTML = '한 번만 더 찍어 주실래요?<br>엽서가 화면에 크게, 밝게 들어오게요.'; lookBtns.hidden = false; }
  };
  // 찍기 전에 무엇을 어떻게 찍는지 먼저 보여 준다(바로 카메라로 넘어가지 않게)
  const guide = document.getElementById('guide');
  const openGuide = () => { guide.hidden = false; document.body.style.overflow = 'hidden'; document.getElementById('guideX').focus({ preventScroll: true }); };
  const closeGuide = () => { guide.hidden = true; document.body.style.overflow = ''; };
  document.getElementById('snapOpen').addEventListener('click', openGuide);
  document.getElementById('guideX').addEventListener('click', closeGuide);
  guide.addEventListener('click', e => { if (e.target === guide) closeGuide(); });
  for (const id of ['snapIn', 'pickIn', 'snapIn2']) document.getElementById(id).addEventListener('change', e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    guide.hidden = true; onPhoto(f);
  });
  document.getElementById('lookBack').addEventListener('click', closeLook);
}
