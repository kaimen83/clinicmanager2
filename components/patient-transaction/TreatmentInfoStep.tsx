import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TreatmentInfoStepProps } from '@/types/patient-transaction';
import { StepTitle } from './StepComponents';

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
  return (
    <div className="space-y-4">
      <StepTitle step={2} />
      
      {/* 진료 그룹 목록 */}
      {treatmentGroups.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">추가된 진료 정보 ({treatmentGroups.length}건)</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md">
            {treatmentGroups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border-l-4 border-primary">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {group.doctor} - {group.treatmentType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {group.paymentMethod === '카드' 
                      ? `${group.paymentMethod}(${group.cardCompany})` 
                      : group.paymentMethod} | 
                    {group.paymentAmount.toLocaleString()}원
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTreatmentGroup(group.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 현재 진료 그룹 입력 폼 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="doctor">
            진료의 <span className="text-red-500">*</span>
          </Label>
          {treatmentGroups.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                새 진료 정보 입력 중
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeCurrentTreatmentGroup}
                className="h-6 w-6 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Select 
          onValueChange={(value) => handleTreatmentSelectChange('doctor', value)}
          value={currentTreatmentGroup.doctor}
        >
          <SelectTrigger className={errors.doctor ? "border-red-500" : ""}>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((doctor, index) => (
              <SelectItem key={index} value={doctor.value}>{doctor.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.doctor && (
          <p className="text-red-500 text-xs">{errors.doctor}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="treatmentType">
          진료내용 <span className="text-red-500">*</span>
        </Label>
        <Select 
          onValueChange={(value) => handleTreatmentSelectChange('treatmentType', value)}
          value={currentTreatmentGroup.treatmentType}
        >
          <SelectTrigger className={errors.treatmentType ? "border-red-500" : ""}>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {treatmentTypes.map((treatment, index) => (
              <SelectItem key={index} value={treatment.value}>{treatment.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.treatmentType && (
          <p className="text-red-500 text-xs">{errors.treatmentType}</p>
        )}
      </div>
      
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-4">수납 정보</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              수납방법 <span className="text-red-500">*</span>
            </Label>
            <Select 
              onValueChange={(value) => handleTreatmentSelectChange('paymentMethod', value)}
              value={currentTreatmentGroup.paymentMethod}
            >
              <SelectTrigger className={errors.paymentMethod ? "border-red-500" : ""}>
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method, index) => (
                  <SelectItem key={index} value={method.value}>{method.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-red-500 text-xs">{errors.paymentMethod}</p>
            )}
          </div>
          
          {currentTreatmentGroup.paymentMethod === '카드' && (
            <div className="space-y-2">
              <Label htmlFor="cardCompany">
                카드사 <span className="text-red-500">*</span>
              </Label>
              <Select 
                onValueChange={(value) => handleTreatmentSelectChange('cardCompany', value)}
                value={currentTreatmentGroup.cardCompany}
              >
                <SelectTrigger className={errors.cardCompany ? "border-red-500" : ""}>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {cardCompanies.map((company, index) => (
                    <SelectItem key={index} value={company.value}>{company.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cardCompany && (
                <p className="text-red-500 text-xs">{errors.cardCompany}</p>
              )}
            </div>
          )}
          
          {(currentTreatmentGroup.paymentMethod === '현금' || currentTreatmentGroup.paymentMethod === '계좌이체') && (
            <div className="space-y-2 flex items-center">
              <div className="flex-1">
                <Label htmlFor="cashReceipt">현금영수증</Label>
              </div>
              <Switch
                id="cashReceipt"
                checked={currentTreatmentGroup.cashReceipt}
                onCheckedChange={(checked) => handleTreatmentSwitchChange('cashReceipt', checked)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">
              수납금액 {currentTreatmentGroup.paymentMethod !== '수납없음' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="paymentAmount"
              name="paymentAmount"
              type="number"
              value={currentTreatmentGroup.paymentAmount}
              onChange={handleTreatmentInputChange}
              className={errors.paymentAmount ? "border-red-500" : ""}
              disabled={currentTreatmentGroup.paymentMethod === '수납없음'}
            />
            {errors.paymentAmount && (
              <p className="text-red-500 text-xs">{errors.paymentAmount}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Input
              id="notes"
              name="notes"
              value={currentTreatmentGroup.notes || ''}
              onChange={handleTreatmentInputChange}
            />
          </div>
        </div>
      </div>
      
      {/* 진료 그룹 추가 버튼 */}
      <div className="flex justify-end mt-4 pt-4 border-t">
        <Button
          type="button"
          onClick={addTreatmentGroup}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          진료정보 추가
        </Button>
      </div>
    </div>
  );
} 