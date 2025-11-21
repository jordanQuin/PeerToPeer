
        // ==================== VARIABLES GLOBALES ====================
        let peer;
        let myUsername = '';
        let myId = '';
        let myStream = null;
        let players = new Map();
        let isHost = false;
        let myPlayerIndex = 0;

        // Jeu
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        let gameRunning = false;
        const PADDLE_SPEED = 6;
        const BALL_SPEED = 3;

        const ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 8,
            dx: BALL_SPEED,
            dy: BALL_SPEED,
            speed: BALL_SPEED, // Vitesse actuelle
            maxSpeed: 8 // Vitesse maximale
        };

        const paddles = [
            { x: 10, y: canvas.height / 2 - 50, width: 15, height: 100, color: '#ff4444' }, // Gauche
            { x: canvas.width - 25, y: canvas.height / 2 - 50, width: 15, height: 100, color: '#4444ff' }, // Droite
            { x: canvas.width / 2 - 50, y: 10, width: 100, height: 15, color: '#44ff44' }, // Haut
            { x: canvas.width / 2 - 50, y: canvas.height - 25, width: 100, height: 15, color: '#ffff44' } // Bas
        ];

        const keys = {};

        // ==================== INITIALISATION ====================
        function init() {
            askUsername();
        }

        function askUsername() {
            let username = null;
            while (!username || username.trim() === '') {
                username = prompt('👤 Entrez votre pseudo pour jouer :');
                if (username === null) {
                    alert('❌ Vous devez entrer un pseudo pour jouer !');
                }
            }
            myUsername = username.trim();
            document.getElementById('displayUsername').textContent = myUsername;
            initWebcam();
        }

        async function initWebcam() {
            try {
                myStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 320, height: 240 }, 
                    audio: false
                });
                document.getElementById('localVideo').srcObject = myStream;
                document.getElementById('label0').textContent = `${myUsername} (Vous)`;
            } catch (err) {
                console.warn('Webcam non disponible:', err);
                alert('⚠️ Impossible d\'accéder à la webcam. Le jeu continuera sans vidéo.');
            }
            initPeer();
        }

        function initPeer() {
            peer = new Peer({
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'turn:numb.viagenie.ca', username: 'webrtc@live.com', credential: 'muazkh' }
                    ]
                },
                debug: 1
            });

            peer.on('open', (id) => {
                myId = id;
                updateStatus('Connecté ✅');
                document.getElementById('createRoomSection').style.display = 'block';
                checkURLForRoom();
            });

            peer.on('connection', (conn) => {
                setupConnection(conn);
            });

            peer.on('call', (call) => {
                answerCall(call);
            });

            peer.on('error', (err) => {
                console.error('Erreur Peer:', err);
                updateStatus('Erreur ❌');
            });
        }

        // ==================== CONNEXION P2P ====================
        function checkURLForRoom() {
            const urlParams = new URLSearchParams(window.location.search);
            const hostId = urlParams.get('join');
            
            if (hostId && hostId !== myId) {
                updateStatus('Connexion en cours...');
                setTimeout(() => connectToHost(hostId), 500);
            }
        }

        function connectToHost(hostId) {
            try {
                const conn = peer.connect(hostId, { reliable: true, serialization: 'json' });
                setupConnection(conn);
                
                conn.on('open', () => {
                    conn.send({ type: 'join', username: myUsername });
                });
            } catch (err) {
                console.error('Erreur connexion:', err);
                updateStatus('Erreur de connexion ❌');
            }
        }

        function setupConnection(conn) {
            conn.on('open', () => {
                if (!players.has(conn.peer)) {
                    players.set(conn.peer, { 
                        username: '', 
                        connection: conn, 
                        stream: null,
                        call: null 
                    });
                } else {
                    players.get(conn.peer).connection = conn;
                }
            });

            conn.on('data', (data) => {
                handleMessage(conn, data);
            });

            conn.on('close', () => {
                removePlayer(conn.peer);
            });
        }

        function answerCall(call) {
            try {
                if (myStream) {
                    call.answer(myStream);
                } else {
                    call.answer();
                }
                
                call.on('stream', (remoteStream) => {
                    if (players.has(call.peer)) {
                        players.get(call.peer).stream = remoteStream;
                        players.get(call.peer).call = call;
                    } else {
                        players.set(call.peer, {
                            username: '',
                            connection: null,
                            stream: remoteStream,
                            call: call
                        });
                    }
                    updateWebcams();
                });

                call.on('error', (err) => {
                    console.warn('Erreur appel:', err);
                });
            } catch (err) {
                console.warn('Erreur answer:', err);
            }
        }

        function makeCall(peerId) {
            if (!myStream) return;
            
            try {
                const call = peer.call(peerId, myStream);
                
                call.on('stream', (remoteStream) => {
                    if (players.has(call.peer)) {
                        players.get(call.peer).stream = remoteStream;
                        players.get(call.peer).call = call;
                    }
                    updateWebcams();
                });

                call.on('error', (err) => {
                    console.warn('Erreur appel:', err);
                });
            } catch (err) {
                console.warn('Erreur makeCall:', err);
            }
        }

        // ==================== GESTION DES MESSAGES ====================
        function handleMessage(conn, data) {
            switch(data.type) {
                case 'join':
                    handlePlayerJoin(conn, data);
                    break;
                case 'players_list':
                    handlePlayersList(data);
                    break;
                case 'player_joined':
                    handlePlayerJoined(data);
                    break;
                case 'sync':
                    handleSync(conn, data);
                    break;
                case 'chat':
                    addChatMessage(data.username, data.message, 'received');
                    break;
                case 'game_start':
                    startGame();
                    break;
                case 'paddle_move':
                    if (data.playerIndex !== myPlayerIndex) {
                        updateRemotePaddle(data.playerIndex, data.position);
                    }
                    break;
                case 'ball_update':
                    if (!isHost) {
                        ball.x = data.x;
                        ball.y = data.y;
                        ball.dx = data.dx;
                        ball.dy = data.dy;
                        ball.speed = data.speed;
                    }
                    break;
            }
        }

        function handlePlayerJoin(conn, data) {
            const player = players.get(conn.peer);
            if (player) {
                player.username = data.username;
            }
            
            if (isHost) {
                // Envoyer la liste des joueurs
                const playersList = [{ id: myId, username: myUsername }];
                players.forEach((p, id) => {
                    if (p.username) {
                        playersList.push({ id, username: p.username });
                    }
                });
                
                conn.send({ type: 'players_list', players: playersList });
                
                // Broadcast aux autres
                broadcast({ type: 'player_joined', peerId: conn.peer, username: data.username });
                
                // Demander l'appel vidéo
                setTimeout(() => makeCall(conn.peer), 1000);
            }
            
            updateUI();
            addChatMessage('Système', `${data.username} a rejoint la partie`, 'received');
        }

        function handlePlayersList(data) {
            data.players.forEach((p, index) => {
                if (p.id !== myId) {
                    if (!players.has(p.id)) {
                        players.set(p.id, {
                            username: p.username,
                            connection: null,
                            stream: null,
                            call: null
                        });

                        // Se connecter au joueur
                        setTimeout(() => {
                            const newConn = peer.connect(p.id);
                            setupConnection(newConn);
                            
                            newConn.on('open', () => {
                                newConn.send({ type: 'sync', username: myUsername });
                                setTimeout(() => makeCall(p.id), 500);
                            });
                        }, index * 500);
                    }
                }
            });
            myPlayerIndex = data.players.findIndex(p => p.id === myId);
            updateUI();
        }

        function handlePlayerJoined(data) {
            if (!players.has(data.peerId)) {
                players.set(data.peerId, {
                    username: data.username,
                    connection: null,
                    stream: null,
                    call: null
                });

                // Se connecter au nouveau joueur
                setTimeout(() => {
                    const newConn = peer.connect(data.peerId);
                    setupConnection(newConn);
                    
                    newConn.on('open', () => {
                        newConn.send({ type: 'sync', username: myUsername });
                    });
                }, 500);
            }
            updateUI();
        }

        function handleSync(conn, data) {
            const player = players.get(conn.peer);
            if (player) {
                player.username = data.username;
            }
            updateUI();
        }

        function removePlayer(peerId) {
            const player = players.get(peerId);
            if (player) {
                if (player.call) player.call.close();
                if (player.stream) {
                    player.stream.getTracks().forEach(track => track.stop());
                }
            }
            players.delete(peerId);
            updateUI();
        }

        function broadcast(message) {
            players.forEach((player) => {
                if (player.connection && player.connection.open) {
                    player.connection.send(message);
                }
            });
        }

        // ==================== ROOM ====================
        function createRoom() {
            isHost = true;
            myPlayerIndex = 0;
            const roomUrl = window.location.origin + window.location.pathname + `?join=${myId}`;
            window.currentRoomUrl = roomUrl;
            
            document.getElementById('roomLink').textContent = roomUrl;
            document.getElementById('roomLinkSection').style.display = 'block';
            document.getElementById('createRoom').style.display = 'none';
            document.getElementById('playerList').style.display = 'block';
            document.getElementById('startGame').style.display = 'block';
            document.getElementById('copyLinkGame').style.display = 'block';
            
            updateUI();
        }

        function copyLink() {
            const linkText = document.getElementById('roomLink').textContent;
            navigator.clipboard.writeText(linkText).then(() => {
                showCopyFeedback('copyLink');
            });
        }

        function copyLinkGame() {
            if (window.currentRoomUrl) {
                navigator.clipboard.writeText(window.currentRoomUrl).then(() => {
                    showCopyFeedback('copyLinkGame');
                });
            }
        }

        function showCopyFeedback(buttonId) {
            const btn = document.getElementById(buttonId);
            btn.textContent = '✅ Copié !';
            setTimeout(() => btn.textContent = '📋 Copier le lien', 2000);
        }

        // ==================== UI ====================
        function updateStatus(text) {
            document.getElementById('statusText').textContent = text;
            document.getElementById('connectionStatus').style.display = 'block';
        }

        function updateUI() {
            updatePlayersList();
            updateWebcams();
            updateGameStatus();
        }

        function updatePlayersList() {
            const container = document.getElementById('playersContainer');
            container.innerHTML = '';
            
            // Soi-même
            container.innerHTML += `
                <div class="player-item">
                    <div class="player-indicator"></div>
                    <div class="player-name">${myUsername} (Vous)</div>
                </div>
            `;

            // Autres joueurs
            players.forEach((player) => {
                if (player.username) {
                    container.innerHTML += `
                        <div class="player-item">
                            <div class="player-indicator"></div>
                            <div class="player-name">${player.username}</div>
                        </div>
                    `;
                }
            });
        }

        function updateWebcams() {
            const webcams = ['webcam1', 'webcam2', 'webcam3'];
            
            // Réinitialiser
            webcams.forEach((id) => {
                const container = document.getElementById(id);
                container.innerHTML = '<span>En attente...</span>';
                container.className = 'webcam-container empty';
            });

            // Ajouter les streams
            let index = 0;
            players.forEach((player) => {
                if (player.stream && index < webcams.length) {
                    const container = document.getElementById(webcams[index]);
                    container.className = 'webcam-container';
                    container.innerHTML = `
                        <video autoplay playsinline></video>
                        <div class="webcam-label">${player.username}</div>
                    `;
                    container.querySelector('video').srcObject = player.stream;
                    index++;
                }
            });
        }

        function updateGameStatus() {
            if (!gameRunning) {
                const totalPlayers = players.size + 1;
                const paddleNames = ['🔴 Gauche', '🔵 Droite', '🟢 Haut', '🟡 Bas'];
                const yourPaddle = paddleNames[myPlayerIndex];
                document.getElementById('gameStatus').textContent = 
                    `En attente de joueurs (${totalPlayers}/4) - Vous: ${yourPaddle}`;
            } else {
                const paddleNames = ['🔴 Gauche', '🔵 Droite', '🟢 Haut', '🟡 Bas'];
                const yourPaddle = paddleNames[myPlayerIndex];
                document.getElementById('gameStatus').textContent = `Partie en cours ! - Vous: ${yourPaddle}`;
            }
        }

        // ==================== CHAT ====================
        function sendChat() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return;

            broadcast({ type: 'chat', username: myUsername, message: message });
            addChatMessage(myUsername, message, 'sent');
            input.value = '';
        }

        function addChatMessage(sender, text, type) {
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.innerHTML = `
                <div class="message-sender">${sender}</div>
                <div class="message-text">${text}</div>
            `;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // ==================== JEU PONG ====================
        function startGame() {
            if (gameRunning) return;
            
            gameRunning = true;
            updateGameStatus();
            document.getElementById('startGame').style.display = 'none';
            addChatMessage('Système', '🎮 La partie commence !', 'received');
            
            gameLoop();
        }

        function gameLoop() {
            if (!gameRunning) return;

            // Effacer le canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Dessiner les paddles
            paddles.forEach((paddle) => {
                ctx.fillStyle = paddle.color;
                ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
            });

            // Dessiner la balle
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();

            // L'hôte gère la physique
            if (isHost) {
                ball.x += ball.dx;
                ball.y += ball.dy;
                checkCollisions();
                broadcast({
                    type: 'ball_update',
                    x: ball.x,
                    y: ball.y,
                    dx: ball.dx,
                    dy: ball.dy,
                    speed: ball.speed
                });
            }

            // Mouvement du paddle
            movePaddle();

            requestAnimationFrame(gameLoop);
        }

        function movePaddle() {
            const paddle = paddles[myPlayerIndex];
            let moved = false;
            
            // Paddles verticaux (gauche/droite)
            if (myPlayerIndex === 0 || myPlayerIndex === 1) {
                if (keys['w'] || keys['ArrowUp']) {
                    paddle.y = Math.max(0, paddle.y - PADDLE_SPEED);
                    moved = true;
                }
                if (keys['s'] || keys['ArrowDown']) {
                    paddle.y = Math.min(canvas.height - paddle.height, paddle.y + PADDLE_SPEED);
                    moved = true;
                }
                if (moved) {
                    broadcast({ type: 'paddle_move', playerIndex: myPlayerIndex, position: paddle.y });
                }
            } 
            // Paddles horizontaux (haut/bas)
            else {
                if (keys['a'] || keys['ArrowLeft']) {
                    paddle.x = Math.max(0, paddle.x - PADDLE_SPEED);
                    moved = true;
                }
                if (keys['d'] || keys['ArrowRight']) {
                    paddle.x = Math.min(canvas.width - paddle.width, paddle.x + PADDLE_SPEED);
                    moved = true;
                }
                if (moved) {
                    broadcast({ type: 'paddle_move', playerIndex: myPlayerIndex, position: paddle.x });
                }
            }
        }

        function updateRemotePaddle(index, position) {
            const paddle = paddles[index];
            if (index < 2) {
                paddle.y = position;
            } else {
                paddle.x = position;
            }
        }

        function checkCollisions() {
            let hitPaddle = false;
            
            // Paddle gauche
            if (ball.x - ball.radius <= paddles[0].x + paddles[0].width &&
                ball.y >= paddles[0].y && ball.y <= paddles[0].y + paddles[0].height) {
                const rel = (ball.y - (paddles[0].y + paddles[0].height / 2)) / (paddles[0].height / 2);
                const angle = rel * (Math.PI / 4);
                ball.dx = Math.abs(ball.speed * Math.cos(angle));
                ball.dy = ball.speed * Math.sin(angle);
                hitPaddle = true;
            }

            // Paddle droite
            if (ball.x + ball.radius >= paddles[1].x &&
                ball.y >= paddles[1].y && ball.y <= paddles[1].y + paddles[1].height) {
                const rel = (ball.y - (paddles[1].y + paddles[1].height / 2)) / (paddles[1].height / 2);
                const angle = rel * (Math.PI / 4);
                ball.dx = -Math.abs(ball.speed * Math.cos(angle));
                ball.dy = ball.speed * Math.sin(angle);
                hitPaddle = true;
            }

            // Paddle haut
            if (ball.y - ball.radius <= paddles[2].y + paddles[2].height &&
                ball.x >= paddles[2].x && ball.x <= paddles[2].x + paddles[2].width) {
                const rel = (ball.x - (paddles[2].x + paddles[2].width / 2)) / (paddles[2].width / 2);
                const angle = rel * (Math.PI / 4);
                ball.dx = ball.speed * Math.sin(angle);
                ball.dy = Math.abs(ball.speed * Math.cos(angle));
                hitPaddle = true;
            }

            // Paddle bas
            if (ball.y + ball.radius >= paddles[3].y &&
                ball.x >= paddles[3].x && ball.x <= paddles[3].x + paddles[3].width) {
                const rel = (ball.x - (paddles[3].x + paddles[3].width / 2)) / (paddles[3].width / 2);
                const angle = rel * (Math.PI / 4);
                ball.dx = ball.speed * Math.sin(angle);
                ball.dy = -Math.abs(ball.speed * Math.cos(angle));
                hitPaddle = true;
            }

            // Augmenter la vitesse à chaque rebond (max 8)
            if (hitPaddle) {
                ball.speed = Math.min(ball.speed + 1, ball.maxSpeed);
            }

            // Réinitialiser si la balle sort
            if (ball.x < -50 || ball.x > canvas.width + 50 || 
                ball.y < -50 || ball.y > canvas.height + 50) {
                resetBall();
            }
        }

        function resetBall() {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.speed = BALL_SPEED; // Réinitialiser la vitesse
            const angle = Math.random() * Math.PI * 2;
            ball.dx = Math.cos(angle) * ball.speed;
            ball.dy = Math.sin(angle) * ball.speed;
        }

        // ==================== EVENT LISTENERS ====================
        document.getElementById('createRoom').addEventListener('click', createRoom);
        document.getElementById('copyLink').addEventListener('click', copyLink);
        document.getElementById('copyLinkGame').addEventListener('click', copyLinkGame);
        document.getElementById('sendChat').addEventListener('click', sendChat);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChat();
        });
        document.getElementById('startGame').addEventListener('click', () => {
            startGame();
            broadcast({ type: 'game_start' });
        });

        document.addEventListener('keydown', (e) => keys[e.key] = true);
        document.addEventListener('keyup', (e) => keys[e.key] = false);

        window.addEventListener('load', init);
