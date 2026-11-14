import React, { useEffect, useRef, useState } from 'react';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import Filter from '../src/components/Filter';
import LocationPicker from '../src/components/LocationPicker';
import MovieAppBar from '../src/components/MovieAppBar';
import MovieCards from '../src/components/MovieCards';
import { getMovieRating } from '../src/requests/ratingRequester';
import type { Movie } from '../src/types/Movie';
import { movieRatingKey, RATING_BATCH_SIZE } from '../src/utils/movieRatings';

export type RatedMovie = Movie & { imdbRating?: string };
export type SessionRow = {
    name: string;
    times: string[];
    distance?: number;
    neighborhood: string;
    price?: number;
};
export interface HomeState {
    movie: string;
    originalMovie: string;
    movieInfo: Record<string, any>;
    selectedMovie: RatedMovie | null;
    cityId: string;
    movieId: string;
    availableMovies: RatedMovie[];
    sessionsInfo: any[];
    sessionInfoIsReady: boolean;
    currentGeographicPosition: { latitude?: number; longitude?: number };
    sessionTableSortColumn: keyof SessionRow;
    sessionTableSortDirection: number;
    sessionTable: SessionRow[];
    cardsToShow: number;
    cardFirst: number;
    filter: { genre: string; title: string };
    movieCardsAreReady: boolean;
    trailer: Movie['trailers'];
}
type CityLocation = { city: string; state: string };

function getLocation(signal: AbortSignal): Promise<GeolocationPosition> {
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

async function fetchJson(url: string, signal: AbortSignal) {
    const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok)
        throw new Error(
            'Não foi possível consultar os filmes. Confira a cidade e o estado ou tente novamente.',
        );
    return response.json();
}

