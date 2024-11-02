import availableMoviesRequest from '../../src/requests/availableMoviesRequester';

export default async function handler(req, res) {
    const response = await availableMoviesRequest(req.query.cityId);
    res.status(200).json(response);
}
