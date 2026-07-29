import { prisma } from "@/lib/prisma";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(async () => {
        const messages = await prisma.chatMessage.findMany({
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        });

        controller.enqueue(
          encoder.encode(
            `data:${JSON.stringify(messages)}\n\n`
          )
        );
      }, 3000);

      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
  });
}