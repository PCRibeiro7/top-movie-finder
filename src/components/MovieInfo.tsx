import React from 'react';
import {
    Grid,
    Typography,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Hidden,
} from '@material-ui/core';
import { HomeState } from '../../pages';

type MovieInfoProps = {
    state: HomeState;
};

const MovieInfo = ({ state }: MovieInfoProps) => (
    <div>
        <Hidden xsDown>
            <Grid item>
                <Paper
                    style={{
                        padding: '1%',
                        margin: '1%',
                        overflow: 'auto',
                    }}
                >
                    <Typography
                        style={{
                            padding: '1%',
                        }}
                        variant="h5"
                    >
                        {' '}
                        Informações do Filme:
                    </Typography>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell align="right">Poster</TableCell>
                                <TableCell align="right">Título</TableCell>
                                <TableCell align="right">Gênero</TableCell>
                                <TableCell align="right">Duração</TableCell>
                                <TableCell align="right">Nota iMDb</TableCell>
                                <TableCell align="right">Metascore</TableCell>
                                <TableCell align="right">Prêmios</TableCell>
                                <TableCell align="center">Plot</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(state.movieInfo).length !== 0 ? (
                                <TableRow key={state.movieInfo.name}>
                                    <TableCell
                                        component="th"
                                        scope="row"
                                        align="right"
                                    >
                                        <div>
                                            <a
                                                rel="noopener noreferrer"
                                                target="_blank"
                                                href={
                                                    state.trailer.length
                                                        ? 'http://'.concat(
                                                              state.trailer[0].url
                                                                  .replace(
                                                                      'www.',
                                                                      ''
                                                                  )
                                                                  .replace(
                                                                      'https://',
                                                                      ''
                                                                  )
                                                          )
                                                        : null
                                                }
                                            >
                                                <img
                                                    alt="Sem Poster Irmão"
                                                    width="100px"
                                                    src={state.movieInfo.Poster}
                                                />
                                            </a>
                                        </div>
                                    </TableCell>
                                    <TableCell align="right">
                                        {state.movieInfo.Title}
                                    </TableCell>
                                    <TableCell align="right">
                                        {state.movieInfo.Genre}
                                    </TableCell>
                                    <TableCell align="right">
                                        {state.movieInfo.Runtime}
                                    </TableCell>
                                    <TableCell align="right">
                                        {state.movieInfo.imdbRating}
                                    </TableCell>
                                    <TableCell align="right">
                                        {state.movieInfo.Metascore}
                                    </TableCell>
                                    <TableCell align="right">
                                        {state.movieInfo.Awards}
                                    </TableCell>
                                    <TableCell align="center">
                                        {state.movieInfo.Plot}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </Paper>
            </Grid>
        </Hidden>
        <Hidden smUp>
            <Grid item>
                <Paper
                    style={{
                        padding: '3%',
                        margin: '3%',
                    }}
                >
                    <Grid container>
                        <Grid item xs={6}>
                            <a
                                rel="noopener noreferrer"
                                target="_blank"
                                href={
                                    state.trailer.length
                                        ? 'http://'.concat(
                                              state.trailer[0].url
                                                  .replace('www.', '')
                                                  .replace('https://', '')
                                          )
                                        : null
                                }
                            >
                                <img
                                    alt="Sem Poster Irmão"
                                    width="100%"
                                    src={state.movieInfo.Poster}
                                />
                            </a>
                        </Grid>

                        <Grid item xs={6}>
                            <Grid
                                container
                                style={{
                                    height: '250px',
                                }}
                            >
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                            marginLeft: '20%',
                                            fontWeight: 'bold',
                                        }}
                                        variant="body2"
                                        align="left"
                                    >
                                        {'Título:'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                        }}
                                        variant="body2"
                                        align="right"
                                    >
                                        {state.movieInfo.Title}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                            marginLeft: '20%',
                                            fontWeight: 'bold',
                                        }}
                                        variant="body2"
                                        align="left"
                                    >
                                        {'Gênero:'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                        }}
                                        variant="body2"
                                        align="right"
                                    >
                                        {state.movieInfo.Genre}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                            marginLeft: '20%',
                                            fontWeight: 'bold',
                                        }}
                                        variant="body2"
                                        align="left"
                                    >
                                        {'Nota iMDb:'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                        }}
                                        variant="body2"
                                        align="right"
                                    >
                                        {state.movieInfo.imdbRating}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography
                                        style={{
                                            margin: '10%',
                                            marginLeft: '20%',
                                            fontWeight: 'bold',
                                        }}
                                        variant="body2"
                                        align="left"
                                    >
                                        {'Prêmios:'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Grid container>
                                        <Grid item xs={12}>
                                            <Typography
                                                style={{
                                                    margin: '10%',
                                                    overflow: 'auto',
                                                    maxHeight: '80px',
                                                }}
                                                variant="body2"
                                                align="right"
                                            >
                                                {state.movieInfo.Awards}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography
                                style={{
                                    marginLeft: '3%',
                                    marginTop: '3%',
                                    fontWeight: 'bold',
                                }}
                                variant="body2"
                                align="left"
                            >
                                {'Plot:'}
                            </Typography>
                            <Typography
                                style={{
                                    margin: '1%',
                                    marginLeft: '3%',
                                }}
                                variant="body2"
                                align="left"
                            >
                                {state.movieInfo.Plot}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>
        </Hidden>
    </div>
);

export default MovieInfo;
