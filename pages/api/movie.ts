import movieIdRequest from '../../src/requests/movieIdRequester';

export default async function handler(
    req: { query: { movie: string; cityId: string | undefined } },
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: { (arg0: any): void; new (): any };
        };
    }
) {
    const response = await movieIdRequest(req.query.movie, req.query.cityId);
    res.status(200).json(response);
}
