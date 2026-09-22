/*
 * Most tab components call window.fetch directly rather than going through the
 * axios instance in api.js, so they never saw its 401 interceptor. With the
 * access token now expiring after 30 minutes instead of 7 days, an expired
 * session would leave those screens silently failing with no route back to
 * the login page.
 *
 * Wrapping fetch once here covers all of those call sites, and any added
 * later, without touching each one.
 */
export function installSessionGuard() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (response.status === 401) {
      let url = '';
      try {
        const [input] = args;
        url = typeof input === 'string' ? input : input?.url || '';
      } catch {
        url = '';
      }

      // A failed sign-in also answers 401; redirecting there would wipe the
      // error message before the user could read it.
      const isLoginAttempt = url.includes('/auth/login');
      const alreadyOnLogin = window.location.pathname === '/login';

      if (!isLoginAttempt && !alreadyOnLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return response;
  };
}
