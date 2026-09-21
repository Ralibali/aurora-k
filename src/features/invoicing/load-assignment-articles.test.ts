import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAssignmentArticles } from './load-assignment-articles';
const mocks = vi.hoisted(() => ({ range: vi.fn(), ids: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ select: () => ({ in: mocks.ids }) }) } }));
beforeEach(() => { mocks.ids.mockReset().mockImplementation(() => ({ order: () => ({ range: mocks.range }) })); mocks.range.mockReset().mockResolvedValue({ data: [], error: null }); });
describe('batch invoice sources', () => {
  it('fetches multiple jobs together and follows the server page limit', async () => {
    mocks.range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null }).mockResolvedValueOnce({ data: [{ id: 1000 }], error: null });
    expect(await loadAssignmentArticles(['a', 'b', 'a'])).toHaveLength(1001);
    expect(mocks.ids).toHaveBeenCalledWith('assignment_id', ['a', 'b']);
    expect(mocks.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mocks.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
  it('fails the complete preparation if a later page cannot be fetched', async () => {
    mocks.range.mockResolvedValueOnce({ data: Array(1000).fill({}), error: null }).mockResolvedValueOnce({ data: null, error: new Error('Network') });
    await expect(loadAssignmentArticles(['a'])).rejects.toThrow('Network');
  });
  it('bounds request sizes and avoids requests for an empty selection', async () => {
    expect(await loadAssignmentArticles([])).toEqual([]);
    expect(mocks.range).not.toHaveBeenCalled();
    await loadAssignmentArticles(Array.from({ length: 101 }, (_, i) => String(i)));
    expect(mocks.ids.mock.calls.map(call => call[1].length)).toEqual([100, 1]);
  });
});
