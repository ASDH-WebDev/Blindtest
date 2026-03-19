const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const API_URL = `${API_BASE_URL.replace(/\/+$/, "")}/api`;

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("token")
      : null;

  // Utiliser l'API `Headers` évite un souci de typage TS sur `HeadersInit`.
  const headers = new Headers(options.headers || undefined);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur API");
  }

  return res.json();
}

