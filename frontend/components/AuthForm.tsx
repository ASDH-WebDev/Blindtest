'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {apiRequest} from '../lib/api';
import {saveAuth} from '../lib/auth';

type Mode = 'login' | 'register';

export default function AuthForm({mode}: {mode: Mode}) {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [nickname, setNickname] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		setLoading(true);

		try {
			if (mode === 'register') {
				const data = await apiRequest('/auth/register', {
					method: 'POST',
					body: JSON.stringify({email, password, nickname}),
				});

				// on ne garde pas l'utilisateur connecté automatiquement
				// saveAuth(data.token);

				setSuccess('Compte créé avec succès, tu peux maintenant te connecter.');
				// petite redirection vers la page de login
				setTimeout(() => {
					router.push('/login');
				}, 1500);
			} else {
				const data = await apiRequest('/auth/login', {
					method: 'POST',
					body: JSON.stringify({email, password}),
				});
				saveAuth(data.token);
				router.push('/dashboard');
			}
		} catch (err: any) {
			setError(err.message || 'Erreur');
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={onSubmit} className='flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6'>
			<h2 className='text-lg font-semibold'>{mode === 'register' ? 'Inscription' : 'Connexion'}</h2>

			{error && <p className='rounded border border-red-500 bg-red-950 px-3 py-2 text-xs text-red-200'>{error}</p>}

			{success && <p className='rounded border border-emerald-500 bg-emerald-950 px-3 py-2 text-xs text-emerald-200'>{success}</p>}

			<input
				type='email'
				placeholder='Email'
				className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none'
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
			/>

			{mode === 'register' && (
				<input
					type='text'
					placeholder='Pseudo'
					className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none'
					value={nickname}
					onChange={(e) => setNickname(e.target.value)}
					required
				/>
			)}

			<input
				type='password'
				placeholder='Mot de passe'
				className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				required
			/>

			<button
				type='submit'
				disabled={loading}
				className='mt-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50'>
				{loading ? 'Chargement...' : 'Valider'}
			</button>
		</form>
	);
}
