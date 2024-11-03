import {
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { HomeState } from '../../pages';

type SessionInfoProps = {
    state: HomeState;
    setState: React.Dispatch<React.SetStateAction<HomeState>>;
};

const SessionInfo = ({ state, setState }: SessionInfoProps) => {
    function handleSessionTableSort(targetId) {
        setState((prevState) => ({
            ...prevState,
            sessionTableSortColumn: targetId,
            sessionTableSortDirection: state.sessionTableSortDirection * -1,
        }));
    }

    return (
        <Grid item xs={12}>
            <Paper
                style={{
                    margin: '1%',
                    padding: '1%',
                    overflow: 'auto',
                }}
            >
                <Typography style={{ padding: '1%' }} variant="h5">
                    Informações das Sessões:
                </Typography>
                <Table>
                    <TableHead>
                        <TableRow
                            onClick={(e) => handleSessionTableSort(e.target.id)}
                        >
                            <TableCell id={'name'} align="right">
                                Cinema
                            </TableCell>
                            <TableCell id={'times'} align="right">
                                Sessões
                            </TableCell>
                            <TableCell id={'distance'} align="right">
                                Distância (km)
                            </TableCell>
                            <TableCell id={'neighborhood'} align="right">
                                Bairro
                            </TableCell>
                            <TableCell id={'price'} align="right">
                                Preço [R$]
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {state.sessionInfoIsReady
                            ? state.sessionTable
                                  .sort((a, b) =>
                                      a[state.sessionTableSortColumn] >
                                      b[state.sessionTableSortColumn]
                                          ? state.sessionTableSortDirection
                                          : state.sessionTableSortDirection * -1
                                  )
                                  .map((theater) => {
                                      return (
                                          <TableRow key={theater.name}>
                                              <TableCell
                                                  component="th"
                                                  scope="row"
                                              >
                                                  {theater.name}
                                              </TableCell>
                                              <TableCell align="right">
                                                  {theater.times}
                                              </TableCell>
                                              <TableCell align="right">
                                                  {theater.distance}
                                              </TableCell>
                                              <TableCell align="right">
                                                  {theater.neighborhood}
                                              </TableCell>
                                              <TableCell align="right">
                                                  {Math.round(
                                                      (theater.price / 1.14) *
                                                          100
                                                  ) / 100}
                                              </TableCell>
                                          </TableRow>
                                      );
                                  })
                            : null}
                    </TableBody>
                </Table>
            </Paper>
        </Grid>
    );
};

export default SessionInfo;
