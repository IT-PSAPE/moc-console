/** Calendar dates stay Gregorian in storage; convert only the displayed year. */
export function formatScheduledDate(value: string): string {
 if (!value) return ''
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Date must use YYYY-MM-DD')
 const [year,month,day]=value.split('-').map(Number)
 const parsed=new Date(`${value}T00:00:00Z`)
 if (year<1 || Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear()!==year || parsed.getUTCMonth()+1!==month || parsed.getUTCDate()!==day) throw new Error('Invalid calendar date')
 return `${String(year-1983).padStart(2,'0')}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`
}
