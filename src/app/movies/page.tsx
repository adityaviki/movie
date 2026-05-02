import { getMovies, getAllGenres } from "@/lib/actions";
import { MovieGrid } from "@/components/movie-grid";
import { MovieFilters } from "@/components/movie-filters";
import { Pagination } from "@/components/pagination";
import { FetchNewButton } from "@/components/fetch-new-button";
import type { MovieFilters as MovieFiltersType } from "@/types/movie";

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : 5;

  const filters: MovieFiltersType = {
    search: params.search || undefined,
    genre: params.genre || undefined,
    sortBy: (params.sortBy as MovieFiltersType["sortBy"]) || "createdAt",
    sortOrder: (params.sortOrder as MovieFiltersType["sortOrder"]) || "asc",
    inWatchlist:
      params.watchlist === "true"
        ? true
        : params.watchlist === "false"
          ? false
          : undefined,
    watched:
      params.watched === "true"
        ? true
        : params.watched === "false"
          ? false
          : undefined,
    page,
    pageSize,
  };

  const [result, genres] = await Promise.all([
    getMovies(filters),
    getAllGenres(),
  ]);

  const { movies, total } = result;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movies</h1>
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "No movies found"
              : `${start}–${end} of ${total.toLocaleString()}`}
          </p>
        </div>
        <FetchNewButton />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 px-4 py-3">
        <MovieFilters genres={genres} />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </div>

      <MovieGrid movies={movies} />
    </div>
  );
}
