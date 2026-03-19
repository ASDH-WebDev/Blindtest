'use client';

import {Suspense, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {getSocket} from '../../lib/socket';
import {apiRequest} from '../../lib/api';
import Scoreboard from '../../components/Scoreboard';

type LastBuzz = {
	playerId: number;
	nickname: string;
	roundId: number;
} | null;

const ADMIN_PIN = '4242';

function HostInner({gameCode}: {gameCode: string}) {
	const [imageUrl, setImageUrl] = useState('');
	const [imageHint, setImageHint] = useState('');
	const [audioUrl, setAudioUrl] = useState('/media/audio/dkc2.mp3');
	const [audioVolume, setAudioVolume] = useState(1);
	const [audioStartAt, setAudioStartAt] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const [audioCurrentTime, setAudioCurrentTime] = useState(0);
	const [audioScrubValue, setAudioScrubValue] = useState(0);
	const [audioIsPlaying, setAudioIsPlaying] = useState(false);
	const [audioIsScrubbing, setAudioIsScrubbing] = useState(false);

	const hostAudioRef = useRef<HTMLAudioElement | null>(null);
	const audioIsScrubbingRef = useRef(false);

	const [roundId, setRoundId] = useState<number | null>(null);
	const [loadingRound, setLoadingRound] = useState(false);
	const [points, setPoints] = useState(1);
	const [penalty, setPenalty] = useState(1);
	const [lastBuzz, setLastBuzz] = useState<LastBuzz>(null);

	const [adminPin, setAdminPin] = useState('');
	const [authorized, setAuthorized] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);

	// Abonnement aux events Socket.io
	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		socket.emit('game:join', {gameCode});

		const onLocked = (payload: {roundId: number; playerId: number; nickname: string}) => {
			console.log('buzzer:locked (host)', payload);
			setLastBuzz({
				roundId: payload.roundId,
				playerId: payload.playerId,
				nickname: payload.nickname,
			});
		};

		const onReset = (_payload: {roundId: number}) => {
			console.log('buzzer:reset (host)');
			setLastBuzz(null);
		};

		socket.on('buzzer:locked', onLocked);
		socket.on('buzzer:reset', onReset);

		return () => {
			socket.off('buzzer:locked', onLocked);
			socket.off('buzzer:reset', onReset);
		};
	}, [gameCode]);

	// Précharge le son côté host pour connaître la durée et alimenter la timeline.
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const el = hostAudioRef.current ?? new Audio(audioUrl);
		hostAudioRef.current = el;

		// Si l'URL change, recharger.
		if (el.src !== audioUrl) {
			el.pause();
			el.src = audioUrl;
		}

		const onLoadedMetadata = () => {
			const duration = Number(el.duration);
			if (Number.isFinite(duration) && duration > 0) {
				setAudioDuration(duration);
			}
		};

		const onTimeUpdate = () => {
			if (audioIsScrubbingRef.current) return;
			setAudioCurrentTime(Number(el.currentTime) || 0);
		};

		const onEnded = () => {
			setAudioIsPlaying(false);
			setAudioCurrentTime(Number(el.duration) || 0);
		};

		el.addEventListener('loadedmetadata', onLoadedMetadata);
		el.addEventListener('timeupdate', onTimeUpdate);
		el.addEventListener('ended', onEnded);

		return () => {
			el.removeEventListener('loadedmetadata', onLoadedMetadata);
			el.removeEventListener('timeupdate', onTimeUpdate);
			el.removeEventListener('ended', onEnded);
		};
	}, [audioUrl]);

	const createRound = async () => {
		setLoadingRound(true);
		try {
			const data = await apiRequest(`/games/${gameCode}/rounds`, {
				method: 'POST',
				body: JSON.stringify({}),
			});
			setRoundId(data.round.id);
			setLastBuzz(null);
			const socket = getSocket();
			socket?.emit('round:reset', {gameCode, roundId: data.round.id});
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingRound(false);
		}
	};

	const validate = (correct: boolean) => {
		if (!lastBuzz) return;
		const socket = getSocket();
		socket?.emit('host:validate-answer', {
			gameCode,
			roundId,
			playerId: lastBuzz.playerId,
			correct,
			points,
			penalty,
		});
	};

	const handleAdminSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (adminPin === ADMIN_PIN) {
			setAuthorized(true);
			setAuthError(null);
		} else {
			setAuthError('Code admin incorrect');
		}
	};

	if (!authorized) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
				<main className='flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6'>
					<h1 className='text-xl font-bold text-center'>Accès panneau admin – Partie {gameCode}</h1>
					<p className='text-xs text-zinc-400 text-center'>Entre le code admin pour contrôler les rounds et les scores.</p>

					{authError && <p className='rounded border border-red-500 bg-red-950 px-3 py-2 text-xs text-red-200'>{authError}</p>}

					<form onSubmit={handleAdminSubmit} className='flex flex-col gap-3'>
						<input
							type='password'
							placeholder='Code admin'
							className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none text-center tracking-[0.3em]'
							value={adminPin}
							onChange={(e) => setAdminPin(e.target.value)}
						/>
						<button type='submit' className='rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700'>
							Entrer dans le panneau admin
						</button>
					</form>
				</main>
			</div>
		);
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
			<main className='flex w-full max-w-5xl flex-col gap-8 p-8'>
				<h1 className='text-2xl font-bold'>
					Host – Partie <span className='text-red-400'>{gameCode}</span>
				</h1>

				<div className='flex flex-col gap-6 lg:flex-row lg:items-start'>
					<div className='flex flex-1 flex-col gap-6'>
						<div className='flex flex-wrap gap-6'>
							<div className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4'>
								<p className='text-sm text-zinc-300'>1. Crée un nouveau round puis lance l&apos;audio.</p>
								<button
									onClick={createRound}
									disabled={loadingRound}
									className='rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50'>
									{loadingRound ? 'Création...' : 'Nouveau round / Reset buzzer'}
								</button>
								{roundId && (
									<p className='text-xs text-zinc-400'>
										Round ID actuel : <span className='font-mono'>{roundId}</span>
									</p>
								)}

								<div className='mt-3 rounded bg-zinc-800 p-3 text-sm'>
									<p className='font-semibold text-zinc-200'>Son à jouer :</p>
									<input
										type='text'
										placeholder='/media/audio/monson.mp3'
										className='mt-2 w-full rounded bg-zinc-700 px-3 py-2 text-sm outline-none'
										value={audioUrl}
										onChange={(e) => setAudioUrl(e.target.value)}
									/>

									<div className='mt-3 flex items-center gap-3'>
										<label className='text-xs text-zinc-300 whitespace-nowrap'>Volume</label>
										<input
											type='range'
											min={0}
											max={1}
											step={0.01}
											value={audioVolume}
											onChange={(e) => setAudioVolume(Number(e.target.value))}
											className='flex-1'
										/>
										<span className='w-10 text-right text-xs text-zinc-400 font-mono'>{audioVolume.toFixed(2)}</span>
									</div>

									<div className='mt-2 flex items-center gap-3'>
										<label className='text-xs text-zinc-300 whitespace-nowrap'>Démarrer à</label>
										<input
											type='number'
											min={0}
											step={0.1}
											value={audioStartAt}
											onChange={(e) => setAudioStartAt(Number(e.target.value))}
											className='w-28 rounded bg-zinc-700 px-2 py-1 text-sm outline-none'
										/>
										<span className='text-xs text-zinc-400'>s</span>
									</div>

									<div className='mt-3'>
										<p className='text-xs text-zinc-300'>Timeline (scrub)</p>
										<div className='mt-2 flex items-center gap-3'>
											<span className='w-12 text-right text-xs text-zinc-400 font-mono'>
												{(audioIsScrubbing ? audioScrubValue : audioCurrentTime).toFixed(1)}s
											</span>
											<input
												type='range'
												min={0}
												max={audioDuration || 0}
												step={0.1}
												value={Math.min(audioIsScrubbing ? audioScrubValue : audioCurrentTime, audioDuration || 0)}
												disabled={!audioDuration}
												onPointerDown={() => {
													audioIsScrubbingRef.current = true;
													setAudioIsScrubbing(true);
													setAudioScrubValue(audioCurrentTime);
												}}
												onChange={(e) => setAudioScrubValue(Number(e.target.value))}
												onPointerUp={(e) => {
													audioIsScrubbingRef.current = false;
													setAudioIsScrubbing(false);
													const inputValue = Number((e.target as HTMLInputElement).value);
													const t = Number.isFinite(inputValue) ? inputValue : 0;
													const clamped = audioDuration ? Math.min(audioDuration, Math.max(0, t)) : Math.max(0, t);

													const el = hostAudioRef.current;
													if (el) {
														el.currentTime = clamped;
														if (audioIsPlaying) {
															void el.play().catch(() => {});
														}
													}

													setAudioCurrentTime(clamped);
													setAudioScrubValue(clamped);
													setAudioStartAt(clamped);

													if (!audioIsPlaying) return;
													const socket = getSocket();
													socket?.emit('audio:play', {
														gameCode,
														url: audioUrl,
														volume: audioVolume,
														startAt: clamped,
													});
												}}
												className='flex-1 accent-red-500'
											/>
											<span className='w-12 text-xs text-zinc-400 font-mono'>
												{audioDuration ? `${audioDuration.toFixed(1)}s` : '—'}
											</span>
										</div>
									</div>

									<button
										onClick={() => {
											const url = audioUrl.trim();
											if (!url) return;
											const el = hostAudioRef.current ?? new Audio(url);
											hostAudioRef.current = el;

											el.pause();
											if (el.src !== url) el.src = url;
											el.volume = audioVolume;
											el.currentTime = audioStartAt;

											void el
												.play()
												.then(() => {
													setAudioIsPlaying(true);
													setAudioCurrentTime(audioStartAt);
													setAudioScrubValue(audioStartAt);
												})
												.catch(() => {
													setAudioIsPlaying(false);
												});

											const socket = getSocket();
											socket?.emit('audio:play', {gameCode, url, volume: audioVolume, startAt: audioStartAt});
										}}
										className='mt-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700'>
										Lancer le son aux joueurs
									</button>

									<button
										onClick={() => {
											hostAudioRef.current?.pause();
											setAudioIsPlaying(false);
											const socket = getSocket();
											socket?.emit('audio:stop', {gameCode});
										}}
										className='mt-2 rounded bg-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-600'>
										Stop musique
									</button>

									<p className='text-xs text-zinc-500 mt-2'>
										Mets tes fichiers dans <span className='font-mono'>/public/media/audio</span>
										puis utilise des URLs comme <span className='font-mono'>/media/audio/monson.mp3</span>.
									</p>
								</div>

								<div className='mt-3 rounded bg-zinc-800 p-3 text-sm'>
									<p className='font-semibold text-zinc-200'>Premier buzz :</p>
									{lastBuzz ? (
										<p>
											<span className='font-mono'>{lastBuzz.nickname}</span> (id {lastBuzz.playerId}) – round {lastBuzz.roundId}
										</p>
									) : (
										<p className='text-xs text-zinc-400'>En attente du premier buzz...</p>
									)}
								</div>
							</div>

							<div className='flex flex-1 flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4'>
								<p className='text-sm text-zinc-300'>2. Valide la réponse du joueur qui a buzzé en premier.</p>

								<div className='flex gap-2'>
									<input
										type='number'
										className='w-20 rounded bg-zinc-800 px-2 py-1 text-sm outline-none'
										value={points}
										onChange={(e) => setPoints(Number(e.target.value))}
									/>
									<span className='text-sm text-zinc-400'>Points si bonne réponse</span>
								</div>

								<div className='flex gap-2'>
									<input
										type='number'
										className='w-20 rounded bg-zinc-800 px-2 py-1 text-sm outline-none'
										value={penalty}
										onChange={(e) => setPenalty(Number(e.target.value))}
									/>
									<span className='text-sm text-zinc-400'>Malus si mauvaise réponse</span>
								</div>

								<div className='mt-2 flex gap-3'>
									<button
										onClick={() => validate(true)}
										disabled={!lastBuzz}
										className='rounded bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50'>
										Bonne réponse
									</button>
									<button
										onClick={() => validate(false)}
										disabled={!lastBuzz}
										className='rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50'>
										Mauvaise réponse
									</button>
								</div>
							</div>
						</div>

						{/* Panneau image/question */}
						<div className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4'>
							<p className='text-sm text-zinc-300'>3. Envoyer une image à tous les joueurs.</p>
							<input
								type='text'
								placeholder="URL de l'image (ex: /media/images/mario.png)"
								className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none'
								value={imageUrl}
								onChange={(e) => setImageUrl(e.target.value)}
							/>
							<input
								type='text'
								placeholder='Indice (optionnel)'
								className='rounded bg-zinc-800 px-3 py-2 text-sm outline-none'
								value={imageHint}
								onChange={(e) => setImageHint(e.target.value)}
							/>
							<button
								onClick={() => {
									const url = imageUrl.trim();
									if (!url) return;
									const socket = getSocket();
									socket?.emit('question:set', {
										gameCode,
										type: 'image',
										url,
										hint: imageHint || null,
									});
								}}
								className='mt-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700'>
								Envoyer l&apos;image aux joueurs
							</button>
							<button
								onClick={() => {
									const socket = getSocket();
									socket?.emit('question:clear', {gameCode});
								}}
								className='mt-1 rounded bg-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-600 disabled:opacity-50'>
								Supprimer l&apos;image
							</button>
							<p className='text-xs text-zinc-500'>
								Mets tes fichiers dans <span className='font-mono'>/public/media/images</span>
								puis utilise des URLs comme <span className='font-mono'>/media/images/monimage.png</span>.
							</p>
						</div>
					</div>

					<div className='w-full lg:w-80'>
						<Scoreboard gameCode={gameCode} />
					</div>
				</div>
			</main>
		</div>
	);
}

function HostSearchInner() {
	const searchParams = useSearchParams();
	const gameCode = (searchParams.get('gameCode') || 'DEMO').toUpperCase();
	return <HostInner gameCode={gameCode} />;
}

export default function HostPage() {
	return (
		<Suspense fallback={null}>
			<HostSearchInner />
		</Suspense>
	);
}

