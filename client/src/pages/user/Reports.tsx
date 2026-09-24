import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { datasetsApi, reportsApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Target, 
  AlertCircle,
  MessageSquareText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import WordCloud from 'react-d3-cloud';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { data: datasets = [], isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: datasetsApi.get,
  });

  const completedDatasets = datasets.filter((d: any) => d.status === 'COMPLETED');
  
  const queryDatasetId = searchParams.get('datasetId');
  const defaultDatasetId = queryDatasetId || (completedDatasets.length > 0 ? completedDatasets[0].id.toString() : '');
  
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDatasetId);

  // Filters for drilldown
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterPolarity, setFilterPolarity] = useState('all');
  const [filterAspect, setFilterAspect] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('');

  const handleDatasetChange = (val: string) => {
    setSelectedDatasetId(val);
    setSearchParams({ datasetId: val });
    // Reset filters
    setFilterProduct('all');
    setFilterPolarity('all');
    setFilterAspect('all');
    setFilterKeyword('');
  };

  const selectedDataset = completedDatasets.find((d: any) => d.id.toString() === selectedDatasetId);

  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['reports', 'overview', selectedDatasetId],
    queryFn: () => reportsApi.getOverview(Number(selectedDatasetId)),
    enabled: !!selectedDatasetId,
  });

  const { data: drilldownData, isLoading: loadingDrilldown } = useQuery({
    queryKey: ['reports', 'drilldown', selectedDatasetId, filterProduct, filterPolarity, filterAspect, filterKeyword],
    queryFn: () => reportsApi.getDrilldown(Number(selectedDatasetId), {
      product: filterProduct,
      polarity: filterPolarity,
      aspect: filterAspect,
      keyword: filterKeyword,
    }),
    enabled: !!selectedDatasetId,
  });

  const handleWordClick = (word: any) => {
    setFilterKeyword(word.text);
  };

  if (loadingDatasets) {
    return <div className="p-8 text-center text-slate-500">Loading reports...</div>;
  }

  if (completedDatasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
          <BarChart3 size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">No Reports Available</h2>
        <p className="text-slate-500 max-w-md">
          You don't have any completed dataset analyses yet. Go to Dataset Management to upload a CSV file and run an analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analysis Reports</h1>
          <p className="text-slate-500">Detailed insights and sentiment analysis results.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedDatasetId} onValueChange={handleDatasetChange}>
            <SelectTrigger className="w-[280px] bg-white">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {completedDatasets.map((d: any) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.filename} ({new Date(d.createdAt).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

      {selectedDataset && overviewData ? (
        <>
          {/* Executive Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Total Feedbacks</p>
                  <Target className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{overviewData.executiveOverview.totalFeedbacks}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Overall Health Score</p>
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">{overviewData.executiveOverview.healthScore}% Positive</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Top Product</p>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 truncate" title={overviewData.executiveOverview.topProduct}>
                  {overviewData.executiveOverview.topProduct}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Critical Product</p>
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 truncate" title={overviewData.executiveOverview.criticalProduct}>
                  {overviewData.executiveOverview.criticalProduct}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doughnut Chart */}
            <Card className="shadow-sm border-slate-200/50 h-[400px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-blue-600" /> Sentiment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overviewData.executiveOverview.sentimentBreakdown}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {overviewData.executiveOverview.sentimentBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stacked Bar Chart */}
            <Card className="shadow-sm border-slate-200/50 h-[400px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" /> Aspect Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewData.aspectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                    <XAxis dataKey="aspect" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Neutral" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Product Action Matrix */}
          <Card className="shadow-sm border-slate-200/50">
            <CardHeader>
              <CardTitle>Product Action Matrix</CardTitle>
              <CardDescription>Products categorized based on their performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Positive %</TableHead>
                    <TableHead className="text-right">Negative %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overviewData.actionMatrix.star.map((p: any) => (
                    <TableRow key={p.name}>
                      <TableCell><Badge className="bg-emerald-500 hover:bg-emerald-600">Star Product</Badge></TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right text-emerald-600">{p.positivePct}%</TableCell>
                      <TableCell className="text-right">{p.negativePct}%</TableCell>
                    </TableRow>
                  ))}
                  {overviewData.actionMatrix.needsAttention.map((p: any) => (
                    <TableRow key={p.name}>
                      <TableCell><Badge variant="destructive">Needs Attention</Badge></TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.positivePct}%</TableCell>
                      <TableCell className="text-right text-rose-600">{p.negativePct}%</TableCell>
                    </TableRow>
                  ))}
                  {overviewData.actionMatrix.mixed.map((p: any) => (
                    <TableRow key={p.name}>
                      <TableCell><Badge variant="outline" className="text-slate-500 border-slate-300">Mixed Reviews</Badge></TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.positivePct}%</TableCell>
                      <TableCell className="text-right">{p.negativePct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Deep Dive Drill-Down */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="shadow-sm border-slate-200/50">
              <CardHeader>
                <CardTitle>Deep Dive Drill-Down</CardTitle>
                <CardDescription>Filter and explore granular triplet data (Aspect - Opinion - Polarity).</CardDescription>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Select value={filterProduct} onValueChange={setFilterProduct}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {overviewData.products?.map((p: string) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterPolarity} onValueChange={setFilterPolarity}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Sentiments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterAspect} onValueChange={setFilterAspect}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Aspects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Aspects</SelectItem>
                      {overviewData.aspects?.map((a: string) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {filterKeyword && (
                    <Badge variant="secondary" className="flex items-center gap-2 h-10 px-4 text-sm cursor-pointer" onClick={() => setFilterKeyword('')}>
                      Keyword: {filterKeyword} ✕
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Triplet Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead>Aspect</TableHead>
                        <TableHead>Opinion</TableHead>
                        <TableHead>Polarity</TableHead>
                        <TableHead className="text-right">Freq</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDrilldown ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                      ) : drilldownData?.triplets?.length > 0 ? (
                        drilldownData.triplets.map((t: any, i: number) => (
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
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500">No data matches the selected filters.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Word Cloud */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[400px]">
                  <h3 className="text-sm font-semibold text-slate-500 w-full mb-4 flex items-center gap-2">
                    <MessageSquareText size={16} /> Aspect-Opinion Word Cloud (Click to filter)
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

              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200/50 flex items-center justify-center gap-3">
          {loadingOverview ? 'Loading report data...' : 'Please select a valid dataset to view its report.'}
        </div>
      )}
    </div>
  );
}
