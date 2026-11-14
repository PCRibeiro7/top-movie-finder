import { TmdbMovieRatingResponse } from '../types/TmdbMovieRating';

export default async function tmdbRequest(
    movieTitle: string
): Promise<TmdbMovieRatingResponse> {
    // let api_key = process.env.TMDB_API_KEY;
    let api_key = 'f59904c30162f004611e05a687db5013';
    movieTitle = movieTitle.replaceAll('-', ' ').replaceAll(':', ' ');

    return fetch(
        `https://api.themoviedb.org/3/search/movie?query=${movieTitle}&include_adult=true&api_key=${api_key}`
    )
        .then(function (response) {
            let responseJSON = response.json();
            return responseJSON;
        })
        .catch((err) => {
            return err;
        });
}
