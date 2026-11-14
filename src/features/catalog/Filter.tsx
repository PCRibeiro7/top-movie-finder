import styles from './Catalog.module.css';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import type { CatalogFilter } from './model';

type Props = {
    value: CatalogFilter;
    genres: string[];
    onChange: (value: CatalogFilter) => void;
};

export default function Filter({ value, genres, onChange }: Props) {
    return (
        <div className={styles['filter-bar']}>
            <div className={styles['search-field']}>
                <SearchRounded />
                <input
                    aria-label="Buscar filme pelo título"
                    placeholder="Qual filme você quer ver?"
                    value={value.title}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            title: event.target.value,
                        })
                    }
                />
                {value.title && (
                    <button
                        onClick={() => onChange({ ...value, title: '' })}
                        aria-label="Limpar busca"
                    >
                        <CloseRounded />
                    </button>
                )}
            </div>
            <div
                className={styles['genre-list']}
                role="group"
                aria-label="Filtrar por gênero"
            >
                {['', ...genres].map((genre) => (
                    <button
                        key={genre}
                        aria-pressed={value.genre === genre}
                        className={[
                            styles['genre-chip'],
                            value.genre === genre ? styles.active : '',
                        ].join(' ')}
                        onClick={() =>
                            onChange({
                                ...value,
                                genre: value.genre === genre ? '' : genre,
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
