"use client";

import { Star, StarHalf, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SatisfactionStats {
  totalRatings: number;
  averages: {
    overall: number;
    speed: number;
    accuracy: number;
    easeOfUse: number;
    communication: number;
  };
  distribution: { rating: string; count: number }[];
  topRated: {
    requestId: number;
    title: string | null;
    overallRating: string;
    userName: string | null;
  }[];
  lowestRated: {
    requestId: number;
    title: string | null;
    overallRating: string;
    comment: string | null;
    userName: string | null;
  }[];
}

interface SatisfactionStatsCardProps {
  stats: SatisfactionStats | null;
}

const categoryLabels = {
  overall: "ภาพรวม",
  speed: "ความรวดเร็ว",
  accuracy: "ความถูกต้อง",
  easeOfUse: "ความเข้าใจง่าย",
  communication: "การสื่อสาร",
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 justify-center mt-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const diff = rating - star + 1;
        
        if (diff >= 0.75) {
          return <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />;
        } else if (diff >= 0.25) {
          return <StarHalf key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />;
        } else {
          return <Star key={star} className="h-5 w-5 text-gray-300" />;
        }
      })}
    </div>
  );
}

function RatingBar({ rating, maxCount }: { rating: string; maxCount: number }) {
  const count = maxCount;
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3">{rating}</span>
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

export function SatisfactionStatsCard({ stats }: SatisfactionStatsCardProps) {
  if (!stats || stats.totalRatings === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            ความพึงพอใจ
          </CardTitle>
          <CardDescription>ยังไม่มีข้อมูลการประเมิน</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get max count for distribution bars
  const maxDistributionCount = Math.max(...stats.distribution.map((d) => d.count));

  // Prepare distribution data (ensure all ratings 1-5 are present)
  const distributionData = [5, 4, 3, 2, 1].map((r) => {
    const found = stats.distribution.find((d) => d.rating === r.toString());
    return {
      rating: r.toString(),
      count: found?.count || 0,
    };
  });

  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
          ความพึงพอใจ
        </CardTitle>
        <CardDescription>
          จากการประเมิน {stats.totalRatings} รายการ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600">
              {stats.averages.overall.toFixed(1)}
            </div>
            <StarDisplay rating={stats.averages.overall} />
          </div>
          <div className="flex-1 space-y-1">
            {distributionData.map((d) => (
              <RatingBar
                key={d.rating}
                rating={d.rating}
                maxCount={d.count}
              />
            ))}
          </div>
        </div>

        {/* Category Averages */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.speed}</span>
            <Badge variant="secondary">{stats.averages.speed.toFixed(1)}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.accuracy}</span>
            <Badge variant="secondary">{stats.averages.accuracy.toFixed(1)}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.easeOfUse}</span>
            <Badge variant="secondary">{stats.averages.easeOfUse.toFixed(1)}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <span className="text-sm text-muted-foreground">{categoryLabels.communication}</span>
            <Badge variant="secondary">{stats.averages.communication.toFixed(1)}</Badge>
          </div>
        </div>

        {/* Top Rated */}
        {stats.topRated.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              คะแนนสูงสุด
            </h4>
            <div className="space-y-1">
              {stats.topRated.slice(0, 3).map((item) => (
                <Link
                  key={item.requestId}
                  href={`/requests/${item.requestId}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs">{item.overallRating}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lowest Rated */}
        {stats.lowestRated.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2 text-red-600 mb-2">
              <TrendingDown className="h-4 w-4" />
              ต้องปรับปรุง
            </h4>
            <div className="space-y-1">
              {stats.lowestRated.slice(0, 3).map((item) => (
                <Link
                  key={item.requestId}
                  href={`/requests/${item.requestId}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  <div className="flex items-center gap-1 text-red-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs">{item.overallRating}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
