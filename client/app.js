const API_URL = '/api/module';

const dom = {
    code: document.getElementById('pad-code'),
    content: document.getElementById('pad-content'),
    btnOpen: document.getElementById('btn-open'),
    btnSave: document.getElementById('btn-save'),
    statusText: document.getElementById('status-text'),
    statusDot: document.getElementById('status-dot')
};

// State
let currentCode = '';

// Helper: Status Updates
function setStatus(msg, type = 'neutral') {
    dom.statusText.textContent = msg;
    dom.statusDot.style.backgroundColor = type === 'success' ? '#00ff41' : (type === 'error' ? '#ff0000' : '#ffff00');
    dom.statusDot.style.boxShadow = `0 0 10px ${dom.statusDot.style.backgroundColor}`;
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
        setStatus(`CONNECTED: ${code.toUpperCase()}`, 'success');
    } else {
        setStatus('ERROR: OPEN_FAILED', 'error');
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
    } else {
        setStatus('ERROR: SAVE_FAILED', 'error');
    }
});

// Init
setStatus('READY_FOR_INPUT', 'neutral');
