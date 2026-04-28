"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThaiDateTime } from "@/utils/date-format";

interface SatisfactionData {
  id: number;
  requestId: number;
  overallRating: string;
  speedRating: string | null;
  accuracyRating: string | null;
  easeOfUseRating: string | null;
  communicationRating: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

interface SatisfactionDisplayProps {
  satisfaction: SatisfactionData;
}

const categoryLabels = {
  speed: "ความรวดเร็ว",
  accuracy: "ความถูกต้อง",
  easeOfUse: "ความเข้าใจง่าย",
  communication: "การสื่อสาร",
};

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "h-6 w-6" : "h-4 w-4";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            starSize,
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          )}
        />
      ))}
    </div>
  );
}

export function SatisfactionDisplay({ satisfaction }: SatisfactionDisplayProps) {
  const overallRating = parseInt(satisfaction.overallRating, 10);

  return (
    <div className="space-y-4">
      {/* Overall Rating */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-800">
        <div>
          <p className="text-sm text-muted-foreground">คะแนนภาพรวม</p>
          <div className="flex items-center gap-2 mt-1">
            <StarDisplay rating={overallRating} size="lg" />
            <span className="text-xl font-bold text-yellow-600">
              {overallRating}/5
            </span>
          </div>
        </div>
        <div className="text-4xl">
          {overallRating === 5 && "🌟"}
          {overallRating === 4 && "😊"}
          {overallRating === 3 && "🙂"}
          {overallRating === 2 && "😐"}
          {overallRating === 1 && "😞"}
        </div>
      </div>

      {/* Category Ratings */}
      <div className="grid grid-cols-2 gap-3">
        {satisfaction.speedRating && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.speed}</span>
            <StarDisplay rating={parseInt(satisfaction.speedRating, 10)} />
          </div>
        )}
        {satisfaction.accuracyRating && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.accuracy}</span>
            <StarDisplay rating={parseInt(satisfaction.accuracyRating, 10)} />
          </div>
        )}
        {satisfaction.easeOfUseRating && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.easeOfUse}</span>
            <StarDisplay rating={parseInt(satisfaction.easeOfUseRating, 10)} />
          </div>
        )}
        {satisfaction.communicationRating && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.communication}</span>
            <StarDisplay rating={parseInt(satisfaction.communicationRating, 10)} />
          </div>
        )}
      </div>

      {/* Comment */}
      {satisfaction.comment && (
        <div className="p-3 rounded-lg bg-muted/30 border">
          <p className="text-sm font-medium mb-1">ความคิดเห็น:</p>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {satisfaction.comment}
          </p>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground text-right">
        ประเมินเมื่อ {formatThaiDateTime(satisfaction.createdAt)}
        {satisfaction.updatedAt && satisfaction.updatedAt > satisfaction.createdAt && (
          <> (แก้ไขล่าสุด {formatThaiDateTime(satisfaction.updatedAt)})</>
        )}
      </p>
    </div>
  );
}
