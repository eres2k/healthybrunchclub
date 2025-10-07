/* Make all visible text appear lowercase via runtime CSS (no CSS files touched) */
(function () {
  try {
    var css = `
      html.force-lowercase,
      html.force-lowercase body,
      html.force-lowercase body *:not(script):not(style):not(noscript):not(.keep-case):not([data-keep-case]) {
        text-transform: lowercase !important;
      }

      /* don't force user-typed text; allow explicit opt-out */
      html.force-lowercase input,
      html.force-lowercase textarea,
      html.force-lowercase [contenteditable="true"],
      html.force-lowercase .keep-case,
      html.force-lowercase [data-keep-case] {
        text-transform: none !important;
      }

      /* placeholders also lowercase */
      html.force-lowercase ::placeholder {
        text-transform: lowercase !important;
      }
    `;

    var style = document.createElement('style');
    style.setAttribute('data-injected', 'force-lowercase');
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);

    document.documentElement.classList.add('force-lowercase');
  } catch (e) {
    console.error('force-lowercase error:', e);
  }
})();
