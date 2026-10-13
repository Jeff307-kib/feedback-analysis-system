# Aspect Performance Chart – Complete Implementation Plan

## 1. Goal

Rebuild the current vertical stacked bar chart into a clean, scannable **horizontal 100% stacked bar chart**.

The chart must clearly answer:

- Which aspects receive the most feedback (volume)?
- What is the sentiment mix (Positive / Neutral / Negative) for each aspect?
- Which aspects are healthy vs problematic?
- How does the picture change when the user hides Neutral?

---

## 2. Final Design Specification

### Layout Example

```
Aspect Performance                    [Top 10 ▾]  [Sort by: Volume ▾]  [☐ Show Neutral]

shipping     57   ████████████████████░░░░░░░░░░   +42
general      58   ████████████████████████░░░░░░   +65
quality      22   ████████░░░░░░░░░░░░░░░░░░░░░░   –18
works        29   ████████████████░░░░░░░░░░░░░░   +55
...
```

### Visual Elements

| Element              | Description                                              |
|----------------------|----------------------------------------------------------|
| Aspect name          | Left-aligned. Truncate with ellipsis if too long. Full name on hover. |
| Total volume         | Small number right next to the aspect name (e.g. `57`)  |
| 100% stacked bar     | Horizontal bar that always fills 100% of available width |
| Colors               | Positive `#22c55e` · Neutral `#eab308` · Negative `#ef4444` |
| Net Score            | Right side of the row (e.g. `+42` or `–18`)             |
| Selected state       | Clear visual highlight (left border or background) when clicked |

### Controls (top-right of the card)

1. **Top N selector**  
   Options: `Top 8` · `Top 10` · `Top 15` · `All`  
   Default: `Top 10`

2. **Sort by**  
   Options:  
   - Volume (default)  
   - % Negative  
   - % Positive  
   - Net Score

3. **Show Neutral** (checkbox / switch)  
   Default: **Off**

---

## 3. Business Logic

### 3.1 Neutral Toggle Rules

- **When Neutral is hidden (default)**:
  - Only Positive + Negative are used to build the 100% stack.
  - Percentages are recalculated using `positive + negative` as the denominator.
  - The real Neutral count must still appear in the tooltip.

- **When Neutral is shown**:
  - Full three-segment stack (Positive + Neutral + Negative = 100%).

### 3.2 Sorting Rules

| Sort Option     | Behavior                                      |
|-----------------|-----------------------------------------------|
| Volume          | Highest total feedback first (default)        |
| % Negative      | Highest negative percentage first             |
| % Positive      | Highest positive percentage first             |
| Net Score       | Highest (Positive % − Negative %) first       |

### 3.3 Top N Rules

- Default = Top 10
- User can switch to Top 8 / Top 15 / All
- Sorting is applied **before** slicing to Top N

### 3.4 Tooltip Content (always show real numbers)

```
Aspect: shipping
────────────────────────
Positive    38   (67%)
Neutral      4   ( 7%)
Negative    15   (26%)
Total       57
Net Score  +41
```

### 3.5 Click Behavior

Clicking any aspect row must:
1. Visually highlight that aspect
2. Notify the parent component so the rest of the report can be filtered (Product Action Matrix, Triplet Table, Word Cloud, etc.)

### 3.6 Edge Cases

- Total = 0 → treat percentages as 0
- Very long aspect names → truncate + show full name on hover
- No data → friendly empty state
- Loading → skeleton that matches the horizontal layout

---

## 4. Technical Implementation

### 4.1 Data Shapes

**Raw data coming from API / parent:**

```ts
interface RawAspectData {
  aspect: string;
  positive: number;
  neutral: number;
  negative: number;
}
```

**Processed data used by the chart:**

```ts
interface ProcessedAspect {
  aspect: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  netScore: number;
}
```

### 4.2 Processing Logic (must run on the frontend)

