export function saveAuth(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", token);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
}

