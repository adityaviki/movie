import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  sleep,
  scrapeYear,
  transformPosterUrl,
} from "../src/lib/scraper.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 1980;

// CLI: pnpm tsx scripts/scrape-imdb.ts [--type video]
const typeFlag = process.argv.indexOf("--type");
const titleType = typeFlag !== -1 ? process.argv[typeFlag + 1] : undefined;

async function main() {
  const label = titleType ? `type=${titleType}` : "all types";
  console.log(
    `Scraping IMDB by year (${CURRENT_YEAR} → ${START_YEAR}), ${label}, 250 per request...`
  );

  let totalUpserted = 0;
  let yearsProcessed = 0;

  for (let year = CURRENT_YEAR; year >= START_YEAR; year--) {
    let movies;
    try {
      movies = await scrapeYear(year, titleType);
    } catch (err) {
      console.error(`Failed to fetch year ${year}:`, err);
      continue;
    }

    if (movies.length === 0) continue;

    let yearUpserted = 0;
    for (const movie of movies) {
      try {
        await prisma.movie.upsert({
          where: { imdbId: movie.imdbId },
          update: {
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
          create: {
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
        yearUpserted++;
      } catch (err) {
        console.error(
          `Failed to upsert ${movie.title} (${movie.imdbId}):`,
          err
        );
      }
    }

    totalUpserted += yearUpserted;
    yearsProcessed++;
    console.log(
      `${year}: ${yearUpserted} upserted (${movies.length} parsed) — total: ${totalUpserted}`
    );

    await sleep(1500);
  }

  if (totalUpserted === 0) {
    console.log(
      "\nNo movies scraped. IMDB may have changed their HTML structure."
    );
    console.log("Inserting sample movies instead...");
    await insertSampleMovies();
    return;
  }

  console.log(
    `\nDone! Upserted ${totalUpserted} movies across ${yearsProcessed} years.`
  );
  const total = await prisma.movie.count();
  console.log(`Total movies in database: ${total}`);
}

async function insertSampleMovies() {
  const sampleMovies = [
    {
      imdbId: "tt1375666",
      title: "Inception",
      year: 2010,
      type: "feature",
      rating: 8.8,
      votes: 2500000,
      genres: ["Action", "Adventure", "Sci-Fi"],
      runtime: "2h 28m",
      certificate: "PG-13",
      description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0111161",
      title: "The Shawshank Redemption",
      year: 1994,
      type: "feature",
      rating: 9.3,
      votes: 2800000,
      genres: ["Drama"],
      runtime: "2h 22m",
      certificate: "R",
      description: "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0468569",
      title: "The Dark Knight",
      year: 2008,
      type: "feature",
      rating: 9.0,
      votes: 2700000,
      genres: ["Action", "Crime", "Drama"],
      runtime: "2h 32m",
      certificate: "PG-13",
      description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0137523",
      title: "Fight Club",
      year: 1999,
      type: "feature",
      rating: 8.8,
      votes: 2200000,
      genres: ["Drama"],
      runtime: "2h 19m",
      certificate: "R",
      description: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0109830",
      title: "Forrest Gump",
      year: 1994,
      type: "feature",
      rating: 8.8,
      votes: 2100000,
      genres: ["Drama", "Romance"],
      runtime: "2h 22m",
      certificate: "PG-13",
      description: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BNDYwNzVjMTYtZmU5YS00YjQ5LTljYjgtMjY2NDVhYWYyNWFhXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0133093",
      title: "The Matrix",
      year: 1999,
      type: "feature",
      rating: 8.7,
      votes: 2000000,
      genres: ["Action", "Sci-Fi"],
      runtime: "2h 16m",
      certificate: "R",
      description: "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZDYxZjlhZjhkXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0080684",
      title: "Star Wars: Episode V - The Empire Strikes Back",
      year: 1980,
      type: "feature",
      rating: 8.7,
      votes: 1350000,
      genres: ["Action", "Adventure", "Fantasy"],
      runtime: "2h 4m",
      certificate: "PG",
      description: "After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMTkxNGFlNDktZmJkNC00MDdhLTg0MTEtZjZiYWI3MGE5NWIwXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0068646",
      title: "The Godfather",
      year: 1972,
      type: "feature",
      rating: 9.2,
      votes: 1950000,
      genres: ["Crime", "Drama"],
      runtime: "2h 55m",
      certificate: "R",
      description: "The aging patriarch of an organized crime dynasty in postwar New York City transfers control of his clandestine empire to his reluctant youngest son.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BYTJkNGQyZDgtZDQ0NC00MDM0LWEzZWQtYzUzZDEwMDljZWNjXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0167260",
      title: "The Lord of the Rings: The Return of the King",
      year: 2003,
      type: "feature",
      rating: 9.0,
      votes: 1900000,
      genres: ["Action", "Adventure", "Drama"],
      runtime: "3h 21m",
      certificate: "PG-13",
      description: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMTZkMjBjNWMtZGI5OC00MGU0LTk4ZTItODg2NWM3NTVmNWQ4XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0120737",
      title: "The Lord of the Rings: The Fellowship of the Ring",
      year: 2001,
      type: "feature",
      rating: 8.9,
      votes: 1900000,
      genres: ["Action", "Adventure", "Drama"],
      runtime: "2h 58m",
      certificate: "PG-13",
      description: "A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BNzIxMDQ2YTctNDY4MC00ZTRhLTk4ODQtMTVlOGY3NTVmNWQ4XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0110912",
      title: "Pulp Fiction",
      year: 1994,
      type: "feature",
      rating: 8.9,
      votes: 2100000,
      genres: ["Crime", "Drama"],
      runtime: "2h 34m",
      certificate: "R",
      description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0816692",
      title: "Interstellar",
      year: 2014,
      type: "feature",
      rating: 8.7,
      votes: 2000000,
      genres: ["Adventure", "Drama", "Sci-Fi"],
      runtime: "2h 49m",
      certificate: "PG-13",
      description: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0903747",
      title: "Breaking Bad",
      year: 2008,
      type: "tv_series",
      rating: 9.5,
      votes: 2100000,
      genres: ["Crime", "Drama", "Thriller"],
      runtime: "49m",
      certificate: "TV-MA",
      description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDQ1LWFjMjMtNjA5ZDdiYjdiODU5XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt0944947",
      title: "Game of Thrones",
      year: 2011,
      type: "tv_series",
      rating: 9.2,
      votes: 2200000,
      genres: ["Action", "Adventure", "Drama"],
      runtime: "57m",
      certificate: "TV-MA",
      description: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMTNhMDJmNmYtNDQ5OS00ODdlLWE0MzAtMGRhNjdkMjBhYWE4XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt4574334",
      title: "Stranger Things",
      year: 2016,
      type: "tv_series",
      rating: 8.7,
      votes: 1200000,
      genres: ["Drama", "Fantasy", "Horror"],
      runtime: "51m",
      certificate: "TV-14",
      description: "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt15398776",
      title: "Oppenheimer",
      year: 2023,
      type: "feature",
      rating: 8.3,
      votes: 850000,
      genres: ["Biography", "Drama", "History"],
      runtime: "3h",
      certificate: "R",
      description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZjAtZDQzYjg3YmM4NzExXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt1950186",
      title: "Ford v Ferrari",
      year: 2019,
      type: "feature",
      rating: 8.1,
      votes: 400000,
      genres: ["Action", "Biography", "Drama"],
      runtime: "2h 32m",
      certificate: "PG-13",
      description: "American automotive designer Carroll Shelby and fearless British race car driver Ken Miles battle corporate interference to build a revolutionary vehicle for Ford Motor Company.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BYzcwMjQ1M2MtMGE1ZS00NTg0LTlkMTAtODlhZmI2YjcyYjEzXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt6723592",
      title: "Tenet",
      year: 2020,
      type: "feature",
      rating: 7.3,
      votes: 600000,
      genres: ["Action", "Sci-Fi", "Thriller"],
      runtime: "2h 30m",
      certificate: "PG-13",
      description: "Armed with only one word, Tenet, and fighting for the survival of the entire world, a Protagonist journeys through a twilight world of international espionage on a mission that will unfold in something beyond real time.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BOTA3MmRmZDgtOWU0Ny00ZDlhLTg3YTMtNjE3NzY5NDI1NWE1XkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt1856101",
      title: "Blade Runner 2049",
      year: 2017,
      type: "feature",
      rating: 8.0,
      votes: 600000,
      genres: ["Action", "Drama", "Mystery"],
      runtime: "2h 44m",
      certificate: "R",
      description: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who's been missing for thirty years.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BNzA1Njg4NzYxOV5BMl5BanBnXkFtZTgwODk5NjU3MzI@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
    {
      imdbId: "tt2582802",
      title: "Whiplash",
      year: 2014,
      type: "feature",
      rating: 8.5,
      votes: 900000,
      genres: ["Drama", "Music"],
      runtime: "1h 46m",
      certificate: "R",
      description: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BOTA5NDZlZGUtMjAxOS00YTRhLThmZDUtZDkzYWYzMTkzNjkxXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
    },
  ];

  let count = 0;
  for (const movie of sampleMovies) {
    const posterUrl = transformPosterUrl(movie.posterUrl);
    await prisma.movie.upsert({
      where: { imdbId: movie.imdbId },
      update: {
        title: movie.title,
        year: movie.year,
        type: movie.type,
        rating: movie.rating,
        votes: movie.votes,
        genres: movie.genres,
        runtime: movie.runtime,
        certificate: movie.certificate,
        description: movie.description,
        posterUrl,
      },
      create: { ...movie, posterUrl },
    });
    count++;
    console.log(`  Upserted: ${movie.title} (${movie.year})`);
  }

  console.log(`\nDone! Inserted ${count} sample movies.`);
  const total = await prisma.movie.count();
  console.log(`Total movies in database: ${total}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
