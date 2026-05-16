// Public surface for the YouTube integration. Auth/token handling lives in
// youtube-auth.ts; API calls live in youtube-api.ts. Importers depend on this
// barrel so the split stays internal.
export { exchangeCodeForTokens, revokeToken } from "./youtube-auth"
export {
  youtubeApiFetch,
  uploadThumbnail,
  uploadThumbnailFromUrl,
  fetchVideoCategories,
  fetchChannelPlaylists,
  addVideoToPlaylist,
  updateVideoMetadata,
} from "./youtube-api"
