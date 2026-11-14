import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, IconButton, Skeleton } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import LocalMoviesOutlined from '@mui/icons-material/LocalMoviesOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import type { HomeState, RatedMovie, SessionRow } from '../../pages';
import { getMovieRating } from '../requests/ratingRequester';
import { movieRatingResult, movieRatingStatusText } from '../utils/movieRatings';
import distanceCalculator from '../utils/distanceCalculator';
import MovieInfo from './MovieInfo';
import SessionInfo from './SessionInfo';

type Props = {
    state: HomeState;
    setState: React.Dispatch<React.SetStateAction<HomeState>>;
    loadError: string | null;
    loadingMessage: string;
    loading: boolean;
    sort: string;
    onLocationClick: () => void;
    onRetry: () => void;
};

function normalized(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

export default function MovieCards({
    state,
    setState,
    loadError,
    loadingMessage,
    loading,
    sort,
    onLocationClick,
    onRetry,
}: Props) {
    const [open, setOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);
    useEffect(() => {
        request.current?.abort();
        setOpen(false);
    }, [state.cityId, loading]);

    const movies = state.availableMovies
        .filter(
            (movie) =>
                (!state.filter.genre ||
                    movie.genres?.includes(state.filter.genre)) &&
                normalized(movie.title).includes(
                    normalized(state.filter.title.trim()),
                ),
        )
        .sort((a, b) => {
            if (sort === 'title')
                return a.title.localeCompare(b.title, 'pt-BR');
            if (sort === 'release')
                return (
                    (Date.parse(String(b.premiereDate?.localDate)) || 0) -
                    (Date.parse(String(a.premiereDate?.localDate)) || 0)
                );
            return (
                (parseFloat(b.imdbRating || '') || 0) -
                (parseFloat(a.imdbRating || '') || 0)
            );
        });
    const visibleMovies = movies.slice(0, state.cardsToShow + state.cardFirst);

    function closeDetails() {
        request.current?.abort();
        setOpen(false);
    }

    async function selectMovie(movie: RatedMovie) {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setOpen(true);
        setDetailsLoading(true);
        setSessionError(false);
        setState((previous) => ({
            ...previous,
            selectedMovie: movie,
            movie: movie.title,
            originalMovie: movie.originalTitle || movie.title,
            movieId: movie.id,
            movieInfo: {},
            trailer: movie.trailers || [],
            sessionTable: [],
            sessionsInfo: [],
            sessionInfoIsReady: false,
        }));

        async function read(url: string) {
            const response = await fetch(url, {
                signal: AbortSignal.any([
                    controller.signal,
                    AbortSignal.timeout(15000),
                ]),
            });
            if (!response.ok) throw new Error('Dados indisponíveis');
            return response.json();
        }

        const [rating, sessions] = await Promise.allSettled([
            getMovieRating(movie.originalTitle || movie.title),
            read(
                `/api/session?${new URLSearchParams({ movieId: movie.id, cityId: state.cityId })}`,
            ).then((data) => {
                if (!Array.isArray(data))
                    throw new Error('Sessões indisponíveis');
                return data;
            }),
        ]);
        if (controller.signal.aborted) return;
        const sessionData =
            sessions.status === 'fulfilled' ? sessions.value : [];
        const ratingResult =
            rating.status === 'fulfilled'
                ? movieRatingResult(rating.value)
                : Number(movie.imdbRating) > 0
                  ? {
                        imdbRating: movie.imdbRating,
                        ratingStatus: movie.ratingStatus,
                    }
                  : movieRatingResult(null);
        const { latitude, longitude } = state.currentGeographicPosition;
        const sessionTable: SessionRow[] = (sessionData[0]?.theaters || []).map(
            (theater: any) => {
                const theaterSessions = (theater.rooms || []).flatMap(
                    (room: any) => room.sessions || [],
                );
                const times = Array.from(
                    new Set<string>(
                        theaterSessions
                            .map((session: any) => session.date?.hour)
                            .filter(Boolean),
                    ),
                ).sort();
                const prices = theaterSessions
                    .map((session: any) => Number(session.price))
                    .filter(
                        (price: number) => Number.isFinite(price) && price > 0,
                    );
                return {
                    name: theater.name,
                    times,
                    neighborhood: theater.neighborhood || '',
                    price: prices.length ? Math.min(...prices) : undefined,
                    distance:
                        Number.isFinite(latitude) &&
                        Number.isFinite(longitude) &&
                        theater.geolocation?.lat != null &&
                        theater.geolocation?.lng != null
                            ? distanceCalculator(
                                  latitude,
                                  longitude,
                                  Number(theater.geolocation.lat),
                                  Number(theater.geolocation.lng),
                                  'K',
                              )
                            : undefined,
                };
            },
        );
        setState((previous) => ({
            ...previous,
            selectedMovie: { ...movie, ...ratingResult },
            availableMovies: previous.availableMovies.map((entry) =>
                entry.id === movie.id ? { ...entry, ...ratingResult } : entry,
            ),
            movieInfo:
                rating.status === 'fulfilled' &&
                rating.value?.Response !== 'False'
                    ? rating.value || {}
                    : {},
            sessionsInfo: sessionData,
            sessionTable,
            sessionInfoIsReady: true,
        }));
        setSessionError(sessions.status === 'rejected');
        setDetailsLoading(false);
    }

    return (
        <>
            {loadError ? (
                <div className="catalog-message error-state" role="alert">
                    <span className="empty-icon">
                        <PlaceOutlined />
                    </span>
                    <h3>Vamos encontrar outro caminho?</h3>
                    <p>{loadError}</p>
                    <div className="message-actions">
                        <button
                            className="button button-primary"
                            onClick={onLocationClick}
                        >
                            Escolher cidade <ArrowForwardRounded />
                        </button>
                        <button className="text-button" onClick={onRetry}>
                            Tentar novamente
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div aria-busy="true" aria-label={loadingMessage}>
                    <div className="loading-caption" role="status">
                        <span className="live-dot" />
                        {loadingMessage}
                    </div>
                    <div className="movie-grid">
                        {Array.from({ length: 5 }, (_, index) => (
                            <div className="movie-skeleton" key={index}>
                                <Skeleton
                                    variant="rounded"
                                    className="poster-skeleton"
                                />
                                <Skeleton width="80%" height={30} />
                                <Skeleton width="50%" height={22} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : !state.movieCardsAreReady ? (
                <div className="welcome-state">
                    <div className="welcome-heading">
                        <span className="empty-icon">
                            <LocalMoviesOutlined />
                        </span>
                        <div>
                            <h3>Seu próximo “que filme bom!” começa aqui.</h3>
                            <p>
                                Escolha sua cidade acima e deixe o resto com a
                                gente.
                            </p>
                        </div>
                    </div>
                    <div className="discovery-steps">
                        <div>
                            <span className="step-number">01</span>
                            <div>
                                <strong>Encontre seu filme</strong>
                                <p>Explore o que está em cartaz.</p>
                            </div>
                        </div>
                        <div>
                            <span className="step-number">02</span>
                            <div>
                                <strong>Escolha sem dúvida</strong>
                                <p>Confira notas, sinopses e trailers.</p>
                            </div>
                        </div>
                        <div>
                            <span className="step-number">03</span>
                            <div>
                                <strong>Partiu cinema</strong>
                                <p>Descubra onde e quando assistir.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : movies.length === 0 ? (
                <div className="catalog-message" role="status">
                    <span className="empty-icon">
                        <SearchOffRounded />
                    </span>
                    <h3>
                        {state.availableMovies.length
                            ? 'Esse filme ainda não apareceu por aqui.'
                            : 'Nenhum filme em cartaz por aqui.'}
                    </h3>
                    <p>
                        {state.availableMovies.length
                            ? 'Experimente outro título ou explore todos os gêneros.'
                            : 'Tente uma cidade próxima para descobrir outras sessões.'}
                    </p>
                    <button
                        className="button button-primary"
                        onClick={
                            state.availableMovies.length
                                ? () =>
                                      setState((previous) => ({
                                          ...previous,
                                          filter: { title: '', genre: '' },
                                          cardFirst: 0,
                                      }))
                                : onLocationClick
                        }
                    >
                        {state.availableMovies.length
                            ? 'Limpar filtros'
                            : 'Escolher outra cidade'}{' '}
                        <ArrowForwardRounded />
                    </button>
                </div>
            ) : (
                <>
                    <p className="results-caption" role="status">
                        {movies.length}{' '}
                        {movies.length === 1
                            ? 'filme para descobrir'
                            : 'filmes para descobrir'}
                        <span>Escolha um pôster e encontre sua sessão.</span>
                    </p>
                    <div className="movie-grid">
                        {visibleMovies.map((movie) => (
                            <button
                                className="movie-card"
                                key={movie.id}
                                onClick={() => selectMovie(movie)}
                                aria-label={`Ver detalhes e sessões de ${movie.title}`}
                            >
                                <div className="poster-wrap">
                                    <span className="poster-fallback">
                                        <LocalMoviesOutlined />
                                        <span>{movie.title}</span>
                                    </span>
                                    {movie.images?.[0]?.url && (
                                        <img
                                            className="movie-poster"
                                            src={movie.images[0].url}
                                            alt={`Pôster de ${movie.title}`}
                                            {...{ loading: 'lazy' }}
                                            onError={(event) => {
                                                event.currentTarget.style.display =
                                                    'none';
                                            }}
                                        />
                                    )}
                                    {parseFloat(movie.imdbRating || '') > 0 && (
                                        <span className="rating-badge">
                                            <StarRounded />
                                            {movie.imdbRating}
                                            <small>IMDb</small>
                                        </span>
                                    )}
                                    {!(parseFloat(movie.imdbRating || '') > 0) && (
                                        <span className="rating-badge rating-badge-muted">
                                            {movieRatingStatusText(movie.ratingStatus)}
                                        </span>
                                    )}
                                    {movie.inPreSale && (
                                        <span className="presale-badge">
                                            Pré-venda
                                        </span>
                                    )}
                                    <span className="poster-action">
                                        Ver sessões <ArrowForwardRounded />
                                    </span>
                                </div>
                                <div className="movie-card-copy">
                                    <h3>{movie.title}</h3>
                                    <p>
                                        {movie.genres
                                            ?.slice(0, 2)
                                            .join(' · ') || 'Cinema'}
                                        {Number(movie.duration) > 0 && (
                                            <>
                                                <span className="metadata-dot">
                                                    {' '}
                                                    ·{' '}
                                                </span>
                                                {movie.duration} min
                                            </>
                                        )}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="catalog-bottom">
                        <span>
                            Mostrando {visibleMovies.length} de {movies.length}{' '}
                            filmes
                        </span>
                        {visibleMovies.length < movies.length && (
                            <button
                                className="button button-outline"
                                onClick={() =>
                                    setState((previous) => ({
                                        ...previous,
                                        cardFirst:
                                            previous.cardFirst +
                                            previous.cardsToShow,
                                    }))
                                }
                            >
                                Mais filmes <ArrowForwardRounded />
                            </button>
                        )}
                        <span>
                            <StarRounded /> Avaliações do IMDb
                        </span>
                    </div>
                </>
            )}
            <Dialog
                open={open}
                onClose={closeDetails}
                maxWidth="lg"
                fullWidth
                aria-labelledby="movie-detail-title"
                className="movie-dialog"
            >
                <div className="dialog-topbar">
                    <span>
                        <ConfirmationNumberOutlined /> SUA PRÓXIMA SESSÃO
                    </span>
                    <IconButton
                        onClick={closeDetails}
                        aria-label="Fechar detalhes"
                    >
                        <CloseRounded />
                    </IconButton>
                </div>
                {state.selectedMovie && (
                    <>
                        <MovieInfo state={state} />
                        <div className="dialog-sessions">
                            {detailsLoading ? (
                                <div className="session-loading" role="status">
                                    <Skeleton height={36} width="45%" />
                                    <Skeleton height={70} />
                                    <Skeleton height={70} />
                                    <span>
                                        Buscando sessões e avaliações...
                                    </span>
                                </div>
                            ) : sessionError ? (
                                <Alert
                                    severity="warning"
                                    action={
                                        <Button
                                            color="inherit"
                                            size="small"
                                            onClick={() =>
                                                selectMovie(
                                                    state.selectedMovie!,
                                                )
                                            }
                                        >
                                            Tentar novamente
                                        </Button>
                                    }
                                >
                                    Não foi possível carregar os horários agora.
                                </Alert>
                            ) : (
                                <SessionInfo
                                    state={state}
                                    setState={setState}
                                />
                            )}
                        </div>
                    </>
                )}
            </Dialog>
        </>
    );
}
