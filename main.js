/* ============================================================
   UNA TAPA DE BOTELLA — interacción
   Sin dependencias. Reproductor propio, revelados al hacer scroll,
   cambio de idioma ES / 中文.
   ============================================================ */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Navegación, progreso de lectura ─────────────────── */

  const nav = $('#nav');
  const progressBar = $('#progressBar');
  const hero = $('#hero');

  const darkSections = $$('[data-dark]');

  const onScroll = () => {
    const y = window.scrollY;
    const heroH = hero ? hero.offsetHeight : 0;
    const solid = y > heroH - 90;
    nav.classList.toggle('is-solid', solid);

    // ¿la barra de navegación está sobre una sección oscura?
    const edge = nav.offsetHeight * 0.6;
    const overDark = solid && darkSections.some(el => {
      const r = el.getBoundingClientRect();
      return r.top <= edge && r.bottom >= edge;
    });
    nav.classList.toggle('is-dark', overDark);

    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    progressBar.style.transform = `scaleX(${p})`;
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  /* ── 2. Marquesina continua ─────────────────────────────── */

  const marqueeRow = $('.marquee__row');
  const marqueeWords = {
    es: ['Una tapa de botella', 'cincuenta segundos', 'siglos en el mar'],
    zh: ['一只瓶盖', '五十秒', '在海里数百年']
  };
  const buildMarquee = (lang) => {
    if (!marqueeRow) return;
    const w = marqueeWords[lang] || marqueeWords.es;
    const group = w.map((txt, i) =>
      `<span${i === 1 ? ' class="marquee__it"' : ''}>${txt}</span>` +
      (i < w.length - 1 ? '<span class="marquee__dot">◦</span>' : '')
    ).join('');
    // cuatro grupos: el desplazamiento del 50 % encaja sin saltos
    marqueeRow.innerHTML = group + group + group + group;
  };
  buildMarquee('es');

  /* ── 3. Revelados al entrar en pantalla ─────────────────── */

  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    reveals.forEach((el, i) => {
      const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
      const idx = siblings.indexOf(el);
      el.style.setProperty('--d', `${Math.min(idx, 4) * 90}ms`);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(el => io.observe(el));
  }

  /* ── 4. Reproductor ─────────────────────────────────────── */

  const player   = $('#player');
  const video    = $('#film');
  const bigPlay  = $('#bigPlay');
  const playBtn  = $('#playBtn');
  const muteBtn  = $('#muteBtn');
  const fsBtn    = $('#fsBtn');
  const seek     = $('#seek');
  const playedBar= $('#playedBar');
  const bufBar   = $('#buf');
  const ticksBox = $('#ticks');
  const tCur     = $('#tCur');
  const tDur     = $('#tDur');
  const noAudio  = $('#noAudioHint');
  const chapters = $$('.chapter');

  if (!video) return;

  const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const state = { duration: 0, lang: 'es' };

  /* --- etiquetas accesibles, dependientes del idioma y el estado --- */
  const labels = {
    es: { play: 'Reproducir', pause: 'Pausar', mute: 'Silenciar', unmute: 'Activar sonido',
          fs: 'Pantalla completa', exit: 'Salir de pantalla completa', seek: 'Posición de la película' },
    zh: { play: '播放', pause: '暂停', mute: '静音', unmute: '取消静音',
          fs: '全屏', exit: '退出全屏', seek: '播放位置' }
  };
  const L = () => labels[state.lang] || labels.es;

  const syncPlayLabel = () => {
    const playing = !video.paused && !video.ended;
    player.classList.toggle('is-playing', playing);
    player.classList.toggle('is-paused', !playing);
    playBtn.setAttribute('aria-label', playing ? L().pause : L().play);
    bigPlay.setAttribute('aria-label', L().play);
    syncAudioHint();
  };

  const syncAudioHint = () => {
    if (noAudio) noAudio.hidden = !(video.muted && !video.paused);
  };

  const syncMuteLabel = () => {
    player.classList.toggle('is-muted', video.muted || video.volume === 0);
    muteBtn.setAttribute('aria-label', video.muted ? L().unmute : L().mute);
    syncAudioHint();
  };

  const play = () => {
    if (video.ended) video.currentTime = 0;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // El navegador ha bloqueado la reproducción con sonido: seguimos sin
        // audio y mostramos el aviso para activarlo con un clic.
        if (video.muted) { syncPlayLabel(); return; }
        video.muted = true;
        syncMuteLabel();
        video.play().catch(() => syncPlayLabel());
      });
    }
  };
  const pause = () => video.pause();
  const toggle = () => (video.paused || video.ended) ? play() : pause();

  bigPlay.addEventListener('click', () => { play(); });
  playBtn.addEventListener('click', toggle);

  video.addEventListener('click', toggle);
  video.addEventListener('play',  syncPlayLabel);
  video.addEventListener('pause', syncPlayLabel);
  video.addEventListener('ended', syncPlayLabel);

  /* --- duración, marcas de capítulo y progreso --- */
  const buildTicks = () => {
    ticksBox.innerHTML = '';
    chapters.forEach(ch => {
      const t = parseFloat(ch.dataset.t);
      if (!Number.isFinite(t) || t <= 0 || !state.duration) return;
      const mark = document.createElement('i');
      mark.style.left = `${Math.min(100, (t / state.duration) * 100)}%`;
      ticksBox.appendChild(mark);
    });
  };

  video.addEventListener('loadedmetadata', () => {
    state.duration = video.duration || 0;
    tDur.textContent = fmt(state.duration);
    seek.max = 1000;
    buildTicks();
  });

  const paintTime = () => {
    const d = state.duration || video.duration || 0;
    const pct = d ? (video.currentTime / d) * 100 : 0;
    seek.value = Math.round(pct * 10);
    playedBar.style.width = `${pct}%`;
    tCur.textContent = fmt(video.currentTime);
    seek.setAttribute('aria-valuetext', `${fmt(video.currentTime)} / ${fmt(d)}`);

    // capítulo activo
    let active = 0;
    chapters.forEach((ch, i) => {
      if (video.currentTime + 0.25 >= parseFloat(ch.dataset.t)) active = i;
    });
    chapters.forEach((ch, i) => ch.classList.toggle('is-current', i === active));
  };

  let scrubbing = false;

  video.addEventListener('timeupdate', () => { if (!scrubbing) paintTime(); });
  video.addEventListener('seeked', () => { scrubbing = false; paintTime(); });

  video.addEventListener('progress', () => {
    if (!video.buffered.length || !state.duration) return;
    const end = video.buffered.end(video.buffered.length - 1);
    bufBar.style.width = `${(end / state.duration) * 100}%`;
  });

  seek.addEventListener('input', () => {
    const d = state.duration || video.duration || 0;
    if (!d) return;
    // Mientras se arrastra, pintamos desde el propio control (no desde el
    // vídeo, que aún puede estar buscando el fotograma).
    scrubbing = true;
    const t = (parseFloat(seek.value) / 1000) * d;
    playedBar.style.width = `${(t / d) * 100}%`;
    tCur.textContent = fmt(t);
    seek.setAttribute('aria-valuetext', `${fmt(t)} / ${fmt(d)}`);
    video.currentTime = t;
  });
  seek.addEventListener('change', () => { scrubbing = false; });

  /* --- capítulos --- */
  chapters.forEach(ch => {
    ch.addEventListener('click', () => {
      const t = parseFloat(ch.dataset.t) || 0;
      video.currentTime = t;
      if (video.paused) play();
      paintTime();
    });
  });

  /* --- sonido --- */
  const toggleMute = () => {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 1;
    syncMuteLabel();
  };
  muteBtn.addEventListener('click', toggleMute);
  if (noAudio) noAudio.addEventListener('click', () => { video.muted = false; syncMuteLabel(); });

  /* --- pantalla completa --- */
  const isFs = () => document.fullscreenElement === player;
  fsBtn.addEventListener('click', () => {
    if (isFs()) document.exitFullscreen();
    else if (player.requestFullscreen) player.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iOS
  });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.setAttribute('aria-label', isFs() ? L().exit : L().fs);
  });

  /* --- teclado dentro del reproductor --- */
  player.addEventListener('keydown', (e) => {
    const k = e.key;
    if ([' ', 'k', 'K'].includes(k)) { e.preventDefault(); toggle(); }
    else if (k === 'ArrowRight') { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
    else if (k === 'ArrowLeft')  { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
    else if (k === 'ArrowUp')    { e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); video.muted = false; syncMuteLabel(); }
    else if (k === 'ArrowDown')  { e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); }
    else if (k === 'm' || k === 'M') { e.preventDefault(); toggleMute(); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); fsBtn.click(); }
  });

  /* --- botón del hero: bajar y reproducir --- */
  $$('[data-play-film]').forEach(btn => {
    btn.addEventListener('click', () => {
      video.muted = false;
      syncMuteLabel();
      const y = player.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      // el gesto del usuario permite reproducir con sonido
      play();
      player.focus({ preventScroll: true });
    });
  });

  syncPlayLabel();
  syncMuteLabel();

  /* ── 5. Cambio de idioma ES / 中文 ─────────────────────── */

  const zh = {
    'nav.film': '影片',
    'nav.journey': '旅程',
    'nav.facts': '数据',
    'nav.act': '行动',

    'hero.eyebrow': '动画短片 · 50 秒',
    'hero.t1': '一只瓶盖',
    'hero.t2': '的旅程',
    'hero.t3': '',
    'hero.sub': '一个几乎从不被注视的物件，一段可能比我们活得更久的故事。',
    'hero.cta': '观看影片',
    'hero.cta2': '阅读故事',
    'hero.meta1': '无对白',

    'film.kicker': '影片',
    'film.title': '五十秒，一段漫长的旅程',
    'film.lead': '从男孩的手中，到海洋深处。全片没有对白：只有画面、声音，以及一个物件消失所需的时间。',
    'film.fallback': '你的浏览器无法播放这段视频。<a href="assets/una-tapa-de-botella.mp4">点此下载</a>。',
    'film.soundOn': '点击开启声音',
    'film.chapters': '章节',
    'film.note': '影片没有对白。全部叙事都由画面与声音完成。',
    'film.specDur': '时长',
    'film.specRes': '分辨率',
    'film.specAudio': '声音',
    'film.specAudioVal': '有，配乐',
    'film.specCredit': '作者',

    'ch.1': '打开', 'ch.2': '瓶子', 'ch.3': '入海',
    'ch.4': '鱼群', 'ch.5': '鲸鱼', 'ch.6': '天空',

    'journey.kicker': '逐帧回看这段旅程',
    'journey.title': '三厘米物件的<br>五个站点',
    'journey.lead': '镜头尽可能靠近，提醒我们问题的真实尺度：微小，并不等于微不足道。',
    'journey.s1t': '手', 'journey.s1p': '一切都始于一个每天重复千百次的动作。瓶盖被拧开，手指几乎没有停顿：没有人去看自己刚刚松开的东西。',
    'journey.s2t': '水', 'journey.s2p': '水不区分风景与垃圾。对我们来说只是三厘米的废弃物，对海来说，是一个刚刚抵达的新物件。',
    'journey.s3t': '鱼群', 'journey.s3p': '一个圆而白的物件，不属于任何鱼群。它漂浮、打转，再慢慢下沉：塑料不会溶解，只会换个地方。',
    'journey.s4t': '鲸鱼', 'journey.s4p': '从一枚指甲盖的大小，到巨物的影子。一个镜头切换了尺度：几克的重量，也能抵达阳光到不了的地方。',
    'journey.s5t': '天空', 'journey.s5p': '旅程并不止于海底。被分解的瓶盖会以微塑料的形态回到水面——然后去往其他一切地方。',

    'facts.kicker': '影片结束之后',
    'facts.title': '四个值得再看一眼的数字',
    'facts.s1unit': '厘米',
    'facts.s1t': '它的尺寸',
    'facts.s1p': '一枚标准瓶盖的大小。足以堵塞一只海鸟的胃。',
    'facts.s2unit': '卡车 / 分钟',
    'facts.s2t': '它的速度',
    'facts.s2p': '这是每分钟进入海洋的塑料量，据世界经济论坛估算。',
    'facts.s3num': '数百年',
    'facts.s3t': '它的时间',
    'facts.s3p': '瓶盖不会消失：它碎裂成越来越小的碎片，重新进入食物链。',
    'facts.s4t': '它的频率',
    'facts.s4p': '在世界各地的海滩清理中，瓶盖始终是出现最多的垃圾之一。',
    'facts.srcLabel': '来源：',
    'facts.srcNote': '数字取自已公开报告并做了取整；链接指向原文。',

    'act.kicker': '影片之外的部分',
    'act.title': '四个决定它去向的小动作',
    'act.lead': '它们都不壮烈。但每一个都算数，因为一只瓶盖的命运，往往在拧开瓶盖后的几秒钟里就被决定了。',
    'act.a1t': '自带瓶子', 'act.a1p': '没买的瓶子，不需要瓶盖。一只可重复使用的水瓶，一年能省下上百个瓶盖。',
    'act.a2t': '别松手', 'act.a2p': '把瓶盖握在手里，直到找到垃圾桶。抵达海洋的垃圾，绝大部分始于陆地。',
    'act.a3t': '分类回收', 'act.a3p': '查一查你所在城市的回收规则：瓶盖也能被回收——前提是它被单独分出、干净地送到。',
    'act.a4t': '讲出去', 'act.a4p': '分享这部短片。一个五十秒的故事，比一个三厘米的物件走得更远。',
    'act.close': '这只瓶盖的旅程由我们决定：它在哪里结束，以及持续多久。',

    'cred.kicker': '幕后',
    'cred.title': '一部与人机共同完成的短片',
    'cred.lead': '画面由模型生成，脚本由语言模型撰写，网站由代码写成。而意图——以及责任——属于人。',
    'cred.d1': '导演与美术', 'cred.d2': '视频生成', 'cred.d3': '剧本与文字',
    'cred.d4': '生成界面', 'cred.d5': '编程',
    'cred.caption': '影片最后一帧。',

    'foot.line': '静态站点 · 仅用 HTML、CSS 与 JavaScript，无外部依赖。<br>视频从本地文件播放：不会上传任何内容到网络。',
    'foot.top': '回到顶部'
  };

  const meta = {
    es: {
      title: 'Una tapa de botella — El viaje de un objeto mínimo',
      desc: 'Corto animado sobre el viaje de una tapa de botella: del bolsillo de un niño al fondo del océano. Una historia mínima sobre un objeto que casi nunca miramos.'
    },
    zh: {
      title: '一只瓶盖的旅程 — 一个微小物件的远行',
      desc: '一部关于瓶盖旅程的动画短片：从男孩的手中，到海洋深处。一个几乎从不被注视的物件的故事。'
    }
  };

  /* Guardamos el texto original en español para poder volver a él. */
  const esCache = new Map();
  $$('[data-i18n]').forEach(el => esCache.set(el.dataset.i18n, el.innerHTML));

  const applyLang = (lang) => {
    state.lang = lang === 'zh' ? 'zh' : 'es';
    const dict = state.lang === 'zh' ? zh : null;

    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = dict && dict[key] !== undefined ? dict[key] : esCache.get(key);
      if (value !== undefined) el.innerHTML = value;
    });

    // etiquetas de accesibilidad estáticas
    bigPlay.setAttribute('aria-label', L().play);
    seek.setAttribute('aria-label', L().seek);
    syncPlayLabel();
    syncMuteLabel();
    fsBtn.setAttribute('aria-label', isFs() ? L().exit : L().fs);

    document.documentElement.lang = state.lang;
    document.title = meta[state.lang].title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta[state.lang].desc);

    $$('.lang__btn').forEach(b => {
      const on = b.dataset.lang === state.lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    try { localStorage.setItem('tapa-lang', state.lang); } catch (e) { /* modo privado */ }

    const live = $('#live');
    if (live) live.textContent = state.lang === 'zh' ? '语言：中文' : 'Idioma: español';

    buildMarquee(state.lang);

    // las tipografías cambian de métrica: recalculamos la altura del hero
    onScroll();
  };

  $$('.lang__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === state.lang) return;
      applyLang(btn.dataset.lang);
    });
  });

  let saved = 'es';
  try { saved = localStorage.getItem('tapa-lang') || 'es'; } catch (e) { /* nada */ }

  // ?lang=zh permite enlazar directamente la versión china
  const urlLang = new URLSearchParams(location.search).get('lang');
  const initialLang = (urlLang === 'zh' || urlLang === 'es') ? urlLang : saved;
  if (initialLang === 'zh') applyLang('zh');

  /* ── 6. Detalles finales ─────────────────────────────────── */

  // Evita que el vídeo siga sonando al salir de la página.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !video.paused) video.pause();
  });

  // Si el navegador bloquea la reproducción automática, mostramos el botón.
  syncPlayLabel();
})();
