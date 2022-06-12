import type { NextApiRequest, NextApiResponse } from 'next'
import Part from "@/models/part.model"
import NextCors from 'nextjs-cors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await NextCors(req, res, {
      // Options
      methods: ['GET', 'POST'],
      origin: '*',
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    var date = req.query.date;
    var checkpoint = req.query.checkpoint;

    const parts = (await Part.find({
                    date: date,
                    saleType: {$exists : false},
                    checkpoint: checkpoint
                  },));

    res.status(200).send(JSON.stringify(parts));
  } catch (error) {
    res.status(502).send(error);
  }
}