```ts
function processAspects(
  raw: RawAspectData[],
  options: {
    topN: number | "all";
    sortBy: "volume" | "negativePct" | "positivePct" | "netScore";
    showNeutral: boolean;
  }
): ProcessedAspect[] {
  let data = raw.map((item) => {
    const total = item.positive + item.neutral + item.negative;
    const netScore = total === 0 ? 0 : ((item.positive - item.negative) / total) * 100;

    if (options.showNeutral) {
      return {
        ...item,
        total,
        positivePct: total === 0 ? 0 : (item.positive / total) * 100,
        neutralPct: total === 0 ? 0 : (item.neutral / total) * 100,
        negativePct: total === 0 ? 0 : (item.negative / total) * 100,
        netScore,
      };
    }

    // Neutral hidden → recalculate using only positive + negative
    const relevantTotal = item.positive + item.negative;
    return {
      ...item,
      total,
      positivePct: relevantTotal === 0 ? 0 : (item.positive / relevantTotal) * 100,
      neutralPct: 0,
      negativePct: relevantTotal === 0 ? 0 : (item.negative / relevantTotal) * 100,
      netScore,
    };
  });

  // Sort
  data.sort((a, b) => {
    switch (options.sortBy) {
      case "volume":
        return b.total - a.total;
      case "negativePct":
        return b.negativePct - a.negativePct;
      case "positivePct":
        return b.positivePct - a.positivePct;
      case "netScore":
        return b.netScore - a.netScore;
      default:
        return 0;
    }
  });

  // Top N
  if (options.topN !== "all") {
    data = data.slice(0, options.topN);
  }

  return data;
}
```

### 4.3 Component Structure

**Suggested file:** `src/components/reports/AspectPerformanceChart.tsx`

**Required state:**

```ts
const [topN, setTopN] = useState<8 | 10 | 15 | "all">(10);
const [sortBy, setSortBy] = useState<"volume" | "negativePct" | "positivePct" | "netScore">("volume");
const [showNeutral, setShowNeutral] = useState(false);
const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
```

**Props the component should accept:**

```ts
interface AspectPerformanceChartProps {
  data: RawAspectData[];
  isLoading?: boolean;
  onAspectSelect?: (aspect: string | null) => void;
}
```

### 4.4 Recharts Implementation Notes

- Use `BarChart` with `layout="vertical"`
- `YAxis` → `type="category"` for aspect names (give it enough width, e.g. 130–150px)
- `XAxis` → `type="number"` with `domain={[0, 100]}` (can be hidden)
- Three `<Bar>` components with the same `stackId`:
  - `dataKey="positivePct"` (green)
  - `dataKey="neutralPct"` (amber) → render only when `showNeutral === true`
  - `dataKey="negativePct"` (red)
- Custom Tooltip that **always** shows the real counts (including Neutral)
- Click handler on the bars (or the whole row) to update `selectedAspect` and call `onAspectSelect`

### 4.5 Performance

- Wrap the `processAspects` call in `useMemo` with dependencies: `[data, topN, sortBy, showNeutral]`
- Do not mutate the original `data` array

---

## 5. Implementation Phases (for the agent)

### Phase 1 – Data Layer
- Define the TypeScript interfaces (`RawAspectData`, `ProcessedAspect`)
- Implement the pure `processAspects` function
- Write unit tests for the processing logic (especially Neutral on/off and all sort options)

### Phase 2 – Component Scaffold
- Create `AspectPerformanceChart.tsx`
- Add the card layout, title, and the three controls (Top N, Sort by, Show Neutral)
- Wire up local state for the controls

### Phase 3 – Chart Rendering
- Integrate Recharts horizontal 100% stacked bar
- Conditionally render the Neutral bar
- Implement custom Tooltip
- Show volume number and Net Score

### Phase 4 – Interaction
- Highlight the selected aspect
- Call `onAspectSelect` when user clicks an aspect
- Support clearing the selection

### Phase 5 – Polish & Edge Cases
- Loading skeleton
- Empty state
- Long aspect name truncation
- Accessibility (labels, keyboard, contrast)
- Responsive behavior

### Phase 6 – Integration
- Connect the component to the real report page
- Make sure clicking an aspect correctly filters the Product Action Matrix, Triplet Table, and Word Cloud

---

## 6. Acceptance Criteria

The task is done when all of the following are true:

- [ ] Chart is horizontal 100% stacked bars
- [ ] Neutral can be toggled on/off (default = off)
- [ ] When Neutral is off, percentages are recalculated using only Positive + Negative
- [ ] Tooltip always shows the real Neutral count
- [ ] Top N selector works (8 / 10 / 15 / All)
- [ ] All four sort options work correctly
- [ ] Total volume is visible next to each aspect name
- [ ] Net Score is displayed
- [ ] Clicking an aspect highlights it and notifies the parent
- [ ] Long names are truncated gracefully
- [ ] Loading and empty states are handled
- [ ] Code is typed, memoized, and does not mutate props

---

## 7. Out of Scope

- Changing the backend API response format
- Adding completely different chart types
- Persisting user preferences to `localStorage` (can be a later improvement)

---

**End of Plan**
