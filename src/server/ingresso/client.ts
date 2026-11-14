import { parseMovies } from '../../shared/movies';
import { parseSessionDays } from '../../shared/sessions';
import { isRecord } from '../../shared/validation';

const BASE_URL = 'https://api-content.ingresso.com/v0';

async function ingressoJson(path: string): Promise<unknown> {
    const response = await fetch(`${BASE_URL}/${path}`, {
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Ingresso.com indisponível.');
    return response.json();
}

function cityKey(value: string) {
    return value
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

export async function findCityId(state: string, city: string) {
    const data = await ingressoJson(
        `states/${encodeURIComponent(state.trim().toUpperCase())}`,
    );
    if (!isRecord(data) || !Array.isArray(data.cities)) {
        throw new Error('Cidades indisponíveis.');
    }
    for (const entry of data.cities) {
        if (
            !isRecord(entry) ||
            typeof entry.id !== 'string' ||
            typeof entry.name !== 'string'
        ) {
            throw new Error('Cidade inválida.');
        }
    }
    const cities = data.cities as { id: string; name: string }[];
    return cities.find((entry) => cityKey(entry.name) === cityKey(city))?.id;
}

export async function getMovies(cityId: string) {
    return parseMovies(
        await ingressoJson(`events/city/${encodeURIComponent(cityId)}`),
    );
}

export async function findMovieId(title: string, cityId: string) {
    const movies = await getMovies(cityId);
    return (
        movies.find((movie) => movie.title.trim() === title.trim())?.id ?? null
    );
}

export async function getSessions(movieId: string, cityId: string) {
    return parseSessionDays(
        await ingressoJson(
            `sessions/city/${encodeURIComponent(cityId)}/event/${encodeURIComponent(movieId)}/partnership/1`,
        ),
    );
}
