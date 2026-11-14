import styles from './MovieDetails.module.css';
import { Alert, Button, Dialog, IconButton, Skeleton } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import MovieInfo from './MovieInfo';
import SessionInfo from './SessionInfo';
import type { useMovieDetails } from './useMovieDetails';

export default function MovieDetailsDialog({
    details,
}: {
    details: ReturnType<typeof useMovieDetails>;
}) {
    const { movie } = details;
    return (
        <Dialog
            open={Boolean(movie)}
            onClose={details.close}
            maxWidth="lg"
            fullWidth
            aria-labelledby="movie-detail-title"
            className={styles['movie-dialog']}
        >
            <div className={styles['dialog-topbar']}>
                <span>
                    <ConfirmationNumberOutlined /> SUA PRÓXIMA SESSÃO
                </span>
                <IconButton
                    onClick={details.close}
                    aria-label="Fechar detalhes"
                >
                    <CloseRounded />
                </IconButton>
            </div>
            {movie && (
                <>
                    <MovieInfo
                        movie={movie}
                        ratingLoading={details.ratingLoading}
                    />
                    <div className={styles['dialog-sessions']}>
                        {details.sessionStatus === 'loading' ? (
                            <div
                                className={styles['session-loading']}
                                role="status"
                            >
                                <Skeleton height={36} width="45%" />
                                <Skeleton height={70} />
                                <Skeleton height={70} />
                                <span>Buscando sessões...</span>
                            </div>
                        ) : details.sessionStatus === 'error' ? (
                            <Alert
                                severity="warning"
                                action={
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={details.retry}
                                    >
                                        Tentar novamente
                                    </Button>
                                }
                            >
                                Não foi possível carregar os horários agora.
                            </Alert>
                        ) : (
                            <SessionInfo
                                rows={details.sessions.rows}
                                date={details.sessions.date}
                                movieTitle={movie.title}
                                ticketUrl={movie.siteURL}
                                hasCoordinates={details.hasCoordinates}
                                sort={details.sort}
                                onSort={details.onSort}
                            />
                        )}
                    </div>
                </>
            )}
        </Dialog>
    );
}
