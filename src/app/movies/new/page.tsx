import Link from "next/link";
import { MovieForm } from "@/components/movie-form";
import { ArrowLeft } from "lucide-react";

export default function NewMoviePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/movies"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Movies
      </Link>

      <MovieForm />
    </div>
  );
}
