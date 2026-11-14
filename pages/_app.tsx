import { CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AppProps } from 'next/app';
import Head from 'next/head';
import '../src/index.css';
import { colors, fonts } from '../src/styles/tokens';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: colors.accent, contrastText: colors.onAccent },
        background: { default: colors.background, paper: colors.surface },
        text: { primary: colors.text, secondary: colors.muted },
        divider: colors.border,
    },
    typography: {
        fontFamily: fonts.body,
        button: { textTransform: 'none', fontWeight: 700 },
        h1: { fontFamily: fonts.display, fontWeight: 800 },
        h2: { fontFamily: fonts.display, fontWeight: 800 },
        h3: { fontFamily: fonts.display, fontWeight: 700 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                ':root': {
                    '--bg': colors.background,
                    '--surface': colors.surface,
                    '--border': colors.border,
                    '--text': colors.text,
                    '--muted': colors.muted,
                    '--accent': colors.accent,
                    '--body': fonts.body,
                    '--display': fonts.display,
                },
            },
        },
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
                <meta name="theme-color" content={colors.background} />
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
