# Product Action Matrix – Complete Implementation Plan

## 1. Goal

Turn the current flat table into a clear, decision-oriented **Product Action Matrix** that helps users instantly answer:

- Which products are clear winners? (Star Product)
- Which products need urgent attention? (Needs Attention)
- Which products are mixed / unclear? (Mixed Reviews)
- How much evidence supports each classification? (Volume)

---

## 2. Final Design Specification

### Layout

```
Product Action Matrix
Products categorized based on their performance.

[Search products...]     [Sort: Volume ▾]     [Min. Volume: 5 ▾]

┌─ Star Product (3) ────────────────────────────────────────────┐
│ Portable Power Bank      86% Pos · 7% Neg · 42 reviews   +79  │
│ HDMI Cable               81% Pos · 14% Neg · 28 reviews  +67  │
│ Desk Lamp                80% Pos · 0% Neg · 15 reviews   +80  │
└───────────────────────────────────────────────────────────────┘

┌─ Needs Attention (2) ─────────────────────────────────────────┐
│ Wireless Mouse           42% Pos · 45% Neg · 31 reviews  –3   │
│ Smartphone Charger       48% Pos · 39% Neg · 19 reviews  +9   │
└───────────────────────────────────────────────────────────────┘

┌─ Mixed Reviews (6) ───────────────────────────────────────────┐
│ Mechanical Keyboard      50% Pos · 33% Neg · 24 reviews  +17  │
│ ...                                                           │
└───────────────────────────────────────────────────────────────┘
```

### Visual Rules

| Element              | Specification |
|----------------------|---------------|
| Section headers      | Real grouped sections with count badge (not repeated row badges) |
| Star Product         | Green left border + green header |
| Needs Attention      | Red left border + red header |
| Mixed Reviews        | Gray/amber left border + neutral header |
| Product name         | Bold, clickable |
| Metrics              | Positive %, Negative %, Volume (reviews), Net Score |
| Net Score            | Positive % − Negative % (e.g. `+79` or `–12`) |
| Row hover            | Light background |
| Selected row         | Clear highlight + left accent |

### Controls

- Search input (filter by product name)
- Sort dropdown: Volume · Net Score · Positive % · Negative %
- Minimum Volume filter (e.g. 1 / 5 / 10 / 20) – hides low-evidence products

---

## 3. Business Logic – Category Rules

These rules must be explicit and tunable.

### 3.1 Classification Logic

```ts
function classifyProduct(p: ProductStats): "star" | "needs_attention" | "mixed" {
  const { positivePct, negativePct, total } = p;

  // Guard: very low volume stays Mixed (or can be hidden by Min Volume filter)
  if (total < 5) return "mixed";

  // Star Product
  if (positivePct >= 75 && negativePct <= 15) {
    return "star";
  }

  // Needs Attention
  if (negativePct >= 30 || negativePct > positivePct) {
    return "needs_attention";
  }

  // Everything else
  return "mixed";
}
```

### 3.2 Recommended Default Thresholds

| Category          | Condition                                      |
|-------------------|------------------------------------------------|
| Star Product      | Positive ≥ 75% **and** Negative ≤ 15%         |
| Needs Attention   | Negative ≥ 30% **or** Negative > Positive     |
| Mixed Reviews     | Everything else                                |

> Thresholds should be easy to change later (put them in a config object).

### 3.3 Derived Metrics

- `total` = positive + neutral + negative counts
- `positivePct` = (positive / total) * 100
- `negativePct` = (negative / total) * 100
- `netScore` = positivePct − negativePct

### 3.4 Sorting (within each category)

Default sort inside every section: **Volume descending**.  
User can change global sort to: Volume · Net Score · Positive % · Negative %.

### 3.5 Click Behavior

Clicking a product row must:
1. Highlight the row
2. Call `onProductSelect(productName)` so the rest of the report filters (Aspect chart, Triplet table, Word cloud, etc.)

---

## 4. Data Shape

### Raw input (from API / parent)

```ts
interface RawProductData {
  product: string;
  positive: number;
  neutral: number;
  negative: number;
}
```

### Processed item

```ts
interface ProcessedProduct {
  product: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  positivePct: number;
  negativePct: number;
  netScore: number;
  category: "star" | "needs_attention" | "mixed";
}
```

---

## 5. Technical Implementation

### 5.1 Processing Function

