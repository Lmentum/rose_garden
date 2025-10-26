const socket = io({ autoConnect: false });
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let players = {};
let input = { left: false, right: false, jump: false };
let time = 0; // For animation timing

// Join game function
function joinGame() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();

    if (username) {
        document.getElementById('username-prompt').style.display = 'none';
        socket.connect();
        socket.emit('join', username);
    }
}

// Handle Enter key in username input
document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});

// Track chat focus state
let isChatFocused = false;

// Chat input focus handlers
document.getElementById('chat-input').addEventListener('focus', () => {
    isChatFocused = true;
    // Clear any existing movement when entering chat
    input.left = false;
    input.right = false;
    input.jump = false;
    socket.emit("input", input);
});

document.getElementById('chat-input').addEventListener('blur', () => {
    isChatFocused = false;
});

// Controls - only active when chat is not focused
document.addEventListener("keydown", e => {
    if (!isChatFocused) {
        if (e.key === "ArrowLeft" || e.key === "a") input.left = true;
        if (e.key === "ArrowRight" || e.key === "d") input.right = true;
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w") input.jump = true;
        socket.emit("input", input);
    }
});
document.addEventListener("keyup", e => {
    if (!isChatFocused) {
        if (e.key === "ArrowLeft" || e.key === "a") input.left = false;
        if (e.key === "ArrowRight" || e.key === "d") input.right = false;
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w") input.jump = false;
        socket.emit("input", input);
    }
});

socket.on("state", state => {
    players = state;
});

// Chat functionality
function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat', message);
        chatInput.value = '';
    }
}

// Handle Enter key in chat input
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Function to add a message to chat
function addMessageToChat(data) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.style.marginBottom = '8px';
    messageDiv.style.wordBreak = 'break-word';

    const time = new Date(data.timestamp).toLocaleTimeString();

    if (data.type === 'join') {
        messageDiv.innerHTML = `<span style="color: ${data.color}">➤ ${data.username}</span> ${data.message} <span style="color: #999; font-size: 0.8em">${time}</span>`;
    } else if (data.type === 'leave') {
        messageDiv.innerHTML = `<span style="color: ${data.color}">← ${data.username}</span> ${data.message} <span style="color: #999; font-size: 0.8em">${time}</span>`;
    } else {
        messageDiv.innerHTML = `<span style="color: ${data.color}">${data.username}:</span> ${data.message} <span style="color: #999; font-size: 0.8em">${time}</span>`;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle individual chat messages
socket.on('chat', addMessageToChat);

// Handle chat history when joining
socket.on('chatHistory', history => {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = ''; // Clear any existing messages
    history.forEach(addMessageToChat);
});

// Render loop
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = "#3b463eca";
    ctx.fillRect(0, 350, canvas.width, 50);

    // Update time for animation
    time += 0.05;

    // Draw players as glowing orbs
    for (let id in players) {
        const p = players[id];

        // Calculate vertical offset based on horizontal movement, only when on ground
        const swayOffset = (Math.abs(p.vx) > 0 && p.y >= 300) ? Math.sin(time * 2) * 5 : 0;
        const displayY = p.y + swayOffset;

        // Create a radial gradient for the glowing effect
        const gradient = ctx.createRadialGradient(
            p.x + 15, displayY + 15, 0,
            p.x + 15, displayY + 15, 20
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Draw the glowing orb
        ctx.beginPath();
        ctx.arc(p.x + 15, displayY + 15, 20, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Add a white core
        ctx.beginPath();
        ctx.arc(p.x + 15, displayY + 15, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        // Draw username
        if (p.username) {
            ctx.font = '16px Marcellus';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(47, 62, 41, 0.8)';
            ctx.fillText(p.username, p.x + 15, displayY - 10);
        }
    }

    requestAnimationFrame(render);
}
render();
