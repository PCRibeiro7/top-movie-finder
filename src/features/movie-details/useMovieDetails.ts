import { useEffect, useRef, useState } from 'react';
import { fetchJson } from '../../shared/http';
import type { CatalogLocation } from '../../shared/location';
import type { RatedMovie } from '../../shared/movies';
import type { OmdbMovieRating } from '../../shared/ratingTypes';
import { movieRatingLookup, movieRatingResult } from '../../shared/ratings';
import { parseSessionDays, type SessionDay } from '../../shared/sessions';
import type { RatingResult } from '../catalog/service';
import { getMovieRating } from '../ratings/client';
import { movieDetails, sessionPresentation, type SessionSort } from './model';

type Props = {
    movies: RatedMovie[];
    location: CatalogLocation | null;
    attemptId: number;
    onRating: (
        attemptId: number,
        movieId: string,
        result: RatingResult,
    ) => void;
};

export function useMovieDetails({
    movies,
    location,
    attemptId,
    onRating,
}: Props) {
    const [selection, setSelection] = useState<{
        movieId: string;
        attemptId: number;
        id: number;
        hasRating: boolean;
    } | null>(null);
    const [info, setInfo] = useState<OmdbMovieRating>();
    const [days, setDays] = useState<SessionDay[]>([]);
    const [ratingLoading, setRatingLoading] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<
        'loading' | 'ready' | 'error'
    >('loading');
    const [sort, setSort] = useState<SessionSort>({
        column: 'distance',
        direction: 'asc',
    });
    const controller = useRef<AbortController | null>(null);
    const sequence = useRef(0);
    const movie =
        selection?.attemptId === attemptId
            ? movies.find((entry) => entry.id === selection.movieId)
            : undefined;
    const movieId = movie?.id;
    const ratingTitle = movie?.title;
    const originalTitle = movie?.originalTitle;
    const premiereDate = movie?.premiereDate?.localDate;
    const director = movie?.director;
    const duration = movie?.duration;

    function select(movieId: string) {
        controller.current?.abort();
        setInfo(undefined);
        setDays([]);
        setRatingLoading(true);
        setSessionStatus('loading');
        setSelection({
            movieId,
            attemptId,
            id: ++sequence.current,
            hasRating:
                Number(
                    movies.find((entry) => entry.id === movieId)?.imdbRating,
                ) > 0,
        });
    }

    function close() {
        controller.current?.abort();
        setSelection(null);
    }

    useEffect(() => {
        if (!selection || !movieId || !ratingTitle || !location) return;
        const request = new AbortController();
        controller.current = request;
        const { signal } = request;

        // Rating requests are shared: cancel the subscription, not the cache fill.
        void getMovieRating(
            movieRatingLookup({
                title: ratingTitle,
                originalTitle,
                premiereDate: { localDate: premiereDate },
                director,
                duration,
            }),
        )
            .then((rating) => {
                if (signal.aborted) return;
                setInfo(rating.Response === 'True' ? rating : undefined);
                onRating(attemptId, movieId, movieRatingResult(rating));
            })
            .catch(() => {
                if (!signal.aborted && !selection.hasRating) {
                    onRating(attemptId, movieId, movieRatingResult(null));
                }
            })
            .finally(() => {
                if (!signal.aborted) setRatingLoading(false);
            });

        void fetchJson(
            `/api/session?${new URLSearchParams({ movieId, cityId: location.cityId })}`,
            signal,
        )
            .then(parseSessionDays)
            .then((sessions) => {
                if (signal.aborted) return;
                setDays(sessions);
                setSessionStatus('ready');
            })
            .catch(() => {
                if (!signal.aborted) setSessionStatus('error');
            });
        return () => request.abort();
    }, [
        selection,
        movieId,
        ratingTitle,
        originalTitle,
        premiereDate,
        director,
        duration,
        location,
        attemptId,
        onRating,
    ]);

    return {
        movie: movie ? movieDetails(movie, info) : null,
        sessions: sessionPresentation(days, location?.coordinates || null),
        hasCoordinates: Boolean(location?.coordinates),
        ratingLoading,
        sessionStatus,
        sort,
        onSort: (column: SessionSort['column']) =>
            setSort((previous) => ({
                column,
                direction:
                    previous.column === column && previous.direction === 'asc'
                        ? 'desc'
                        : 'asc',
            })),
        select,
        close,
        retry: () => {
            if (movieId) select(movieId);
        },
    };
}
