export interface TmdbMovieRating {
    adult: boolean;
    backdrop_path: string;
    genre_ids: number[];
    id: number;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    release_date: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
}

export interface TmdbMovieRatingResponse {
    page: number;
    results: TmdbMovieRating[];
    total_pages: number;
    total_results: number;
}
