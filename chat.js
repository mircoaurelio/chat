const peer = new Peer();
let conn;
let chatId;
let myPeerId;
let isInitiator = false;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

peer.on('open', (id) => {
    myPeerId = id;
    document.getElementById('myId').textContent = id;
    const urlParams = new URLSearchParams(window.location.search);
    chatId = urlParams.get('chatId');
    const initiatorId = urlParams.get('initiatorId');
    const receiverId = urlParams.get('receiverId');
    
    if (chatId && initiatorId && receiverId) {
        // Reconnecting to existing chat
        if (myPeerId === initiatorId) {
            connectToPeer(receiverId);
        } else if (myPeerId === receiverId) {
            connectToPeer(initiatorId);
        } else {
            // If neither ID matches, show the share interface
            showShareInterface();
        }
    } else if (initiatorId && !receiverId) {
        // New connection for receiver
        isInitiator = false;
        connectToPeer(initiatorId);
    } else {
        // New chat, waiting for connection (initiator)
        isInitiator = true;
        showShareInterface();
    }
});

peer.on('connection', (connection) => {
    conn = connection;
    setupConnection();
    showChatInterface();
    
    if (isInitiator && !chatId) {
        // Generate new chat ID for first-time connection
        chatId = generateChatId();
        updateUrlWithChatInfo(chatId, myPeerId, conn.peer);
        conn.send({ type: 'chatInfo', chatId: chatId, initiatorId: myPeerId, receiverId: conn.peer });
    }
    
    displayMessage('Your friend has joined the chat!', 'system');
});

function connectToPeer(peerId) {
    conn = peer.connect(peerId);
    setupConnection();
    showChatInterface();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connected to peer');
        displayMessage('Connected to peer', 'system');
        
        if (chatId && isInitiator) {
            // Send chat info to peer for reconnection purposes
            conn.send({ type: 'chatInfo', chatId: chatId, initiatorId: myPeerId, receiverId: conn.peer });
        }
    });
    
    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'chatInfo') {
            handleChatInfoMessage(data);
        } else {
            displayMessage(data, 'friend');
            playSound(receiveSound);
        }
    });
}

function handleChatInfoMessage(data) {
    if (!chatId) {
        chatId = data.chatId;
        updateUrlWithChatInfo(data.chatId, data.initiatorId, data.receiverId);
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

function updateUrlWithChatInfo(chatId, initiatorId, receiverId) {
    const url = new URL(window.location.href);
    url.searchParams.set('chatId', chatId);
    url.searchParams.set('initiatorId', initiatorId);
    url.searchParams.set('receiverId', receiverId);
    window.history.replaceState({}, '', url);
}

// Allow sending messages with Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
