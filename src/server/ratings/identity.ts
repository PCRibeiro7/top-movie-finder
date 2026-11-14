import type { MovieRatingLookup } from '../../shared/ratingTypes';
import { movieTitleKey } from '../../shared/ratings';

export function matchingMovieMetadata(
    lookup: MovieRatingLookup,
    metadata: { director?: string | null; runtimeMinutes?: number | null },
): boolean | null {
    let checked = false;
    if (lookup.director && metadata.director && metadata.director !== 'N/A') {
        checked = true;
        const expected = lookup.director.split(',').map(movieTitleKey);
        if (
            !metadata.director.split(',').some((name) =>
                expected.includes(movieTitleKey(name)),
            )
        ) {
            return false;
        }
    }
    if (
        lookup.runtimeMinutes &&
        metadata.runtimeMinutes &&
        metadata.runtimeMinutes > 0
    ) {
        checked = true;
        // Catalog and provider runtimes can differ slightly across cinema cuts.
        if (Math.abs(lookup.runtimeMinutes - metadata.runtimeMinutes) > 5) {
            return false;
        }
    }
    return checked ? true : null;
}
