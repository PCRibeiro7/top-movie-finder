import React from 'react';
import {
    FormControl,
    Select,
    MenuItem,
    Typography,
    Paper,
    Grid,
} from '@material-ui/core';
import WhatshotIcon from '@material-ui/icons/Whatshot';
import InsertEmoticonIcon from '@material-ui/icons/InsertEmoticon';
import SearchIcon from '@material-ui/icons/Search';
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import FilterHdrIcon from '@material-ui/icons/FilterHdr';
import ToysIcon from '@material-ui/icons/Toys';
import SportsKabaddiIcon from '@material-ui/icons/SportsKabaddi';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import LocalFloristIcon from '@material-ui/icons/LocalFlorist';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import { HomeState } from '../../pages';

type MovieSelectorProps = {
    state: HomeState;
    handleMovieSelector: (event: React.ChangeEvent<{ value: unknown }>) => void;
};

const MovieSelector = ({ state, handleMovieSelector }:MovieSelectorProps) => {
    function returnStyledMenuItemContent(movie) {
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
    return (
        <Grid item xs={4} style={{ margin: '1%' }}>
            <Paper style={{ padding: '1%' }}>
                <Typography variant="h6">Filme Selecionado:</Typography>
                <FormControl value={state.movie} fullWidth={true}>
                    <Select
                        value={
                            state.movie
                                ? JSON.stringify({
                                      title: state.movie,
                                      originalTitle: state.originalMovie,
                                      trailer: state.trailer,
                                  })
                                : ''
                        }
                        onChange={handleMovieSelector}
                    >
                        {state.availableMovies?.map((movie) => (
                            <MenuItem
                                style={{ height: '5%' }}
                                key={movie.title}
                                value={JSON.stringify({
                                    title: movie.title,
                                    originalTitle: movie.originalTitle,
                                    trailer: movie.trailers,
                                })}
                            >
                                {returnStyledMenuItemContent(movie)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Paper>
        </Grid>
    );
};

export default MovieSelector;
