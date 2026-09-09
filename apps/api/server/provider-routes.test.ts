import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { YOUTUBE_ROUTES } from "../api/youtube/v3/[...path].js"
import { ZOOM_ROUTES } from "../api/zoom/v2/[...path].js"
import { authorizeProviderRoute } from "./provider-route-policy.js"

// The shapes the console actually sends, checked against the real rule tables.
// Nested provider paths reach the function collapsed onto the single-segment
// proxy URL (see provider-proxy-path.ts in the console and the rewrites in
// vercel.json), so both forms have to authorize to the same upstream path.
const YOUTUBE_CALLS: Array<[string, string, string]> = [
  ["GET", "/api/youtube/v3/moc-records", "/moc-records"],
  ["GET", "/api/youtube/v3/videoCategories?part=snippet&regionCode=US", "/videoCategories?part=snippet&regionCode=US"],
  // Confirming the connection still authenticates as the recorded channel, which
  // is what authorizes deleting streams that vanished from YouTube.
  ["GET", "/api/youtube/v3/channels?part=id&mine=true", "/channels?part=id&mine=true"],
  ["GET", "/api/youtube/v3/playlists?part=snippet%2CcontentDetails&mine=true&maxResults=50", "/playlists?part=snippet%2CcontentDetails&mine=true&maxResults=50"],
  ["GET", "/api/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=upcoming&broadcastType=all&maxResults=50", "/liveBroadcasts?part=snippet&broadcastStatus=upcoming&broadcastType=all&maxResults=50"],
  // Reconciling tracked streams by id, the way the sync settles a finished one.
  ["GET", "/api/youtube/v3/liveBroadcasts?part=snippet%2Cstatus%2CcontentDetails&id=abc%2Cdef", "/liveBroadcasts?part=snippet%2Cstatus%2CcontentDetails&id=abc%2Cdef"],
  ["POST", "/api/youtube/v3/playlistItems?part=snippet", "/playlistItems?part=snippet"],
  ["PUT", "/api/youtube/v3/videos?part=snippet", "/videos?part=snippet"],
  // Nested, and therefore collapsed by the console before it is sent.
  ["POST", "/api/youtube/v3/_proxy?id=abc&part=id%2CcontentDetails&streamId=xyz&providerPath=liveBroadcasts%2Fbind", "/liveBroadcasts/bind?id=abc&part=id%2CcontentDetails&streamId=xyz"],
  ["POST", "/api/youtube/v3/_proxy?videoId=abc&uploadType=media&providerPath=thumbnails%2Fset", "/thumbnails/set?videoId=abc&uploadType=media"],
  // Verbatim shape from a stream bind in production, including the parameter a
  // rewrite adds when it re-matches the already-collapsed URL.
  ["POST", "/api/youtube/v3/_proxy?id=qBQph9gAhGo&part=id%2CcontentDetails&streamId=fOSLhHZ22W1xxca6TviXTg1785940728306294&providerPath=liveBroadcasts%2Fbind&rewrittenPath=_proxy", "/liveBroadcasts/bind?id=qBQph9gAhGo&part=id%2CcontentDetails&streamId=fOSLhHZ22W1xxca6TviXTg1785940728306294"],
]

const ZOOM_CALLS: Array<[string, string, string]> = [
  ["GET", "/api/zoom/v2/moc-records?id=00000000-0000-4000-8000-000000000001", "/moc-records?id=00000000-0000-4000-8000-000000000001"],
  // Every Zoom route is nested, so none of them arrive un-collapsed.
  ["GET", "/api/zoom/v2/_proxy?type=upcoming&page_size=30&providerPath=users%2Fme%2Fmeetings", "/users/me/meetings?type=upcoming&page_size=30"],
  ["POST", "/api/zoom/v2/_proxy?providerPath=users%2Fme%2Fmeetings", "/users/me/meetings"],
  // Confirming by id whether a meeting missing from the upcoming list still exists.
  ["GET", "/api/zoom/v2/_proxy?providerPath=meetings%2F123456", "/meetings/123456"],
  ["PATCH", "/api/zoom/v2/_proxy?providerPath=meetings%2F123456", "/meetings/123456"],
  ["DELETE", "/api/zoom/v2/_proxy?providerPath=meetings%2F123456", "/meetings/123456"],
]

describe("provider route tables", () => {
  it("authorizes every YouTube call the console makes", () => {
    for (const [method, url, expected] of YOUTUBE_CALLS) {
      const route = authorizeProviderRoute(method, url, "/api/youtube/v3", YOUTUBE_ROUTES)
      assert.equal(route.path, expected, `${method} ${url}`)
    }
  })

  it("authorizes every Zoom call the console makes", () => {
    for (const [method, url, expected] of ZOOM_CALLS) {
      const route = authorizeProviderRoute(method, url, "/api/zoom/v2", ZOOM_ROUTES)
      assert.equal(route.path, expected, `${method} ${url}`)
    }
  })

  it("routes thumbnail uploads to the upload host, collapsed or not", () => {
    // proxyYouTubeApiRequest picks the upload base URL off this prefix, so the
    // decoded path — not the proxy URL the request arrived on — has to carry it.
    for (const url of [
      "/api/youtube/v3/thumbnails/set?videoId=abc&uploadType=media",
      "/api/youtube/v3/_proxy?videoId=abc&uploadType=media&providerPath=thumbnails%2Fset",
    ]) {
      const route = authorizeProviderRoute("POST", url, "/api/youtube/v3", YOUTUBE_ROUTES)
      assert.ok(route.path.startsWith("/thumbnails/"), url)
    }
  })

  it("still refuses an operation no rule covers", () => {
    assert.throws(() =>
      authorizeProviderRoute("DELETE", "/api/youtube/v3/_proxy?providerPath=channels", "/api/youtube/v3", YOUTUBE_ROUTES))
    assert.throws(() =>
      authorizeProviderRoute("POST", "/api/zoom/v2/_proxy?providerPath=users%2Fme%2Ftoken", "/api/zoom/v2", ZOOM_ROUTES))
  })
})
