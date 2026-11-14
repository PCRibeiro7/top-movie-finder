import type { Coordinates } from '../../shared/location';
import type { RatedMovie } from '../../shared/movies';
import type { OmdbMovieRating } from '../../shared/ratingTypes';
import type { SessionDay } from '../../shared/sessions';

export type SessionRow = {
    name: string;
    times: string[];
    distance?: number;
    neighborhood: string;
    price?: number;
};
export type SessionSort = {
    column: 'name' | 'times' | 'distance' | 'price';
    direction: 'asc' | 'desc';
};

export function distanceInKilometers(first: Coordinates, second: Coordinates) {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const cosine =
        Math.sin(radians(first.latitude)) * Math.sin(radians(second.latitude)) +
        Math.cos(radians(first.latitude)) *
            Math.cos(radians(second.latitude)) *
            Math.cos(radians(first.longitude - second.longitude));
    const distance =
        ((Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI) *
        60 *
        1.1515 *
        1.609344;
    return Math.floor(distance * 100) / 100;
}

function coordinate(value: string | number | null | undefined, limit: number) {
    if (value == null || (typeof value === 'string' && !value.trim()))
        return undefined;
    const number = Number(value);
    return Number.isFinite(number) && Math.abs(number) <= limit
        ? number
        : undefined;
}

export function sessionPresentation(
    days: SessionDay[],
    position: Coordinates | null,
) {
    const day = days[0];
    const date = day?.dateFormatted
        ? [day.isToday ? 'Hoje' : day.dayOfWeek, day.dateFormatted]
              .filter(Boolean)
              .join(', ')
        : '';
    const rows: SessionRow[] = (day?.theaters || []).map((theater) => {
        const sessions = (theater.rooms || []).flatMap(
            (room) => room.sessions || [],
        );
        const times = [
            ...new Set(
                sessions
                    .map((session) => session.date?.hour)
                    .filter((hour): hour is string => Boolean(hour)),
            ),
        ].sort();
        const prices = sessions
            .map((session) => Number(session.price))
            .filter((price) => Number.isFinite(price) && price > 0);
        const latitude = coordinate(theater.geolocation?.lat, 90);
        const longitude = coordinate(theater.geolocation?.lng, 180);
        return {
            name: theater.name,
            neighborhood: theater.neighborhood || '',
            times,
            price: prices.length ? Math.min(...prices) : undefined,
            distance:
                position && latitude !== undefined && longitude !== undefined
                    ? distanceInKilometers(position, { latitude, longitude })
                    : undefined,
        };
    });
    return { date, rows };
}

export function sortSessions(rows: SessionRow[], sort: SessionSort) {
    return [...rows].sort((firstRow, secondRow) => {
        const first = firstRow[sort.column],
            second = secondRow[sort.column];
        if (first == null) return second == null ? 0 : 1;
        if (second == null) return -1;
        const result =
            typeof first === 'number' && typeof second === 'number'
                ? first - second
                : String(first).localeCompare(String(second), 'pt-BR');
        return result * (sort.direction === 'asc' ? 1 : -1);
    });
}

function metadata(value?: string | null) {
    return value && value !== 'N/A' ? value : '';
}

function trailerUrl(raw?: string) {
    if (!raw) return undefined;
    try {
        const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        return ['http:', 'https:'].includes(url.protocol)
            ? url.href
            : undefined;
    } catch {
        return undefined;
    }
}

export function movieDetails(movie: RatedMovie, info?: OmdbMovieRating) {
    const score = Number(info?.imdbRating || movie.imdbRating);
    return {
        ...movie,
        score: Number.isFinite(score) && score > 0 && score <= 10 ? score : NaN,
        durationText:
            Number(movie.duration) > 0
                ? `${movie.duration} min`
                : metadata(info?.Runtime),
        poster: movie.images?.[0]?.url || metadata(info?.Poster),
        synopsis:
            movie.synopsis ||
            metadata(info?.Plot) ||
            'A sinopse deste filme ainda não está disponível.',
        metascore: Number(info?.Metascore) > 0 ? info?.Metascore : undefined,
        awards: metadata(info?.Awards),
        trailer: trailerUrl(movie.trailers?.[0]?.url),
    };
}

export type MovieDetails = ReturnType<typeof movieDetails>;
