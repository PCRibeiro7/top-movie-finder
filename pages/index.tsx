/* jshint loopfunc: false */
// "use client"
import React, { Component } from 'react';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import { Slider, Tooltip, Hidden, Switch, Divider } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import {
    TextField,
    Grid,
    Select,
    MenuItem,
    FormControl,
    Typography,
    AppBar,
    Toolbar,
    Paper,
    Fab,
    CircularProgress,
} from '@material-ui/core';

import WhatshotIcon from '@material-ui/icons/Whatshot';
import InsertEmoticonIcon from '@material-ui/icons/InsertEmoticon';
import SportsKabaddiIcon from '@material-ui/icons/SportsKabaddi';
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import LocalFloristIcon from '@material-ui/icons/LocalFlorist';
import ToysIcon from '@material-ui/icons/Toys';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import FilterHdrIcon from '@material-ui/icons/FilterHdr';
import SearchIcon from '@material-ui/icons/Search';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import StarIcon from '@material-ui/icons/Star';
import HelpIcon from '@material-ui/icons/Help';
import omdbTryHardRequest from '../src/requests/omdbTryHardRequester';
import omdbRequest from '../src/requests/omdbRequester';
import movieIdRequest from '../src/requests/movieIdRequester';
import sessionRequest from '../src/requests/sessionsRequester';
import distanceCalculator from '../src/utils/distanceCalculator';
import GenreHelpList from '../src/components/GenreHelpList';

interface HomeState {
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

class Home extends Component<{}, HomeState> {
    movieInfoTableRef: React.RefObject<HTMLDivElement>;
    constructor(props) {
        super(props);
        this.state = {
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
        };

        this.onTextFieldChange = this.onTextFieldChange.bind(this);
        this.onPrintStateButtonClick = this.onPrintStateButtonClick.bind(this);
        this.onFetchMovieButtonClick = this.onFetchMovieButtonClick.bind(this);
        this.movieInfoTableRef = React.createRef();
    }
    async componentDidMount() {
        omdbTryHardRequest('Alcatraz: Escapada Impossível 2.0 - Escape Route');
        this.getLocation();
        const cityIdResponse = await fetch(
            '/api/state?state=SP&cityName=São Paulo'
        );
        const cityId = await cityIdResponse.json();
        this.setState(
            {
                cityId: cityId,
            },
            async () => {
                const moviesResponse = await fetch(
                    `/api/movies?cityId=${cityId}`
                );
                const moviesData = await moviesResponse.json();

                this.setState(
                    {
                        availableMovies: moviesData,
                        cardTotal: moviesData.length,
                    },
                    () => {
                        this.getImdbRantingbyTitle();
                    }
                );
            }
        );
    }

