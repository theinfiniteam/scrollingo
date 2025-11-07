/* ============================
   Data & state
   ============================ */
const baseQuestions = [
  {
    id: 'q1',
    q: "Which animal is known as the King of the Jungle?",
    answers:["Tiger","Elephant","Lion","Gorilla"],
    correct:2,
    explanation:"Despite living in savannas, Lions are called 'King of the Jungle' due to their strength and status as apex predators."
  },
  {
    id: 'q2',
    q: "How many continents are there on Earth?",
    answers:["5","6","7","8"],
    correct:2,
    explanation:"There are 7 continents: North America, South America, Europe, Asia, Africa, Australia, and Antarctica."
  },
  {
    id: 'q3',
    q: "What is the largest ocean on Earth?",
    answers:["Atlantic","Indian","Arctic","Pacific"],
    correct:3,
    explanation:"The Pacific Ocean is the largest, covering about 63 million square miles and 46% of Earth's water surface."
  },
  {
    id: 'q4',
    q: "Which planet is closest to the Sun?",
    answers:["Mercury","Venus","Mars","Earth"],
    correct:0,
    explanation:"Mercury is the closest planet to the Sun, orbiting at an average distance of 36 million miles."
  },
  {
    id: 'q5',
    q: "What is the chemical formula for water?",
    answers:["CO2","H2O","O2","N2"],
    correct:1,
    explanation:"H2O represents two hydrogen atoms bonded to one oxygen atom, forming a water molecule."
  },

];

// Confusing questions (one will be injected per run)
const confusingQuestions = [
  {
    id: 'c1',
    q: "Which number is the largest?",
    answers:["1000","-1","0","-1000000"],
    correct:1,
    explanation:"Among the negative numbers (-1 and -1000000), -1 is the largest. This is a trick question because 1000 seems largest at first glance!",
    isConfusing:true
  },
  {
    id: 'c2',
    q: "Which is heavier?",
    answers:["1kg of steel","1kg of feathers","Both weigh the same","Depends on gravity"],
    correct:3, // 'Depends on gravity' as the trick answer
    explanation:"Both are 1kg, but the trick answer highlights that weight depends on gravity — mass is constant, weight isn't.",
    isConfusing:true
  },
  {
    id: 'c3',
    q: "Pick the correct statement",
    answers:["The obvious first option","This one for sure","Definitely not this","None of the above"],
    correct:3,
    explanation:"Classic misdirection: 'None of the above' is correct; the obvious ones are intentionally wrong.",
    isConfusing:true
  },
  {
    id: 'c4',
    q: "Which is a prime number?",
    answers:["9","15","21","1"],
    correct:3, // 1 is not prime by definition; trick expects the 'most wrong' choice
    explanation:"1 is not prime — that's the trick. The question intentionally cues an incorrect assumption.",
    isConfusing:true
  },
  {
    id: 'c5',
    q: "Which color is not a primary light color?",
    answers:["Red","Green","Blue","Yellow"],
    correct:3, // Yellow is not a primary in RGB, but often thought of as primary in pigments
    explanation:"In RGB (light), primary colors are red, green, and blue. Yellow is a result of red + green.",
    isConfusing:true
  }
];

const BASE_TOTAL = 5; // Number of questions per round

function buildQuestions(){
  // Randomly select 4 questions from the pool
  const shuffled = [...baseQuestions].sort(() => Math.random() - 0.5);
  const selectedBase = shuffled.slice(0, 4).map(q => ({ ...q, isRetry:false }));
  
  // Add one random confusing question
  const cq = { ...confusingQuestions[Math.floor(Math.random()*confusingQuestions.length)], isRetry:false };
  const insertAt = Math.floor(Math.random() * 5); // Now inserting into 4 questions
  const withConfusing = selectedBase.slice(0, insertAt).concat([cq], selectedBase.slice(insertAt));
  return withConfusing;
}

let questions = buildQuestions();

let current = 0;
let selected = 0;      // current highlighted index
let confirmed = false; // whether current Q locked in
let finished = false;
let score = 0;
let earnedIds = new Set();
let pendingRepeats = new Set();

