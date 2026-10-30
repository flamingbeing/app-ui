// Tab pages and their swipe (ui/tab-pages.js), plain tabs and bar buttons, and the phone's side-bar drawer, on the
// /kit/shell/ gallery with an emulated finger. The list of what is covered is docs/kit-tests.md, "Tab pages".
import AxeBuilder from './axe.mjs';
import { test, expect } from './fixtures.mjs';

const SHELL = '/ui/0.0.0-dev/kit/shell/?edge=always';

// a finger, through the DevTools protocol (Playwright's own touchscreen only taps)
async function finger(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  return {
    async drag(x0, y0, x1, y1, { steps = 10, ms = 16 } = {}) {
      await send('touchStart', x0, y0);
      for (let i = 1; i <= steps; i++) {
        await send('touchMove', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps);
        await page.waitForTimeout(ms);
      }
      await send('touchEnd', 0, 0);
    },
  };
}
const settled = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
const shown = page => page.evaluate(() => [...document.querySelectorAll('.ui-screens > .ui-screen')].filter(s => !s.hidden).map(s => s.id));
async function load(sized, query = '', width = 390) {
  const page = await sized(width);
  await page.goto(`${SHELL}${query}`);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  return page;
}
// the middle of the Jobs page's list (below it is the card deck, whose swipes are its own)
const listY = async page => { const b = await page.locator('#jobs .ui-list').boundingBox(); return b.y + b.height / 2; };

/** a sideways swipe across the middle of the page, from x0 to x1 */
async function swipe(page, x0, x1, y = 420) {
  await (await finger(page)).drag(x0, y, x1, y);
  await settled(page);
}

for (const look of ['a', 'b', 'c', 'd', 'e']) {
  test(`look ${look}: <button> tabs and bar buttons have no border or fill; bar buttons are link-coloured, New bold`, async ({ sized }) => {
    const page = await load(sized, `&look=${look}`);
    const tabs = await page.locator('nav.ui-tabbar button.ui-tab').evaluateAll(els => els.map(e => {
      const c = getComputedStyle(e);
      return { border: c.borderTopWidth, bg: c.backgroundColor, icon: !!e.querySelector('.ui-tab-icon') };
    }));
    expect(tabs).toHaveLength(5);
    // no border; no fill but the current tab's own (the look's --tab-active)
    const active = await page.evaluate(() => {
      const p = document.createElement('span');
      p.style.backgroundColor = 'var(--tab-active)';
      document.body.append(p);
      const c = getComputedStyle(p).backgroundColor;
      p.remove();
      return c;
    });
    for (const [i, t] of tabs.entries()) expect(t).toEqual({ border: '0px', bg: i === 0 ? active : 'rgba(0, 0, 0, 0)', icon: true });
    // the icon sits above the label
    const tab = page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Rooms' });
    const [icon, box] = await Promise.all([tab.locator('.ui-tab-icon').boundingBox(), tab.boundingBox()]);
    expect(icon.y + icon.height).toBeLessThan(box.y + box.height - 8);
    const bar = await page.locator('.ui-bar button:visible').evaluateAll(els => els.map(e => {
      const c = getComputedStyle(e);
      const probe = document.createElement('span');
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue(
        document.documentElement.dataset.header === 'band' ? '--on-band' : '--link');
      document.body.append(probe);
      const want = getComputedStyle(probe).color;
      probe.remove();
      return { text: e.textContent.trim(), border: c.borderTopWidth, bg: c.backgroundColor, colour: c.color === want, weight: c.fontWeight };
    }));
    for (const b of bar) {
      expect(b.border, b.text).toBe('0px');
      expect(b.bg, b.text).toBe('rgba(0, 0, 0, 0)');
      expect(b.colour, `${b.text}: the link colour (the band's text on a band)`).toBe(true);
    }
    expect(bar.find(b => b.text === 'New')?.weight).toBe('600');
    expect(await AxeBuilder(page)).toEqual([]);
  });
}