    onTextFieldChange(e) {
        this.setState({
            movie: e.target.value,
        });
    }
    onPrintStateButtonClick(e) {
        console.log(this.state);
    }
    onFetchMovieButtonClick = () => {
        omdbRequest(this.state.originalMovie).then((res) => {
            this.setState(
                {
                    movieInfo: res,
                },
                () => {
                    fetch(
                        `/api/movie?movie=${this.state.movie}&cityId${this.state.cityId}`
                    )
                        .then((res) => res.json())
                        .then((res) => {
                            this.setState(
                                {
                                    movieId: res,
                                },
                                () => {
                                    fetch(
                                        `/api/session?movieId=${this.state.movieId}&cityId${this.state.cityId}`
                                    )
                                        .then((res) => res.json())
                                        .then((res) => {
                                            let sessionTable = [];
                                            res[0]?.theaters?.map((theater) => {
                                                sessionTable.push({
                                                    name: theater.name,
                                                    times: this.concatenateSessionTimes(
                                                        theater.rooms
                                                    ),
                                                    distance:
                                                        distanceCalculator(
                                                            this.state
                                                                .currentGeographicPosition
                                                                .latitude,
                                                            this.state
                                                                .currentGeographicPosition
                                                                .longitude,
                                                            theater.geolocation
                                                                .lat,
                                                            theater.geolocation
                                                                .lng,
                                                            'K'
                                                        ),
                                                    neighborhood:
                                                        theater.neighborhood,
                                                    price: theater.rooms[0]
                                                        .sessions[0].price,
                                                });
                                                return null;
                                            });
                                            this.setState({
                                                sessionsInfo: res,
                                                sessionInfoIsReady: true,
                                                sessionTable: sessionTable,
                                            });
                                        });
                                }
                            );
                        });
                }
            );
        });
    };
    concatenateSessionTimes(roomsArray) {
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
    handleMovieSelector(e) {
        this.setState(
            {
                movie: JSON.parse(e.target.value).title.trim(),
                originalMovie: JSON.parse(e.target.value).originalTitle.trim(),
                trailer: JSON.parse(e.target.value).trailer,
            },
            () => {
                this.onFetchMovieButtonClick();
            }
        );
    }
    handleMovieCardSelector(e, movie) {
        this.setState(
            {
                movie: movie.title.trim(),
                originalMovie: movie.originalTitle.trim(),
                trailer: movie.trailers,
            },
            () => {
                this.onFetchMovieButtonClick();
            }
        );
        window.scrollTo(0, this.movieInfoTableRef.current.offsetTop);
    }
    returnStyledMenuItemContent(movie) {
        let iconComponentsArray = [];
        if (movie.tags.includes('Em Alta')) {
            iconComponentsArray.push(
                <WhatshotIcon key="Em Alta" color="error" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Comédia')) {
            iconComponentsArray.push(
                <InsertEmoticonIcon key="Comédia" fontSize={'small'} />
            );
        }
        if (movie.tags.includes('Suspense')) {
            iconComponentsArray.push(
                <SearchIcon key="Suspense" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Drama')) {
            iconComponentsArray.push(
                <SentimentVeryDissatisfiedIcon key="Drama" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Aventura')) {
            iconComponentsArray.push(
                <FilterHdrIcon key="Aventura" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Animação')) {
            iconComponentsArray.push(
                <ToysIcon key="Animação" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Ação')) {
            iconComponentsArray.push(
                <SportsKabaddiIcon key="Ação" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Musical')) {
            iconComponentsArray.push(
                <MusicNoteIcon key="Musical" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Romance')) {
            iconComponentsArray.push(
                <LocalFloristIcon key="Romance" fontSize={'small'} />
            );
        }
        if (movie.genres.includes('Biografia')) {
            iconComponentsArray.push(
                <MenuBookIcon key="Biografia" fontSize={'small'} />
            );
        }
        return (
            <Grid>
                <Grid container alignItems="center" justifyContent="flex-start">
                    <img alt="" height="100px" src={movie?.images[0]?.url} />
                    <Typography>
                        {movie.title}
                        {iconComponentsArray}
                    </Typography>
                </Grid>
            </Grid>
        );
    }
    handleSessionTableSort(targetId) {
        this.setState({
            sessionTableSortColumn: targetId,
            sessionTableSortDirection:
                this.state.sessionTableSortDirection * -1,
        });
    }

    getLocation() {
        let location = window.navigator && window.navigator.geolocation;
        if (location) {
            location.getCurrentPosition(
                (position) => {
                    this.assignLocation(position);
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

    assignLocation(position) {
        this.setState({
            currentGeographicPosition: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            },
        });
    }
    getImdbRantingbyTitle() {
        if (this.state.availableMovies) {
            let newAvailableMovies = [...this.state.availableMovies];
            this.state.availableMovies.map((movie1) => {
                omdbRequest(movie1.originalTitle).then((res) => {
                    this.state.availableMovies.map((movie, index) => {
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
            this.setState(
                {
                    availableMovies: newAvailableMovies,
                },
                () => {
                    setTimeout(() => {
                        this.setCardsReady();
                    }, 1000);
                }
            );
        }
    }
    setCardsReady() {
        this.setState({ movieCardsAreReady: true });
    }

    handleAvatarImageError(e, index, movieTitle) {
        if (this.state.availableMovies[index].title === movieTitle) {
            let newAvailableMovies = [...this.state.availableMovies];
            newAvailableMovies[index].images[0].url =
                'https://secureservercdn.net/184.168.47.225/3f4.48c.myftpupload.com/wp-content/uploads/2017/04/404PosterNotFound.jpg?time=1568012822';
            this.setState({ availableMovies: newAvailableMovies });
        }
    }

    handleFilterGenreButtonClick(genre) {
        let newFilter = { ...this.state.filter };
        if (this.state.filter.genre === genre) {
            newFilter.genre = '';
        } else {
            newFilter.genre = genre;
        }
        this.setState({ filter: newFilter, cardFirst: 0 }, () =>
            this.updateTotalCardNumber()
        );
    }
    handleFilterTitleTextFieldChange(movieTitle) {
        let newFilter = { ...this.state.filter };
        newFilter.title = movieTitle;
        this.setState({ filter: newFilter, cardFirst: 0 }, () =>
            this.updateTotalCardNumber()
        );
    }
    updateTotalCardNumber() {
        let cardTotalNumber = this.state.availableMovies
            .filter((movie) => {
                if (this.state.filter.genre !== '') {
                    return movie.genres.includes(this.state.filter.genre);
                }
                return true;
            })
            .filter((movie) => {
                if (this.state.filter.title !== '') {
                    return movie.title
                        .toLowerCase()
                        .includes(this.state.filter.title.toLowerCase());
                }
                return true;
            }).length;
        this.setState({ cardTotal: cardTotalNumber });
    }
    handleFilterSwitchChange() {
        this.state.showFilter === false
            ? this.setState({ showFilter: true })
            : this.setState({ showFilter: false });
    }
    render() {
        if (this.state.movie) {
            return (
                <div style={{ overflow: 'hidden' }}>
                    <AppBar position="static">
                        <Toolbar>
                            <img
                                alt="Sem Imagem"
                                style={{ margin: '1%', width: '30px' }}
                                src={
                                    'http://icons.iconarchive.com/icons/dtafalonso/android-lollipop/256/Movie-Studio-icon.png'
                                }
                            />

                            <Typography variant="h6">Vai ver o que?</Typography>
                        </Toolbar>
                    </AppBar>
                    <Grid container justifyContent="center">
                        <Grid item xs={12}>
                            <Grid
                                container
                                alignItems={'center'}
                                justifyContent={'center'}
                                spacing={8}
                            >
                                <Grid item xs={12}>
                                    {/* <Button color="secondary" fullWidth={true} onClick={this.onPrintStateButtonClick}>Print State</Button> */}
                                </Grid>
                            </Grid>
                            <Grid container justifyContent={'center'}>
                                <Grid item xs={12} style={{ margin: '1%' }}>
                                    <Paper style={{ padding: '1%' }}>
                                        <Grid container>
                                            <Grid item xs={12}>
                                                <Typography
                                                    display="inline"
                                                    style={{ margin: '1%' }}
                                                    variant="h6"
                                                >
                                                    Quer dar uma filtrada?
                                                </Typography>
                                                <Switch
                                                    checked={
                                                        this.state.showFilter
                                                    }
                                                    onChange={(e) =>
                                                        this.handleFilterSwitchChange()
                                                    }
                                                    inputProps={{
                                                        'aria-label':
                                                            'secondary checkbox',
                                                    }}
                                                />
                                            </Grid>
                                            {this.state.showFilter ? (
                                                <Grid container>
                                                    <Grid item xs={6}>
                                                        <Grid
                                                            container
                                                            alignItems="center"
                                                        >
                                                            <Grid item>
                                                                <Typography
                                                                    display="inline"
                                                                    style={{
                                                                        paddingRight:
                                                                            '20px',
                                                                        margin: '12%',
                                                                    }}
                                                                    variant="h6"
                                                                >
                                                                    Gêneros:{' '}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item>
                                                                <Tooltip
                                                                    open={
                                                                        this
                                                                            .state
                                                                            .genreHelpListOpen
                                                                    }
                                                                    onClose={(
                                                                        e
                                                                    ) =>
                                                                        this.setState(
                                                                            {
                                                                                genreHelpListOpen:
                                                                                    false,
                                                                            }
                                                                        )
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.setState(
                                                                            {
                                                                                genreHelpListOpen:
                                                                                    true,
                                                                            }
                                                                        )
                                                                    }
                                                                    placement="right"
                                                                    title={
                                                                        <React.Fragment>
                                                                            <div
                                                                                style={{
                                                                                    width: '150px',
                                                                                }}
                                                                            >
                                                                                {GenreHelpList(
                                                                                    this
                                                                                        .state
                                                                                )}
                                                                            </div>
                                                                        </React.Fragment>
                                                                    }
                                                                >
                                                                    <HelpIcon />
                                                                </Tooltip>
                                                            </Grid>
                                                        </Grid>

                                                        <IconButton>
                                                            <Tooltip title="Em Alta">
                                                                <WhatshotIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Em Alta'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Em Alta'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Comédia">
                                                                <InsertEmoticonIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Comédia'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Comédia'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Ação">
                                                                <SportsKabaddiIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Ação'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Ação'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Drama">
                                                                <SentimentVeryDissatisfiedIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Drama'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Drama'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Romance">
                                                                <LocalFloristIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Romance'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Romance'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Animação">
                                                                <ToysIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Animação'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Animação'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Musical">
                                                                <MusicNoteIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Musical'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Musical'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Biografia">
                                                                <MenuBookIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Biografia'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Biografia'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Aventura">
                                                                <FilterHdrIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Aventura'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Aventura'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                        <IconButton>
                                                            <Tooltip title="Suspense">
                                                                <SearchIcon
                                                                    color={
                                                                        this
                                                                            .state
                                                                            .filter
                                                                            .genre ===
                                                                        'Suspense'
                                                                            ? 'secondary'
                                                                            : ''
                                                                    }
                                                                    onClick={(
                                                                        e
                                                                    ) =>
                                                                        this.handleFilterGenreButtonClick(
                                                                            'Suspense'
                                                                        )
                                                                    }
                                                                />
                                                            </Tooltip>
                                                        </IconButton>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography
                                                            style={{
                                                                margin: '1%',
                                                            }}
                                                            variant="h6"
                                                        >
                                                            Nome do Filme:
                                                        </Typography>
                                                        <TextField
                                                            margin="normal"
                                                            style={{
                                                                width: '60%',
                                                                margin: '1%',
                                                            }}
                                                            onChange={(e) =>
                                                                this.handleFilterTitleTextFieldChange(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                        ></TextField>
                                                    </Grid>
                                                </Grid>
                                            ) : null}
                                        </Grid>
                                    </Paper>
                                </Grid>

                                <Grid item xs={4}>
                                    <Paper style={{ padding: '1%' }}>
                                        <Typography variant="h6">
                                            {' '}
                                            Filme Selecionado:
                                        </Typography>
                                        <FormControl
                                            value={'this.state.movie'}
                                            fullWidth={true}
                                        >
                                            <Select
                                                value={
                                                    this.state.movie
                                                        ? JSON.stringify({
                                                              title: this.state
                                                                  .movie,
                                                              originalTitle:
                                                                  this.state
                                                                      .originalMovie,
                                                              trailer:
                                                                  this.state
                                                                      .trailer,
                                                          })
                                                        : ''
                                                }
                                                onChange={(e) =>
                                                    this.handleMovieSelector(e)
                                                }
                                            >
                                                { this.state.availableMovies.map(
                                                          (movie) => (
                                                              <MenuItem
                                                                  style={{
                                                                      height: '5%',
                                                                  }}
                                                                  key={
                                                                      movie.title
                                                                  }
                                                                  value={JSON.stringify(
                                                                      {
                                                                          title: movie.title,
                                                                          originalTitle:
                                                                              movie.originalTitle,
                                                                          trailer:
                                                                              movie.trailers,
                                                                      }
                                                                  )}
                                                              >
                                                                  {this.returnStyledMenuItemContent(
                                                                      movie
                                                                  )}
                                                              </MenuItem>
                                                          )
                                                      )
                                                    }
                                            </Select>
                                        </FormControl>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} style={{ margin: '1%' }}>
                                    <Paper style={{ padding: '1%' }}>
                                        {this.state.movieCardsAreReady ? (
                                            <div>
                                                <Typography variant="h6">
                                                    {' '}
                                                    Selecione um Filme em
                                                    Cartaz:
                                                </Typography>
                                                <Grid
                                                    container
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                >
                                                    <Hidden xsDown>
                                                        <Fab
                                                            size="small"
                                                            onClick={(e) =>
                                                                this.setState({
                                                                    cardFirst:
                                                                        this
                                                                            .state
                                                                            .cardFirst -
                                                                            5 >
                                                                        0
                                                                            ? this
                                                                                  .state
                                                                                  .cardFirst -
                                                                              5
                                                                            : 0,
                                                                })
                                                            }
                                                        >
                                                            {'<'}
                                                        </Fab>
                                                    </Hidden>
                                                    {this.state.availableMovies
                                                        .length
                                                        ? this.state.availableMovies
                                                              .filter(
                                                                  (movie) => {
                                                                      if (
                                                                          this
                                                                              .state
                                                                              .filter
                                                                              .genre !==
                                                                          ''
                                                                      ) {
                                                                          return movie.genres.includes(
                                                                              this
                                                                                  .state
                                                                                  .filter
                                                                                  .genre
                                                                          );
                                                                      }
                                                                      return true;
                                                                  }
                                                              )
                                                              .filter(
                                                                  (movie) => {
                                                                      if (
                                                                          this
                                                                              .state
                                                                              .filter
                                                                              .title !==
                                                                          ''
                                                                      ) {
                                                                          return movie.title
                                                                              .toLowerCase()
                                                                              .includes(
                                                                                  this.state.filter.title.toLowerCase()
                                                                              );
                                                                      }
                                                                      return true;
                                                                  }
                                                              )
                                                              .map(
                                                                  (
                                                                      movie,
                                                                      index
                                                                  ) => {
                                                                      if (
                                                                          index >=
                                                                              this
                                                                                  .state
                                                                                  .cardFirst &&
                                                                          index <
                                                                              this
                                                                                  .state
                                                                                  .cardFirst +
                                                                                  this
                                                                                      .state
                                                                                      .cardsToShow
                                                                      ) {
                                                                          return (
                                                                              <Grid
                                                                                  key={
                                                                                      movie.title
                                                                                  }
                                                                                  item
                                                                                  xs={
                                                                                      2
                                                                                  }
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
                                                                                          border={
                                                                                              1
                                                                                          }
                                                                                          onClick={(
                                                                                              e
                                                                                          ) =>
                                                                                              this.handleMovieCardSelector(
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
                                                                                          noWrap={
                                                                                              true
                                                                                          }
                                                                                          style={{
                                                                                              width: '100%',
                                                                                          }}
                                                                                          display="block"
                                                                                          align="center"
                                                                                          variant="caption"
                                                                                      >
                                                                                          {
                                                                                              movie.title
                                                                                          }
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
                                                                  }
                                                              )
                                                        : null}
                                                    <Hidden xsDown>
                                                        <Fab
                                                            size="small"
                                                            onClick={(e) =>
                                                                this.setState({
                                                                    cardFirst:
                                                                        this
                                                                            .state
                                                                            .cardFirst +
                                                                            5 <
                                                                        this
                                                                            .state
                                                                            .cardTotal -
                                                                            this
                                                                                .state
                                                                                .cardsToShow
                                                                            ? this
                                                                                  .state
                                                                                  .cardFirst +
                                                                              5
                                                                            : this
                                                                                  .state
                                                                                  .cardTotal -
                                                                              this
                                                                                  .state
                                                                                  .cardsToShow,
                                                                })
                                                            }
                                                        >
                                                            {'>'}
                                                        </Fab>
                                                    </Hidden>
                                                </Grid>
                                                <Grid
                                                    container
                                                    justifyContent="center"
                                                >
                                                    <Grid
                                                        item
                                                        xs={6}
                                                        style={{ margin: '1%' }}
                                                    >
                                                        <Slider
                                                            value={
                                                                this.state
                                                                    .cardFirst
                                                            }
                                                            defaultValue={0}
                                                            aria-labelledby="discrete-slider"
                                                            valueLabelDisplay="auto"
                                                            step={1}
                                                            onChange={(
                                                                e,
                                                                value
                                                            ) =>
                                                                this.setState({
                                                                    cardFirst:
                                                                        value,
                                                                })
                                                            }
                                                            min={0}
                                                            max={
                                                                this.state
                                                                    .cardTotal -
                                                                    this.state
                                                                        .cardsToShow >=
                                                                0
                                                                    ? this.state
                                                                          .cardTotal -
                                                                      this.state
                                                                          .cardsToShow
                                                                    : 0
                                                            }
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </div>
                                        ) : (
                                            <Grid
                                                container
                                                justifyContent="center"
                                            >
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
                                                    justify="center"
                                                    xs={12}
                                                >
                                                    <CircularProgress></CircularProgress>
                                                </Grid>
                                            </Grid>
                                        )}
                                    </Paper>
                                </Grid>

                                <div ref={this.movieInfoTableRef}></div>
                                {Object.entries(this.state.movieInfo).length !==
                                0 ? (
                                    <div>
                                        <Hidden xsDown>
                                            <Grid item xs={12}>
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
                                                                <TableCell align="right">
                                                                    Poster
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Título
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Gênero
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Duração
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Nota iMDb
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Metascore
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Prêmios
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    Plot
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {Object.entries(
                                                                this.state
                                                                    .movieInfo
                                                            ).length !== 0 ? (
                                                                <TableRow
                                                                    key={
                                                                        this
                                                                            .state
                                                                            .movieInfo
                                                                            .name
                                                                    }
                                                                >
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
                                                                                    this
                                                                                        .state
                                                                                        .trailer
                                                                                        .length
                                                                                        ? 'http://'.concat(
                                                                                              this.state.trailer[0].url
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
                                                                                    src={
                                                                                        this
                                                                                            .state
                                                                                            .movieInfo
                                                                                            .Poster
                                                                                    }
                                                                                />
                                                                            </a>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Title
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Genre
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Runtime
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .imdbRating
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Metascore
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Awards
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Plot
                                                                        }
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : null}
                                                        </TableBody>
                                                    </Table>
                                                </Paper>
                                            </Grid>
                                        </Hidden>
                                        <Hidden smUp>
                                            <Grid item xs={12}>
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
                                                                    this.state
                                                                        .trailer
                                                                        .length
                                                                        ? 'http://'.concat(
                                                                              this.state.trailer[0].url
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
                                                                    width="100%"
                                                                    src={
                                                                        this
                                                                            .state
                                                                            .movieInfo
                                                                            .Poster
                                                                    }
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
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                            marginLeft:
                                                                                '20%',
                                                                            fontWeight:
                                                                                'bold',
                                                                        }}
                                                                        variant="body2"
                                                                        align="left"
                                                                    >
                                                                        {
                                                                            'Título:'
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                        }}
                                                                        variant="body2"
                                                                        align="right"
                                                                    >
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Title
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                            marginLeft:
                                                                                '20%',
                                                                            fontWeight:
                                                                                'bold',
                                                                        }}
                                                                        variant="body2"
                                                                        align="left"
                                                                    >
                                                                        {
                                                                            'Gênero:'
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                        }}
                                                                        variant="body2"
                                                                        align="right"
                                                                    >
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .Genre
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                            marginLeft:
                                                                                '20%',
                                                                            fontWeight:
                                                                                'bold',
                                                                        }}
                                                                        variant="body2"
                                                                        align="left"
                                                                    >
                                                                        {
                                                                            'Nota iMDb:'
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                        }}
                                                                        variant="body2"
                                                                        align="right"
                                                                    >
                                                                        {
                                                                            this
                                                                                .state
                                                                                .movieInfo
                                                                                .imdbRating
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Typography
                                                                        style={{
                                                                            margin: '10%',
                                                                            marginLeft:
                                                                                '20%',
                                                                            fontWeight:
                                                                                'bold',
                                                                        }}
                                                                        variant="body2"
                                                                        align="left"
                                                                    >
                                                                        {
                                                                            'Prêmios:'
                                                                        }
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid
                                                                    item
                                                                    xs={6}
                                                                >
                                                                    <Grid
                                                                        container
                                                                    >
                                                                        <Grid
                                                                            item
                                                                            xs={
                                                                                12
                                                                            }
                                                                        >
                                                                            <Typography
                                                                                style={{
                                                                                    margin: '10%',
                                                                                    overflow:
                                                                                        'auto',
                                                                                    maxHeight:
                                                                                        '80px',
                                                                                }}
                                                                                variant="body2"
                                                                                align="right"
                                                                            >
                                                                                {
                                                                                    this
                                                                                        .state
                                                                                        .movieInfo
                                                                                        .Awards
                                                                                }
                                                                            </Typography>
                                                                        </Grid>
                                                                    </Grid>
                                                                </Grid>
                                                            </Grid>
                                                        </Grid>
                                                        <Grid item xs={12}>
                                                            <Typography
                                                                style={{
                                                                    marginLeft:
                                                                        '3%',
                                                                    marginTop:
                                                                        '3%',
                                                                    fontWeight:
                                                                        'bold',
                                                                }}
                                                                variant="body2"
                                                                align="left"
                                                            >
                                                                {'Plot:'}
                                                            </Typography>
                                                            <Typography
                                                                style={{
                                                                    margin: '1%',
                                                                    marginLeft:
                                                                        '3%',
                                                                }}
                                                                variant="body2"
                                                                align="left"
                                                            >
                                                                {
                                                                    this.state
                                                                        .movieInfo
                                                                        .Plot
                                                                }
                                                            </Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Paper>
                                            </Grid>
                                        </Hidden>
                                    </div>
                                ) : (
                                    <Grid container justifyContent="center">
                                        {' '}
                                        <Grid item xs={11}>
                                            <Typography
                                                align="center"
                                                style={{ padding: '1%' }}
                                                variant="h4"
                                            >
                                                {this.state.movie}
                                            </Typography>{' '}
                                        </Grid>
                                    </Grid>
                                )}
                                {this.state.sessionInfoIsReady ? (
                                    <Grid item xs={12}>
                                        <Paper
                                            style={{
                                                margin: '1%',
                                                padding: '1%',
                                                overflow: 'auto',
                                            }}
                                        >
                                            <Typography
                                                style={{ padding: '1%' }}
                                                variant="h5"
                                            >
                                                {' '}
                                                Informações das Sessões:
                                            </Typography>
                                            <Table>
                                                <TableHead>
                                                    <TableRow
                                                        onClick={(e) =>
                                                            this.handleSessionTableSort(
                                                                e.target.id
                                                            )
                                                        }
                                                    >
                                                        <TableCell
                                                            id={'name'}
                                                            align="right"
                                                        >
                                                            Cinema
                                                        </TableCell>
                                                        <TableCell
                                                            id={'times'}
                                                            align="right"
                                                        >
                                                            Sessões
                                                        </TableCell>
                                                        <TableCell
                                                            id={'distance'}
                                                            align="right"
                                                        >
                                                            Distância (km)
                                                        </TableCell>
                                                        <TableCell
                                                            id={'neighborhood'}
                                                            align="right"
                                                        >
                                                            Bairro
                                                        </TableCell>
                                                        <TableCell
                                                            id={'price'}
                                                            align="right"
                                                        >
                                                            Preço [R$]
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {this.state
                                                        .sessionInfoIsReady
                                                        ? this.state.sessionTable
                                                              .sort((a, b) =>
                                                                  a[
                                                                      this.state
                                                                          .sessionTableSortColumn
                                                                  ] >
                                                                  b[
                                                                      this.state
                                                                          .sessionTableSortColumn
                                                                  ]
                                                                      ? this
                                                                            .state
                                                                            .sessionTableSortDirection
                                                                      : this
                                                                            .state
                                                                            .sessionTableSortDirection *
                                                                        -1
                                                              )
                                                              .map(
                                                                  (theater) => {
                                                                      return (
                                                                          <TableRow
                                                                              key={
                                                                                  theater.name
                                                                              }
                                                                          >
                                                                              <TableCell
                                                                                  component="th"
                                                                                  scope="row"
                                                                              >
                                                                                  {
                                                                                      theater.name
                                                                                  }
                                                                              </TableCell>
                                                                              <TableCell align="right">
                                                                                  {
                                                                                      theater.times
                                                                                  }
                                                                              </TableCell>
                                                                              <TableCell align="right">
                                                                                  {
                                                                                      theater.distance
                                                                                  }
                                                                              </TableCell>
                                                                              <TableCell align="right">
                                                                                  {
                                                                                      theater.neighborhood
                                                                                  }
                                                                              </TableCell>
                                                                              <TableCell align="right">
                                                                                  {Math.round(
                                                                                      (theater.price /
                                                                                          1.14) *
                                                                                          100
                                                                                  ) /
                                                                                      100}
                                                                              </TableCell>
                                                                          </TableRow>
                                                                      );
                                                                  }
                                                              )
                                                        : null}
                                                </TableBody>
                                            </Table>
                                        </Paper>
                                    </Grid>
                                ) : null}
                            </Grid>
                        </Grid>
                    </Grid>
                </div>
            );
        } else {
            return (
                <div style={{ overflow: 'hidden' }}>
                    <AppBar position="static">
                        <Toolbar>
                            <img
                                alt="Sem Imagem"
                                style={{ margin: '1%', width: '30px' }}
                                src={
                                    'http://icons.iconarchive.com/icons/dtafalonso/android-lollipop/256/Movie-Studio-icon.png'
                                }
                            />
                            <Typography variant="h6">Vai ver o que?</Typography>
                        </Toolbar>
                    </AppBar>
                    <Grid
                        container
                        alignItems={'center'}
                        justifyContent={'center'}
                        spacing={8}
                    >
                        <Grid item>
                            {/* <Button color="secondary" fullWidth={true} onClick={this.onPrintStateButtonClick}>Print State</Button> */}
                        </Grid>
                    </Grid>
                    <Grid container justifyContent={'center'}>
                        <Grid item xs={4}>
                            <Typography style={{ margin: '5%' }}>
                                Selecione o Filme:
                            </Typography>
                            <FormControl
                                value={'this.state.movie'}
                                fullWidth={true}
                            >
                                <Select
                                    style={{ margin: '5%' }}
                                    value={
                                        this.state.movie
                                            ? JSON.stringify({
                                                  title: this.state.movie,
                                                  originalTitle:
                                                      this.state.originalMovie,
                                                  trailer: this.state.trailer,
                                              })
                                            : ''
                                    }
                                    onChange={(e) =>
                                        this.handleMovieSelector(e)
                                    }
                                >
                                    {this.state.availableMovies.map(
                                              (movie) => (
                                                  <MenuItem
                                                      style={{ height: '5%' }}
                                                      key={movie.title}
                                                      value={JSON.stringify({
                                                          title: movie.title,
                                                          originalTitle:
                                                              movie.originalTitle,
                                                          trailer:
                                                              movie.trailers,
                                                      })}
                                                  >
                                                      {this.returnStyledMenuItemContent(
                                                          movie
                                                      )}
                                                  </MenuItem>
                                              )
                                          )
                                        }
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                    <Grid container justifyContent="center">
                        <Paper style={{ margin: '50px', padding: '30px' }}>
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
                </div>
            );
        }
    }
}

export default Home;
