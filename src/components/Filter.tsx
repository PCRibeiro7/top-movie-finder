import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Dispatch, SetStateAction } from 'react';
import type { HomeState } from '../../pages';

type Props = {
    state: HomeState;
    setState: Dispatch<SetStateAction<HomeState>>;
};

export default function Filter({ state, setState }: Props) {
    const genres: string[] = state.movieCardsAreReady
        ? Array.from(
              new Set<string>(
                  state.availableMovies.flatMap((movie) => movie.genres || []),
              ),
          ).sort((a, b) => a.localeCompare(b, 'pt-BR'))
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

    function updateFilter(filter: HomeState['filter']) {
        setState((previous) => ({ ...previous, filter, cardFirst: 0 }));
    }

    return (
        <div className="filter-bar">
            <div className="search-field">
                <SearchRounded />
                <input
                    aria-label="Buscar filme pelo título"
                    placeholder="Qual filme você quer ver?"
                    value={state.filter.title}
                    onChange={(event) =>
                        updateFilter({
                            ...state.filter,
                            title: event.target.value,
                        })
                    }
                />
                {state.filter.title && (
                    <button
                        onClick={() =>
                            updateFilter({ ...state.filter, title: '' })
                        }
                        aria-label="Limpar busca"
                    >
                        <CloseRounded />
                    </button>
                )}
            </div>
            <div
                className="genre-list"
                role="group"
                aria-label="Filtrar por gênero"
            >
                {['', ...genres].map((genre) => (
                    <button
                        key={genre}
                        aria-pressed={state.filter.genre === genre}
                        className={`genre-chip ${state.filter.genre === genre ? 'active' : ''}`}
                        onClick={() =>
                            updateFilter({
                                ...state.filter,
                                genre:
                                    state.filter.genre === genre ? '' : genre,
                            })
                        }
                    >
                        {genre || 'Todos'}
                    </button>
                ))}
            </div>
        </div>
    );
}
