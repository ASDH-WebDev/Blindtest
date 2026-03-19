import {Router} from 'express';
import {pool} from '../db.js';
import {authMiddleware} from '../middleware/auth.js';

const router = Router();

function generateGameCode() {
	return Math.random().toString(36).slice(2, 6).toUpperCase();
}

router.post('/', authMiddleware, async (req, res) => {
	const {name} = req.body;
	const hostUserId = req.user.id;

	try {
		const code = generateGameCode();
		const insertResult = await pool.query('INSERT INTO he3npt_quizz.games (code, host_user_id, name, status) VALUES (?,?,?,?)', [
			code,
			hostUserId,
			name || null,
			'lobby',
		]);

		const gameId = insertResult.insertId;
		const gameResult = await pool.query('SELECT * FROM he3npt_quizz.games WHERE id = ?', [gameId]);
		const game = gameResult.rows[0];

		await pool.query('INSERT INTO he3npt_quizz.game_players (game_id, user_id, nickname, total_score, is_host) VALUES (?,?,?,?,?)', [
			game.id,
			hostUserId,
			req.user.nickname,
			0,
			true,
		]);

		res.json({game});
	} catch (err) {
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

router.post('/:code/join', authMiddleware, async (req, res) => {
	const {code} = req.params;
	const userId = req.user.id;
	const nickname = req.user.nickname;

	try {
		const gameResult = await pool.query('SELECT * FROM he3npt_quizz.games WHERE code = ?', [code]);
		const game = gameResult.rows[0];
		if (!game) return res.status(404).json({error: 'Game not found'});

		let playerResult = await pool.query('SELECT * FROM he3npt_quizz.game_players WHERE game_id = ? AND user_id = ?', [game.id, userId]);
		let player = playerResult.rows[0];

		if (!player) {
			playerResult = await pool.query(
				'INSERT INTO he3npt_quizz.game_players (game_id, user_id, nickname, total_score, is_host) VALUES (?,?,?,?,?)',
				[game.id, userId, nickname, 0, false],
			);

			const playerId = playerResult.insertId;
			const sel = await pool.query('SELECT * FROM he3npt_quizz.game_players WHERE id = ?', [playerId]);
			player = sel.rows[0];
		}

		res.json({game, player});
	} catch (err) {
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

router.get('/:code', authMiddleware, async (req, res) => {
	const {code} = req.params;

	try {
		const gameResult = await pool.query('SELECT * FROM he3npt_quizz.games WHERE code = ?', [code]);
		const game = gameResult.rows[0];
		if (!game) return res.status(404).json({error: 'Game not found'});

		const playersResult = await pool.query('SELECT * FROM he3npt_quizz.game_players WHERE game_id = ? ORDER BY total_score DESC', [game.id]);

		res.json({game, players: playersResult.rows});
	} catch (err) {
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

export default router;
