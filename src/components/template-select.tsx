"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutTemplate, Globe, User } from "lucide-react";
import { getTemplates } from "@/app/actions/template.action";

interface TemplateData {
  title?: string;
  description?: string;
  outputType?: string;
  fileFormat?: string;
  dateRangeType?: string;
  priority?: string;
  sourceSystem?: string;
  dataSource?: string;
  additionalNotes?: string;
}

interface Template {
  id: number;
  name: string;
  isPublic: boolean;
  isOwner: boolean;
  templateData: TemplateData;
}

interface TemplateSelectProps {
  onSelect: (data: TemplateData) => void;
}

export function TemplateSelect({ onSelect }: TemplateSelectProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTemplates()
      .then((data) => setTemplates(data as Template[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || templates.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
      <LayoutTemplate className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <Select
          onValueChange={(value) => {
            const template = templates.find((t) => String(t.id) === value);
            if (template) {
              onSelect(template.templateData);
            }
          }}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="เลือก Template เพื่อกรอกอัตโนมัติ..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={String(template.id)}>
                <span className="flex items-center gap-2">
                  {template.isPublic ? (
                    <Globe className="h-3 w-3 text-blue-500" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                  {template.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
