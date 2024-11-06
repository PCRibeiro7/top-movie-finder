'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { Grid, Typography } from '@mui/material';

import Filter from '../src/components/Filter';
import MovieAppBar from '../src/components/MovieAppBar';
import MovieCards from '../src/components/MovieCards';
import MovieInfo from '../src/components/MovieInfo';
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
        latitude: number | undefined;
        longitude: number | undefined;
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
            latitude: undefined,
            longitude: undefined,
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

    const movieInfoTableRef = useRef<HTMLDivElement>(null);

    const getLocation = useCallback(() => {
        let location = window.navigator && window.navigator.geolocation;
        if (location) {
            location.getCurrentPosition(
                (position) => {
                    assignLocation(position);
                },
                () => {
                    return {
                        latitude: 'err-latitude',
                        longitude: 'err-longitude',
                    };
                }
            );
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            getLocation();
            const cityIdResponse = await fetch(
                '/api/state?state=SP&cityName=São Paulo'
            );
            const cityId = await cityIdResponse.json();
            const moviesResponse = await fetch(`/api/movies?cityId=${cityId}`);
            const moviesData = await moviesResponse.json();
            await getImdbRantingbyTitle(moviesData, cityId);
        };

        init();
    }, [getLocation]);

    async function onFetchMovieButtonClick({
        movie,
        originalMovie,
        trailer,
    }: {
        movie: string;
        originalMovie: string;
        trailer: Array<any>;
    }) {
        const omdbRes = await omdbRequest(originalMovie);
        const res = await fetch(
            `/api/movie?movie=${movie}&cityId${state.cityId}`
        );
        const movieRes = await res.json();
        const sessiosRes = await fetch(
            `/api/session?movieId=${movieRes}&cityId${state.cityId}`
        );
        const sessionsData = await sessiosRes.json();
        let sessionTable: {
            name: any;
            times: any[];
            distance: number;
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
            }
        );
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

    function handleMovieCardSelector(
        e: any,
        movie: { title: string; originalTitle: string; trailers: any }
    ) {
        onFetchMovieButtonClick({
            movie: movie.title.trim(),
            originalMovie: movie.originalTitle.trim(),
            trailer: movie.trailers,
        });
        if (movieInfoTableRef.current) {
            window.scrollTo(0, movieInfoTableRef.current.offsetTop);
        }
    }

    function assignLocation(position: GeolocationPosition) {
        setState((prevState) => ({
            ...prevState,
            currentGeographicPosition: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            },
        }));
    }
    async function getImdbRantingbyTitle(
        availableMovies: any[],
        cityId: string
    ) {
        if (availableMovies) {
            let newAvailableMovies = [...availableMovies];

            for (const movie of newAvailableMovies) {
                const res = await omdbRequest(movie.originalTitle);

                movie.imdbRating = res.imdbRating ?? '...';
            }

            newAvailableMovies.sort((a, b) => {
                if (a.imdbRating === 'N/A' && b.imdbRating === 'N/A') {
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

            setState((prevState) => ({
                ...prevState,
                availableMovies: newAvailableMovies,
                movieCardsAreReady: true,
                cardTotal: newAvailableMovies.length,
                cityId: cityId,
            }));
        }
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'lightgray' }}>
            <MovieAppBar />
            <Grid container justifyContent="center">
                <Grid item xs={12}>
                    <Grid container justifyContent={'center'}>
                        <Filter state={state} setState={setState} />
                        <MovieCards
                            state={state}
                            setState={setState}
                            handleMovieCardSelector={handleMovieCardSelector}
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
                            <SessionInfo state={state} setState={setState} />
                        ) : null}
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

export default Home;
