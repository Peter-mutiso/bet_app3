import { NextResponse } from "next/server";


export async function GET(){

 return NextResponse.json({
    maintenance:false,
    minTrade:1,
    maxTrade:1000
 });

}