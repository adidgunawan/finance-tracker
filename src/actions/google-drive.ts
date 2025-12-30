"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getUserDriveTokens as getUserTokens,
  revokeTokens as revokeUserTokens,
} from "@/lib/google-drive-oauth";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function getUserDriveTokens() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  return await getUserTokens(session.user.id);
}

export async function revokeTokens() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await revokeUserTokens(session.user.id);
}

