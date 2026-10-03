// Fallback rich-message bodies for every templatable message type (the
// five "created" announcements, plus the two assignment DMs). Each
// announcement gets its own emoji + <h3> heading so it reads instantly in
// a busy ops group; notes go in a <blockquote>, the tracking code in a
// paragraph. Rendered through renderTemplate then toRichHtml (see
// telegram-rich.ts) before being sent. "🔗 Open …" lines are gone from
// the three entity announcements — the notification's inline keyboard
// carries an Open button instead; streams and meetings keep their link
// inline since they get no keyboard.

import type { MessageType } from "./template-tokens.js";

export const DEFAULT_TEMPLATES: Record<MessageType, string> = {
  "stream.created":
    "<h3>🔴 Live stream</h3>\n\n<b>{{title}}</b>\n🗓 Starts {{scheduledStartTime}}\n\n<blockquote>{{description}}</blockquote>\n\n🔗 <a href=\"{{streamUrl}}\">Watch the stream</a>",
  "meeting.created":
    "<h3>🎥 Zoom meeting</h3>\n\n<b>{{topic}}</b>\n🗓 Starts {{startTime}}\n\n<blockquote>{{description}}</blockquote>\n\n🔗 <a href=\"{{joinUrl}}\">Join the meeting</a>",
  "request.created":
    "<h3>📥 New request</h3>\n\n<b>{{title}}</b>\n🙋 From {{requesterName}}\n🗂️ Category: {{category}}\n🎯 Priority: {{priority}}\n📅 Due {{dueDate}}\n\n<blockquote>{{notes}}</blockquote>\n\n<p>{{trackingCode}}</p>",
  "booking.created":
    "<h3>🎒 Equipment booking</h3>\n\n<b>{{title}}</b>\n🙋 From {{requesterName}}\n🔢 Items: {{itemCount}}\n🔄 Status: <i>{{status}}</i>\n\n<blockquote>{{notes}}</blockquote>\n\n<p>{{trackingCode}}</p>",
  "venue_booking.created":
    "<h3>🏛️ Venue booking</h3>\n\n<b>{{title}}</b>\n🏛 Venue: {{venueName}}\n🎯 Event: {{eventName}}\n🗓 {{startsAt}} → {{endsAt}}\n🔁 Repeats: {{repeatPattern}}\n🔁 Occurrences: {{occurrenceCount}}\n🙋 From {{requesterName}}\n\n<blockquote>{{notes}}</blockquote>\n\n<p>{{trackingCode}}</p>",
  "assignment.request":
    "👋 Hey {{assigneeName}}!\nYou've been assigned to a request\n\n<b>{{title}}</b>\n🛠 Duty: {{duty}}\n\n🔗 <a href=\"{{linkUrl}}\">View full request details</a>",
  "assignment.checklist_item":
    "👋 Hey {{assigneeName}}!\nYou've been assigned to a checklist item\n\n<b>{{title}}</b>\n📋 Checklist: {{checklistName}}",
};
