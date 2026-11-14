import { Handler } from '@netlify/functions';
import 'dotenv/config';
import availableMoviesRequest from '../../../src/requests/availableMoviesRequester';
import cityIdRequest from '../../../src/requests/cityIdRequester';
import tmdbRequest from '../../../src/requests/tmdbRequester';

export const handler: Handler = async (event, context) => {
    const state = 'RJ';
    const city = 'Rio de Janeiro';

    const cityId = await cityIdRequest(state, city);
    const movies = await availableMoviesRequest(cityId);

    for (const movie of movies) {
        const response = await tmdbRequest(movie.originalTitle);

        const topResponse = response.results[0];

        const movieRating = {
            movieId: movie.id,
            voteAverage: topResponse.vote_average,
            voteCount: topResponse.vote_count,
        };
    }
    return {
        statusCode: 200,
    };
};

handler({} as any, {} as any);
