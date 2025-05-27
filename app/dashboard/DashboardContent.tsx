'use client';

import { ReactNode, useState } from 'react';
import { useDateContext } from '@/lib/context/dateContext';
import DoctorPatientList from '@/components/DoctorPatientList';
import ClinicStats from '@/components/ClinicStats';
import ExtraIncomeList from '@/components/ExtraIncomeList';
import ExpenseList from '@/components/ExpenseList';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  children?: ReactNode;
};

export default function DashboardContent({ children }: Props) {
  const { selectedDate } = useDateContext();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-16">
        <div className="lg:col-span-2 space-y-8">
          <div className="min-h-[400px]">
            <DoctorPatientList date={selectedDate} />
          </div>
          <div className="min-h-[300px]">
            <ExpenseList date={selectedDate} />
          </div>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-sm p-4 bg-slate-50">
            <div className="space-y-4">
              <ClinicStats date={selectedDate} />
              <ExtraIncomeList date={selectedDate} />
            </div>
          </Card>
        </div>
      </div>


    </>
  );
} 