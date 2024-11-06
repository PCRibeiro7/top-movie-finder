'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { Grid, Typography } from '@mui/material';

import Filter from '../src/components/Filter';
import MovieAppBar from '../src/components/MovieAppBar';
import MovieCards from '../src/components/MovieCards';
import MovieInfo from '../src/components/MovieInfo';
import SessionInfo from '../src/components/SessionInfo';

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
        cardsToShow: 10,
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

    const getLocation = useCallback(async () => {
        let location = window.navigator && window.navigator.geolocation;
        if (location) {
            const promise = new Promise<GeolocationPosition>(
                (resolve, reject) => {
                    location.getCurrentPosition(
                        (position) => {
                            assignLocation(position);
                            resolve(position);
                        },
                        () => {
                            reject('err');
                        }
                    );
                }
            );

            return await promise;
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const position = await getLocation();
            const reverseGeocodeResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse.php?lat=${position?.coords.latitude}&lon=${position?.coords.longitude}&zoom=10&format=jsonv2`
            );
            const reverseGeocodeData = await reverseGeocodeResponse.json();
            const city = reverseGeocodeData.name;
            const state =
                reverseGeocodeData.address['ISO3166-2-lvl4'].split('-')[1];

            const cityIdResponse = await fetch(
                `/api/state?state=${state}&city=${city}`
            );
            const cityId = await cityIdResponse.json();
            const moviesResponse = await fetch(`/api/movies?cityId=${cityId}`);
            const moviesData = await moviesResponse.json();
            await getImdbRantingbyTitle(moviesData, cityId);
        };

        init();
    }, [getLocation]);

    useEffect(() => {
        if (movieInfoTableRef.current) {
            window.scrollTo({
                left: 0,
                top: movieInfoTableRef.current.offsetTop,
                behavior: 'smooth',
            });
        }
    }, [state.movieId]);

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
                const res = await fetch(
                    `/api/rating?movieName=${movie.originalTitle}`
                );
                const resJson = await res.json();

                movie.imdbRating = resJson.imdbRating ?? '...';
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
                        <MovieCards state={state} setState={setState} />

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
