/* jshint loopfunc: false */
// "use client"
import React, { useEffect, useRef } from 'react';

import { Grid, Paper, Typography } from '@material-ui/core';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';

import Filter from '../src/components/Filter';
import MovieAppBar from '../src/components/MovieAppBar';
import MovieCards from '../src/components/MovieCards';
import MovieInfo from '../src/components/MovieInfo';
import MovieSelector from '../src/components/MovieSelector';
import SessionInfo from '../src/components/SessionInfo';
import omdbRequest from '../src/requests/omdbRequester';
import distanceCalculator from '../src/utils/distanceCalculator';

export interface HomeState {
    movie: string;
    originalMovie: string;
    movieInfo: Record<string, any>;
    cityId: string;
    movieId: string;
    availableMovies: Array<any>;
    sessionsInfo: Array<any>;
    sessionInfoIsReady: boolean;
    currentGeographicPosition: {
        latitude: string;
        longitude: string;
    };
    sessionTableSortColumn: string;
    sessionTableSortDirection: number;
    sessionTable: Array<any>;
    cardsToShow: number;
    cardFirst: number;
    cardTotal: number;
    showFilter: boolean;
    filter: {
        genre: string;
        title: string;
    };
    genreHelpListOpen: boolean;
    movieCardsAreReady: boolean;
    trailer: Array<any>;
}

