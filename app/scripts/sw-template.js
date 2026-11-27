// The service worker's code, which scripts/sw.mjs writes into the built site as sw.js after the
// build's manifest: `self.__PLANETSHIFT__`, each file's SHA-256 under the build's version.
const { version, precache, runtime } = self.__PLANETSHIFT__;
const CACHE = `planetshift-${version}`;
const BASE = new URL('./', self.location.href);

const own = (files, path) => (Object.hasOwn(files, path) ? files[path] : undefined);
const hashOf = (path) => own(precache, path) ?? own(runtime, path);
const keyOf = (path) => new URL(`${path}?sha256=${encodeURIComponent(hashOf(path))}`, BASE).href;

const download = (path) =>
  fetch(new URL(path, BASE), { cache: 'no-cache', integrity: `sha256-${hashOf(path)}` });

const keep = async (cache, path) => {
  const kept = await caches.match(keyOf(path));
  await cache.put(keyOf(path), kept ?? (await download(path)));
};

const carry = async (cache, path) => {
  const kept = await caches.match(keyOf(path));
  if (kept) {
    await cache.put(keyOf(path), kept);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all([
          ...Object.keys(precache).map((path) => keep(cache, path)),
          ...Object.keys(runtime).map((path) => carry(cache, path)),
        ]),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('planetshift-') && name !== CACHE)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'skip-waiting') {
    void self.skipWaiting();
  }
  if (event.data?.type === 'claim' && event.data.version === version) {
    event.waitUntil(self.clients.claim());
  }
});

const cached = async (path) => (await caches.open(CACHE)).match(keyOf(path));

const fetchAndKeep = async (path) => {
  try {
    const response = await download(path);
    await (await caches.open(CACHE)).put(keyOf(path), response.clone());
    return response;
  } catch (error) {
    self.registration.update().catch(() => undefined);
    throw error;
  }
};

const file = async (path) => (await cached(path)) ?? fetchAndKeep(path);

const pageOf = (path) => {
  const page = path.replace(/index\.html$/, '');
  return page === '' || page.endsWith('/') ? page : `${page}/`;
};

const navigate = async (request, path) => {
  const page = pageOf(path);
  if (own(precache, page)) {
    return (await cached(page)) ?? fetch(request);
  }
  return fetch(request).catch(async () => (await cached('')) ?? Response.error());
};

const pathOf = (url) =>
  url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname)
    ? decodeURIComponent(url.pathname.slice(BASE.pathname.length))
    : null;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const path = request.method === 'GET' ? pathOf(new URL(request.url)) : null;
  if (path === null) {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(navigate(request, path));
  } else if (hashOf(path)) {
    event.respondWith(file(path));
  }
});
