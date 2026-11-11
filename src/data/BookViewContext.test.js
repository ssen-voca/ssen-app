const React = require('react');
const { act, create } = require('react-test-renderer');
const { BookViewProvider, useBookView } = require('./BookViewContext');
let value;
function Probe() { value = useBookView(); return null; }
test('Week, query, search expansion and masks remain independent between screens', async () => {
 let tree; await act(async () => { tree = create(React.createElement(BookViewProvider, null, React.createElement(Probe))); });
 await act(async () => value.update(false, { chapter: 'Week 3', query: 'home', searchOpen: true }));
 await act(async () => value.update(true, { chapter: 'Week 1', query: 'my', searchOpen: true, shown: { a: { word: true } } }));
 expect(value.home.chapter).toBe('Week 3'); expect(value.home.query).toBe('home'); expect(value.home.shown).toEqual({});
 expect(value.my.chapter).toBe('Week 1');
 await act(async () => value.update(true, { searchOpen: false, query: '' }));
 expect(value.my.chapter).toBe('Week 1'); expect(value.home.searchOpen).toBe(true);
 await act(async () => tree.unmount());
});
