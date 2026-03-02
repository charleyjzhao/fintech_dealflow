import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fintech First - The buzz in one place',
  description:
    'Track fintech funding rounds and social buzz. See who raised money and who is generating excitement — bootstrapped companies, stealth fintechs, and hot new products.',
  openGraph: {
    title: 'Fintech First',
    description: 'Track fintech funding rounds and social buzz in one place.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  )
}
