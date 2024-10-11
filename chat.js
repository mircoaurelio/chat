const peer = new Peer();
let conn;
let chatId;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

peer.on('open', (id) => {
    document.getElementById('myId').textContent = id;
    const urlParams = new URLSearchParams(window.location.search);
    const peerId = urlParams.get('id');
    chatId = urlParams.get('chatId');
    
    if (peerId) {
        connectToPeer(peerId);
    } else if (chatId) {
        attemptReconnect(chatId);
    } else {
        document.getElementById('loadingMessage').textContent = 'Ready to chat! Share your link to start.';
        document.getElementById('copyLinkBtn').style.display = 'inline-block';
        setupCopyLinkButton(id);
    }
});

peer.on('connection', (connection) => {
    conn = connection;
    setupConnection();
    if (!chatId) {
        chatId = generateChatId();
        updateUrlWithChatId(chatId);
    }
    showChatInterface();
    displayMessage('Your friend has joined the chat!', 'system');
});

function connectToPeer(peerId) {
    conn = peer.connect(peerId);
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connected to peer');
        displayMessage('Connected to peer', 'system');
        conn.send({ type: 'USER_JOINED', chatId: chatId });
    });
    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'USER_JOINED') {
            if (!chatId) {
                chatId = data.chatId;
                updateUrlWithChatId(chatId);
            }
            displayMessage('Your friend has joined the chat!', 'system');
        } else {
            displayMessage(data, 'friend');
            playSound(receiveSound);
        }
    });
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
        currentUrl.searchParams.set('id', id);
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

function updateUrlWithChatId(chatId) {
    const url = new URL(window.location.href);
    url.searchParams.set('chatId', chatId);
    window.history.replaceState({}, '', url);
}

function attemptReconnect(chatId) {
    // Here you would implement logic to reconnect to a specific chat
    // This might involve connecting to a known peer or waiting for a connection
    console.log('Attempting to reconnect to chat:', chatId);
    showChatInterface();
    displayMessage('Waiting for your friend to rejoin...', 'system');
}

// Allow sending messages with Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
