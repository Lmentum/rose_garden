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
    // Only add public messages to history
    if (message.type !== 'dm') {
        chatHistory.push(message);
        // Keep only the last 100 messages
        if (chatHistory.length > 100) {
            chatHistory.shift();
        }
    }
}

// Function to find socket ID by username
function findPlayerByUsername(username) {
    for (const [socketId, player] of Object.entries(players)) {
        if (player.username.toLowerCase() === username.toLowerCase()) {
            return { socketId, player };
        }
    }
    return null;
}

// Function to parse DM command
function parseDM(message) {
    // Check for /dm username message or @username message format
    const dmRegex = /^(?:\/dm\s+|@)(\S+)\s+(.+)$/i;
    const match = message.match(dmRegex);
    if (match) {
        return {
            targetUsername: match[1],
            message: match[2]
        };
    }
    return null;
}

io.on("connection", socket => {
    console.log("Player connected:", socket.id);

    socket.on("join", username => {
        // Check if this socket already has a player
        if (players[socket.id]) {
            return;
        }

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
            const dmData = parseDM(message);

            if (dmData) {
                // Handle DM
                const target = findPlayerByUsername(dmData.targetUsername);

                if (target) {
                    // Create DM message
                    const dmMessage = {
                        type: "dm",
                        username: players[socket.id].username,
                        message: dmData.message,
                        color: players[socket.id].color,
                        timestamp: Date.now(),
                        isWhisper: true
                    };

                    // Send to sender and recipient only
                    socket.emit("chat", {
                        ...dmMessage,
                        isDmSent: true,
                        to: target.player.username
                    });
                    io.to(target.socketId).emit("chat", {
                        ...dmMessage,
                        isDmReceived: true,
                        from: players[socket.id].username
                    });

                    // Show floating message only to recipient
                    target.player.currentChat = {
                        message: `[DM] ${dmData.message}`,
                        timestamp: Date.now()
                    };

                    // Clear recipient's floating message after 5 seconds
                    setTimeout(() => {
                        if (players[target.socketId]) {
                            players[target.socketId].currentChat = null;
                        }
                    }, 5000);
                } else {
                    // Notify sender that user wasn't found
                    socket.emit("chat", {
                        type: "system",
                        message: `Player "${dmData.targetUsername}" not found`,
                        color: "#ff0000",
                        timestamp: Date.now()
                    });
                }
            } else {
                // Regular public chat message
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

                // Clear the message after 5 seconds
                setTimeout(() => {
                    if (players[socket.id]) {
                        players[socket.id].currentChat = null;
                    }
                }, 5000);
            }
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
