import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import LocalMoviesOutlined from '@mui/icons-material/LocalMoviesOutlined';
import type { HomeState } from '../../pages';
import { movieRatingStatusText } from '../utils/movieRatings';

export default function MovieInfo({ state }: { state: HomeState }) {
    const movie = state.selectedMovie;
    if (!movie) return null;
    const info = state.movieInfo;
    const rating = parseFloat(info.imdbRating || movie.imdbRating);
    const duration =
        Number(movie.duration) > 0
            ? `${movie.duration} min`
            : info.Runtime !== 'N/A'
              ? info.Runtime
              : '';
    const poster =
        movie.images?.[0]?.url || (info.Poster !== 'N/A' ? info.Poster : '');
    const rawTrailer = state.trailer?.[0]?.url;
    let trailer: string | undefined;
    try {
        const url = new URL(
            rawTrailer?.startsWith('http')
                ? rawTrailer
                : `https://${rawTrailer}`,
        );
        if (rawTrailer && ['https:', 'http:'].includes(url.protocol))
            trailer = url.href;
    } catch {
        /* Hide a trailer link if the provider has no valid URL. */
    }

    return (
        <section className="movie-details">
            <div className="detail-poster">
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
            <div className="detail-copy">
                <div className="eyebrow">SEU PRÓXIMO FILME?</div>
                <h2 id="movie-detail-title">{movie.title}</h2>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                    <p className="original-title">{movie.originalTitle}</p>
                )}
                <div className="detail-metadata">
                    {Number.isFinite(rating) && rating > 0 && (
                        <span className="detail-rating">
                            <StarRounded />
                            {rating}
                            <small>/ 10 IMDb</small>
                        </span>
                    )}
                    {!(Number.isFinite(rating) && rating > 0) && (
                        <span>{movieRatingStatusText(movie.ratingStatus)}</span>
                    )}
                    {Number(info.Metascore) > 0 && (
                        <span>{info.Metascore} Metascore</span>
                    )}
                    {duration && (
                        <span>
                            <AccessTimeRounded />
                            {duration}
                        </span>
                    )}
                    {movie.contentRating && (
                        <span className="content-rating">
                            {movie.contentRating}
                        </span>
                    )}
                </div>
                <div className="detail-genres">
                    {(movie.genres || []).map((genre) => (
                        <span key={genre}>{genre}</span>
                    ))}
                </div>
                <p className="synopsis">
                    {movie.synopsis ||
                        (info.Plot !== 'N/A' && info.Plot) ||
                        'A sinopse deste filme ainda não está disponível.'}
                </p>
                {movie.director && (
                    <p className="detail-credit">
                        <strong>Direção</strong> {movie.director}
                    </p>
                )}
                {movie.cast && (
                    <p className="detail-credit">
                        <strong>Elenco</strong> {movie.cast}
                    </p>
                )}
                {info.Awards && info.Awards !== 'N/A' && (
                    <p className="detail-credit">
                        <strong>Prêmios</strong> {info.Awards}
                    </p>
                )}
                {trailer && (
                    <a
                        className="button button-outline trailer-button"
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
