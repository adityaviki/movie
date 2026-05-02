"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useCallback } from "react";

export function MovieFilters({ genres }: { genres: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/movies?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    router.push("/movies");
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search movies..."
        defaultValue={searchParams.get("search") ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateParams("search", e.currentTarget.value || null);
          }
        }}
        className="w-[180px]"
      />

      <Select
        value={searchParams.get("genre") ?? "all"}
        onValueChange={(v) => updateParams("genre", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Genre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Genres</SelectItem>
          {genres.map((genre) => (
            <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sortBy") ?? "createdAt"}
        onValueChange={(v) => updateParams("sortBy", v)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Date Added</SelectItem>
          <SelectItem value="title">Title</SelectItem>
          <SelectItem value="rating">Rating</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sortOrder") ?? "asc"}
        onValueChange={(v) => updateParams("sortOrder", v)}
      >
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="Order" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Descending</SelectItem>
          <SelectItem value="asc">Ascending</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("watchlist") ?? "all"}
        onValueChange={(v) => updateParams("watchlist", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Watchlist" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Movies</SelectItem>
          <SelectItem value="true">In Watchlist</SelectItem>
          <SelectItem value="false">Not in Watchlist</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("watched") ?? "all"}
        onValueChange={(v) => updateParams("watched", v)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Watched" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="true">Watched</SelectItem>
          <SelectItem value="false">Unwatched</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
