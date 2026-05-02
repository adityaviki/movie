import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { MoviesPage } from '@/pages/MoviesPage'
import { MovieDetailPage } from '@/pages/MovieDetailPage'
import { MovieNewPage } from '@/pages/MovieNewPage'
import { MovieEditPage } from '@/pages/MovieEditPage'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/movies" className="text-lg font-bold tracking-tight">Movies</a>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/movies" replace />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movies/new" element={<MovieNewPage />} />
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/movies/:id/edit" element={<MovieEditPage />} />
        </Routes>
      </main>
    </div>
  )
}
