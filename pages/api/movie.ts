import movieIdRequest from '../../src/requests/movieIdRequester';

export default async function handler(req, res) {
    const response = await movieIdRequest(req.query.movie, req.query.cityId);
    res.status(200).json(response);
}
