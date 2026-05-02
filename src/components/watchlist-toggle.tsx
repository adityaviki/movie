"use client";

import { Bookmark } from "lucide-react";
import { toggleWatchlist } from "@/lib/actions";
import { useTransition } from "react";

export function WatchlistToggle({
  movieId,
  inWatchlist,
}: {
  movieId: string;
  inWatchlist: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => { await toggleWatchlist(movieId); });
      }}
      title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      className="h-7 w-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-50"
    >
      <Bookmark
        className={`h-3.5 w-3.5 ${inWatchlist ? "fill-yellow-400 text-yellow-400" : ""}`}
      />
    </button>
  );
}