for (const [look, scheme] of [['a', 'light'], ['b', 'light'], ['c', 'dark'], ['b', 'dark']]) {
  test(`look ${look} ${scheme}: the centre action (New) is a raised 44 px accent circle, its label for screen readers only`, async ({ sized }) => {
    const page = await load(sized, `&look=${look}`);
    await page.emulateMedia({ colorScheme: scheme });
    const action = page.locator('nav.ui-tabbar .ui-tab-action');
    await expect(action).toHaveAccessibleName('New');
    const got = await action.evaluate(a => {
      const i = a.querySelector('.ui-tab-icon'), c = getComputedStyle(i), r = i.getBoundingClientRect();
      const probe = document.createElement('span');
      document.body.append(probe);
      const want = v => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
      const out = { w: r.width, h: r.height, radius: c.borderRadius, bg: c.backgroundColor === want('--accent'),
        fg: c.color === want('--on-accent'), label: getComputedStyle(a).fontSize, top: r.top,
        others: Math.min(...[...a.parentElement.querySelectorAll('.ui-tab:not(.ui-tab-action) .ui-tab-icon')].map(o => o.getBoundingClientRect().top)) };
      probe.remove();
      return out;
    });
    expect(got).toMatchObject({ w: 44, h: 44, radius: '50%', bg: true, fg: true, label: '0px' });
    expect(got.top, 'raised above the other icons').toBeLessThan(got.others);
    const box = await action.boundingBox();
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    expect(await AxeBuilder(page)).toEqual([]);
  });
}

test('tapping a tab shows its page, marks both bars and names the bar; New opens the sheet and is no page', async ({ sized }) => {
  const page = await load(sized);
  expect(await shown(page)).toEqual(['home']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Rooms' }).click();
  expect(await shown(page)).toEqual(['rooms']);
  await expect(page.locator('.ui-bar-title')).toHaveText('Rooms');
  await expect(page.locator('.ui-tab[aria-current="page"], .ui-side-link[aria-current="page"]')).toHaveText(['Rooms', /Rooms$/]);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'New' }).click();
  await expect(page.locator('#sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await shown(page)).toEqual(['rooms']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  expect(await shown(page)).toEqual(['home']);
  await expect(page.locator('.ui-bar-title')).toHaveText('Plants');
});

test('swipe: left goes to the next tab page (skipping the sheet tab), right comes back; the ends hold', async ({ sized }) => {
  const page = await load(sized);
  const events = page.evaluate(() => new Promise(r => { const got = []; addEventListener('ui-tab', e => { got.push(e.detail.page.id); if (got.length === 3) r(got); }); }));
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['rooms']);
  await swipe(page, 300, 60);
  expect(await shown(page), 'past New, which opens a sheet').toEqual(['jobs']);
  await expect(page.locator('#sheet')).toBeHidden();
  await swipe(page, 60, 300, await listY(page));   // on the list: lower down, the card deck takes the swipe
  expect(await shown(page)).toEqual(['rooms']);
  expect(await events).toEqual(['rooms', 'jobs', 'rooms']);
  await swipe(page, 60, 300);
  await swipe(page, 60, 300);
  expect(await shown(page), 'nothing before the first page').toEqual(['home']);
  // a short, slow move goes back to where it was; nothing is left moved
  await (await finger(page)).drag(250, 420, 200, 420, { steps: 10, ms: 40 });
  await settled(page);
  expect(await shown(page)).toEqual(['home']);
  expect(await page.locator('#home').evaluate(e => e.style.transform)).toBe('');
});

test('swipe: the page follows the finger, the next one beside it', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await send('touchStart', 300, 420);
  for (const x of [290, 270, 240, 200]) await send('touchMove', x, 420);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(40); await send('touchMove', 200 + (i % 2), 420); }   // held: no flick
  const at = await page.evaluate(() => ['home', 'rooms'].map(id => { const e = document.getElementById(id); return [!e.hidden, Math.round(e.getBoundingClientRect().x)]; }));
  expect(at[0][0]).toBe(true);
  expect(Math.abs(at[0][1] + 100)).toBeLessThanOrEqual(1);
  expect(at[1][0]).toBe(true);
  expect(Math.abs(at[1][1] - 290)).toBeLessThanOrEqual(1);
  await send('touchEnd', 0, 0);
  await settled(page);
  expect(await shown(page)).toEqual(['home']);
});

test('swipe: the page beside comes in level with the current one (its title too), in a plain-header look and in the band', async ({ sized }) => {
  for (const look of ['a', 'b']) {
    const page = await load(sized, `&look=${look}`);
    const cdp = await page.context().newCDPSession(page);
    const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await send('touchStart', 300, 420);
    for (const x of [290, 270, 240, 200]) await send('touchMove', x, 420);
    const tops = await page.evaluate(() => ['home-title', 'rooms-title'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().top)));
    expect(tops[1], `look ${look}: no jump as the page lands (a top margin let out of .ui-screens)`).toBe(tops[0]);
    await send('touchEnd', 0, 0);
    await settled(page);
  }
});

