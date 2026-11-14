export type OmdbMovieRating = {
    Title:      string;
    Year:       string;
    Rated:      string;
    Released:   string;
    Runtime:    string;
    Genre:      string;
    Director:   string;
    Writer:     string;
    Actors:     string;
    Plot:       string;
    Language:   string;
    Country:    string;
    Awards:     string;
    Poster:     string;
    Ratings:    Rating[];
    Metascore:  string;
    imdbRating: string;
    imdbVotes:  string;
    imdbID:     string;
    Type:       string;
    DVD:        string;
    BoxOffice:  string;
    Production: string;
    Website:    string;
    Response:   'True';
}

export type OmdbMovieNotFound = {
    Error: string;
    Response: 'False';
};

export type MovieRatingResponse = OmdbMovieRating | OmdbMovieNotFound;

export type MovieRatingsBatchResponse = {
    ratings: Record<string, MovieRatingResponse | null>;
};

export type Rating = {
    Source: string;
    Value:  string;
}
