// The sign-in screen: the whole signed-out page in one part. The app's icon, name and one line on what it is sit in the
// middle on a soft glow of its own colour; the ways in sit at the bottom: "Continue with Google" (#sign-in, with why it
// didn't work in #sign-in-error), the app's own fields (a passcode form) and any more buttons ("Try the demo").
// It covers the page (tab bar and all) while its section shows, and is gone with it.
// "Forget this device" (#forget, then #forget-force while saves are unsent) shows only while this phone holds a
// signed-out copy: a stranger on a fresh phone never sees it. The same ids and words as signInSheet, so tests carry over.
import { el, button } from './dom.js';
import { whyFailed, whyRefused, forgetWords } from './sign-in-sheet.js';

const GOOGLE = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">'
  + '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
  + '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
  + '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
  + '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

/**
 * Whether this browser holds an app-sync account's copy (its `<name>:auth/owner` entry), so Forget has something to
 * clear. Apps without app-sync pass their own `holdsCopy`.
 * @param {Pick<Storage, 'length' | 'key' | 'getItem'> | null} [store]
 */
export function holdsSyncCopy(store) {
  try {
    const s = store === undefined ? globalThis.localStorage : store;
    if (!s) return false;
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.endsWith(':auth/owner') && s.getItem(k)) return true;
    }
  } catch { /* storage blocked: nothing to forget that this page can see */ }
  return false;
}

/**
 * @typedef {{ label: string, onTap: () => void, id?: string }} MoreButton
 * @param {HTMLElement} host  the screen is added here (the app's signed-out section)
 * @param {{
 *   name: string, tagline?: string, icon?: string, accent?: string,
 *   auth?: import('./types').AuthApi | null, label?: string,
 *   fields?: HTMLElement | null, more?: MoreButton[], about?: HTMLElement | null, note?: string,
 *   holdsCopy?: () => boolean, onForget?: (ok: boolean) => void, idPrefix?: string,
 * }} o
 *   name, tagline, icon (an image address), accent (a CSS colour for the glow; default the theme's accent): the app's own.
 *   auth: the Google button signs in with it (leave it out for a passcode-only screen); label: that button's words.
 *   fields: the app's own form (passcode, password), above the buttons. more: extra plain buttons below ("Try the demo").
 *   about: anything more under the tagline (a short list of what the app does). note: the small line at the bottom.
 *   holdsCopy: whether this phone keeps a signed-out copy (default: an app-sync owner is stored); onForget: told
 *   whether this device was forgotten. idPrefix: put before each id (two on one page, or ids the app already uses).
 * @returns {() => void} stop: unsubscribes and removes the screen
 */
export function signInScreen(host, {
  name, tagline = '', icon = '', accent = '', auth = null, label = 'Continue with Google',
  fields = null, more = [], about = null, note = '', holdsCopy = () => holdsSyncCopy(), onForget = () => {}, idPrefix = '',
}) {
  const id = (/** @type {string} */ s) => `${idPrefix}${s}`;
  const hero = el('div', { class: 'ui-signin-hero' });
  if (icon) hero.append(el('img', { class: 'ui-signin-icon', src: icon, alt: '', width: '96', height: '96' }));
  hero.append(el('h1', { class: 'ui-signin-name' }, name));
  if (tagline) hero.append(el('p', { class: 'ui-signin-tagline' }, tagline));
  if (about) hero.append(about);

  const actions = el('div', { class: 'ui-signin-actions' });
  if (fields) actions.append(fields);
  const error = el('p', { id: id('sign-in-error'), class: 'ui-error error', role: 'alert' });
  /** the reason shown, set only when it changes (an alert said again is read out again) @param {string} text */
  const tell = text => { if (error.textContent !== text) error.textContent = text; };
  if (auth) {
    const google = button('', async () => {
      error.textContent = '';
      try { tell(whyRefused(await auth.signIn())); } catch (e) { tell(whyFailed(e)); }
    }, { id: id('sign-in'), class: 'ui-signin-google' });
    google.innerHTML = GOOGLE;   // (a fixed, trusted mark; the words go in as text)
    google.append(el('span', {}, label));
    actions.append(google, error);
  }
  for (const m of more) actions.append(button(m.label, m.onTap, { class: 'ui-signin-more', ...(m.id ? { id: m.id } : {}) }));
  if (note) actions.append(el('p', { class: 'ui-signin-note' }, note));

  // this phone's copy: one quiet line, only while there is a copy to forget
  const said = el('p', { id: id('forget-msg'), class: 'ui-signin-note', role: 'status' });
  const forceButton = button('Forget anyway, losing the unsent changes', () => forget(true), { id: id('forget-force'), class: 'ui-danger danger' });
  forceButton.hidden = true;
  const device = el('p', { class: 'ui-signin-device' }, 'This phone keeps a copy for your next sign-in. ',
    button('Forget this device', () => forget(false), { id: id('forget'), class: 'ui-signin-forget' }));
  /** @param {boolean} force */
  const forget = async force => {
    if (!auth) return;
    said.textContent = '';
    const r = await auth.forget({ force });
    forceButton.hidden = r.ok || r.reason !== 'unsent';
    said.textContent = forgetWords(r);
    if (r.ok) device.hidden = true;
    onForget(r.ok);
  };
  const showDevice = () => { device.hidden = !auth || !holdsCopy(); };
  showDevice();
  actions.append(device, forceButton, said);

  const screen = el('div', { class: 'ui-signin' });
  if (accent) screen.style.setProperty('--ui-signin-glow', accent);
  screen.append(hero, actions);
  host.append(screen);

  const off = auth ? auth.onUser(user => {
    if (!user) {
      showDevice();   // (signed out just now: the copy kept is there to forget)
      // refused while away (an email link, a redirect, another tab): the same reason the button would give
      const r = auth.blocked?.();
      if (r) tell(whyRefused(r));
      return;
    }
    tell('');
    said.textContent = '';
    forceButton.hidden = true;
  }) : () => {};
  return () => { off(); screen.remove(); };
}
