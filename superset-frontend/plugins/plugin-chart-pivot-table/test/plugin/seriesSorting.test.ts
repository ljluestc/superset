/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PivotData, aggregators } from '../../src/react-pivottable/utilities';

const createTestData = () => [
  { genre: 'Puzzle', metric: 'Sales', value: 100 },
  { genre: 'Puzzle', metric: 'Profit', value: 20 },
  { genre: 'Action', metric: 'Sales', value: 150 },
  { genre: 'Action', metric: 'Profit', value: 30 },
  { genre: 'Adventure', metric: 'Sales', value: 80 },
  { genre: 'Adventure', metric: 'Profit', value: 15 },
];

test('sorts by value with metrics in rows - descending (maintains series grouping)', () => {
  const data = createTestData();
  const pivotData = new PivotData({
    data,
    rows: ['genre', 'metric'],
    cols: [],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_z_to_a',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Expect series to be grouped and sorted by sum of values
  // Action (180) > Puzzle (120) > Adventure (95)
  expect(rowKeys).toEqual([
    ['Action', 'Sales'],
    ['Action', 'Profit'],
    ['Puzzle', 'Sales'],
    ['Puzzle', 'Profit'],
    ['Adventure', 'Sales'],
    ['Adventure', 'Profit'],
  ]);
});

test('sorts by value with metrics in rows - ascending (maintains series grouping)', () => {
  const data = createTestData();
  const pivotData = new PivotData({
    data,
    rows: ['genre', 'metric'],
    cols: [],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_a_to_z',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Expect series to be grouped and sorted by sum of values
  // Adventure (95) < Puzzle (120) < Action (180)
  expect(rowKeys).toEqual([
    ['Adventure', 'Sales'],
    ['Adventure', 'Profit'],
    ['Puzzle', 'Sales'],
    ['Puzzle', 'Profit'],
    ['Action', 'Sales'],
    ['Action', 'Profit'],
  ]);
});

test('sorts by key with metrics in rows (no change in behavior)', () => {
  const data = createTestData();
  const pivotData = new PivotData({
    data,
    rows: ['genre', 'metric'],
    cols: [],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'key_a_to_z',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Expect alphabetical sorting by genre, then metric
  expect(rowKeys).toEqual([
    ['Action', 'Profit'],
    ['Action', 'Sales'],
    ['Adventure', 'Profit'],
    ['Adventure', 'Sales'],
    ['Puzzle', 'Profit'],
    ['Puzzle', 'Sales'],
  ]);
});

test('sorts by value without metrics in rows (backward compatibility)', () => {
  const data = [
    { genre: 'Puzzle', sales: 100 },
    { genre: 'Action', sales: 150 },
    { genre: 'Adventure', sales: 80 },
  ];
  const pivotData = new PivotData({
    data,
    rows: ['genre'],
    cols: [],
    vals: ['sales'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_z_to_a',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Expect regular value sorting (no series grouping)
  expect(rowKeys).toEqual([['Action'], ['Puzzle'], ['Adventure']]);
});

test('sorts by value with metrics in columns (backward compatibility)', () => {
  const data = createTestData();
  const pivotData = new PivotData({
    data,
    rows: ['genre'],
    cols: ['metric'],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_z_to_a',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Expect regular value sorting by row totals
  expect(rowKeys).toEqual([['Action'], ['Puzzle'], ['Adventure']]);
});

test('handles empty metric values in series', () => {
  const data = [
    { genre: 'Puzzle', metric: 'Sales', value: 100 },
    { genre: 'Action', metric: 'Sales', value: 150 },
    { genre: 'Action', metric: 'Profit', value: null },
  ];
  const pivotData = new PivotData({
    data,
    rows: ['genre', 'metric'],
    cols: [],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_z_to_a',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Action should still be sorted by its non-null value (150)
  expect(rowKeys[0][0]).toBe('Action');
  expect(rowKeys[2][0]).toBe('Puzzle');
});

test('handles single metric per series', () => {
  const data = [
    { genre: 'Puzzle', metric: 'Sales', value: 100 },
    { genre: 'Action', metric: 'Sales', value: 150 },
    { genre: 'Adventure', metric: 'Sales', value: 80 },
  ];
  const pivotData = new PivotData({
    data,
    rows: ['genre', 'metric'],
    cols: [],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_z_to_a',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Should still maintain series grouping even with single metric
  expect(rowKeys).toEqual([
    ['Action', 'Sales'],
    ['Puzzle', 'Sales'],
    ['Adventure', 'Sales'],
  ]);
});

test('sorts columns by value with metrics in cols (series grouping)', () => {
  const data = createTestData();
  const pivotData = new PivotData({
    data,
    rows: [],
    cols: ['genre', 'metric'],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'key_a_to_z',
    colOrder: 'value_z_to_a',
  });

  const colKeys = pivotData.getColKeys();

  // Expect series to be grouped and sorted by sum of values
  // Action (180) > Puzzle (120) > Adventure (95)
  expect(colKeys).toEqual([
    ['Action', 'Sales'],
    ['Action', 'Profit'],
    ['Puzzle', 'Sales'],
    ['Puzzle', 'Profit'],
    ['Adventure', 'Sales'],
    ['Adventure', 'Profit'],
  ]);
});

test('handles multiple dimensions with metrics in rows', () => {
  const data = [
    { region: 'North', genre: 'Puzzle', metric: 'Sales', value: 100 },
    { region: 'North', genre: 'Puzzle', metric: 'Profit', value: 20 },
    { region: 'North', genre: 'Action', metric: 'Sales', value: 150 },
    { region: 'North', genre: 'Action', metric: 'Profit', value: 30 },
    { region: 'South', genre: 'Puzzle', metric: 'Sales', value: 80 },
    { region: 'South', genre: 'Puzzle', metric: 'Profit', value: 15 },
  ];
  const pivotData = new PivotData({
    data,
    rows: ['region', 'genre', 'metric'],
    cols: [],
    vals: ['value'],
    aggregatorName: 'Sum',
    aggregatorsFactory: () => aggregators,
    rowOrder: 'value_z_to_a',
    colOrder: 'key_a_to_z',
  });

  const rowKeys = pivotData.getRowKeys();

  // Series are now region+genre combinations
  // North+Action (180) > North+Puzzle (120) > South+Puzzle (95)
  expect(rowKeys).toEqual([
    ['North', 'Action', 'Sales'],
    ['North', 'Action', 'Profit'],
    ['North', 'Puzzle', 'Sales'],
    ['North', 'Puzzle', 'Profit'],
    ['South', 'Puzzle', 'Sales'],
    ['South', 'Puzzle', 'Profit'],
  ]);
});