test('swipe: on a short page the space under its last row, down to the tab bar, still changes tab', async ({ sized }) => {
  const page = await load(sized);
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['rooms']);
  // just above the tab bar: below the page's own height (min-height 60vh) until the pages reach down to the bar
  const y = await page.evaluate(() => Math.round(document.querySelector('.ui-tabbar').getBoundingClientRect().top - 24));
  expect(y, 'the page is short: room under its rows').toBeGreaterThan(await page.evaluate(() => document.querySelector('#rooms .ui-row:last-child').getBoundingClientRect().bottom + 40));
  await swipe(page, 300, 60, y);
  expect(await shown(page)).toEqual(['jobs']);
});

// every frame's page positions and bar title from now on, until read @param {import('@playwright/test').Page} page
async function frames(page) {
  await page.evaluate(() => {
    window.__frames = [];
    const x = id => { const e = document.getElementById(id); return e.hidden ? null : Math.round(e.getBoundingClientRect().x); };
    const f = () => {
      const t = document.querySelector('.ui-bar-title');
      window.__frames.push({ home: x('home'), rooms: x('rooms'), title: t.textContent, show: Number(/opacity\(([\d.e-]+)\)/.exec(getComputedStyle(t).filter)?.[1] ?? 1) });
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  return async () => page.evaluate(() => window.__frames);
}

test('swipe: let go, the pages glide on at the finger’s speed and land without a jump; the bar title cross-fades', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const read = await frames(page);
  await send('touchStart', 300, 420);
  for (const x of [290, 270, 240, 200, 150, 120]) { await send('touchMove', x, 420); await page.waitForTimeout(16); }
  await send('touchEnd', 0, 0);
  await expect.poll(() => shown(page)).toEqual(['rooms']);
  await settled(page);
  await page.waitForTimeout(100);
  const all = await read();
  const moving = all.filter(f => f.home !== null && f.home < 0);
  expect(moving.length).toBeGreaterThan(8);
  for (const f of moving) expect(Math.abs(f.rooms - f.home - 390), 'side by side every frame').toBeLessThanOrEqual(1);
  for (let i = 1; i < moving.length; i++) expect(moving[i].home, 'only ever onward').toBeLessThanOrEqual(moving[i - 1].home);
  const glide = moving.slice(moving.findIndex(f => f.home < -180));
  expect(glide.length * 1000 / 60, 'a third of a second or so, not a crawl').toBeLessThan(500);
  const landed = all.findIndex(f => f.home === null);
  expect(Math.abs(all[landed - 1].rooms), 'lands where the glide ended: no jump').toBeLessThanOrEqual(2);
  for (const f of all.slice(landed)) expect(f.rooms).toBe(0);
  // the title: Plants fading out, Rooms fading in after halfway, never both at full
  expect(all.find(f => f.home !== null && f.home > -195 && f.home < -150)?.title).toBe('Plants');
  const later = all.find(f => f.home !== null && f.home < -250);
  expect(later?.title).toBe('Rooms');
  expect(later?.show).toBeGreaterThan(0);
  expect(later?.show).toBeLessThan(1);
  expect(all.at(-1)).toMatchObject({ title: 'Rooms', show: 1 });
});

test('swipe: the tab lights the moment the finger lets go, not when the pages land; a spring-back keeps it', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const lit = () => page.evaluate(() => [...document.querySelectorAll('nav.ui-tabbar [aria-current="page"]')].map(t => t.getAttribute('data-tab-page')));
  const homeX = () => page.locator('#home').evaluate(e => Math.round(e.getBoundingClientRect().x));
  await send('touchStart', 300, 420);
  for (const x of [290, 270, 240, 200, 150, 120]) { await send('touchMove', x, 420); await page.waitForTimeout(16); }
  await send('touchEnd', 0, 0);
  const [now, x] = [await lit(), await homeX()];
  expect(x, 'the pages still gliding').toBeGreaterThan(-385);
  expect(now).toEqual(['#rooms']);
  await settled(page);
  expect(await lit()).toEqual(['#rooms']);
  // let go short of half: the tab stays where it was
  await send('touchStart', 300, 420);
  for (const x of [290, 270, 240]) await send('touchMove', x, 420);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(40); await send('touchMove', 240 + (i % 2), 420); }
  await send('touchEnd', 0, 0);
  expect(await lit()).toEqual(['#rooms']);
  await settled(page);
  expect(await lit()).toEqual(['#rooms']);
});

