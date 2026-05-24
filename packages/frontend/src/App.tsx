import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { RequireAuth } from '@/components/require-auth'
import { MovieSearchBox } from '@/components/movie-filters'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { MoviesPage } from '@/pages/MoviesPage'

export default function App() {
  const location = useLocation()
  const showSearch = location.pathname === '/movies'
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 items-center gap-4">
          <Link to="/movies" className="justify-self-start text-lg font-bold tracking-tight">Movies</Link>
          <div className="justify-self-center w-full max-w-md">
            {showSearch && <MovieSearchBox />}
          </div>
          <div className="justify-self-end flex items-center gap-1">
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/movies" replace />} />
            <Route path="/movies" element={<MoviesPage />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}
