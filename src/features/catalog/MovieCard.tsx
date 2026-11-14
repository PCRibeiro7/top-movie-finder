import styles from './Catalog.module.css';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LocalMoviesOutlined from '@mui/icons-material/LocalMoviesOutlined';
import StarRounded from '@mui/icons-material/StarRounded';
import type { RatedMovie } from '../../shared/movies';
import { movieRatingStatusText } from '../../shared/ratings';

export default function MovieCard({
    movie,
    onSelect,
}: {
    movie: RatedMovie;
    onSelect: (movieId: string) => void;
}) {
    return (
        <button
            className={styles['movie-card']}
            onClick={() => onSelect(movie.id)}
            aria-label={`Ver detalhes e sessões de ${movie.title}`}
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
                {parseFloat(movie.imdbRating || '') > 0 && (
                    <span className={styles['rating-badge']}>
                        <StarRounded />
                        {movie.imdbRating}
                        <small>IMDb</small>
                    </span>
                )}
                {!(parseFloat(movie.imdbRating || '') > 0) && (
                    <span
                        className={[
                            styles['rating-badge'],
                            styles['rating-badge-muted'],
                        ].join(' ')}
                    >
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
    );
}