/* DOM */
const card = document.getElementById('card');
let questionEl = document.getElementById('question');
let answersEl = document.getElementById('answers');
let statusEl = document.getElementById('status');
const scoreDisplay = document.getElementById('scoreDisplay');
const progressEl = document.getElementById('progress');
const tipsEl = document.getElementById('tips');
const swipeArea = document.getElementById('swipeArea');
const warningBubble = document.getElementById('warningBubble');
const loadingOverlay = document.getElementById('loadingOverlay');
let quizProgress = document.getElementById('quizProgress');
let quizProgressFill = document.getElementById('quizProgressFill');
const confettiLayer = document.getElementById('confetti');
const baseCardHTML = card.innerHTML;
const timeoutOverlay = document.getElementById('timeoutOverlay');
const closeOverlayBtn = document.getElementById('closeOverlayBtn');

// anti-spam click tracking
let recentClicks = [];
let blockClicksUntil = 0;
function isClicksBlocked(){ return Date.now() < blockClicksUntil; }
function showTimeoutPopup(){
  if (!timeoutOverlay) return;
  timeoutOverlay.classList.add('show');
  // body already overflow hidden; overlay will capture interactions
  setTimeout(()=>{ timeoutOverlay.classList.remove('show'); }, 5000);
}
function registerClickAndMaybeBlock(){
  recentClicks++;
  if (recentClicks >= 3){
    showTimeoutPopup();
    blockClicksUntil = Date.now() + 5000;
    recentClicks = 0;
  }
  // Reset count when clicking elsewhere (handled in click event listener)
}

function captureCardRefs(){
  questionEl = document.getElementById('question');
  answersEl = document.getElementById('answers');
  statusEl = document.getElementById('status');
  quizProgress = document.getElementById('quizProgress');
  quizProgressFill = document.getElementById('quizProgressFill');
}

function clearConfetti(){
  if (confettiLayer){
    confettiLayer.innerHTML = '';
  }
}

function launchConfetti(){
  if (!confettiLayer) return;
  clearConfetti();
  const colors = ['#3b82f6','#22c55e','#f97316','#eab308','#ec4899','#8b5cf6'];
  const pieces = 140;
  for (let i = 0; i < pieces; i++){
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const color = colors[i % colors.length];
    piece.style.background = color;
    const spread = 24 + Math.random()*36;
    const angle = Math.random()*Math.PI*2;
    const dx = Math.cos(angle) * spread;
    const dy = Math.sin(angle) * (spread + 6);
    const rotation = (Math.random()*720 - 360).toFixed(2);
    piece.style.setProperty('--dx', `${dx.toFixed(2)}vw`);
    piece.style.setProperty('--dy', `${dy.toFixed(2)}vh`);
    piece.style.setProperty('--rot', `${rotation}deg`);
    piece.style.setProperty('--dur', `${1.9 + Math.random()*1.2}s`);
    piece.style.animationDelay = `${Math.random()*0.45}s`;
    piece.style.width = `${8 + Math.random()*6}px`;
    piece.style.height = `${14 + Math.random()*8}px`;
    piece.style.borderRadius = `${Math.random()*6}px`;
    confettiLayer.appendChild(piece);
  }
  setTimeout(clearConfetti, 3600);
}

function updateScoreDisplay(){
  score = earnedIds.size * 10;
  scoreDisplay.textContent = `Score: ${score}`;
}

function getProgressLabel(){
  const reviewTotal = Math.max(questions.length - BASE_TOTAL, 0);
  if (current < BASE_TOTAL){
    return `Question ${current + 1} of ${BASE_TOTAL}`;
  }
  if (reviewTotal > 0){
    return `Review ${current - BASE_TOTAL + 1} of ${reviewTotal}`;
  }
  return 'Review';
}

function updateStatus(message, explanationText){
  if (!statusEl) return;
  statusEl.innerHTML = '';
  if (message){
    const msg = document.createElement('div');
    msg.textContent = message;
    statusEl.appendChild(msg);
  }
  if (explanationText){
    const info = document.createElement('div');
    info.className = 'explanation';
    info.textContent = explanationText;
    statusEl.appendChild(info);
  }
}

