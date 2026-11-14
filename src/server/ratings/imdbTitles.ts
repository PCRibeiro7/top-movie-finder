import type { MovieRatingLookup } from '../../shared/ratingTypes';
import { movieTitleKey } from '../../shared/ratings';
import { isRecord } from '../../shared/validation';

export async function findImdbTitleId(
    titles: string[],
    releaseYear: MovieRatingLookup['releaseYear'],
    signal: AbortSignal,
    verifyAlternative?: (candidate: {
        id: string;
        title: string;
    }) => Promise<boolean>,
): Promise<string | null> {
    const distinct = [
        ...new Map(
            titles.filter(Boolean).map((title) => [movieTitleKey(title), title]),
        ).values(),
    ];
    const keys = distinct.map(movieTitleKey);
    for (const title of distinct) {
        const query = movieTitleKey(title);
        if (!query) continue;
        const response = await fetch(
            `https://v3.sg.media-imdb.com/suggestion/${query[0]}/${encodeURIComponent(query)}.json`,
            { signal },
        );
        if (!response.ok) throw new Error('IMDb title resolver unavailable');
        const data: unknown = await response.json();
        if (!isRecord(data) || (data.d !== undefined && !Array.isArray(data.d))) {
            throw new Error('IMDb title resolver unavailable');
        }
        const matches = new Set<string>();
        const alternatives = new Map<string, { id: string; title: string }>();
        for (const candidate of (data.d || []) as unknown[]) {
            if (!isRecord(candidate)) {
                throw new Error('IMDb title resolver unavailable');
            }
            if (
                typeof candidate.id === 'string' &&
                /^tt\d+$/.test(candidate.id) &&
                candidate.qid === 'movie' &&
                typeof candidate.l === 'string' &&
                (releaseYear === undefined ||
                    candidate.y === releaseYear ||
                    candidate.y === releaseYear - 1)
            ) {
                if (keys.includes(movieTitleKey(candidate.l))) {
                    matches.add(candidate.id);
                } else {
                    alternatives.set(candidate.id, {
                        id: candidate.id,
                        title: candidate.l,
                    });
                }
            }
        }
        // Different display titles need independent identity evidence, not rank.
        if (!matches.size && verifyAlternative && alternatives.size <= 3) {
            for (const candidate of alternatives.values()) {
                if (await verifyAlternative(candidate)) matches.add(candidate.id);
            }
        }
        if (matches.size > 1) return null;
        if (matches.size === 1) return [...matches][0];
    }
    return null;
}
