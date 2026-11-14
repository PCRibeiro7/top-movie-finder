import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogLocation, CitySelection } from '../../shared/location';
import type { RatedMovie } from '../../shared/movies';
import { movieRatingKey, movieRatingLookup } from '../../shared/ratings';
import {
    readSavedCity,
    resolveLocation,
    saveCity,
    type LocationInput,
} from '../location/service';
import { enrichCatalog, loadCatalog, type RatingResult } from './service';

type CatalogState = {
    attemptId: number;
    status: 'idle' | 'loading' | 'ready' | 'error';
    movies: RatedMovie[];
    location: CatalogLocation | null;
    message: string;
    error: string | null;
};

export function useMovieCatalog() {
    const [state, setState] = useState<CatalogState>({
        attemptId: 0,
        status: 'idle',
        movies: [],
        location: null,
        message: '',
        error: null,
    });
    const [attempt, setAttempt] = useState<{
        id: number;
        input: LocationInput;
    } | null>(null);
    const sequence = useRef(0);
    const controller = useRef<AbortController | null>(null);

    const start = useCallback((input: LocationInput) => {
        controller.current?.abort();
        const id = ++sequence.current;
        setState((previous) => ({
            ...previous,
            attemptId: id,
            status: 'loading',
            movies: [],
            error: null,
            message:
                input.mode === 'manual'
                    ? 'Buscando os filmes da sua cidade...'
                    : 'Buscando sua localização...',
        }));
        setAttempt({ id, input });
    }, []);

    useEffect(() => {
        const city = readSavedCity();
        if (city) start({ mode: 'manual', city });
    }, [start]);

    useEffect(() => {
        if (!attempt) return;
        const { id, input } = attempt;
        const current = new AbortController();
        controller.current = current;
        const { signal } = current;
        const isCurrent = () => !signal.aborted && sequence.current === id;
        async function load() {
            try {
                const location = await resolveLocation(
                    input,
                    signal,
                    (message) => {
                        if (isCurrent())
                            setState((previous) => ({ ...previous, message }));
                    },
                );
                const movies = await loadCatalog(location.cityId, signal);
                if (!isCurrent()) return;
                saveCity(location);
                setState((previous) => ({
                    ...previous,
                    location,
                    movies,
                    status: 'ready',
                }));
                await enrichCatalog(movies, signal, (ratings) => {
                    if (!isCurrent()) return;
                    setState((previous) => ({
                        ...previous,
                        movies: previous.movies.map((movie) => ({
                            ...movie,
                            ...ratings.get(
                                movieRatingKey(
                                    movieRatingLookup(movie),
                                ),
                            ),
                        })),
                    }));
                });
            } catch (error) {
                if (!isCurrent()) return;
                setState((previous) => ({
                    ...previous,
                    status: 'error',
                    error:
                        error instanceof Error &&
                        ![
                            'TimeoutError',
                            'TypeError',
                            'SyntaxError',
                            'AbortError',
                        ].includes(error.name)
                            ? error.message
                            : 'Não foi possível concluir a busca. Confira sua conexão ou tente outra cidade.',
                }));
            }
        }
        void load();
        return () => current.abort();
    }, [attempt]);

    const updateMovieRating = useCallback(
        (attemptId: number, movieId: string, result: RatingResult) => {
            if (attemptId !== sequence.current) return;
            setState((previous) => ({
                ...previous,
                movies: previous.movies.map((movie) =>
                    movie.id === movieId ? { ...movie, ...result } : movie,
                ),
            }));
        },
        [],
    );

    return {
        ...state,
        selectCity: (city: CitySelection) => start({ mode: 'manual', city }),
        locate: () => start({ mode: 'geolocation' }),
        retry: () => {
            if (attempt) start(attempt.input);
        },
        updateMovieRating,
    };
}
