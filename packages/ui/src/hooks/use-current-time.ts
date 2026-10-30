import { useEffect, useState } from 'react'

export function useCurrentTime(): Date {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        function updateTime(): void { setNow(new Date()) }
        const interval = window.setInterval(updateTime, 60_000)
        window.addEventListener('focus', updateTime)
        return () => {
            window.clearInterval(interval)
            window.removeEventListener('focus', updateTime)
        }
    }, [])
    return now
}
