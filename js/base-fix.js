/**
 * Auto <base> fix.
 *
 * Some static servers (e.g. Vercel `serve` with cleanUrls enabled) rewrite
 *   /foo/index.html -> 301 -> /foo/index -> 301 -> /foo
 * Once the browser lands on the no-trailing-slash form, every relative URL in
 * the page resolves one directory up, breaking CSS / JS / images.
 *
 * This shim runs *before* any <link>/<script> in the page. It detects the
 * unsafe URL shape (no trailing slash, no .html/.htm suffix) and injects a
 * <base href="<lastSegment>/"> so relative paths keep pointing at this
 * directory.
 *
 * No-op for file:// URLs and any URL that already ends with "/" or ".html",
 * so direct file access and well-formed URLs are unaffected.
 *
 * Must be loaded synchronously, NOT with `defer` or `async`, and as the very
 * first <script> in <head> so the injected <base> is in the DOM before the
 * preload scanner kicks in.
 */
(function () {
  var p = location.pathname;
  if (!p.endsWith("/") && !/\.html?$/i.test(p)) {
    document.write('<base href="' + p.split("/").pop() + '/">');
  }
})();
