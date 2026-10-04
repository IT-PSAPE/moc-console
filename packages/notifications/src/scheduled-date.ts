/** Calendar dates stay Gregorian in storage; convert only the displayed year. */
export function formatScheduledDate(value: string): string {
 if (!value) return ''
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Date must use YYYY-MM-DD')
 const [year,month,day]=value.split('-').map(Number)
 const parsed=new Date(`${value}T00:00:00Z`)
 if (year<1 || Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear()!==year || parsed.getUTCMonth()+1!==month || parsed.getUTCDate()!==day) throw new Error('Invalid calendar date')
 return `${String(year-1983).padStart(2,'0')}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`
}

/** Display date and time always describe the occurrence's expiry in its timezone. */
export function scheduledLifecycleVariables(expiresAt: string | undefined, timezone: string): { date: string; time: string } {
 if (!expiresAt) return { date: '', time: '' }
 const instant = new Date(expiresAt)
 if (Number.isNaN(instant.getTime())) throw new Error('Invalid expiry timestamp')
 const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant)
 const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? ''
 return { date: formatScheduledDate(`${value('year')}-${value('month')}-${value('day')}`), time: `${value('hour')}:${value('minute')}` }
}
