import { NextResponse } from "next/server";
import { market } from "@/lib/market";


export async function GET() {

  const encoder = new TextEncoder();


  const stream = new ReadableStream({

    start(controller) {

      let closed = false;


      const send = () => {

        if (closed) return;


        try {

          const candle = market.next();


          controller.enqueue(
 encoder.encode(
  `data:${JSON.stringify({
    price:candle.close,
    candle,
    regime:"ranging"
  })}\n\n`
 )
)


        } catch (error) {

          console.error(
            "Stream error:",
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


      // stop stream when browser disconnects
      return cleanup;

    }

  });


  return new NextResponse(stream,{
    headers:{
      "Content-Type":
        "text/event-stream",

      "Cache-Control":
        "no-cache",

      "Connection":
        "keep-alive",
    }
  });

}