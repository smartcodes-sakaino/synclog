import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/types";

export const sessionOptions: SessionOptions = {
  cookieName: "synclog_session",
  password: process.env.SESSION_SECRET ?? "",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
