import { NextResponse } from "next/server";
import { market } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {

      let closed = false;

      const send = () => {
        if (closed) return;

        try {

          const candle = market.next();
          

          const payload = {
            price: candle.close,
            candle,
            regime: "ranging",
          };


          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify(payload)}\n\n`
            )
          );


        } catch (error) {

          console.error(
            "SSE error:",
            error
          );

          cleanup();
        }
      };


      const interval = setInterval(
        send,
        1000
      );


      function cleanup(){

        if(closed) return;

        closed = true;

        clearInterval(interval);

        try {
          controller.close();
        } catch {}

      }


      return cleanup;

    }
  });


  return new NextResponse(stream, {

    headers: {

      "Content-Type":
        "text/event-stream; charset=utf-8",

      "Cache-Control":
        "no-cache, no-transform",

      "Connection":
        "keep-alive",

      "X-Accel-Buffering":
        "no",

    }

  });

}