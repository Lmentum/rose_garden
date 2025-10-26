import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {}; // store player states
const chatHistory = []; // store chat messages

// Function to add message to history
function addToHistory(message) {
    chatHistory.push(message);
    // Keep only the last 100 messages
    if (chatHistory.length > 100) {
        chatHistory.shift();
    }
}

io.on("connection", socket => {
    console.log("Player connected:", socket.id);

    socket.on("join", username => {
        // Initialize player with username
        players[socket.id] = {
            x: 100 + Math.random() * 400,
            y: 300,
            vx: 0,
            vy: 0,
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            username: username
        };
        console.log(`Player ${username} joined the game`);

        // Send chat history to the new player
        socket.emit("chatHistory", chatHistory);

        // Create and store join message
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
        // Only handle input if the player exists
        if (players[socket.id]) {
            handleInput(players[socket.id], input);
        }
    });

    socket.on("chat", message => {
        if (players[socket.id]) {
            const chatMessage = {
                type: "message",
                username: players[socket.id].username,
                message: message,
                color: players[socket.id].color,
                timestamp: Date.now()
            };
            addToHistory(chatMessage);
            io.emit("chat", chatMessage);
        }
    });

    socket.on("disconnect", () => {
        if (players[socket.id]) {
            const username = players[socket.id].username;
            console.log("Player disconnected:", socket.id);

            // Send leave message before removing player
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

// Physics + broadcast loop
setInterval(() => {
    updateGame();
    io.emit("state", players);
}, 30);

function handleInput(player, input) {
    const speed = 3;
    if (input.left) player.vx = -speed;
    else if (input.right) player.vx = speed;
    else player.vx = 0;

    if (input.jump && player.y >= 300) player.vy = -10;
}

function updateGame() {
    for (let id in players) {
        const p = players[id];
        if (!p) continue; // Skip if player is undefined

        // basic physics
        p.vy += 0.5; // gravity
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > 300) {
            p.y = 300;
            p.vy = 0;
        }

        // Keep players within bounds
        if (p.x < 0) p.x = 0;
        if (p.x > 770) p.x = 770; // 800 - 30 (orb width)
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
