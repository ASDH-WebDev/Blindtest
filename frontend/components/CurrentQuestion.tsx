'use client';

import {useEffect, useState} from 'react';
import {getSocket} from '../lib/socket';

type Question = {
	type: 'image';
	url: string;
	hint?: string | null;
} | null;

export default function CurrentQuestion({gameCode}: {gameCode: string}) {
	const [question, setQuestion] = useState<Question>(null);

	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		const handler = (payload: {type: string; url: string; hint?: string | null} | null) => {
			if (!payload) {
				setQuestion(null);
				return;
			}
			if (payload.type !== 'image') {
				setQuestion(null);
				return;
			}
			setQuestion({
				type: 'image',
				url: payload.url,
				hint: payload.hint ?? null,
			});
		};

		socket.on('question:update', handler);

		return () => {
			socket.off('question:update', handler);
		};
	}, [gameCode]);

	if (!question) {
		return (
			<div className='w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-center text-xs text-zinc-500'>
				Aucune image en cours. L&apos;organisateur enverra une image ici.
			</div>
		);
	}

	return (
		<div className='flex w-full flex-col items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3'>
			<p className='text-xs text-zinc-400'>Question en cours</p>
			<div className='w-full'>
				<img src={question.url} alt={question.hint || 'Question'} className='w-full h-auto rounded-lg bg-black object-contain' />
			</div>
			{question.hint && <p className='text-xs text-zinc-300 italic text-center px-2'>{question.hint}</p>}
		</div>
	);
}
