import { DateRange } from "./dateRange";

export interface TaskDefinition {
    name: string;
    delay?: number;
    dateRanges?: DateRange[];
    enabled?: boolean;
    param?: Record<string, any>;
}
