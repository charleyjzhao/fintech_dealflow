import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from './PreferencesForm'
import { WatchlistSection } from './WatchlistSection'

export default async function PreferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [prefsRes, watchlistRes] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('watchlist')
      .select('*, companies (*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customize your deal feed and notifications
        </p>
      </div>

      <div className="space-y-8">
        <PreferencesForm
          userId={user.id}
          initialPreferences={prefsRes.data}
        />
        <WatchlistSection
          watchlist={watchlistRes.data ?? []}
        />
      </div>
    </div>
  )
}
