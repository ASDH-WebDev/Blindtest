import express from 'express';
import http from 'http';
import cors from 'cors';
import {Server} from 'socket.io';
import dotenv from 'dotenv';
import {pool} from './db.js';
import authRoutes from './routes/auth.routes.js';
import gamesRoutes from './routes/games.routes.js';
import roundsRoutes from './routes/rounds.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://anniv.as-webdev.com')
	.split(',')
	.map((o) => o.trim())
	.filter(Boolean);

console.log('CORS origins autorisées:', corsOrigins);

app.use(
	cors({
		origin: corsOrigins,
		methods: ['GET', 'POST'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/games', roundsRoutes);

const io = new Server(server, {
	cors: {
		origin: corsOrigins,
		methods: ['GET', 'POST'],
	},
});

const gameNamespace = io.of('/game');

const roundsState = {};
// question actuelle par partie (en mémoire)
const currentQuestion = {}; // key = gameCode -> { type, url, hint? }
// round courant par partie (en mémoire)
const currentRoundId = {}; // key = gameCode -> roundId
// audio courant par partie (en mémoire)
// key = gameCode -> { url, volume, startAt }
const currentAudio = {};

gameNamespace.on('connection', (socket) => {
	console.log('Client connecté:', socket.id);
	socket.on('disconnect', () => {
		console.log('Client déconnecté:', socket.id);
	});
	socket.on('game:join', ({gameCode}) => {
		const room = `game:${gameCode}`;
		socket.join(room);
		console.log(`Socket ${socket.id} a rejoint la room ${room}`);

		// Rejouer l'état courant pour les joueurs qui rejoignent en cours de route.
		if (currentQuestion[gameCode]) {
			socket.emit('question:update', currentQuestion[gameCode]);
		}
		if (currentAudio[gameCode]?.url) socket.emit('audio:play', currentAudio[gameCode]);
	});
	socket.on('buzzer:press', ({gameCode, roundId, playerId, nickname}) => {
		if (!gameCode || !playerId) return;

		// on ignore roundId pour le verrou
		const key = gameCode;
		const room = `game:${gameCode}`;

		if (!roundsState[key]) {
			roundsState[key] = {locked: false, playerId: null};
		}

		// si déjà verrouillé, on ignore tous les suivants
		if (roundsState[key].locked) {
			return;
		}

		// premier buzz : on verrouille pour toute la partie
		roundsState[key].locked = true;
		roundsState[key].playerId = playerId;

		console.log(`Premier buzz pour ${gameCode} par joueur ${playerId} (${nickname})`);

		gameNamespace.to(room).emit('buzzer:locked', {
			roundId, // laissé pour affichage éventuel, mais pas utilisé pour le lock
			playerId,
			nickname,
		});
	});

	socket.on('round:reset', ({gameCode, roundId}) => {
		if (!gameCode) return;

		const key = gameCode;
		const room = `game:${gameCode}`;

		roundsState[key] = {locked: false, playerId: null};
		if (roundId != null) currentRoundId[key] = roundId;

		console.log(`Reset buzzer pour la partie ${gameCode}`);

		gameNamespace.to(room).emit('buzzer:reset', {roundId: roundId ?? 1});
	});

	socket.on('host:validate-answer', async ({gameCode, roundId, playerId, correct, points, penalty}) => {
		try {
			const effectiveRoundId = currentRoundId[gameCode] ?? roundId;
			const gameResult = await pool.query('SELECT * FROM games WHERE code = ?', [gameCode]);
			const game = gameResult.rows[0];
			if (!game) return;

			if (effectiveRoundId == null) return;

			const roundResult = await pool.query('SELECT * FROM rounds WHERE id = ? AND game_id = ?', [effectiveRoundId, game.id]);
			const round = roundResult.rows[0];
			if (!round) return;

			const delta = correct ? Number(points || 1) : -Math.abs(Number(penalty || 0));

			await pool.query('INSERT INTO scores (round_id, player_id, delta) VALUES (?,?,?)', [round.id, playerId, delta]);

			await pool.query('UPDATE game_players SET total_score = total_score + ? WHERE id = ?', [delta, playerId]);

			await pool.query('UPDATE rounds SET status = ? WHERE id = ?', ['resolved', round.id]);

			const scoreboard = await pool.query(
				`SELECT gp.id, gp.nickname, gp.total_score
           FROM game_players gp
           WHERE gp.game_id = ?
           ORDER BY gp.total_score DESC`,
				[game.id],
			);

			const room = `game:${gameCode}`;
			gameNamespace.to(room).emit('score:update', {
				scoreboard: scoreboard.rows,
			});
		} catch (err) {
			console.error(err);
		}
	});
	// Host définit une question (ici : image)
	socket.on('question:set', ({gameCode, type, url, hint}) => {
		if (!gameCode || !type || !url) return;
		const room = `game:${gameCode}`;
		currentQuestion[gameCode] = {type, url, hint: hint || null};
		console.log(`Question mise à jour pour ${gameCode}:`, currentQuestion[gameCode]);
		gameNamespace.to(room).emit('question:update', currentQuestion[gameCode]);
	});

	// Host supprime la question courante
	socket.on('question:clear', ({gameCode}) => {
		if (!gameCode) return;
		const room = `game:${gameCode}`;
		currentQuestion[gameCode] = null;
		gameNamespace.to(room).emit('question:update', null);
	});

	// Host lance un son aux joueurs
	socket.on('audio:play', ({gameCode, url, volume, startAt}) => {
		if (!gameCode || !url) return;
		const room = `game:${gameCode}`;

		const safeVolume = typeof volume === 'number' && Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
		const safeStartAt = typeof startAt === 'number' && Number.isFinite(startAt) ? Math.max(0, startAt) : 0;

		currentAudio[gameCode] = {url, volume: safeVolume, startAt: safeStartAt};
		console.log(`Audio lancé pour ${gameCode}: ${url} (vol=${safeVolume}, startAt=${safeStartAt})`);

		gameNamespace.to(room).emit('audio:play', currentAudio[gameCode]);
	});

	// Host stoppe le son aux joueurs
	socket.on('audio:stop', ({gameCode}) => {
		if (!gameCode) return;
		const room = `game:${gameCode}`;

		// On supprime l'état pour éviter un replay lors d'un join ultérieur.
		delete currentAudio[gameCode];
		console.log(`Audio stoppé pour ${gameCode}`);

		gameNamespace.to(room).emit('audio:stop');
	});
});

app.get('/', (_req, res) => {
	res.json({status: 'ok', message: 'Quiz Buzzer backend'});
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
	console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});