test('swipe: let go short of half, the page springs back and keeps its title; at an end it stretches, less and less', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await page.evaluate(() => document.querySelector('.ui-bar').insertAdjacentHTML('beforeend', '<span id="fader" data-swipe-fade>x</span>'));
  const read = await frames(page);
  await send('touchStart', 300, 420);
  for (const x of [290, 270, 240, 200, 160]) await send('touchMove', x, 420);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(40); await send('touchMove', 160 + (i % 2), 420); }   // held
  expect(Number(await page.locator('#fader').evaluate(e => /opacity\(([\d.]+)/.exec(e.style.filter)?.[1]))).toBeLessThan(.4);
  await send('touchEnd', 0, 0);
  await settled(page);
  expect(await shown(page)).toEqual(['home']);
  const back = (await read()).filter(f => f.rooms !== null);
  expect(back.at(-1)?.home ?? 0).toBeGreaterThan(-3);
  expect(back.every(f => f.title === 'Plants')).toBe(true);
  expect(await page.locator('#fader').evaluate(e => e.style.filter)).toBe('');
  // nothing before the first page : the pull stretches and gives less the further it goes
  await page.goto(`${SHELL}`);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  const at = async x => { await send('touchMove', x, 420); return page.locator('#home').evaluate(e => Math.round(e.getBoundingClientRect().x)); };
  await send('touchStart', 80, 420);
  await at(95);
  const a = await at(180), b = await at(280), c = await at(380);
  expect(a).toBeGreaterThan(30);
  expect(a).toBeLessThan(100);
  expect(b - a).toBeLessThan(a);
  expect(c - b).toBeLessThan(b - a);
  await send('touchEnd', 0, 0);
  await settled(page);
  expect(await page.locator('#home').evaluate(e => [e.style.transform, Math.round(e.getBoundingClientRect().x)])).toEqual(['', 0]);
});

test('swipe does nothing: a vertical scroll, the back edge, a sideways scroller, a field, a pushed screen, swipe off', async ({ sized }) => {
  const page = await load(sized);
  // mostly vertical
  await (await finger(page)).drag(200, 600, 150, 300);
  await settled(page);
  // the page laid out beside at the touch is put away once the gesture settles (afterGesture: a timer after the lift)
  await expect.poll(() => shown(page)).toEqual(['home']);
  // from within 24 px of either edge (the browser's own Back may take it: a spare history entry keeps the page)
  const tabbed = page.evaluate(() => new Promise(r => { addEventListener('ui-tab', () => r(true)); setTimeout(() => r(false), 3000); }));
  await page.evaluate(() => history.pushState({}, ''));
  await swipe(page, 12, 300);
  await page.evaluate(() => history.pushState({}, ''));
  await swipe(page, 380, 100);
  expect(await tabbed, 'no tab change from the edges').toBe(false);
  expect(await shown(page)).toEqual(['home']);
  // in the Jobs page's chips (a sideways scroller) and in a field on Settings
  await page.goto(`${SHELL}&tab=jobs`);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  const chips = await page.locator('#job-chips').boundingBox();
  await swipe(page, 300, 60, chips.y + chips.height / 2);
  expect(await shown(page)).toEqual(['jobs']);
  expect(await page.locator('#job-chips').evaluate(e => e.scrollLeft), 'the chips scrolled instead (the pager’s pan-y stops above them)').toBeGreaterThan(0);
  await swipe(page, 300, 60, await listY(page));
  expect(await shown(page)).toEqual(['settings']);
  const field = await page.locator('#shelf-name').boundingBox();
  await swipe(page, field.x + field.width - 10, 40, field.y + field.height / 2);
  expect(await shown(page)).toEqual(['settings']);
  // on a pushed screen: the swipe is the screen's own (edge back), not a tab change
  await page.goto(SHELL);
  await expect.poll(() => page.evaluate(() => !!window.shell)).toBe(true);
  await page.locator('#plants .ui-row', { hasText: 'Basil' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await swipe(page, 300, 60);
  expect(await page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await expect(page.locator('.ui-pane-detail')).toBeVisible();
  // turned off by the app
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(0);
  await page.evaluate(() => { document.querySelector('nav.ui-tabbar').dataset.swipe = 'off'; });
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['home']);
});

test('swipe with Reduce Motion (Android’s Remove animations): the pages still follow the finger, the next one beside it', async ({ sized }) => {
  const page = await load(sized);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const xs = () => page.evaluate(() => ['home', 'rooms'].map(id => { const e = document.getElementById(id); return e.hidden ? null : Math.round(e.getBoundingClientRect().x); }));
  await send('touchStart', 300, 420);
  for (const x of [292, 280, 240]) await send('touchMove', x, 420);
  await expect.poll(xs, 'mid-swipe: both pages show, 60 px along').toEqual([-60, 330]);
  for (const x of [180, 100, 60]) await send('touchMove', x, 420);
  await send('touchEnd', 0, 0);
  await expect.poll(() => shown(page)).toEqual(['rooms']);
});

test('quick flicks one after another all count: each lands the next page, none is lost to the last one’s glide', async ({ sized }) => {
  const page = await load(sized);
  const f = await finger(page);
  for (let i = 0; i < 3; i++) {
    await f.drag(320, 420, 140, 420, { steps: 4, ms: 8 });
    await page.waitForTimeout(40);   // the next flick starts while this one still glides
  }
  await settled(page);
  expect(await shown(page)).toEqual(['settings']);
  await expect(page.locator('nav.ui-tabbar .ui-tab[aria-current="page"]')).toHaveText('Settings');
});

test('drawn ahead (opt-in): every other page is asked, nearest first, after a page lands; a caught glide asks its new neighbours at once', async ({ sized }) => {
  const page = await load(sized, '&ahead=1');
  const order = await page.evaluate(() => [...document.querySelectorAll('nav.ui-tabbar [data-tab-page]')].filter(t => !t.hidden).map(t => t.getAttribute('data-tab-page')?.slice(1)));
  await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).aheadAsked.length)).toBe(order.length - 1);
  expect(await page.evaluate(() => /** @type {any} */ (window).aheadAsked)).toEqual(order.slice(1));   // from the first: nearest first
  // without ?ahead nothing is asked (checked on the plain load below); after a swipe, the run starts again from there
  await page.evaluate(() => { /** @type {any} */ (window).aheadAsked.length = 0; });
  await swipe(page, 320, 80);
  expect(await shown(page)).toEqual([order[1]]);
  await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).aheadAsked.length)).toBe(order.length - 1);
  expect((await page.evaluate(() => /** @type {any} */ (window).aheadAsked)).slice(0, 2).sort()).toEqual([order[0], order[2]].sort());
  // quick flicks: each catches the last glide; the pages it brings in beside are asked as the finger lands
  await page.evaluate(() => { /** @type {any} */ (window).aheadAsked.length = 0; });
  const f = await finger(page);
  await f.drag(320, 420, 140, 420, { steps: 4, ms: 8 });
  await page.waitForTimeout(40);
  await f.drag(320, 420, 140, 420, { steps: 4, ms: 8 });
  await settled(page);
  expect(await page.evaluate(() => /** @type {any} */ (window).aheadAsked)).toContain(order[1]);   // left, then beside again at the catch
  const plain = await load(sized);
  await plain.waitForTimeout(800);
  expect(await plain.evaluate(() => /** @type {any} */ (window).aheadAsked.length)).toBe(0);
});

