# Commit Message

```
fix(pivot-table): maintain series grouping when sorting by value with metrics as rows

When metrics are configured as rows in pivot tables and users sort by value,
the previous implementation sorted individual metric rows rather than series
groups. This caused series (e.g., genres, categories) to be split across the
table, making data analysis difficult.

This fix implements series-level sorting that:
- Groups rows/columns by their parent series (non-metric dimensions)
- Calculates aggregate values (sum) for each series
- Sorts series by aggregate value while maintaining grouping
- Maintains full backward compatibility with existing pivot tables

The fix only activates when both conditions are met:
1. Sorting by value (value_a_to_z or value_z_to_a)
2. 'metric' dimension is present in rows or columns

Changes:
- Modified PivotData.sortKeys() in utilities.js to add series grouping logic
- Added comprehensive test suite covering series sorting and edge cases
- Works for both row and column sorting with metrics

Fixes #28148

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

# Pull Request Description

## Summary

Fixes issue #28148 where pivot tables with metrics as rows would split series across the table when sorting by value.

### Before
When sorting by value with metrics as rows, individual metric rows were sorted, breaking series grouping:
```
Action - Sales (150)
Puzzle - Sales (100)
Adventure - Sales (80)
Action - Profit (30)    ← Action split!
Puzzle - Profit (20)    ← Puzzle split!
```

### After
Series stay grouped together, sorted by their aggregate value:
```
Action - Sales (150)     }
Action - Profit (30)     } Action total: 180

Puzzle - Sales (100)     }
Puzzle - Profit (20)     } Puzzle total: 120
```

## Changes

### Core Implementation
**File**: `superset-frontend/plugins/plugin-chart-pivot-table/src/react-pivottable/utilities.js`

Modified `PivotData.sortKeys()` method to implement series-level sorting:
1. Detect when metrics are in rows/columns
2. Group keys by series (non-metric dimensions)
3. Calculate aggregate value (sum) for each series
4. Sort series by aggregate while maintaining grouping
5. Apply to both row and column sorting

### Tests
**File**: `superset-frontend/plugins/plugin-chart-pivot-table/test/plugin/seriesSorting.test.ts`

Added comprehensive test suite with 10 test cases covering:
- Series grouping with ascending/descending sort
- Backward compatibility scenarios
- Edge cases (null values, single metrics, multiple dimensions)
- Both row and column sorting

## Testing Instructions

### Manual Testing
1. Create a new Pivot Table chart
2. Configure:
   - Add 2+ metrics (e.g., "Sales" and "Profit")
   - Add a dimension to rows (e.g., "Genre")
   - Set "Apply metrics on" to **Rows**
3. Go to **Customize** tab
4. Set "Sort rows by" to **value descending**
5. **Verify**: Genres stay grouped with all their metrics together
6. **Verify**: Genres are ordered by their total value (sum of all metrics)

### Automated Tests
```bash
npm run test -- seriesSorting.test.ts
```

## Backward Compatibility

✅ **No breaking changes**

The fix only activates when:
- Sorting by value (not by key)
- Metrics are in rows or columns

All existing pivot tables continue working unchanged.

## Additional Context

- Uses SUM aggregation strategy (future: could add UI to choose strategy)
- Handles edge cases: null values, empty series, single metric
- Performance impact: minimal, O(n log m) where m = number of series
- Code follows existing patterns in utilities.js
- Prettier formatted, no linting issues

## Checklist

- [x] Has associated issue: #28148
- [x] Changes manually tested
- [x] Unit tests added and passing
- [x] Backward compatibility maintained
- [x] No new dependencies
- [x] Code follows Superset standards
- [x] Documentation updated (inline comments)
- [ ] Screenshots added (to be added)
- [ ] E2E tests pass (requires full test environment)

## Related Issues/PRs

Fixes #28148
