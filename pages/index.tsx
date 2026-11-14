import styles from '../src/styles/Home.module.css';
import { useEffect, useRef, useState } from 'react';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import Filter from '../src/features/catalog/Filter';
import LocationPicker from '../src/features/location/LocationPicker';
import MovieAppBar from '../src/components/MovieAppBar';
import MovieCatalog from '../src/features/catalog/MovieCatalog';
import MovieDetailsDialog from '../src/features/movie-details/MovieDetailsDialog';
import { useMovieCatalog } from '../src/features/catalog/useMovieCatalog';
import { useMovieDetails } from '../src/features/movie-details/useMovieDetails';
import {
    catalogGenres,
    selectCatalogMovies,
    CATALOG_PAGE_SIZE,
    type CatalogFilter,
    type MovieSort,
} from '../src/features/catalog/model';

export default function Home() {
    const catalog = useMovieCatalog();
    const [filter, setFilter] = useState<CatalogFilter>({
        title: '',
        genre: '',
    });
    const [sort, setSort] = useState<MovieSort>('rating');
    const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
    const scrollToResults = useRef(false);
    const details = useMovieDetails({
        movies: catalog.movies,
        location: catalog.location,
        attemptId: catalog.attemptId,
        onRating: catalog.updateMovieRating,
    });
    const movies = selectCatalogMovies(catalog.movies, filter, sort);
    const currentLocation = catalog.location
        ? `${catalog.location.city}, ${catalog.location.state}`
        : '';

    useEffect(() => {
        setFilter({ title: '', genre: '' });
        setVisibleCount(CATALOG_PAGE_SIZE);
    }, [catalog.attemptId]);

    useEffect(() => {
        if (
            !scrollToResults.current ||
            !['ready', 'error'].includes(catalog.status)
        )
            return;
        scrollToResults.current = false;
        const frame = requestAnimationFrame(() => {
            const results = document.getElementById('em-cartaz');
            results?.focus({ preventScroll: true });
            results?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches
                    ? 'auto'
                    : 'smooth',
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [catalog.status, catalog.attemptId]);

    function focusLocation() {
        document.getElementById('city')?.focus({ preventScroll: true });
        document.getElementById('inicio')?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'auto'
                : 'smooth',
        });
    }

    return (
        <div id="inicio">
            <a className={styles['skip-link']} href="#em-cartaz">
                Pular para os filmes
            </a>
            <MovieAppBar
                location={currentLocation}
                onLocationClick={focusLocation}
            />
            <main className="page-width">
                <section
                    className={styles['hero']}
                    aria-labelledby="hero-title"
                >
                    <div className={styles['hero-copy']}>
                        <div className="eyebrow">
                            <span className="live-dot" /> PARA QUEM AMA A TELA
                            GRANDE
                        </div>
                        <h1 id="hero-title">
                            Menos indecisão.
                            <br />
                            Mais{' '}
                            <span className={styles['cinema-word']}>
                                cinema
                                <svg viewBox="0 0 360 20" aria-hidden="true">
                                    <path d="M3 14 Q165 -6 353 9" />
                                </svg>
                            </span>
                            <span className={styles['hero-period']}>.</span>
                        </h1>
                        <p>
                            O próximo filme favorito está por aí.
                            <br /> Descubra o que vale o ingresso nos cinemas
                            perto de você.
                        </p>
                        <div className={styles['hero-pills']}>
                            <span>
                                <AutoAwesomeOutlined /> Boas histórias
                            </span>
                            <span>
                                <ConfirmationNumberOutlined /> Sessões perto de
                                você
                            </span>
                        </div>
                        <a className={styles['browse-link']} href="#em-cartaz">
                            Vamos encontrar seu próximo filme{' '}
                            <ArrowDownwardRounded />
                        </a>
                        <span
                            className={styles['hero-decoration']}
                            aria-hidden="true"
                        >
                            ✳
                        </span>
                    </div>
                    <LocationPicker
                        loading={catalog.status === 'loading'}
                        location={currentLocation}
                        selectedLocation={catalog.location}
                        onCitySubmit={(city, region) => {
                            scrollToResults.current = true;
                            catalog.selectCity({ city, state: region });
                        }}
                        onLocate={() => {
                            scrollToResults.current = true;
                            catalog.locate();
                        }}
                    />
                </section>
                <section
                    className={styles['catalog']}
                    id="em-cartaz"
                    aria-labelledby="catalog-title"
                    tabIndex={-1}
                >
                    <div className={styles['catalog-heading']}>
                        <div>
                            <div
                                className={[
                                    'eyebrow',
                                    styles['section-eyebrow'],
                                ].join(' ')}
                            >
                                A PRÓXIMA BOA ESCOLHA
                            </div>
                            <div className={styles['catalog-title-row']}>
                                <h2 id="catalog-title">
                                    Em cartaz
                                    {catalog.status === 'ready' && (
                                        <span className="result-count">
                                            {catalog.movies.length}
                                        </span>
                                    )}
                                </h2>
                                <span className={styles['catalog-location']}>
                                    {currentLocation || 'Na sua cidade'}
                                </span>
                            </div>
                        </div>
                        <label className={styles['sort-control']}>
                            Ordenar por
                            <select
                                aria-label="Ordenar filmes"
                                value={sort}
                                onChange={(event) => {
                                    setSort(event.target.value as MovieSort);
                                    setVisibleCount(CATALOG_PAGE_SIZE);
                                }}
                            >
                                <option value="rating">Melhor avaliação</option>
                                <option value="title">Título: A a Z</option>
                                <option value="release">Lançamentos</option>
                            </select>
                        </label>
                    </div>
                    <Filter
                        value={filter}
                        genres={catalogGenres(
                            catalog.movies,
                            catalog.status === 'ready',
                        )}
                        onChange={(value) => {
                            setFilter(value);
                            setVisibleCount(CATALOG_PAGE_SIZE);
                        }}
                    />
                    <MovieCatalog
                        movies={movies}
                        totalCount={catalog.movies.length}
                        visibleCount={visibleCount}
                        ready={catalog.status === 'ready'}
                        loading={catalog.status === 'loading'}
                        error={catalog.error}
                        message={catalog.message}
                        onSelect={details.select}
                        onClearFilters={() => {
                            setFilter({ title: '', genre: '' });
                            setVisibleCount(CATALOG_PAGE_SIZE);
                        }}
                        onLoadMore={() =>
                            setVisibleCount(
                                (count) => count + CATALOG_PAGE_SIZE,
                            )
                        }
                        onLocationClick={focusLocation}
                        onRetry={() => {
                            scrollToResults.current = true;
                            catalog.retry();
                        }}
                    />
                </section>
            </main>
            <MovieDetailsDialog details={details} />
            <footer className={[styles['site-footer'], 'page-width'].join(' ')}>
                <span className={styles['footer-brand']}>
                    <ConfirmationNumberOutlined /> A vida fica melhor com um bom
                    filme.
                </span>
                <span>
                    Feito para quem ama cinema.{' '}
                    <span className={styles['footer-star']}>✦</span>
                </span>
            </footer>
        </div>
    );
}
