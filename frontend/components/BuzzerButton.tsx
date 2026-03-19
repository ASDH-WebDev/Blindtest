'use client';

import {useEffect, useState} from 'react';
import {getSocket} from '../lib/socket';

type Props = {
	gameCode: string;
	roundId: number;
	playerId: string;
	playerNickname: string;
};

export default function BuzzerButton({gameCode, roundId, playerId, playerNickname}: Props) {
	const [disabled, setDisabled] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		const handleLocked = (payload: {roundId: number; playerId: number; nickname: string}) => {
			// on NE filtre plus sur roundId
			if (String(payload.playerId) === playerId) {
				setStatus('Tu as buzzé en premier !');
			} else {
				setStatus(`${payload.nickname} a buzzé en premier`);
			}
			setDisabled(true);
		};

		const handleReset = (_payload: {roundId: number}) => {
			// on NE filtre plus sur roundId
			setDisabled(false);
			setStatus(null);
		};

		socket.on('buzzer:locked', handleLocked);
		socket.on('buzzer:reset', handleReset);

		return () => {
			socket.off('buzzer:locked', handleLocked);
			socket.off('buzzer:reset', handleReset);
		};
	}, [playerId]);

	const handleClick = () => {
		if (disabled) return;
		const socket = getSocket();
		if (!socket) return;

		setDisabled(true);
		setStatus('Buzz envoyé...');

		socket.emit('buzzer:press', {
			gameCode,
			roundId,
			playerId: Number(playerId),
			nickname: playerNickname,
		});
	};

	return (
		<div className='flex flex-col items-center gap-4'>
			<button
				onClick={handleClick}
				disabled={disabled}
				className={`h-32 w-32 rounded-full text-xl font-bold text-white shadow-lg transition transform ${
					disabled ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-95'
				}`}>
				BUZZER
			</button>
			<p className='text-sm text-zinc-700 dark:text-zinc-300 h-5'>{status ?? '\u00a0'}</p>
		</div>
	);
}
