'use client';

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, UserRound, Stethoscope, ClipboardList, CreditCard, DollarSign, Package, FileSpreadsheet, Users, ReceiptText, ShoppingBag, HardDrive, FileUp } from "lucide-react";
import { Button } from "./ui/button";
import SettingsList from "./SettingsList";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import ExpenseSubTabs from "./ExpenseSubTabs";
import ImplantSubTabs from "./ImplantSubTabs";

type TabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  settingType?: string;
  includesFeeRate?: boolean;
};

export default function SystemSettingsModal() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("incomingPath");
  
  // useMemo를 사용하여 tabItems가 재렌더링에 영향을 받지 않도록 합니다
  const tabItems = useMemo<TabItem[]>(() => [
    {
      id: "incomingPath",
      label: "내원경로",
      icon: <UserRound className="h-4 w-4" />,
      settingType: "visitPath"
    },
    {
      id: "doctors",
      label: "진료의",
      icon: <Stethoscope className="h-4 w-4" />,
      settingType: "doctor"
    },
    {
      id: "treatmentContents",
      label: "진료내용",
      icon: <ClipboardList className="h-4 w-4" />,
      settingType: "treatmentType"
    },
    {
      id: "paymentMethods",
      label: "수납방법",
      icon: <ReceiptText className="h-4 w-4" />,
      settingType: "paymentMethod"
    },
    {
      id: "nonTreatmentIncome",
      label: "진료외수입",
      icon: <DollarSign className="h-4 w-4" />,
      settingType: "extraIncomeType"
    },
    {
      id: "cardCompanies",
      label: "카드사",
      icon: <CreditCard className="h-4 w-4" />,
      settingType: "cardCompany",
      includesFeeRate: true
    },
    {
      id: "implants",
      label: "임플란트",
      icon: <Package className="h-4 w-4" />
    },
    {
      id: "employees",
      label: "직원",
      icon: <Users className="h-4 w-4" />,
      settingType: "staff"
    },
    {
      id: "expenses",
      label: "지출관련",
      icon: <ReceiptText className="h-4 w-4" />
    },
    {
      id: "oralProducts",
      label: "구강용품",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      id: "dbBackup",
      label: "DB백업",
      icon: <HardDrive className="h-4 w-4" />,
    },
    {
      id: "excelImport",
      label: "엑셀 불러오기",
      icon: <FileUp className="h-4 w-4" />,
    },
  ], []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // 현재 선택된 탭에 따라 콘텐츠를 렌더링합니다
  const renderTabContent = () => {
    const currentTab = tabItems.find(tab => tab.id === activeTab);
    
    if (!currentTab) return null;
    
    // 일반 설정 탭
    if (currentTab.settingType) {
      return (
        <SettingsList 
          title={`${currentTab.label} 관리`} 
          type={currentTab.settingType} 
          includesFeeRate={currentTab.includesFeeRate} 
        />
      );
    }
    
    // 특수 탭들
    switch (currentTab.id) {
      case "expenses":
        return <ExpenseSubTabs title={`${currentTab.label} 관리`} />;
        
      case "implants":
        return <ImplantSubTabs title={`${currentTab.label} 관리`} />;
        
      case "dbBackup":
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">데이터베이스 백업</h3>
            <p className="mb-6 text-gray-600">데이터베이스 백업을 수행하려면 아래 버튼을 클릭하세요. 백업 파일은 자동으로 다운로드됩니다.</p>
            <Button className="w-full sm:w-auto gap-2">
              <HardDrive className="h-4 w-4" />
              백업 시작
            </Button>
          </div>
        );
        
      case "excelImport":
        return (
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">엑셀 파일 불러오기</h3>
            <p className="mb-3 text-gray-600">엑셀 파일에서 데이터를 가져옵니다. 다음 유형의 데이터를 지원합니다:</p>
            <ul className="list-disc pl-5 mb-6 text-gray-600 space-y-1">
              <li>환자 데이터</li>
              <li>진료 기록</li>
              <li>결제 내역</li>
            </ul>
            <Button className="w-full sm:w-auto gap-2">
              <FileUp className="h-4 w-4" />
              파일 선택
            </Button>
          </div>
        );
        
      case "oralProducts":
        return (
          <div className="p-4">구강용품 설정 내용</div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span>시스템 설정</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <DialogTitle>시스템 설정</DialogTitle>
          </div>
          <Badge variant="outline" className="w-fit mt-2 font-normal">
            버전 1.0.0
          </Badge>
        </DialogHeader>
        
        <Separator />

        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-[60vh]">
          <div className="w-full sm:w-1/4 border-r bg-muted/20">
            <ScrollArea className="h-full py-4">
              <nav className="px-2 flex flex-col gap-1">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)} 
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors w-full text-left ${
                      activeTab === tab.id 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 