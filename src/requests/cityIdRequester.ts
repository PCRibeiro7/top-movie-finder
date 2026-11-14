import { City } from '../types/City';

export default async function cityIdRequest(
    stateName = 'SP',
    cityName = 'São Paulo'
) {
    const url = `https://api-content.ingresso.com/v0/states/${encodeURIComponent(
        stateName.trim().toUpperCase()
    )}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
        throw new Error('Não foi possível consultar as cidades.');
    }
    const data = await response.json();
    const cities: City[] = data.cities;
    if (!Array.isArray(cities)) {
        throw new Error('Não foi possível consultar as cidades.');
    }

    const normalize = (value: string) =>
        value
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('pt-BR');
    return cities.find((city) => normalize(city.name) === normalize(cityName))
        ?.id;
}
