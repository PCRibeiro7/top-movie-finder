import {
    IMDB_DATASET_CACHE_TTL,
    RATING_PROVIDER_TIMEOUT,
} from '../../shared/ratings';

const DATASET_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
let snapshot: { text: string; expiresAt: number } | undefined;
let loading: Promise<string> | undefined;

async function loadSnapshot(): Promise<string> {
    const response = await fetch(DATASET_URL, {
        signal: AbortSignal.timeout(RATING_PROVIDER_TIMEOUT),
    });
    if (!response.ok || !response.body) {
        throw new Error('IMDb ratings unavailable');
    }
    const text = await new Response(
        response.body.pipeThrough(new DecompressionStream('gzip')),
    ).text();
    const header = text.match(/^tconst\taverageRating\tnumVotes\r?\n/);
    if (
        !header ||
        text.length === header[0].length ||
        !text.endsWith('\n')
    ) {
        throw new Error('IMDb ratings unavailable');
    }
    snapshot = { text, expiresAt: Date.now() + IMDB_DATASET_CACHE_TTL };
    return text;
}

function dataset() {
    if (snapshot && snapshot.expiresAt > Date.now()) {
        return Promise.resolve(snapshot.text);
    }
    if (!loading) {
        loading = loadSnapshot().finally(() => {
            loading = undefined;
        });
    }
    return loading;
}

export async function imdbRating(
    imdbId: string,
    signal: AbortSignal,
): Promise<string | null> {
    if (!/^tt\d+$/.test(imdbId)) throw new Error('Invalid IMDb ID');
    signal.throwIfAborted();
    // The shared download has its own deadline; callers cancel only their wait.
    const text = await new Promise<string>((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        dataset()
            .then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', abort));
    });
    signal.throwIfAborted();
    const start = text.indexOf(`\n${imdbId}\t`);
    if (start < 0) return null;
    const row = text.slice(start + 1, text.indexOf('\n', start + 1)).trim();
    const fields = row.split('\t');
    const score = Number(fields[1]);
    if (
        fields.length !== 3 ||
        !/^\d+(?:\.\d+)?$/.test(fields[1]) ||
        !Number.isFinite(score) ||
        score <= 0 ||
        score > 10 ||
        !/^[1-9]\d*$/.test(fields[2])
    ) {
        snapshot = undefined;
        throw new Error('IMDb ratings unavailable');
    }
    return fields[1];
}