/* helper renders */
function render(){
  if (!questionEl || !answersEl || !statusEl || !quizProgress || !quizProgressFill){
    captureCardRefs();
  }

  if (!questions[current]){
    return;
  }

  // update HUD
  progressEl.textContent = getProgressLabel();
  updateScoreDisplay();
  if (quizProgress && quizProgressFill){
    const percentage = BASE_TOTAL ? (earnedIds.size / BASE_TOTAL) * 100 : 0;
    quizProgressFill.style.width = `${percentage}%`;
    quizProgress.setAttribute('aria-valuenow', Math.round(percentage).toString());
  }

  // reset card
  questionEl.textContent = questions[current].q;
  answersEl.innerHTML = '';
  statusEl.textContent = '';

  // build answers
  questions[current].answers.forEach((a,i)=>{
    const div = document.createElement('div');
    div.className = 'answer' + (i===selected ? ' selected' : '');
    div.dataset.i = i;
    div.textContent = a;
    // clicking answers should NOT confirm — show a gentle warning so user uses swipe to select
    div.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (isClicksBlocked()) { showTimeoutPopup(); return; }
      registerClickAndMaybeBlock();
      showWarning("bruh no clicky on choices — swipe to select, then tap bottom to confirm");
      punch(div);
    });
    answersEl.appendChild(div);
  });
}

/* small visual 'punch' to show tap on option */
function punch(node){
  node.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration:220, easing:'cubic-bezier(.22,1,.36,1)' });
}

/* show temporary warning bubble */
let warnTimeout = null;
function showWarning(msg){
  clearTimeout(warnTimeout);
  warningBubble.textContent = msg;
  warningBubble.style.display = 'block';
  warningBubble.style.opacity = '1';
  warnTimeout = setTimeout(()=>{ warningBubble.style.display='none'; }, 1300);
}

/* selection change animation + DOM update */
function setSelected(newIndex){
  if (confirmed || finished || isClicksBlocked()) return; // selection locked or quiz done
  const len = questions[current].answers.length;
  if (newIndex < 0){
    // top reached -> vertical shake on top answer
    const node = answersEl.children[0];
    if (node){ node.classList.add('shakeY'); setTimeout(()=>node.classList.remove('shakeY'),350); }
    showWarning("already at the top fam");
    return;
  }
  if (newIndex >= len){
    const node = answersEl.children[len-1];
    if (node){ node.classList.add('shakeY'); setTimeout(()=>node.classList.remove('shakeY'),350); }
    showWarning("already at the bottom, twin");
    return;
  }
  // update classes
  const prev = answersEl.querySelector('.answer.selected');
  if (prev) prev.classList.remove('selected');
  selected = newIndex;
  const cur = answersEl.querySelector(`.answer[data-i="${selected}"]`);
  if (cur) {
    cur.classList.add('selected');
    // bounce micro-interaction
    cur.animate([{ transform:'scale(1.06)'},{ transform:'scale(1)' }], { duration:320, easing:'cubic-bezier(.22,1,.36,1)' });
  }
}

