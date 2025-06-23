import * as React from "react";
import { cn } from "@/lib/utils";
import { spacing, type SpacingScale } from "@/lib/tokens/spacing";
import { colors } from "@/lib/tokens/colors";
import { shadows } from "@/lib/tokens/shadows";
import { borders } from "@/lib/tokens/borders";
import { EnhancedButton } from "./enhanced-button";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption 
} from "./table";

// Enhanced Data Table types
export type DataTableVariant = 'default' | 'striped' | 'bordered' | 'minimal';
export type DataTableSize = 'sm' | 'md' | 'lg';
export type SortDirection = 'asc' | 'desc' | null;

// Column configuration interface
export interface DataTableColumn<T = any> {
  key: string;
  header: string | React.ReactNode;
  accessor?: string | ((item: T) => any);
  render?: (value: any, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
}

// Pagination configuration
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: number[];
}

// Enhanced Data Table Props
export interface EnhancedDataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  variant?: DataTableVariant;
  size?: DataTableSize;
  interactive?: boolean;
  selectable?: boolean;
  loading?: boolean;
  pagination?: PaginationConfig;
  emptyState?: React.ReactNode;
  caption?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
  selectedRows?: Set<number>;
  stickyHeader?: boolean;
  maxHeight?: string | number;
  onSort?: (key: string, direction: SortDirection) => void;
  onRowClick?: (item: T, index: number) => void;
  onRowSelect?: (selectedIndices: Set<number>) => void;
  onPaginationChange?: (page: number, pageSize: number) => void;
  className?: string;
  rowClassName?: string | ((item: T, index: number) => string);
}

// Table variant styles
const tableVariants = {
  default: 'bg-white',
  striped: 'bg-white [&_tbody_tr:nth-child(even)]:bg-gray-50',
  bordered: 'bg-white border border-gray-200 [&_th]:border-r [&_td]:border-r [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0',
  minimal: 'bg-transparent',
};

// Table size styles
const tableSizes = {
  sm: '[&_th]:h-8 [&_th]:px-2 [&_td]:p-2 [&_th]:text-xs [&_td]:text-sm',
  md: '[&_th]:h-10 [&_th]:px-4 [&_td]:p-3 [&_th]:text-sm [&_td]:text-base',
  lg: '[&_th]:h-12 [&_th]:px-6 [&_td]:p-4 [&_th]:text-base [&_td]:text-lg',
};

// Sort icon component
const SortIcon: React.FC<{ direction: SortDirection }> = ({ direction }) => {
  return (
    <span className="ml-2 inline-flex flex-col">
      <svg 
        className={cn(
          "w-3 h-3 transition-colors",
          direction === 'asc' ? 'text-primary-500' : 'text-gray-400'
        )} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
      <svg 
        className={cn(
          "w-3 h-3 -mt-1 transition-colors",
          direction === 'desc' ? 'text-primary-500' : 'text-gray-400'
        )} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </span>
  );
};

// Loading skeleton row
const LoadingRow: React.FC<{ columnsCount: number }> = ({ columnsCount }) => (
  <TableRow>
    {Array.from({ length: columnsCount }).map((_, index) => (
      <TableCell key={index}>
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </TableCell>
    ))}
  </TableRow>
);

// Empty state component
const EmptyState: React.FC<{ 
  children?: React.ReactNode;
  columnsCount: number;
}> = ({ children, columnsCount }) => (
  <TableRow>
    <TableCell colSpan={columnsCount} className="text-center py-12">
      {children || (
        <div className="flex flex-col items-center justify-center text-gray-500">
          <svg className="w-12 h-12 mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium">데이터가 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">표시할 항목이 없습니다</p>
        </div>
      )}
    </TableCell>
  </TableRow>
);

// Pagination component
const Pagination: React.FC<{
  config: PaginationConfig;
  onChange: (page: number, pageSize: number) => void;
}> = ({ config, onChange }) => {
  const { page, pageSize, total, showSizeChanger = true, pageSizeOptions = [10, 20, 50, 100] } = config;
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onChange(newPage, pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    onChange(1, newPageSize);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center text-sm text-gray-700">
        <span>
          {total > 0 ? `${startItem}-${endItem}` : '0'} / {total}개 항목
        </span>
        {showSizeChanger && (
          <div className="ml-4">
            <label htmlFor="pageSize" className="mr-2">페이지당:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <EnhancedButton
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => handlePageChange(page - 1)}
        >
          이전
        </EnhancedButton>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            
            return (
              <EnhancedButton
                key={pageNum}
                variant={page === pageNum ? "primary" : "ghost"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className="min-w-[32px]"
              >
                {pageNum}
              </EnhancedButton>
            );
          })}
        </div>
        
        <EnhancedButton
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => handlePageChange(page + 1)}
        >
          다음
        </EnhancedButton>
      </div>
    </div>
  );
};

