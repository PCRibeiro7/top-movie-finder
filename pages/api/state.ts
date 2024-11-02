import cityIdRequest from '../../src/requests/cityIdRequester';

export default async function handler(req, res) {
    const response = await cityIdRequest(req.query.state, req.query.city);
    res.status(200).json(response);
}
