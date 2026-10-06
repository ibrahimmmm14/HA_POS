/** Where to go after signing in: the page asked for in ?next=, but only if it is a page inside this app. */
export function safeNext(search: string): string {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/';
}
