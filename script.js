// === ALL YOUR PREVIOUS GAMES (maze, catch me, memory, quiz, fortune, kiss, clicker, gallery, runner, letter, playlist) ===
// Just copy the entire working script.js you already have and paste it here first...

// THEN ADD THESE PRETTIER UPGRADES AT THE BOTTOM:

// Sparkle cursor
document.body.style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2720%27 height=%2720%27><text y=%2718%27 font-size=%2720%27>💖</text></svg>') 10 10, auto";

// Love Meter (increases with every interaction)
let loveLevel = 100;
function increaseLove() {
  loveLevel = Math.min(100, loveLevel + 2);
  document.getElementById('lovePercent').textContent = loveLevel;
}
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', increaseLove);
});

// Even more beautiful confetti + hearts
function createHyperBurst() {
  // (your existing hyper burst code + extra gold sparkles)
  for(let i=0; i<60; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    h.textContent = ['❤️','💖','💗','🌹','💕','✨'][Math.floor(Math.random()*6)];
    h.style.left = Math.random()*100 + 'vw';
    h.style.top = '100vh';
    h.style.fontSize = (Math.random()*40 + 25) + 'px';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 4500);
  }
}

// Attach to every click
document.addEventListener('click', (e) => {
  if(e.target.tagName === 'BUTTON' || e.target.tagName === 'CANVAS') createHyperBurst();
});

// Keep all your existing game code (maze, memory, kiss counter, etc.) exactly as before
