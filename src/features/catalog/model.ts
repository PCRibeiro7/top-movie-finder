import type { RatedMovie } from '../../shared/movies';

export const CATALOG_PAGE_SIZE = 10;
export type MovieSort = 'rating' | 'title' | 'release';
export type CatalogFilter = { title: string; genre: string };

function titleKey(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

export function selectCatalogMovies(
    movies: RatedMovie[],
    filter: CatalogFilter,
    sort: MovieSort,
) {
    return movies
        .filter(
            (movie) =>
                (!filter.genre || movie.genres?.includes(filter.genre)) &&
                titleKey(movie.title).includes(titleKey(filter.title.trim())),
        )
        .sort((first, second) => {
            if (sort === 'title')
                return first.title.localeCompare(second.title, 'pt-BR');
            if (sort === 'release') {
                return (
                    (Date.parse(second.premiereDate?.localDate || '') || 0) -
                    (Date.parse(first.premiereDate?.localDate || '') || 0)
                );
            }
            return (
                (Number(second.imdbRating) || 0) -
                (Number(first.imdbRating) || 0)
            );
        });
}

export function catalogGenres(movies: RatedMovie[], ready: boolean): string[] {
    return ready
        ? [...new Set(movies.flatMap((movie) => movie.genres || []))].sort(
              (first, second) => first.localeCompare(second, 'pt-BR'),
          )
        : [
              'Ação',
              'Aventura',
              'Animação',
              'Comédia',
              'Drama',
              'Terror',
              'Romance',
              'Suspense',
          ];
}
