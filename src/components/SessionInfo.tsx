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
import type { HomeState, SessionRow } from '../../pages';

type Props = {
    state: HomeState;
    setState: React.Dispatch<React.SetStateAction<HomeState>>;
};

export default function SessionInfo({ state, setState }: Props) {
    const columns: { key: keyof SessionRow; label: string }[] = [
        { key: 'name', label: 'Cinema' },
        { key: 'times', label: 'Horários' },
        { key: 'distance', label: 'Distância' },
        { key: 'price', label: 'A partir de' },
    ];
    const theaters = [...state.sessionTable].sort((a, b) => {
        const first = a[state.sessionTableSortColumn],
            second = b[state.sessionTableSortColumn];
        if (first == null) return second == null ? 0 : 1;
        if (second == null) return -1;
        const result =
            typeof first === 'number' && typeof second === 'number'
                ? first - second
                : String(first).localeCompare(String(second), 'pt-BR');
        return result * state.sessionTableSortDirection;
    });
    const ticketUrl = state.selectedMovie?.siteURL;
    const hasTicketUrl = ticketUrl && /^https?:\/\//.test(ticketUrl);
    const sessionDay = state.sessionsInfo[0];
    const sessionDate = sessionDay?.dateFormatted
        ? [
              sessionDay.isToday ? 'Hoje' : sessionDay.dayOfWeek,
              sessionDay.dateFormatted,
          ]
              .filter(Boolean)
              .join(', ')
        : '';

    return (
        <section aria-labelledby="sessions-title">
            <div className="sessions-heading">
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
                        className="sessions-table"
                        aria-label={`Sessões de ${state.movie}`}
                    >
                        <TableHead>
                            <TableRow>
                                {columns.map(({ key, label }) => (
                                    <TableCell key={key}>
                                        <TableSortLabel
                                            active={
                                                state.sessionTableSortColumn ===
                                                key
                                            }
                                            direction={
                                                state.sessionTableSortDirection ===
                                                1
                                                    ? 'asc'
                                                    : 'desc'
                                            }
                                            onClick={() =>
                                                setState((previous) => ({
                                                    ...previous,
                                                    sessionTableSortColumn: key,
                                                    sessionTableSortDirection:
                                                        previous.sessionTableSortColumn ===
                                                        key
                                                            ? previous.sessionTableSortDirection *
                                                              -1
                                                            : 1,
                                                }))
                                            }
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
                                            <span className="theater-neighborhood">
                                                <PlaceOutlined />
                                                {theater.neighborhood}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell data-label="Horários">
                                        <div className="session-times">
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
                    <p className="session-note">
                        Horários e valores podem mudar. Confirme os detalhes com
                        o cinema.
                        {!Number.isFinite(
                            state.currentGeographicPosition.latitude,
                        ) &&
                            ' Use sua localização para comparar as distâncias.'}
                    </p>
                </>
            ) : (
                <div className="no-sessions">
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
