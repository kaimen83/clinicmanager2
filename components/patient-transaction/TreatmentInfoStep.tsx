import { Plus, Trash2, X, Save, CreditCard, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TreatmentInfoStepProps } from '@/types/patient-transaction';
import { StepTitle } from './StepComponents';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export default function TreatmentInfoStep({
  treatmentGroups,
  currentTreatmentGroup,
  errors,
  doctors,
  treatmentTypes,
  paymentMethods,
  cardCompanies,
  handleTreatmentInputChange,
  handleTreatmentSelectChange,
  handleTreatmentSwitchChange,
  addTreatmentGroup,
  removeTreatmentGroup,
  removeCurrentTreatmentGroup,
}: TreatmentInfoStepProps) {
  // 현재 그룹의 필수 항목이 모두 채워져 있는지 확인
  const isCurrentGroupValid = 
    currentTreatmentGroup.doctor && 
    currentTreatmentGroup.treatmentType && 
    ((currentTreatmentGroup.paymentMethod !== '수납없음' && currentTreatmentGroup.paymentAmount > 0) || 
     currentTreatmentGroup.paymentMethod === '수납없음') &&
    (currentTreatmentGroup.paymentMethod !== '카드' || 
     (currentTreatmentGroup.paymentMethod === '카드' && currentTreatmentGroup.cardCompany));
     
  // 컬랩스 상태 관리
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);
  const [isPaymentInfoOpen, setIsPaymentInfoOpen] = useState(true);

  return (
    <div className="space-y-4">
      <StepTitle step={2} />
      
      {/* 추가된 진료 그룹 목록 */}
      {treatmentGroups.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">추가된 진료 정보</CardTitle>
                <Badge variant="outline">{treatmentGroups.length}건</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsGroupsOpen(!isGroupsOpen)}
              >
                {isGroupsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          {isGroupsOpen && (
            <CardContent className="pt-0 px-4 pb-3">
              <div className="max-h-[140px] overflow-y-auto -mx-1 px-1 py-1">
                {treatmentGroups.map(group => (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between p-2 mb-1.5 bg-muted/40 rounded-md border-l-4 border-primary hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium whitespace-nowrap">{group.doctor}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span className="truncate">{group.treatmentType}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        {group.paymentMethod === '카드' ? (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <CreditCard className="h-3 w-3" />
                            <span>{group.paymentMethod}({group.cardCompany})</span>
                          </div>
                        ) : group.paymentMethod === '현금' || group.paymentMethod === '계좌이체' ? (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Coins className="h-3 w-3" />
                            <span>{group.paymentMethod}</span>
                            {group.cashReceipt && <Badge variant="outline" className="text-[10px] h-4 px-1">영수증</Badge>}
                          </div>
                        ) : (
                          <span>{group.paymentMethod}</span>
                        )}
                        <Separator orientation="vertical" className="h-3" />
                        <span className="font-medium">{group.paymentAmount.toLocaleString()}원</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTreatmentGroup(group.id)}
                      className="text-destructive h-7 w-7 -mr-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
      
      {/* 현재 진료 그룹 입력 폼 */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">진료 정보 입력</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeCurrentTreatmentGroup}
              className="text-muted-foreground hover:text-destructive h-7 px-2"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              초기화
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-3 space-y-4">
          {/* 진료 정보 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doctor" className="text-sm">
                진료의 <span className="text-destructive">*</span>
              </Label>
              <Select 
                onValueChange={(value) => handleTreatmentSelectChange('doctor', value)}
                value={currentTreatmentGroup.doctor}
              >
                <SelectTrigger className={errors.doctor ? "border-destructive" : ""}>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor, index) => (
                    <SelectItem key={index} value={doctor.value}>{doctor.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctor && (
                <p className="text-destructive text-xs">{errors.doctor}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="treatmentType" className="text-sm">
                진료내용 <span className="text-destructive">*</span>
              </Label>
              <Select 
                onValueChange={(value) => handleTreatmentSelectChange('treatmentType', value)}
                value={currentTreatmentGroup.treatmentType}
              >
                <SelectTrigger className={errors.treatmentType ? "border-destructive" : ""}>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {treatmentTypes.map((treatment, index) => (
                    <SelectItem key={index} value={treatment.value}>{treatment.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.treatmentType && (
                <p className="text-destructive text-xs">{errors.treatmentType}</p>
              )}
            </div>
          </div>
          
          {/* 수납 정보 섹션 - 접을 수 있는 영역으로 변경 */}
          <Collapsible open={isPaymentInfoOpen} onOpenChange={setIsPaymentInfoOpen} className="border rounded-md">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-left">
              <h4 className="font-medium text-sm">수납 정보</h4>
              {isPaymentInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod" className="text-sm">
                    수납방법 <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    onValueChange={(value) => handleTreatmentSelectChange('paymentMethod', value)}
                    value={currentTreatmentGroup.paymentMethod}
                  >
                    <SelectTrigger className={errors.paymentMethod ? "border-destructive" : ""}>
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method, index) => (
                        <SelectItem key={index} value={method.value}>{method.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && (
                    <p className="text-destructive text-xs">{errors.paymentMethod}</p>
                  )}
                </div>
                
                {currentTreatmentGroup.paymentMethod === '카드' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCompany" className="text-sm">
                      카드사 <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      onValueChange={(value) => handleTreatmentSelectChange('cardCompany', value)}
                      value={currentTreatmentGroup.cardCompany}
                    >
                      <SelectTrigger className={errors.cardCompany ? "border-destructive" : ""}>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {cardCompanies.map((company, index) => (
                          <SelectItem key={index} value={company.value}>{company.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.cardCompany && (
                      <p className="text-destructive text-xs">{errors.cardCompany}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentAmount" className="text-sm">
                    수납금액 {currentTreatmentGroup.paymentMethod !== '수납없음' && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="paymentAmount"
                    name="paymentAmount"
                    type="text"
                    value={isNaN(currentTreatmentGroup.paymentAmount) 
                      ? "0" 
                      : currentTreatmentGroup.paymentAmount === 0 
                        ? "0" 
                        : currentTreatmentGroup.paymentAmount.toLocaleString()}
                    onChange={(e) => {
                      // 입력값에서 콤마(,) 제거
                      const value = e.target.value.replace(/,/g, '');
                      
                      // 숫자 또는 빈 문자열만 허용
                      if (value === '' || /^\d+$/.test(value)) {
                        // Input 이벤트 생성
                        const inputEvent = {
                          target: {
                            name: 'paymentAmount',
                            value: value === '' ? '0' : value,
                            type: 'number'
                          }
                        } as React.ChangeEvent<HTMLInputElement>;
                        
                        // 기존 핸들러 호출
                        handleTreatmentInputChange(inputEvent);
                      }
                    }}
                    onFocus={(e) => {
                      if (currentTreatmentGroup.paymentAmount === 0 || isNaN(currentTreatmentGroup.paymentAmount)) {
                        // Input 이벤트 생성
                        const inputEvent = {
                          target: {
                            name: 'paymentAmount',
                            value: '',
                            type: 'number'
                          }
                        } as React.ChangeEvent<HTMLInputElement>;
                        
                        // 기존 핸들러 호출
                        handleTreatmentInputChange(inputEvent);
                      }
                    }}
                    className={errors.paymentAmount ? "border-destructive" : ""}
                    disabled={currentTreatmentGroup.paymentMethod === '수납없음'}
                  />
                  {errors.paymentAmount && (
                    <p className="text-destructive text-xs">{errors.paymentAmount}</p>
                  )}
                </div>
                
                {(currentTreatmentGroup.paymentMethod === '현금' || currentTreatmentGroup.paymentMethod === '계좌이체') && (
                  <div className="flex items-center space-x-2 h-10 mt-1">
                    <Label htmlFor="cashReceipt" className="flex-grow text-sm">현금영수증 발행</Label>
                    <Switch
                      id="cashReceipt"
                      checked={currentTreatmentGroup.cashReceipt}
                      onCheckedChange={(checked) => handleTreatmentSwitchChange('cashReceipt', checked)}
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5 mt-3">
                <Label htmlFor="notes" className="text-sm">메모</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={currentTreatmentGroup.notes || ''}
                  onChange={handleTreatmentInputChange}
                  placeholder="추가 정보를 입력하세요"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
        <CardFooter className="px-4 py-3 flex justify-end border-t">
          <Button
            type="button"
            onClick={addTreatmentGroup}
            disabled={!isCurrentGroupValid}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            진료정보 추가
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 