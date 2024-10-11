const peer = new Peer();
let conn;
let chatId;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

peer.on('open', (id) => {
    document.getElementById('myId').textContent = id;
    const urlParams = new URLSearchParams(window.location.search);
    chatId = urlParams.get('chatId');
    const peerId = urlParams.get('peerId');
    
    if (chatId) {
        // Attempt to reconnect to existing chat
        connectToChat(chatId);
    } else if (peerId) {
        // New connection with peer ID
        connectToPeer(peerId);
    } else {
        // New chat, waiting for connection
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
        // Generate new chat ID for first-time connection
        chatId = generateChatId();
        updateUrlWithChatId(chatId);
        conn.send({ type: 'chatId', chatId: chatId });
    }
    
    displayMessage('Your friend has joined the chat!', 'system');
});

function connectToChat(chatId) {
    // Attempt to reconnect using stored peer ID
    const storedPeerId = localStorage.getItem(`peerId_${chatId}`);
    if (storedPeerId) {
        connectToPeer(storedPeerId);
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
            // Send chatId to peer for reconnection purposes
            conn.send({ type: 'chatId', chatId: chatId });
        }
    });
    
    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'chatId') {
            handleChatIdMessage(data.chatId);
        } else {
            displayMessage(data, 'friend');
            playSound(receiveSound);
        }
    });
}

function handleChatIdMessage(receivedChatId) {
    if (!chatId) {
        chatId = receivedChatId;
        updateUrlWithChatId(chatId);
    }
    localStorage.setItem(`peerId_${chatId}`, conn.peer);
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
