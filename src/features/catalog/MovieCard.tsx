import styles from './Catalog.module.css';
import { useId } from 'react';
import { CircularProgress } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LocalMoviesOutlined from '@mui/icons-material/LocalMoviesOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import type { RatedMovie } from '../../shared/movies';
import {
    isMovieRatingPending,
    movieRatingStatusText,
} from '../../shared/ratings';

export default function MovieCard({
    movie,
    onSelect,
}: {
    movie: RatedMovie;
    onSelect: (movieId: string) => void;
}) {
    const ratingId = useId();
    const score = Number(movie.imdbRating);
    const hasRating = Number.isFinite(score) && score > 0 && score <= 10;
    const ratingPending = isMovieRatingPending(movie);
    return (
        <article className={styles['movie-card']}>
            <button
                className={styles['movie-card-button']}
                onClick={() => onSelect(movie.id)}
                aria-label={`Ver detalhes e sessões de ${movie.title}`}
                aria-describedby={ratingId}
            >
                <div className={styles['poster-wrap']}>
                    <span className="poster-fallback">
                        <LocalMoviesOutlined />
                        <span>{movie.title}</span>
                    </span>
                    {movie.images?.[0]?.url && (
                        <img
                            className={styles['movie-poster']}
                            src={movie.images[0].url}
                            alt={`Pôster de ${movie.title}`}
                            {...{ loading: 'lazy' }}
                            onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }}
                        />
                    )}
                    {hasRating && (
                        <span id={ratingId} className={styles['rating-badge']}>
                            <StarRounded />
                            {movie.imdbRating}
                            <small>IMDb</small>
                        </span>
                    )}
                    {!hasRating && (
                        <span
                            id={ratingId}
                            aria-busy={ratingPending}
                            className={[
                                styles['rating-badge'],
                                styles['rating-badge-muted'],
                                ratingPending ? styles['rating-badge-pending'] : '',
                            ].join(' ')}
                        >
                            {ratingPending && (
                                <CircularProgress
                                    size={14}
                                    color="inherit"
                                    aria-hidden="true"
                                    className={styles['rating-loading-indicator']}
                                />
                            )}
                            {movieRatingStatusText(movie.ratingStatus)}
                        </span>
                    )}
                    {movie.inPreSale && (
                        <span className={styles['presale-badge']}>Pré-venda</span>
                    )}
                    <span className={styles['poster-action']}>
                        Ver sessões <ArrowForwardRounded />
                    </span>
                </div>
                <div className={styles['movie-card-copy']}>
                    <h3>{movie.title}</h3>
                    <p>
                        {movie.genres?.slice(0, 2).join(' · ') || 'Cinema'}
                        {Number(movie.duration) > 0 && (
                            <>
                                <span> · </span>
                                {movie.duration} min
                            </>
                        )}
                    </p>
                </div>
            </button>
            {movie.imdbID && (
                <a
                    className={styles['imdb-link']}
                    href={`https://www.imdb.com/title/${movie.imdbID}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ver ${movie.title} no IMDb (abre em nova aba)`}
                >
                    Ver no IMDb <OpenInNewRounded />
                </a>
            )}
        </article>
    );
}
