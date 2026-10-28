// axe-core in the page: serious and critical problems only, as "rule: target" lines (empty = none).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const src = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
/** @param {{ within?: string, only?: string[] }} [opts]  a part of the page (a selector) and the rules to run, else all */
export default async function axe(page, { within, only } = {}) {
  // (evaluated, not a script tag; axe's own inline style is the tool's, not the page's, so its CSP reports are dropped;
  // no preload: it copies each @import-ed sheet into an inline <style>, whose late CSP reports would land on the page)
  // a sheet, dialog or toast fades in: axe reads the colours as they are blended mid-animation, so wait for the running
  // (finite) animations to end rather than measure a half-faded page
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))));
  const before = await page.evaluate(() => (window.__csp || []).length);
  await page.evaluate(src);
  const r = await page.evaluate(([w, o]) => window.axe.run(w || document, { resultTypes: ['violations'], preload: false, ...(o ? { runOnly: o } : {}) }), [within, only]);
  await new Promise(res => setTimeout(res, 100));   // (violation events arrive asynchronously)
  await page.evaluate(n => { if (window.__csp) window.__csp.length = n; }, before);
  return r.violations.filter(v => ['serious', 'critical'].includes(v.impact)).flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')}`));
}
