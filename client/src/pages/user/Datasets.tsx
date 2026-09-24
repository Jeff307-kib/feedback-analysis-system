import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { datasetsApi } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UploadCloud, FileSpreadsheet, FileClock, CheckCircle2, Download, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Datasets() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: datasets = [], isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: datasetsApi.get,
  });

  const uploadMutation = useMutation({
    mutationFn: datasetsApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      setSelectedFile(null);
      setAgreedToTerms(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Dataset uploaded and analysis started!');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => datasetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      toast.success('Dataset and associated analysis data deleted successfully.');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete dataset')
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const downloadTemplate = () => {
    const csvContent = "Product_Name,Review_Text\nSample Product,This is a great product!";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Feedback_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingDatasets) {
    return <div className="p-8 text-center text-slate-500">Loading datasets...</div>;
  }

  const sortedDatasets = [...datasets].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalPages = Math.ceil(sortedDatasets.length / itemsPerPage) || 1;
  const paginatedDatasets = sortedDatasets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dataset Management</h1>
        <p className="text-slate-500">Upload new CSV files and manage previously uploaded datasets.</p>
      </div>

      {/* File Upload Zone */}
      <Card className="shadow-sm border-slate-200/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-600" />
              Upload New Dataset
            </CardTitle>
            <CardDescription>Drag & drop or browse for a CSV file. Max 75MB depending on your plan.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => !selectedFile && fileInputRef.current?.click()}>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
            />
            {!selectedFile ? (
              <div className="space-y-4 pointer-events-none">
                <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <Button variant="secondary" className="pointer-events-auto" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Browse Files
                  </Button>
                  <p className="mt-2 text-sm text-slate-600">or drag and drop your file here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pointer-events-none">
                <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <Button variant="outline" size="sm" className="pointer-events-auto" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  Remove file
                </Button>
              </div>
            )}
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
            <Checkbox 
              id="terms" 
              checked={agreedToTerms} 
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} 
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="terms" className="text-sm font-medium leading-tight text-slate-900 cursor-pointer">
                Format Acknowledgment
              </label>
              <p className="text-sm text-slate-500">
                I confirm that my file is formatted according to the template containing at least <strong className="font-semibold text-slate-700">Product_Name</strong> and <strong className="font-semibold text-slate-700">Review_Text</strong> columns.
              </p>
            </div>
          </div>

          <Button 
            className="w-full sm:w-auto" 
            disabled={!selectedFile || !agreedToTerms || uploadMutation.isPending}
            onClick={handleUpload}
          >
            {uploadMutation.isPending ? 'Uploading & Analyzing...' : 'Upload Dataset'}
          </Button>
        </CardContent>
      </Card>

      {/* Datasets Table */}
      <Card className="shadow-sm border-slate-200/50 overflow-hidden">
        <CardHeader>
          <CardTitle>Uploaded Datasets</CardTitle>
          <CardDescription>Manage your previously uploaded files.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Size (MB)</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No datasets uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDatasets.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-slate-900">{d.filename}</TableCell>
                    <TableCell className="text-slate-500">{Number(d.fileSizeMb).toFixed(2)} MB</TableCell>
                    <TableCell className="text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {d.status === 'PENDING' && <Badge variant="secondary">Pending</Badge>}
                      {d.status === 'ANALYSIS_IN_PROGRESS' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex w-fit items-center gap-1">
                          <FileClock className="h-3 w-3" /> Processing
                        </Badge>
                      )}
                      {d.status === 'COMPLETED' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>}
                      {d.status === 'FAILED' && <Badge variant="destructive">Failed</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {d.status === 'COMPLETED' && (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" asChild>
                          <Link to={`/dashboard/reports?datasetId=${d.id}`}>
                            View Analysis <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600 hover:bg-rose-50" disabled={deleteMutation.isPending}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the dataset <strong>{d.filename}</strong>, along with all parsed reviews and generated sentiment analysis results from our servers. 
                              The storage quota will be refunded to your account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => deleteMutation.mutate(d.id)}>
                              Yes, delete dataset
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedDatasets.length)}</span> of <span className="font-medium">{sortedDatasets.length}</span> results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
