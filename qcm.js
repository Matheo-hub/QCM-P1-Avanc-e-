let currentSession = [];
let currentQuestionIndex = 0;
let sessionMode = 'training'; // 'training', 'exam', 'readonly'
let sessionStats = { totalTime: 0, overtime: 0, answers: [] };
let globalTimerInterval, localTimerInterval;
let localTimeElapsed = 0;

function startCustomSession(type) {
    if(qcms.length === 0) return alert("Aucun QCM disponible.");
    let selectedQcms = [...qcms];
    
    if (type === 'oldest') {
        selectedQcms.sort((a, b) => (a.lastPlayed || 0) - (b.lastPlayed || 0));
    } else if (type === 'worst') {
        selectedQcms.sort((a, b) => {
            const rateA = a.attempts ? (a.successes / a.attempts) : 0;
            const rateB = b.attempts ? (b.successes / b.attempts) : 0;
            return rateA - rateB;
        });
    }
    
    // On prend les 20 premiers (ou moins)
    currentSession = selectedQcms.slice(0, 20);
    sessionMode = 'training';
    launchUI();
}

function startSession() {
    const folderId = document.getElementById('home-folder-select').value;
    sessionMode = document.getElementById('home-mode-select').value;
    const count = parseInt(document.getElementById('home-qcm-count').value);
    
    let pool = folderId === 'all' ? [...qcms] : qcms.filter(q => q.folderId === folderId);
    if(pool.length === 0) return alert("Aucun QCM dans ce dossier.");
    
    // Mélange (Fisher-Yates)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    currentSession = sessionMode === 'exam' ? pool.slice(0, count) : pool;
    launchUI();
}

