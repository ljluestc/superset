# Product Requirements Document: Pivot Table Series-Level Sorting

## Executive Summary

This PRD addresses a critical usability issue in Apache Superset's Pivot Table visualization where sorting by values breaks series grouping when metrics are configured as rows. Currently, value-based sorting operates at the individual row level rather than the series level, causing related metrics to be scattered across the table instead of staying grouped together. This fix will ensure series remain cohesive when sorting by values, maintaining data readability and analytical value.

**Issue Reference**: [#28148](https://github.com/apache/superset/issues/28148)

---

## Problem Statement

### Current Behavior
When users configure a Pivot Table with:
- Multiple metrics (e.g., "Sales", "Profit", "Growth")
- Metrics displayed as rows
- Sort by "Value" enabled

The sorting algorithm operates at the most granular row level, which causes:
- Series to be split into multiple separated groups throughout the table
- Loss of visual grouping between related metrics
- Difficulty comparing metrics within the same series
- Confusing data presentation that doesn't match user expectations

### Example Scenario
**Data Structure:**
```
Series: Puzzle
  ├─ Sales: 100
  ├─ Profit: 20
  └─ Growth: 5%

Series: Action
  ├─ Sales: 150
  ├─ Profit: 30
  └─ Growth: 8%
```

**Current (Broken) Behavior - Sorted by Value Descending:**
```
Action - Sales: 150
Puzzle - Sales: 100
Action - Profit: 30
Puzzle - Profit: 20
Action - Growth: 8%
Puzzle - Growth: 5%
```
*(Series are interleaved and scattered)*

**Expected Behavior - Sorted by Value Descending:**
```
Action (series total: 188)
  ├─ Sales: 150
  ├─ Profit: 30
  └─ Growth: 8%

Puzzle (series total: 125)
  ├─ Sales: 100
  ├─ Profit: 20
  └─ Growth: 5%
```
*(Series stay grouped, sorted by aggregate value)*

---

## Goals and Objectives

### Primary Goals
1. **Maintain series grouping** when sorting pivot tables by value with metrics as rows
2. **Sort series based on aggregate values** rather than individual row values
3. **Preserve existing functionality** for non-affected sorting scenarios (key-based sorting, metrics as columns)

### Success Criteria
- Series remain visually grouped together when sorting by value
- Sorting order reflects meaningful aggregate comparisons (sum, average, max, etc.)
- No regression in existing pivot table sorting behaviors
- Performance remains acceptable for large datasets (10k+ rows)

### Non-Goals
- Changing sorting behavior for metrics displayed as columns
- Adding new aggregation methods (use existing: sum, avg, max, min)
- Modifying key-based (A-Z) sorting logic

---

## User Stories

### Primary User Stories

**US-1: Data Analyst wants to identify top-performing series**
```
As a data analyst
I want to sort my pivot table by total value with metrics as rows
So that I can quickly identify the highest-performing series while seeing all related metrics together
```

**US-2: Business user needs to compare metrics within series**
```
As a business user
I want metrics to stay grouped under their parent series when sorting
So that I can easily compare sales, profit, and growth for each product category
```

**US-3: Dashboard creator expects intuitive sorting**
```
As a dashboard creator
I want sorting to behave predictably and maintain visual grouping
So that my stakeholders can understand the data without confusion
```

### Edge Cases

**US-4: Handling tied values**
```
Given multiple series with identical aggregate values
When sorting by value
Then series should maintain stable sort order (e.g., alphabetical as tiebreaker)
```

**US-5: Null/missing values**
```
Given some series have null or missing metric values
When sorting by value
Then null values should be treated consistently (e.g., as zero or placed at the end)
```

---

## Requirements

### Functional Requirements

#### FR-1: Series-Level Aggregation
- **Priority**: P0 (Critical)
- **Description**: Calculate aggregate values for each series based on all metrics within that series
- **Acceptance Criteria**:
  - System computes series-level aggregate (sum by default)
  - Aggregation method configurable (sum, avg, max, min)
  - Calculation happens before sorting is applied

#### FR-2: Hierarchical Sorting
- **Priority**: P0 (Critical)
- **Description**: Sort series by aggregate values while preserving metric grouping
- **Acceptance Criteria**:
  - Series are ordered by their aggregate value
  - All metrics within a series stay grouped together
  - Metric order within series remains configurable (by key or value)

#### FR-3: Sort Configuration UI
- **Priority**: P1 (High)
- **Description**: Provide UI controls for series-level sort configuration
- **Acceptance Criteria**:
  - User can select "Sort by Series Value" vs "Sort by Row Value"
  - User can choose aggregation method (sum, avg, max, min)
  - Settings persist with chart configuration
  - Clear labels explain the difference between sort modes

#### FR-4: Backward Compatibility
- **Priority**: P0 (Critical)
- **Description**: Existing charts continue to work without modification
- **Acceptance Criteria**:
  - Existing pivot tables load without errors
  - Default behavior maintains current functionality for charts without metrics as rows
  - Migration path for existing charts to opt into new behavior

#### FR-5: Null Value Handling
- **Priority**: P2 (Medium)
- **Description**: Handle null/missing values consistently in aggregation
- **Acceptance Criteria**:
  - Null values treated as zero in sum/avg calculations
  - Null handling documented in UI tooltips
  - Option to exclude nulls from calculations

### Non-Functional Requirements

#### NFR-1: Performance
- **Priority**: P0 (Critical)
- **Requirements**:
  - Sorting operations complete in <500ms for 1,000 rows
  - Sorting operations complete in <2s for 10,000 rows
  - No memory leaks during sort operations

#### NFR-2: Usability
- **Priority**: P1 (High)
- **Requirements**:
  - Sort configuration discoverable within 2 clicks
  - Clear visual feedback when series-level sorting is active
  - Tooltips explain aggregation methods

#### NFR-3: Accessibility
- **Priority**: P1 (High)
- **Requirements**:
  - Keyboard navigation for sort controls
  - Screen reader announcements for sort state changes
  - WCAG 2.1 AA compliance

#### NFR-4: Testing
- **Priority**: P0 (Critical)
- **Requirements**:
  - Unit test coverage >80% for sorting logic
  - Integration tests for all aggregation methods
  - Playwright E2E test for user workflows
  - Performance benchmarks for large datasets

---

## Solution Approach

### Technical Design

#### Phase 1: Data Processing Layer (Backend)
**Location**: `superset-frontend/plugins/plugin-chart-pivot-table/src/plugin/transformProps.ts`

1. **Detect metrics-as-rows configuration**
   - Check if `metricsLayout === 'ROWS'`
   - Identify series grouping column(s)

2. **Calculate series-level aggregates**
   ```typescript
   interface SeriesAggregate {
     seriesKey: string;
     aggregateValue: number;
     aggregationMethod: 'sum' | 'avg' | 'max' | 'min';
     metrics: MetricRow[];
   }
   ```

3. **Apply hierarchical sorting**
   - Sort series by aggregate value
   - Preserve metric order within each series
   - Maintain stable sort for tied values

#### Phase 2: UI Controls (Frontend)
**Location**: `superset-frontend/plugins/plugin-chart-pivot-table/src/plugin/controlPanel.ts`

1. **Add sort mode selector**
   ```typescript
   {
     name: 'sortMode',
     config: {
       type: 'SelectControl',
       label: t('Sort Mode'),
       default: 'row',
       choices: [
         ['row', t('By Row Value')],
         ['series', t('By Series Aggregate')]
       ],
       renderTrigger: true,
       visibility: ({ controls }) => controls?.metricsLayout?.value === 'ROWS'
     }
   }
   ```

2. **Add aggregation method selector**
   - Only visible when `sortMode === 'series'`
   - Options: Sum, Average, Max, Min
   - Include tooltips explaining each method

#### Phase 3: Visualization Layer
**Location**: `superset-frontend/plugins/plugin-chart-pivot-table/src/PivotTable.tsx`

1. **Apply sorting to data structure**
   - Transform data based on sort configuration
   - Maintain row grouping visual hierarchy
   - Update row styling to emphasize series grouping

2. **Visual indicators**
   - Subtle background color alternation between series
   - Optional series subtotal row
   - Sort indicator icon showing active sort method

### Implementation Files

```
superset-frontend/plugins/plugin-chart-pivot-table/
├── src/
│   ├── plugin/
│   │   ├── transformProps.ts          # Add aggregation logic (MODIFY)
│   │   └── controlPanel.ts            # Add UI controls (MODIFY)
│   ├── PivotTable.tsx                 # Apply visual grouping (MODIFY)
│   └── utils/
│       └── seriesAggregation.ts       # New helper functions (CREATE)
├── test/
│   ├── seriesAggregation.test.ts      # Unit tests (CREATE)
│   └── PivotTable.test.tsx            # Update component tests (MODIFY)
```

### Algorithm: Series-Level Sorting

```typescript
function applySeriesTotalSorting(
  data: PivotTableData,
  config: {
    sortMode: 'row' | 'series';
    aggregationMethod: 'sum' | 'avg' | 'max' | 'min';
    sortOrder: 'asc' | 'desc';
  }
): PivotTableData {
  if (config.sortMode === 'row') {
    // Existing behavior - sort each row independently
    return sortByRowValue(data, config.sortOrder);
  }

  // Group rows by series
  const seriesGroups = groupBySeriesKey(data);

  // Calculate aggregate for each series
  const seriesWithAggregates = seriesGroups.map(series => ({
    ...series,
    aggregate: calculateAggregate(series.metrics, config.aggregationMethod)
  }));

  // Sort series by aggregate value
  const sortedSeries = seriesWithAggregates.sort((a, b) => {
    const comparison = a.aggregate - b.aggregate;
    return config.sortOrder === 'desc' ? -comparison : comparison;
  });

  // Flatten back to row structure while preserving grouping
  return flattenSeriesGroups(sortedSeries);
}

function calculateAggregate(
  metrics: MetricRow[],
  method: 'sum' | 'avg' | 'max' | 'min'
): number {
  const values = metrics
    .map(m => m.value)
    .filter(v => v != null && !isNaN(v));

  switch (method) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);
    case 'avg':
      return values.length > 0 ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;
    case 'max':
      return values.length > 0 ? Math.max(...values) : 0;
    case 'min':
      return values.length > 0 ? Math.min(...values) : 0;
    default:
      return 0;
  }
}
```

---

## Success Metrics

### Quantitative Metrics

1. **Functionality**
   - 100% of test cases pass for series-level sorting
   - 0 regressions in existing pivot table functionality
   - <500ms sort time for 1,000 rows
   - <2s sort time for 10,000 rows

2. **Adoption**
   - >30% of pivot table charts with metrics-as-rows use series sorting within 3 months
   - <5% revert rate (users switching back to row sorting)

3. **Quality**
   - 0 P0/P1 bugs reported in first month after release
   - >80% code coverage for new sorting logic
   - 100% of E2E test scenarios pass

### Qualitative Metrics

1. **User Feedback**
   - Positive sentiment in GitHub issue comments
   - No new related bug reports for 30 days post-release
   - Feature mentioned positively in community Slack

2. **Usability**
   - Users can configure series sorting without documentation
   - Sort behavior matches user mental model (validated via user testing)

---

## Timeline and Milestones

### Phase 1: Design and Planning (Week 1)
- [ ] Technical design review
- [ ] UI/UX mockups for sort controls
- [ ] Test plan finalization
- [ ] Stakeholder approval

### Phase 2: Implementation (Weeks 2-4)
- [ ] Week 2: Implement aggregation logic and utils
- [ ] Week 3: Add UI controls and integrate with chart
- [ ] Week 4: Visual refinements and performance optimization

### Phase 3: Testing (Week 5)
- [ ] Unit tests (target: >80% coverage)
- [ ] Integration tests for all aggregation methods
- [ ] Playwright E2E tests
- [ ] Performance benchmarking
- [ ] Manual QA testing

### Phase 4: Documentation and Release (Week 6)
- [ ] Update user documentation (docs/)
- [ ] Update UPDATING.md if breaking changes
- [ ] Create demo chart/dashboard
- [ ] Submit PR for review
- [ ] Address review feedback
- [ ] Merge and release

---

## Open Questions and Risks

### Open Questions

1. **Q1: Default aggregation method**
   - Should default be "sum" or should we infer based on metric type?
   - **Decision needed by**: Week 1

2. **Q2: Series subtotal display**
   - Should we show the aggregate value as a subtotal row?
   - **Decision needed by**: Week 2

3. **Q3: Migration strategy**
   - Should existing charts automatically adopt new behavior or require opt-in?
   - **Decision needed by**: Week 1

4. **Q4: Multi-level series grouping**
   - How should sorting work with nested series (e.g., Country > Region > City)?
   - **Decision needed by**: Week 2

### Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Performance degradation for large datasets** | High | Medium | Implement efficient aggregation algorithms; add caching; benchmark early |
| **Breaking changes to existing charts** | High | Low | Comprehensive regression testing; feature flag for gradual rollout |
| **Complex edge cases with null values** | Medium | Medium | Define clear null-handling rules; extensive test coverage |
| **User confusion with two sort modes** | Medium | Medium | Clear UI labels and tooltips; in-app help documentation |
| **Scope creep (requests for custom aggregations)** | Low | High | Clearly define supported aggregation methods; defer custom formulas to future release |

---

## Dependencies

### Technical Dependencies
- Existing pivot table plugin architecture
- React Testing Library for component tests
- Playwright for E2E tests
- TypeScript type system

### Team Dependencies
- Frontend team: Implementation and testing
- Design team: UI/UX for sort controls
- Documentation team: User guide updates
- QA team: Manual testing and edge case validation

### External Dependencies
- No external API changes required
- No new library dependencies expected

---

## Appendix

### Related Issues
- [#28148](https://github.com/apache/superset/issues/28148) - Cannot sort series by value in Pivot Tables

### Reference Materials
- [Pivot Table Plugin Documentation](https://github.com/apache/superset/tree/master/superset-frontend/plugins/plugin-chart-pivot-table)
- [Superset Contribution Guidelines](https://superset.apache.org/docs/contributing/development)
- [Testing Best Practices](https://superset.apache.org/docs/contributing/testing)

### Glossary
- **Series**: A group of related metrics (e.g., all metrics for "Puzzle" genre)
- **Metric**: A quantitative measure (e.g., "Sales", "Profit")
- **Aggregate**: A calculated summary value (sum, average, max, min) for a series
- **Row-level sorting**: Current behavior - sorts each individual metric row independently
- **Series-level sorting**: Proposed behavior - sorts series groups by their aggregate values

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Author**: Product Team
**Status**: Draft - Pending Review
