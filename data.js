// Initialisation des données
let folders = JSON.parse(localStorage.getItem('p1_folders')) || [];
let qcms = JSON.parse(localStorage.getItem('p1_qcms')) || [];

function saveData() {
    localStorage.setItem('p1_folders', JSON.stringify(folders));
    localStorage.setItem('p1_qcms', JSON.stringify(qcms));
}

// Générateur d'ID unique
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// EXPORT
function exportData(includeStats) {
    let dataToExport = { folders: folders, qcms: qcms };
    
    if (!includeStats) {
        // Copie profonde pour ne pas altérer les données locales
        dataToExport = JSON.parse(JSON.stringify(dataToExport));
        dataToExport.qcms.forEach(q => {
            q.attempts = 0;
            q.successes = 0;
            q.lastPlayed = null;
        });
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", includeStats ? "QCM_P1_Backup.json" : "QCM_P1_Partage.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// IMPORT
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if(imported.folders && imported.qcms) {
                folders = imported.folders;
                qcms = imported.qcms;
                saveData();
                alert('Importation réussie !');
                location.reload();
            }
        } catch(err) {
            alert('Fichier invalide.');
        }
    };
    reader.readAsText(file);
}

// RESET
function clearAllData() {
    if(confirm("ATTENTION : Es-tu sûr de vouloir tout supprimer ? Cette action est irréversible.")) {
        localStorage.removeItem('p1_folders');
        localStorage.removeItem('p1_qcms');
        location.reload();
    }
}
