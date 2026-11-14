import { getHandler, queryString } from '../../src/server/api';
import { findMovieId } from '../../src/server/ingresso/client';

export default getHandler(
    (query) =>
        findMovieId(queryString(query.movie), queryString(query.cityId, '1')),
    'Não foi possível consultar o filme. Tente novamente.',
);
