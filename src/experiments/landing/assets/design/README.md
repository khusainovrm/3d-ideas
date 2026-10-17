# Assets from the supplied landing layouts

Decorative WebP assets were extracted from `../landing.pdf` (1440 × 5859).
The two additional speaker portraits came from the supplied `tablet.pdf`.
The title and Rostelecom logo are rendered from PDF vector outlines; ordinary
page text, controls and form fields remain HTML. Images were resized and encoded
as WebP with transparency to avoid loading the multi-megabyte PDF at runtime.

The three reference widths are 1440, 744 and 390 px. The page is capped at 1440 px.
The registration endpoint, game destination, complete speaker details and legal
documents were not supplied. Their UI states explicitly indicate pending content;
form submissions are not sent or persisted. Scene controls remain at `/landing#debug`.
