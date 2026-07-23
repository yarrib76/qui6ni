import { ejecutarBacktesting, getBacktestingCorridas } from '../services/backtesting.service.js';

export async function ejecutar(req, res) {
  res.json({ success: true, data: await ejecutarBacktesting(req.body) });
}

export async function corridas(req, res) {
  res.json({ success: true, ...(await getBacktestingCorridas(req.query)) });
}
