import StarIcon from '@mui/icons-material/Star';
import {
    Button,
    CircularProgress,
    Fab,
    Grid,
    Hidden,
    Paper,
    Slider,
    Typography,
} from '@mui/material';
import { MouseEvent } from 'react';
import { HomeState } from '../../pages';

type MovieCardsProps = {
    state: HomeState;
    setState: React.Dispatch<React.SetStateAction<HomeState>>;
    handleMovieCardSelector: (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
        movie: { title: string; originalTitle: string; trailers: any }
    ) => void;
};
const MovieCards = ({
    state,
    setState,
    handleMovieCardSelector,
}: MovieCardsProps) => (
    <Grid item xs={12} style={{ margin: '1%' }}>
        <Paper style={{ padding: '1%' }}>
            {state.movieCardsAreReady ? (
                <div>
                    <Typography variant="h6">
                        Selecione um Filme em Cartaz:
                    </Typography>
                    <Grid
                        container
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Hidden xsDown>
                            <Fab
                                size="small"
                                onClick={() =>
                                    setState((prevState) => ({
                                        ...prevState,
                                        cardFirst:
                                            state.cardFirst - 5 > 0
                                                ? state.cardFirst - 5
                                                : 0,
                                    }))
                                }
                            >
                                {'<'}
                            </Fab>
                        </Hidden>
                        {state.availableMovies.length
                            ? state.availableMovies
                                  .filter((movie) => {
                                      if (state.filter.genre !== '') {
                                          return movie.genres.includes(
                                              state.filter.genre
                                          );
                                      }
                                      return true;
                                  })
                                  .filter((movie) => {
                                      if (state.filter.title !== '') {
                                          return movie.title
                                              .toLowerCase()
                                              .includes(
                                                  state.filter.title.toLowerCase()
                                              );
                                      }
                                      return true;
                                  })
                                  .map((movie, index) => {
                                      if (
                                          index >= state.cardFirst &&
                                          index <
                                              state.cardFirst +
                                                  state.cardsToShow
                                      ) {
                                          return (
                                              <Grid
                                                  key={movie.title}
                                                  item
                                                  xs={2}
                                                  style={{
                                                      margin: '1%',
                                                  }}
                                              >
                                                  <Grid
                                                      container
                                                      alignItems="center"
                                                      justifyContent="center"
                                                  >
                                                      <Button
                                                          border={1}
                                                          onClick={(
                                                              e: MouseEvent<
                                                                  HTMLButtonElement,
                                                                  MouseEvent
                                                              >
                                                          ) =>
                                                              handleMovieCardSelector(
                                                                  e,
                                                                  movie
                                                              )
                                                          }
                                                      >
                                                          <img
                                                              alt=""
                                                              style={{
                                                                  margin: '1%',
                                                                  width: '80%',
                                                                  height: '80%',
                                                              }}
                                                              src={
                                                                  movie
                                                                      ?.images[0]
                                                                      ?.url
                                                              }
                                                          />
                                                      </Button>
                                                      <Typography
                                                          noWrap={true}
                                                          style={{
                                                              width: '100%',
                                                          }}
                                                          display="block"
                                                          align="center"
                                                          variant="caption"
                                                      >
                                                          {movie.title}
                                                      </Typography>
                                                      {movie.imdbRating ? (
                                                          <Typography
                                                              display="block"
                                                              align="center"
                                                              variant="caption"
                                                          >
                                                              <StarIcon
                                                                  style={{
                                                                      fontSize:
                                                                          '12px',
                                                                  }}
                                                                  color="secondary"
                                                              />

                                                              {movie.imdbRating}
                                                          </Typography>
                                                      ) : null}
                                                  </Grid>
                                              </Grid>
                                          );
                                      }
                                      return null;
                                  })
                            : null}
                        <Hidden xsDown>
                            <Fab
                                size="small"
                                onClick={() =>
                                    setState((prevState) => ({
                                        ...prevState,
                                        cardFirst:
                                            state.cardFirst + 5 <
                                            state.cardTotal - state.cardsToShow
                                                ? state.cardFirst + 5
                                                : state.cardTotal -
                                                  state.cardsToShow,
                                    }))
                                }
                            >
                                {'>'}
                            </Fab>
                        </Hidden>
                    </Grid>
                    <Grid container justifyContent="center">
                        <Grid item xs={6} style={{ margin: '1%' }}>
                            <Slider
                                value={state.cardFirst}
                                defaultValue={0}
                                aria-labelledby="discrete-slider"
                                valueLabelDisplay="auto"
                                step={1}
                                onChange={({}, value: number) =>
                                    setState((prevState) => ({
                                        ...prevState,
                                        cardFirst: value,
                                    }))
                                }
                                min={0}
                                max={
                                    state.cardTotal - state.cardsToShow >= 0
                                        ? state.cardTotal - state.cardsToShow
                                        : 0
                                }
                            />
                        </Grid>
                    </Grid>
                </div>
            ) : (
                <Grid container justifyContent="center">
                    <Grid item xs={12}>
                        <Typography
                            style={{
                                textAlign: 'center',
                            }}
                            variant="h6"
                        >
                            {' '}
                            Carregando Filmes...
                        </Typography>
                    </Grid>
                    <Grid
                        item
                        style={{
                            textAlign: 'center',
                        }}
                        xs={12}
                    >
                        <CircularProgress></CircularProgress>
                    </Grid>
                </Grid>
            )}
        </Paper>
    </Grid>
);

export default MovieCards;
