import { escapeHtml } from './template-tokens.js'

const DATE_TOKEN = /^date:(\d{4}-\d{2}-\d{2})$/
const TIME_TOKEN = /^time:(\d{2}:\d{2})$/
const TOKEN = /\{\{([^{}]*)\}\}/g
const TOKEN_START = /\{\{/g
const TOKEN_END = /\}\}/g

function isInsideHtmlTag(body: string, position: number): boolean {
    let insideTag = false
    let quote: '"' | "'" | null = null
    for (let index = 0; index < position; index += 1) {
        const character = body[index]
        if (!insideTag && character === '<') insideTag = true
        else if (insideTag && quote && character === quote) quote = null
        else if (insideTag && !quote && (character === '"' || character === "'")) quote = character
        else if (insideTag && !quote && character === '>') insideTag = false
    }
    return insideTag
}

function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(`${value}T00:00:00.000Z`)
    return year >= 1 && !Number.isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

function formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number)
    return `${String(year - 1983).padStart(2, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

/** Validate explicit content values without consulting a schedule or expiry. */
export function validateScheduledContentTokens(body: string): void {
    let tokenCount = 0
    for (const match of body.matchAll(TOKEN)) {
        tokenCount += 1
        if (isInsideHtmlTag(body, match.index)) throw new Error('Date and time values must appear in message text, not HTML attributes')
        const value = match[1]
        const date = DATE_TOKEN.exec(value)
        if (date && isCalendarDate(date[1])) continue
        if (TIME_TOKEN.test(value) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.slice(5))) continue
        throw new Error('Use explicit date and time values, such as {{date:2026-10-04}} or {{time:07:30}}')
    }
    const withoutTokens = body.replace(TOKEN, '')
    if (withoutTokens.match(TOKEN_START)?.length || withoutTokens.match(TOKEN_END)?.length) {
        throw new Error('Invalid message token')
    }
    if (tokenCount === 0 && /\{\{[^{}]*\}\}/.test(body)) throw new Error('Invalid message token')
}

/** Replace only validated, fixed-content values and escape each inserted value. */
export function renderScheduledContentTokens(body: string): string {
    validateScheduledContentTokens(body)
    return body.replace(TOKEN, (_token, value: string) => {
        const date = DATE_TOKEN.exec(value)
        const rendered = date ? formatDate(date[1]) : value.slice(5)
        return escapeHtml(rendered)
    })
}
