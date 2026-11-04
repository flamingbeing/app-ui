// The sign-in screen gallery: a made-up app ("Garden") on a fake auth. ?variant=passcode shows the passcode form,
// ?copy=1 says this phone holds a copy (Forget shows), ?fail=1 makes sign-in fail, ?refuse=unsent refuses it.
import { signInScreen } from '../../ui/index.js';
import { galleryPreview } from '../preview.js';

galleryPreview();
const q = new URLSearchParams(location.search);
const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @type {Set<(u: unknown) => void>} */
const subs = new Set();
let copy = q.get('copy') === '1';
/** @param {unknown} u */
const tellAll = u => { for (const f of subs) f(u); $('signed-out').hidden = !!u; $('signed-in').hidden = !u; };
/** @type {import('../../ui/types').AuthApi} */
const auth = {
  async signIn() {
    if (q.get('fail')) throw Object.assign(new Error('no'), { code: 'auth/network-request-failed' });
    const refuse = q.get('refuse');
    if (refuse) return { ok: false, reason: refuse, from: { email: 'someone@example.com' } };
    copy = true;
    tellAll({ uid: 'u1' });
    return { ok: true, reason: '' };
  },
  async forget() { copy = false; return { ok: true, reason: '' }; },
  onUser(cb) { subs.add(cb); cb(null); return () => subs.delete(cb); },
};

const passcode = q.get('variant') === 'passcode';
/** @type {HTMLElement | null} */
let fields = null;
if (passcode) {
  const form = document.createElement('form');
  form.id = 'passcode-form';
  const code = Object.assign(document.createElement('input'), { id: 'passcode', placeholder: 'Passcode you were given', autocomplete: 'off' });
  code.setAttribute('aria-label', 'Passcode');
  const go = Object.assign(document.createElement('button'), { type: 'submit', textContent: 'Continue' });
  form.append(code, go);
  form.addEventListener('submit', e => { e.preventDefault(); tellAll({ uid: 'p1' }); });
  fields = form;
}
signInScreen($('signed-out'), {
  name: 'Garden', tagline: 'What to plant, water and pick, week by week.', icon: '../../icons/icon.svg',
  accent: '#3f9b6a', auth: passcode ? null : auth, fields,
  more: passcode ? [{ label: 'Admin sign-in', onTap: () => {}, id: 'admin' }] : [{ label: 'Try the demo', onTap: () => tellAll({ uid: 'demo' }), id: 'demo' }],
  note: passcode ? '' : 'Private to you. Works offline once you’re in.',
  holdsCopy: () => copy,
});
