const peer = new Peer();
let conn;
let chatId;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

peer.on('open', (id) => {
    document.getElementById('myId').textContent = id;
    const urlParams = new URLSearchParams(window.location.search);
    chatId = urlParams.get('chatId') || localStorage.getItem('currentChatId');
    const peerId = urlParams.get('peerId');
    
    if (chatId) {
        connectToChat(chatId);
    } else if (peerId) {
        connectToPeer(peerId);
    } else {
        document.getElementById('loadingMessage').textContent = 'Ready to chat! Share your link to start.';
        document.getElementById('copyLinkBtn').style.display = 'inline-block';
        setupCopyLinkButton(id);
    }
});

peer.on('connection', (connection) => {
    conn = connection;
    setupConnection();
    showChatInterface();
    
    if (!chatId) {
        chatId = generateChatId();
        updateUrlWithChatId(chatId);
        conn.send({ type: 'chatId', chatId: chatId });
    }
    
    displayMessage('Your friend has joined the chat!', 'system');
});

function connectToChat(chatId) {
    const storedPeerId = localStorage.getItem(`peerId_${chatId}`);
    if (storedPeerId) {
        connectToPeer(storedPeerId);
        loadChatHistory(chatId);
    } else {
        displayMessage('Unable to reconnect to chat. Please share a new link.', 'system');
        showShareInterface();
    }
}

function connectToPeer(peerId) {
    conn = peer.connect(peerId);
    setupConnection();
    showChatInterface();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connected to peer');
        displayMessage('Connected to peer', 'system');
        
        if (chatId) {
            conn.send({ type: 'chatId', chatId: chatId });
        }
    });
    
    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'chatId') {
            handleChatIdMessage(data.chatId);
        } else {
            displayMessage(data, 'friend');
            saveChatMessage(chatId, 'friend', data);
            playSound(receiveSound);
        }
    });
}

function handleChatIdMessage(receivedChatId) {
    if (!chatId) {
        chatId = receivedChatId;
        updateUrlWithChatId(chatId);
    }
    localStorage.setItem('currentChatId', chatId);
    localStorage.setItem(`peerId_${chatId}`, conn.peer);
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message && conn && conn.open) {
        conn.send(message);
        displayMessage(message, 'you');
        saveChatMessage(chatId, 'you', message);
        messageInput.value = '';
        playSound(sendSound);
    }
}

function displayMessage(message, className) {
    const chatArea = document.getElementById('chatArea');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${className}`;
    messageElement.textContent = message;
    chatArea.appendChild(messageElement);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function saveChatMessage(chatId, sender, message) {
    const chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${chatId}`) || '[]');
    chatHistory.push({ sender, message, timestamp: new Date().toISOString() });
    localStorage.setItem(`chatHistory_${chatId}`, JSON.stringify(chatHistory));
}

function loadChatHistory(chatId) {
    const chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${chatId}`) || '[]');
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = '';
    chatHistory.forEach(msg => {
        displayMessage(msg.message, msg.sender);
    });
}

function playSound(audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(error => console.error('Error playing sound:', error));
}

function setupCopyLinkButton(id) {
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const copyStatus = document.getElementById('copyStatus');

    copyLinkBtn.addEventListener('click', () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('peerId', id);
        const fullUrl = currentUrl.toString();

        navigator.clipboard.writeText(fullUrl).then(() => {
            copyStatus.textContent = 'Link copied to clipboard!';
            setTimeout(() => {
                copyStatus.textContent = '';
            }, 3000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            copyStatus.textContent = 'Failed to copy link. Please try again.';
        });
    });
}

function showChatInterface() {
    document.getElementById('chatInterface').style.display = 'flex';
    document.getElementById('chatInterface').style.flexDirection = 'column';
    document.getElementById('shareInterface').style.display = 'none';
}

function showShareInterface() {
    document.getElementById('chatInterface').style.display = 'none';
    document.getElementById('shareInterface').style.display = 'block';
}

function generateChatId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function updateUrlWithChatId(chatId) {
    const url = new URL(window.location.href);
    url.searchParams.set('chatId', chatId);
    window.history.replaceState({}, '', url);
}

// Allow sending messages with Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
