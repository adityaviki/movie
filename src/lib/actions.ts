"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { MovieFilters, MovieFormData } from "@/types/movie";
import type { Prisma } from "@/generated/prisma/client";

export async function getMovies(filters: MovieFilters = {}) {
  const where: Prisma.MovieWhereInput = {};

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.genre) {
    where.genres = { has: filters.genre };
  }

  if (filters.minRating !== undefined || filters.maxRating !== undefined) {
    where.rating = {};
    if (filters.minRating !== undefined) where.rating.gte = filters.minRating;
    if (filters.maxRating !== undefined) where.rating.lte = filters.maxRating;
  }

  if (filters.year !== undefined) {
    where.year = filters.year;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.inWatchlist !== undefined) {
    where.inWatchlist = filters.inWatchlist;
  }

  if (filters.watched !== undefined) {
    where.watched = filters.watched;
  }

  const orderBy: Prisma.MovieOrderByWithRelationInput = {};
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";
  orderBy[sortBy] = sortOrder;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 5;
  const skip = (page - 1) * pageSize;

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.movie.count({ where }),
  ]);

  return { movies, total, page, pageSize };
}

export async function getMovie(id: string) {
  return prisma.movie.findUnique({ where: { id } });
}

export async function createMovie(data: MovieFormData) {
  const movie = await prisma.movie.create({
    data: {
      title: data.title,
      imdbId: data.imdbId || null,
      year: data.year || null,
      type: data.type || null,
      rating: data.rating || null,
      votes: data.votes || null,
      genres: data.genres,
      runtime: data.runtime || null,
      certificate: data.certificate || null,
      description: data.description || null,
      posterUrl: data.posterUrl || null,
      inWatchlist: data.inWatchlist || false,
      watched: data.watched || false,
    },
  });
  revalidatePath("/movies");
  return movie;
}

export async function updateMovie(id: string, data: MovieFormData) {
  const movie = await prisma.movie.update({
    where: { id },
    data: {
      title: data.title,
      imdbId: data.imdbId || null,
      year: data.year || null,
      type: data.type || null,
      rating: data.rating || null,
      votes: data.votes || null,
      genres: data.genres,
      runtime: data.runtime || null,
      certificate: data.certificate || null,
      description: data.description || null,
      posterUrl: data.posterUrl || null,
      inWatchlist: data.inWatchlist || false,
      watched: data.watched || false,
    },
  });
  revalidatePath("/movies");
  revalidatePath(`/movies/${id}`);
  return movie;
}

export async function deleteMovie(id: string) {
  await prisma.movie.delete({ where: { id } });
  revalidatePath("/movies");
}

export async function toggleWatchlist(id: string) {
  const movie = await prisma.movie.findUnique({ where: { id } });
  if (!movie) throw new Error("Movie not found");

  const updated = await prisma.movie.update({
    where: { id },
    data: { inWatchlist: !movie.inWatchlist },
  });
  revalidatePath("/movies");
  revalidatePath(`/movies/${id}`);
  return updated;
}

export async function toggleWatched(id: string) {
  const movie = await prisma.movie.findUnique({ where: { id } });
  if (!movie) throw new Error("Movie not found");

  const updated = await prisma.movie.update({
    where: { id },
    data: { watched: !movie.watched },
  });
  revalidatePath("/movies");
  revalidatePath(`/movies/${id}`);
  return updated;
}

export async function getAllGenres(): Promise<string[]> {
  const movies = await prisma.movie.findMany({
    select: { genres: true },
  });
  const genreSet = new Set<string>();
  movies.forEach((m) => m.genres.forEach((g) => genreSet.add(g)));
  return Array.from(genreSet).sort();
}
