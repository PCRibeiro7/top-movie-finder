import { getHandler, queryString } from '../../src/server/api';
import { getSessions } from '../../src/server/ingresso/client';

export default getHandler(
    (query) =>
        getSessions(queryString(query.movieId), queryString(query.cityId, '1')),
    'Não foi possível carregar as sessões. Tente novamente.',
);
