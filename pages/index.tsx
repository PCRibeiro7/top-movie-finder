'use client';

import React, { useEffect, useRef, useState } from 'react';

import { Grid, Typography } from '@mui/material';

import Filter from '../src/components/Filter';
import MovieAppBar from '../src/components/MovieAppBar';
import MovieCards from '../src/components/MovieCards';
import MovieInfo from '../src/components/MovieInfo';
import SessionInfo from '../src/components/SessionInfo';

export interface HomeState {
    movie: string;
    originalMovie: string;
    movieInfo: Record<string, any>;
    cityId: string;
    movieId: string;
    availableMovies: Array<any>;
    sessionsInfo: Array<any>;
    sessionInfoIsReady: boolean;
    currentGeographicPosition: {
        latitude: number | undefined;
        longitude: number | undefined;
    };
    sessionTableSortColumn: string;
    sessionTableSortDirection: number;
    sessionTable: Array<any>;
    cardsToShow: number;
    cardFirst: number;
    cardTotal: number;
    showFilter: boolean;
    filter: {
        genre: string;
        title: string;
    };
    genreHelpListOpen: boolean;
    movieCardsAreReady: boolean;
    trailer: Array<any>;
}

function getLocation(signal: AbortSignal): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(
                new Error(
                    'Seu navegador não oferece acesso à localização. Informe sua cidade abaixo.'
                )
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
                    'Não foi possível obter sua localização. Informe sua cidade ou tente novamente.'
                )
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
                            ? 'O acesso à localização foi bloqueado. Permita o acesso no navegador ou informe sua cidade.'
                            : 'Sua localização está indisponível. Informe sua cidade ou tente novamente.'
                    )
                );
            },
            { timeout: 10000, maximumAge: 300000 }
        );
    });
}

async function fetchJson(url: string, signal: AbortSignal) {
    const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) {
        throw new Error(
            'Não foi possível consultar os filmes para esta cidade. Confira a cidade e a UF ou tente novamente.'
        );
    }
    return response.json();
}

