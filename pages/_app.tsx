import { CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AppProps } from 'next/app';
import Head from 'next/head';
import '../src/index.css';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#f5bf55', contrastText: '#171917' },
        background: { default: '#101411', paper: '#191e19' },
        text: { primary: '#f5f4ed', secondary: '#a6aea5' },
        divider: '#303830',
    },
    typography: {
        fontFamily: '"DM Sans", sans-serif',
        button: { textTransform: 'none', fontWeight: 700 },
        h1: { fontFamily: '"Manrope", sans-serif', fontWeight: 800 },
        h2: { fontFamily: '"Manrope", sans-serif', fontWeight: 800 },
        h3: { fontFamily: '"Manrope", sans-serif', fontWeight: 700 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } },
        MuiTooltip: { defaultProps: { arrow: true } },
    },
});

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <meta name="theme-color" content="#101411" />
                <meta
                    name="description"
                    content="Encontre seu próximo filme favorito. Compare os filmes em cartaz, veja avaliações e descubra sessões nos cinemas da sua cidade."
                />
                <title>Vai ver o quê? — Seu próximo filme começa aqui</title>
            </Head>
            <Component {...pageProps} />
        </ThemeProvider>
    );
}

export default MyApp;
