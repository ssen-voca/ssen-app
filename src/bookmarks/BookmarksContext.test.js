const React = require('react');
const { act, create } = require('react-test-renderer');
let mockUser = { id: 1 };
let mockValue;
jest.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: mockUser, status: mockUser ? 'authenticated' : 'anonymous' }) }));
jest.mock('../data/WordsContext', () => ({ useWords: () => ({ setCatalog: jest.fn() }) }));
jest.mock('./api', () => ({ getCatalog: jest.fn(), getBookmarks: jest.fn(), changeBookmark: jest.fn() }));
const api = require('./api');
const { BookmarksProvider, useBookmarks } = require('./BookmarksContext');
function Probe() { mockValue = useBookmarks(); return null; }
let tree;
async function mount() { await act(async () => { tree = create(React.createElement(BookmarksProvider, null, React.createElement(Probe))); }); }
beforeEach(() => {
 mockUser = { id: 1 }; api.getCatalog.mockResolvedValue([{ id: 'word-1' }]); api.getBookmarks.mockResolvedValue([]); api.changeBookmark.mockResolvedValue(undefined);
});
afterEach(async () => { await act(async () => tree?.unmount()); jest.clearAllMocks(); });
test('server bookmarks are shared and add/remove update immediately', async () => {
 await mount(); await act(async () => mockValue.toggle('word-1')); expect(mockValue.ids).toEqual(['word-1']);
 await act(async () => mockValue.toggle('word-1')); expect(mockValue.ids).toEqual([]);
 expect(api.changeBookmark.mock.calls).toEqual([['word-1', true], ['word-1', false]]);
});
test('failed add rolls back', async () => {
 await mount(); api.changeBookmark.mockRejectedValueOnce(new Error('offline'));
 await act(async () => { await expect(mockValue.toggle('word-1')).rejects.toThrow('offline'); });
 expect(mockValue.ids).toEqual([]); expect(mockValue.pending.size).toBe(0);
});
test('failed removal restores the bookmark', async () => {
 api.getBookmarks.mockResolvedValue(['word-1']); await mount(); api.changeBookmark.mockRejectedValueOnce(new Error('offline'));
 await act(async () => { await expect(mockValue.toggle('word-1')).rejects.toThrow('offline'); }); expect(mockValue.ids).toEqual(['word-1']);
});
test('duplicate clicks issue one request and previous account response is ignored', async () => {
 await mount(); let reject; api.changeBookmark.mockImplementationOnce(() => new Promise((_, r) => { reject = r; }));
 let pending; await act(async () => { pending = mockValue.toggle('word-1').catch(() => {}); await mockValue.toggle('word-1'); });
 expect(api.changeBookmark).toHaveBeenCalledTimes(1);
 mockUser = { id: 2 }; await act(async () => tree.update(React.createElement(BookmarksProvider, null, React.createElement(Probe))));
 await act(async () => { reject(new Error('old account')); await pending; }); expect(mockValue.ids).toEqual([]);
});
test('logout clears private catalog and bookmarks', async () => {
 api.getBookmarks.mockResolvedValue(['word-1']); await mount(); mockUser = null;
 await act(async () => tree.update(React.createElement(BookmarksProvider, null, React.createElement(Probe))));
 expect(mockValue.ids).toEqual([]); expect(mockValue.words).toEqual([]);
});
