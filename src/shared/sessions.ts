import { isRecord, optionalArray, optionalString } from './validation';

export type Session = {
    date?: { hour?: string | null } | null;
    price?: string | number | null;
};

export type SessionTheater = {
    name: string;
    neighborhood?: string | null;
    geolocation?: {
        lat?: string | number | null;
        lng?: string | number | null;
    } | null;
    rooms?: { sessions?: Session[] | null }[] | null;
};

export type SessionDay = {
    dateFormatted?: string | null;
    isToday?: boolean | null;
    dayOfWeek?: string | null;
    theaters?: SessionTheater[] | null;
};

function optionalNumberLike(value: unknown) {
    if (
        value != null &&
        typeof value !== 'number' &&
        typeof value !== 'string'
    ) {
        throw new Error('Dados da sessão inválidos.');
    }
}

export function parseSessionDays(value: unknown): SessionDay[] {
    if (!Array.isArray(value)) throw new Error('Sessões indisponíveis.');
    for (const day of value) {
        if (!isRecord(day)) throw new Error('Dia de sessão inválido.');
        optionalString(day.dateFormatted);
        optionalString(day.dayOfWeek);
        if (day.isToday != null && typeof day.isToday !== 'boolean') {
            throw new Error('Dia de sessão inválido.');
        }
        for (const theater of optionalArray(day.theaters)) {
            if (!isRecord(theater) || typeof theater.name !== 'string') {
                throw new Error('Cinema inválido.');
            }
            optionalString(theater.neighborhood);
            if (theater.geolocation != null) {
                if (!isRecord(theater.geolocation))
                    throw new Error('Local inválido.');
                optionalNumberLike(theater.geolocation.lat);
                optionalNumberLike(theater.geolocation.lng);
            }
            for (const room of optionalArray(theater.rooms)) {
                if (!isRecord(room)) throw new Error('Sala inválida.');
                for (const session of optionalArray(room.sessions)) {
                    if (!isRecord(session)) throw new Error('Sessão inválida.');
                    optionalNumberLike(session.price);
                    if (session.date != null) {
                        if (!isRecord(session.date))
                            throw new Error('Data inválida.');
                        optionalString(session.date.hour);
                    }
                }
            }
        }
    }
    return value as SessionDay[];
}
