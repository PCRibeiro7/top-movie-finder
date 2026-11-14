import type { NextApiRequest, NextApiResponse } from 'next';
import omdbRequest from '../../src/server/ratings/omdb';
import {
    isMovieRatingLookup,
    movieRatingKey,
    RATING_BATCH_SIZE,
} from '../../src/shared/ratings';
import type {
    MovieRatingResponse,
    MovieRatingLookup,
    MovieRatingsBatchResponse,
} from '../../src/shared/ratingTypes';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        MovieRatingResponse | MovieRatingsBatchResponse | { error: string }
    >,
) {
    if (req.method === 'POST') {
        const contextual = req.body?.movies !== undefined;
        const movies: unknown = contextual ? req.body.movies : req.body?.movieNames;
        if (
            (contextual && req.body.movieNames !== undefined) ||
            !Array.isArray(movies) ||
            !movies.length ||
            movies.length > RATING_BATCH_SIZE ||
            movies.some((movie) =>
                contextual
                    ? !isMovieRatingLookup(movie)
                    : typeof movie !== 'string' || !movie.trim(),
            )
        ) {
            res.status(400).json({
                error: `Provide between 1 and ${RATING_BATCH_SIZE} ${contextual ? 'movies' : 'movie names'}`,
            });
            return;
        }
        const lookups = new Map<string, string | MovieRatingLookup>();
        for (const movie of movies as (string | MovieRatingLookup)[]) {
            lookups.set(
                contextual ? movieRatingKey(movie) : (movie as string),
                movie,
            );
        }
        const ratings = await Promise.all(
            [...lookups].map(async ([key, movie]) => {
                try {
                    return [key, await omdbRequest(movie)] as const;
                } catch {
                    // One provider failure must not discard the rest of a batch.
                    return [key, null] as const;
                }
            }),
        );
        res.status(200).json({ ratings: Object.fromEntries(ratings) });
        return;
    }
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (
        typeof req.query.movieName !== 'string' ||
        !req.query.movieName.trim()
    ) {
        res.status(400).json({ error: 'You must provide a movie name' });
        return;
    }
    try {
        res.status(200).json(await omdbRequest(req.query.movieName));
    } catch {
        res.status(502).json({ error: 'Rating provider unavailable' });
    }
}
