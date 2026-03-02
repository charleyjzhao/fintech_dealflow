'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SUBSECTORS, ROUND_STAGES, GEOGRAPHIES } from '@/lib/utils'
import type { UserPreferences } from '@/types/database'

interface PreferencesFormProps {
  userId: string
  initialPreferences: UserPreferences | null
}

function ToggleChip({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-input hover:bg-accent'
      }`}
    >
      {label.replace('-', ' ')}
    </button>
  )
}

export function PreferencesForm({ userId, initialPreferences }: PreferencesFormProps) {
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>(
    initialPreferences ?? {
      subsectors: [],
      stages: [],
      geographies: [],
      business_models: [],
      email_digest_enabled: false,
      digest_frequency: 'weekly',
    }
  )
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggle<T extends string>(key: keyof UserPreferences, value: T) {
    setPrefs((prev) => {
      const arr = (prev[key] as T[]) ?? []
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
    setSaved(false)
  }

  function handleSave() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('user_preferences').upsert(
        {
          user_id: userId,
          subsectors: prefs.subsectors ?? [],
          stages: prefs.stages ?? [],
          geographies: prefs.geographies ?? [],
          business_models: prefs.business_models ?? [],
          email_digest_enabled: prefs.email_digest_enabled ?? false,
          digest_frequency: prefs.digest_frequency ?? 'weekly',
          min_amount_usd: prefs.min_amount_usd ?? null,
          max_amount_usd: prefs.max_amount_usd ?? null,
        },
        { onConflict: 'user_id' }
      )
      setSaved(true)
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deal Feed Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-sm font-medium mb-2 block">Sectors</Label>
            <div className="flex flex-wrap gap-2">
              {SUBSECTORS.map((s) => (
                <ToggleChip
                  key={s}
                  label={s}
                  active={(prefs.subsectors ?? []).includes(s)}
                  onToggle={() => toggle('subsectors', s)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Stage</Label>
            <div className="flex flex-wrap gap-2">
              {ROUND_STAGES.map((s) => (
                <ToggleChip
                  key={s}
                  label={s}
                  active={(prefs.stages ?? []).includes(s)}
                  onToggle={() => toggle('stages', s)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Geography</Label>
            <div className="flex flex-wrap gap-2">
              {GEOGRAPHIES.map((g) => (
                <ToggleChip
                  key={g}
                  label={g}
                  active={(prefs.geographies ?? []).includes(g)}
                  onToggle={() => toggle('geographies', g)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Business Model</Label>
            <div className="flex flex-wrap gap-2">
              {(['B2B', 'B2C', 'B2B2C'] as const).map((m) => (
                <ToggleChip
                  key={m}
                  label={m}
                  active={(prefs.business_models ?? []).includes(m)}
                  onToggle={() => toggle('business_models', m)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Email Digest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="digest-enabled"
              checked={prefs.email_digest_enabled ?? false}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, email_digest_enabled: v }))
              }
            />
            <Label htmlFor="digest-enabled">Receive email digest of new deals</Label>
          </div>

          {prefs.email_digest_enabled && (
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((freq) => (
                <ToggleChip
                  key={freq}
                  label={freq}
                  active={prefs.digest_frequency === freq}
                  onToggle={() => setPrefs((p) => ({ ...p, digest_frequency: freq }))}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save preferences'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
      </div>
    </div>
  )
}
