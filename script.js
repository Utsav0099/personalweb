(function () {
  'use strict';

  // =====================================================
  // FIREBASE INITIALIZATION (your config)
  // =====================================================
  const firebaseConfig = {
    apiKey: "AIzaSyDar4CBj2gpOOt9HLGpPCk817pCJDBmidA",
    authDomain: "formykanchi.firebaseapp.com",
    projectId: "formykanchi",
    storageBucket: "formykanchi.firebasestorage.app",
    messagingSenderId: "901494864134",
    appId: "1:901494864134:web:eee0fb2697804e0fd58687",
    measurementId: "G-60070SSK3H"
  };

  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const storage = firebase.storage();

  // =====================================================
  // AUDIO ENGINE (same as before)
  // =====================================================
  const AudioEngine = (function () {
    let ctx = null;
    function init() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    }
    function playTone(freq, type = 'sine', duration = 0.15, vol = 0.3, delay = 0) {
      try {
        init();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration + 0.01);
      } catch (e) {}
    }
    function chord(freqs, duration = 0.3, vol = 0.2) {
      freqs.forEach((f, i) => playTone(f, 'sine', duration, vol, i * 0.04));
    }
    const sfx = {
      click()    { playTone(880, 'sine', 0.08, 0.25); },
      kiss()     { chord([523, 659, 784], 0.5, 0.2); playTone(1047, 'sine', 0.4, 0.15, 0.3); },
      superKiss(){ [523,587,659,698,784,880,988,1047].forEach((f,i)=>playTone(f,'sine',0.3,0.18,i*0.06)); },
      win()      { [523,587,659,698,784,880,988,1047].forEach((f,i)=>playTone(f,'triangle',0.4,0.2,i*0.08)); },
      match()    { chord([659,784,988], 0.4, 0.25); },
      wrong()    { playTone(200, 'sawtooth', 0.2, 0.2); },
      correct()  { chord([784,988,1175], 0.4, 0.2); },
      fortune()  { [880,1108,1319,1760].forEach((f,i)=>playTone(f,'sine',0.5,0.15,i*0.12)); },
      heartClick(){ playTone(440+Math.random()*200, 'sine', 0.12, 0.3); },
      upgrade()  { [523,659,784,1047].forEach((f,i)=>playTone(f,'triangle',0.3,0.2,i*0.07)); },
      mazeMove() { playTone(300+Math.random()*100,'sine',0.06,0.15); },
      mazeWin()  { [523,659,784,1047,1319].forEach((f,i)=>playTone(f,'sine',0.4,0.2,i*0.1)); },
      snakeEat() { playTone(700,'sine',0.1,0.2); playTone(900,'sine',0.1,0.2,0.06); },
      snakeDie() { [440,330,220,110].forEach((f,i)=>playTone(f,'sawtooth',0.2,0.25,i*0.1)); },
      catch()    { chord([784,988], 0.2, 0.25); },
    };
    let bgInterval = null;
    const melody = [523,659,784,659,880,784,659,523,587,740,880,740];
    let mIdx = 0;
    let bgEnabled = false;
    function startBgMusic() {
      bgEnabled = true;
      if (bgInterval) return;
      bgInterval = setInterval(() => {
        if (!bgEnabled) return;
        playTone(melody[mIdx % melody.length], 'sine', 0.6, 0.08);
        mIdx++;
      }, 600);
    }
    function stopBgMusic() { bgEnabled = false; }
    function toggleBgMusic() { bgEnabled ? stopBgMusic() : startBgMusic(); return bgEnabled; }
    return { sfx, startBgMusic, stopBgMusic, toggleBgMusic, init };
  })();

  // =====================================================
  // UTILITY HELPERS
  // =====================================================
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  function toast(msg, duration = 2500) {
    const t = el('div', 'toast', msg);
    $('toastContainer').appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }, duration);
  }

  function showWin(emoji, title, sub) {
    $('winEmoji').textContent = emoji;
    $('winTitle').textContent = title;
    $('winSub').textContent = sub;
    $('winModal').classList.remove('hidden');
    AudioEngine.sfx.win();
    burst(60);
  }

  // =====================================================
  // GLOBAL STATE (per user, stored in localStorage)
  // =====================================================
  const state = {
    kisses: parseInt(localStorage.getItem('kisses') || '0'),
    hearts: parseInt(localStorage.getItem('hearts') || '0'),
    lovePoints: parseInt(localStorage.getItem('lovePoints') || '0'),
    streak: 0,
    musicOn: false
  };

  function saveState() {
    localStorage.setItem('kisses', state.kisses);
    localStorage.setItem('hearts', state.hearts);
    localStorage.setItem('lovePoints', state.lovePoints);
  }

  function updateStats() {
    $('totalKisses').textContent = state.kisses;
    $('totalHearts').textContent = state.hearts;
    $('lovePoints').textContent  = state.lovePoints;
    $('clickerPoints').textContent = state.lovePoints;

    const start = new Date('2024-12-10T00:00:00');
    const diff  = Math.floor((Date.now() - start) / (1000*60*60*24));
    $('daysCount').textContent = diff;

    const pct = Math.min(100, 60 + (state.kisses + state.hearts) % 40);
    $('miniMeter').style.width = pct + '%';
    $('miniPercent').textContent = '∞%';
  }

  // =====================================================
  // CURSOR TRAIL (unchanged)
  // =====================================================
  function initTrail() {
    const canvas = $('trailCanvas');
    const ctx = canvas.getContext('2d');
    const points = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => {
      points.push({ x: e.clientX, y: e.clientY, age: 0, emoji: Math.random() < 0.3 ? '💕' : null });
      if (points.length > 35) points.shift();
    });
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      points.forEach((p, i) => {
        p.age++;
        const alpha = 1 - p.age / 40;
        if (alpha <= 0) return;
        const size = (1 - i / points.length) * 12 + 4;
        ctx.globalAlpha = alpha;
        if (p.emoji) {
          ctx.font = `${size * 2}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
          ctx.fillText(p.emoji, p.x - size, p.y + size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${330 + i * 2}, 90%, 65%)`;
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    draw();
  }

  // =====================================================
  // PARTICLES (unchanged)
  // =====================================================
  function initParticles() {
    const container = $('particles');
    const emojis = ['💕','💖','💗','💘','💝','🌸','✨','🌹','💫','🦋'];
    function spawn() {
      const p = el('div', 'particle', emojis[Math.floor(Math.random() * emojis.length)]);
      const size = Math.random() * 18 + 10;
      const dur  = Math.random() * 8 + 6;
      const left = Math.random() * 100;
      p.style.cssText = `left:${left}vw; bottom:-30px; font-size:${size}px; animation-duration:${dur}s;`;
      container.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000);
    }
    setInterval(spawn, 800);
  }

  // =====================================================
  // BURST (unchanged)
  // =====================================================
  function burst(count = 15, x = null, y = null) {
    const cx = x || window.innerWidth / 2;
    const cy = y || window.innerHeight / 2;
    const container = $('floatHearts');
    const emojis = ['💖','💕','💗','💘','💝','💞','💓','✨','🌸','🌹'];
    for (let i = 0; i < count; i++) {
      const h = el('div', 'float-heart', emojis[Math.floor(Math.random() * emojis.length)]);
      const ox = (Math.random() - 0.5) * 160;
      const oy = Math.random() * 80 + 40;
      h.style.cssText = `left:${cx + ox}px; top:${cy}px; font-size:${Math.random()*22+14}px; animation-duration:${Math.random()*1+1.5}s; --tx:${ox}px; --ty:${-oy - 80}px;`;
      h.style.setProperty('--tx', ox + 'px');
      h.style.setProperty('--ty', (-oy - 80) + 'px');
      container.appendChild(h);
      setTimeout(() => h.remove(), 3000);
    }
  }
  document.addEventListener('click', e => { if (e.target.tagName !== 'CANVAS') burst(8, e.clientX, e.clientY); });

  // =====================================================
  // WELCOME SCREEN (unchanged)
  // =====================================================
  function initWelcome() {
    $('startBtn').addEventListener('click', () => {
      AudioEngine.init();
      $('welcomeScreen').classList.add('fade-out');
      $('mainApp').classList.remove('hidden');
      AudioEngine.sfx.win();
      setTimeout(() => AudioEngine.startBgMusic(), 600);
      state.musicOn = true;
      setTimeout(() => {
        $('welcomeScreen').remove();
        initScrollReveal();
      }, 900);
    });
  }

  // =====================================================
  // MUSIC TOGGLE (unchanged)
  // =====================================================
  function initMusicToggle() {
    $('musicToggle').addEventListener('click', () => {
      const on = AudioEngine.toggleBgMusic();
      state.musicOn = on;
      $('musicToggle').textContent = on ? '🔊' : '🔇';
      AudioEngine.sfx.click();
    });
  }

  // =====================================================
  // DARK MODE (unchanged)
  // =====================================================
  function initThemeToggle() {
    $('themeToggle').addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      $('themeToggle').textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
      AudioEngine.sfx.click();
    });
  }

  // =====================================================
  // WIN MODAL CLOSE (unchanged)
  // =====================================================
  $('winClose').addEventListener('click', () => {
    $('winModal').classList.add('hidden');
  });

  // =====================================================
  // SCROLL REVEAL (unchanged)
  // =====================================================
  function initScrollReveal() {
    const sections = document.querySelectorAll('.section');
    const promises = document.querySelectorAll('.promise-card');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          const delay = entry.target.dataset.delay;
          if (delay) entry.target.style.transitionDelay = delay + 'ms';
        }
      });
    }, { threshold: 0.1 });
    sections.forEach(s => io.observe(s));
    promises.forEach(p => io.observe(p));
  }

  // =====================================================
  // MAZE GAME (unchanged)
  // =====================================================
  function initMaze() {
    const canvas = $('mazeCanvas');
    const ctx = canvas.getContext('2d');
    const CELL = 40;
    const COLS = 8, ROWS = 8;
    function generateMaze(cols, rows) {
      const grid = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({ r, c, walls: { top: true, right: true, bottom: true, left: true }, visited: false }))
      );
      function neighbors(r, c) {
        const ns = [];
        if (r > 0) ns.push(grid[r-1][c]);
        if (r < rows-1) ns.push(grid[r+1][c]);
        if (c > 0) ns.push(grid[r][c-1]);
        if (c < cols-1) ns.push(grid[r][c+1]);
        return ns.filter(n => !n.visited);
      }
      function removeWall(a, b) {
        if (a.r === b.r) {
          if (a.c < b.c) { a.walls.right = false; b.walls.left = false; }
          else { a.walls.left = false; b.walls.right = false; }
        } else {
          if (a.r < b.r) { a.walls.bottom = false; b.walls.top = false; }
          else { a.walls.top = false; b.walls.bottom = false; }
        }
      }
      const stack = [];
      const start = grid[0][0];
      start.visited = true;
      stack.push(start);
      while (stack.length) {
        const cur = stack[stack.length - 1];
        const ns = neighbors(cur.r, cur.c);
        if (ns.length) {
          const next = ns[Math.floor(Math.random() * ns.length)];
          removeWall(cur, next);
          next.visited = true;
          stack.push(next);
        } else {
          stack.pop();
        }
      }
      return grid;
    }
    let grid = generateMaze(COLS, ROWS);
    let player = { r: 0, c: 0 };
    let moves = 0, elapsed = 0, timerInterval = null;
    function startTimer() {
      clearInterval(timerInterval);
      timerInterval = setInterval(() => { elapsed++; $('mazeTime').textContent = 'Time: ' + elapsed + 's'; }, 1000);
    }
    function drawMaze() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bg = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
      bg.addColorStop(0, 'rgba(255,240,246,0.6)');
      bg.addColorStop(1, 'rgba(255,182,193,0.4)');
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save();
      const gx = (COLS-1)*CELL+CELL/2, gy = (ROWS-1)*CELL+CELL/2;
      const grd = ctx.createRadialGradient(gx,gy,2,gx,gy,CELL);
      grd.addColorStop(0,'rgba(255,215,0,0.6)');
      grd.addColorStop(1,'rgba(255,215,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.restore();
      ctx.strokeStyle = 'rgba(201,24,74,0.8)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = grid[r][c];
          const x = c * CELL, y = r * CELL;
          if (cell.walls.top)    { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+CELL,y); ctx.stroke(); }
          if (cell.walls.right)  { ctx.beginPath(); ctx.moveTo(x+CELL,y); ctx.lineTo(x+CELL,y+CELL); ctx.stroke(); }
          if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x,y+CELL); ctx.lineTo(x+CELL,y+CELL); ctx.stroke(); }
          if (cell.walls.left)   { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+CELL); ctx.stroke(); }
        }
      }
      ctx.font = `${CELL*0.7}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💖', (COLS-1)*CELL+CELL/2, (ROWS-1)*CELL+CELL/2);
      const px = player.c*CELL+CELL/2, py = player.r*CELL+CELL/2;
      const grad = ctx.createRadialGradient(px,py,2,px,py,CELL*0.38);
      grad.addColorStop(0,'#ff4d8d');
      grad.addColorStop(1,'rgba(255,77,141,0.3)');
      ctx.beginPath();
      ctx.arc(px, py, CELL*0.32, 0, Math.PI*2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.font = `${CELL*0.5}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText('💗', px, py+2);
    }
    function canMove(r, c, dir) { return !grid[r][c].walls[dir]; }
    function move(dr, dc, dir) {
      const nr = player.r + dr, nc = player.c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
      if (!canMove(player.r, player.c, dir)) return;
      player.r = nr; player.c = nc;
      moves++;
      $('mazeMoves').textContent = 'Moves: ' + moves;
      AudioEngine.sfx.mazeMove();
      drawMaze();
      if (player.r === ROWS-1 && player.c === COLS-1) {
        clearInterval(timerInterval);
        setTimeout(() => {
          $('mazeOverlay').classList.remove('hidden');
          AudioEngine.sfx.mazeWin();
          burst(50);
          showWin('💖', 'You Found My Heart!', `Completed in ${moves} moves and ${elapsed} seconds! 💕`);
        }, 200);
      }
    }
    $('mUp').addEventListener('click',    () => move(-1, 0, 'top'));
    $('mDown').addEventListener('click',  () => move(1, 0, 'bottom'));
    $('mLeft').addEventListener('click',  () => move(0, -1, 'left'));
    $('mRight').addEventListener('click', () => move(0, 1, 'right'));
    document.addEventListener('keydown', e => {
      const map = { ArrowUp:['top',-1,0], ArrowDown:['bottom',1,0], ArrowLeft:['left',0,-1], ArrowRight:['right',0,1] };
      if (map[e.key]) { e.preventDefault(); move(map[e.key][1], map[e.key][2], map[e.key][0]); }
    });
    function resetMaze() {
      grid = generateMaze(COLS, ROWS);
      player = { r:0, c:0 };
      moves = 0; elapsed = 0;
      $('mazeMoves').textContent = 'Moves: 0';
      $('mazeTime').textContent  = 'Time: 0s';
      $('mazeOverlay').classList.add('hidden');
      clearInterval(timerInterval);
      startTimer();
      drawMaze();
    }
    $('resetMazeBtn').addEventListener('click', resetMaze);
    $('mazeReplayBtn').addEventListener('click', resetMaze);
    startTimer();
    drawMaze();
  }

  // =====================================================
  // MEMORY GAME (unchanged)
  // =====================================================
  function initMemory() {
    const symbols = ['💕','💖','💗','💘','💝','💞','💓','💟','🌸','🌹','✨','🦋','🌙','⭐','🎀','🍓'];
    let cards = [], flipped = [], matched = 0, memMoves = 0, memElapsed = 0, timerInt = null;
    function buildGrid() {
      const chosen = symbols.slice(0, 8);
      cards = shuffle([...chosen, ...chosen]);
      flipped = []; matched = 0; memMoves = 0; memElapsed = 0;
      $('memPairs').textContent = '0';
      $('memMoves').textContent = '0';
      $('memTime').textContent  = '0s';
      clearInterval(timerInt);
      timerInt = setInterval(() => { memElapsed++; $('memTime').textContent = memElapsed + 's'; }, 1000);
      render();
    }
    function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
    function render() {
      const grid = $('memoryGrid');
      grid.innerHTML = '';
      cards.forEach((sym, idx) => {
        const card = el('div', 'mem-card');
        const back  = el('div', 'mem-card-back', '💝');
        const front = el('div', 'mem-card-front', sym);
        card.appendChild(back);
        card.appendChild(front);
        if (flipped.includes(idx) || matchedCards.has(idx)) card.classList.add('flipped');
        if (matchedCards.has(idx)) card.classList.add('matched');
        card.addEventListener('click', () => clickCard(idx, card));
        grid.appendChild(card);
      });
    }
    const matchedCards = new Set();
    let processing = false;
    function clickCard(idx) {
      if (processing) return;
      if (matchedCards.has(idx)) return;
      if (flipped.includes(idx)) return;
      flipped.push(idx);
      render();
      AudioEngine.sfx.click();
      if (flipped.length === 2) {
        processing = true;
        memMoves++;
        $('memMoves').textContent = memMoves;
        const [a, b] = flipped;
        if (cards[a] === cards[b]) {
          matchedCards.add(a); matchedCards.add(b);
          matched++;
          $('memPairs').textContent = matched;
          setTimeout(() => {
            AudioEngine.sfx.match();
            flipped = [];
            processing = false;
            render();
            if (matched === 8) {
              clearInterval(timerInt);
              setTimeout(() => showWin('🎉', 'Perfect Memory!', `Matched all pairs in ${memMoves} moves & ${memElapsed}s! Just like us — a perfect match! 💞`), 300);
            }
          }, 400);
        } else {
          setTimeout(() => {
            AudioEngine.sfx.wrong();
            flipped = [];
            processing = false;
            render();
          }, 700);
        }
      }
    }
    $('resetMemoryBtn').addEventListener('click', () => {
      matchedCards.clear();
      buildGrid();
      AudioEngine.sfx.click();
    });
    buildGrid();
  }

  // =====================================================
  // CATCH GAME (unchanged)
  // =====================================================
  function initCatch() {
    const zone = $('catchZone');
    let caught = 0, missed = 0, score = 0, gameInt = null, active = false;
    const emojis = ['💋','😘','💖','💕','❤️','🌹','💗','💝'];
    function spawnTarget() {
      const zone_w = zone.clientWidth - 50;
      const zone_h = zone.clientHeight - 50;
      const t = el('div', 'catch-target', emojis[Math.floor(Math.random()*emojis.length)]);
      const x = Math.random() * zone_w;
      const y = Math.random() * zone_h;
      t.style.left = x + 'px';
      t.style.top  = y + 'px';
      t.style.animationDuration = (Math.random()*0.3+0.2) + 's';
      let alive = true;
      t.addEventListener('click', () => {
        if (!alive) return;
        alive = false;
        caught++;
        score += 10;
        updateCatchUI();
        AudioEngine.sfx.catch();
        burst(10, x + zone.getBoundingClientRect().left, y + zone.getBoundingClientRect().top);
        $('catchMsg').textContent = ['💋 Got it!','😍 Amazing!','💕 Yes!','🎉 Caught it!'][Math.floor(Math.random()*4)];
        t.style.transform = 'scale(2)';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
      });
      zone.appendChild(t);
      const moveInt = setInterval(() => {
        if (!alive || !active) { clearInterval(moveInt); return; }
        const nx = Math.random() * (zone.clientWidth - 50);
        const ny = Math.random() * (zone.clientHeight - 50);
        t.style.left = nx + 'px';
        t.style.top  = ny + 'px';
      }, 600);
      setTimeout(() => {
        if (!alive) return;
        alive = false;
        clearInterval(moveInt);
        missed++;
        score = Math.max(0, score - 5);
        updateCatchUI();
        $('catchMsg').textContent = ['😢 Missed!','🙈 Too slow!','💔 Oops!'][Math.floor(Math.random()*3)];
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
      }, 2000);
    }
    function updateCatchUI() {
      $('caughtCount').textContent = caught;
      $('missedCount').textContent = missed;
      $('catchScore').textContent  = score;
    }
    $('startCatch').addEventListener('click', () => {
      if (active) return;
      active = true; caught = 0; missed = 0; score = 0;
      zone.innerHTML = '';
      updateCatchUI();
      $('catchMsg').textContent = 'Catch the kisses! 💋';
      AudioEngine.sfx.click();
      gameInt = setInterval(spawnTarget, 900);
      setTimeout(() => {
        clearInterval(gameInt);
        active = false;
        zone.innerHTML = '';
        showWin('💋', `Score: ${score}!`, `You caught ${caught} kisses and missed ${missed}! ${caught > 10 ? 'Amazing! 🌟' : 'Keep trying! 💕'}`);
      }, 30000);
    });
    $('stopCatch').addEventListener('click', () => {
      clearInterval(gameInt);
      active = false;
      zone.innerHTML = '';
      $('catchMsg').textContent = 'Game stopped! Score: ' + score;
      AudioEngine.sfx.click();
    });
  }

  // =====================================================
  // SNAKE GAME (unchanged)
  // =====================================================
  function initSnake() {
    const canvas = $('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const CELL = 20;
    const COLS = 16, ROWS = 16;
    let snake, dir, nextDir, food, gameInt, score, highScore = 0, level, running = false;
    function init() {
      snake = [{ x:4, y:8 }, { x:3, y:8 }, { x:2, y:8 }];
      dir = { x:1, y:0 };
      nextDir = { x:1, y:0 };
      score = 0;
      level = 1;
      placeFood();
      $('snakeScore').textContent = 0;
      $('snakeLevel').textContent = 1;
    }
    function placeFood() {
      let pos;
      do { pos = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) }; } while (snake.some(s => s.x === pos.x && s.y === pos.y));
      food = pos;
    }
    function draw() {
      const bg = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
      bg.addColorStop(0,'rgba(255,240,246,0.7)');
      bg.addColorStop(1,'rgba(255,220,235,0.7)');
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle = 'rgba(255,77,141,0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x*CELL,0); ctx.lineTo(x*CELL,canvas.height); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*CELL); ctx.lineTo(canvas.width,y*CELL); ctx.stroke(); }
      ctx.font = `${CELL*0.9}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💖', food.x*CELL+CELL/2, food.y*CELL+CELL/2);
      snake.forEach((seg, i) => {
        const ratio = 1 - i / snake.length;
        ctx.fillStyle = `hsl(${330 + i*3}, 80%, ${40 + ratio*25}%)`;
        const margin = i === 0 ? 1 : 3;
        const radius = i === 0 ? 8 : 5;
        roundRect(ctx, seg.x*CELL+margin, seg.y*CELL+margin, CELL-margin*2, CELL-margin*2, radius);
        ctx.fill();
        if (i === 0) {
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(seg.x*CELL+CELL*0.3, seg.y*CELL+CELL*0.35, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(seg.x*CELL+CELL*0.7, seg.y*CELL+CELL*0.35, 3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#111';
          ctx.beginPath(); ctx.arc(seg.x*CELL+CELL*0.3, seg.y*CELL+CELL*0.35, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(seg.x*CELL+CELL*0.7, seg.y*CELL+CELL*0.35, 1.5, 0, Math.PI*2); ctx.fill();
        }
      });
    }
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y);
      ctx.arcTo(x+w, y, x+w, y+r, r);
      ctx.lineTo(x+w, y+h-r);
      ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
      ctx.lineTo(x+r, y+h);
      ctx.arcTo(x, y+h, x, y+h-r, r);
      ctx.lineTo(x, y+r);
      ctx.arcTo(x, y, x+r, y, r);
      ctx.closePath();
    }
    function step() {
      dir = { ...nextDir };
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return die();
      if (snake.some(s => s.x === head.x && s.y === head.y)) return die();
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10 * level;
        if (score >= level * 100) level++;
        $('snakeScore').textContent = score;
        $('snakeLevel').textContent = level;
        AudioEngine.sfx.snakeEat();
        toast('💖 +' + (10*level) + ' Love Points!');
        state.lovePoints += 5;
        placeFood();
        clearInterval(gameInt);
        gameInt = setInterval(step, Math.max(80, 200 - level*20));
      } else {
        snake.pop();
      }
      draw();
    }
    function die() {
      clearInterval(gameInt);
      running = false;
      AudioEngine.sfx.snakeDie();
      if (score > highScore) {
        highScore = score;
        $('snakeHigh').textContent = highScore;
        showWin('🏆', 'New High Score!', `Score: ${score}! The snake grew so long with love! 🐍💕`);
      } else {
        toast('💔 Game Over! Score: ' + score);
      }
    }
    $('startSnake').addEventListener('click', () => {
      if (running) { clearInterval(gameInt); running = false; }
      init();
      running = true;
      AudioEngine.sfx.click();
      gameInt = setInterval(step, 200);
    });
    const dirMap = {
      ArrowUp:   {x:0,y:-1,opp:{x:0,y:1}},
      ArrowDown: {x:0,y:1,opp:{x:0,y:-1}},
      ArrowLeft: {x:-1,y:0,opp:{x:1,y:0}},
      ArrowRight:{x:1,y:0,opp:{x:-1,y:0}}
    };
    document.addEventListener('keydown', e => {
      const d = dirMap[e.key];
      if (d && !(dir.x === d.opp.x && dir.y === d.opp.y)) { e.preventDefault(); nextDir = { x:d.x, y:d.y }; }
    });
    $('sUp').addEventListener('click',    () => { if (dir.y !== 1)  nextDir = {x:0,y:-1}; });
    $('sDown').addEventListener('click',  () => { if (dir.y !== -1) nextDir = {x:0,y:1}; });
    $('sLeft').addEventListener('click',  () => { if (dir.x !== 1)  nextDir = {x:-1,y:0}; });
    $('sRight').addEventListener('click', () => { if (dir.x !== -1) nextDir = {x:1,y:0}; });
    init();
    draw();
  }

  // =====================================================
  // QUIZ (unchanged)
  // =====================================================
  function initQuiz() {
    const questions = [
      { q: "What is Utsav's nickname for Ankita?", opts: ["Sweetie","Kanchi","Baby","Love"], a: 1, fun: "Yes! Kanchi is the most special name! 💕" },
      { q: "Where did Utsav and Ankita first meet?", opts: ["College","Online","Park","Iskcon"], a: 3, fun: "Iskcon — where it all began! 🌸" },
      { q: "What does Ankita's smile do to Utsav?", opts: ["Nothing","Annoys him","Makes his day","Worries him"], a: 2, fun: "Your smile lights up his whole world! ☀️" },
      { q: "How much does Utsav love Ankita?", opts: ["A little","Sometimes","A lot","Infinitely — beyond all words"], a: 3, fun: "Infinitely! More than the stars in the sky! ✨" },
      { q: "What language did Utsav write the love poem in?", opts: ["Hindi","English","Nepali","Sanskrit"], a: 2, fun: "Nepali — the language of their hearts! 🇳🇵" },
      { q: "What is the symbol of their forever love?", opts: ["💍","♾️","🌹","⭐"], a: 1, fun: "♾️ — Infinity! No beginning, no end! 💞" },
      { q: "What does Utsav promise to do when Ankita is sad?", opts: ["Ignore her","Make her laugh","Leave her alone","Watch TV"], a: 1, fun: "He'll always make you laugh! 😂💕" },
      { q: "What's the color of their love?", opts: ["Blue","Yellow","Pink","All colors"], a: 3, fun: "All the colors of the rainbow, and more! 🌈" },
      { q: "How long will Utsav love Ankita?", opts: ["A year","Forever","Until graduation","5 years"], a: 1, fun: "Forever and beyond! In every life after this! 💖" },
      { q: "What does Utsav call this website?", opts: ["A project","For My Kanchi","Random","Homework"], a: 1, fun: "'For My Kanchi' — made with infinite love! 💌" }
    ];
    let qIdx = 0, correctCount = 0;
    const total = questions.length;
    function loadQ() {
      if (qIdx >= total) { showResult(); return; }
      const q = questions[qIdx];
      $('quizBar').style.width = (qIdx / total * 100) + '%';
      $('quizQuestion').textContent = (qIdx + 1) + '. ' + q.q;
      $('quizOptions').innerHTML = '';
      $('quizFeedback').classList.add('hidden');
      q.opts.forEach((opt, i) => {
        const btn = el('button', 'quiz-opt', opt);
        btn.addEventListener('click', () => answerQ(i, q, btn));
        $('quizOptions').appendChild(btn);
      });
    }
    function answerQ(i, q, btn) {
      document.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);
      if (i === q.a) {
        btn.classList.add('correct');
        correctCount++;
        AudioEngine.sfx.correct();
        $('quizFeedback').textContent = '✅ ' + q.fun;
        $('quizFeedback').classList.remove('hidden');
        burst(20);
      } else {
        btn.classList.add('wrong');
        document.querySelectorAll('.quiz-opt')[q.a].classList.add('correct');
        AudioEngine.sfx.wrong();
        $('quizFeedback').textContent = '💡 ' + q.fun;
        $('quizFeedback').classList.remove('hidden');
      }
      setTimeout(() => { qIdx++; loadQ(); }, 1800);
    }
    function showResult() {
      $('quizBar').style.width = '100%';
      $('quizQuestion').textContent = '';
      $('quizOptions').innerHTML = '';
      $('quizFeedback').classList.add('hidden');
      $('quizResult').classList.remove('hidden');
      const pct = Math.round(correctCount / total * 100);
      let grade = pct === 100 ? '💯 Perfect Score! You know us perfectly! 💑' :
                  pct >= 70  ? '🌟 Amazing! You know our love so well!' :
                  pct >= 50  ? '💕 Good job! Love grows with every try!' :
                               '😊 Keep learning our story — it\'s a beautiful one!';
      $('quizResult').innerHTML = `
        <div style="font-size:3rem">🎊</div>
        <div>${correctCount}/${total} Correct!</div>
        <div style="font-size:1.2rem;margin-top:12px">${grade}</div>
        <button class="glass-btn small" id="quizRestart" style="margin-top:20px">Play Again 🔄</button>
      `;
      AudioEngine.sfx.win();
      burst(40);
      $('quizRestart').addEventListener('click', () => {
        qIdx = 0; correctCount = 0;
        $('quizResult').classList.add('hidden');
        loadQ();
      });
    }
    loadQ();
  }

  // =====================================================
  // FORTUNE TELLER (unchanged)
  // =====================================================
  function initFortune() {
    const fortunes = [
      "Today, Utsav is thinking of you every single second. 💭",
      "A warm hug is coming your way — probably from Utsav! 🤗",
      "Your smile today will make someone's entire week. 😊",
      "You are loved more deeply than the ocean and more steadily than the stars. 🌊⭐",
      "Something wonderful is about to happen — just like when you two met. 🌸",
      "Utsav's love for you grows stronger with every breath he takes. 💖",
      "Today is a perfect day to be happy — because you are cherished. ✨",
      "The universe conspired to bring you two together. It will keep you together. 🌌",
      "तिम्रो माया ले मेरो संसार पूरा छ — Utsav's heart says this every day. 💕",
      "Your love story isn't just beautiful — it's legendary. 📖",
      "A special surprise from Utsav is closer than you think... 🎁",
      "You are the reason the world is more beautiful. Never forget that. 🌍💖",
      "Every morning, Utsav smiles thinking about you. That's the best alarm clock. ☀️",
      "Love like yours only comes once in a lifetime — treasure it. 💍",
      "आज तिमीलाई धेरै माया गरिन्छ — Today you are deeply loved! 🇳🇵❤️"
    ];
    let shaking = false;
    $('crystalBall').addEventListener('click', () => {
      if (shaking) return;
      shaking = true;
      AudioEngine.sfx.fortune();
      const ball = $('crystalBall');
      ball.style.transition = 'transform 0.1s';
      let shakeCount = 0;
      const shakeInt = setInterval(() => {
        ball.style.transform = shakeCount % 2 === 0 ? 'scale(1.1) rotate(-5deg)' : 'scale(1.1) rotate(5deg)';
        shakeCount++;
        if (shakeCount > 8) {
          clearInterval(shakeInt);
          ball.style.transform = '';
          shaking = false;
          const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
          const ft = $('fortuneText');
          ft.textContent = fortune;
          ft.classList.remove('hidden');
          ft.style.animation = 'none';
          requestAnimationFrame(() => { ft.style.animation = ''; });
          burst(20);
        }
      }, 80);
    });
  }

  // =====================================================
  // KISS COUNTER (unchanged)
  // =====================================================
  function initKissCounter() {
    function renderKiss() {
      $('kissNumber').textContent = state.kisses;
      $('totalKisses').textContent = state.kisses;
      $('kissStreak').textContent  = state.streak;
    }
    $('kissBtn').addEventListener('click', () => {
      state.kisses++; state.streak++; state.lovePoints += 3;
      renderKiss(); saveState(); updateStats();
      AudioEngine.sfx.kiss();
      const anim = $('kissAnim');
      anim.classList.remove('pop');
      requestAnimationFrame(() => anim.classList.add('pop'));
      if (state.streak % 10 === 0) { toast(`🔥 ${state.streak} kiss streak! You're on fire!`); burst(30); }
    });
    $('superKissBtn').addEventListener('click', () => {
      state.kisses += 10; state.streak += 10; state.lovePoints += 30;
      renderKiss(); saveState(); updateStats();
      AudioEngine.sfx.superKiss(); burst(60); toast('💋💋💋 SUPER KISS! ×10! 💋💋💋');
    });
    renderKiss();
  }

  // =====================================================
  // LOVE CLICKER (unchanged)
  // =====================================================
  function initClicker() {
    let autoRate = 0;
    const upgrades = [
      { id:'upg1', cost:50,   rate:1  },
      { id:'upg2', cost:200,  rate:5  },
      { id:'upg3', cost:1000, rate:20 },
      { id:'upg4', cost:5000, rate:100 }
    ];
    const purchased = new Set();
    function renderClicker() {
      $('clickerPoints').textContent = Math.floor(state.lovePoints);
      $('clickerRate').textContent   = autoRate;
      $('lovePoints').textContent    = Math.floor(state.lovePoints);
      upgrades.forEach(u => {
        const btn = $(u.id);
        if (!btn) return;
        btn.disabled = state.lovePoints < u.cost || purchased.has(u.id);
        if (purchased.has(u.id)) btn.classList.add('purchased');
      });
    }
    $('clickerHeart').addEventListener('click', e => {
      state.lovePoints += 5;
      state.hearts++;
      $('totalHearts').textContent = state.hearts;
      saveState();
      AudioEngine.sfx.heartClick();
      renderClicker();
      const heart = $('clickerHeart');
      heart.classList.remove('clicked');
      requestAnimationFrame(() => heart.classList.add('clicked'));
      const plus = el('div', 'float-heart', '+5 💖');
      plus.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;font-size:16px;animation-duration:1.2s;`;
      $('floatHearts').appendChild(plus);
      setTimeout(() => plus.remove(), 1500);
    });
    upgrades.forEach(u => {
      const btn = $(u.id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (state.lovePoints < u.cost || purchased.has(u.id)) return;
        state.lovePoints -= u.cost;
        autoRate += u.rate;
        purchased.add(u.id);
        AudioEngine.sfx.upgrade();
        toast('✨ Upgrade purchased! +' + u.rate + '/sec');
        burst(25);
        renderClicker();
        $('clickerRate').textContent = autoRate;
      });
    });
    setInterval(() => {
      if (autoRate > 0) {
        state.lovePoints += autoRate / 10;
        renderClicker();
        if (Math.random() < 0.005) saveState();
      }
    }, 100);
    renderClicker();
  }

  // =====================================================
  // LOVE LETTER GENERATOR (unchanged)
  // =====================================================
  function initLetterGenerator() {
    let mood = 'romantic';
    const letters = {
      romantic: [
        (seed) => `My dearest Ankita,\n\nEvery morning I wake up and the first thought in my mind is you. ${seed ? 'The way you make me feel about ' + seed + ' is something I can never fully put into words.' : 'The way your voice sounds when you say my name is the most beautiful music I have ever heard.'}\n\nYou are not just the love of my life — you are my life itself. The days I spend with you feel like the universe is smiling at me. The days without you feel like waiting for sunrise.\n\nI love you more with every heartbeat. Every single one.\n\nForever and irrevocably yours,\nUtsav 💖`,
        (seed) => `My beautiful Ankita,\n\n${seed ? 'When I think about ' + seed + ', I think of you first. Always you.' : 'If I had to describe perfect, I would describe you.'} Your laugh is the sound that makes the whole world brighter. Your eyes hold entire galaxies I want to explore for a lifetime.\n\nWith you, I am home. With you, I am complete. With you, I am the luckiest person alive.\n\nAll my love, always,\nUtsav 💕`
      ],
      playful: [
        (seed) => `Hey Kanchi! 😜\n\nOkay so I was trying to be normal today but I kept thinking about ${seed || 'how cute your face is when you\'re annoyed at me'} and I just COULDN\'T. Like, who gave you the right to be so adorable?? Not fair!!\n\nI\'d write a longer letter but I\'m too busy thinking about you. Sorry not sorry. 😂\n\nYours (obviously),\nYour Utsav 💋`,
        (seed) => `Dearest Ankita AKA The Person Who Stole My Heart,\n\nJust wanted to officially inform you that ${seed ? 'every time you mention ' + seed : 'every time you smile'}, my brain stops working completely. I become a useless, giggling fool. I blame you entirely.\n\nSend help. Or another smile. Actually, just the smile.\n\nHelplessly yours,\nUtsav 🤡❤️`
      ],
      deep: [
        (seed) => `Ankita,\n\nI have been thinking about ${seed || 'the nature of love'} and how impossible it is to capture in words what I feel for you. It is not just emotion — it is recognition. The feeling that somewhere in a universe of infinite chance, we found each other.\n\nSometimes I watch you and I feel this terrifying, wonderful certainty that you are the reason I exist. Not the romantic cliché — a real, quiet truth that I carry with me every day.\n\nThank you for existing. Thank you for choosing me.\n\nWith every piece of me,\nUtsav 🌌`,
      ],
      nepali: [
        (seed) => `मेरी प्रिय अंकिता,\n\n${seed ? seed + ' को बारेमा सोच्दा सधैं तिम्रो अनुहार आउँछ मेरो मनमा।' : 'तिमीलाई माया गर्नु मेरो जीवनको सबैभन्दा सुन्दर काम हो।'}\n\nतिम्रो मुस्कान देख्दा मलाई लाग्छ संसारमा कुनै पनि समस्या छैन। तिम्रो हाँसो सुन्दा मेरो मन फूलझैं फुल्छ।\n\nम तिमीलाई माया गर्छु — आज, भोलि, र सधैं। यो संसार छाडेपछि पनि।\n\nतिम्रो मात्र,\nउत्सव 💖`,
      ],
      hindi: [
        (seed) => `मेरी जान अंकिता,\n\n${seed ? seed + ' के बारे में सोचते हुए तुम्हारा ख़याल आया।' : 'तुम्हारे बिना ये दुनिया अधूरी सी लगती है।'}\n\nतुम्हारी हँसी सुनकर दिल को सुकून मिलता है। तुम्हारी आँखों में देखकर लगता है — यही घर है, यही मंज़िल है।\n\nतुमसे प्यार करना मेरी सबसे बड़ी ख़ुशक़िस्मती है।\n\nहमेशा तुम्हारा,\nउत्सव 💕`
      ]
    };
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mood = btn.dataset.mood;
        AudioEngine.sfx.click();
      });
    });
    $('genLetterBtn').addEventListener('click', () => {
      const seed = $('letterSeed').value.trim();
      const moodLetters = letters[mood] || letters.romantic;
      const letter = moodLetters[Math.floor(Math.random() * moodLetters.length)](seed);
      const out = $('generatedLetterOutput');
      out.textContent = letter;
      out.classList.remove('hidden');
      const copyBtn = $('copyLetterBtn');
      copyBtn.classList.remove('hidden');
      AudioEngine.sfx.fortune();
      burst(20);
      toast('💌 Love letter generated!');
    });
    $('copyLetterBtn').addEventListener('click', () => {
      const text = $('generatedLetterOutput').textContent;
      navigator.clipboard.writeText(text).then(() => { toast('📋 Letter copied to clipboard! 💕'); AudioEngine.sfx.click(); }).catch(() => { toast('Copy from the letter manually 💕'); });
    });
  }

  // =====================================================
  // MUSIC PLAYER (real audio)
  // =====================================================
  function initMusicPlayer() {
    const playerAudio = $('playerAudio');
    const playlistTracks = [
      { name: "Perfect - Ed Sheeran", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
      { name: "Tum Hi Ho - Arijit Singh", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
      { name: "A Thousand Years - Christina Perri", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
      { name: "Tumse Hi - Mohit Chauhan", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
      { name: "Love Story - Taylor Swift", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-18.mp3" },
      { name: "तिम्रो माया (Original)", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" }
    ];
    const container = $('playlistItems');
    playlistTracks.forEach(track => {
      const div = el('div', 'playlist-item');
      div.innerHTML = `<span class="playlist-item-icon">🎵</span><div><div class="playlist-item-name">${track.name}</div></div>`;
      div.addEventListener('click', () => {
        playerAudio.src = track.src;
        playerAudio.play();
        document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
        div.classList.add('active');
        toast(`🎵 Playing: ${track.name}`);
      });
      container.appendChild(div);
    });
    playerAudio.addEventListener('play', () => {
      $('trackName').textContent = playlistTracks.find(t => playerAudio.src.includes(t.src))?.name || 'Unknown';
      $('vinyl').classList.add('spinning');
    });
    playerAudio.addEventListener('pause', () => $('vinyl').classList.remove('spinning'));
    playerAudio.addEventListener('ended', () => $('vinyl').classList.remove('spinning'));
    setInterval(() => {
      if (!playerAudio.paused && playerAudio.duration) {
        const prog = (playerAudio.currentTime / playerAudio.duration) * 100;
        $('trackProgress').style.width = prog + '%';
      } else {
        $('trackProgress').style.width = '0%';
      }
    }, 500);
  }

  // =====================================================
  // PHOTO GALLERY (shared via Firebase Storage)
  // =====================================================
  function initGallery() {
    const gallery = $('photoGallery');

    // Listen for existing images
    const imagesRef = storage.ref('gallery');
    imagesRef.listAll().then(res => {
      res.items.forEach(itemRef => {
        itemRef.getDownloadURL().then(url => {
          addImageToGallery(url);
        });
      });
    });

    function addImageToGallery(url) {
      const img = document.createElement('img');
      img.src = url;
      img.className = 'gallery-photo';
      img.addEventListener('click', () => openFullscreen(img));
      gallery.appendChild(img);
    }

    function openFullscreen(img) {
      const overlay = el('div');
      overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(10px)`;
      const big = el('img');
      big.src = img.src;
      big.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:20px;box-shadow:0 0 60px rgba(255,77,141,0.5)';
      overlay.appendChild(big);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    }

    // Upload handler
    $('photoUpload').addEventListener('change', e => {
      Array.from(e.target.files).forEach(file => {
        const uploadTask = storage.ref('gallery/' + Date.now() + '_' + file.name).put(file);
        uploadTask.on('state_changed', null, null, () => {
          uploadTask.snapshot.ref.getDownloadURL().then(url => {
            addImageToGallery(url);
            toast('📸 Photo uploaded!');
          });
        });
      });
    });
  }

  // =====================================================
  // LOVE CALCULATOR (unchanged)
  // =====================================================
  function initLoveCalc() {
    $('loveCalcBtn').addEventListener('click', () => {
      const percent = Math.floor(Math.random() * 41) + 80;
      const display = percent > 100 ? '∞' : percent + '%';
      const messages = ['Perfect match! 💞', 'Made for each other! 💖', 'Unbreakable bond! 💕', 'Love beyond measure! 💗'];
      $('loveResult').innerHTML = `✨ ${display} Compatibility ✨<br>${messages[Math.floor(Math.random() * messages.length)]}`;
      AudioEngine.sfx.fortune();
      burst(30);
    });
  }

  // =====================================================
  // MESSAGE WALL (shared via Firebase Realtime Database)
  // =====================================================
  function initMessageWall() {
    const wall = $('wallMessages');
    const input = $('wallMessage');
    const postBtn = $('postMessageBtn');
    const messagesRef = database.ref('messages');

    // Load messages on startup and when new ones arrive
    messagesRef.on('child_added', snapshot => {
      const msg = snapshot.val();
      addMessageToDOM(msg.text, msg.timestamp);
    });

    function addMessageToDOM(text, timestamp) {
      const msgDiv = el('div', 'wall-message-item', text);
      const timeSpan = el('span', '', new Date(timestamp).toLocaleString());
      timeSpan.style.fontSize = '0.7rem';
      timeSpan.style.opacity = '0.7';
      timeSpan.style.marginLeft = '10px';
      msgDiv.appendChild(timeSpan);
      wall.appendChild(msgDiv);
    }

    postBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      messagesRef.push({
        text: text,
        timestamp: Date.now()
      });
      input.value = '';
      AudioEngine.sfx.click();
      toast('💬 Message posted!');
    });
  }

  // =====================================================
  // REASONS I LOVE YOU (unchanged)
  // =====================================================
  function initReasons() {
    const reasons = [
      "Your laugh is the most infectious sound I've ever heard.",
      "The way you care for everyone around you deeply.",
      "Your courage to be completely yourself.",
      "How you make even ordinary moments feel magical.",
      "The kindness in your eyes when you look at someone who needs help.",
      "Your intelligence that surprises and amazes me constantly.",
      "The way you say my name — like it's the most natural thing in the world.",
      "Your strength when things get hard.",
      "How you remember the small things I say.",
      "Your beautiful, honest, unguarded smile.",
      "The warmth you bring to every room you enter.",
      "How passionate you get about things you love.",
      "Your patience — even when I'm being impossible.",
      "The way you hug — like you really mean it.",
      "Your voice — I could listen to it forever.",
      "How you make me want to be better.",
      "Your adventurous spirit.",
      "The depth of your empathy.",
      "How your eyes light up when you're excited.",
      "Your honesty, even when it's hard.",
      "The way you love the people in your life.",
      "Your incredible resilience.",
      "How you make me feel safe.",
      "Your creativity and imagination.",
      "The way you handle challenges with grace.",
      "Your love for beauty in the small things.",
      "How you make every day feel like an adventure.",
      "Your laughter lines — every single one.",
      "The way you say sorry when you mean it.",
      "How you hold my hand like you never want to let go.",
      "Your ambition and drive.",
      "The way you look when you're thinking deeply.",
      "How you make my worries feel smaller.",
      "Your love for good music.",
      "The way you dance — carefree and beautiful.",
      "How you see the good in people.",
      "Your unforgettable presence in a crowd.",
      "The way you care about your family.",
      "How honest your eyes are.",
      "Your love for learning.",
      "The way you smell — I could bury my face in your hair forever.",
      "How you stay calm when I'm anxious.",
      "Your endless capacity for love.",
      "The way you support my dreams.",
      "How you make me laugh until I cry.",
      "Your beautiful, unique mind.",
      "The way you love little animals.",
      "How comfortable you make silence feel.",
      "Your gorgeous, breathtaking smile.",
      "Because you chose me, and I'll never stop being grateful.",
      "तिम्रो माया — Nepali doesn't have enough words for how I feel.",
      "The way you read — so lost in another world.",
      "How you forgive.",
      "Your late-night philosophical thoughts.",
      "The way you text — I keep every single one.",
      "How you make food taste better somehow.",
      "Your love for the stars and the sky.",
      "How you remember dates that matter.",
      "The way you see me — really see me.",
      "Your beautiful, pure heart.",
      "How your presence makes everything okay.",
      "The way you care about doing the right thing.",
      "Your incredible sense of humor.",
      "How you notice when something is wrong before I say it.",
      "Your love for rain.",
      "The way your voice sounds when you're sleepy.",
      "How you make me feel like I'm enough.",
      "Your courage to love fully.",
      "The way you carry yourself.",
      "How you believe in things worth believing in.",
      "Your ability to find hope.",
      "The way you've become my home.",
      "How you change the quality of every moment.",
      "Your love for deep conversations at midnight.",
      "The way your eyes crinkle when you laugh hard.",
      "How you've made me see the world differently.",
      "Your gentle way with everyone.",
      "The way you remember my favorite things.",
      "How safe I feel when you're near.",
      "Your love for your culture and roots.",
      "The way you inspire me every day.",
      "How you push me to grow.",
      "Your quiet strength.",
      "The way you make everything feel like it's going to be okay.",
      "How you love sunsets.",
      "Your love for flowers.",
      "The way you get excited about small beautiful things.",
      "How much you've changed my life for the better.",
      "Your loyalty.",
      "The way you say goodbye — like it's always temporary.",
      "How you make ordinary evenings feel like dates.",
      "Your unwavering support.",
      "The way you grow every single day.",
      "How you make love feel effortless.",
      "Your belief in us.",
      "The way you say 'I love you back' — and mean it completely.",
      "Because loving you is the best thing I've ever done.",
      "Because you are, simply, everything. 💖"
    ];
    const grid = $('reasonsGrid');
    const revealed = new Set();
    reasons.forEach((reason, i) => {
      const petal = el('div', 'reason-petal', (i+1).toString());
      petal.addEventListener('click', () => {
        revealed.add(i);
        petal.classList.add('revealed');
        $('reasonNum').textContent = '#' + (i+1);
        $('reasonText').textContent = reason;
        $('reasonModal').classList.remove('hidden');
        AudioEngine.sfx.match();
        burst(15);
      });
      grid.appendChild(petal);
    });
    $('closeReason').addEventListener('click', () => {
      $('reasonModal').classList.add('hidden');
      AudioEngine.sfx.click();
    });
    $('reasonModal').addEventListener('click', e => {
      if (e.target === $('reasonModal')) $('reasonModal').classList.add('hidden');
    });
  }

  // =====================================================
  // FOOTER ANIMATED HEARTS (unchanged)
  // =====================================================
  function initFooterHearts() {
    const container = $('footerHearts');
    const hearts = ['💖','💕','💗','💘','💝','💞','💓','💟'];
    hearts.forEach(h => {
      const span = el('span', '', h);
      span.style.cssText = `display:inline-block;animation:heartBeat ${Math.random()*1+1.5}s ease-in-out ${Math.random()}s infinite;`;
      container.appendChild(span);
    });
  }

  // =====================================================
  // KEYBOARD SHORTCUTS (unchanged)
  // =====================================================
  document.addEventListener('keydown', e => {
    if (e.key === 'k' || e.key === 'K') $('kissBtn') && $('kissBtn').click();
    if (e.key === 'm' || e.key === 'M') $('musicToggle') && $('musicToggle').click();
  });

  // =====================================================
  // LIVE LOVE TIMER (unchanged)
  // =====================================================
  function initLiveTimer() {
    const START = new Date('2024-12-10T00:00:00');
    const messages = [
      "Every second I love you more 💖",
      "That's a lot of heartbeats for you 💓",
      "और कितने seconds? हमेशा के लिए 💕",
      "सधैं तिम्रै हुनेछु ♾️",
      "Each second is a memory made 🌸",
      "Time flies when you're loved this much ✨",
      "तिम्रो माया मा डुबेको छु 💗",
      "More seconds = more love 🌹",
    ];
    let lastSec = -1, msgIdx = 0;
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      const now    = Date.now();
      const diff   = Math.floor((now - START.getTime()) / 1000);
      const days   = Math.floor(diff / 86400);
      const hours  = Math.floor((diff % 86400) / 3600);
      const mins   = Math.floor((diff % 3600) / 60);
      const secs   = diff % 60;
      const dEl = document.getElementById('tDays');
      const hEl = document.getElementById('tHours');
      const mEl = document.getElementById('tMins');
      const sEl = document.getElementById('tSecs');
      const tEl = document.getElementById('tTotalSecs');
      const mMsg = document.getElementById('timerMessage');
      if (!dEl) return;
      dEl.textContent = days;
      hEl.textContent = pad(hours);
      mEl.textContent = pad(mins);
      sEl.textContent = pad(secs);
      if (tEl) tEl.textContent = diff.toLocaleString();
      if (secs !== lastSec) {
        lastSec = secs;
        sEl.style.transform = 'scale(1.2)';
        setTimeout(() => { sEl.style.transform = ''; }, 150);
        if (secs % 15 === 0 && mMsg) {
          mMsg.style.opacity = '0';
          setTimeout(() => {
            mMsg.textContent = messages[msgIdx % messages.length];
            mMsg.style.opacity = '1';
            msgIdx++;
          }, 500);
        }
      }
    }
    function start() {
      if (document.getElementById('tDays')) {
        tick();
        setInterval(tick, 1000);
        const mMsg = document.getElementById('timerMessage');
        if (mMsg) mMsg.textContent = messages[0];
      } else {
        setTimeout(start, 500);
      }
    }
    start();
  }

  // =====================================================
  // INIT ALL (after welcome screen)
  // =====================================================
  function initAll() {
    initTrail();
    initParticles();
    initMusicToggle();
    initThemeToggle();
    updateStats();
    initFooterHearts();
    initLiveTimer();

    initMaze();
    initMemory();
    initCatch();
    initSnake();
    initQuiz();
    initFortune();
    initKissCounter();
    initClicker();
    initLetterGenerator();
    initMusicPlayer();
    initGallery();        // Firebase storage
    initReasons();
    initLoveCalc();
    initMessageWall();    // Firebase database
  }

  // =====================================================
  // WELCOME SCREEN TRIGGER
  // =====================================================
  function initWelcomeAndStart() {
    initWelcome();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'class' && !$('mainApp').classList.contains('hidden')) {
          initAll();
          observer.disconnect();
        }
      });
    });
    observer.observe($('mainApp'), { attributes: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomeAndStart);
  } else {
    initWelcomeAndStart();
  }
})();
