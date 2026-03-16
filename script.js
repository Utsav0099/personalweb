// Audio & Welcome
const startBtn = document.getElementById('startBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const mainContent = document.getElementById('mainContent');
const bgMusic = document.getElementById('bgMusic');

startBtn.addEventListener('click', () => {
  bgMusic.play().catch(() => {});
  welcomeScreen.style.opacity = '0';
  setTimeout(() => {
    welcomeScreen.style.display = 'none';
    mainContent.style.display = 'block';
    mainContent.style.opacity = '1';
  }, 800);
});

// Floating Hearts (same)
const heartsContainer = document.getElementById('heartsContainer');
const heartSymbols = ['❤️','💖','💗','💓','💞','💕','💘'];
function createHeart() {
  const heart = document.createElement('div');
  heart.className = 'heart';
  heart.textContent = heartSymbols[Math.floor(Math.random()*heartSymbols.length)];
  heart.style.left = Math.random()*100 + 'vw';
  heart.style.fontSize = (Math.random()*25 + 18) + 'px';
  heart.style.animationDuration = (Math.random()*4 + 5) + 's';
  heartsContainer.appendChild(heart);
  setTimeout(() => heart.remove(), 8000);
}
setInterval(createHeart, 350);

// ====================== MAZE (unchanged) ======================
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const cellSize = 30, rows = 10, cols = 10;
const maze = [ /* your original maze array */ [0,1,0,0,0,1,0,0,0,0],[0,1,1,1,0,1,1,1,1,0],[0,0,0,1,0,0,0,0,1,0],[1,1,0,1,1,1,1,0,1,0],[0,1,0,0,0,0,1,0,0,0],[0,1,1,1,1,0,1,1,1,0],[0,0,0,0,1,0,0,0,1,0],[1,1,1,0,1,1,1,0,1,0],[0,0,1,0,0,0,1,0,0,0],[0,0,1,0,1,1,1,0,1,0] ];
let player = {x:0,y:0};
const goal = {x:9,y:9};

function drawMaze() {
  ctx.clearRect(0,0,300,300);
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    ctx.fillStyle = maze[r][c]===1 ? '#ff7eb3' : '#fff5f7';
    ctx.fillRect(c*cellSize,r*cellSize,cellSize,cellSize);
  }
  ctx.font = '22px Arial';
  ctx.fillText('💖', goal.x*cellSize+4, goal.y*cellSize+26);
  ctx.fillText('❤️', player.x*cellSize+4, player.y*cellSize+26);
}
function movePlayer(dx,dy) {
  const nx = player.x+dx, ny = player.y+dy;
  if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&maze[ny][nx]===0) {
    player.x=nx; player.y=ny; drawMaze();
    if(nx===goal.x && ny===goal.y) setTimeout(()=>alert('🎉 You reached my heart! I love you Ankita! 🎉'),100);
  }
}
document.getElementById('moveUp').onclick = () => movePlayer(0,-1);
document.getElementById('moveDown').onclick = () => movePlayer(0,1);
document.getElementById('moveLeft').onclick = () => movePlayer(-1,0);
document.getElementById('moveRight').onclick = () => movePlayer(1,0);
document.getElementById('resetMaze').onclick = () => { player={x:0,y:0}; drawMaze(); };
drawMaze();

// ====================== CATCH ME (unchanged) ======================
const movingBtn = document.getElementById('movingButton');
const annoyingMsg = document.getElementById('annoyingMessage');
const annoyingArea = document.querySelector('.annoying-area');
let moveEnabled = true;

function moveButtonRandomly() {
  if(!moveEnabled) return;
  const rect = annoyingArea.getBoundingClientRect();
  const btnRect = movingBtn.getBoundingClientRect();
  const maxL = rect.width - btnRect.width - 30;
  const maxT = rect.height - btnRect.height - 30;
  if(maxL>0 && maxT>0) {
    movingBtn.style.position = 'absolute';
    movingBtn.style.left = (Math.random()*maxL + 15) + 'px';
    movingBtn.style.top = (Math.random()*maxT + 15) + 'px';
  }
}
movingBtn.addEventListener('click', () => {
  annoyingMsg.textContent = moveEnabled ? '😘 You got me! Always yours. 😘' : '💘 You caught me! I love you! 💘';
  annoyingMsg.classList.add('show');
  moveEnabled = false; movingBtn.style.position = 'static';
});
document.getElementById('stopMovingBtn').onclick = () => {
  moveEnabled = false; movingBtn.style.position = 'static';
  annoyingMsg.textContent = "Okay, I'll stay still for you ❤️"; annoyingMsg.classList.add('show');
};
document.getElementById('easyButton').onclick = () => {
  annoyingMsg.textContent = 'Ankita, you are the best thing in my life! 🌹';
  annoyingMsg.classList.add('show');
};
movingBtn.addEventListener('touchstart', e=>{e.preventDefault(); moveButtonRandomly();});
movingBtn.addEventListener('mouseenter', ()=>{ if(innerWidth>768) moveButtonRandomly(); });

