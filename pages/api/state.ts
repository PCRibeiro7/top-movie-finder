import type { NextApiRequest, NextApiResponse } from 'next';
import cityIdRequest from '../../src/requests/cityIdRequester';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { state, city } = req.query;
    if (
        typeof state !== 'string' ||
        !/^[A-Za-z]{2}$/.test(state.trim()) ||
        typeof city !== 'string' ||
        !city.trim()
    ) {
        res.status(400).json({ error: 'Informe uma cidade e uma UF válidas.' });
        return;
    }

    try {
        const cityId = await cityIdRequest(state, city);
        if (!cityId) {
            res.status(404).json({
                error: 'Não encontramos cinemas nesta cidade.',
            });
            return;
        }
        res.status(200).json(cityId);
    } catch {
        res.status(502).json({
            error: 'Não foi possível consultar as cidades. Tente novamente.',
        });
    }
}
