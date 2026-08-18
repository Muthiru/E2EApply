import { applicationPdfRouteHandler } from "@/lib/job/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = applicationPdfRouteHandler("CV");