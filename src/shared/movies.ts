import type { MovieRatingStatus } from './ratings';
import { isRecord, optionalArray, optionalString } from './validation';

export type Movie = {
    id: string;
    title: string;
    inPreSale?: boolean | null;
    originalTitle?: string | null;
    duration?: string | null;
    contentRating?: string | null;
    synopsis?: string | null;
    director?: string | null;
    cast?: string | null;
    siteURL?: string | null;
    premiereDate?: { localDate?: string | null } | null;
    images?: { url: string }[] | null;
    trailers?: { url: string }[] | null;
    genres?: string[] | null;
};

export type RatedMovie = Movie & {
    imdbRating?: string;
    ratingStatus?: MovieRatingStatus;
};

// Validate only consumed fields and return the original payload, including extras.
export function parseMovies(value: unknown): Movie[] {
    if (!Array.isArray(value)) throw new Error('Filmes indisponíveis.');
    for (const movie of value) {
        if (
            !isRecord(movie) ||
            typeof movie.id !== 'string' ||
            !movie.id.trim() ||
            typeof movie.title !== 'string' ||
            !movie.title.trim()
        ) {
            throw new Error('Filmes indisponíveis.');
        }
        for (const key of [
            'originalTitle',
            'duration',
            'contentRating',
            'synopsis',
            'director',
            'cast',
            'siteURL',
        ])
            optionalString(movie[key]);
        for (const genre of optionalArray(movie.genres)) {
            if (typeof genre !== 'string')
                throw new Error('Gêneros inválidos.');
        }
        if (movie.inPreSale != null && typeof movie.inPreSale !== 'boolean') {
            throw new Error('Pré-venda inválida.');
        }
        for (const key of ['images', 'trailers']) {
            for (const item of optionalArray(movie[key])) {
                if (!isRecord(item) || typeof item.url !== 'string') {
                    throw new Error('Mídia do filme inválida.');
                }
            }
        }
        if (movie.premiereDate != null) {
            if (!isRecord(movie.premiereDate))
                throw new Error('Data inválida.');
            optionalString(movie.premiereDate.localDate);
        }
    }
    return value as Movie[];
}
