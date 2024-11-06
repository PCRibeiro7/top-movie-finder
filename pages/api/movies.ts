import availableMoviesRequest from '../../src/requests/availableMoviesRequester';

export default async function handler(
    req: { query: { cityId: string | undefined } },
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: { (arg0: any): void; new (): any };
        };
    }
) {
    const response = await availableMoviesRequest(req.query.cityId);
    res.status(200).json(response);
}
