/* LCO Pagecraft visit statistics (Google Analytics 4).
   Nothing is sent until a measurement ID is set in index.html:  window.LCO_GA_ID = 'G-XXXXXXXXXX';
   Visitors who have "Do Not Track" switched on are not measured. */
(function () {
  var ID = (window.LCO_GA_ID || '').trim();
  if (!ID) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ID, { anonymize_ip: true });

  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
  document.head.appendChild(s);

  function ev(name, params) { try { gtag('event', name, params || {}); } catch (e) {} }

  /* what visitors click: samples, inquiry channels, intro buttons */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('a,button');
    if (!t) return;
    var href = t.getAttribute('href') || '';
    if (t.classList.contains('enter')) return ev('intro_enter');
    if (t.classList.contains('skip')) return ev('intro_skip');
    if (t.id === 'copy') return ev('copy_email');
    var m = href.match(/samples\/([a-z]+)\//);
    if (m) return ev('open_sample', { sample: m[1] });
    if (/kmong\.com/.test(href)) return ev('click_kmong');
    if (/forms\.gle|docs\.google\.com\/forms/.test(href)) return ev('click_inquiry_form');
    if (href === '#contact') return ev('click_contact_cta', { place: t.className || 'link' });
    if (href === '#samples') return ev('click_samples_cta');
  }, true);

  /* how far people read: which section came into view */
  if ('IntersectionObserver' in window) {
    var seen = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (x.isIntersecting && !seen[x.target.id]) { seen[x.target.id] = 1; ev('view_section', { section: x.target.id }); }
      });
    }, { threshold: 0.35 });
    ['how', 'samples', 'process', 'price', 'faq', 'contact'].forEach(function (id) {
      var el = document.getElementById(id); if (el) io.observe(el);
    });
  }

  /* hero video */
  var hv = document.getElementById('heroVideo');
  if (hv) hv.addEventListener('play', function once() { ev('hero_video_play'); hv.removeEventListener('play', once); });
})();
