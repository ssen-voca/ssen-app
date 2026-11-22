const React = require('react');
const { act, create } = require('react-test-renderer');
const { DEFAULT_PREFS: mockPrefs } = require('../../data/storage');

const mockWords = [
  { id: 'a', word: 'insight', meanings: ['통찰'], synonyms: [''], chapter: 'Week 1', details: { example: '', exampleKo: '', exampleMeaning: '' } },
  { id: 'b', word: 'cultivate', meanings: ['기르다'], synonyms: [''], chapter: 'Week 2', details: { example: '', exampleKo: '', exampleMeaning: '' } },
];
let mockParams;
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native-gesture-handler', () => ({
  Gesture: { Pan: () => {
    const gesture = {};
    for (const method of ['runOnJS', 'activeOffsetX', 'failOffsetY', 'onEnd']) gesture[method] = () => gesture;
    return gesture;
  } },
  GestureDetector: ({ children }) => children,
}));
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('../../data/WordsContext', () => ({ useWords: () => ({
  ready: true, words: mockWords, prefs: mockPrefs, shown: {}, setPref: jest.fn(), setShown: jest.fn(),
}) }));
jest.mock('../../bookmarks/BookmarksContext', () => ({ useBookmarks: () => ({
  words: mockWords, ids: ['a', 'b'], pending: new Set(), loading: false,
}) }));
jest.mock('../Toast', () => ({ useToast: () => jest.fn() }));

const { router } = require('expo-router');
const StudyScreen = require('../../app/study').default;
const WordbookScreen = require('../wordbook/WordbookScreen').default;
const { WordRow } = require('../wordbook/WordRow');
const { DayPicker } = require('../wordbook/DayPicker');
const { MainScroll } = require('../MainScroll');
const { BookViewProvider } = require('../../data/BookViewContext');
let tree;
beforeEach(() => { jest.clearAllMocks(); mockParams = { word: 'a', source: 'myvoca' }; });
afterEach(async () => { await act(async () => tree?.unmount()); });

test.each([
  ['myvoca', true, '/my-voca'],
  ['myvoca', false, '/my-voca'],
  ['wordbook', true, '/'],
  [undefined, false, '/'],
])('study returns to its source (%s, history: %s)', async (source, hasHistory, destination) => {
  mockParams.source = source;
  router.canGoBack.mockReturnValue(hasHistory);
  await act(async () => { tree = create(React.createElement(StudyScreen)); });
  await act(async () => tree.root.findByProps({ accessibilityLabel: '단어장으로 돌아가기' }).props.onPress());
  expect(router.replace).toHaveBeenCalledWith(destination);
  expect(router.back).not.toHaveBeenCalled();
});

test('MY VOCA keeps its Week and scroll position after opening study and returning', async () => {
  const render = study => React.createElement(BookViewProvider, null,
    study ? React.createElement(StudyScreen) : React.createElement(WordbookScreen, { mine: true }));
  await act(async () => { tree = create(render(false)); });
  await act(async () => tree.root.findByType(DayPicker).props.onChange('Week 2'));
  await act(async () => tree.root.findByType(MainScroll).props.onScrollY(650));
  await act(async () => tree.root.findByType(WordRow).props.onOpen());
  expect(router.navigate).toHaveBeenCalledWith({ pathname: '/study', params: { word: 'b', source: 'myvoca' } });
  mockParams = router.navigate.mock.calls[0][0].params;
  await act(async () => tree.update(render(true)));
  await act(async () => tree.root.findByProps({ accessibilityLabel: '단어장으로 돌아가기' }).props.onPress());
  expect(router.replace).toHaveBeenCalledWith('/my-voca');
  await act(async () => tree.update(render(false)));
  expect(tree.root.findByType(DayPicker).props.value).toBe('Week 2');
  expect(tree.root.findByType(MainScroll).props.initialY).toBe(650);
  expect(tree.root.findByType(WordRow).props.word.id).toBe('b');
});
