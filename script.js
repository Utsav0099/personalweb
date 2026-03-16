// === ALL PREVIOUS CODE (Welcome, Maze, Catch Me, Memory, Quiz, Fortune) stays here ===
// (Just copy your entire previous script.js and paste at the top)

// ADD THIS HYPER ANIMATION ENGINE AT THE BOTTOM
function hyperClick(el) {
  el.classList.add('hyper-pop');
  setTimeout(() => el.classList.remove('hyper-pop'), 500);

  // Ripple effect
  const ripple = document.createElement('span');
  ripple.style.cssText = 'position:absolute;width:20px;height:20px;background:rgba(255,255,255,0.7);border-radius:50%;animation:ripple 0.6s';
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  createHyperBurst();
}

function createHyperBurst() {
  const container = document.body;
  // 40 flying hearts + emojis
  for(let i = 0; i < 40; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = ['❤️','💖','💗','💓','💕','🌹','😘','💞'][Math.floor(Math.random()*8)];
    h.style.left = Math.random()*100 + 'vw';
    h.style.top = '100vh';
    h.style.fontSize = (Math.random()*35 + 20) + 'px';
    h.style.color = ['#ff4b2b','#ff9a9e','#fecfef','#ff416c'][Math.floor(Math.random()*4)];
    h.style.animationDuration = (Math.random()*2.5 + 2.5) + 's';
    container.appendChild(h);
    setTimeout(() => h.remove(), 5000);
  }

  // Rainbow confetti
  for(let i = 0; i < 25; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.textContent = ['🎉','✨','💥','🌟'][Math.floor(Math.random()*4)];
    c.style.left = Math.random()*100 + 'vw';
    c.style.top = '-50px';
    c.style.fontSize = '25px';
    c.style.color = `hsl(${Math.random()*360},100%,70%)`;
    c.style.animationDuration = (Math.random()*2 + 2) + 's';
    container.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }

  // Screen flash
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:white;opacity:0;pointer-events:none;z-index:9999;animation:screenFlash 0.4s';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}
const screenFlashKey = `@keyframes screenFlash {0%{opacity:0.4} 100%{opacity:0}}`;

// Attach hyper animation to EVERY button/clickable thing
document.querySelectorAll('.hyper-btn, .arrow-btn, .big-btn, #heartClicker, #kissBtn, #fortuneBtn, #generateLetter, #startRunner, #upgradeBtn, #resetMemory').forEach(btn => {
  btn.addEventListener('click', () => hyperClick(btn));
});

// Special hyper effects for games
// Kiss
document.getElementById('kissBtn').onclick = () => {
  // previous kiss code...
  hyperClick(document.getElementById('kissBtn'));
  createHyperBurst(); // extra burst
};

// Heart Clicker
document.getElementById('heartClicker').onclick = () => {
  // previous points code...
  hyperClick(document.getElementById('heartClicker'));
};

// Runner jump
document.getElementById('runnerCanvas').addEventListener('click', () => createHyperBurst());

// Memory card flip already has animation – extra burst on match
// (add inside your memory win condition: createHyperBurst();)

// Same for Quiz, Fortune, Letter, Gallery upload, etc. – already covered by the global hyper-btn listener

// Keep all your previous game logic (maze, memory, clicker, runner, gallery, letter, playlist) exactly as before
// Just add hyperClick() and createHyperBurst() where needed (I already added the main ones above)