test('the card deck: shown from the start, a swipe on it goes a card and not a tab, not from the edge; the arrow keys go too', async ({ sized }) => {
  const page = await load(sized, '&tab=jobs');
  const deck = page.locator('#job-cards');
  await expect(deck, 'onShow told of the first card').toHaveAttribute('data-shown', '0');
  const box = await deck.boundingBox();
  const y = box.y + box.height / 2;
  await swipe(page, 300, 60, y);
  await expect(deck).toHaveAttribute('data-shown', '1');
  expect(await shown(page), 'the tab stayed').toEqual(['jobs']);
  await expect(deck.locator('.ui-card-slot:not([inert]) .ui-card-title')).toHaveText('Tip 2 of 5');
  // from within the edge (Android's Back): nothing moves
  await swipe(page, 380, 120, y);
  await expect(deck).toHaveAttribute('data-shown', '1');
  expect(await shown(page)).toEqual(['jobs']);
  await deck.focus();
  await page.keyboard.press('ArrowRight');
  await expect(deck).toHaveAttribute('data-shown', '2');
  await page.keyboard.press('ArrowLeft');
  await expect(deck).toHaveAttribute('data-shown', '1');
});

for (const width of [390, 1280]) {
  test(`the card deck with fill reaches down to the tab bar (${width} px): a short card no scroll of its own, a long one scrolls in its card`, async ({ sized }) => {
    const page = await load(sized, '&tab=jobs', width);
    const deck = page.locator('#job-cards');
    await expect(deck).toHaveClass(/ui-cards-fill/);
    const m = () => page.evaluate(() => {
      const d = /** @type {HTMLElement} */ (document.getElementById('job-cards')), b = d.getBoundingClientRect();
      const bar = document.querySelector('.ui-tabbar:not([hidden])'), pad = parseFloat(getComputedStyle(d).marginBottom);
      const slot = /** @type {HTMLElement} */ (d.querySelector('.ui-card-slot:not([inert])'));
      return { top: b.top, bottom: b.bottom, floor: bar && bar.getBoundingClientRect().height ? bar.getBoundingClientRect().top : innerHeight,
        pad, page: document.scrollingElement.scrollHeight - innerHeight, own: slot.scrollHeight - slot.clientHeight };
    });
    await expect.poll(async () => { const r = await m(); return Math.round(r.floor - r.pad - r.bottom); }, { message: 'its bottom one --pad above the tab bar (or the window)' }).toBeLessThanOrEqual(1);
    const r = await m();
    expect(r.floor - r.pad - r.bottom).toBeGreaterThanOrEqual(-1);
    expect(r.own, 'a short card has no scroll of its own').toBe(0);
    if (width >= 600) expect(r.page, 'the page itself does not scroll (the side bar fits in 100dvh)').toBeLessThanOrEqual(0);
    // a card taller than the stage keeps the stage's height and scrolls in its slot
    await page.evaluate(() => { const c = document.querySelector('#job-cards .ui-card-slot:not([inert]) .ui-card-text'); c.textContent = 'A long tip. '.repeat(400); });
    const long = await m();
    expect(long.bottom).toBeCloseTo(r.bottom, 0);
    expect(long.own).toBeGreaterThan(0);
  });
}

