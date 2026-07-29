'use client'

import { useEffect, useRef } from 'react'
import type { ShikaConfig } from './shika-engine'

interface Props {
  prices: number[]
  rate: number
  cfg: ShikaConfig
  entryRate: number | null
  isDarkMode: boolean
}

interface ChartColors {
  bg: string
  greenFill: string
  redFill: string
  line: string
  dot: string
  grid: string
  gridZero: string
  label: string
  rateBox: string
  rateBoxBorder: string
  rateText: string
}

export default function ShikaChart({
  prices,
  rate,
  cfg,
  entryRate,
  isDarkMode,
}: Props) {

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stateRef = useRef({
    prices,
    rate,
    cfg,
    entryRate,
    isDarkMode,
  })

  stateRef.current = {
    prices,
    rate,
    cfg,
    entryRate,
    isDarkMode,
  }


  useEffect(() => {

    console.log("📊 ShikaChart mounted")

    const canvas = canvasRef.current

    if (!canvas) {
      console.error("❌ Canvas not found")
      return
    }
    


    const cx = canvas.getContext('2d')

    if (!cx) {
      console.error("❌ Cannot get canvas context")
      return
    }


    console.log("✅ Canvas context created")


    let W = 0
    let H = 0
    const canvasEl = canvas;
const ctx = cx;


    function chartColors(): ChartColors {

      const root =
        canvasEl.closest('.shika-root') ||
        document.body


      const s = getComputedStyle(root)

      const v = (k:string) =>
        s.getPropertyValue(k).trim()


      const colors = {

        bg:v('--chart-bg'),
        greenFill:v('--chart-green-fill'),
        redFill:v('--chart-red-fill'),
        line:v('--chart-line'),
        dot:v('--chart-dot'),
        grid:v('--chart-grid'),
        gridZero:v('--chart-grid-zero'),
        label:v('--chart-label'),
        rateBox:v('--chart-ratebox'),
        rateBoxBorder:v('--chart-ratebox-border'),
        rateText:v('--chart-rate-text'),

      }


      console.log("🎨 Chart colors", colors)


      return colors
    }




    function resize(){

      const parent = canvasEl.parentElement

      if(!parent){

        console.error(
          "❌ Canvas parent missing"
        )

        return
      }


      const r = parent.getBoundingClientRect()

      const d =
        window.devicePixelRatio || 1


      W = r.width
      H = r.height


      console.log("📐 Canvas resize",{
        width:W,
        height:H,
        pixelRatio:d
      })


      canvasEl.width = W * d
      canvasEl.height = H * d

      canvasEl.style.width =
        W + "px"

      canvasEl.style.height =
        H + "px"


      ctx.setTransform(
        d,
        0,
        0,
        d,
        0,
        0
      )

    }




    function draw(){

      const {
        prices,
        rate,
        cfg,
        entryRate,
        isDarkMode
      } = stateRef.current



      console.log("🖌️ Drawing chart",{
        prices:prices.length,
        rate,
        first:prices[0],
        last:prices[prices.length-1],
        W,
        H
      })



      const cc = chartColors()



      ctx.fillStyle = cc.bg || "black"

      ctx.fillRect(
        0,
        0,
        W,
        H
      )



      if(prices.length < 2){

        console.warn(
          "⚠️ Not enough prices"
        )

        return
      }



      const pad = {
        t:30,
        b:16,
        l:46,
        r:12
      }


      const cW =
        W - pad.l - pad.r


      const cH =
        H - pad.t - pad.b



      const yMax = cfg.Y_MAX

      const yMin = -cfg.Y_MAX

      const yRange =
        yMax - yMin



      const xStep =
        cW /
        (cfg.MAX_PTS - 1)



      const si =
        cfg.MAX_PTS -
        prices.length



      const toX =
        (i:number)=>
          pad.l +
          (si+i) *
          xStep



      const toY =
        (val:number)=>
          pad.t +
          cH -
          ((val-yMin)/yRange)
          *
          cH



      const zeroY =
        toY(0)



      const pts =
        prices.map(
          (v,i)=>({
            x:toX(i),
            y:toY(v),
            v
          })
        )



      ctx.beginPath()

      ctx.moveTo(
        pts[0].x,
        pts[0].y
      )


      for(
        let i=1;
        i<pts.length-1;
        i++
      ){

        const mx =
          (pts[i].x+
          pts[i+1].x)/2


        const my =
          (pts[i].y+
          pts[i+1].y)/2


        ctx.quadraticCurveTo(
          pts[i].x,
          pts[i].y,
          mx,
          my
        )

      }


      ctx.lineTo(
        pts[pts.length-1].x,
        pts[pts.length-1].y
      )


      ctx.strokeStyle =
        cc.line || "lime"

      ctx.lineWidth = 2.5

      ctx.stroke()



      const lp =
        pts[pts.length-1]


      ctx.beginPath()

      ctx.arc(
        lp.x,
        lp.y,
        7,
        0,
        Math.PI*2
      )


      ctx.fillStyle =
        cc.dot || "white"


      ctx.fill()



      const text =
        "Rate: " +
        rate.toFixed(4)


      ctx.font =
        "bold 15px monospace"


      ctx.fillStyle =
        "white"

      ctx.fillText(
        text,
        60,
        30
      )


    }




    resize()

    draw()



    let raf:number


    const loop = ()=>{

      draw()

      raf =
        requestAnimationFrame(loop)

    }


    raf =
      requestAnimationFrame(loop)



    const observer =
      new ResizeObserver(()=>{

        console.log(
          "🔄 ResizeObserver fired"
        )

        resize()

        draw()

      })



    if(canvas.parentElement){

      observer.observe(
        canvas.parentElement
      )

    }



    return ()=>{

      console.log(
        "🛑 ShikaChart cleanup"
      )

      cancelAnimationFrame(
        raf
      )

      observer.disconnect()

    }



  }, [])



  return (
    <canvas
      ref={canvasRef}
      className="sk-chart-canvas"
    />
  )
}