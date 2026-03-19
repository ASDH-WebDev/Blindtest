'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {getSocket} from '../lib/socket';

type AudioPayload = {
	url: string;
	volume?: number;
	startAt?: number;
};

export default function AudioPlayer({gameCode}: {gameCode: string}) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const pendingPayloadRef = useRef<AudioPayload | null>(null);
	const hasUserGestureRef = useRef(false);

	const [status, setStatus] = useState<string | null>(null);

	const playAudio = useCallback(async (payload: AudioPayload) => {
		if (!payload?.url) return;

		try {
			// (Re)crée l'instance : on veut un comportement déterministe
			// (volume/startAt) au moment du play.
			audioRef.current?.pause();
			audioRef.current = new Audio(payload.url);
			audioRef.current.preload = 'auto';

			const safeVolume =
				typeof payload.volume === 'number' && Number.isFinite(payload.volume) ? Math.min(1, Math.max(0, payload.volume)) : 1;
			const safeStartAt = typeof payload.startAt === 'number' && Number.isFinite(payload.startAt) ? Math.max(0, payload.startAt) : 0;

			audioRef.current.volume = safeVolume;
			audioRef.current.currentTime = safeStartAt;

			// Les navigateurs peuvent bloquer l'autoplay => le catch gère ça.
			const maybePromise = audioRef.current.play();
			if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
				await maybePromise;
			}

			pendingPayloadRef.current = null;
			setStatus('Son lancé.');
		} catch (err) {
			// Conserve la payload : on retentera après une action utilisateur.
			pendingPayloadRef.current = payload;
			setStatus('Autoplay bloqué. Clique une fois (ex: BUZZER) pour autoriser le son.');
		}
	}, []);

	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		const handler = (payload: AudioPayload) => {
			if (!payload?.url) return;
			pendingPayloadRef.current = payload;
			// On tente tout de suite; si c'est bloqué, le navigateur lèvera une erreur et on retentera après un geste.
			void playAudio(payload);
		};

		socket.on('audio:play', handler);

		const handleStop = () => {
			pendingPayloadRef.current = null;
			audioRef.current?.pause();
			setStatus('Son stoppé.');
		};

		socket.on('audio:stop', handleStop);

		return () => {
			socket.off('audio:play', handler);
			socket.off('audio:stop', handleStop);
		};
	}, [gameCode, playAudio]);

	useEffect(() => {
		const onUserGesture = () => {
			if (hasUserGestureRef.current) return;
			hasUserGestureRef.current = true;

			const payload = pendingPayloadRef.current;
			if (!payload) return;

			pendingPayloadRef.current = null;
			void playAudio(payload);
		};

		// Premier clic (ou tap) pour lever la contrainte d'autoplay.
		document.addEventListener('pointerdown', onUserGesture, {capture: true});

		return () => {
			document.removeEventListener('pointerdown', onUserGesture, {capture: true});
		};
	}, [playAudio]);

	useEffect(() => {
		return () => {
			audioRef.current?.pause();
		};
	}, []);

	return (
		<div className='h-0 w-full overflow-hidden'>
			{status ? <span className='text-xs text-zinc-400'>{status}</span> : null}
		</div>
	);
}

