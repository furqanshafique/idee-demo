// Where data/ and documents/ live relative to the page. The repo layout serves
// the app from app/ (default ".."); a flat hosted copy sets <meta name="devoreo-base" content=".">.
export const BASE = document.querySelector('meta[name="devoreo-base"]')?.content ?? '..';
export const fileUrl = path => `${BASE}/${path}`;
