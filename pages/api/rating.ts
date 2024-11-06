import omdbRequest from '../../src/requests/omdbRequester';

export default async function handler(
    req: { query: { movieName: string | undefined } },
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: { (arg0: any): void; new (): any };
        };
    }
) {
    if (!req.query.movieName) {
        res.status(400).json({ error: 'You must provide a movie name' });
        return;
    }
    const response = await omdbRequest(req.query.movieName);
    res.status(200).json(response);
}
