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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 -mx-6 -my-6 px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="lg:col-span-2 space-y-6">
            <DoctorPatientList date={selectedDate} />
            <ExpenseList date={selectedDate} />
          </div>
          
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-blue-50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="p-6 space-y-6">
                <ClinicStats date={selectedDate} />
                <div className="pt-4 border-t border-indigo-200">
                  <ExtraIncomeList date={selectedDate} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
} 