test('a finger caught on the gliding pages stops them under it; let go still, they land on the nearer page', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const at = () => page.evaluate(() => Math.round(document.getElementById('home').getBoundingClientRect().x));
  // a gentle drag let go past half: the pages glide on to Rooms
  await send('touchStart', 300, 420);
  for (let x = 290; x >= 100; x -= 10) { await send('touchMove', x, 420); await page.waitForTimeout(16); }
  await send('touchEnd', 0, 0);
  await page.waitForTimeout(50);
  await send('touchStart', 200, 420);
  const caught = await at();
  await page.waitForTimeout(150);
  expect(await at(), 'held where the finger caught it').toBe(caught);
  expect(caught).toBeLessThan(-150);
  expect(caught).toBeGreaterThan(-390);
  // dragged back with the finger, then let go still: back to Plants, or on to Rooms, whichever is nearer
  for (const x of [220, 260, 300, 340]) await send('touchMove', x, 420);
  await page.waitForTimeout(150);
  await send('touchEnd', 0, 0);
  await settled(page);
  expect(await shown(page)).toEqual([caught + 140 > -195 ? 'home' : 'rooms']);
  // a tap on gliding pages stops them and clicks nothing
  await (await finger(page)).drag(300, 420, 120, 420, { steps: 6, ms: 16 });
  await page.waitForTimeout(30);
  await page.touchscreen.tap(200, 300);
  await settled(page);
  expect((await shown(page)).length).toBe(1);
  expect(await page.evaluate(() => window.kit.screens.depth()), 'no row opened under the tap').toBe(0);
});

test('a right swipe on the first page never pulls the side bar out; its button opens it, a left swipe or a tap on the shade puts it back', async ({ sized }) => {
  const page = await load(sized);
  const cdp = await page.context().newCDPSession(page);
  const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const side = page.locator('nav.ui-sidebar'), menu = page.getByRole('button', { name: 'Sections' });
  const sideX = () => page.evaluate(() => Math.round(document.querySelector('nav.ui-sidebar').getBoundingClientRect().x));
  // a right swipe: the page stretches, no drawer; a left swipe straight after still changes page
  await send('touchStart', 60, 420);
  for (const x of [70, 90, 120, 160]) await send('touchMove', x, 420);
  expect(await page.evaluate(() => Math.round(document.getElementById('home').getBoundingClientRect().x)), 'the page stretches').toBeGreaterThan(0);
  await expect(page.locator('.ui-shell')).not.toHaveClass(/is-drawer-(open|moving)/);
  await send('touchEnd', 0, 0);
  await settled(page);
  await expect(side).toBeHidden();
  expect(await shown(page)).toEqual(['home']);
  await (await finger(page)).drag(300, 420, 80, 420, { steps: 8, ms: 16 });
  await settled(page);
  expect(await shown(page)).not.toEqual(['home']);
  await page.locator('nav.ui-tabbar .ui-tab').first().click();
  await settled(page);
  // the button opens it; pushed back by a left swipe on the shade, following the finger
  await menu.click();
  await settled(page);
  await expect(side).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await send('touchStart', 340, 420);
  for (const x of [330, 310, 290]) await send('touchMove', x, 420);
  expect(await sideX()).toBe(-50);
  for (const x of [240, 160, 100]) await send('touchMove', x, 420);
  await send('touchEnd', 0, 0);
  await settled(page);
  await expect(side).toBeHidden();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  // a tap on the shade closes it
  await menu.click();
  await settled(page);
  await page.touchscreen.tap(360, 300);
  await settled(page);
  await expect(side).toBeHidden();
  expect(await shown(page)).toEqual(['home']);
  // Reduce Motion: the button opens it at once
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await menu.click();
  await expect(side).toBeVisible();
  expect(await side.evaluate(e => e.getAnimations().length)).toBe(0);
});

