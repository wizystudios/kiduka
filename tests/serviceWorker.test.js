import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker(fetch) {
  const handlers = {};
  const context = {
    fetch, URL, Response, AbortController, setTimeout, clearTimeout,
    console: { log() {}, error() {} },
    self: { location: { origin: 'https://kiduka.shop' }, addEventListener: (event, fn) => { handlers[event] = fn; } },
  };
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  return { handlers, context };
}

test('authorized responses are network-only, never served from worker cache', async () => {
  let calls = 0;
  const { handlers } = worker(async () => { calls++; return new Response('fresh'); });
  let response;
  handlers.fetch({ request: new Request('https://kiduka.shop/private', { headers: { authorization: 'Bearer test' } }), respondWith: p => { response = p; } });
  expect(await (await response).text()).toBe('fresh');
  expect(calls).toBe(1);
});

test('stalled navigation fetch aborts at its configured timeout', async () => {
  const { context } = worker((_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  await expect(context.fetchWithTimeout(new Request('https://kiduka.shop/servicehub'), 10)).rejects.toThrow('aborted');
});