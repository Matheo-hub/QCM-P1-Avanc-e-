// --- 1. INITIALISATION ET DONNÉES ---
let folders = JSON.parse(localStorage.getItem('p1_folders')) || [];
let qcms = JSON.parse(localStorage.getItem('p1_qcms')) || [];

function saveData() {
    localStorage.setItem('p1_folders', JSON.stringify(folders));
    localStorage.setItem('p1_qcms', JSON.stringify(qcms));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

document.addEventListener('DOMContentLoaded', () => {
    updateFolderSelects();
    renderCreateItems();
    renderFoldersView();
});

// --- 2. NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');
    
    const tabs = document.querySelectorAll('.tab');
    if(tabId === 'home') tabs[0].classList.add('active');
    if(tabId === 'folders') tabs[1].classList.add('active');
    if(tabId === 'create') tabs[2].classList.add('active');
    if(tabId === 'settings') tabs[3].classList.add('active');
    
    if(tabId === 'folders') renderFoldersView();
    if(tabId === 'create' || tabId === 'home') updateFolderSelects();
}

// --- 3. GESTION DES DOSSIERS ---
function renderFoldersView() {
    const container = document.getElementById('folders-container');
    container.innerHTML = '';
    const rootFolders = folders.filter(f => !f.parentId);
    
    function buildFolderHTML(folder, depth = 0) {
        const children = folders.filter(f => f.parentId === folder.id);
        const folderQCMs = qcms.filter(q => q.folderId === folder.id);
        
        let html = `
            <div class="folder-item" style="margin-left: ${depth * 15}px">
                <div class="folder-header" onclick="toggleFolder('${folder.id}')">
                    <span>📁 ${folder.name}</span>
                    <span class="folder-actions" onclick="event.stopPropagation(); openEditFolderModal('${folder.id}')">Modifier</span>
                </div>
                <div class="folder-content" id="content-${folder.id}">
                    ${folderQCMs.map(q => `
                        <div class="qcm-list-item" onclick="openEditQcmModal('${q.id}')">
                            <span>${q.question.substring(0, 35)}...</span>
                            <span class="folder-actions">Modifier ✎</span>
                        </div>
                    `).join('')}
                    <div id="children-${folder.id}"></div>
                </div>
            </div>
        `;
        return { html, children };
    }

    function renderTree(folderList, parentElementId = null) {
        folderList.forEach(folder => {
            const { html, children } = buildFolderHTML(folder, parentElementId ? 1 : 0);
            if(parentElementId) {
                document.getElementById(`children-${parentElementId}`).innerHTML += html;
            } else {
                container.innerHTML += html;
            }
            if(children.length > 0) {
                setTimeout(() => renderTree(children, folder.id), 0);
            }
        });
    }
    renderTree(rootFolders);
}

function toggleFolder(folderId) {
    document.getElementById(`content-${folderId}`).classList.toggle('open');
}

let currentEditFolderId = null;
function showFolderModal() {
    currentEditFolderId = null;
    document.getElementById('modal-folder-title').innerText = "Nouveau dossier";
    document.getElementById('modal-folder-name').value = "";
    populateParentSelect();
    document.getElementById('modal-folder').classList.remove('hidden');
}

function openEditFolderModal(folderId) {
    currentEditFolderId = folderId;
    const folder = folders.find(f => f.id === folderId);
    document.getElementById('modal-folder-title').innerText = "Modifier le dossier";
    document.getElementById('modal-folder-name').value = folder.name;
    populateParentSelect(folderId);
    document.getElementById('modal-folder-parent').value = folder.parentId || "";
    document.getElementById('modal-folder').classList.remove('hidden');
}

