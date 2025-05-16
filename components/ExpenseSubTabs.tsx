'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsList from './SettingsList';
import VendorManager from './VendorManager';

type ExpenseSubTabsProps = {
  title: string;
};

export default function ExpenseSubTabs({ title }: ExpenseSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState("accounts");
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <Tabs defaultValue="accounts" onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="accounts">지출계정</TabsTrigger>
          <TabsTrigger value="vendors">거래처</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts">
          <SettingsList title="지출계정 관리" type="expenseAccount" />
        </TabsContent>
        
        <TabsContent value="vendors">
          <VendorManager title="거래처 관리" />
        </TabsContent>
      </Tabs>
    </div>
  );
} 