"use client";

import { Eye } from "lucide-react";
import { toggleWatched } from "@/lib/actions";
import { useTransition } from "react";

export function WatchedToggle({
  movieId,
  watched,
}: {
  movieId: string;
  watched: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => { await toggleWatched(movieId); });
      }}
      title={watched ? "Mark as unwatched" : "Mark as watched"}
      className="h-7 w-7 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-colors disabled:opacity-50"
    >
      <Eye
        className={`h-3.5 w-3.5 ${watched ? "fill-green-400 text-green-400" : ""}`}
      />
    </button>
  );
}
