import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};
const chatHistory = [];

const ball = {
    x: 400,
    y: 100,
    vx: 0,
    vy: 0,
    radius: 15
};

function addToHistory(message) {
    chatHistory.push(message);
    if (chatHistory.length > 100) chatHistory.shift();
}

io.on("connection", socket => {
    console.log("Player connected:", socket.id);

    socket.on("join", username => {
        if (players[socket.id]) return;

        players[socket.id] = {
            x: 100 + Math.random() * 400,
            y: 300,
            vx: 0,
            vy: 0,
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            username: username
        };
        console.log(`Player ${username} joined the garden`);

        socket.emit("chatHistory", chatHistory);

        const joinMessage = {
            type: "join",
            username: username,
            message: "entered the garden",
            color: "#2f3e29",
            timestamp: Date.now()
        };
        addToHistory(joinMessage);
        io.emit("chat", joinMessage);
    });

    socket.on("input", input => {
        if (players[socket.id]) handleInput(players[socket.id], input);
    });

    socket.on("chat", message => {
        if (players[socket.id]) {
            players[socket.id].currentChat = {
                message: message,
                timestamp: Date.now()
            };

            const chatMessage = {
                type: "message",
                username: players[socket.id].username,
                message: message,
                color: players[socket.id].color,
                timestamp: Date.now()
            };
            addToHistory(chatMessage);
            io.emit("chat", chatMessage);

            setTimeout(() => {
                if (players[socket.id]) players[socket.id].currentChat = null;
            }, 5000);
        }
    });

    socket.on("disconnect", () => {
        if (players[socket.id]) {
            const username = players[socket.id].username;
            console.log("Player disconnected:", socket.id);

            const leaveMessage = {
                type: "leave",
                username: username,
                message: "left the garden",
                color: "#2f3e29",
                timestamp: Date.now()
            };
            addToHistory(leaveMessage);
            io.emit("chat", leaveMessage);

            delete players[socket.id];
        }
    });
});

setInterval(() => {
    updateGame();
    io.emit("state", { players, ball });
}, 1000 / 60);

function handleInput(player, input) {
    const speed = 3;
    if (input.left) player.vx = -speed;
    else if (input.right) player.vx = speed;
    else player.vx = 0;

    if (input.jump && player.y >= 300) player.vy = -8;
}

function updateGame() {
    // Update players
    for (let id in players) {
        const p = players[id];
        if (!p) continue;

        p.vy += 0.5;
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > 300) {
            p.y = 300;
            p.vy = 0;
        }

        if (p.x < 0) p.x = 0;
        if (p.x > 770) p.x = 770;
    }
    const gravity = 0.12;
    const airResistance = 0.95;
    const groundFriction = 0.97;
    const bounceDecay = 0.45;

    ball.vy += gravity;
    ball.vx *= airResistance;
    ball.vy *= airResistance;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y + ball.radius > 350) {
        ball.y = 350 - ball.radius;
        ball.vy = -ball.vy * bounceDecay;
        ball.vx *= groundFriction;
    }

    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * bounceDecay;
    }
    if (ball.x + ball.radius > 800) {
        ball.x = 800 - ball.radius;
        ball.vx = -ball.vx * bounceDecay;
    }

    for (let id in players) {
        const p = players[id];
        const dx = ball.x - (p.x + 15);
        const dy = ball.y - (p.y + 15);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + 15) {
            const angle = Math.atan2(dy, dx);
            const playerSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const pushForce = 2.7;

            ball.vx += (p.vx * 0.5 + Math.cos(angle) * playerSpeed) * pushForce;
            ball.vy += (p.vy * 0.5 + Math.sin(angle) * playerSpeed - 0.8) * pushForce;

            const pushOut = (ball.radius + 15) - distance;
            ball.x += Math.cos(angle) * pushOut;
            ball.y += Math.sin(angle) * pushOut;
        }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

