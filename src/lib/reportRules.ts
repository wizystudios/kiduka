export function canSubmitReport(permissions: Record<string, boolean> | null, owner: boolean) { return owner || permissions?.notes_create === true; }
export function canReviewReport(ownerId: string, userId: string, superAdmin: boolean) { return ownerId === userId || superAdmin; }
export function stockForecast(stock: number, soldIn30Days: number) { const daily = soldIn30Days / 30; return daily > 0 ? { days: Math.ceil(stock / daily), reorder: Math.ceil(daily * 14) } : null; }
