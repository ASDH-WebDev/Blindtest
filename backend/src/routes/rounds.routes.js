import {Router} from 'express';
import {pool} from '../db.js';
import {authMiddleware} from '../middleware/auth.js';

const router = Router();

router.post('/:code/rounds', authMiddleware, async (req, res) => {
	const {code} = req.params;

	try {
		const gameResult = await pool.query('SELECT * FROM he3npt_quizz.games WHERE code = ?', [code]);
		const game = gameResult.rows[0];
		if (!game) return res.status(404).json({error: 'Game not found'});

		const countResult = await pool.query('SELECT COUNT(*) as count FROM he3npt_quizz.rounds WHERE game_id = ?', [game.id]);
		const roundNumber = Number(countResult.rows[0].count) + 1;

		const roundResult = await pool.query('INSERT INTO he3npt_quizz.rounds (game_id, round_number, status) VALUES (?,?,?)', [
			game.id,
			roundNumber,
			'open',
		]);

		const roundId = roundResult.insertId;
		const inserted = await pool.query('SELECT * FROM he3npt_quizz.rounds WHERE id = ?', [roundId]);
		res.json({round: inserted.rows[0]});
	} catch (err) {
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

router.post('/:code/rounds/:roundId/validate', authMiddleware, async (req, res) => {
	const {code, roundId} = req.params;
	const {playerId, correct, points = 1, penalty = 0} = req.body;

	try {
		const gameResult = await pool.query('SELECT * FROM he3npt_quizz.games WHERE code = ?', [code]);
		const game = gameResult.rows[0];
		if (!game) return res.status(404).json({error: 'Game not found'});

		const roundResult = await pool.query('SELECT * FROM he3npt_quizz.rounds WHERE id = ? AND game_id = ?', [roundId, game.id]);
		const round = roundResult.rows[0];
		if (!round) return res.status(404).json({error: 'Round not found'});

		const delta = correct ? Number(points) : -Math.abs(Number(penalty) || 0);

		await pool.query('INSERT INTO he3npt_quizz.scores (round_id, player_id, delta) VALUES (?,?,?)', [round.id, playerId, delta]);

		await pool.query('UPDATE he3npt_quizz.game_players SET total_score = total_score + ? WHERE id = ?', [delta, playerId]);

		await pool.query('UPDATE he3npt_quizz.rounds SET status = ? WHERE id = ?', ['resolved', round.id]);

		const scoreboard = await pool.query(
			`SELECT gp.id, gp.nickname, gp.total_score
       FROM he3npt_quizz.game_players gp
       WHERE gp.game_id = ?
       ORDER BY gp.total_score DESC`,
			[game.id],
		);

		res.json({scoreboard: scoreboard.rows});
	} catch (err) {
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

export default router;