const Home = () => {
    const [state, setState] = React.useState<HomeState>({
        movie: '',
        originalMovie: '',
        movieInfo: {},
        cityId: '',
        movieId: '',
        availableMovies: [],
        sessionsInfo: [],
        sessionInfoIsReady: false,
        currentGeographicPosition: {
            latitude: '',
            longitude: '',
        },
        sessionTableSortColumn: 'distance',
        sessionTableSortDirection: 1,
        sessionTable: [],
        cardsToShow: 5,
        cardFirst: 0,
        cardTotal: 0,
        showFilter: false,
        filter: {
            genre: '',
            title: '',
        },
        genreHelpListOpen: false,
        movieCardsAreReady: false,
        trailer: [],
    });

    const movieInfoTableRef = useRef<HTMLDivElement>();

    console.log(state);

    useEffect(() => {
        const init = async () => {
            getLocation();
            const cityIdResponse = await fetch(
                '/api/state?state=SP&cityName=São Paulo'
            );
            const cityId = await cityIdResponse.json();
            const moviesResponse = await fetch(`/api/movies?cityId=${cityId}`);
            const moviesData = await moviesResponse.json();
            console.log(moviesData);
            setState((prevState) => ({
                ...prevState,
                availableMovies: moviesData,
                cardTotal: moviesData.length,
                cityId: cityId,
            }));
            getImdbRantingbyTitle(moviesData);
        };

        init();
    }, []);

    async function onFetchMovieButtonClick({ movie, originalMovie, trailer }) {
        const omdbRes = await omdbRequest(originalMovie);
        const res = await fetch(
            `/api/movie?movie=${movie}&cityId${state.cityId}`
        );
        const movieRes = await res.json();
        const sessiosRes = await fetch(
            `/api/session?movieId=${movieRes}&cityId${state.cityId}`
        );
        const sessionsData = await sessiosRes.json();
        let sessionTable = [];
        sessionsData[0]?.theaters?.map((theater) => {
            sessionTable.push({
                name: theater.name,
                times: concatenateSessionTimes(theater.rooms),
                distance: distanceCalculator(
                    state.currentGeographicPosition.latitude,
                    state.currentGeographicPosition.longitude,
                    theater.geolocation.lat,
                    theater.geolocation.lng,
                    'K'
                ),
                neighborhood: theater.neighborhood,
                price: theater.rooms[0].sessions[0].price,
            });
            return null;
        });
        setState((prevState) => ({
            ...prevState,
            movie: movie,
            originalMovie: originalMovie,
            trailer: trailer,
            movieId: movieRes,
            movieInfo: omdbRes,
            sessionsInfo: sessionsData,
            sessionInfoIsReady: true,
            sessionTable: sessionTable,
        }));
    }
    function concatenateSessionTimes(roomsArray) {
        let concatenatedTimesArray = [];
        if (roomsArray) {
            roomsArray.map((room) => {
                room.sessions.map((session) => {
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
    function handleMovieCardSelector(e, movie) {
        onFetchMovieButtonClick({
            movie: movie.title.trim(),
            originalMovie: movie.originalTitle.trim(),
            trailer: movie.trailers,
        });
        if (movieInfoTableRef.current) {
            window.scrollTo(0, movieInfoTableRef.current.offsetTop);
        }
    }
    function handleMovieSelector(e) {
        onFetchMovieButtonClick({
            movie: JSON.parse(e.target.value).title.trim(),
            originalMovie: JSON.parse(e.target.value).originalTitle.trim(),
            trailer: JSON.parse(e.target.value).trailer,
        });
    }
    function handleSessionTableSort(targetId) {
        setState((prevState) => ({
            ...prevState,
            sessionTableSortColumn: targetId,
            sessionTableSortDirection: state.sessionTableSortDirection * -1,
        }));
    }

    function getLocation() {
        let location = window.navigator && window.navigator.geolocation;
        if (location) {
            location.getCurrentPosition(
                (position) => {
                    assignLocation(position);
                },
                (error) => {
                    return {
                        latitude: 'err-latitude',
                        longitude: 'err-longitude',
                    };
                }
            );
        }
    }

    function assignLocation(position) {
        setState((prevState) => ({
            ...prevState,
            currentGeographicPosition: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            },
        }));
    }
    function getImdbRantingbyTitle(availableMovies) {
        if (availableMovies) {
            let newAvailableMovies = [...availableMovies];
            availableMovies.map((movie1) => {
                omdbRequest(movie1.originalTitle).then((res) => {
                    availableMovies.map((movie, index) => {
                        if (movie.originalTitle === movie1.originalTitle) {
                            newAvailableMovies[index].imdbRating =
                                res.imdbRating ? res.imdbRating : '...';
                            newAvailableMovies.sort((a, b) => {
                                if (
                                    a.imdbRating === 'N/A' &&
                                    b.imdbRating === 'N/A'
                                ) {
                                    return 0;
                                }
                                if (a.imdbRating === 'N/A') {
                                    return 1;
                                }
                                if (b.imdbRating === 'N/A') {
                                    return -1;
                                }
                                return a.imdbRating > b.imdbRating ? -1 : 1;
                            });
                        }
                        return null;
                    });
                });
                return null;
            });
            setState((prevState) => ({
                ...prevState,
                availableMovies: newAvailableMovies,
                movieCardsAreReady: true,
            }));
        }
    }
    function handleFilterSwitchChange() {
        setState((prevState) => ({
            ...prevState,
            showFilter: !state.showFilter,
        }));
    }
    return (
        <div style={{ height: '100dvh' }}>
            <MovieAppBar />
            {state.movie ? (
                <Grid
                    container
                    justifyContent="center"
                    style={{ background: 'lightgray' }}
                >
                    <Grid item xs={12}>
                        <Grid container justifyContent={'center'}>
                            <Filter
                                state={state}
                                setState={setState}
                                handleFilterSwitchChange={
                                    handleFilterSwitchChange
                                }
                            />

                            <MovieSelector
                                state={state}
                                handleMovieSelector={handleMovieSelector}
                            />
                            <MovieCards
                                state={state}
                                setState={setState}
                                handleMovieCardSelector={
                                    handleMovieCardSelector
                                }
                            />

                            <div ref={movieInfoTableRef}></div>
                            {Object.entries(state.movieInfo).length !== 0 ? (
                                <MovieInfo state={state} />
                            ) : (
                                <Grid container justifyContent="center">
                                    {' '}
                                    <Grid item xs={11}>
                                        <Typography
                                            align="center"
                                            style={{ padding: '1%' }}
                                            variant="h4"
                                        >
                                            {state.movie}
                                        </Typography>{' '}
                                    </Grid>
                                </Grid>
                            )}
                            {state.sessionInfoIsReady ? (
                                <SessionInfo
                                    state={state}
                                    setState={setState}
                                />
                            ) : null}
                        </Grid>
                    </Grid>
                </Grid>
            ) : (
                <>
                    <Grid
                        container
                        justifyContent={'center'}
                        style={{ background: 'lightgray' }}
                    >
                        <MovieSelector
                            state={state}
                            handleMovieSelector={handleMovieSelector}
                        />
                    </Grid>
                    <Grid
                        container
                        justifyContent="center"
                        style={{ background: 'lightgray', height: '100%' }}
                    >
                        <Paper
                            style={{
                                margin: '50px',
                                padding: '30px',
                                height: 'fit-content',
                            }}
                        >
                            <Grid
                                container
                                justifyContent="center"
                                alignItems="center"
                            >
                                <ArrowUpwardIcon
                                    style={{ margin: '1%', fontSize: 50 }}
                                ></ArrowUpwardIcon>
                                <Typography variant="h4">
                                    Escolha um dos Filmes Em Cartaz!
                                </Typography>
                            </Grid>
                        </Paper>
                    </Grid>
                </>
            )}
        </div>
    );
};

export default Home;
