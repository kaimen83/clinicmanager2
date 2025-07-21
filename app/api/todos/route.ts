import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET: 사용자의 Todo 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const todos = await db.collection("todos")
      .find({ userId: user.id })
      .sort({ order: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json(todos);
  } catch (error) {
    console.error("Todo 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Todo 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST: 새 Todo 생성
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, category, dueDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "제목은 필수입니다" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 현재 최대 order 값 조회
    const lastTodo = await db.collection("todos")
      .findOne({ userId: user.id }, { sort: { order: -1 } });
    const newOrder = lastTodo ? (lastTodo.order || 0) + 1 : 0;

    const newTodo = {
      userId: user.id,
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      priority: priority || 'medium',
      category: category?.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      order: newOrder,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("todos").insertOne(newTodo);
    const insertedTodo = await db.collection("todos").findOne({ _id: result.insertedId });

    return NextResponse.json(insertedTodo, { status: 201 });
  } catch (error) {
    console.error("Todo 생성 실패:", error);
    return NextResponse.json(
      { error: "Todo를 생성하는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: Todo 순서 재정렬
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { todoIds } = body;

    if (!Array.isArray(todoIds)) {
      return NextResponse.json(
        { error: "올바른 형식이 아닙니다" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 순서대로 order 값 업데이트
    const bulkOps = todoIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id), userId: user.id },
        update: { $set: { order: index, updatedAt: new Date() } }
      }
    }));

    await db.collection("todos").bulkWrite(bulkOps);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Todo 순서 변경 실패:", error);
    return NextResponse.json(
      { error: "Todo 순서를 변경하는데 실패했습니다" },
      { status: 500 }
    );
  }
}