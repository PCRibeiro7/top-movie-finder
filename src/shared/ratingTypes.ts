export type OmdbMovieRating = {
    Response: 'True';
    imdbRating: string;
    Title?: string | null;
    imdbID?: string | null;
    Runtime?: string | null;
    Poster?: string | null;
    Plot?: string | null;
    Metascore?: string | null;
    Awards?: string | null;
};

export type OmdbMovieNotFound = {
    Response: 'False';
    Error: string;
};

export type MovieRatingResponse = OmdbMovieRating | OmdbMovieNotFound;

export type MovieRatingsBatchResponse = {
    ratings: Record<string, MovieRatingResponse | null>;
};
