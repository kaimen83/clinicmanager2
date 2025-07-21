import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PUT: Todo 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "올바른 ID 형식이 아닙니다" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, priority, category, dueDate, completed } = body;

    const { db } = await connectToDatabase();

    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category?.trim();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (completed !== undefined) updateData.completed = completed;

    const result = await db.collection("todos").findOneAndUpdate(
      { _id: new ObjectId(id), userId: user.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Todo를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Todo 수정 실패:", error);
    return NextResponse.json(
      { error: "Todo를 수정하는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: Todo 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "올바른 ID 형식이 아닙니다" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("todos").deleteOne({
      _id: new ObjectId(id),
      userId: user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Todo를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Todo 삭제 실패:", error);
    return NextResponse.json(
      { error: "Todo를 삭제하는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: Todo 완료 상태 토글
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "올바른 ID 형식이 아닙니다" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 현재 상태 조회
    const todo = await db.collection("todos").findOne({
      _id: new ObjectId(id),
      userId: user.id
    });

    if (!todo) {
      return NextResponse.json(
        { error: "Todo를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 상태 토글
    const result = await db.collection("todos").findOneAndUpdate(
      { _id: new ObjectId(id), userId: user.id },
      { 
        $set: { 
          completed: !todo.completed,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Todo 상태 변경 실패:", error);
    return NextResponse.json(
      { error: "Todo 상태를 변경하는데 실패했습니다" },
      { status: 500 }
    );
  }
}