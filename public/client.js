const socket = io({ autoConnect: false });
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Cloud art in layers for more complex clouds
const cloudArt = [
    [
        "                _                      ",
        "              (`  ).                   ",
        "             (     ).              ",
        "            _(       '`.          ",
        "        .=(`(      .   )     .--  ",
        "       ((    (..__.:'-'   .+(   )   ",
        "       `(       ) )       (   .  )  ",
        "         ` __.:'   )     (   (   ))  ",
        "      ( )       --'       `- __.'    ",
        "     (_.'          .')              ",
        "                  (_  )              "
    ],
    [
        "           _                ",
        "        .:(`  )`.          ",
        "       :(   .    )      ",
        "        `.  (    ) )      ",
        "          ` _`  ) )       ",
        "           (   )  ._   ",
        "            `-'.-(`  ) ",
        "              :(      )) ",
        "               `(    )  ))",
        "                ` __.:'   "
    ]
];

// Cloud positions with different scales and opacity
const clouds = [
    { x: -50, y: 20, speed: 0.15, scale: 0.8, art: 0, opacity: 0.9 },
    { x: 100, y: 40, speed: 0.1, scale: 0.7, art: 1, opacity: 0.95 },
    { x: 250, y: 15, speed: 0.12, scale: 0.85, art: 0, opacity: 0.9 },
    { x: 400, y: 60, speed: 0.08, scale: 0.75, art: 1, opacity: 0.85 },
    { x: 550, y: 25, speed: 0.11, scale: 0.9, art: 0, opacity: 0.9 },
    { x: 700, y: 45, speed: 0.09, scale: 0.8, art: 1, opacity: 0.95 },
    { x: 850, y: 30, speed: 0.14, scale: 0.7, art: 0, opacity: 0.85 },
    { x: -200, y: 50, speed: 0.13, scale: 0.85, art: 1, opacity: 0.9 }
];

// Helper function to draw a cloud
function drawCloud(x, y, scale = 1, artIndex = 0, opacity = 0.8) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.font = '12px monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.textAlign = 'left';

    // Draw cloud line by line
    const art = cloudArt[artIndex];
    art.forEach((line, index) => {
        ctx.fillText(line, 0, index * 12);
    });

    ctx.restore();
} const roseArt = [
    "                   .,,. ",
    "            .,v%;mmmmmmmm;%%vv,. ",
    "         ,vvv%;mmmvv;vvvmmm;%vvvv,    .,,. ",
    "  ,, ,vvvnnv%;mmmvv;%%;vvmmm;%vvvv%;mmmmmmm, ",
    ",mmmmmm;%%vv%;mmmvv;%%;vvmmm;%v%;mmmmmmmmmmm ",
    "mmmmmmmmmmm;%%;mmmvv%;vvmmm;%mmmmmmmmmmmmmm' ",
    "`mmmmmmmmmmmmmm%;mmv;vmmm;mmmmmmm;%vvvvvv' ",
    "    `%%%%%;mmmmmmmm;v%v;mmmmmm;%vvvvvv' ",
    "     vvvvvv%%%%;mmmm%;mmmmmm;%vvvnnvv ",
    "     `vvnnnnvvv%%%;m;mmmmm;%vvnnmmnnvv' ",
    "      vvnmmnnnnvvv%%mmmm;%vvnnmmmnnnvv ",
    "      `vvnmmmnnvvv%mmm;%vvnnmmmmnnnvv' ",
    "       `vvnmmmmvv%mmm;%vvnnmmmmnnnvv' ",
    "        `vvnmmmvv%mm;%vvvnnmmmnnvvv' ",
    "          `vvnmmvv%m;%vvvvnmnvvvv' ",
    "           .;;vvvvvm;%vvvvvvvv' ",
    "        .;;;;;;;;;;;;;;;;;;;;, ",
    "       ;;;;;;';;;;;;;;;;;'`;;;;;, ",
    "      .;;;'    `;;;;;;;;'   `;;;;;. ",
    "     .;;'        `;;;;;'      `;;;; ",
    "     ;'           :`;;'         ;;' ",
    "     ;            : ;'    ,    ,'             . ",
    "      `           :'.:   .;;,.        .,;;;;;;' ",
    "                  ::::   ;;,;;;,     ;;;,;;;;' ",
    "                  ;;;;   `;;;,;;    .,';;;;' ",
    "                  ;;;;      `';; ,;;' ",
    "                ,;;;;;         .;',. ",
    "                  `;;;;       .;'  ';,. ",
    "                   `;;;.     .;'   ,;;,;;,. ",
    "                    ;;;;    .;'    `;;;;,;;; ",
    "                    ;;;;   .;'       `;;,;;' ",
    "                    `;;;,;;'           `;' ",
    "                     ;;;; ",
    "                     ;;;;. ",
    "                     `;;;;;,. ",
    "                      ;;;;' ",
    "                      ;;;; ",
    "                      ;;;;"
];

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

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
        if (e.key === "Enter") {
            e.preventDefault();
            const chatInput = document.getElementById('chat-input');
            chatInput.focus();
        }
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

    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');  // Sky blue at top
    gradient.addColorStop(1, '#E0F6FF');  // Lighter blue at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    clouds.forEach(cloud => {
        // Move clouds and wrap around
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + 200) {
            cloud.x = -300;
        }

        // Draw with slight up/down movement
        const yOffset = Math.sin(time + cloud.x * 0.01) * 3;
        drawCloud(
            cloud.x,
            cloud.y + yOffset,
            cloud.scale,
            cloud.art,
            cloud.opacity
        );
    });    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, 350, 0, 400);
    groundGradient.addColorStop(0, '#3d6035');  // Darker grass at top
    groundGradient.addColorStop(1, '#2d4a27');  // Darker at bottom
    ctx.fillStyle = groundGradient;
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

            // Draw chat message if exists
            if (p.currentChat) {
                const elapsedTime = Date.now() - p.currentChat.timestamp;
                const opacity = Math.max(0, 1 - (elapsedTime / 5000)); // Fade out over 5 seconds

                // Draw chat bubble background
                const message = p.currentChat.message;
                ctx.font = '14px Marcellus';
                const messageWidth = ctx.measureText(message).width;
                const padding = 10;
                const bubbleWidth = messageWidth + (padding * 2);
                const bubbleHeight = 24;
                const bubbleX = p.x + 15 - (bubbleWidth / 2);
                const bubbleY = displayY - 65; // Moved higher above username

                // Draw bubble background
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
                ctx.beginPath();
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
                ctx.fill();

                // Draw bubble outline in player's color
                ctx.strokeStyle = `rgba(${hexToRgb(p.color).join(', ')}, ${opacity})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
                ctx.stroke();

                // Draw chat message text
                ctx.fillStyle = `rgba(47, 62, 41, ${opacity})`;
                ctx.fillText(message, p.x + 15, displayY - 50); // Adjusted text position
            }
        }
    }

    requestAnimationFrame(render);
}
render();
