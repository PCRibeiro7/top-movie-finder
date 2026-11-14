import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';

type Props = { location: string; onLocationClick: () => void };

const MovieAppBar = ({ location, onLocationClick }: Props) => (
    <header className="site-header">
        <div className="page-width header-inner">
            <a
                className="brand"
                href="#inicio"
                aria-label="Vai ver o quê? Início"
            >
                <span className="brand-symbol">
                    <ConfirmationNumberOutlined />
                </span>
                <span>
                    vai ver o quê<span className="brand-question">?</span>
                </span>
            </a>
            <nav className="header-nav" aria-label="Navegação principal">
                <a href="#em-cartaz">
                    Em cartaz <ArrowOutwardRounded />
                </a>
                <span className="header-divider" />
                <button
                    className="location-nav"
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
