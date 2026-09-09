import test from 'node:test';
import assert from 'node:assert/strict';
import { area, wallTotals, roomTotals } from '../src/calculations.js';
const prices=[{id:'wall_canvas',price:500},{id:'corner',price:200},{id:'socket',price:400},{id:'inner_corner',price:600},{id:'outer_corner',price:800},{id:'soundproof',price:700}];
const wall={width:4000,height:2500,profiles:{top:'corner',bottom:'corner',left:'',right:''},sockets:2,innerCorners:1,outerCorners:0,soundproof:true,soundproofArea:10};
test('calculates wall area from millimetres',()=>assert.equal(area(wall),10));
test('calculates all wall cost groups',()=>assert.deepEqual(wallTotals(wall,prices),{area:10,profiles:1600,extras:1400,soundproof:7000,canvas:5000,total:15000}));
test('aggregates room totals',()=>assert.equal(roomTotals({walls:[wall,wall]},prices).total,30000));
