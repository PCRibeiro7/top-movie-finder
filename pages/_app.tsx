import { createTheme, ThemeProvider } from '@mui/material/styles';
import Head from 'next/head';

const theme = createTheme();

function MyApp({ Component, pageProps }) {
    return (
        <>
            <ThemeProvider theme={theme}>
                <Head>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    />
                    <title>Vai ver o que?</title>
                </Head>
                <Component {...pageProps} />
            </ThemeProvider>
        </>
    );
}

export default MyApp;
