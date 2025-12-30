const API_URL = '/api/module';

const dom = {
    code: document.getElementById('pad-code'),
    content: document.getElementById('pad-content'),
    btnOpen: document.getElementById('btn-open'),
    btnSave: document.getElementById('btn-save'),
    btnLock: document.getElementById('btn-lock'),
    btnDelete: document.getElementById('btn-delete'),
    secondaryControls: document.getElementById('secondary-controls'),
    statusText: document.getElementById('status-text'),
    statusDot: document.getElementById('status-dot')
};

// State
let currentCode = '';
let isLocked = false;

// Helper: Status Updates
function setStatus(msg, type = 'neutral') {
    dom.statusText.textContent = msg;
    dom.statusDot.style.backgroundColor = type === 'success' ? '#00ff41' : (type === 'error' ? '#ff0000' : '#ffff00');
    dom.statusDot.style.boxShadow = `0 0 10px ${dom.statusDot.style.backgroundColor}`;
}

// Helper: Update UI State
function updateUiState(locked) {
    isLocked = locked;
    dom.content.readOnly = isLocked;

    if (isLocked) {
        dom.content.style.opacity = '0.7';
        dom.content.style.cursor = 'not-allowed';
        dom.btnLock.textContent = 'UNLOCK';
        dom.btnSave.disabled = true;
        dom.btnSave.style.opacity = '0.5';
        dom.btnSave.style.cursor = 'not-allowed';
    } else {
        dom.content.style.opacity = '1';
        dom.content.style.cursor = 'text';
        dom.btnLock.textContent = 'LOCK';
        dom.btnSave.disabled = false;
        dom.btnSave.style.opacity = '1';
        dom.btnSave.style.cursor = 'pointer';
    }
}

// Helper: Make API Request
async function apiRequest(action, payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_act: action, ...payload })
        });
        return await response.json();
    } catch (err) {
        console.error(err);
        setStatus('CONNECTION_FAILURE', 'error');
        return null;
    }
}

// Action: Open Pad
dom.btnOpen.addEventListener('click', async () => {
    const code = dom.code.value.trim();
    if (!code) {
        setStatus('ERROR: CODE_REQUIRED', 'error');
        return;
    }

    setStatus('ESTABLISHING_UPLINK...', 'neutral');
    const data = await apiRequest('open', { pad_code: code });

    if (data && data.noerror) {
        currentCode = code;
        dom.content.value = data.pad_content || '';

        // Show secondary controls
        dom.secondaryControls.style.display = 'flex';

        // Handle Lock State
        updateUiState(data.padlock);

        setStatus(`CONNECTED: ${code.toUpperCase()}`, 'success');
        if (data.padlock) {
            setStatus('ACCESS: READ_ONLY', 'neutral');
        }
    } else {
        setStatus('ERROR: OPEN_FAILED', 'error');
        dom.secondaryControls.style.display = 'none';
    }
});

// Action: Save Pad
dom.btnSave.addEventListener('click', async () => {
    const content = dom.content.value;
    const code = dom.code.value.trim();

    if (!code) {
        setStatus('ERROR: INVALID_TARGET', 'error');
        return;
    }

    if (isLocked) {
        setStatus('ERROR: CHANNEL_LOCKED', 'error');
        return;
    }

    // Update state to match current input
    currentCode = code;

    setStatus('UPLOADING_ENCRYPTED_PACKET...', 'neutral');
    const data = await apiRequest('save', {
        pad_code: currentCode,
        pad_content: content
    });

    if (data && data.noerror) {
        setStatus('PACKET_SECURED', 'success');
        setTimeout(() => setStatus(`CONNECTED: ${currentCode.toUpperCase()}`, 'success'), 2000);

        // Ensure controls are visible after first save
        dom.secondaryControls.style.display = 'flex';
    } else if (data && data.errormessage) {
        setStatus(`ERROR: ${data.errormessage}`, 'error');
    } else {
        setStatus('ERROR: SAVE_FAILED', 'error');
    }
});

// Action: Lock/Unlock
dom.btnLock.addEventListener('click', async () => {
    if (!currentCode) return;

    setStatus(isLocked ? 'UNLOCKING...' : 'LOCKING...', 'neutral');
    const data = await apiRequest('toggle_lock', { pad_code: currentCode });

    if (data && data.noerror) {
        updateUiState(data.is_locked);
        setStatus(data.is_locked ? 'CHANNEL_LOCKED' : 'CHANNEL_UNLOCKED', 'success');
    } else {
        setStatus('ERROR: LOCK_ACTION_FAILED', 'error');
    }
});

// Action: Delete
dom.btnDelete.addEventListener('click', async () => {
    if (!currentCode) return;

    // Simple confirmation
    if (!confirm('WARNING: DELETE CHANNEL PERMANENTLY? THIS CANNOT BE UNDONE.')) {
        return;
    }

    setStatus('DELETING_CHANNEL...', 'neutral');
    const data = await apiRequest('delete', { pad_code: currentCode });

    if (data && data.noerror) {
        setStatus('CHANNEL_TERMINATED', 'success');
        dom.content.value = '';
        dom.code.value = '';
        currentCode = '';
        dom.secondaryControls.style.display = 'none';
        updateUiState(false);
        window.location.hash = '';
    } else {
        setStatus('ERROR: DELETE_FAILED', 'error');
    }
});

// Init
setStatus('READY_FOR_INPUT', 'neutral');

// Helper: Update URL for sharing
function updateUrl(code) {
    if (code) {
        window.location.hash = code;
    }
}

// Check for hash on load
window.addEventListener('load', async () => {
    const hash = window.location.hash.substring(1); // Remove '#'
    if (hash) {
        dom.code.value = hash;
        // Trigger Open
        dom.btnOpen.click();
    }
});

// Update URL on successful Open
const originalSetStatus = setStatus;
setStatus = (msg, type) => {
    originalSetStatus(msg, type);
    if (type === 'success' && currentCode) {
        updateUrl(currentCode);
    }
};
