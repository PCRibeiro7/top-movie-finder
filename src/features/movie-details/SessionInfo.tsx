import styles from './MovieDetails.module.css';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
} from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { sortSessions, type SessionRow, type SessionSort } from './model';

type Props = {
    rows: SessionRow[];
    date: string;
    movieTitle: string;
    ticketUrl?: string | null;
    hasCoordinates: boolean;
    sort: SessionSort;
    onSort: (column: SessionSort['column']) => void;
};

export default function SessionInfo({
    rows,
    date: sessionDate,
    movieTitle,
    ticketUrl,
    hasCoordinates,
    sort,
    onSort,
}: Props) {
    const columns: { key: SessionSort['column']; label: string }[] = [
        { key: 'name', label: 'Cinema' },
        { key: 'times', label: 'Horários' },
        { key: 'distance', label: 'Distância' },
        { key: 'price', label: 'A partir de' },
    ];
    const theaters = sortSessions(rows, sort);
    const hasTicketUrl = ticketUrl && /^https?:\/\//.test(ticketUrl);
    return (
        <section aria-labelledby="sessions-title">
            <div className={styles['sessions-heading']}>
                <div>
                    <h3 id="sessions-title">
                        Encontre sua sessão
                        <span className="result-count">{theaters.length}</span>
                    </h3>
                    <p>
                        {sessionDate && (
                            <>
                                <strong>{sessionDate}</strong> ·{' '}
                            </>
                        )}
                        Confira a programação e escolha o melhor horário.
                    </p>
                </div>
                {hasTicketUrl && (
                    <a
                        className="button button-primary"
                        href={ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Ver ingressos (abre em nova aba)"
                    >
                        Ver ingressos <ArrowOutwardRounded />
                    </a>
                )}
            </div>
            {theaters.length ? (
                <>
                    <Table
                        className={styles['sessions-table']}
                        aria-label={`Sessões de ${movieTitle}`}
                    >
                        <TableHead>
                            <TableRow>
                                {columns.map(({ key, label }) => (
                                    <TableCell key={key}>
                                        <TableSortLabel
                                            active={sort.column === key}
                                            direction={
                                                sort.direction === 'asc'
                                                    ? 'asc'
                                                    : 'desc'
                                            }
                                            onClick={() => onSort(key)}
                                        >
                                            {label}
                                        </TableSortLabel>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {theaters.map((theater, index) => (
                                <TableRow key={`${theater.name}-${index}`}>
                                    <TableCell component="th" scope="row">
                                        <strong>{theater.name}</strong>
                                        {theater.neighborhood && (
                                            <span
                                                className={
                                                    styles[
                                                        'theater-neighborhood'
                                                    ]
                                                }
                                            >
                                                <PlaceOutlined />
                                                {theater.neighborhood}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell data-label="Horários">
                                        <div
                                            className={styles['session-times']}
                                        >
                                            {theater.times.length ? (
                                                theater.times.map((time) => (
                                                    <span key={time}>
                                                        {time}
                                                    </span>
                                                ))
                                            ) : (
                                                <span>A confirmar</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell data-label="Distância">
                                        {Number.isFinite(theater.distance)
                                            ? `${theater.distance!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
                                            : '—'}
                                    </TableCell>
                                    <TableCell data-label="A partir de">
                                        {theater.price != null
                                            ? theater.price.toLocaleString(
                                                  'pt-BR',
                                                  {
                                                      style: 'currency',
                                                      currency: 'BRL',
                                                  },
                                              )
                                            : 'A consultar'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <p className={styles['session-note']}>
                        Horários e valores podem mudar. Confirme os detalhes com
                        o cinema.
                        {!hasCoordinates &&
                            ' Use sua localização para comparar as distâncias.'}
                    </p>
                </>
            ) : (
                <div className={styles['no-sessions']}>
                    <ConfirmationNumberOutlined />
                    <p>
                        Os horários deste filme ainda não estão disponíveis
                        nesta cidade.
                    </p>
                </div>
            )}
        </section>
    );
}
