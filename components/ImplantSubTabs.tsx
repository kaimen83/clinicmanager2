'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsList from './SettingsList';
import ImplantSpecificationList from './ImplantSpecificationList';

type ImplantSubTabsProps = {
  title: string;
};

export default function ImplantSubTabs({ title }: ImplantSubTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState("fixture");
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <Tabs defaultValue="fixture" onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="fixture">Fixture</TabsTrigger>
          <TabsTrigger value="implant">이식재</TabsTrigger>
          <TabsTrigger value="specification">임플란트 규격</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fixture">
          <SettingsList title="Fixture 관리" type="implantManufacturer" />
        </TabsContent>
        
        <TabsContent value="implant">
          <SettingsList title="이식재 관리" type="implantFixture" />
        </TabsContent>

        <TabsContent value="specification">
          <ImplantSpecificationList title="임플란트 규격 관리" />
        </TabsContent>
      </Tabs>
    </div>
  );
} 