// Navigation Tab Bar
function switchTab(tabId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if(tabId === 'folders') renderFoldersView();
    if(tabId === 'create') updateFolderSelects();
    if(tabId === 'home') updateFolderSelects();
}

// Rendu des Dossiers (Accordéon)
function renderFoldersView() {
    const container = document.getElementById('folders-container');
    container.innerHTML = '';
    
    // Organiser en arborescence
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
                    ${folderQCMs.map(q => `<div class="qcm-list-item"><span>${q.question.substring(0, 30)}...</span></div>`).join('')}
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
    const content = document.getElementById(`content-${folderId}`);
    content.classList.toggle('open');
}

// Modal Modification Dossier
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

function closeFolderModal() {
    document.getElementById('modal-folder').classList.add('hidden');
}

function saveFolderModal() {
    const name = document.getElementById('modal-folder-name').value;
    const parentId = document.getElementById('modal-folder-parent').value;
    if(!name) return;

    if(currentEditFolderId) {
        const folder = folders.find(f => f.id === currentEditFolderId);
        folder.name = name;
        folder.parentId = parentId || null;
    } else {
        folders.push({ id: generateId(), name: name, parentId: parentId || null });
    }
    saveData();
    closeFolderModal();
    renderFoldersView();
}

function deleteFolderModal() {
    if(!currentEditFolderId) return;
    if(confirm("Supprimer ce dossier et ses QCM ?")) {
        folders = folders.filter(f => f.id !== currentEditFolderId && f.parentId !== currentEditFolderId);
        qcms = qcms.filter(q => q.folderId !== currentEditFolderId);
        saveData();
        closeFolderModal();
        renderFoldersView();
    }
}

// Remplir les Selects dans Accueil et Créer
function updateFolderSelects() {
    const selectHome = document.getElementById('home-folder-select');
    const selectCreate = document.getElementById('create-folder-select');
    let options = '<option value="all">Toutes les matières (Mélange général)</option>';
    let createOptions = '';
    
    folders.forEach(f => {
        const opt = `<option value="${f.id}">${f.name}</option>`;
        options += opt;
        createOptions += opt;
    });
    
    if(selectHome) selectHome.innerHTML = options;
    if(selectCreate) selectCreate.innerHTML = createOptions;
}

// Gérer la page Créer (inchangée dans la logique pure)
document.addEventListener('DOMContentLoaded', () => {
    updateFolderSelects();
    renderCreateItems();
});

function renderCreateItems() {
    const container = document.getElementById('create-items-container');
    const letters = ['A', 'B', 'C', 'D', 'E'];
    container.innerHTML = letters.map(l => `
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