test('a tapped tab slides its page in from its side; Reduce Motion or data-slide="off" just switches', async ({ sized }) => {
  const page = await load(sized);
  // the page's running slide: where it starts (px, signed) and how long it takes, or null
  const slide = id => page.evaluate(id => {
    const a = document.getElementById(id).getAnimations().find(x => x.playState === 'running');
    if (!a) return null;
    const k = /** @type {KeyframeEffect} */ (a.effect).getKeyframes()[0];
    return { from: Math.sign(new DOMMatrix(String(k.transform)).m41), ms: a.effect.getTiming().duration };
  }, id);
  const tap = name => page.locator('nav.ui-tabbar .ui-tab', { hasText: name }).click();
  await tap('Rooms');
  await expect.poll(() => slide('rooms')).toEqual({ from: 1, ms: 280 });   // Rooms sits to the right of Plants
  await expect(page.locator('.ui-screens')).toHaveClass(/is-sliding/);
  await expect(page.locator('.ui-screens')).not.toHaveClass(/is-sliding/);
  await tap('Plants');
  await expect.poll(() => slide('home')).toEqual({ from: -1, ms: 280 });
  await expect(page.locator('.ui-screens')).not.toHaveClass(/is-sliding/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tap('Rooms');
  await expect(page.locator('#rooms')).toBeVisible();
  expect(await slide('rooms')).toBeNull();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { document.querySelector('nav.ui-tabbar').dataset.slide = 'off'; });
  await tap('Plants');
  await expect(page.locator('#home')).toBeVisible();
  expect(await slide('home')).toBeNull();
});

test('a tab page keeps its scroll; tapping the current tab over a pushed screen goes back to it', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(() => scrollTo(0, 100));
  // (the scrolled tab bar is shrunk to its current tab; the others are still there to press)
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Rooms' }).dispatchEvent('click');
  await expect.poll(() => shown(page)).toEqual(['rooms']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(70);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(0);
  expect(await shown(page)).toEqual(['home']);
  // another tab from a pushed screen: back first, then the page
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Jobs' }).click();
  await expect.poll(() => shown(page)).toEqual(['jobs']);
  expect(await page.evaluate(() => [window.kit.screens.depth(), history.state?.uiScreens ?? 0])).toEqual([0, 0]);
});

test('Back with tabs, as Android apps: tab changes add one entry at most; Back on another tab goes to the first, then asks, then leaves', async ({ sized }) => {
  const page = await load(sized);
  const tab = name => page.locator('nav.ui-tabbar .ui-tab', { hasText: name }).dispatchEvent('click');
  const len = () => page.evaluate(() => history.length);
  const start = await len();
  await tab('Rooms');
  await expect.poll(() => shown(page)).toEqual(['rooms']);
  await tab('Jobs');
  await expect.poll(() => shown(page)).toEqual(['jobs']);
  expect(await len(), 'one entry for leaving the first tab, none between the others').toBe(start + 1);
  await page.goBack();
  await expect.poll(() => shown(page)).toEqual(['home']);
  // a tap on the first tab takes the entry away too
  await tab('Rooms');
  await expect.poll(() => page.evaluate(() => !!history.state?.uiTabBack)).toBe(true);
  await tab('Plants');
  await expect.poll(() => page.evaluate(() => !!history.state?.uiTabBack)).toBe(false);
  expect(await shown(page)).toEqual(['home']);
  // and Back on the first tab asks first (Press Back again to close, back-close.spec), then leaves the page
  const url = page.url();
  await page.goBack();
  await expect(page.locator('.toasts .toast', { hasText: 'Press Back again to close' })).toHaveCount(1);
  await page.goBack();
  await expect.poll(() => page.url()).not.toBe(url);
});

test('a tab change never flashes the bar\'s tinted (collapsed) state: between two scrolled pages it stays; to a page at the top it just clears', async ({ sized }) => {
  const page = await load(sized);
  const bar = page.locator('.ui-bar');
  const tab = name => page.locator('nav.ui-tabbar .ui-tab', { hasText: name }).dispatchEvent('click');
  await page.evaluate(() => { document.body.style.minHeight = '4000px'; scrollTo(0, 300); });
  await tab('Rooms');
  await expect.poll(() => shown(page)).toEqual(['rooms']);
  await settled(page);
  await page.evaluate(() => scrollTo(0, 300));
  await expect(bar).toHaveClass(/is-collapsed/);
  // every state the bar takes on each class change (repeats dropped)
  await page.evaluate(() => {
    const b = document.querySelector('.ui-bar'), log = window.barLog = [];
    const note = () => { const c = b.classList.contains('is-collapsed'); if (log[log.length - 1] !== c) log.push(c); };
    note();
    new MutationObserver(note).observe(b, { attributes: true, attributeFilter: ['class'] });
  });
  const states = async () => { await settled(page); await page.waitForTimeout(150); return page.evaluate(() => window.barLog.splice(0, window.barLog.length - 1).concat(window.barLog)); };
  await tab('Plants');   // scrolled too: tinted all the way
  expect(await states()).toEqual([true]);
  await tab('Jobs');     // at the top: clears once
  expect(await states()).toEqual([true, false]);
});

