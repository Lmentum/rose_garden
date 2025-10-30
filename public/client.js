const socket = io({ autoConnect: false });
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function createRosePatch(baseX, baseY, count) {
    const roses = [];
    const roseColors = [
        { color: '#cc3333', weight: 70 },
        { color: '#ff69b4', weight: 20 },
        { color: '#ffd700', weight: 10 }
    ];

    for (let i = 0; i < count; i++) {
        const randomX = baseX + (Math.random() * 60 - 30);
        const randomY = baseY + (Math.random() * 4 - 2);
        const randomScale = 0.25 + (Math.random() * 0.1);
        const rand = Math.random() * 100;
        let chosenColor = roseColors[0].color;
        let cumulative = 0;
        for (const colorOption of roseColors) {
            cumulative += colorOption.weight;
            if (rand < cumulative) {
                chosenColor = colorOption.color;
                break;
            }
        }

        roses.push({ x: randomX, y: randomY, scale: randomScale, color: chosenColor });
    }
    return roses;
}

const roses = [
    ...createRosePatch(80, -1, 5),
    ...createRosePatch(220, -1, 3),
    ...createRosePatch(350, -1, 6),
    ...createRosePatch(500, -1, 4),
    ...createRosePatch(650, -1, 5),
    ...createRosePatch(180, -1, 2),
    ...createRosePatch(450, -1, 2),
    ...createRosePatch(580, -1, 3)
];

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

function drawCloud(x, y, scale = 1, artIndex = 0, opacity = 0.8) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.font = '12px monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.textAlign = 'left';

    const art = cloudArt[artIndex];
    art.forEach((line, index) => {
        ctx.fillText(line, 0, index * 12);
    });

    ctx.restore();
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

const RENDER_DELAY = 100;
const stateBuffer = [];
let myPlayerId = null;

let displayPlayers = {};
let displayBall = { x: 400, y: 100, radius: 20 };

function lerp(start, end, t) {
    return start + (end - start) * t;
}

socket.on("state", state => {
    stateBuffer.push({
        timestamp: Date.now(),
        players: JSON.parse(JSON.stringify(state.players)),
        ball: JSON.parse(JSON.stringify(state.ball))
    });

    if (stateBuffer.length > 60) {
        stateBuffer.shift();
    }
});

function interpolateState() {
    const now = Date.now();
    const renderTime = now - RENDER_DELAY;

    let before = null;
    let after = null;

    for (let i = 0; i < stateBuffer.length - 1; i++) {
        if (stateBuffer[i].timestamp <= renderTime && stateBuffer[i + 1].timestamp >= renderTime) {
            before = stateBuffer[i];
            after = stateBuffer[i + 1];
            break;
        }
    }

    if (!before && !after) {
        if (stateBuffer.length > 0) {
            const latest = stateBuffer[stateBuffer.length - 1];
            displayPlayers = JSON.parse(JSON.stringify(latest.players));
            displayBall = JSON.parse(JSON.stringify(latest.ball));
        }
        return;
    }

    if (before && !after) {
        displayPlayers = JSON.parse(JSON.stringify(before.players));
        displayBall = JSON.parse(JSON.stringify(before.ball));
        return;
    }

    const totalTime = after.timestamp - before.timestamp;
    const passedTime = renderTime - before.timestamp;
    const t = totalTime > 0 ? passedTime / totalTime : 0;

    displayPlayers = {};
    for (let id in after.players) {
        if (before.players[id]) {
            displayPlayers[id] = {
                x: lerp(before.players[id].x, after.players[id].x, t),
                y: lerp(before.players[id].y, after.players[id].y, t),
                vx: after.players[id].vx,
                vy: after.players[id].vy,
                color: after.players[id].color,
                username: after.players[id].username,
                currentChat: after.players[id].currentChat
            };
        } else {
            displayPlayers[id] = JSON.parse(JSON.stringify(after.players[id]));
        }
    }

    if (before.ball && after.ball) {
        displayBall = {
            x: lerp(before.ball.x, after.ball.x, t),
            y: lerp(before.ball.y, after.ball.y, t),
            vx: after.ball.vx,
            vy: after.ball.vy,
            radius: after.ball.radius
        };
    }

    while (stateBuffer.length > 0 && stateBuffer[0].timestamp < renderTime - 1000) {
        stateBuffer.shift();
    }
}

let input = { left: false, right: false, jump: false };
let time = 0;

const ball = {
    x: 400,
    y: 100,
    vx: 0,
    vy: 0,
    radius: 20,
    bounceDecay: 0.45,
};

const ballPhysics = {
    gravity: 0.1,
    airResistance: 0.95,
    groundFriction: 0.97,
    pushForce: 2.5,
};

function joinGame() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();

    if (username) {
        document.getElementById('username-prompt').style.display = 'none';
        socket.connect();
        socket.emit('join', username);
    }
}

socket.on('connect', () => {
    myPlayerId = socket.id;
});

document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinGame();
    }
});

let isChatFocused = false;

document.getElementById('chat-input').addEventListener('focus', () => {
    isChatFocused = true;
    input.left = false;
    input.right = false;
    input.jump = false;
    socket.emit("input", input);
});

document.getElementById('chat-input').addEventListener('blur', () => {
    isChatFocused = false;
});

