import Link from 'next/link'
import { TrendingUp, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Zap className="h-5 w-5 text-primary" />
            <span>Fintech First</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Deal Feed
            </Link>
            <Link
              href="/trending"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Trending
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/preferences">
                <Button variant="ghost" size="sm">Preferences</Button>
              </Link>
              <form action="/auth/signout" method="post">
                <Button variant="outline" size="sm" type="submit">Sign out</Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
