import type { CitySelection, CatalogLocation } from '../../shared/location';
import { fetchJson } from '../../shared/http';
import { isRecord } from '../../shared/validation';

export type LocationInput =
    | { mode: 'manual'; city: CitySelection }
    | { mode: 'geolocation' };

const STORAGE_KEY = 'movie-finder-city';

export function readSavedCity(): CitySelection | null {
    try {
        const value: unknown = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || 'null',
        );
        return isRecord(value) &&
            typeof value.city === 'string' &&
            value.city.trim() &&
            typeof value.state === 'string' &&
            /^[A-Z]{2}$/.test(value.state)
            ? { city: value.city, state: value.state }
            : null;
    } catch {
        return null;
    }
}

export function saveCity(city: CitySelection) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ city: city.city, state: city.state }),
        );
    } catch {
        // Storage is optional; selection works without it.
    }
}

export async function resolveLocation(
    input: LocationInput,
    signal: AbortSignal,
    onStage: (message: string) => void,
): Promise<CatalogLocation> {
    let city: CitySelection;
    let coordinates = null;
    if (input.mode === 'manual') {
        city = input.city;
    } else {
        const position = await getLocation(signal);
        signal.throwIfAborted();
        coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        onStage('Identificando sua cidade...');
        const data = await fetchJson(
            `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
                lat: String(coordinates.latitude),
                lon: String(coordinates.longitude),
                zoom: '10',
                format: 'jsonv2',
            })}`,
            signal,
        );
        const address =
            isRecord(data) && isRecord(data.address) ? data.address : {};
        const name =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            (isRecord(data) ? data.name : undefined);
        const region = address['ISO3166-2-lvl4'];
        if (
            typeof name !== 'string' ||
            !name ||
            typeof region !== 'string' ||
            !/^BR-[A-Z]{2}$/.test(region)
        ) {
            throw new Error(
                'Não foi possível identificar uma cidade brasileira. Informe sua cidade no formulário acima.',
            );
        }
        city = { city: name, state: region.slice(3) };
    }
    onStage('Preparando a programação para você...');
    const cityId = await fetchJson(
        `/api/state?${new URLSearchParams(city)}`,
        signal,
    );
    if (typeof cityId !== 'string' || !cityId) {
        throw new Error(
            'Não encontramos cinemas nesta cidade. Confira o nome e o estado e tente novamente.',
        );
    }
    return { ...city, cityId, coordinates };
}

export function getLocation(signal: AbortSignal): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(
                new Error(
                    'Seu navegador não oferece acesso à localização. Informe sua cidade acima.',
                ),
            );
            return;
        }
        const cleanup = () => {
            clearTimeout(timeout);
            signal.removeEventListener('abort', onAbort);
        };
        const onAbort = () => {
            cleanup();
            reject(new DOMException('Busca cancelada', 'AbortError'));
        };
        const timeout = setTimeout(() => {
            cleanup();
            reject(
                new Error(
                    'Não foi possível obter sua localização. Informe sua cidade ou tente novamente.',
                ),
            );
        }, 10000);
        signal.addEventListener('abort', onAbort, { once: true });
        if (signal.aborted) {
            onAbort();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                cleanup();
                resolve(position);
            },
            (error) => {
                cleanup();
                reject(
                    new Error(
                        error.code === 1
                            ? 'O acesso à localização foi bloqueado. Você pode informar sua cidade no formulário acima.'
                            : 'Sua localização está indisponível. Informe sua cidade ou tente novamente.',
                    ),
                );
            },
            { timeout: 10000, maximumAge: 300000 },
        );
    });
}
