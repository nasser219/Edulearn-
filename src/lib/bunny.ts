export const BUNNY = {
  libraryId: import.meta.env.VITE_BUNNY_LIBRARY_ID,
  apiKey: import.meta.env.VITE_BUNNY_STREAM_API_KEY,
  hostname: import.meta.env.VITE_BUNNY_PULL_ZONE_HOSTNAME,
  baseUrl: `https://video.bunnycdn.com/library/${import.meta.env.VITE_BUNNY_LIBRARY_ID}`,
};
