import { redirect } from 'next/navigation'

// Trending is now the homepage — redirect to keep old links working
export default function TrendingRedirect() {
  redirect('/')
}
