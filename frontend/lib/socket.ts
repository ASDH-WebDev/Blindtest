import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const socketBase = normalizeBaseUrl(
      process.env.NEXT_PUBLIC_SOCKET_BASE_URL || "http://localhost:4000"
    );
    socket = io(`${socketBase}/game`, {
      transports: ["websocket"],
    });
  }

  return socket;
}

