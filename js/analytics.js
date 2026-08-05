/**
 * Google Tag Manager
 * Container: GTM-T583DK7D
 *
 * GA4 (G-XSX8FN3QLS) is installed via the official gtag snippet in each page <head>
 * so Google’s “Test installation” can detect it. Do not also add GA4 for that ID
 * inside Tag Manager or visits will double-count.
 *
 * Pair with the GTM noscript iframe immediately after <body> on every page.
 */
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var f = d.getElementsByTagName(s)[0];
  var j = d.createElement(s);
  var dl = l !== 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-T583DK7D');