function populateParentSelect(excludeId = null) {
    const select = document.getElementById('modal-folder-parent');
    select.innerHTML = '<option value="">Aucun (Dossier racine)</option>';
    folders.forEach(f => {
        if(f.id !== excludeId) {
            select.innerHTML += `<option value="${f.id}">${f.name}</option>`;
        }
    });
}
function closeFolderModal() { document.getElementById('modal-folder').classList.add('hidden'); }
function saveFolderModal() {
    const name = document.getElementById('modal-folder-name').value;
    const parentId = document.getElementById('modal-folder-parent').value;
    if(!name) return;
    if(currentEditFolderId) {
        const f = folders.find(f => f.id === currentEditFolderId);
        f.name = name; f.parentId = parentId || null;
    } else {
        folders.push({ id: generateId(), name, parentId: parentId || null });
    }
    saveData(); closeFolderModal(); renderFoldersView(); updateFolderSelects();
}
function deleteFolderModal() {
    if(!currentEditFolderId) return;
    if(confirm("Supprimer ce dossier et ses QCM ?")) {
        folders = folders.filter(f => f.id !== currentEditFolderId && f.parentId !== currentEditFolderId);
        qcms = qcms.filter(q => q.folderId !== currentEditFolderId);
        saveData(); closeFolderModal(); renderFoldersView(); updateFolderSelects();
    }
}

function updateFolderSelects() {
    const selects = ['home-folder-select', 'create-folder-select', 'fast-add-folder-select', 'edit-qcm-folder'];
    let options = '<option value="all">Toutes les matières (Mélange général)</option>';
    let createOptions = '';
    folders.forEach(f => {
        const opt = `<option value="${f.id}">${f.name}</option>`;
        options += opt; createOptions += opt;
    });
    
    if(document.getElementById('home-folder-select')) document.getElementById('home-folder-select').innerHTML = options;
    if(document.getElementById('create-folder-select')) document.getElementById('create-folder-select').innerHTML = createOptions;
    if(document.getElementById('fast-add-folder-select')) document.getElementById('fast-add-folder-select').innerHTML = createOptions;
    if(document.getElementById('edit-qcm-folder')) document.getElementById('edit-qcm-folder').innerHTML = createOptions;
}

// --- 4. GESTION DES QCM (Création & Modif) ---
function renderCreateItems() {
    const container = document.getElementById('create-items-container');
    container.innerHTML = ['A', 'B', 'C', 'D', 'E'].map(l => `
        <div style="display:flex; align-items:center; margin-bottom:10px;">
            <input type="checkbox" id="check-${l}" style="width:20px; height:20px; margin-right:10px;">
            <input type="text" id="item-${l}" placeholder="Item ${l}">
        </div>
    `).join('');
}

function saveNewQCM() {
    const folderId = document.getElementById('create-folder-select').value;
    const question = document.getElementById('create-question').value;
    if(!question || !folderId) return alert("Remplis la question et choisis un dossier.");
    const options = [];
    ['A', 'B', 'C', 'D', 'E'].forEach(l => {
        const text = document.getElementById(`item-${l}`).value;
        const isCorrect = document.getElementById(`check-${l}`).checked;
        if(text) options.push({ text, isCorrect, letter: l });
    });
    qcms.push({ id: generateId(), folderId, question, options, attempts: 0, successes: 0, lastPlayed: null });
    saveData();
    document.getElementById('create-question').value = '';
    ['A', 'B', 'C', 'D', 'E'].forEach(l => {
        document.getElementById(`item-${l}`).value = '';
        document.getElementById(`check-${l}`).checked = false;
    });
    alert("QCM Enregistré !");
}

function fastAddQCM() {
    const folderId = document.getElementById('fast-add-folder-select').value;
    const text = document.getElementById('fast-add-textarea').value;
    if(!folderId || !text) return alert("Choisis un dossier et remplis le texte.");
    
    const lines = text.split('\n');
    let addedCount = 0;
    
    lines.forEach(line => {
        if(line.trim() === '') return;
        const parts = line.split(';').map(p => p.trim());
        if(parts.length >= 7) {
            const question = parts[0];
            const correctStr = parts[6].toUpperCase();
            const options = [];
            
            ['A', 'B', 'C', 'D', 'E'].forEach((letter, index) => {
                const itemText = parts[index + 1];
                if(itemText) {
                    options.push({ text: itemText, letter: letter, isCorrect: correctStr.includes(letter) });
                }
            });
            qcms.push({ id: generateId(), folderId, question, options, attempts: 0, successes: 0, lastPlayed: null });
            addedCount++;
        }
    });
    saveData();
    document.getElementById('fast-add-textarea').value = '';
    alert(`${addedCount} QCM ajouté(s) avec succès !`);
}

