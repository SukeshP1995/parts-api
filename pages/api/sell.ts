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

    var parts: any[] = req.body.parts;
    
    var checkpoint: string = req.body.checkpoint;

    var parts: any[] = await Promise.all((req.body.parts as any[]).map(async (row) => {
      return {
        partNo: row.partNo,
        quantity: -row.quantity,
        date: row.date,
        saleType: row.saleType,
        checkpoint: checkpoint
      }    
    }));

    await Part.insertMany(parts);

    res.status(200).send('success');
  } catch (error) {
    res.status(502).send('fail');
  }
}