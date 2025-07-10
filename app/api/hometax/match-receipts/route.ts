import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { HomeTaxReceipt } from '@/lib/models/HomeTaxReceipt';
import { HomeTaxCashReceipt } from '@/lib/models/HomeTaxCashReceipt';
import { HomeTaxInvoice } from '@/lib/models/HomeTaxInvoice';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // 매칭되지 않은 지출 항목들 가져오기 (userId 조건 제거)
    const expenses = await Expense.find({ 
      hasReceipt: false
    }).sort({ date: -1 });
    
    console.log(`[매칭 시작] 영수증 없는 지출 내역: ${expenses.length}건`);

    // 매칭되지 않은 홈택스 영수증들 가져오기
    const taxReceipts = await HomeTaxReceipt.find({ 매칭여부: false });
    const cashReceipts = await HomeTaxCashReceipt.find({ 매칭여부: false });
    const invoiceReceipts = await HomeTaxInvoice.find({ 매칭여부: false });
    
    console.log(`[매칭 대상] 세금계산서: ${taxReceipts.length}건, 현금영수증: ${cashReceipts.length}건, 전자계산서: ${invoiceReceipts.length}건`);

    const automatic = [];
    const needConfirmation = [];

    // 자동 매칭 로직
    for (const expense of expenses) {
      const expenseDate = new Date(expense.date);
      const expenseAmount = expense.amount;

      // 세금계산서 매칭 확인 (정확한 금액과 날짜)
      const taxMatch = taxReceipts.find(receipt => {
        const receiptDate = new Date(receipt.작성일자);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        
        const isMatch = receipt.합계금액 === expenseAmount && daysDiff <= 15;
        
        if (isMatch) {
          console.log(`[자동 매칭] 세금계산서 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date}) <-> 영수증: ${receipt.상호} ${receipt.합계금액}원 (${receipt.작성일자})`);
        }
        
        return isMatch;
      });

      if (taxMatch) {
        automatic.push({
          expense,
          receipt: taxMatch,
          type: 'tax'
        });
        continue;
      }

      // 현금영수증 매칭 확인 (정확한 금액과 날짜)
      const cashMatch = cashReceipts.find(receipt => {
        const receiptDate = new Date(receipt.매입일시);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        
        const isMatch = receipt.매입금액 === expenseAmount && daysDiff <= 15;
        
        if (isMatch) {
          console.log(`[자동 매칭] 현금영수증 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date}) <-> 영수증: ${receipt.상호명} ${receipt.매입금액}원 (${receipt.매입일시})`);
        }
        
        return isMatch;
      });

      if (cashMatch) {
        automatic.push({
          expense,
          receipt: cashMatch,
          type: 'cash'
        });
        continue;
      }

      // 전자계산서 매칭 확인 (정확한 금액과 날짜)
      const invoiceMatch = invoiceReceipts.find(receipt => {
        const receiptDate = new Date(receipt.작성일자);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        
        const isMatch = receipt.합계금액 === expenseAmount && daysDiff <= 15;
        
        if (isMatch) {
          console.log(`[자동 매칭] 전자계산서 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date}) <-> 계산서: ${receipt.상호} ${receipt.합계금액}원 (${receipt.작성일자})`);
        }
        
        return isMatch;
      });

      if (invoiceMatch) {
        automatic.push({
          expense,
          receipt: invoiceMatch,
          type: 'invoice'
        });
        continue;
      }

      // 부분 매칭 (금액이 비슷하거나 날짜가 비슷한 경우)
      const similarTaxMatches = taxReceipts.filter(receipt => {
        const receiptDate = new Date(receipt.작성일자);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        const amountDiff = Math.abs(receipt.합계금액 - expenseAmount);
        const amountRatio = amountDiff / Math.max(receipt.합계금액, expenseAmount);
        
        return daysDiff <= 15 && amountRatio <= 0.1;
      });

      const similarCashMatches = cashReceipts.filter(receipt => {
        const receiptDate = new Date(receipt.매입일시);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        const amountDiff = Math.abs(receipt.매입금액 - expenseAmount);
        const amountRatio = amountDiff / Math.max(receipt.매입금액, expenseAmount);
        
        return daysDiff <= 15 && amountRatio <= 0.1;
      });

      const similarInvoiceMatches = invoiceReceipts.filter(receipt => {
        const receiptDate = new Date(receipt.작성일자);
        const dateDiff = Math.abs(expenseDate.getTime() - receiptDate.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        const amountDiff = Math.abs(receipt.합계금액 - expenseAmount);
        const amountRatio = amountDiff / Math.max(receipt.합계금액, expenseAmount);
        
        return daysDiff <= 15 && amountRatio <= 0.1;
      });

      // 유사한 매칭이 하나만 있으면 확인 필요 목록에 추가
      if (similarTaxMatches.length === 1) {
        const match = similarTaxMatches[0];
        console.log(`[수동 확인 필요] 세금계산서 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date}) <-> 영수증: ${match.상호} ${match.합계금액}원 (${match.작성일자})`);
        needConfirmation.push({
          expense,
          receipt: match,
          type: 'tax'
        });
      } else if (similarCashMatches.length === 1) {
        const match = similarCashMatches[0];
        console.log(`[수동 확인 필요] 현금영수증 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date}) <-> 영수증: ${match.상호명} ${match.매입금액}원 (${match.매입일시})`);
        needConfirmation.push({
          expense,
          receipt: match,
          type: 'cash'
        });
      } else if (similarTaxMatches.length > 1) {
        console.log(`[매칭 실패] 중복 후보 - 지출: ${expense.vendor} ${expenseAmount}원, 후보 ${similarTaxMatches.length}개`);
      } else if (similarInvoiceMatches.length === 1) {
        const match = similarInvoiceMatches[0];
        console.log(`[수동 확인 필요] 전자계산서 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date}) <-> 계산서: ${match.상호} ${match.합계금액}원 (${match.작성일자})`);
        needConfirmation.push({
          expense,
          receipt: match,
          type: 'invoice'
        });
      } else if (similarCashMatches.length > 1) {
        console.log(`[매칭 실패] 중복 후보 - 지출: ${expense.vendor} ${expenseAmount}원, 후보 ${similarCashMatches.length}개`);
      } else if (similarInvoiceMatches.length > 1) {
        console.log(`[매칭 실패] 중복 후보 - 지출: ${expense.vendor} ${expenseAmount}원, 전자계산서 후보 ${similarInvoiceMatches.length}개`);
      } else {
        console.log(`[매칭 실패] 후보 없음 - 지출: ${expense.vendor} ${expenseAmount}원 (${expense.date})`);
      }
    }

    console.log(`[매칭 완료] 자동 매칭: ${automatic.length}건, 수동 확인 필요: ${needConfirmation.length}건`);
    
    return NextResponse.json({
      success: true,
      automatic,
      needConfirmation
    });

  } catch (error) {
    console.error('영수증 매칭 API 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}