const Home = () => {
    const [state, setState] = React.useState<HomeState>({
        movie: '',
        originalMovie: '',
        movieInfo: {},
        cityId: '',
        movieId: '',
        availableMovies: [],
        sessionsInfo: [],
        sessionInfoIsReady: false,
        currentGeographicPosition: {
            latitude: undefined,
            longitude: undefined,
        },
        sessionTableSortColumn: 'distance',
        sessionTableSortDirection: 1,
        sessionTable: [],
        cardsToShow: 10,
        cardFirst: 0,
        cardTotal: 0,
        showFilter: false,
        filter: {
            genre: '',
            title: '',
        },
        genreHelpListOpen: false,
        movieCardsAreReady: false,
        trailer: [],
    });

    const movieInfoTableRef = useRef<HTMLDivElement>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(
        'Buscando sua localização...'
    );
    const [locationAttempt, setLocationAttempt] = useState(0);
    const [manualLocation, setManualLocation] = useState<{
        city: string;
        state: string;
    } | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        setLoadError(null);
        setLoadingMessage(
            manualLocation
                ? 'Carregando filmes...'
                : 'Buscando sua localização...'
        );
        setState((previous) => ({ ...previous, movieCardsAreReady: false }));

        const init = async () => {
            try {
                let location = manualLocation;
                if (!location) {
                    const position = await getLocation(signal);
                    if (signal.aborted) return;
                    setState((previous) => ({
                        ...previous,
                        currentGeographicPosition: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        },
                    }));
                    setLoadingMessage('Identificando sua cidade...');
                    const data = await fetchJson(
                        `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10&format=jsonv2`,
                        signal
                    );
                    const address = data.address;
                    const city =
                        address?.city ||
                        address?.town ||
                        address?.village ||
                        address?.municipality ||
                        data.name;
                    const region = address?.['ISO3166-2-lvl4'];
                    if (!city || !/^BR-[A-Z]{2}$/.test(region ?? '')) {
                        throw new Error(
                            'Não foi possível identificar uma cidade brasileira na sua localização. Informe sua cidade abaixo.'
                        );
                    }
                    location = { city, state: region.slice(3) };
                }

                setLoadingMessage('Carregando filmes...');
                const query = new URLSearchParams(location);
                const cityId = await fetchJson(`/api/state?${query}`, signal);
                if (typeof cityId !== 'string' || !cityId) {
                    throw new Error(
                        'Não encontramos cinemas nesta cidade. Confira a cidade e a UF.'
                    );
                }
                const movies = await fetchJson(
                    `/api/movies?cityId=${encodeURIComponent(cityId)}`,
                    signal
                );
                if (!Array.isArray(movies)) {
                    throw new Error(
                        'Não foi possível carregar os filmes. Tente novamente.'
                    );
                }
                if (signal.aborted) return;

                setState((previous) => ({
                    ...previous,
                    availableMovies: movies,
                    movieCardsAreReady: true,
                    cardTotal: movies.length,
                    cardFirst: 0,
                    cityId,
                }));

                const ratedMovies = await Promise.all(
                    movies.map(async (movie) => {
                        try {
                            const query = new URLSearchParams({
                                movieName: movie.originalTitle || movie.title,
                            });
                            const rating = await fetchJson(
                                `/api/rating?${query}`,
                                signal
                            );
                            return {
                                ...movie,
                                imdbRating: rating?.imdbRating || 'N/A',
                            };
                        } catch {
                            return { ...movie, imdbRating: 'N/A' };
                        }
                    })
                );
                if (signal.aborted) return;
                ratedMovies.sort(
                    (a, b) =>
                        (parseFloat(b.imdbRating) || 0) -
                        (parseFloat(a.imdbRating) || 0)
                );
                setState((previous) => ({
                    ...previous,
                    availableMovies: ratedMovies,
                }));
            } catch (error) {
                if (signal.aborted) return;
                setLoadError(
                    error instanceof Error &&
                        ![
                            'TimeoutError',
                            'TypeError',
                            'SyntaxError',
                            'AbortError',
                        ].includes(error.name)
                        ? error.message
                        : 'Não foi possível concluir a busca. Confira sua conexão, informe sua cidade ou tente novamente.'
                );
            }
        };

        init();
        return () => controller.abort();
    }, [locationAttempt, manualLocation]);

    useEffect(() => {
        if (movieInfoTableRef.current) {
            window.scrollTo({
                left: 0,
                top: movieInfoTableRef.current.offsetTop,
                behavior: 'smooth',
            });
        }
    }, [state.movieId]);

    return (
        <div style={{ minHeight: '100dvh', background: 'lightgray' }}>
            <MovieAppBar />
            <Grid container justifyContent="center">
                <Grid item xs={12}>
                    <Grid container justifyContent={'center'}>
                        <Filter state={state} setState={setState} />
                        <MovieCards
                            state={state}
                            setState={setState}
                            loadError={loadError}
                            loadingMessage={loadingMessage}
                            onRetry={() => {
                                setManualLocation(null);
                                setLocationAttempt((attempt) => attempt + 1);
                            }}
                            onCitySubmit={(city, state) => {
                                setManualLocation({ city, state });
                            }}
                        />

                        <div ref={movieInfoTableRef}></div>
                        {Object.entries(state.movieInfo).length !== 0 ? (
                            <MovieInfo state={state} />
                        ) : (
                            <Grid container justifyContent="center">
                                {' '}
                                <Grid item xs={11}>
                                    <Typography
                                        align="center"
                                        style={{ padding: '1%' }}
                                        variant="h4"
                                    >
                                        {state.movie}
                                    </Typography>{' '}
                                </Grid>
                            </Grid>
                        )}
                        {state.sessionInfoIsReady ? (
                            <SessionInfo state={state} setState={setState} />
                        ) : null}
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default Home;
