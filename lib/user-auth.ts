import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface UserSession {
  user: any;
  authenticated: boolean;
}

export async function getUserSession(): Promise<UserSession> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return {
        user: null,
        authenticated: false,
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      return {
        user: null,
        authenticated: false,
      };
    }

    return {
      user,
      authenticated: true,
    };
  } catch {
    return {
      user: null,
      authenticated: false,
    };
  }
}