let currentEditQcmId = null;
function openEditQcmModal(qcmId) {
    currentEditQcmId = qcmId;
    const qcm = qcms.find(q => q.id === qcmId);
    
    document.getElementById('edit-qcm-question').value = qcm.question;
    updateFolderSelects(); 
    document.getElementById('edit-qcm-folder').value = qcm.folderId;
    
    ['A','B','C','D','E'].forEach(letter => {
        const opt = qcm.options.find(o => o.letter === letter);
        document.getElementById(`edit-qcm-${letter.toLowerCase()}`).value = opt ? opt.text : '';
    });
    
    const corrects = qcm.options.filter(o => o.isCorrect).map(o => o.letter).join(',');
    document.getElementById('edit-qcm-answers').value = corrects;
    
    document.getElementById('modal-edit-qcm').classList.remove('hidden');
}

function closeEditQcmModal() { document.getElementById('modal-edit-qcm').classList.add('hidden'); }

function saveEditQcm() {
    const qcm = qcms.find(q => q.id === currentEditQcmId);
    qcm.question = document.getElementById('edit-qcm-question').value;
    qcm.folderId = document.getElementById('edit-qcm-folder').value;
    const corrects = document.getElementById('edit-qcm-answers').value.toUpperCase();
    
    qcm.options = [];
    ['A','B','C','D','E'].forEach(letter => {
        const text = document.getElementById(`edit-qcm-${letter.toLowerCase()}`).value;
        if(text) {
            qcm.options.push({ letter: letter, text: text, isCorrect: corrects.includes(letter) });
        }
    });
    
    saveData();
    closeEditQcmModal();
    renderFoldersView();
}

function deleteQcm() {
    if(confirm("Supprimer définitivement ce QCM ?")) {
        qcms = qcms.filter(q => q.id !== currentEditQcmId);
        saveData();
        closeEditQcmModal();
        renderFoldersView();
    }
}


// --- 5. MOTEUR D'ENTRAÎNEMENT ---
let currentSession = [], currentQuestionIndex = 0, sessionMode = 'training';
let sessionStats = { totalTime: 0, overtime: 0, answers: [] };
let globalTimerInterval, localTimerInterval, localTimeElapsed = 0;

