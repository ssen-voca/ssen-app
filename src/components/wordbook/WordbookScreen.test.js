const React = require('react');
const { act, create } = require('react-test-renderer');
const { TextInput } = require('react-native');
const { DEFAULT_PREFS } = require('../../data/storage');
const words = [{id:'a',word:'insight',meanings:['통찰'],synonyms:[''],chapter:'Week 1',details:{example:'',exampleKo:'',exampleMeaning:''}}, {id:'b',word:'cultivate',meanings:['기르다'],synonyms:[''],chapter:'Week 2',details:{example:'',exampleKo:'',exampleMeaning:''}}];
let mockMine = false, mockSaved;
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() }, usePathname: () => mockMine ? '/my-voca' : '/' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({top:0,bottom:0}) }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: {id:1} }) }));
jest.mock('../../data/WordsContext', () => ({ useWords: () => ({ ready:true, words:[], prefs:{maskWord:false,maskMeaning:true,activeChapter:'all'},shown:{},setPref:jest.fn(),setShown:jest.fn() }) }));
jest.mock('../../bookmarks/BookmarksContext', () => ({ useBookmarks: () => mockSaved }));
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
test('four navigation tabs (no 시험) and a single Week control in place of the greeting',async()=>{
 await mount(); const buttons=tree.root.findAll(n=>typeof n.type === 'string' && n.props.accessibilityLabel?.startsWith('Week 선택:'));
 expect(buttons).toHaveLength(1);
 const nav=tree.root.findByProps({accessibilityLabel:'주요 메뉴'});
 expect(nav.findAll(n=>typeof n.type === 'string' && n.props.accessibilityRole==='button')).toHaveLength(4);
 const output=JSON.stringify(tree.toJSON()); expect(output).toContain('MY VOCA'); expect(output).toContain('독해 VOCA 단어장');
 expect(output).not.toContain('시험'); expect(output).not.toContain('오늘도 한 단어씩');
});
test('saved words show a star, not a bookmark',async()=>{
 mockMine=true; await mount();
 const { Icon }=require('../Icon');
 const names=tree.root.findAllByType(Icon).map(n=>n.props.name);
 expect(names).toContain('starFilled'); expect(names).not.toContain('bookmark'); expect(names).not.toContain('bookmarkFilled');
});
test('header search focuses the input on tap, searches meaning, then clears on close',async()=>{
 await mount(); const input=()=>tree.root.findByType(TextInput);
 // 입력칸은 항상 달려 있고 누르는 순간 focus해야 모바일에서 키보드가 뜬다.
 await act(async()=>tree.root.findByProps({accessibilityLabel:'검색 열기'}).props.onPress());
 expect(tree.root.findAllByProps({accessibilityLabel:'검색 닫기'}).length).toBeGreaterThan(0);
 expect(JSON.stringify(tree.toJSON())).not.toContain('독해 VOCA 단어장');
 await act(async()=>input().props.onChangeText('통찰'));
 expect(JSON.stringify(tree.toJSON())).toContain('insight'); expect(JSON.stringify(tree.toJSON())).not.toContain('cultivate');
 await act(async()=>tree.root.findByProps({accessibilityLabel:'검색 닫기'}).props.onPress());
 expect(input().props.value).toBe(''); expect(JSON.stringify(tree.toJSON())).toContain('cultivate'); expect(JSON.stringify(tree.toJSON())).toContain('독해 VOCA 단어장');
});
test('MY VOCA displays only bookmarked words with the word, meaning and all toggles',async()=>{
 mockMine=true; await mount(); const output=JSON.stringify(tree.toJSON()); expect(output).toContain('insight');expect(output).not.toContain('cultivate');
 expect(tree.root.findByProps({accessibilityLabel:'단어 보이기'})).toBeTruthy();expect(tree.root.findByProps({accessibilityLabel:'뜻 보이기'})).toBeTruthy();expect(tree.root.findByProps({accessibilityLabel:'전체 보이기'})).toBeTruthy();
});
test('MY VOCA empty state links home',async()=>{
 mockMine=true;mockSaved.ids=[];await mount();expect(JSON.stringify(tree.toJSON())).toContain('아직 저장한 단어가 없어요.');expect(JSON.stringify(tree.toJSON())).toContain('홈으로 이동');
});

test('MY VOCA combines Week and search and distinguishes empty Week',async()=>{
 mockMine=true;await mount();
 const {DayPicker}=require('./DayPicker');
 await act(async()=>tree.root.findByType(DayPicker).props.onChange('Week 2'));
 expect(JSON.stringify(tree.toJSON())).toContain('이 Week에 저장한 단어가 없어요.');
 await act(async()=>tree.root.findByProps({accessibilityLabel:'검색 열기'}).props.onPress());
 await act(async()=>tree.root.findByType(TextInput).props.onChangeText('통찰'));
 expect(JSON.stringify(tree.toJSON())).toContain('검색 결과가 없어요.');
 await act(async()=>tree.root.findByType(DayPicker).props.onChange('Week 1'));
 expect(JSON.stringify(tree.toJSON())).toContain('insight');
});

test('toggles are on when shown: default shows words and hides meanings, 전체 flips both together',async()=>{
 mockMine=true; await mount();
 const state=l=>tree.root.findByProps({accessibilityLabel:l}).props.accessibilityState.checked;
 expect(state('단어 보이기')).toBe(true); expect(state('뜻 보이기')).toBe(false); expect(state('전체 보이기')).toBe(false);
 await act(async()=>tree.root.findByProps({accessibilityLabel:'전체 보이기'}).props.onPress());
 expect(state('단어 보이기')).toBe(true); expect(state('뜻 보이기')).toBe(true); expect(state('전체 보이기')).toBe(true);
 await act(async()=>tree.root.findByProps({accessibilityLabel:'전체 보이기'}).props.onPress());
 expect(state('단어 보이기')).toBe(false); expect(state('뜻 보이기')).toBe(false);
 await act(async()=>tree.root.findByProps({accessibilityLabel:'뜻 보이기'}).props.onPress());
 expect(state('뜻 보이기')).toBe(true); expect(state('전체 보이기')).toBe(false);
});

test('the mask box has no 암기 모드 title text',async()=>{
 await mount();
 const texts=tree.root.findAll(n=>typeof n.type==='string' && typeof n.props.children==='string').map(n=>n.props.children);
 expect(texts).not.toContain('암기 모드'); expect(texts).toContain('전체');
});

test('word rows have no edit or delete buttons',async()=>{
 await mount(); const labels=tree.root.findAll(n=>typeof n.type==='string').map(n=>n.props.accessibilityLabel).filter(Boolean);
 expect(labels).not.toContain('단어 수정'); expect(labels).not.toContain('단어 삭제');
});
