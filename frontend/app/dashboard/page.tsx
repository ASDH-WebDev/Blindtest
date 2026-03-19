'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {apiRequest} from '../../lib/api';

export default function DashboardPage() {
	const router = useRouter();
	const [gameName, setGameName] = useState('');
	const [joinCode, setJoinCode] = useState('');
	const [createdCode, setCreatedCode] = useState<string | null>(null);
	const [loadingCreate, setLoadingCreate] = useState(false);
	const [loadingJoin, setLoadingJoin] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createGame = async () => {
		setError(null);
		setLoadingCreate(true);
		try {
			const data = await apiRequest('/games', {
				method: 'POST',
				body: JSON.stringify({name: gameName || null}),
			});
			const code = data.game.code as string;
			setCreatedCode(code);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : undefined;
			setError(message || 'Erreur lors de la création de la partie');
		} finally {
			setLoadingCreate(false);
		}
	};

	const joinGame = async () => {
		setError(null);
		setLoadingJoin(true);
		try {
			const code = joinCode.trim().toUpperCase();
			if (!code) {
				setError('Entre un code de partie');
				setLoadingJoin(false);
				return;
			}

			const data = await apiRequest(`/games/${code}/join`, {
				method: 'POST',
				body: JSON.stringify({}),
			});

			// On mémorise le joueur pour la page /game/play
			if (typeof window !== 'undefined' && data.player) {
				window.localStorage.setItem('playerId', String(data.player.id));
				window.localStorage.setItem('playerNickname', data.player.nickname);
			}

			// Redirection du joueur vers la vue joueur
			router.push(`/game/play?gameCode=${code}`);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : undefined;
			setError(message || 'Erreur lors de la jonction de la partie');
		} finally {
			setLoadingJoin(false);
		}
	};

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
			<main className='flex w-full max-w-3xl flex-col gap-8 p-8'>
				<h1 className='text-2xl font-bold text-center'>Tableau de bord</h1>

				{error && <p className='rounded border border-red-500 bg-red-950 px-3 py-2 text-sm text-red-200'>{error}</p>}

				<section className='grid gap-6 md:grid-cols-2'>
					<div className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4'>
						<h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-400'>Créer une partie</h2>
						<input
							type='text'
							placeholder='Nom de la partie (optionnel)'
							className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none'
							value={gameName}
							onChange={(e) => setGameName(e.target.value)}
						/>
						<button
							onClick={createGame}
							disabled={loadingCreate}
							className='mt-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50'>
							{loadingCreate ? 'Création...' : 'Créer la partie'}
						</button>

						{createdCode && (
							<div className='mt-3 space-y-2 rounded bg-zinc-800 p-3 text-sm'>
								<p>
									Code de la partie : <span className='font-mono text-lg text-red-400'>{createdCode}</span>
								</p>
								<p className='text-xs text-zinc-400'>Partage ce code aux joueurs.</p>
								<div className='flex flex-wrap gap-2 text-xs'>
									<button
										onClick={() => router.push(`/host?gameCode=${createdCode}`)}
										className='rounded bg-zinc-700 px-3 py-1 hover:bg-zinc-600'>
										Ouvrir interface Host
									</button>
									<button
										onClick={() => router.push(`/game/play?gameCode=${createdCode}`)}
										className='rounded bg-zinc-700 px-3 py-1 hover:bg-zinc-600'>
										Tester vue joueur
									</button>
								</div>
							</div>
						)}
					</div>

					<div className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4'>
						<h2 className='text-sm font-semibold uppercase tracking-wide text-zinc-400'>Rejoindre une partie</h2>
						<input
							type='text'
							placeholder='Code de la partie (ex : ABCD)'
							className='rounded bg-zinc-800 px-3 py-2 text-sm uppercase outline-none'
							value={joinCode}
							onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
						/>
						<button
							onClick={joinGame}
							disabled={loadingJoin}
							className='mt-1 rounded bg-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-600 disabled:opacity-50'>
							{loadingJoin ? 'Connexion...' : 'Rejoindre la partie'}
						</button>
						<p className='mt-2 text-xs text-zinc-500'>
							Les joueurs utiliseront ensuite l&apos;URL <span className='font-mono'>/game/play?gameCode=&lt;CODE&gt;</span> sur leur téléphone.
						</p>
					</div>
				</section>
			</main>
		</div>
	);
}