function startCustomSession(type) {
    if(qcms.length === 0) return alert("Aucun QCM disponible.");
    let selectedQcms = [...qcms];
    if (type === 'oldest') selectedQcms.sort((a, b) => (a.lastPlayed || 0) - (b.lastPlayed || 0));
    else if (type === 'worst') {
        selectedQcms.sort((a, b) => {
            const rateA = a.attempts ? (a.successes / a.attempts) : 0;
            const rateB = b.attempts ? (b.successes / b.attempts) : 0;
            return rateA - rateB;
        });
    }
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

    localTimeElapsed = 0;
    clearInterval(localTimerInterval);
    const localDisplay = document.getElementById('qcm-local-timer');
    localDisplay.classList.remove('timer-danger');
    
    if (sessionMode !== 'readonly') {
        localTimerInterval = setInterval(() => {
            localTimeElapsed++;
            const timeLeft = 80 - localTimeElapsed; // 1min20
            if (timeLeft >= 0) localDisplay.innerText = formatTime(timeLeft);
            else {
                localDisplay.classList.add('timer-danger');
                localDisplay.innerText = "+" + formatTime(Math.abs(timeLeft));
                sessionStats.overtime++;
            }
        }, 1000);
    } else {
        localDisplay.innerText = "--:--";
        showCorrection(q);
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
    let isFullyCorrect = true, isPartiallyCorrect = false, hasMistake = false;

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
    
    const dbQcm = qcms.find(x => x.id === q.id);
    if(dbQcm && sessionMode !== 'readonly') {
        dbQcm.lastPlayed = Date.now();
        dbQcm.attempts = (dbQcm.attempts || 0) + 1;
        if(isFullyCorrect) dbQcm.successes = (dbQcm.successes || 0) + 1;
        saveData();
    }

    sessionStats.answers.push({ status, selections: q.options.map((o,i) => document.getElementById(`opt-${i}`).classList.contains('selected')) });

    if (sessionMode === 'training') {
        showCorrection(q);
        document.getElementById('qcm-validate-btn').classList.add('hidden');
        document.getElementById('qcm-next-btn').classList.remove('hidden');
    } else {
        nextQuestion();
    }
}

function showCorrection(q) {
    q.options.forEach((opt, i) => {
        const el = document.getElementById(`opt-${i}`);
        if(sessionMode === 'readonly' && sessionStats.answers[currentQuestionIndex].selections[i]) {
            el.classList.add('selected');
        }
        if (opt.isCorrect) el.classList.add('correct');
        else if (el.classList.contains('selected')) el.classList.add('wrong');
    });
    
    if(sessionMode === 'readonly') {
        document.getElementById('qcm-validate-btn').classList.add('hidden');
        document.getElementById('qcm-back-to-summary-btn').classList.remove('hidden');
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentSession.length) renderQuestion();
    else finishSession();
}

function finishSession() {
    clearInterval(globalTimerInterval); clearInterval(localTimerInterval);
    document.getElementById('view-qcm').classList.remove('active');
    document.getElementById('view-summary').classList.add('active');
    
    let correctCount = sessionStats.answers.filter(a => a.status === 'correct').length;
    document.getElementById('summary-score').innerText = `${correctCount} / ${currentSession.length}`;
    document.getElementById('summary-time').innerText = formatTime(sessionStats.totalTime);
    document.getElementById('summary-overtime').innerText = formatTime(sessionStats.overtime);
    
    document.getElementById('summary-grid').innerHTML = sessionStats.answers.map((ans, i) => `
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
    sessionMode = previousMode;
}

function backToSummary() {
    document.getElementById('view-qcm').classList.remove('active');
    document.getElementById('view-summary').classList.add('active');
}

function quitSession() {
    clearInterval(globalTimerInterval); clearInterval(localTimerInterval);
    document.getElementById('view-qcm').classList.remove('active');
    document.getElementById('view-summary').classList.remove('active');
}

// --- 6. EXPORT / IMPORT / RESET ---
function exportData(includeStats) {
    let dataToExport = { folders: folders, qcms: qcms };
    if (!includeStats) {
        dataToExport = JSON.parse(JSON.stringify(dataToExport));
        dataToExport.qcms.forEach(q => { q.attempts = 0; q.successes = 0; q.lastPlayed = null; });
    }
    
    // Utilisation de Blob, la méthode robuste pour tous les navigateurs mobiles
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const dl = document.createElement('a');
    dl.href = url;
    dl.download = includeStats ? "QCM_P1_Backup.json" : "QCM_P1_Partage.json";
    document.body.appendChild(dl); 
    dl.click(); 
    document.body.removeChild(dl);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if(imported.folders && imported.qcms) {
                folders = imported.folders; qcms = imported.qcms;
                saveData(); alert('Importation réussie !'); location.reload();
            } else alert("Fichier non reconnu.");
        } catch(err) { alert('Fichier invalide.'); }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if(confirm("ATTENTION : Es-tu sûr de vouloir tout supprimer ? Action irréversible.")) {
        localStorage.removeItem('p1_folders'); localStorage.removeItem('p1_qcms'); location.reload();
    }
}
