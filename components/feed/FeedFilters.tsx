'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUBSECTORS, ROUND_STAGES, GEOGRAPHIES } from '@/lib/utils'

interface Filters {
  subsectors?: string   // comma-separated
  stages?: string       // comma-separated
  geographies?: string  // comma-separated
  minAmount?: string
}

const AMOUNT_OPTIONS = [
  { label: 'Any amount', value: '' },
  { label: '$1M+',       value: '1000000' },
  { label: '$5M+',       value: '5000000' },
  { label: '$10M+',      value: '10000000' },
  { label: '$25M+',      value: '25000000' },
  { label: '$50M+',      value: '50000000' },
  { label: '$100M+',     value: '100000000' },
]

// ─── Multi-select dropdown ────────────────────────────────────────────────────

interface MultiSelectProps {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
  onSetAll: (values: string[]) => void
  formatOption?: (v: string) => string
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  onSetAll,
  formatOption = (v) => v,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))

  const triggerLabel =
    selected.length === 0
      ? label
      : selected.length === 1
      ? formatOption(selected[0])
      : `${label} (${selected.length})`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center justify-between gap-1.5 rounded-md border px-3 py-2 text-sm bg-white shadow-sm hover:bg-gray-50 transition-colors min-w-[130px] ${
          selected.length > 0
            ? 'border-primary text-primary font-medium'
            : 'border-input text-foreground'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden">
          {/* Select all / Clear all */}
          <button
            type="button"
            onClick={() => onSetAll(allSelected ? [] : [...options])}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-blue-50 border-b border-gray-100 transition-colors"
          >
            <span className="h-4 w-4 flex items-center justify-center rounded border-2 border-primary bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">
              {allSelected ? '✓' : ''}
            </span>
            {allSelected ? 'Clear all' : 'Select all'}
          </button>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const checked = selected.includes(option)
              return (
                <label
                  key={option}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option)}
                    className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                  />
                  <span className="text-sm capitalize">{formatOption(option)}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function parseList(val?: string): string[] {
  return val ? val.split(',').filter(Boolean) : []
}

export function FeedFilters({ currentFilters }: { currentFilters: Filters }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedSubsectors = parseList(currentFilters.subsectors)
  const selectedStages     = parseList(currentFilters.stages)
  const selectedGeos       = parseList(currentFilters.geographies)

  const setParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (values.length > 0) {
        params.set(key, values.join(','))
      } else {
        params.delete(key)
      }
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams]
  )

  function toggleSubsector(v: string) {
    const next = selectedSubsectors.includes(v)
      ? selectedSubsectors.filter((s) => s !== v)
      : [...selectedSubsectors, v]
    setParam('subsectors', next)
  }

  function toggleStage(v: string) {
    const next = selectedStages.includes(v)
      ? selectedStages.filter((s) => s !== v)
      : [...selectedStages, v]
    setParam('stages', next)
  }

  function toggleGeo(v: string) {
    const next = selectedGeos.includes(v)
      ? selectedGeos.filter((s) => s !== v)
      : [...selectedGeos, v]
    setParam('geographies', next)
  }

  function setAmount(v: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (v && v !== 'any') {
      params.set('minAmount', v)
    } else {
      params.delete('minAmount')
    }
    router.push(`/?${params.toString()}`)
  }

  function clearAll() {
    router.push('/')
  }

  const hasFilters =
    selectedSubsectors.length > 0 ||
    selectedStages.length > 0 ||
    selectedGeos.length > 0 ||
    !!currentFilters.minAmount

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <MultiSelectDropdown
          label="Sector"
          options={SUBSECTORS}
          selected={selectedSubsectors}
          onToggle={toggleSubsector}
          onSetAll={(values) => setParam('subsectors', values)}
          formatOption={(v) => v.replace(/-/g, ' ')}
        />

        <MultiSelectDropdown
          label="Stage"
          options={ROUND_STAGES}
          selected={selectedStages}
          onToggle={toggleStage}
          onSetAll={(values) => setParam('stages', values)}
        />

        <MultiSelectDropdown
          label="Region"
          options={GEOGRAPHIES}
          selected={selectedGeos}
          onToggle={toggleGeo}
          onSetAll={(values) => setParam('geographies', values)}
        />

        {/* Amount stays single-select — it's a threshold, not a list */}
        <Select
          value={currentFilters.minAmount ?? ''}
          onValueChange={setAmount}
        >
          <SelectTrigger className="w-[130px] h-9 text-sm bg-white">
            <SelectValue placeholder="Min Amount" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {AMOUNT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value || 'any'}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips — always rendered so its height never causes layout shift */}
      <div className="flex flex-wrap gap-1.5 min-h-[1.75rem] items-center">
        {selectedSubsectors.map((s) => (
            <Badge key={s} variant="secondary" className="capitalize gap-1">
              {s.replace(/-/g, ' ')}
              <button onClick={() => toggleSubsector(s)} className="ml-1 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedStages.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              {s}
              <button onClick={() => toggleStage(s)} className="ml-1 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedGeos.map((g) => (
            <Badge key={g} variant="secondary" className="gap-1">
              {g}
              <button onClick={() => toggleGeo(g)} className="ml-1 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {currentFilters.minAmount && (
            <Badge variant="secondary" className="gap-1">
              ${(parseInt(currentFilters.minAmount) / 1_000_000).toFixed(0)}M+
              <button onClick={() => setAmount('')} className="ml-1 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
      </div>
    </div>
  )
}
