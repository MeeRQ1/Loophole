import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/** Precache the complete static release, including the bundled offline word lists. */
export function offlinePlugin(): Plugin {
  return {
    name: "loophole-offline",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [
        "index.html",
        "manifest.webmanifest",
        "favicon.svg",
        "icon-192.png",
        "icon-512.png",
        ...Object.keys(bundle).filter(
          (path) => !path.endsWith(".map") && path !== "sw.js",
        ),
      ];
      const digest = createHash("sha256")
        .update(JSON.stringify(files))
        .update(readFileSync("index.html"));
      for (const entry of Object.values(bundle))
        digest.update(entry.type === "chunk" ? entry.code : entry.source);
      for (const file of files.filter(
        (file) => !bundle[file] && file !== "index.html",
      ))
        digest.update(readFileSync(`public/${file}`));
      const revision = digest.digest("hex").slice(0, 16);
      const source = `/* Generated from this release's asset manifest. */
const CACHE = 'loophole-${revision}';
const FILES = ${JSON.stringify([...new Set(files)])};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('loophole-') && key !== CACHE).slice(0, -1).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => { if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const request = event.request.mode === 'navigate' ? new URL('index.html', self.registration.scope).href : event.request;
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (event.request.mode !== 'navigate') {
      const previous = await caches.match(event.request, {ignoreVary: true});
      if (previous) return previous;
    }
    return fetch(event.request);
  }));
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}