/* confirm (tap/click) — shows green/red, awards points, but DOES NOT auto-move to next Q */
function confirm(){
  if (confirmed || finished || isClicksBlocked()) return;
  confirmed = true;
  const q = questions[current];
  if (!q) return;
  const nodes = answersEl.querySelectorAll('.answer');
  nodes.forEach((n, i)=>{
    n.classList.remove('selected');
    if (i === q.correct) n.classList.add('correct');
    if (i === selected && i !== q.correct){
      n.classList.add('incorrect');
      n.classList.add('shakeX');
      setTimeout(()=> n.classList.remove('shakeX'),420);
    }
  });
  const isCorrect = selected === q.correct;
  if (isCorrect){
    if (!q.isConfusing){
      if (!earnedIds.has(q.id)){
        earnedIds.add(q.id);
        updateScoreDisplay();
      }
    }
    updateStatus('Correct! swipe down to continue');
    // progress updates immediately on correct
    if (quizProgress && quizProgressFill){
      const percentage = BASE_TOTAL ? (earnedIds.size / BASE_TOTAL) * 100 : 0;
      quizProgressFill.style.width = `${percentage}%`;
      quizProgress.setAttribute('aria-valuenow', Math.round(percentage).toString());
    }
  } else {
    const explanation = q.explanation ? `Correct answer: ${q.answers[q.correct]}. ${q.explanation}` : '';
    updateStatus('❌ Incorrect — swipe down to continue', explanation);
    if (!q.isRetry && !pendingRepeats.has(q.id)){
      pendingRepeats.add(q.id);
      questions.push({ ...q, isRetry:true });
    }
  }
  progressEl.textContent = getProgressLabel();
  updateScoreDisplay();
}

/* transition to next question with slide animation */
function goToNext(){
  if (isClicksBlocked()) { return; }
  if (!confirmed && !finished){
    showWarning('answer first fr');
    return;
  }

  if (!finished){
    if (current < questions.length - 1){
      // slide out & in
      card.style.transition = 'transform .32s ease, opacity .28s ease';
      card.style.transform = 'translateY(-28px)';
      card.style.opacity = '0';
      setTimeout(()=>{
        current++;
        selected = 0;
        confirmed = false;
        render();
        card.style.transform = 'translateY(28px)';
        card.style.opacity = '0';
        setTimeout(()=>{ card.style.transform = 'translateY(0)'; card.style.opacity='1'; }, 20);
      }, 300);
    } else {
      // reached end of queue; only finish if all base questions are correct
      if (earnedIds.size < BASE_TOTAL){
        baseQuestions.forEach(bq=>{
          if (!earnedIds.has(bq.id) && !pendingRepeats.has(bq.id)){
            pendingRepeats.add(bq.id);
            questions.push({ ...bq, isRetry:true });
          }
        });
        if (current < questions.length - 1){
          setTimeout(()=>{
            current++;
            selected = 0;
            confirmed = false;
            render();
          }, 120);
          return;
        }
      }
      // final screen
      finished = true;
      updateScoreDisplay();
      const correctCount = earnedIds.size;
      const resultLine = correctCount === BASE_TOTAL
        ? 'Perfect score — untouchable!'
        : `You got ${correctCount} of ${BASE_TOTAL} right`;
      if (quizProgress && quizProgressFill){
        quizProgressFill.style.width = '100%';
        quizProgress.setAttribute('aria-valuenow', '100');
      }
      if (correctCount >= 3){
        launchConfetti();
      } else {
        clearConfetti();
      }
      if (statusEl){
        statusEl.textContent = '';
      }
      progressEl.textContent = 'Review complete';
      const finalScore = correctCount * 10;
      setTimeout(()=>{
        card.innerHTML = `<div class="final final-appear">
          <div style="font-size:22px;font-weight:800;color:#0f172a">Quiz Complete</div>
          <div style="font-size:16px;color:#334155">${resultLine}</div>
          <div style="font-size:15px;color:#475569;font-weight:600">Total score: ${finalScore} pts</div>
          <div style="font-size:13px;color:var(--muted)">Swipe down to restart</div>
        </div>`;
      }, 300);
    }
  } else {
    // finished & swipe down => restart
    restart();
  }
}

/* restart */
function restart(){
  current = 0;
  selected = 0;
  confirmed = false;
  finished = false;
  score = 0;
  earnedIds = new Set();
  pendingRepeats = new Set();
  questions = buildQuestions();
  card.innerHTML = baseCardHTML;
  captureCardRefs();
  clearConfetti();
  updateScoreDisplay();
  render();
}

/* =========================
   Input handlers
   ========================= */

