import { notFound } from "next/navigation";
import Link from "next/link";
import { getMovie } from "@/lib/actions";
import { MovieForm } from "@/components/movie-form";
import { ArrowLeft } from "lucide-react";

export default async function EditMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);

  if (!movie) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/movies/${movie.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Movie
      </Link>

      <MovieForm movie={movie} />
    </div>
  );
}
