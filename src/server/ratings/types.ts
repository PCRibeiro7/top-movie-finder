export type TmdbMovieRatingResponse = {
    results: {
        id: number;
        title?: string | null;
        original_title?: string | null;
    }[];
};