/* -- mouse click / desktop tap:
     clicking answers shows warning (we want swipe select),
     clicking card background confirms (but not clicks on answers).
   We'll treat clicks on card (outside .answer) as confirm.
*/
document.addEventListener('click', (e)=>{
  const overlayEl = document.getElementById('loadingOverlay');
  const clickedInOverlay = overlayEl && e.target.closest('#loadingOverlay');
  // Allow clicks inside the loading overlay even when blocked
  if (!clickedInOverlay && isClicksBlocked()) { showTimeoutPopup(); return; }
  // If click was inside overlay, do not trigger quiz interactions here; button handler will manage
  if (clickedInOverlay) { return; }
  // if clicked inside an answer, we already have a handler showing warning; do nothing.
  if (e.target.closest('.answer')) {
    return;
  }
  // If finished (final screen), allow click to restart
  if (finished){
    restart();
    return;
  }
  // confirm if not confirmed, else attempt next
  if (!confirmed) confirm();
  else goToNext();
});

/* -- keyboard */
document.addEventListener('keydown', (e)=>{
  if (isClicksBlocked()) { return; }
  if (finished && (e.key === 'ArrowDown' || e.key === 'Enter')) { restart(); return; }
  if (!confirmed){
    if (e.key === 'ArrowUp') setSelected(selected - 1);
    if (e.key === 'ArrowDown') setSelected(selected + 1);
    if (e.key === 'Enter') confirm();
  } else {
    if (e.key === 'ArrowDown') goToNext();
    if (e.key === 'ArrowUp') showWarning("nah fam — swipe down to move ⬇️");
  }
});

/* -- wheel (desktop)
   negative deltaY -> wheel up -> move selection up
   positive deltaY -> wheel down -> move selection down (or goToNext when confirmed)
*/
window.addEventListener('wheel', (e)=>{
  if (isClicksBlocked()) { return; }
  // sensitivity threshold
  const TH = 20;
  if (Math.abs(e.deltaY) < TH) return;
  if (!confirmed){
    if (e.deltaY > 0) setSelected(selected + 1);
    else setSelected(selected - 1);
  } else {
    if (e.deltaY > 0) goToNext();
    else showWarning("nah fam — swipe down to move ⬇️");
  }
}, {passive:true});

/* -- touch: robust detection that ignores left/right swipes
   Touch flow:
     touchstart -> record startX,startY
     touchend -> compute dx,dy
       if abs(dx) > abs(dy) && abs(dx)>H -> horizontal swipe -> IGNORE
       else if abs(dy) < V_TH -> treat as tap -> if target is .answer show warning else confirm / goToNext
       else vertical swipe:
         if !confirmed:
           diff = startY - endY  (positive => swipe up)
           if diff > 0 -> swipe up -> setSelected(selected - 1)
           else -> swipe down -> setSelected(selected + 1)
         else (confirmed):
           if diff < 0 -> swipe down -> goToNext()
           else -> swipe up -> showWarning("Nah fam — swipe down to move ⬇️")
*/
let touchStartX = 0, touchStartY = 0;
const H_THRESHOLD = 40; // horizontal detection threshold for swipe
const V_THRESHOLD = 30; // minimum vertical movement to be considered swipe
const TAP_H_THRESHOLD = 18; // tighter tap threshold for tap-to-confirm
const TAP_V_THRESHOLD = 18;

// attach to swipeArea for mobile convenience, but also listen on entire document as fallback
const touchTarget = swipeArea; // bottom area preferred

let lastTouchMoveY = null;
touchTarget.addEventListener('touchstart', (ev)=> {
  const t = ev.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
  lastTouchMoveY = t.clientY;
}, {passive:false});

// Prevent pull-to-refresh on downward swipe in swipeArea
touchTarget.addEventListener('touchmove', (ev) => {
  if (ev.touches && ev.touches.length === 1) {
    const t = ev.touches[0];
    const moveY = t.clientY;
    if (moveY - touchStartY > 10) { // user is swiping down
      ev.preventDefault();
    }
    lastTouchMoveY = moveY;
  }
}, {passive:false});

