import sessionRequest from '../../src/requests/sessionsRequester';

export default async function handler(
    req: { query: { movieId: string; cityId: string | undefined } },
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: { (arg0: any): void; new (): any };
        };
    }
) {
    const response = await sessionRequest(req.query.movieId, req.query.cityId);
    res.status(200).json(response);
}
