import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageSquareText
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WordCloud from 'react-d3-cloud';

interface DeepDiveDrillDownProps {
  datasetId: number;
  products: string[];
  aspects: string[];
  selectedProduct: string | null;
  onProductSelect: (product: string | null) => void;
  selectedAspect: string | null;
  onAspectSelect: (aspect: string | null) => void;
}

export default function DeepDiveDrillDown({
  datasetId,
  products,
  aspects,
  selectedProduct,
  onProductSelect,
  selectedAspect,
  onAspectSelect
}: DeepDiveDrillDownProps) {
  const [productSearch, setProductSearch] = useState('');
  const [filterPolarity, setFilterPolarity] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [sortBy, setSortBy] = useState<"aspect" | "opinion" | "polarity" | "frequency">("frequency");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  React.useEffect(() => {
    setPage(0);
  }, [selectedProduct, filterPolarity, selectedAspect, filterKeyword, sortBy, sortDir]);

  const handleClearFilters = () => {
    setFilterPolarity('all');
    onAspectSelect(null);
    setFilterKeyword('');
    setSortBy('frequency');
    setSortDir('desc');
    setPage(0);
  };

  const handleSort = (column: "aspect" | "opinion" | "polarity" | "frequency") => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir(column === "frequency" ? "desc" : "asc");
    }
  };

  const { data: drilldownData, isLoading: loadingDrilldown } = useQuery({
    queryKey: ['reports', 'drilldown', datasetId, selectedProduct, filterPolarity, selectedAspect, filterKeyword],
    queryFn: () => reportsApi.getDrilldown(datasetId, {
      product: selectedProduct || 'all',
      polarity: filterPolarity,
      aspect: selectedAspect || 'all',
      keyword: filterKeyword,
    }),
    enabled: !!datasetId && !!selectedProduct,
  });

  const processedTriplets = useMemo(() => {
    if (!drilldownData?.triplets) return [];
    
    let sorted = [...drilldownData.triplets];
    sorted.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [drilldownData?.triplets, sortBy, sortDir]);

  const paginatedTriplets = useMemo(() => {
    const start = page * itemsPerPage;
    return processedTriplets.slice(start, start + itemsPerPage);
  }, [processedTriplets, page]);

  const renderSortableHeader = (label: string, column: "aspect" | "opinion" | "polarity" | "frequency", alignRight = false) => {
    return (
      <TableHead 
        className={`cursor-pointer hover:bg-slate-100 transition-colors ${alignRight ? 'text-right' : ''}`}
        onClick={() => handleSort(column)}
      >
        <div className={`flex items-center gap-1 ${alignRight ? 'justify-end' : ''}`}>
          {label}
          {sortBy === column ? (
            sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
          ) : (
            <ArrowUpDown size={14} className="text-slate-300" />
          )}
        </div>
      </TableHead>
    );
  };

  const handleWordClick = (word: any) => {
    setFilterKeyword(word.text);
  };

  const filteredProducts = products.filter(p => p.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <Card className="shadow-sm border-slate-200/50">
      <CardHeader>
        <CardTitle>Deep Dive Drill-Down</CardTitle>
        <CardDescription>Filter and explore granular triplet data (Aspect - Opinion - Polarity).</CardDescription>
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <div className="relative flex-1 min-w-[200px] max-w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-9 pr-8"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch && (
              <button 
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                onClick={() => setProductSearch('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={selectedProduct || ''} onValueChange={(val) => onProductSelect(val === '' ? null : val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a Product" />
            </SelectTrigger>
            <SelectContent>
              {filteredProducts.map((p: string) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPolarity} onValueChange={setFilterPolarity}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Sentiments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiments</SelectItem>
              <SelectItem value="Positive">Positive</SelectItem>
              <SelectItem value="Neutral">Neutral</SelectItem>
              <SelectItem value="Negative">Negative</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedAspect || 'all'} onValueChange={(val) => onAspectSelect(val === 'all' ? null : val)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Aspects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Aspects</SelectItem>
              {aspects.map((a: string) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={handleClearFilters} className="text-slate-500">
            Clear filters
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!selectedProduct ? (
          <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-2">Select a product to start the deep dive.</h3>
            <p className="max-w-md mx-auto">
              You can select one from the Product dropdown above or click a product in the Product Action Matrix.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Triplet Table */}
            <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden lg:col-span-1">
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      {renderSortableHeader("Aspect", "aspect")}
                      {renderSortableHeader("Opinion", "opinion")}
                      {renderSortableHeader("Polarity", "polarity")}
                      {renderSortableHeader("Freq", "frequency", true)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDrilldown ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                    ) : paginatedTriplets.length > 0 ? (
                      paginatedTriplets.map((t: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{t.aspect}</TableCell>
                          <TableCell>{t.opinion}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              t.polarity === 'Positive' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 
                              t.polarity === 'Negative' ? 'text-rose-600 border-rose-200 bg-rose-50' : 
                              'text-amber-600 border-amber-200 bg-amber-50'
                            }>
                              {t.polarity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-500">{t.frequency}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                          <p className="mb-2">No triplets match the current filters for this product.</p>
                          <Button variant="outline" size="sm" onClick={handleClearFilters}>Clear filters</Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Footer */}
              {!loadingDrilldown && processedTriplets.length > 0 && (
                <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Showing {page * itemsPerPage + 1}-{Math.min((page + 1) * itemsPerPage, processedTriplets.length)} of {processedTriplets.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 0} 
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                    >
                      <ChevronLeft size={16} /> Prev
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={(page + 1) * itemsPerPage >= processedTriplets.length} 
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Word Cloud */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[500px] lg:col-span-1">
              <h3 className="text-sm font-semibold text-slate-500 w-full mb-4 flex flex-col gap-2">
                <span className="flex items-center gap-2"><MessageSquareText size={16} /> Aspect-Opinion Word Cloud</span>
                {filterKeyword && (
                  <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200 self-start" onClick={() => setFilterKeyword('')}>
                    Filtered by: {filterKeyword} ✕
                  </Badge>
                )}
              </h3>
              {loadingDrilldown ? (
                <div className="text-slate-400">Loading Word Cloud...</div>
              ) : drilldownData?.wordCloud?.length > 0 ? (
                <div className="w-full h-full flex-1">
                  <WordCloud
                    data={drilldownData.wordCloud}
                    font="Inter"
                    fontWeight="bold"
                    fontSize={(word) => Math.log2(word.value) * 10 + 16}
                    spiral="rectangular"
                    rotate={0}
                    padding={4}
                    onWordClick={(event, d) => handleWordClick(d)}
                    fill={(d: any) => {
                       if(d.sentiment === 'Positive') return '#10b981';
                       if(d.sentiment === 'Negative') return '#ef4444';
                       return '#f59e0b';
                    }}
                  />
                </div>
              ) : (
                <div className="text-slate-400">Not enough data for word cloud.</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