```ts
function processProducts(
  raw: RawProductData[],
  options: {
    minVolume: number;
    sortBy: "volume" | "netScore" | "positivePct" | "negativePct";
    search: string;
  }
): {
  star: ProcessedProduct[];
  needsAttention: ProcessedProduct[];
  mixed: ProcessedProduct[];
} {
  let items = raw.map((item) => {
    const total = item.positive + item.neutral + item.negative;
    const positivePct = total === 0 ? 0 : (item.positive / total) * 100;
    const negativePct = total === 0 ? 0 : (item.negative / total) * 100;
    const netScore = positivePct - negativePct;

    return {
      ...item,
      total,
      positivePct,
      negativePct,
      netScore,
      category: classifyProduct({ positivePct, negativePct, total }),
    };
  });

  // Filter by minimum volume
  items = items.filter((i) => i.total >= options.minVolume);

  // Search
  if (options.search.trim()) {
    const q = options.search.toLowerCase();
    items = items.filter((i) => i.product.toLowerCase().includes(q));
  }

  // Sort
  items.sort((a, b) => {
    switch (options.sortBy) {
      case "volume":
        return b.total - a.total;
      case "netScore":
        return b.netScore - a.netScore;
      case "positivePct":
        return b.positivePct - a.positivePct;
      case "negativePct":
        return b.negativePct - a.negativePct;
      default:
        return 0;
    }
  });

  return {
    star: items.filter((i) => i.category === "star"),
    needsAttention: items.filter((i) => i.category === "needs_attention"),
    mixed: items.filter((i) => i.category === "mixed"),
  };
}
```

### 5.2 Component Structure

**Suggested file:** `src/components/reports/ProductActionMatrix.tsx`

**State:**

```ts
const [search, setSearch] = useState("");
const [sortBy, setSortBy] = useState<"volume" | "netScore" | "positivePct" | "negativePct">("volume");
const [minVolume, setMinVolume] = useState(5);
const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
```

**Props:**

```ts
interface ProductActionMatrixProps {
  data: RawProductData[];
  isLoading?: boolean;
  onProductSelect?: (product: string | null) => void;
}
```

### 5.3 UI Structure

```tsx
<Card>
  <CardHeader>
    <Title>Product Action Matrix</Title>
    <Description>Products categorized based on their performance.</Description>
    <Controls>
      <SearchInput />
      <SortSelect />
      <MinVolumeSelect />
    </Controls>
  </CardHeader>

  <CardContent>
    <Section title="Star Product" count={star.length} variant="star">
      {star.map(renderRow)}
    </Section>

    <Section title="Needs Attention" count={needsAttention.length} variant="danger">
      {needsAttention.map(renderRow)}
    </Section>

    <Section title="Mixed Reviews" count={mixed.length} variant="mixed">
      {mixed.map(renderRow)}
    </Section>
  </CardContent>
</Card>
```

Each row should display:
- Product name
- Positive %
- Negative %
- Volume (`X reviews`)
- Net Score

---

## 6. Implementation Phases

### Phase 1 – Business Logic & Data
- Define TypeScript interfaces
- Implement `classifyProduct` and `processProducts`
- Put thresholds in a single config object so they are easy to tune
- Unit test the classification rules

### Phase 2 – Component Scaffold
- Create `ProductActionMatrix.tsx`
- Add search, sort, and min-volume controls
- Render three empty sections with headers and counts

### Phase 3 – Row Rendering & Styling
- Render product rows with all metrics
- Apply color coding (green / red / gray) per section
- Add hover and selected states

### Phase 4 – Interaction
- Click row → highlight + call `onProductSelect`
- Support clearing selection
- Make sure parent report filters correctly

### Phase 5 – Polish
- Loading skeleton
- Empty state per section (“No products in this category”)
- Responsive layout
- Accessibility (keyboard, labels, contrast)

### Phase 6 – Integration
- Connect to real data
- Verify filtering works with Aspect Performance chart, Triplet table, and Word cloud

---

## 7. Acceptance Criteria

- [ ] Products are correctly grouped into Star / Needs Attention / Mixed using the defined rules
- [ ] Volume (review count) is visible on every row
- [ ] Net Score is visible on every row
- [ ] Sections have clear headers with counts
- [ ] Search filters products by name
- [ ] Sort works across all categories
- [ ] Minimum Volume filter works
- [ ] Clicking a product highlights it and notifies the parent
- [ ] Empty sections show a friendly message
- [ ] Loading state is handled
- [ ] Thresholds are centralized and easy to change

---

## 8. Configuration (easy to tune later)

```ts
export const PRODUCT_MATRIX_CONFIG = {
  star: {
    minPositivePct: 75,
    maxNegativePct: 15,
  },
  needsAttention: {
    minNegativePct: 30,
  },
  minVolumeForClassification: 5, // below this → force Mixed
};
```

---

## 9. Out of Scope

- Changing backend API response format
- Adding charts inside the matrix
- Persisting filter preferences to localStorage (can be a follow-up)

---

**End of Plan**
