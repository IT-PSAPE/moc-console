// The Telegram notification vocabulary, shared by the API app (which renders
// and sends messages) and MOC Console's settings UI (which previews and edits
// the templates). Deliberately free of Node, React and Supabase so both sides
// can import it — see templates-core.ts.
export * from './events.js'
export * from './templates-core.js'
