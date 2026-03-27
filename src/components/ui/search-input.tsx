import type { ChangeEvent } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-quaternary" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border-primary bg-background-primary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-brand focus:ring-1 focus:ring-[--color-border-brand]/25"
      />
    </div>
  )
}
