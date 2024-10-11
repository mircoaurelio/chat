const peer = new Peer();
let conn;

const sendSound = document.getElementById('sendSound');
const receiveSound = document.getElementById('receiveSound');

function generateChatId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getChatId() {
    let chatId = localStorage.getItem('chatId');
    if (!chatId) {
        chatId = generateChatId();
        localStorage.setItem('chatId', chatId);
    }
    return chatId;
}

peer.on('open', (id) => {
    document.getElementById('myId').textContent = id;
    const urlParams = new URLSearchParams(window.location.search);
    let peerId = urlParams.get('id');
    
    if (!peerId) {
        const chatId = getChatId();
        peerId = `${id}-${chatId}`;
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('id', peerId);
        window.history.pushState({}, '', newUrl);
    }

    const [targetPeerId, chatId] = peerId.split('-');
    if (targetPeerId !== id) {
        connectToPeer(targetPeerId);
        showChatInterface();
    } else {
        document.getElementById('loadingMessage').textContent = 'Ready to chat! Share your link to start.';
        document.getElementById('copyLinkBtn').style.display = 'inline-block';
        setupCopyLinkButton(peerId);
    }
});

peer.on('connection', (connection) => {
    conn = connection;
    setupConnection();
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
        conn.send('__USER_JOINED__');
    });
    conn.on('data', (data) => {
        if (data === '__USER_JOINED__') {
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

function setupCopyLinkButton(peerId) {
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const copyStatus = document.getElementById('copyStatus');

    copyLinkBtn.addEventListener('click', () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('id', peerId);
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

// Allow sending messages with Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
