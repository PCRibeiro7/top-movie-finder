import styles from './MovieDetails.module.css';
import { CircularProgress } from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import LocalMoviesOutlined from '@mui/icons-material/LocalMoviesOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { movieRatingStatusText } from '../../shared/ratings';
import type { MovieDetails } from './model';

export default function MovieInfo({
    movie,
    ratingLoading,
}: {
    movie: MovieDetails;
    ratingLoading: boolean;
}) {
    const { score: rating, durationText: duration, poster, trailer, imdbUrl } = movie;
    return (
        <section className={styles['movie-details']}>
            <div className={styles['detail-poster']}>
                <span className="poster-fallback">
                    <LocalMoviesOutlined />
                </span>
                {poster && (
                    <img
                        src={poster}
                        alt={`Pôster de ${movie.title}`}
                        onError={(event) => {
                            event.currentTarget.style.display = 'none';
                        }}
                    />
                )}
            </div>
            <div className={styles['detail-copy']}>
                <div className="eyebrow">SEU PRÓXIMO FILME?</div>
                <h2 id="movie-detail-title">{movie.title}</h2>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                    <p className={styles['original-title']}>
                        {movie.originalTitle}
                    </p>
                )}
                <div className={styles['detail-metadata']}>
                    {Number.isFinite(rating) && rating > 0 && (
                        <span className={styles['detail-rating']}>
                            <StarRounded />
                            {rating}
                            <small>/ 10 IMDb</small>
                        </span>
                    )}
                    {!(Number.isFinite(rating) && rating > 0) && (
                        <span
                            role="status"
                            aria-busy={ratingLoading}
                            className={
                                ratingLoading
                                    ? styles['detail-rating-pending']
                                    : undefined
                            }
                        >
                            {ratingLoading && (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                    aria-hidden="true"
                                    className={styles['rating-loading-indicator']}
                                />
                            )}
                            {movieRatingStatusText(
                                ratingLoading ? undefined : movie.ratingStatus,
                            )}
                        </span>
                    )}
                    {imdbUrl && (
                        <a
                            className={styles['imdb-link']}
                            href={imdbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver ${movie.title} no IMDb (abre em nova aba)`}
                        >
                            Ver no IMDb <OpenInNewRounded />
                        </a>
                    )}
                    {Number(movie.metascore) > 0 && (
                        <span>{movie.metascore} Metascore</span>
                    )}
                    {duration && (
                        <span>
                            <AccessTimeRounded />
                            {duration}
                        </span>
                    )}
                    {movie.contentRating && (
                        <span className={styles['content-rating']}>
                            {movie.contentRating}
                        </span>
                    )}
                </div>
                <div className={styles['detail-genres']}>
                    {(movie.genres || []).map((genre) => (
                        <span key={genre}>{genre}</span>
                    ))}
                </div>
                <p className={styles['synopsis']}>{movie.synopsis}</p>
                {movie.director && (
                    <p className={styles['detail-credit']}>
                        <strong>Direção</strong> {movie.director}
                    </p>
                )}
                {movie.cast && (
                    <p className={styles['detail-credit']}>
                        <strong>Elenco</strong> {movie.cast}
                    </p>
                )}
                {movie.awards && movie.awards !== 'N/A' && (
                    <p className={styles['detail-credit']}>
                        <strong>Prêmios</strong> {movie.awards}
                    </p>
                )}
                {trailer && (
                    <a
                        className={[
                            'button',
                            'button-outline',
                            styles['trailer-button'],
                        ].join(' ')}
                        href={trailer}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Assistir ao trailer de ${movie.title} (abre em nova aba)`}
                    >
                        <PlayArrowRounded /> Assistir ao trailer
                    </a>
                )}
            </div>
        </section>
    );
}
