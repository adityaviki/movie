"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

export function Pagination({ page, pageSize, total }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (total === 0) return null;

  function buildHref(targetPage: number, targetPageSize?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("pageSize");

    const size = targetPageSize ?? pageSize;
    if (size !== 5) {
      params.set("pageSize", String(size));
    }
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    }
    const qs = params.toString();
    return `/movies${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Select
        value={String(pageSize)}
        onValueChange={(v) => router.push(buildHref(1, Number(v)))}
      >
        <SelectTrigger className="h-8 w-[62px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="5">5</SelectItem>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="40">40</SelectItem>
          <SelectItem value="100">100</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 shadow-sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={buildHref(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 shadow-sm" disabled={page >= totalPages} asChild={page < totalPages}>
          {page < totalPages ? (
            <Link href={buildHref(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span>
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
