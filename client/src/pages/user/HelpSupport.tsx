import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { HelpCircle, FileText, MessageSquare, Mail } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function HelpSupport() {

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Your message has been sent to support. We will get back to you shortly.');
    // Reset form would go here
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Help & Support</h1>
        <p className="text-slate-500">Find answers, learn how to format your data, or contact us.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Formatting Guide */}
          <Card className="shadow-sm border-slate-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                CSV Formatting Guide
              </CardTitle>
              <CardDescription>How to prepare your data for the best AI analysis results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                To ensure the AI model accurately analyzes your customer feedback, your CSV file must be formatted correctly.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">Required Columns:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code className="text-blue-600 font-bold bg-blue-50 px-1 rounded">Product_Name</code> - The name or ID of the product being reviewed.</li>
                  <li><code className="text-blue-600 font-bold bg-blue-50 px-1 rounded">Review_Text</code> - The actual text of the customer's review or feedback.</li>
                </ul>
              </div>
              <p>
                <strong>Important Tips:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ensure the file is saved as a comma-separated values (CSV) format, not Excel (.xlsx).</li>
                <li>The AI model currently performs best with English language reviews.</li>
                <li>Remove any rows with empty Review_Text before uploading to save your quota.</li>
              </ul>
              <Button variant="outline" className="mt-2" onClick={() => {
                const csvContent = "Product_Name,Review_Text\nSample Product,This is a great product!";
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", "Feedback_Template.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>Download Example Template</Button>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card className="shadow-sm border-slate-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left font-medium text-slate-800">What happens if I exceed my storage quota?</AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    If you exceed your storage quota, you will not be able to upload new datasets. You can either delete older, unneeded datasets from the Dataset Management page to free up space, or upgrade your plan in the Subscriptions page to increase your quota limit.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left font-medium text-slate-800">How long does the AI analysis take?</AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    Analysis time depends on the size of your dataset (number of rows). Typically, a file with 1,000 reviews takes about 2-3 minutes to process. You can check the status of your upload in the Dataset Management page.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left font-medium text-slate-800">Can I export the analysis reports?</AccordionTrigger>
                  <AccordionContent className="text-slate-600">
                    Yes! You can export your analysis reports as a PDF directly from the Analysis Reports page by clicking the Export button at the top right.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          
        </div>

        {/* Contact Support Form */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-slate-200/50 sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-blue-600" />
                Contact Support
              </CardTitle>
              <CardDescription>Need further assistance? Send us a message.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="What is this regarding?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Describe your issue or question in detail..." 
                    className="min-h-[120px]"
                    required 
                  />
                </div>
                <Button type="submit" className="w-full">Submit Ticket</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
