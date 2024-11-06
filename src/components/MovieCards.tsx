import StarIcon from '@mui/icons-material/Star';
import {
    Button,
    CircularProgress,
    Grid,
    Paper,
    Slider,
    Typography,
} from '@mui/material';
import { MouseEvent } from 'react';
import { HomeState } from '../../pages';
import distanceCalculator from '../utils/distanceCalculator';

type MovieCardsProps = {
    state: HomeState;
    setState: React.Dispatch<React.SetStateAction<HomeState>>;
};

const MovieCards = ({ state, setState }: MovieCardsProps) => {
    function concatenateSessionTimes(roomsArray: any[]) {
        let concatenatedTimesArray: any[] = [];
        if (roomsArray) {
            roomsArray.map((room) => {
                room.sessions.map((session: { date: { hour: any } }) => {
                    if (!concatenatedTimesArray.includes(session.date.hour)) {
                        concatenatedTimesArray.push(`${session.date.hour} `);
                    }
                    return null;
                });
                return null;
            });
        }
        concatenatedTimesArray = concatenatedTimesArray.sort(
            (a, b) => Number(a.slice(0, 3)) - Number(b.slice(0, 3))
        );
        return concatenatedTimesArray;
    }

    async function handleMovieCardSelector(
        e: any,
        movie: { title: string; originalTitle: string; trailers: any }
    ) {
        const movieTitle = movie.title.trim();
        const originalMovie = movie.originalTitle.trim();
        const trailer = movie.trailers;

        const omdbRes = await fetch(`/api/rating?movieName=${originalMovie}`);
        const omdbData = await omdbRes.json();

        const res = await fetch(
            `/api/movie?movie=${movieTitle}&cityId${state.cityId}`
        );
        const movieRes = await res.json();
        const sessiosRes = await fetch(
            `/api/session?movieId=${movieRes}&cityId${state.cityId}`
        );
        const sessionsData = await sessiosRes.json();
        let sessionTable: {
            name: any;
            times: any[];
            distance?: number;
            neighborhood: any;
            price: any;
        }[] = [];
        sessionsData[0]?.theaters?.map(
            (theater: {
                name: any;
                rooms: { sessions: { price: any }[] }[];
                geolocation: { lat: any; lng: any };
                neighborhood: any;
            }) => {
                sessionTable.push({
                    name: theater.name,
                    times: concatenateSessionTimes(theater.rooms),
                    distance: theater.geolocation.lat
                        ? distanceCalculator(
                              state.currentGeographicPosition.latitude,
                              state.currentGeographicPosition.longitude,
                              theater.geolocation.lat,
                              theater.geolocation.lng,
                              'K'
                          )
                        : undefined,
                    neighborhood: theater.neighborhood,
                    price: theater.rooms[0].sessions[0].price,
                });
                return null;
            }
        );
        setState((prevState) => ({
            ...prevState,
            movie: movieTitle,
            originalMovie: originalMovie,
            trailer: trailer,
            movieId: movieRes,
            movieInfo: omdbData,
            sessionsInfo: sessionsData,
            sessionInfoIsReady: true,
            sessionTable: sessionTable,
        }));
    }

    return (
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

                                                                  {
                                                                      movie.imdbRating
                                                                  }
                                                              </Typography>
                                                          ) : null}
                                                      </Grid>
                                                  </Grid>
                                              );
                                          }
                                          return null;
                                      })
                                : null}
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
                                            ? state.cardTotal -
                                              state.cardsToShow
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
};

export default MovieCards;
