import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { HomeTaxReceipt } from '@/lib/models/HomeTaxReceipt';
import { HomeTaxCashReceipt } from '@/lib/models/HomeTaxCashReceipt';
import { HomeTaxInvoice } from '@/lib/models/HomeTaxInvoice';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { expenseId, receiptId, receiptType } = body;

    if (!expenseId) {
      return NextResponse.json({ error: 'expenseId is required' }, { status: 400 });
    }

    await connectToDatabase();

    // 지출 항목 조회 (userId 조건 제거)
    const expense = await Expense.findById(expenseId);
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    let matchedReceipt = null;
    let finalReceiptType = receiptType;

    // receiptId가 제공된 경우 (수동 매칭)
    if (receiptId && receiptType) {
      if (receiptType === 'tax') {
        matchedReceipt = await HomeTaxReceipt.findById(receiptId);
      } else if (receiptType === 'cash') {
        matchedReceipt = await HomeTaxCashReceipt.findById(receiptId);
      } else if (receiptType === 'invoice') {
        matchedReceipt = await HomeTaxInvoice.findById(receiptId);
      }
      
      if (!matchedReceipt) {
        return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      }
    } else {
      // receiptId가 없는 경우 (자동 매칭)
      const expenseDate = new Date(expense.date);
      const expenseAmount = expense.amount;

      // 세금계산서 매칭 확인
      const taxReceipt = await HomeTaxReceipt.findOne({
        매칭여부: false,
        합계금액: expenseAmount
      });

      if (taxReceipt) {
        const receiptDate = new Date(taxReceipt.작성일자);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 15) { // 15일 이내 (match-receipts와 동일하게 통일)
          matchedReceipt = taxReceipt;
          finalReceiptType = 'tax';
        }
      }

      // 현금영수증 매칭 확인 (세금계산서 매칭이 없는 경우)
      if (!matchedReceipt) {
        const cashReceipt = await HomeTaxCashReceipt.findOne({
          매칭여부: false,
          매입금액: expenseAmount
        });

        if (cashReceipt) {
          const receiptDate = new Date(cashReceipt.매입일시);
          const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
          const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 15) { // 15일 이내 (match-receipts와 동일하게 통일)
            matchedReceipt = cashReceipt;
            finalReceiptType = 'cash';
          }
        }
      }

      // 전자계산서 매칭 확인 (세금계산서, 현금영수증 매칭이 없는 경우)
      if (!matchedReceipt) {
        const invoiceReceipt = await HomeTaxInvoice.findOne({
          매칭여부: false,
          합계금액: expenseAmount
        });

        if (invoiceReceipt) {
          const receiptDate = new Date(invoiceReceipt.작성일자);
          const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
          const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 15) { // 15일 이내 (match-receipts와 동일하게 통일)
            matchedReceipt = invoiceReceipt;
            finalReceiptType = 'invoice';
          }
        }
      }

      if (!matchedReceipt) {
        return NextResponse.json({ error: 'No matching receipt found' }, { status: 404 });
      }
    }

    // 매칭 처리 전 최종 검증 (동시성 문제 방지)
    await connectToDatabase();
    
    // 영수증이 이미 다른 지출과 매칭되었는지 재확인
    let updatedReceipt = null;
    if (finalReceiptType === 'tax') {
      updatedReceipt = await HomeTaxReceipt.findById(matchedReceipt._id);
    } else if (finalReceiptType === 'cash') {
      updatedReceipt = await HomeTaxCashReceipt.findById(matchedReceipt._id);
    } else if (finalReceiptType === 'invoice') {
      updatedReceipt = await HomeTaxInvoice.findById(matchedReceipt._id);
    }
    
    if (!updatedReceipt || updatedReceipt.매칭여부 === true) {
      return NextResponse.json({ 
        error: 'Receipt already matched with another expense',
        message: '이 영수증은 이미 다른 지출과 매칭되었습니다.'
      }, { status: 409 });
    }
    
    // 지출도 이미 매칭되었는지 재확인
    const updatedExpense = await Expense.findById(expense._id);
    if (!updatedExpense || updatedExpense.hasReceipt === true) {
      return NextResponse.json({ 
        error: 'Expense already has receipt',
        message: '이 지출은 이미 영수증이 있습니다.'
      }, { status: 409 });
    }

    // 원자적 업데이트 수행
    try {
      // 지출 업데이트
      const expenseUpdateResult = await Expense.updateOne(
        { _id: expense._id, hasReceipt: false }, // 조건: 아직 영수증이 없는 경우만
        { hasReceipt: true }
      );
      
      if (expenseUpdateResult.matchedCount === 0) {
        return NextResponse.json({ 
          error: 'Expense update failed - already has receipt',
          message: '지출 업데이트 실패 - 이미 영수증이 있습니다.'
        }, { status: 409 });
      }
      
      // 영수증 업데이트
      let receiptUpdateResult = null;
      if (finalReceiptType === 'tax') {
        receiptUpdateResult = await HomeTaxReceipt.updateOne(
          { _id: matchedReceipt._id, 매칭여부: false }, // 조건: 아직 매칭되지 않은 경우만
          { 매칭여부: true, 매칭된_지출ID: expense._id }
        );
      } else if (finalReceiptType === 'cash') {
        receiptUpdateResult = await HomeTaxCashReceipt.updateOne(
          { _id: matchedReceipt._id, 매칭여부: false },
          { 매칭여부: true, 매칭된_지출ID: expense._id }
        );
      } else if (finalReceiptType === 'invoice') {
        receiptUpdateResult = await HomeTaxInvoice.updateOne(
          { _id: matchedReceipt._id, 매칭여부: false },
          { 매칭여부: true, 매칭된_지출ID: expense._id }
        );
      }
      
      if (receiptUpdateResult.matchedCount === 0) {
        // 영수증 업데이트 실패 시 지출 업데이트 롤백
        await Expense.updateOne(
          { _id: expense._id },
          { hasReceipt: false }
        );
        
        return NextResponse.json({ 
          error: 'Receipt update failed - already matched',
          message: '영수증 업데이트 실패 - 이미 매칭되었습니다.'
        }, { status: 409 });
      }
      
    } catch (updateError) {
      console.error('매칭 업데이트 중 오류:', updateError);
      return NextResponse.json({ 
        error: 'Database update failed',
        message: '데이터베이스 업데이트 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    const receiptTypeLabel = finalReceiptType === 'tax' ? '세금계산서' : 
                            finalReceiptType === 'cash' ? '현금영수증' : '전자계산서';
    const receiptVendor = finalReceiptType === 'cash' ? matchedReceipt.상호명 : matchedReceipt.상호;
    
    console.log(`[매칭 확정] ${receiptTypeLabel} - 지출: ${expense.vendor} ${expense.amount}원 <-> 영수증: ${receiptVendor}`);

    return NextResponse.json({
      success: true,
      message: 'Receipt matched successfully',
      expense,
      receipt: matchedReceipt,
      type: finalReceiptType
    });

  } catch (error) {
    console.error('매칭 확인 API 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}