// Enhanced Data Table Component
export const EnhancedDataTable = <T extends Record<string, any>>({
  data,
  columns,
  variant = 'default',
  size = 'md',
  interactive = false,
  selectable = false,
  loading = false,
  pagination,
  emptyState,
  caption,
  sortBy,
  sortDirection,
  selectedRows = new Set(),
  stickyHeader = false,
  maxHeight,
  onSort,
  onRowClick,
  onRowSelect,
  onPaginationChange,
  className,
  rowClassName,
}: EnhancedDataTableProps<T>) => {
  const [internalSort, setInternalSort] = React.useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: sortBy || '',
    direction: sortDirection || null,
  });

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!columns.find(col => col.key === columnKey)?.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (internalSort.key === columnKey) {
      newDirection = internalSort.direction === 'asc' ? 'desc' : internalSort.direction === 'desc' ? null : 'asc';
    }

    setInternalSort({ key: columnKey, direction: newDirection });
    onSort?.(columnKey, newDirection);
  };

  // Handle row selection
  const handleRowSelect = (index: number) => {
    if (!selectable) return;
    
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    onRowSelect?.(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!selectable) return;
    
    const allSelected = data.every((_, index) => selectedRows.has(index));
    const newSelected = allSelected ? new Set<number>() : new Set(data.map((_, index) => index));
    onRowSelect?.(newSelected);
  };

  // Get cell value
  const getCellValue = (item: T, column: DataTableColumn<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === 'string') {
        return item[column.accessor];
      }
      return column.accessor(item);
    }
    return item[column.key];
  };

  // Get row class name
  const getRowClassName = (item: T, index: number) => {
    const baseClasses = cn(
      interactive && 'cursor-pointer hover:bg-gray-50',
      selectedRows.has(index) && 'bg-primary-50 hover:bg-primary-100'
    );
    
    if (typeof rowClassName === 'function') {
      return cn(baseClasses, rowClassName(item, index));
    }
    return cn(baseClasses, rowClassName);
  };

  const tableContainerStyle = maxHeight ? { maxHeight } : {};

  return (
    <div className={cn("w-full", className)}>
      <div 
        className={cn(
          "relative overflow-auto rounded-table border border-gray-200",
          stickyHeader && "max-h-96"
        )}
        style={tableContainerStyle}
      >
        <Table className={cn(
          tableVariants[variant],
          tableSizes[size],
          "relative"
        )}>
          {caption && <TableCaption>{caption}</TableCaption>}
          
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-white")}>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && data.every((_, index) => selectedRows.has(index))}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    column.headerClassName,
                    column.sortable && "cursor-pointer select-none hover:bg-gray-100",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && (
                      <SortIcon 
                        direction={internalSort.key === column.key ? internalSort.direction : null} 
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <LoadingRow key={index} columnsCount={columns.length + (selectable ? 1 : 0)} />
              ))
            ) : data.length === 0 ? (
              <EmptyState columnsCount={columns.length + (selectable ? 1 : 0)}>
                {emptyState}
              </EmptyState>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={index}
                  className={getRowClassName(item, index)}
                  onClick={() => onRowClick?.(item, index)}
                >
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleRowSelect(index)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const value = getCellValue(item, column);
                    const rendered = column.render ? column.render(value, item, index) : value;
                    
                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.className,
                          column.align === 'center' && "text-center",
                          column.align === 'right' && "text-right"
                        )}
                      >
                        {rendered}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination && onPaginationChange && (
        <Pagination 
          config={pagination} 
          onChange={onPaginationChange}
        />
      )}
    </div>
  );
};

// Enhanced Data Table Hook for easier state management
export const useEnhancedDataTable = <T extends Record<string, any>>(
  initialData: T[],
  initialConfig?: {
    sortBy?: string;
    sortDirection?: SortDirection;
    pageSize?: number;
  }
) => {
  const [data, setData] = React.useState(initialData);
  const [sortConfig, setSortConfig] = React.useState({
    key: initialConfig?.sortBy || '',
    direction: initialConfig?.sortDirection || null as SortDirection,
  });
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [pagination, setPagination] = React.useState({
    page: 1,
    pageSize: initialConfig?.pageSize || 10,
    total: initialData.length,
  });

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Paginated data
  const paginatedData = React.useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      page,
      pageSize,
    }));
  };

  React.useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: sortedData.length,
      page: 1, // Reset to first page when data changes
    }));
  }, [sortedData.length]);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  return {
    data: paginatedData,
    allData: sortedData,
    sortConfig,
    selectedRows,
    pagination,
    setData,
    setSelectedRows,
    handleSort,
    handlePaginationChange,
  };
};

export default EnhancedDataTable; 