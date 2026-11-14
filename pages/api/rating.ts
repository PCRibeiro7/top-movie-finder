import type { NextApiRequest, NextApiResponse } from 'next';
import omdbRequest from '../../src/server/ratings/omdb';
import { RATING_BATCH_SIZE } from '../../src/shared/ratings';
import type {
    MovieRatingResponse,
    MovieRatingsBatchResponse,
} from '../../src/shared/ratingTypes';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        MovieRatingResponse | MovieRatingsBatchResponse | { error: string }
    >,
) {
    if (req.method === 'POST') {
        const movieNames: unknown = req.body?.movieNames;
        if (
            !Array.isArray(movieNames) ||
            !movieNames.length ||
            movieNames.length > RATING_BATCH_SIZE ||
            movieNames.some((name) => typeof name !== 'string' || !name.trim())
        ) {
            res.status(400).json({
                error: `Provide between 1 and ${RATING_BATCH_SIZE} movie names`,
            });
            return;
        }
        const ratings = await Promise.all(
            [...new Set(movieNames as string[])].map(async (movieName) => {
                try {
                    return [movieName, await omdbRequest(movieName)] as const;
                } catch {
                    // One provider failure must not discard the rest of a batch.
                    return [movieName, null] as const;
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
