import styles from './MovieAppBar.module.css';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';

type Props = { location: string; onLocationClick: () => void };

const MovieAppBar = ({ location, onLocationClick }: Props) => (
    <header className={styles['site-header']}>
        <div className={['page-width', styles['header-inner']].join(' ')}>
            <a
                className={styles['brand']}
                href="#inicio"
                aria-label="Vai ver o quê? Início"
            >
                <span className={styles['brand-symbol']}>
                    <ConfirmationNumberOutlined />
                </span>
                <span>
                    vai ver o quê
                    <span className={styles['brand-question']}>?</span>
                </span>
            </a>
            <nav
                className={styles['header-nav']}
                aria-label="Navegação principal"
            >
                <a href="#em-cartaz">
                    Em cartaz <ArrowOutwardRounded />
                </a>
                <span className={styles['header-divider']} />
                <button
                    className={styles['location-nav']}
                    onClick={onLocationClick}
                    aria-label={
                        location
                            ? `Mudar cidade: ${location}`
                            : 'Escolher cidade'
                    }
                >
                    <PlaceOutlined />
                    <span>{location || 'Escolha sua cidade'}</span>
                </button>
            </nav>
        </div>
    </header>
);

export default MovieAppBar;