export default function Home() {
    const [state, setState] = useState<HomeState>({
        movie: '',
        originalMovie: '',
        movieInfo: {},
        selectedMovie: null,
        cityId: '',
        movieId: '',
        availableMovies: [],
        sessionsInfo: [],
        sessionInfoIsReady: false,
        currentGeographicPosition: {},
        sessionTableSortColumn: 'distance',
        sessionTableSortDirection: 1,
        sessionTable: [],
        cardsToShow: 10,
        cardFirst: 0,
        filter: { genre: '', title: '' },
        movieCardsAreReady: false,
        trailer: [],
    });
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [locationAttempt, setLocationAttempt] = useState(0);
    const [manualLocation, setManualLocation] = useState<CityLocation | null>(
        null,
    );
    const [selectedLocation, setSelectedLocation] =
        useState<CityLocation | null>(null);
    const currentLocation = selectedLocation
        ? `${selectedLocation.city}, ${selectedLocation.state}`
        : '';
    const scrollToResults = useRef(false);
    const [sort, setSort] = useState('rating');

    useEffect(() => {
        try {
            const stored = JSON.parse(
                localStorage.getItem('movie-finder-city') || 'null',
            );
            if (
                typeof stored?.city === 'string' &&
                /^[A-Z]{2}$/.test(stored?.state)
            ) {
                setManualLocation({ city: stored.city, state: stored.state });
            }
        } catch {
            /* City selection also works when browser storage is unavailable. */
        }
    }, []);

    useEffect(() => {
        if (!manualLocation && !locationAttempt) return;
        const controller = new AbortController();
        const { signal } = controller;
        setLoadError(null);
        setLoading(true);
        setLoadingMessage(
            manualLocation
                ? 'Buscando os filmes da sua cidade...'
                : 'Buscando sua localização...',
        );
        setState((previous) => ({
            ...previous,
            movieCardsAreReady: false,
            selectedMovie: null,
            availableMovies: [],
            cardFirst: 0,
            filter: { genre: '', title: '' },
            currentGeographicPosition: {},
        }));

        async function init() {
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
                        signal,
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
                            'Não foi possível identificar uma cidade brasileira. Informe sua cidade no formulário acima.',
                        );
                    }
                    location = { city, state: region.slice(3) };
                }
                setLoadingMessage('Preparando a programação para você...');
                const cityId = await fetchJson(
                    `/api/state?${new URLSearchParams(location)}`,
                    signal,
                );
                if (typeof cityId !== 'string' || !cityId) {
                    throw new Error(
                        'Não encontramos cinemas nesta cidade. Confira o nome e o estado e tente novamente.',
                    );
                }
                const movies = await fetchJson(
                    `/api/movies?${new URLSearchParams({ cityId })}`,
                    signal,
                );
                if (!Array.isArray(movies))
                    throw new Error(
                        'Não foi possível carregar os filmes. Tente novamente.',
                    );
                if (signal.aborted) return;
                setSelectedLocation(location);
                try {
                    localStorage.setItem(
                        'movie-finder-city',
                        JSON.stringify(location),
                    );
                } catch {
                    /* Storage is optional. */
                }
                setState((previous) => ({
                    ...previous,
                    availableMovies: movies,
                    movieCardsAreReady: true,
                    cityId,
                }));
                setLoading(false);
                revealResults();

                // Enrich the catalog in batches without delaying its first render.
                const movieNames = [
                    ...new Set<string>(
                        movies.map((movie: Movie) =>
                            movieRatingKey(movie.originalTitle || movie.title),
                        ),
                    ),
                ];
                for (
                    let index = 0;
                    index < movieNames.length;
                    index += RATING_BATCH_SIZE
                ) {
                    if (signal.aborted) return;
                    const ratings = new Map(
                        await Promise.all(
                            movieNames
                                .slice(index, index + RATING_BATCH_SIZE)
                                .map(async (name) => {
                                    try {
                                        const rating = await getMovieRating(name);
                                        return [
                                            name,
                                            rating.Response === 'True'
                                                ? rating.imdbRating
                                                : 'N/A',
                                        ] as const;
                                    } catch {
                                        return [name, 'N/A'] as const;
                                    }
                                }),
                        ),
                    );
                    if (signal.aborted) return;
                    setState((previous) => ({
                        ...previous,
                        availableMovies: previous.availableMovies.map(
                            (movie) => {
                                const key = movieRatingKey(
                                    movie.originalTitle || movie.title,
                                );
                                return ratings.has(key)
                                    ? { ...movie, imdbRating: ratings.get(key) }
                                    : movie;
                            },
                        ),
                    }));
                }
            } catch (error) {
                if (signal.aborted) return;
                setLoading(false);
                setLoadError(
                    error instanceof Error &&
                        ![
                            'TimeoutError',
                            'TypeError',
                            'SyntaxError',
                            'AbortError',
                        ].includes(error.name)
                        ? error.message
                        : 'Não foi possível concluir a busca. Confira sua conexão ou tente outra cidade.',
                );
                revealResults();
            }
        }
        init();
        return () => controller.abort();
    }, [locationAttempt, manualLocation]);

    function revealResults() {
        if (!scrollToResults.current) return;
        scrollToResults.current = false;
        requestAnimationFrame(() => {
            const catalog = document.getElementById('em-cartaz');
            catalog?.focus({ preventScroll: true });
            catalog?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'auto'
                    : 'smooth',
            });
        });
    }

    function focusLocation() {
        document.getElementById('city')?.focus({ preventScroll: true });
        document
            .getElementById('inicio')
            ?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="app-shell" id="inicio">
            <a className="skip-link" href="#em-cartaz">
                Pular para os filmes
            </a>
            <MovieAppBar
                location={currentLocation}
                onLocationClick={focusLocation}
            />
            <main className="page-width">
                <section className="hero" aria-labelledby="hero-title">
                    <div className="hero-copy">
                        <div className="eyebrow">
                            <span className="live-dot" /> PARA QUEM AMA A TELA
                            GRANDE
                        </div>
                        <h1 id="hero-title">
                            Menos indecisão.
                            <br />
                            Mais{' '}
                            <span className="cinema-word">
                                cinema
                                <svg viewBox="0 0 360 20" aria-hidden="true">
                                    <path d="M3 14 Q165 -6 353 9" />
                                </svg>
                            </span>
                            <span className="hero-period">.</span>
                        </h1>
                        <p>
                            O próximo filme favorito está por aí.
                            <br className="desktop-break" /> Descubra o que vale
                            o ingresso nos cinemas perto de você.
                        </p>
                        <div className="hero-pills">
                            <span>
                                <AutoAwesomeOutlined /> Boas histórias
                            </span>
                            <span>
                                <ConfirmationNumberOutlined /> Sessões perto de
                                você
                            </span>
                        </div>
                        <a className="browse-link" href="#em-cartaz">
                            Vamos encontrar seu próximo filme{' '}
                            <ArrowDownwardRounded />
                        </a>
                        <span className="hero-decoration" aria-hidden="true">
                            ✳
                        </span>
                    </div>
                    <LocationPicker
                        loading={loading}
                        location={currentLocation}
                        selectedLocation={selectedLocation}
                        onCitySubmit={(city, region) => {
                            scrollToResults.current = true;
                            setManualLocation({ city, state: region });
                        }}
                        onLocate={() => {
                            scrollToResults.current = true;
                            setManualLocation(null);
                            setLocationAttempt((attempt) => attempt + 1);
                        }}
                    />
                </section>
                <section
                    className="catalog"
                    id="em-cartaz"
                    aria-labelledby="catalog-title"
                    tabIndex={-1}
                >
                    <div className="catalog-heading">
                        <div>
                            <div className="eyebrow section-eyebrow">
                                A PRÓXIMA BOA ESCOLHA
                            </div>
                            <div className="catalog-title-row">
                                <h2 id="catalog-title">
                                    Em cartaz
                                    {state.movieCardsAreReady && (
                                        <span className="result-count">
                                            {state.availableMovies.length}
                                        </span>
                                    )}
                                </h2>
                                <span className="catalog-location">
                                    {currentLocation || 'Na sua cidade'}
                                </span>
                            </div>
                        </div>
                        <label className="sort-control">
                            Ordenar por
                            <select
                                aria-label="Ordenar filmes"
                                value={sort}
                                onChange={(event) => {
                                    setSort(event.target.value);
                                    setState((previous) => ({
                                        ...previous,
                                        cardFirst: 0,
                                    }));
                                }}
                            >
                                <option value="rating">Melhor avaliação</option>
                                <option value="title">Título: A a Z</option>
                                <option value="release">Lançamentos</option>
                            </select>
                        </label>
                    </div>
                    <Filter state={state} setState={setState} />
                    <MovieCards
                        state={state}
                        setState={setState}
                        loadError={loadError}
                        loadingMessage={loadingMessage}
                        loading={loading}
                        sort={sort}
                        onLocationClick={focusLocation}
                        onRetry={() =>
                            setLocationAttempt((attempt) => attempt + 1)
                        }
                    />
                </section>
            </main>
            <footer className="site-footer page-width">
                <span className="footer-brand">
                    <ConfirmationNumberOutlined /> A vida fica melhor com um bom
                    filme.
                </span>
                <span>
                    Feito para quem ama cinema.{' '}
                    <span className="footer-star">✦</span>
                </span>
            </footer>
        </div>
    );
}
