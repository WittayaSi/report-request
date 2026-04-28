"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitSatisfactionRating, SatisfactionInput } from "@/app/actions/satisfaction.action";
import { cn } from "@/lib/utils";

interface SatisfactionRatingFormProps {
  requestId: number;
  onSuccess?: () => void;
}

const categoryLabels = {
  speed: "ความรวดเร็ว",
  accuracy: "ความถูกต้อง",
  easeOfUse: "ความเข้าใจง่าย",
  communication: "การสื่อสาร",
};

function StarRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(0);

  const starSize = size === "lg" ? "h-8 w-8" : "h-5 w-5";

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none transition-transform hover:scale-110"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={cn(
              starSize,
              "transition-colors",
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function SatisfactionRatingForm({
  requestId,
  onSuccess,
}: SatisfactionRatingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [overallRating, setOverallRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [easeOfUseRating, setEaseOfUseRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (overallRating === 0) {
      setError("กรุณาให้คะแนนภาพรวม");
      return;
    }

    setError("");

    const input: SatisfactionInput = {
      requestId,
      overallRating: overallRating.toString() as "1" | "2" | "3" | "4" | "5",
      speedRating: speedRating > 0 ? (speedRating.toString() as "1" | "2" | "3" | "4" | "5") : undefined,
      accuracyRating: accuracyRating > 0 ? (accuracyRating.toString() as "1" | "2" | "3" | "4" | "5") : undefined,
      easeOfUseRating: easeOfUseRating > 0 ? (easeOfUseRating.toString() as "1" | "2" | "3" | "4" | "5") : undefined,
      communicationRating: communicationRating > 0 ? (communicationRating.toString() as "1" | "2" | "3" | "4" | "5") : undefined,
      comment: comment.trim() || undefined,
    };

    startTransition(async () => {
      const result = await submitSatisfactionRating(input);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(true);
        onSuccess?.();
      }
    });
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-green-600">ขอบคุณสำหรับการประเมิน!</h3>
        <p className="text-muted-foreground mt-2">
          ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการให้ดียิ่งขึ้น
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="text-center space-y-3">
        <Label className="text-lg font-medium">ให้คะแนนภาพรวม</Label>
        <div className="flex justify-center">
          <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
        </div>
        {overallRating > 0 && (
          <p className="text-sm text-muted-foreground">
            {overallRating === 5 && "ยอดเยี่ยม!"}
            {overallRating === 4 && "ดีมาก"}
            {overallRating === 3 && "พอใช้"}
            {overallRating === 2 && "ควรปรับปรุง"}
            {overallRating === 1 && "ไม่พอใจ"}
          </p>
        )}
      </div>

      {/* Category Ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{categoryLabels.speed}</Label>
          <StarRating value={speedRating} onChange={setSpeedRating} size="sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{categoryLabels.accuracy}</Label>
          <StarRating value={accuracyRating} onChange={setAccuracyRating} size="sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{categoryLabels.easeOfUse}</Label>
          <StarRating value={easeOfUseRating} onChange={setEaseOfUseRating} size="sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{categoryLabels.communication}</Label>
          <StarRating value={communicationRating} onChange={setCommunicationRating} size="sm" />
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2 pt-4 border-t">
        <Label htmlFor="comment" className="text-sm">
          ความคิดเห็นเพิ่มเติม (ถ้ามี)
        </Label>
        <Textarea
          id="comment"
          placeholder="แนะนำหรือติชมเพิ่มเติม..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={isPending || overallRating === 0}
      >
        {isPending ? "กำลังบันทึก..." : "ส่งการประเมิน"}
      </Button>
    </div>
  );
}
