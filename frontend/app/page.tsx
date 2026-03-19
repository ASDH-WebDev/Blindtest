'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export default function Home() {
	const router = useRouter();
	const [adminCode, setAdminCode] = useState('');

	const goToAdmin = (e: React.FormEvent) => {
		e.preventDefault();
		const code = adminCode.trim().toUpperCase();
		if (!code) return;
		router.push(`/host?gameCode=${code}`);
	};

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50'>
			<main className='flex flex-col items-center gap-6 p-8'>
				<h1 className='text-3xl font-bold text-center'>Quiz Buzzer – Soirée Anniv</h1>
				<p className='max-w-md text-center text-zinc-300'>
					Crée une partie, partage le code à tes amis, et buzze plus vite que tout le monde.
				</p>

				<div className='flex flex-wrap justify-center gap-4'>
					<Link href='/login' className='rounded-full bg-red-600 px-6 py-2 text-sm font-semibold hover:bg-red-700'>
						Connexion
					</Link>
					<Link href='/register' className='rounded-full border border-zinc-600 px-6 py-2 text-sm font-semibold hover:bg-zinc-800'>
						Inscription
					</Link>
					<Link href='/dashboard' className='rounded-full border border-zinc-600 px-6 py-2 text-sm font-semibold hover:bg-zinc-800'>
						Tableau de bord
					</Link>
				</div>

				{/* Panneau admin direct */}
				<div className='mt-6 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4'>
					<h2 className='mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400'>Accès rapide panneau admin</h2>
					<p className='mb-3 text-xs text-zinc-400'>Entre le code de la partie pour ouvrir directement l&apos;interface Host.</p>
					<form onSubmit={goToAdmin} className='flex gap-2'>
						<input
							type='text'
							placeholder='Code partie (ex : ABCD)'
							className='flex-1 rounded bg-zinc-800 px-3 py-2 text-sm uppercase outline-none'
							value={adminCode}
							onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
						/>
						<button type='submit' className='rounded bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700'>
							Admin
						</button>
					</form>
				</div>

				<p className='mt-4 text-xs text-zinc-500'>
					Joueurs : <span className='font-mono'>/game/play?gameCode=&lt;CODE&gt;</span> – Host :{' '}
					<span className='font-mono'>/host?gameCode=&lt;CODE&gt;</span>
				</p>
			</main>
		</div>
	);
}
