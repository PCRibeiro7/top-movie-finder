import { isRecord } from './validation';

export async function fetchJson(
    url: string,
    signal: AbortSignal,
): Promise<unknown> {
    const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    const data: unknown = await response.json();
    if (!response.ok) {
        throw new Error(
            isRecord(data) && typeof data.error === 'string'
                ? data.error
                : 'Não foi possível consultar os dados. Tente novamente.',
        );
    }
    return data;
}
