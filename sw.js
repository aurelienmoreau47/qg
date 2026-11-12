// Réseau d'abord (pour recevoir les mises à jour), copie gardée en secours (pour marcher sans réseau).
// Changer CACHE à chaque nouvelle version publiée, et VERSION_APPLI au début d'app.js (même valeur).
// « qg-photos » (photos des repas, rangées par l'appli) et « qg-jow » (photos des recettes Jow) survivent aux mises à jour.
const CACHE = 'qg-10';
const GARDES = [CACHE, 'qg-photos', 'qg-jow'];
const FICHIERS = ['./', 'index.html', 'app.js', 'prepa.js', 'guide.js', 'manifest.webmanifest', 'icone.svg', 'icone-180.png', 'icone-192.png', 'icone-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !GARDES.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return; // l'envoi au Sheet ne passe jamais par le cache
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { // polices : copie gardée
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(x => { const c = x.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return x; })));
    return;
  }
  if (u.hostname === 'static.jow.fr') { // photos des recettes Jow : copie gardée, visibles sans réseau
    e.respondWith(caches.open('qg-jow').then(k => k.match(e.request).then(r => r || fetch(e.request).then(x => { if (x.ok || x.type === 'opaque') k.put(e.request, x.clone()); return x; }))));
    return;
  }
  if (u.origin !== location.origin) return;
  // « no-cache » : le téléphone redemande toujours au site si le fichier a changé (sinon il garde l'ancien jusqu'à 10 min).
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
