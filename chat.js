const peer = new Peer();
let conn;
let chatId;
let myPeerId;
let reconnectionCode;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

peer.on('open', (id) => {
    myPeerId = id;
    document.getElementById('myId').textContent = id;
    const urlParams = new URLSearchParams(window.location.search);
    chatId = urlParams.get('chatId');
    reconnectionCode = urlParams.get('rc');
    const peerId = urlParams.get('peerId');
    
    if (chatId && reconnectionCode) {
        // Attempt to reconnect to existing chat
        connectToChat(chatId, reconnectionCode);
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
        // Generate new chat ID and reconnection code for first-time connection
        chatId = generateChatId();
        reconnectionCode = generateReconnectionCode();
        updateUrlWithChatInfo(chatId, reconnectionCode);
        conn.send({ type: 'chatInfo', chatId: chatId, reconnectionCode: reconnectionCode });
    }
    
    displayMessage('Your friend has joined the chat!', 'system');
});

function connectToChat(chatId, reconnectionCode) {
    // Use the reconnection code to find the correct peer to connect to
    const storedPeerId = localStorage.getItem(`peer_${chatId}_${reconnectionCode}`);
    
    if (storedPeerId && storedPeerId !== myPeerId) {
        connectToPeer(storedPeerId);
    } else {
        displayMessage('Waiting for your friend to reconnect...', 'system');
        showChatInterface();
        // Register this peer for potential incoming connections
        localStorage.setItem(`peer_${chatId}_${reconnectionCode}`, myPeerId);
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
        
        if (chatId && reconnectionCode) {
            // Send chat info to peer for reconnection purposes
            conn.send({ type: 'chatInfo', chatId: chatId, reconnectionCode: reconnectionCode });
        }
    });
    
    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'chatInfo') {
            handleChatInfoMessage(data.chatId, data.reconnectionCode);
        } else {
            displayMessage(data, 'friend');
            playSound(receiveSound);
        }
    });
}

function handleChatInfoMessage(receivedChatId, receivedReconnectionCode) {
    if (!chatId) {
        chatId = receivedChatId;
        reconnectionCode = receivedReconnectionCode;
        updateUrlWithChatInfo(chatId, reconnectionCode);
    }
    
    // Store the peer ID for future reconnections
    localStorage.setItem(`peer_${chatId}_${reconnectionCode}`, conn.peer);
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
    return Math.random().toString(36).substring(2, 15);
}

function generateReconnectionCode() {
    return Math.random().toString(36).substring(2, 10);
}

function updateUrlWithChatInfo(chatId, reconnectionCode) {
    const url = new URL(window.location.href);
    url.searchParams.set('chatId', chatId);
    url.searchParams.set('rc', reconnectionCode);
    url.searchParams.delete('peerId');  // Remove peerId from URL after connection
    window.history.replaceState({}, '', url);
}

// Allow sending messages with Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
