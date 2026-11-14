import type { NextApiRequest, NextApiResponse } from 'next';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

export function queryString(
    value: string | string[] | undefined,
    fallback?: string,
): string {
    if (value === undefined && fallback !== undefined) return fallback;
    if (typeof value !== 'string' || !value.trim()) {
        throw new ApiError(
            400,
            'Informe os parâmetros necessários à consulta.',
        );
    }
    return value.trim();
}

export function getHandler(
    load: (query: NextApiRequest['query']) => Promise<unknown>,
    failureMessage: string,
) {
    return async function handler(req: NextApiRequest, res: NextApiResponse) {
        if (req.method !== 'GET') {
            res.setHeader('Allow', ['GET']);
            res.status(405).json({ error: 'Método não permitido.' });
            return;
        }
        try {
            res.status(200).json(await load(req.query));
        } catch (error) {
            res.status(error instanceof ApiError ? error.status : 502).json({
                error:
                    error instanceof ApiError ? error.message : failureMessage,
            });
        }
    };
}
