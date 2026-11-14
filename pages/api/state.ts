import { ApiError, getHandler, queryString } from '../../src/server/api';
import { findCityId } from '../../src/server/ingresso/client';

export default getHandler(async (query) => {
    const state = queryString(query.state);
    const city = queryString(query.city);
    if (!/^[A-Za-z]{2}$/.test(state)) {
        throw new ApiError(400, 'Informe uma cidade e uma UF válidas.');
    }
    const cityId = await findCityId(state, city);
    if (!cityId)
        throw new ApiError(404, 'Não encontramos cinemas nesta cidade.');
    return cityId;
}, 'Não foi possível consultar as cidades. Tente novamente.');
