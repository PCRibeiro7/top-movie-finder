import cityIdRequest from '../../src/requests/cityIdRequester';

export default async function handler(
    req: { query: { state: string | undefined; city: string | undefined } },
    res: {
        status: (arg0: number) => {
            (): any;
            new (): any;
            json: { (arg0: any): void; new (): any };
        };
    }
) {
    const response = await cityIdRequest(req.query.state, req.query.city);
    res.status(200).json(response);
}
