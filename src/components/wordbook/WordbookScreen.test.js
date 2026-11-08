const React = require('react');
const { act, create } = require('react-test-renderer');
const { TextInput } = require('react-native');
const { DEFAULT_PREFS } = require('../../data/storage');
const words = [{id:'a',word:'insight',meanings:['통찰'],synonyms:[''],chapter:'Day 1',details:{example:'',exampleKo:'',exampleMeaning:''}}, {id:'b',word:'cultivate',meanings:['기르다'],synonyms:[''],chapter:'Day 2',details:{example:'',exampleKo:'',exampleMeaning:''}}];
let mockMine = false, mockSaved;
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() }, usePathname: () => mockMine ? '/my-voca' : '/' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({top:0,bottom:0}) }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: {id:1} }) }));
jest.mock('../../data/WordsContext', () => ({ useWords: () => ({ ready:true, words:[], prefs:{maskWord:false,maskMeaning:true,activeChapter:'all'},shown:{},setPref:jest.fn(),setShown:jest.fn() }) }));
jest.mock('../../bookmarks/BookmarksContext', () => ({ useBookmarks: () => mockSaved }));
jest.mock('../WordFormSheet', () => ({ useWordForm: () => ({open:jest.fn()}) }));
jest.mock('../Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('../MainScroll', () => ({ MainScroll: ({children}) => children }));
const { BookViewProvider } = require('../../data/BookViewContext');
const { TopBar } = require('../TopBar');
const { BottomNav } = require('../BottomNav');
const Screen = require('./WordbookScreen').default;
let tree;
async function mount() { await act(async () => { tree=create(React.createElement(BookViewProvider,null,React.createElement(TopBar),React.createElement(Screen,{mine:mockMine}),React.createElement(BottomNav))); }); }
beforeEach(() => { mockMine=false; mockSaved={words,ids:['a'],pending:new Set(),loading:false,error:'',toggle:jest.fn(),reload:jest.fn()}; });
afterEach(async()=>{await act(async()=>tree?.unmount());});
test('five navigation tabs and a single header Day control',async()=>{
 await mount(); const buttons=tree.root.findAll(n=>typeof n.type === 'string' && n.props.accessibilityLabel?.startsWith('Day 선택:'));
 expect(buttons).toHaveLength(1);
 expect(tree.root.findAll(n=>n.props.accessibilityRole==='button' && n.props.accessibilityState?.selected!==undefined).length).toBeGreaterThanOrEqual(5);
 expect(JSON.stringify(tree.toJSON())).toContain('MY VOCA');
});
test('header search expands, searches meaning, then clears on close',async()=>{
 await mount(); expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
 await act(async()=>tree.root.findByProps({accessibilityLabel:'검색 열기'}).props.onPress());
 await act(async()=>tree.root.findByType(TextInput).props.onChangeText('통찰'));
 expect(JSON.stringify(tree.toJSON())).toContain('insight'); expect(JSON.stringify(tree.toJSON())).not.toContain('cultivate');
 await act(async()=>tree.root.findByProps({accessibilityLabel:'검색 닫기'}).props.onPress());
 expect(tree.root.findAllByType(TextInput)).toHaveLength(0); expect(JSON.stringify(tree.toJSON())).toContain('cultivate');
});
test('MY VOCA displays only bookmarked words with both mask switches',async()=>{
 mockMine=true; await mount(); const output=JSON.stringify(tree.toJSON()); expect(output).toContain('insight');expect(output).not.toContain('cultivate');
 expect(tree.root.findByProps({accessibilityLabel:'영어 가리기'})).toBeTruthy();expect(tree.root.findByProps({accessibilityLabel:'뜻 가리기'})).toBeTruthy();
});
test('MY VOCA empty state links home',async()=>{
 mockMine=true;mockSaved.ids=[];await mount();expect(JSON.stringify(tree.toJSON())).toContain('아직 저장한 단어가 없어요.');expect(JSON.stringify(tree.toJSON())).toContain('홈으로 이동');
});

test('MY VOCA combines Day and search and distinguishes empty Day',async()=>{
 mockMine=true;await mount();
 const {DayPicker}=require('./DayPicker');
 await act(async()=>tree.root.findByType(DayPicker).props.onChange('Day 2'));
 expect(JSON.stringify(tree.toJSON())).toContain('이 Day에 저장한 단어가 없어요.');
 await act(async()=>tree.root.findByProps({accessibilityLabel:'검색 열기'}).props.onPress());
 await act(async()=>tree.root.findByType(TextInput).props.onChangeText('통찰'));
 expect(JSON.stringify(tree.toJSON())).toContain('검색 결과가 없어요.');
 await act(async()=>tree.root.findByType(DayPicker).props.onChange('Day 1'));
 expect(JSON.stringify(tree.toJSON())).toContain('insight');
});