function launchUI() {
    currentQuestionIndex = 0;
    sessionStats = { totalTime: 0, overtime: 0, answers: [] };
    document.getElementById('view-qcm').classList.add('active');
    document.getElementById('qcm-mode-title').innerText = sessionMode === 'exam' ? 'Examen P1' : 'Entraînement P1';
    
    startGlobalTimer();
    renderQuestion();
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function startGlobalTimer() {
    clearInterval(globalTimerInterval);
    globalTimerInterval = setInterval(() => {
        sessionStats.totalTime++;
        document.getElementById('qcm-global-time').innerText = formatTime(sessionStats.totalTime);
    }, 1000);
}

function renderQuestion() {
    const q = currentSession[currentQuestionIndex];
    document.getElementById('qcm-progress-text').innerText = `Question ${currentQuestionIndex + 1} sur ${currentSession.length}`;
    document.getElementById('qcm-progress-fill').style.width = `${((currentQuestionIndex + 1) / currentSession.length) * 100}%`;
    document.getElementById('qcm-question-text').innerText = q.question;
    
    const container = document.getElementById('qcm-options-container');
    container.innerHTML = q.options.map((opt, i) => `
        <div class="qcm-option" id="opt-${i}" onclick="toggleOption(${i})">
            <div class="option-letter">${opt.letter}</div>
            <div>${opt.text}</div>
        </div>
    `).join('');

    document.getElementById('qcm-validate-btn').classList.remove('hidden');
    document.getElementById('qcm-next-btn').classList.add('hidden');
    document.getElementById('qcm-back-to-summary-btn').classList.add('hidden');

    // Minuteur Local 1min20 (80s)
    localTimeElapsed = 0;
    clearInterval(localTimerInterval);
    const localDisplay = document.getElementById('qcm-local-timer');
    localDisplay.classList.remove('timer-danger');
    
    if (sessionMode !== 'readonly') {
        localTimerInterval = setInterval(() => {
            localTimeElapsed++;
            const timeLeft = 80 - localTimeElapsed;
            if (timeLeft >= 0) {
                localDisplay.innerText = formatTime(timeLeft);
            } else {
                localDisplay.classList.add('timer-danger');
                localDisplay.innerText = "+" + formatTime(Math.abs(timeLeft));
                sessionStats.overtime++;
            }
        }, 1000);
    } else {
        localDisplay.innerText = "--:--";
        showCorrection(q); // Affiche la correction direct si mode readonly
    }
}

function toggleOption(index) {
    if(document.getElementById('qcm-next-btn').classList.contains('hidden') && sessionMode !== 'readonly') {
        document.getElementById(`opt-${index}`).classList.toggle('selected');
    }
}

function validateQuestion() {
    clearInterval(localTimerInterval);
    const q = currentSession[currentQuestionIndex];
    let isFullyCorrect = true;
    let isPartiallyCorrect = false;
    let hasMistake = false;

    q.options.forEach((opt, i) => {
        const el = document.getElementById(`opt-${i}`);
        const isSelected = el.classList.contains('selected');
        
        if (isSelected && opt.isCorrect) isPartiallyCorrect = true;
        if (isSelected !== opt.isCorrect) {
            isFullyCorrect = false;
            if(isSelected && !opt.isCorrect) hasMistake = true;
        }
    });

    let status = isFullyCorrect ? 'correct' : (hasMistake ? 'wrong' : 'partial');
    
    // MAJ des statistiques du QCM dans la base
    const dbQcm = qcms.find(x => x.id === q.id);
    if(dbQcm && sessionMode !== 'readonly') {
        dbQcm.lastPlayed = Date.now();
        dbQcm.attempts = (dbQcm.attempts || 0) + 1;
        if(isFullyCorrect) dbQcm.successes = (dbQcm.successes || 0) + 1;
        saveData();
    }

    sessionStats.answers.push({ qcm: q, status: status, selections: q.options.map((o,i) => document.getElementById(`opt-${i}`).classList.contains('selected')) });

    if (sessionMode === 'training') {
        showCorrection(q);
        document.getElementById('qcm-validate-btn').classList.add('hidden');
        document.getElementById('qcm-next-btn').classList.remove('hidden');
    } else {
        nextQuestion(); // En examen, on passe directement sans correction
    }
}

function showCorrection(q) {
    q.options.forEach((opt, i) => {
        const el = document.getElementById(`opt-${i}`);
        if(sessionMode === 'readonly') {
            // Remettre les sélections de l'utilisateur
            const previousSelection = sessionStats.answers[currentQuestionIndex].selections[i];
            if(previousSelection) el.classList.add('selected');
        }
        
        if (opt.isCorrect) {
            el.classList.add('correct');
        } else if (el.classList.contains('selected')) {
            el.classList.add('wrong'); // Applique le rouge pâle du CSS
        }
    });
    
    if(sessionMode === 'readonly') {
        document.getElementById('qcm-validate-btn').classList.add('hidden');
        document.getElementById('qcm-back-to-summary-btn').classList.remove('hidden');
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentSession.length) {
        renderQuestion();
    } else {
        finishSession();
    }
}

function finishSession() {
    clearInterval(globalTimerInterval);
    clearInterval(localTimerInterval);
    document.getElementById('view-qcm').classList.remove('active');
    
    const summaryView = document.getElementById('view-summary');
    summaryView.classList.add('active');
    
    let correctCount = sessionStats.answers.filter(a => a.status === 'correct').length;
    document.getElementById('summary-score').innerText = `${correctCount} / ${currentSession.length}`;
    document.getElementById('summary-time').innerText = formatTime(sessionStats.totalTime);
    document.getElementById('summary-overtime').innerText = formatTime(sessionStats.overtime);
    
    const grid = document.getElementById('summary-grid');
    grid.innerHTML = sessionStats.answers.map((ans, i) => `
        <div class="summary-box ${ans.status}" onclick="reviewQuestion(${i})">${i + 1}</div>
    `).join('');
}

function reviewQuestion(index) {
    document.getElementById('view-summary').classList.remove('active');
    document.getElementById('view-qcm').classList.add('active');
    
    const previousMode = sessionMode;
    sessionMode = 'readonly';
    currentQuestionIndex = index;
    renderQuestion();
    sessionMode = previousMode; // On restaure pour ne pas casser la logique si on quitte
}

function backToSummary() {
    document.getElementById('view-qcm').classList.remove('active');
    document.getElementById('view-summary').classList.add('active');
}

function quitSession() {
    clearInterval(globalTimerInterval);
    clearInterval(localTimerInterval);
    document.getElementById('view-qcm').classList.remove('active');
    document.getElementById('view-summary').classList.remove('active');
}
