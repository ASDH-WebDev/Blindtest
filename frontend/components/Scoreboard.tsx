"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

type Entry = {
  id: number;
  nickname: string;
  total_score: number;
};

export default function Scoreboard({ gameCode }: { gameCode: string }) {
  const [scores, setScores] = useState<Entry[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (payload: { scoreboard: Entry[] }) => {
      setScores(payload.scoreboard);
    };

    socket.on("score:update", handler);

    return () => {
      socket.off("score:update", handler);
    };
  }, [gameCode]);

  if (scores.length === 0) {
    return <p className="text-sm text-zinc-400">En attente de scores...</p>;
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Scoreboard
      </h3>
      <ul className="space-y-1 text-sm">
        {scores.map((s, idx) => (
          <li
            key={s.id}
            className="flex items-center justify-between text-zinc-100"
          >
            <span>
              {idx + 1}. {s.nickname}
            </span>
            <span className="font-mono">{s.total_score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

