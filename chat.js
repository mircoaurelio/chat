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
    
    console.log('Peer opened. My ID:', id, 'Chat ID:', chatId, 'Peer ID:', peerId);

    if (chatId && peerId) {
        // Reconnecting to existing chat
        console.log('Reconnecting to existing chat');
        connectToPeer(peerId);
    } else if (peerId) {
        // New connection with peer ID (receiver)
        console.log('New connection as receiver');
        isInitiator = false;
        connectToPeer(peerId);
    } else {
        // New chat, waiting for connection (initiator)
        console.log('New chat as initiator');
        isInitiator = true;
        document.getElementById('loadingMessage').textContent = 'Ready to chat! Share your link to start.';
        document.getElementById('copyLinkBtn').style.display = 'inline-block';
        setupCopyLinkButton(id);
    }
    
    // Start periodic connection status checks
    setInterval(checkConnectionStatus, 5000); // Check every 5 seconds
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
    console.log('Connecting to peer:', peerId);
    conn = peer.connect(peerId, { reliable: true });
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connected to peer');
        displayMessage('Connected to peer', 'system');
        showChatInterface();
        
        if (chatId && isInitiator) {
            // Send chatId to peer for reconnection purposes
            console.log('Sending chat ID to peer');
            conn.send({ type: 'chatId', chatId: chatId, initiatorId: myPeerId });
        }
    });
    
    conn.on('data', (data) => {
        console.log('Received data:', data);
        if (typeof data === 'object' && data.type === 'chatId') {
            handleChatIdMessage(data.chatId, data.initiatorId);
        } else {
            displayMessage(data, 'friend');
            playSound(receiveSound);
        }
    });

    conn.on('close', () => {
        console.log('Connection closed');
        displayMessage('Your friend has disconnected', 'system');
        // You can add additional logic here, like disabling the chat interface
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        displayMessage('Connection error: ' + err.message, 'system');
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

function checkConnectionStatus() {
    console.log('Checking connection status');
    if (conn) {
        console.log('Connection state:', conn.open ? 'open' : 'closed');
    } else {
        console.log('No connection established');
    }
    
    if (conn && !conn.open) {
        console.log('Connection lost');
        displayMessage('Connection lost. Attempting to reconnect...', 'system');
        // Attempt to reconnect
        if (chatId) {
            connectToPeer(conn.peer);
        }
    }
}
