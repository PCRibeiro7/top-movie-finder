import React from 'react';

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


import Grid from '@material-ui/core/Grid';
import Typography from "@material-ui/core/Typography"

export default function GenreHelpList(state) {
    return (
        <div style={{margin:"2%"}}>

        <Grid container alignItems="center">
            <Grid item xs={4} >
                <WhatshotIcon color={state.filter.genre === "Em Alta" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Em Alta"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <InsertEmoticonIcon color={state.filter.genre === "Comédia" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Comédia"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <SportsKabaddiIcon color={state.filter.genre === "Ação" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Ação"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <SentimentVeryDissatisfiedIcon color={state.filter.genre === "Drama" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Drama"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <LocalFloristIcon color={state.filter.genre === "Romance" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Romance"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <ToysIcon color={state.filter.genre === "Animação" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Animação"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <MusicNoteIcon color={state.filter.genre === "Musical" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Musical"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <MenuBookIcon color={state.filter.genre === "Biografia" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Biografia"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <FilterHdrIcon color={state.filter.genre === "Aventura" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Aventura"}</Typography>

            </Grid>
        </Grid>
        <Grid container alignItems="center">
            <Grid item xs={4} >
                <SearchIcon color={state.filter.genre === "Suspense" ? "secondary" : ""} />
            </Grid>
            <Grid item xs={8} >
                <Typography display="inline" >{"Suspense"}</Typography>

            </Grid>
        </Grid>

        </div>
    )
}