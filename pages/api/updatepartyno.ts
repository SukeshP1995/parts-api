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
      optionsSuccessStatus: 200,
    });

    await Part.updateMany({ partNo: req.query.oldPartNo }, { $set: {partNo: req.query.newPartNo,} });

    res.status(200).send('success');
  } catch (error) {
    res.status(502).send(error);
  }
}