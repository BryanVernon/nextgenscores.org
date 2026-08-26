export default function authFetch(url, options = {}) {
  const token = localStorage.getItem("ngs_session_token") || sessionStorage.getItem("ngs_session_token");
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, { ...options, credentials: "include", headers });
}
