import {test,expect} from 'bun:test';
import {canSubmitReport,canReviewReport,stockForecast} from '../src/lib/reportRules.ts';
test('assistant submission requires create grant',()=>{expect(canSubmitReport({notes_view:true},false)).toBe(false);expect(canSubmitReport({notes_create:true},false)).toBe(true);});
test('authors cannot approve another owner report',()=>{expect(canReviewReport('owner','assistant',false)).toBe(false);expect(canReviewReport('owner','owner',false)).toBe(true);expect(canReviewReport('owner','admin',true)).toBe(true);});
test('stock projection uses actual 30 day sales and never invents sales',()=>{expect(stockForecast(40,60)).toEqual({days:20,reorder:28});expect(stockForecast(40,0)).toBeNull();});
