import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { id: string; email_address: string }[];
    primary_email_address_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("CLERK_WEBHOOK_SECRET not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;

  switch (type) {
    case "user.created":
    case "user.updated": {
      const primaryEmail =
        data.email_addresses?.find(
          (email) => email.id === data.primary_email_address_id,
        )?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;

      const fullName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ");

      const user = await prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email: primaryEmail,
          name: fullName || null,
          profile: { create: {} },
        },
        update: {
          email: primaryEmail,
          name: fullName || null,
        },
      });

      return new Response(JSON.stringify({ user: user.id }), { status: 200 });
    }

    case "user.deleted": {
      await prisma.user.deleteMany({ where: { clerkId: data.id } });
      return new Response("ok", { status: 200 });
    }

    default:
      return new Response("Unhandled event type", { status: 200 });
  }
}