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
    const peerId = urlParams.get('peerId');
    
    if (chatId && peerId) {
        // Reconnecting to existing chat
        connectToPeer(peerId);
    } else if (peerId) {
        // New connection with peer ID (receiver)
        isInitiator = false;
        connectToPeer(peerId);
    } else {
        // New chat, waiting for connection (initiator)
        isInitiator = true;
        document.getElementById('loadingMessage').textContent = 'Ready to chat! Share your link to start.';
        document.getElementById('copyLinkBtn').style.display = 'inline-block';
        setupCopyLinkButton(id);
    }
    
    // Remove the setInterval call from here
});

// Add these new event listeners for the peer object
peer.on('disconnected', () => {
    console.log('Disconnected from server');
    displayMessage('Disconnected from server. Attempting to reconnect...', 'system');
    // Attempt to reconnect to the signaling server
    let reconnectInterval = setInterval(() => {
        if (!peer.destroyed) {
            peer.reconnect();
        }
    }, 5000);
});

peer.on('close', () => {
    console.log('Connection destroyed');
    displayMessage('Connection closed. Please refresh the page to start a new chat.', 'system');
    clearInterval(reconnectInterval);
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

    conn.on('close', () => {
        console.log('Connection to peer closed');
        displayMessage('Your friend has disconnected. Waiting for them to reconnect...', 'system');
        // Attempt to reconnect
        attemptReconnection();
    });
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

// Add this new function
function attemptReconnection() {
    if (chatId && conn.peer) {
        console.log('Attempting to reconnect...');
        setTimeout(() => {
            connectToPeer(conn.peer);
        }, 5000); // Wait 5 seconds before attempting to reconnect
    }
}
