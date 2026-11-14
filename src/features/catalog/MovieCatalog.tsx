import styles from './Catalog.module.css';
import { Skeleton } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LocalMoviesOutlined from '@mui/icons-material/LocalMoviesOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import type { RatedMovie } from '../../shared/movies';
import MovieCard from './MovieCard';

type Props = {
    movies: RatedMovie[];
    totalCount: number;
    visibleCount: number;
    ready: boolean;
    loading: boolean;
    error: string | null;
    message: string;
    onSelect: (movieId: string) => void;
    onClearFilters: () => void;
    onLoadMore: () => void;
    onLocationClick: () => void;
    onRetry: () => void;
};

export default function MovieCatalog({
    movies,
    totalCount,
    visibleCount,
    ready,
    loading,
    error,
    message,
    onSelect,
    onClearFilters,
    onLoadMore,
    onLocationClick,
    onRetry,
}: Props) {
    const visibleMovies = movies.slice(0, visibleCount);
    return (
        <>
            {error ? (
                <div className={styles['catalog-message']} role="alert">
                    <span className={styles['empty-icon']}>
                        <PlaceOutlined />
                    </span>
                    <h3>Vamos encontrar outro caminho?</h3>
                    <p>{error}</p>
                    <div className={styles['message-actions']}>
                        <button
                            className="button button-primary"
                            onClick={onLocationClick}
                        >
                            Escolher cidade <ArrowForwardRounded />
                        </button>
                        <button
                            className={styles['text-button']}
                            onClick={onRetry}
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div aria-busy="true" aria-label={message}>
                    <div className={styles['loading-caption']} role="status">
                        <span className="live-dot" />
                        {message}
                    </div>
                    <div className={styles['movie-grid']}>
                        {Array.from({ length: 5 }, (_, index) => (
                            <div
                                className={styles['movie-skeleton']}
                                key={index}
                            >
                                <Skeleton
                                    variant="rounded"
                                    className={styles['poster-skeleton']}
                                />
                                <Skeleton width="80%" height={30} />
                                <Skeleton width="50%" height={22} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : !ready ? (
                <div className={styles['welcome-state']}>
                    <div className={styles['welcome-heading']}>
                        <span className={styles['empty-icon']}>
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
                    <div className={styles['discovery-steps']}>
                        <div>
                            <span className={styles['step-number']}>01</span>
                            <div>
                                <strong>Encontre seu filme</strong>
                                <p>Explore o que está em cartaz.</p>
                            </div>
                        </div>
                        <div>
                            <span className={styles['step-number']}>02</span>
                            <div>
                                <strong>Escolha sem dúvida</strong>
                                <p>Confira notas, sinopses e trailers.</p>
                            </div>
                        </div>
                        <div>
                            <span className={styles['step-number']}>03</span>
                            <div>
                                <strong>Partiu cinema</strong>
                                <p>Descubra onde e quando assistir.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : movies.length === 0 ? (
                <div className={styles['catalog-message']} role="status">
                    <span className={styles['empty-icon']}>
                        <SearchOffRounded />
                    </span>
                    <h3>
                        {totalCount
                            ? 'Esse filme ainda não apareceu por aqui.'
                            : 'Nenhum filme em cartaz por aqui.'}
                    </h3>
                    <p>
                        {totalCount
                            ? 'Experimente outro título ou explore todos os gêneros.'
                            : 'Tente uma cidade próxima para descobrir outras sessões.'}
                    </p>
                    <button
                        className="button button-primary"
                        onClick={totalCount ? onClearFilters : onLocationClick}
                    >
                        {totalCount
                            ? 'Limpar filtros'
                            : 'Escolher outra cidade'}{' '}
                        <ArrowForwardRounded />
                    </button>
                </div>
            ) : (
                <>
                    <p className={styles['results-caption']} role="status">
                        {movies.length}{' '}
                        {movies.length === 1
                            ? 'filme para descobrir'
                            : 'filmes para descobrir'}
                        <span>Escolha um pôster e encontre sua sessão.</span>
                    </p>
                    <div className={styles['movie-grid']}>
                        {visibleMovies.map((movie) => (
                            <MovieCard
                                key={movie.id}
                                movie={movie}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                    <div className={styles['catalog-bottom']}>
                        <span>
                            Mostrando {visibleMovies.length} de {movies.length}{' '}
                            filmes
                        </span>
                        {visibleMovies.length < movies.length && (
                            <button
                                className="button button-outline"
                                onClick={onLoadMore}
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
        </>
    );
}