test('a tab left from a pushed screen comes back at its own scroll, not the pushed screen\'s', async ({ sized }) => {
  const page = await load(sized);
  await page.evaluate(() => scrollTo(0, 100));
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => window.kit.screens.depth())).toBe(1);
  await page.evaluate(() => { document.body.style.minHeight = '4000px'; scrollTo(0, 900); });
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Jobs' }).dispatchEvent('click');
  await expect.poll(() => shown(page)).toEqual(['jobs']);
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).dispatchEvent('click');
  await expect.poll(() => shown(page)).toEqual(['home']);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(70);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(400);
});

test('the side-bar button opens the side bar as a drawer on a phone; a link goes there and closes it, Esc closes', async ({ sized }) => {
  const page = await load(sized, '&look=d');
  const menu = page.getByRole('button', { name: 'Sections' });
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  await menu.click();
  await expect(page.locator('nav.ui-sidebar')).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  expect(await AxeBuilder(page), 'axe with the drawer open').toEqual([]);
  await page.locator('.ui-side-link', { hasText: 'Jobs' }).click();
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  expect(await shown(page)).toEqual(['jobs']);
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('nav.ui-sidebar')).toBeHidden();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  // the Back button takes its place on a pushed screen
  await page.locator('nav.ui-tabbar .ui-tab', { hasText: 'Plants' }).click();
  await page.locator('#plants .ui-row', { hasText: 'Fern' }).click();
  await expect(menu).toBeHidden();
});

test('at 820 px the tab pages are the side bar\'s: a page takes both panes; no swipe', async ({ sized }) => {
  const page = await load(sized, '', 820);
  await page.locator('.ui-side-link', { hasText: 'Rooms' }).click();
  await expect(page.locator('#rooms')).toBeVisible();
  await expect(page.locator('.ui-pane-list')).toBeHidden();
  const [side, rooms] = await Promise.all([page.locator('.ui-sidebar').boundingBox(), page.locator('#rooms').boundingBox()]);
  expect(rooms.x).toBeGreaterThanOrEqual(side.x + side.width - 1);
  expect(rooms.x + rooms.width).toBeGreaterThan(780);
  await swipe(page, 600, 300);
  await expect(page.locator('#rooms')).toBeVisible();
  await page.locator('.ui-side-link', { hasText: 'Plants' }).click();
  await expect(page.locator('.ui-pane-list')).toBeVisible();
  await expect(page.locator('.ui-pane-detail')).toBeVisible();
  expect(await AxeBuilder(page)).toEqual([]);
});

test('swipe: a start within 28 px of an edge (390 px) does nothing, that is Android’s Back; outside it works', async ({ sized }) => {
  const page = await load(sized);
  await swipe(page, 26, 300 + 26);
  await swipe(page, 390 - 26, 60);
  expect(await shown(page)).toEqual(['home']);
  await swipe(page, 300, 60);
  expect(await shown(page)).toEqual(['rooms']);
});

test('swipe: right on the first page fires onPrevMissing once; a short move does not; not on a later page', async ({ sized }) => {
  const page = await load(sized);
  const fired = () => page.evaluate(() => document.documentElement.dataset.prevMissing || '0');
  await (await finger(page)).drag(200, 420, 230, 420, { steps: 10, ms: 40 });
  await settled(page);
  expect(await fired(), 'too short').toBe('0');
  await swipe(page, 60, 300);
  expect(await shown(page)).toEqual(['home']);
  expect(await fired()).toBe('1');
  await swipe(page, 300, 60);
  await swipe(page, 60, 300);
  expect(await fired(), 'coming back from page 2 is a page change').toBe('1');
});

test('zoom and overscroll are off on the page', async ({ sized }) => {
  const page = await load(sized);
  expect(await page.evaluate(() => ['documentElement', 'body'].map(k => {
    const c = getComputedStyle(document[k]);
    return [c.touchAction, c.overscrollBehaviorY, c.overscrollBehaviorX];
  }))).toEqual([['pan-x pan-y', 'none', 'none'], ['pan-x pan-y', 'none', 'none']]);
});
