import sessionRequest from '../../src/requests/sessionsRequester';

export default async function handler(req, res) {
    const response = await sessionRequest(req.query.movieId, req.query.cityId);
    res.status(200).json(response);
}
