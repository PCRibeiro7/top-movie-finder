export type MovieRatingLookup = {
    title: string;
    originalTitle?: string;
    releaseYear?: number;
    director?: string;
    runtimeMinutes?: number;
};

export type OmdbMovieRating = {
    Response: 'True';
    imdbRating: string;
    Title?: string | null;
    Year?: string | null;
    Director?: string | null;
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
