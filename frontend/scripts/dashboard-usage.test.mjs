import test from 'node:test';
import assert from 'node:assert/strict';
import { chartBuckets, usagePeriodLabel, usageNumber } from '../src/features/usage/usage-model.ts';
test('activity chart buckets preserve credits and bound the number of rendered bars',()=>{
  const rows=Array.from({length:366},(_,i)=>({date:new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),credits:i%5}));
  const chart=chartBuckets(rows);assert.ok(chart.length<=31);assert.equal(chart.reduce((sum,row)=>sum+row.credits,0),rows.reduce((sum,row)=>sum+row.credits,0));
  assert.equal(chart[0].date,rows[0].date);assert.equal(chart.at(-1).end,rows.at(-1).date);assert.deepEqual(chartBuckets([]),[]);
});
test('date range labels use the inclusive last day and preserve zero values',()=>{
  assert.equal(usagePeriodLabel({start:'2026-10-01T00:00:00.000Z',end:'2026-11-01T00:00:00.000Z'}),'Oct 1, 2026 – Oct 31, 2026');
  assert.equal(usageNumber(0),'0');assert.equal(usageNumber(50000),'50,000');
});
