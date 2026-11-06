"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function DailyHuntToast({
  show,
  message,
  queryParam,
}: {
  show: boolean;
  message: string;
  queryParam: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (!show || handled.current) return;
    handled.current = true;

    toast(message);

    const url = new URL(window.location.href);
    url.searchParams.delete(queryParam);
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [message, queryParam, router, show, toast]);

  return null;
}
