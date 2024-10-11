const peer = new Peer();
let conn;
let chatId;
let myPeerId;
let isInitiator = false;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

function storePeerId(peerId) {
    localStorage.setItem('storedPeerId', peerId);
}

function getStoredPeerId() {
    return localStorage.getItem('storedPeerId');
}

peer.on('open', (id) => {
    const urlParams = new URLSearchParams(window.location.search);
    chatId = urlParams.get('chatId');
    let peerId = urlParams.get('peerId');
    
    const storedPeerId = getStoredPeerId();
    
    if (chatId && peerId) {
        // Reconnecting to existing chat
        myPeerId = storedPeerId || id;
        isInitiator = myPeerId === peerId;
        if (isInitiator && storedPeerId) {
            // Use the stored peer ID for the initiator
            peer.destroy();
            peer = new Peer(storedPeerId);
            peer.on('open', () => {
                document.getElementById('myId').textContent = storedPeerId;
                waitForConnection();
            });
        } else {
            document.getElementById('myId').textContent = id;
            connectToPeer(peerId);
        }
    } else if (peerId) {
        // New connection with peer ID (receiver)
        myPeerId = id;
        isInitiator = false;
        document.getElementById('myId').textContent = id;
        connectToPeer(peerId);
    } else {
        // New chat, waiting for connection (initiator)
        myPeerId = id;
        isInitiator = true;
        storePeerId(id);
        document.getElementById('myId').textContent = id;
        updateUrlWithChatIdAndPeerId(null, myPeerId);
        document.getElementById('loadingMessage').textContent = 'Ready to chat! Share your link to start.';
        document.getElementById('copyLinkBtn').style.display = 'inline-block';
        setupCopyLinkButton(id);
    }
});

peer.on('connection', (connection) => {
    conn = connection;
    setupConnection();
    showChatInterface();
    
    if (isInitiator && !chatId) {
        // Generate new chat ID for first-time connection
        chatId = generateChatId();
        updateUrlWithChatIdAndPeerId(chatId, myPeerId);
        conn.send({ type: 'chatId', chatId: chatId, initiatorId: myPeerId });
    }
    
    displayMessage('Your friend has joined the chat!', 'system');
});

function connectToPeer(peerId) {
    if (conn) {
        conn.close();
    }
    conn = peer.connect(peerId);
    setupConnection();
    showChatInterface();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connected to peer');
        displayMessage('Connected to peer', 'system');
        
        if (isInitiator) {
            // Send chatId to peer for reconnection purposes
            conn.send({ type: 'chatId', chatId: chatId, initiatorId: myPeerId });
        }
    });
    
    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'chatId') {
            handleChatIdMessage(data.chatId, data.initiatorId);
        } else {
            displayMessage(data, 'friend');
            playSound(receiveSound);
        }
    });

    setupConnectionLossDetection();
}

function handleChatIdMessage(receivedChatId, initiatorId) {
    if (!chatId) {
        chatId = receivedChatId;
        updateUrlWithChatIdAndPeerId(chatId, initiatorId);
    }
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message && conn && conn.open) {
        conn.send(message);
        displayMessage(message, 'you');
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

function generateChatId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function updateUrlWithChatIdAndPeerId(chatId, peerId) {
    const url = new URL(window.location.href);
    url.searchParams.set('chatId', chatId);
    url.searchParams.set('peerId', peerId);
    window.history.replaceState({}, '', url);
}

// Allow sending messages with Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function waitForConnection() {
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
        showChatInterface();
        displayMessage('Your friend has rejoined the chat!', 'system');
    });
}
