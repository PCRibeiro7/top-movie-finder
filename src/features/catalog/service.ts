import { fetchJson } from '../../shared/http';
import { parseMovies, type RatedMovie } from '../../shared/movies';
import {
    movieRatingKey,
    movieRatingResult,
    RATING_BATCH_SIZE,
} from '../../shared/ratings';
import { getMovieRating } from '../ratings/client';

export async function loadCatalog(cityId: string, signal: AbortSignal) {
    return parseMovies(
        await fetchJson(
            `/api/movies?${new URLSearchParams({ cityId })}`,
            signal,
        ),
    );
}

export type RatingResult = ReturnType<typeof movieRatingResult>;

export async function enrichCatalog(
    movies: RatedMovie[],
    signal: AbortSignal,
    onBatch: (ratings: Map<string, RatingResult>) => void,
) {
    const names = [
        ...new Set(
            movies.map((movie) =>
                movieRatingKey(movie.originalTitle || movie.title),
            ),
        ),
    ];
    for (let index = 0; index < names.length; index += RATING_BATCH_SIZE) {
        if (signal.aborted) return;
        const ratings = await Promise.all(
            names.slice(index, index + RATING_BATCH_SIZE).map(async (name) => {
                try {
                    return [
                        name,
                        movieRatingResult(await getMovieRating(name)),
                    ] as const;
                } catch {
                    return [name, movieRatingResult(null)] as const;
                }
            }),
        );
        if (signal.aborted) return;
        onBatch(new Map(ratings));
    }
}
