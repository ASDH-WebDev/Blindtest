'use client';

import {useEffect, useState} from 'react';
import CurrentQuestion from '../../../../components/CurrentQuestion';
import BuzzerButton from '../../../../components/BuzzerButton';
import AudioPlayer from '../../../../components/AudioPlayer';
import {getSocket} from '../../../../lib/socket';
import {apiRequest} from '../../../../lib/api';

type PlayerInfo = {
	id: number;
	nickname: string;
};

export default function GamePlayClient({gameCode}: {gameCode: string}) {
	const [player, setPlayer] = useState<PlayerInfo | null>(null);
	const [roundId] = useState<number>(1);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const initPlayer = async () => {
			if (typeof window === 'undefined') return;

			// 1) On essaie d'abord de récupérer le joueur depuis le localStorage
			const storedId = window.localStorage.getItem('playerId');
			const storedNickname = window.localStorage.getItem('playerNickname');

			if (storedId && storedNickname) {
				const p: PlayerInfo = {
					id: Number(storedId),
					nickname: storedNickname,
				};
				setPlayer(p);

				const socket = getSocket();
				if (socket) {
					socket.emit('game:join', {
						gameCode,
						playerId: p.id,
						nickname: p.nickname,
					});
				}
				return;
			}

			// 2) Si rien en localStorage, on tente l'API join
			try {
				const data = await apiRequest(`/games/${gameCode}/join`, {
					method: 'POST',
					body: JSON.stringify({}),
				});
				const p = data.player as PlayerInfo;
				setPlayer(p);
				window.localStorage.setItem('playerId', String(p.id));
				window.localStorage.setItem('playerNickname', p.nickname);

				const socket = getSocket();
				if (socket) {
					socket.emit('game:join', {
						gameCode,
						playerId: p.id,
						nickname: p.nickname,
					});
				}
			} catch (err: unknown) {
				console.error('Erreur join game', err);
				const message = err instanceof Error ? err.message : undefined;
				setError(message || 'Impossible de rejoindre la partie.');
			}
		};

		initPlayer();
	}, [gameCode]);

	if (error) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
				<p className='text-sm text-red-300'>{error}</p>
			</div>
		);
	}

	if (!player) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
				<p>Chargement du joueur...</p>
			</div>
		);
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
			<main className='flex flex-col items-center gap-8 p-8'>
				<h1 className='text-2xl font-bold text-center'>
					Partie <span className='text-red-400'>{gameCode}</span>
				</h1>
				<p className='text-sm text-zinc-400'>
					Joueur : <span className='font-mono'>{player.nickname}</span> (id {player.id})
				</p>
				<AudioPlayer gameCode={gameCode} />
				<CurrentQuestion gameCode={gameCode} />
				<BuzzerButton gameCode={gameCode} roundId={roundId} playerId={String(player.id)} playerNickname={player.nickname} />
			</main>
		</div>
	);
}
