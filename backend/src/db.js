import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// On réutilise les variables d'environnement existantes (PGHOST/PGUSER/...)
// pour limiter les changements côté config.
const mysqlPool = mysql.createPool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME || process.env.DB_DATABASE,
	connectionLimit: 10,
	charset: 'utf8mb4',
	ssl:
		process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || (process.env.DB_HOST || '').includes('infomaniak')
			? {rejectUnauthorized: false}
			: undefined,
});

export const pool = {
	query: async (sql, params = []) => {
		const [result] = await mysqlPool.execute(sql, params);

		// SELECT => result est un tableau
		if (Array.isArray(result)) {
			return {rows: result};
		}

		// INSERT/UPDATE => result est un OkPacket (insertId dispo)
		if (result && typeof result === 'object' && 'insertId' in result) {
			return {rows: [], insertId: result.insertId};
		}

		return {rows: []};
	},
};
