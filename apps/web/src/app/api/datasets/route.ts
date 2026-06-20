import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, filePath, rowCount, columnCount, fileSize } = await req.json();

    const dataset = await prisma.dataset.create({
      data: {
        name,
        filePath,
        rowCount,
        columnCount,
        fileSize: fileSize || 0,
        userId: session.user.id
      }
    });

    return NextResponse.json(dataset, { status: 201 });
  } catch (error) {
    console.error("Error creating dataset:", error);
    return NextResponse.json(
      { message: "An error occurred while saving dataset metadata" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const datasets = await prisma.dataset.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(datasets);
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching datasets" },
      { status: 500 }
    );
  }
}
