import type { NextApiRequest, NextApiResponse } from 'next'
import Part from "@/models/part.model"
import { PipelineStage } from 'mongoose';
import NextCors from 'nextjs-cors';

type AggQuan = {
  _id: {
    partNo: string
  },
  quantity: number
}

function createPartyQuantityMap(array: any[]) {
  return Object.assign({}, ...array.map((ele: AggQuan) => {
    var data: any = {};
    const partNo: string = ele._id.partNo;
    data[partNo] = ele.quantity
    return data;
  }))
}

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
    
    var date: Date = new Date(req.query.date.toString());

    var checkpoint = req.query.checkpoint;

    var openingCond: PipelineStage = {
      $match: {
        checkpoint: checkpoint,
        date: { $lt: date },
      }
    };

    var soldCond: PipelineStage = {
      $match: {
        checkpoint: checkpoint,
        date: date,
        saleType: {$exists : true}
      }
    };

    var closingCond: PipelineStage = {
      $match: { 
        checkpoint: checkpoint,
        date: { $lte: date } 
      }
    };

    var receivedCond: PipelineStage = {
      $match: {
        checkpoint: checkpoint,
        date: date,
        saleType: {$exists : false}
      }
    };

    const groupParty: PipelineStage = {
      $group: {
        _id: { partNo: '$partNo' },
        quantity: { $sum: "$quantity" }
      }
    };

    const absQuantity: PipelineStage = {
      $project : { 
        quantity : { 
          $abs : "$quantity" 
        }  
      } 
    };

    var [
      opening, 
      sold, 
      closing, 
      received, 
      saleTypes,
      counterSold,
      workshopSold
    ]: any[] = await Promise.all([
      Part.aggregate([
        openingCond, 
        groupParty
      ]),
      Part.aggregate([
        soldCond, 
        groupParty, 
        absQuantity
      ]), 
      Part.aggregate([
        closingCond, 
        groupParty
      ]), 
      Part.aggregate([
        receivedCond, 
        groupParty
      ]), 
    
      Part.aggregate([
        {
          $match: {
            checkpoint: checkpoint,
            date: date, 
            saleType: {$exists : true},
          }
        },
        {
          $group : {
            _id : { saleType: "$saleType" },
            quantity: { $sum: "$quantity" }
          } 
        }, 
        absQuantity
      ]),
      Part.aggregate([
        {
          $match: {
            checkpoint: checkpoint,
            date: date, 
            saleType: "Counter",
          }
        },
        groupParty, 
        absQuantity
      ]),
      Part.aggregate([
        {
          $match: {
            checkpoint: checkpoint,
            date: date, 
            saleType: "Workshop",
          }
        },
        groupParty, 
        absQuantity
      ])
    ]);

    [opening, sold, closing, 
      received, counterSold, workshopSold] = [opening, sold, closing, 
                                              received, counterSold, workshopSold
                                            ].map(createPartyQuantityMap);

    var partNos = new Set([
      ...Object.keys(opening),
      ...Object.keys(sold),
      ...Object.keys(closing),
      ...Object.keys(received)
    ]);

    var data: any = { 
      saleInfo: {},
      total: {},
      // checkpoints: {},
      saleTypes: {},
      counterSold: {},
      workshopSold: {}
    };
    
    data.saleInfo["daily"] = Object.assign({}, ...Array.from(partNos).map((partNo: string) => {
      var res: any = {}

      res[partNo] = [opening, sold, closing, received].map(x => {
        return x[partNo] ? x[partNo] : 0;
      })
      
      return res;
    }));

    data.total["daily"] = (await Promise.all([
      openingCond, soldCond, 
      closingCond, receivedCond].map(x => Part.aggregate([
        x,
        {
          $group : {
            _id : null,
            quantity : {
              $sum : "$quantity"
            }
          }
        },
        absQuantity
      ])))).map((x: any) => (x[0]?.quantity ? x[0]?.quantity : 0))
      
    data.counterSold["daily"] = counterSold;

    data.workshopSold["daily"] = workshopSold;
    
    data["saleTypes"]["daily"] = Object.assign({}, ...saleTypes.map((ele: any) => {
      const saleType = ele["_id"]["saleType"];
      var result: any = {};
      result[saleType] = ele["quantity"];
      return result;
    }));
    
    soldCond = {
      $match: {
        checkpoint: checkpoint,
        date: { 
          $lte: date,
          $gte: new Date(date.getFullYear(), date.getMonth(), 1),
        },
        saleType: {$exists : true}
      }
    };

    receivedCond = {
      $match: {
        checkpoint: checkpoint,
        date: {
          $gte: new Date(date.getFullYear(), date.getMonth(), 1),
          $lte: date
        },
        saleType: {$exists : false}
      }
    };

    [
      sold,
      received, 
      saleTypes, 
      counterSold, 
      workshopSold
    ] = await Promise.all([
      Part.aggregate([
        soldCond,
        groupParty,
        absQuantity
      ]),
      Part.aggregate([
        receivedCond,
        groupParty
      ]),
      Part.aggregate([
        {
          $match: {
            checkpoint: checkpoint,
            date: { 
              $lte: date,
              $gte: new Date(date.getFullYear(), date.getMonth(), 1),
            }, 
            saleType: {$exists : true},
          }
        },
        {
          $group : {
            _id : { saleType: "$saleType" },
            quantity: { $sum: "$quantity" }
          } 
        }, 
        absQuantity
      ]),
      Part.aggregate([
        {
          $match: {
            checkpoint: checkpoint,
            date: { 
              $lte: date,
              $gte: new Date(date.getFullYear(), date.getMonth(), 1),
            }, 
            saleType: "Counter",
          }
        },
        groupParty, 
        absQuantity
      ]),
      Part.aggregate([
        {
          $match: {
            checkpoint: checkpoint,
            date: { 
              $lte: date,
              $gte: new Date(date.getFullYear(), date.getMonth(), 1),
            }, 
            saleType: "Workshop",
          }
        },
        groupParty, 
        absQuantity
      ]),
    ]);

    [sold, received, counterSold, workshopSold] = [sold, received, 
                                                counterSold, workshopSold
                                            ].map(createPartyQuantityMap);
    
    partNos = new Set([
      ...Object.keys(sold),
      ...Object.keys(received)
    ]);
    
    data["saleInfo"]["monthly"] = Object.assign({}, ...Array.from(partNos).map((partNo: string) => {
      var res: any = {}

      res[partNo] = [sold, received].map(x => {
        return x[partNo] ? x[partNo] : 0;
      })
      
      return res;
    }));

    data["total"]["monthly"] = (await Promise.all([
      soldCond, receivedCond].map(x => Part.aggregate([
        x,
        {
          $group : {
            _id : null,
            quantity : {
              $sum : "$quantity"
            }
          }
        },
        absQuantity
      ])))).map((x: any) => (x[0]?.quantity ? x[0]?.quantity : 0))

    data["saleTypes"]["monthly"] = Object.assign({}, ...saleTypes.map((ele: any) => {
      const saleType = ele["_id"]["saleType"];
      var result: any = {};
      result[saleType] = ele["quantity"];
      return result;
    }));

    data.counterSold["monthly"] = counterSold;

    data.workshopSold["monthly"] = workshopSold;

    res.status(200).send(data);

  } catch (error) {
    res.status(502).send(error);
  }
}