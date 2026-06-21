/**
 * Server de desenvolvimento SEM MongoDB
 * Roda tudo (Express, Socket.IO, jogo) sem precisar de banco
 * Use este para testar o visual e jogar localmente
 */
const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { nanoid, logip } = require('./server/utils.js');

console.log(`[DEV] servidor de desenvolvimento carregado`);

global.games = {};

// Stub simples da arena sem MongoDB
const arena = {
    queue: [],
    activeA: [],
    activeB: [],
    scoreA: 0,
    scoreB: 0,
    timeLeft: 180,
    status: 'locked',
    unlocked: false,
    matchRunning: false,
    adminState: async () => ({
        queue: arena.queue,
        activeA: arena.activeA,
        activeB: arena.activeB,
        scoreA: arena.scoreA,
        scoreB: arena.scoreB,
        timeLeft: arena.timeLeft,
        status: arena.status,
        unlocked: arena.unlocked,
        matchRunning: arena.matchRunning,
    }),
    init: async () => console.log('[DEV] Arena iniciada (sem MongoDB)'),
    run: () => console.log('[DEV] Arena rodando'),
    unlock: () => { arena.unlocked = true; arena.status = 'open'; },
    lock: () => { arena.unlocked = false; arena.status = 'locked'; },
    startNextMatch: () => { arena.matchRunning = true; arena.status = 'playing'; },
    pause: () => { arena.status = 'paused'; },
    resume: () => { arena.status = 'playing'; },
    finishMatch: async () => { arena.matchRunning = false; arena.status = 'locked'; arena.scoreA = 0; arena.scoreB = 0; },
    resetGame: () => { arena.scoreA = 0; arena.scoreB = 0; arena.timeLeft = 180; },
    resetRanking: async () => console.log('[DEV] Ranking resetado'),
    clearQueue: () => { arena.queue = []; },
    clearChat: () => console.log('[DEV] Chat limpo'),
    removePlayer: (name) => { arena.queue = arena.queue.filter(p => p !== name); },
};
global.arena = arena;

const app = express();
const server = http.createServer(app);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'server', 'views'));
app.set('trust proxy', 1);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.sendFile('/client/welcome/welcome.html', { root: __dirname });
});

app.get('/play', async (req, res) => {
    const playerName = String(req.query.name ?? '').trim();
    const isSpectator = req.query.spectator === '1';
    if (!playerName && !isSpectator) return res.redirect('/');
    res.render(path.join(__dirname, 'client/game/game.ejs'), { playerName });
});

app.get('/api/arena', async (req, res) => {
    res.json(await arena.adminState());
});

const ADMIN_USER = 'Treinadores';
const ADMIN_PASS = 'tremelhorcia';
const ADMIN_COOKIE = 'admin_session';
const ADMIN_COOKIE_VALUE = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64');

function hasAdminCookie(req) {
    return req.cookies?.[ADMIN_COOKIE] === ADMIN_COOKIE_VALUE;
}

function renderAdminLogin(res, error = '') {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Treinadores</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        body { min-height: 100vh; display: grid; place-items: center; overflow: auto; }
        .login-panel { width: min(420px, calc(100vw - 32px)); padding: 24px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
        .login-panel h1 { margin: 0 0 8px; font-family: var(--font-display); text-transform: uppercase; }
        .login-panel p { color: var(--muted); }
        .login-panel form { display: grid; gap: 12px; margin-top: 18px; }
        .login-error { color: var(--accent); margin: 0; }
    </style>
</head>
<body>
    <main class="login-panel">
        <p class="hero-kicker">Area restrita</p>
        <h1>Treinadores</h1>
        <p>Entre com o usuario e senha do painel admin.</p>
        ${error ? `<p class="login-error">${error}</p>` : ''}
        <form method="post" action="/admin/login">
            <input class="form-control" name="username" placeholder="Usuario" autocomplete="username" autofocus>
            <input class="form-control" name="password" type="password" placeholder="Senha" autocomplete="current-password">
            <button class="btn btn-primary" type="submit">Entrar</button>
        </form>
    </main>
</body>
</html>`;
    res.status(error ? 401 : 200).send(html);
}

function basicAdminAuth(req, res, next) {
    if (hasAdminCookie(req)) return next();
    const auth = req.headers.authorization || '';
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (decoded.slice(0, separator) === ADMIN_USER && decoded.slice(separator + 1) === ADMIN_PASS) return next();
    }
    if (req.path.startsWith('/admin/api/')) {
        res.set('WWW-Authenticate', 'Basic realm="Treinadores", charset="UTF-8"');
        return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/admin/login');
}

app.get('/admin/login', (req, res) => {
    if (hasAdminCookie(req)) return res.redirect('/admin');
    renderAdminLogin(res);
});

app.post('/admin/login', (req, res) => {
    const user = String(req.body.username ?? '');
    const pass = String(req.body.password ?? '');
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.cookie(ADMIN_COOKIE, ADMIN_COOKIE_VALUE, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 });
        return res.redirect('/admin');
    }
    return renderAdminLogin(res, 'Usuario ou senha invalidos.');
});

app.post('/admin/logout', (req, res) => {
    res.clearCookie(ADMIN_COOKIE);
    res.redirect('/admin/login');
});

app.get('/admin', basicAdminAuth, (req, res) => {
    res.render('admin');
});

app.get('/admin/api/state', basicAdminAuth, async (req, res) => {
    res.json(await arena.adminState());
});

app.post('/admin/api/:action', basicAdminAuth, async (req, res) => {
    const action = req.params.action;
    if (action === 'unlock') arena.unlock();
    else if (action === 'lock') arena.lock();
    else if (action === 'start') arena.startNextMatch();
    else if (action === 'pause') arena.pause();
    else if (action === 'resume') arena.resume();
    else if (action === 'end') await arena.finishMatch();
    else if (action === 'reset-game') arena.resetGame();
    else if (action === 'reset-ranking') await arena.resetRanking();
    else if (action === 'clear-queue') arena.clearQueue();
    else if (action === 'clear-chat') arena.clearChat();
    else if (action === 'remove-player') arena.removePlayer(req.body.name);
    else return res.status(404).json({ error: 'Unknown admin action' });
    res.json({ ok: true });
});

app.use('/', express.static('client', { maxAge: '1d' }));

// Stub para evitar erros dos modulos que esperam MongoDB
require('./server/stopwatch.js');
require('./client/constants.js');
require('./server/player.js');
require('./server/ball.js');

// WebSocket com socket.io simples
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    console.log('[DEV] cliente conectado:', socket.id);
    // Envia estado inicial
    socket.emit('queue-update', arena.queue);
    socket.emit('state', { scoreA: 0, scoreB: 0, timeLeft: '3:00', status: 'locked' });

    socket.on('join', (data) => {
        console.log('[DEV] join:', data);
        arena.queue.push(data.name || 'Jogador');
        io.emit('queue-update', arena.queue);
        socket.emit('joined');
    });

    socket.on('leave', () => {
        console.log('[DEV] leave:', socket.id);
    });

    socket.on('message', (msg) => {
        io.emit('message', msg);
    });

    socket.on('disconnect', () => {
        console.log('[DEV] cliente desconectado:', socket.id);
    });
});

const port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log(`[DEV] Servidor rodando em http://localhost:${port}`);
    console.log(`[DEV] Abra o navegador em: http://localhost:${port}`);
});