document.addEventListener("keydown", e => {
    if (!isChatFocused) {
        if (e.key === "ArrowLeft" || e.key === "a") input.left = true;
        if (e.key === "ArrowRight" || e.key === "d") input.right = true;
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w") input.jump = true;
        if (e.key === "Enter") {
            const usernamePrompt = document.getElementById('username-prompt');
            if (usernamePrompt.style.display !== 'none') {
                e.preventDefault();
                joinGame();
            } else {
                e.preventDefault();
                const chatInput = document.getElementById('chat-input');
                chatInput.focus();
            }
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

function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat', message);
        chatInput.value = '';
    }
}

document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

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

socket.on('chat', addMessageToChat);

socket.on('chatHistory', history => {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    history.forEach(addMessageToChat);
});

function render() {
    interpolateState();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const smallRoseArt = [
        "    ,--.",
        "   ((@@))",
        "    `--'",
        "     ||",
        "     ||"
    ];

    function drawRose(x, y, scale, color) {
        ctx.save();
        ctx.translate(x, y + 339);
        ctx.scale(scale, scale);

        ctx.font = '12px monospace';

        smallRoseArt.forEach((line, index) => {
            if (index < 3) {
                ctx.fillStyle = color; // Use the rose's color
            } else {
                ctx.fillStyle = '#2d5a27';
            }
            ctx.fillText(line, 0, index * 12);
        });

        ctx.restore();
    }

    roses.forEach(rose => {
        drawRose(rose.x, rose.y, rose.scale, rose.color);
    });

    const beachBall = [
        " ///\\",
        "  ====",
        " \\///",
    ];

    ctx.save();
    ctx.translate(displayBall.x, displayBall.y);
    const rotation = Math.atan2(displayBall.vy, displayBall.vx) * 0.05;
    ctx.rotate(rotation);

    beachBall.forEach((line, index) => {
        ctx.font = '16px monospace';
        if (index === 2) {
            ctx.fillStyle = '#FF4444';
        } else {
            ctx.fillStyle = index % 2 ? '#4444FF' : '#FF4444';
        }
        const xOffset = -ctx.measureText(line).width / 2;
        ctx.fillText(line, xOffset, index * 12 - 24);
    });

    ctx.restore();

    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + 200) {
            cloud.x = -300;
        }

        const yOffset = Math.sin(time + cloud.x * 0.01) * 3;
        drawCloud(
            cloud.x,
            cloud.y + yOffset,
            cloud.scale,
            cloud.art,
            cloud.opacity
        );
    });

    const groundGradient = ctx.createLinearGradient(0, 350, 0, 400);
    groundGradient.addColorStop(0, '#3d6035');
    groundGradient.addColorStop(1, '#2d4a27');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, 350, canvas.width, 50);

    ctx.font = '12px monospace';
    const grassPatterns = [
        ',,`', ',.\'', '\',`', '`.,'
    ];
    const bladePatterns = [
        '|', '/', '\\', '|', '/', '\\'
    ];

    for (let x = 0; x < canvas.width; x += 20) {
        for (let y = 355; y < 395; y += 10) {
            const pattern = grassPatterns[Math.floor((x + y) % grassPatterns.length)];
            ctx.fillStyle = `rgba(45, 74, 39, 0.6)`;
            ctx.fillText(pattern, x + Math.sin(x * 0.1) * 2, y);
        }
    }

    for (let x = 0; x < canvas.width; x += 8) {
        const blade = bladePatterns[Math.floor((x * 13) % bladePatterns.length)];
        const height = Math.sin(x * 0.2) * 2 + 3;

        const bladeGradient = ctx.createLinearGradient(x, 350, x, 355);
        bladeGradient.addColorStop(0, '#4a7340');
        bladeGradient.addColorStop(1, '#3d6035');

        ctx.fillStyle = bladeGradient;
        for (let y = 0; y < height; y++) {
            ctx.fillText(blade, x, 353 + y);
        }
    }

    time += 0.05;

    for (let id in displayPlayers) {
        const p = displayPlayers[id];

        const swayOffset = (Math.abs(p.vx) > 0 && p.y >= 300) ? Math.sin(time * 2) * 5 : 0;
        const displayY = p.y + swayOffset;

        const gradient = ctx.createRadialGradient(
            p.x + 15, displayY + 15, 0,
            p.x + 15, displayY + 15, 20
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(p.x + 15, displayY + 15, 20, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x + 15, displayY + 15, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        if (p.username) {
            ctx.font = '16px Marcellus';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(47, 62, 41, 0.8)';
            ctx.fillText(p.username, p.x + 15, displayY - 10);

            if (p.currentChat) {
                const elapsedTime = Date.now() - p.currentChat.timestamp;
                const opacity = Math.max(0, 1 - (elapsedTime / 5000));

                const message = p.currentChat.message;
                ctx.font = '14px Marcellus';
                const messageWidth = ctx.measureText(message).width;
                const padding = 10;
                const bubbleWidth = messageWidth + (padding * 2);
                const bubbleHeight = 24;
                const bubbleX = p.x + 15 - (bubbleWidth / 2);
                const bubbleY = displayY - 65;

                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
                ctx.beginPath();
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
                ctx.fill();

                ctx.strokeStyle = `rgba(${hexToRgb(p.color).join(', ')}, ${opacity})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
                ctx.stroke();

                ctx.fillStyle = `rgba(47, 62, 41, ${opacity})`;
                ctx.fillText(message, p.x + 15, displayY - 50);
            }
        }
    }

    requestAnimationFrame(render);
}
render();