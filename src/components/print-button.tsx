"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  title: string;
}

export function PrintButton({ title }: PrintButtonProps) {
  const handlePrint = () => {
    // Set document title for print
    const originalTitle = document.title;
    document.title = `${title} - Report Request`;
    
    // Print
    window.print();
    
    // Restore title
    document.title = originalTitle;
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handlePrint}
      className="print:hidden"
    >
      <Printer className="h-4 w-4 mr-2" />
      พิมพ์
    </Button>
  );
}
