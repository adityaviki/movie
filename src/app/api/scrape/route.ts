import { prisma } from "@/lib/prisma";
import { scrapeYear, sleep } from "@/lib/scraper";

export const maxDuration = 300;

export async function POST() {
  const currentYear = new Date().getFullYear();

  // Determine start year: most recent movie year in DB, or current-1 if empty
  const mostRecent = await prisma.movie.findFirst({
    where: { year: { not: null } },
    orderBy: { year: "desc" },
    select: { year: true },
  });
  const startYear = mostRecent?.year ?? currentYear - 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let totalNew = 0;

      for (let year = currentYear; year >= startYear; year--) {
        let movies;
        try {
          movies = await scrapeYear(year);
        } catch {
          continue;
        }

        // Filter to only movies not already in the DB
        const imdbIds = movies.map((m) => m.imdbId);
        const existing = await prisma.movie.findMany({
          where: { imdbId: { in: imdbIds } },
          select: { imdbId: true },
        });
        const existingIds = new Set(existing.map((e) => e.imdbId));
        const newMovies = movies.filter((m) => !existingIds.has(m.imdbId));

        let yearNew = 0;

        for (const movie of newMovies) {
          try {
            await prisma.movie.create({
              data: {
                imdbId: movie.imdbId,
                title: movie.title,
                year: movie.year,
                type: movie.type,
                rating: movie.rating,
                votes: movie.votes,
                genres: movie.genres,
                runtime: movie.runtime,
                certificate: movie.certificate,
                description: movie.description,
                posterUrl: movie.posterUrl,
              },
            });
            yearNew++;
          } catch {
            // skip individual failures
          }
        }

        totalNew += yearNew;

        const progress = JSON.stringify({
          type: "progress",
          year,
          yearNew,
          yearParsed: movies.length,
          totalNew,
        });
        controller.enqueue(encoder.encode(progress + "\n"));

        if (year > startYear) {
          await sleep(1500);
        }
      }

      const done = JSON.stringify({ type: "done", totalNew });
      controller.enqueue(encoder.encode(done + "\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