// ====================== NEW MEMORY MATCH ======================
const memoryGrid = document.getElementById('memoryGrid');
let cards = [], flipped = [], matched = 0;
const emojis = ['❤️','💕','💖','💗','💓','💘','💝','💞'];
function createMemoryGame() {
  cards = [...emojis,...emojis].sort(()=>Math.random()-0.5);
  memoryGrid.innerHTML = '';
  flipped = []; matched = 0;

  cards.forEach((emoji,i) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.innerHTML = `
      <div class="memory-card-inner">
        <div class="memory-card-front">❓</div>
        <div class="memory-card-back">${emoji}</div>
      </div>`;
    card.onclick = () => flipCard(card, i);
    memoryGrid.appendChild(card);
  });
}
function flipCard(card, index) {
  if(flipped.length === 2 || card.classList.contains('flipped') || card.classList.contains('matched')) return;
  card.classList.add('flipped');
  flipped.push({card, index});

  if(flipped.length === 2) {
    if(cards[flipped[0].index] === cards[flipped[1].index]) {
      flipped.forEach(f => f.card.classList.add('matched'));
      matched += 2;
      if(matched === 16) {
        setTimeout(()=>{ alert('💖 Perfect match! Just like us Ankita! 💖'); createConfetti(); }, 300);
      }
      flipped = [];
    } else {
      setTimeout(() => {
        flipped.forEach(f => f.card.classList.remove('flipped'));
        flipped = [];
      }, 800);
    }
  }
}
document.getElementById('resetMemory').onclick = createMemoryGame;
createMemoryGame();

// ====================== NEW LOVE QUIZ ======================
const quizContainer = document.getElementById('quizContainer');
let currentQ = 0, score = 0;
const questions = [
  {q:"What makes me happiest every day?", a:["Your smile","Your voice","Your hugs","All of them"], c:3},
  {q:"How many times do I think about you?", a:["Sometimes","All day","Every second","Only at night"], c:2},
  {q:"My favorite way to say I love you is...", a:["Text","Call","Hug","All the above"], c:3},
  {q:"Our future together will be...", a:["Amazing","Perfect","Full of kisses","All of them"], c:3}
];

function startQuiz() {
  currentQ = 0; score = 0;
  quizContainer.innerHTML = `<h3 class="quiz-question" id="qText"></h3><div class="options" id="options"></div>`;
  loadQuestion();
}
function loadQuestion() {
  const qEl = document.getElementById('qText');
  const optEl = document.getElementById('options');
  qEl.textContent = questions[currentQ].q;
  optEl.innerHTML = '';
  questions[currentQ].a.forEach((ans,i) => {
    const btn = document.createElement('button');
    btn.textContent = ans;
    btn.onclick = () => {
      if(i === questions[currentQ].c) score++;
      currentQ++;
      if(currentQ < questions.length) loadQuestion();
      else showResult();
    };
    optEl.appendChild(btn);
  });
}
function showResult() {
  let msg = score >= 3 ? "You know me perfectly! I love you more every day Ankita 💖" :
            score >= 2 ? "You're my favorite person in the world 🌹" :
            "Even if you get 0, my heart is 100% yours forever 😘";
  quizContainer.innerHTML = `<div class="love-note">${msg}<br><strong>Score: ${score}/${questions.length}</strong></div>
    <button class="maze-reset" onclick="startQuiz()">Play Again 💕</button>`;
  if(score >= 3) createConfetti();
}
document.getElementById('startQuiz').onclick = startQuiz;

// ====================== NEW FORTUNE TELLER ======================
const fortunes = [
  "Ankita, you are the reason my heart beats faster every morning 💓",
  "Today I will love you even more than yesterday — and tomorrow even more! 💕",
  "Every kiss I send you travels straight to your soul 😘",
  "You make my world colorful, my love 🌈",
  "I am the luckiest guy because I have you 💖",
  "Our love story is my favorite book and I never want it to end 📖"
];
document.getElementById('fortuneBtn').onclick = () => {
  const result = document.getElementById('fortuneResult');
  result.textContent = fortunes[Math.floor(Math.random()*fortunes.length)];
  result.style.display = 'block';
  createConfetti();
};

// ====================== CONFETTI FUNCTION (hearts flying) ======================
function createConfetti() {
  for(let i=0; i<60; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = heartSymbols[Math.floor(Math.random()*heartSymbols.length)];
    h.style.left = Math.random()*100 + 'vw';
    h.style.fontSize = (Math.random()*30 + 20) + 'px';
    h.style.animationDuration = (Math.random()*3 + 2) + 's';
    h.style.animation = 'float 3s linear forwards';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 4000);
  }
}
