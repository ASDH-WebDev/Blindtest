import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {pool} from '../db.js';
import {authMiddleware, createToken} from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
	const {email, password, nickname} = req.body;
	if (!email || !password || !nickname) {
		return res.status(400).json({error: 'Missing fields'});
	}

	try {
		const hash = await bcrypt.hash(password, 10);
		await pool.query('INSERT INTO he3npt_quizz.users (email, password_hash, nickname) VALUES (?,?,?)', [email, hash, nickname]);

		const result = await pool.query('SELECT id, email, nickname FROM he3npt_quizz.users WHERE email = ?', [email]);
		const user = result.rows[0];
		const token = createToken(user);
		res.json({user, token});
	} catch (err) {
		if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
			return res.status(409).json({error: 'Email déjà utilisé'});
		}
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

router.post('/login', async (req, res) => {
	const {email, password} = req.body;
	if (!email || !password) {
		return res.status(400).json({error: 'Missing fields'});
	}

	try {
		const result = await pool.query('SELECT * FROM he3npt_quizz.users WHERE email = ?', [email]);
		const user = result.rows[0];
		if (!user) return res.status(401).json({error: 'Bad credentials'});

		const ok = await bcrypt.compare(password, user.password_hash);
		if (!ok) return res.status(401).json({error: 'Bad credentials'});

		const {password_hash, ...safeUser} = user;
		const token = createToken(safeUser);
		res.json({user: safeUser, token});
	} catch (err) {
		console.error(err);
		res.status(500).json({error: 'Server error'});
	}
});

router.get('/me', authMiddleware, (req, res) => {
	res.json({user: req.user});
});

export default router;
