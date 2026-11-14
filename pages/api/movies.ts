import { getHandler, queryString } from '../../src/server/api';
import { getMovies } from '../../src/server/ingresso/client';

export default getHandler(
    (query) => getMovies(queryString(query.cityId, '1')),
    'Não foi possível carregar os filmes. Tente novamente.',
);
