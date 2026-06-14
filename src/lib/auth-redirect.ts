/** Full navigation after Clerk setActive so session cookies are set before protected routes. */
export function redirectAfterAuth(path: string) {
  window.location.assign(path);
}
