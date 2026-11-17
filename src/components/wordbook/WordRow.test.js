const React = require('react');
const { act, create } = require('react-test-renderer');
const { Pressable } = require('react-native');
const { PeekField, WordRow } = require('./WordRow');
const { Masked } = require('../Masked');
const { AppText } = require('../AppText');
let tree;
afterEach(async () => { await act(async () => tree?.unmount()); });
test('holding reveals only until release and suppresses navigation; short taps still open afterwards', async () => {
  const open = jest.fn();
  await act(async () => { tree = create(<PeekField masked label="test" onOpen={open}><AppText>secret</AppText></PeekField>); });
  const press = () => tree.root.findByProps({ accessibilityLabel: 'test' }).props;
  for (let i = 0; i < 2; i++) {
    await act(async () => { press().onPressIn(); press().onLongPress(); });
    expect(tree.root.findByType(Masked).props.masked).toBe(false);
    await act(async () => { press().onPressOut(); press().onPress(); });
    expect(tree.root.findByType(Masked).props.masked).toBe(true);
    expect(open).not.toHaveBeenCalled();
  }
  await act(async () => { press().onPressIn(); press().onPressOut(); press().onPress(); });
  expect(open).toHaveBeenCalledTimes(1);
});
test('Space reveals until keyup and blur restores masking', async () => {
  await act(async () => { tree = create(<PeekField masked label="test" onOpen={jest.fn()}><AppText>secret</AppText></PeekField>); });
  const press = tree.root.findByProps({ accessibilityLabel: 'test' });
  await act(async () => press.props.onKeyDown({ key: ' ', preventDefault: jest.fn() }));
  expect(tree.root.findByType(Masked).props.masked).toBe(false);
  await act(async () => press.props.onKeyUp({ key: ' ', preventDefault: jest.fn() }));
  expect(tree.root.findByType(Masked).props.masked).toBe(true);
});
test('expansion and bookmarks do not open learning or change global masking', async () => {
  const open = jest.fn(), bookmark = jest.fn();
  await act(async () => { tree = create(<WordRow word={{ id:'a',word:'long',meanings:['긴 뜻'],chapter:'Day 1' }} prefs={{ maskWord:true,maskMeaning:true }} shown={{}} onOpen={open} onBookmark={bookmark} />); });
  await act(async () => tree.root.findByProps({ testID:'meaning-text' }).props.onTextLayout({ nativeEvent:{ lines:[1,2,3,4] } }));
  await act(async () => tree.root.findByProps({ accessibilityLabel:'뜻 전체 보기' }).props.onPress());
  expect(tree.root.findByProps({ testID:'meaning-text' }).props.numberOfLines).toBeUndefined();
  expect(tree.root.findAllByType(Masked).every(n => n.props.masked)).toBe(true);
  await act(async () => tree.root.findByProps({ accessibilityLabel:'MY VOCA에 저장' }).props.onPress());
  expect(bookmark).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
});