touchTarget.addEventListener('touchend', (ev)=> {
  if (isClicksBlocked()) { showTimeoutPopup(); return; }
  const t = ev.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = touchStartY - t.clientY; // positive = swipe up
  const absDX = Math.abs(dx), absDY = Math.abs(dy);

  // horizontal predominant -> do nothing (explicitly ignored)
  if (absDX > absDY && absDX > H_THRESHOLD) {
    // ignore horizontal gestures completely
    return;
  }

  // tap detection (very small movement only)
  if (absDY < TAP_V_THRESHOLD && absDX < TAP_H_THRESHOLD) {
    // tap in the swipe area -> confirm / next
    if (finished) { restart(); return; }
    if (!confirmed) confirm();
    else goToNext();
    return;
  }

  // vertical swipe
  if (absDY > V_THRESHOLD) {
    if (!confirmed){
      if (dy > 0) { // swipe up => move selection up (previous)
        setSelected(selected - 1);
      } else {     // swipe down => move selection down (next)
        setSelected(selected + 1);
      }
    } else {
      // confirmed: only swipe down allowed to move to next question
      if (dy < 0) { // swipe down (dy negative)
        goToNext();
      } else {
        // swipe up after confirm -> warn & shake selected
        const node = answersEl.querySelector(`.answer[data-i="${selected}"]`);
        if (node){ node.classList.add('shakeY'); setTimeout(()=>node.classList.remove('shakeY'),350); }
        showWarning("nah fam — swipe down to move ⬇️");
      }
    }
  }
}, {passive:false});

/* fallback: allow touch anywhere (not only swipeArea) for devices that might not tap the bottom area.
   But to avoid double-handling, we only listen on swipeArea.
*/

/* auto-hide tips after 10s */
setTimeout(()=>{ tipsEl.classList.add('hide'); }, 10000);

/* init */
render();
if (loadingOverlay){
    console.log('[overlay] found overlay, setting up timers');
  const hideLoadingOverlay = ()=>{
      console.log('[overlay] hideLoadingOverlay called');
    loadingOverlay.classList.add('hide');
    loadingOverlay.style.pointerEvents = 'none';
    loadingOverlay.setAttribute('aria-hidden', 'true');
    // remove from layout, then remove node entirely
    setTimeout(()=>{
        console.log('[overlay] post-transition removal');
        loadingOverlay.style.display = 'none';
        if (loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
          console.log('[overlay] node removed');
        }
    }, 700);
  };
  const forceCloseOverlay = ()=>{
      console.log('[overlay] forceCloseOverlay invoked');
    const el = document.getElementById('loadingOverlay');
    if (!el) return;
    el.classList.add('hide');
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden', 'true');
      setTimeout(()=>{ if (el.parentNode) { el.parentNode.removeChild(el); console.log('[overlay] force removed'); } }, 150);
    // allow interactions immediately
    blockClicksUntil = Date.now();
  };
  // wire the button (works even if clicks are currently blocked)
  if (closeOverlayBtn){
      console.log('[overlay] wiring close button');
      closeOverlayBtn.addEventListener('click', (e)=>{ e.stopPropagation(); forceCloseOverlay(); });
  }
  // hide at ~3s after script start
    setTimeout(()=>{ console.log('[overlay] 3s timeout firing'); hideLoadingOverlay(); }, 3000);
  // absolute failsafe shortly after
  setTimeout(()=>{
    // if still present, remove outright
      if (document.getElementById('loadingOverlay')){
        console.warn('[overlay] 3.5s failsafe removing overlay');
      const el = document.getElementById('loadingOverlay');
      el.style.display = 'none';
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }, 3500);
    // extra watchdog (poll up to 6s)
    const start = Date.now();
    const watchdog = setInterval(()=>{
      const el = document.getElementById('loadingOverlay');
      if (!el) { clearInterval(watchdog); return; }
      const elapsed = Date.now() - start;
      if (elapsed > 6000){
        console.warn('[overlay] watchdog removing lingering overlay');
        if (el.parentNode) el.parentNode.removeChild(el);
        clearInterval(watchdog);
      }
    }, 250);
}
// block input for 3 seconds after load to match overlay timing
blockClicksUntil = Date.now() + 3000;