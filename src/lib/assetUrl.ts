/** Local Vite lacks Lovable's CDN proxy; deployed origins use the native asset path. */
export function assetUrl(url: string) {
  return window.location.hostname === 'localhost' && url.startsWith('/__l5e/assets-v1/') ? `https://kiduka.shop${url}` : url;
}
