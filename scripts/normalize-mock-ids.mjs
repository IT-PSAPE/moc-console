import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const mockPaths = {
  broadcasts: path.join(projectRoot, "src/data/mock/broadcasts.json"),
  bookings: path.join(projectRoot, "src/data/mock/bookings.json"),
  checklists: path.join(projectRoot, "src/data/mock/cue-sheet-checklists.json"),
  equipment: path.join(projectRoot, "src/data/mock/equipment.json"),
  events: path.join(projectRoot, "src/data/mock/cue-sheet-events.json"),
  media: path.join(projectRoot, "src/data/mock/media.json"),
  requestAssignees: path.join(projectRoot, "src/data/mock/request-assignees.json"),
  requests: path.join(projectRoot, "src/data/mock/requests.json"),
  tracks: path.join(projectRoot, "src/data/mock/cue-sheet-tracks.json"),
};

async function readJson(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildIdMap(ids) {
  return new Map(ids.map((id) => [id, randomUUID()]));
}

function remapId(id, map, label) {
  const nextId = map.get(id);

  if (!nextId) {
    throw new Error(`Missing ${label} mapping for id: ${id}`);
  }

  return nextId;
}

function remapChecklistItems(items, itemIdMap) {
  return items.map((item) => ({
    ...item,
    id: remapId(item.id, itemIdMap, "checklist item"),
  }));
}

function remapChecklistSections(sections, sectionIdMap, itemIdMap) {
  return sections.map((section) => ({
    ...section,
    id: remapId(section.id, sectionIdMap, "checklist section"),
    items: remapChecklistItems(section.items, itemIdMap),
  }));
}

function remapTracks(tracksByEventId, eventIdMap, trackIdMap, timelineCueIdMap) {
  return Object.fromEntries(
    Object.entries(tracksByEventId).map(([eventId, tracks]) => [
      remapId(eventId, eventIdMap, "cue-sheet event"),
      tracks.map((track) => ({
        ...track,
        id: remapId(track.id, trackIdMap, "timeline track"),
        cues: track.cues.map((cue) => ({
          ...cue,
          id: remapId(cue.id, timelineCueIdMap, "timeline cue"),
        })),
      })),
    ]),
  );
}

async function main() {
  const [
    broadcasts,
    bookings,
    checklists,
    equipment,
    events,
    media,
    requestAssignees,
    requests,
    tracksByEventId,
  ] = await Promise.all([
    readJson(mockPaths.broadcasts),
    readJson(mockPaths.bookings),
    readJson(mockPaths.checklists),
    readJson(mockPaths.equipment),
    readJson(mockPaths.events),
    readJson(mockPaths.media),
    readJson(mockPaths.requestAssignees),
    readJson(mockPaths.requests),
    readJson(mockPaths.tracks),
  ]);

  const equipmentIdMap = buildIdMap(equipment.map((item) => item.id));
  const bookingIdMap = buildIdMap(bookings.map((item) => item.id));
  const mediaIdMap = buildIdMap(media.map((item) => item.id));
  const playlistIdMap = buildIdMap(broadcasts.map((item) => item.id));
  const broadcastCueIdMap = buildIdMap(broadcasts.flatMap((item) => item.cues.map((cue) => cue.id)));
  const requestIdMap = buildIdMap(requests.map((item) => item.id));
  const eventIdMap = buildIdMap(events.map((item) => item.id));
  const checklistIdMap = buildIdMap(checklists.map((item) => item.id));
  const checklistSectionIdMap = buildIdMap(checklists.flatMap((item) => item.sections.map((section) => section.id)));
  const checklistItemIdMap = buildIdMap(
    checklists.flatMap((item) => [
      ...item.items.map((checklistItem) => checklistItem.id),
      ...item.sections.flatMap((section) => section.items.map((checklistItem) => checklistItem.id)),
    ]),
  );
  const trackIdMap = buildIdMap(
    Object.values(tracksByEventId).flatMap((tracks) => tracks.map((track) => track.id)),
  );
  const timelineCueIdMap = buildIdMap(
    Object.values(tracksByEventId).flatMap((tracks) => tracks.flatMap((track) => track.cues.map((cue) => cue.id))),
  );

  const nextEquipment = equipment.map((item) => ({
    ...item,
    id: remapId(item.id, equipmentIdMap, "equipment"),
  }));

  const nextBookings = bookings.map((item) => ({
    ...item,
    id: remapId(item.id, bookingIdMap, "booking"),
    equipmentId: remapId(item.equipmentId, equipmentIdMap, "equipment"),
  }));

  const nextMedia = media.map((item) => ({
    ...item,
    id: remapId(item.id, mediaIdMap, "media"),
  }));

  const nextBroadcasts = broadcasts.map((item) => ({
    ...item,
    id: remapId(item.id, playlistIdMap, "playlist"),
    cues: item.cues.map((cue) => ({
      ...cue,
      id: remapId(cue.id, broadcastCueIdMap, "broadcast cue"),
      mediaItemId: remapId(cue.mediaItemId, mediaIdMap, "media"),
    })),
  }));

  const nextRequests = requests.map((item) => ({
    ...item,
    id: remapId(item.id, requestIdMap, "request"),
  }));

  const nextRequestAssignees = requestAssignees.map((item) => ({
    ...item,
    requestId: remapId(item.requestId, requestIdMap, "request"),
  }));

  const nextEvents = events.map((item) => ({
    ...item,
    id: remapId(item.id, eventIdMap, "cue-sheet event"),
    ...(item.templateId ? { templateId: remapId(item.templateId, eventIdMap, "cue-sheet event") } : {}),
  }));

  const nextChecklists = checklists.map((item) => ({
    ...item,
    id: remapId(item.id, checklistIdMap, "checklist"),
    ...(item.templateId ? { templateId: remapId(item.templateId, checklistIdMap, "checklist") } : {}),
    items: remapChecklistItems(item.items, checklistItemIdMap),
    sections: remapChecklistSections(item.sections, checklistSectionIdMap, checklistItemIdMap),
  }));

  const nextTracks = remapTracks(tracksByEventId, eventIdMap, trackIdMap, timelineCueIdMap);

  await Promise.all([
    writeJson(mockPaths.equipment, nextEquipment),
    writeJson(mockPaths.bookings, nextBookings),
    writeJson(mockPaths.media, nextMedia),
    writeJson(mockPaths.broadcasts, nextBroadcasts),
    writeJson(mockPaths.requests, nextRequests),
    writeJson(mockPaths.requestAssignees, nextRequestAssignees),
    writeJson(mockPaths.events, nextEvents),
    writeJson(mockPaths.checklists, nextChecklists),
    writeJson(mockPaths.tracks, nextTracks),
  ]);

  console.log("Normalized mock ids to UUIDs.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
