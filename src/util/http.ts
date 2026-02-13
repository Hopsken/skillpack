import { getGithubToken } from './github-auth.js';

export async function ghFetch(url: string, extraHeaders?: Record<string, string>): Promise<Response> {
  const token = getGithubToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'skillpack',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${url}\n${body}`);
  }
  return res;
}

export async function ghJson<T = unknown>(url: string): Promise<T> {
  const res = await ghFetch(url);
  return res.json() as Promise<T>;
}
