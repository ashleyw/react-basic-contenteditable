import React from 'react';
import { mount, shallow } from 'enzyme';
import ContentEditable from '../react-sane-contenteditable';

// Helpers
const focusThenBlur = (wrapper, element = 'div') => wrapper.find(element).simulate('focus').simulate('blur');

describe('Default behaviour', () => {
  it('renders a div by default', () => {
    const wrapper = shallow(<ContentEditable />);
    expect(wrapper.find('div')).toHaveLength(1);
  });

  it('sets a key', () => {
    const wrapper = shallow(<ContentEditable />);
    expect(wrapper.key()).toEqual(Date());
  });

  it('sets contenteditable', () => {
    const wrapper = shallow(<ContentEditable />);
    expect(wrapper.prop('contentEditable')).toBe(true);
  });

  it('sets a default style', () => {
    const wrapper = shallow(<ContentEditable />);
    expect(wrapper.prop('style')).toHaveProperty('whiteSpace', 'pre-wrap');
  });

  it('onInput sets state.value', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" onChange={mockHandler} />);
    const nextInput = 'foo bar';

    wrapper.instance()._element.innerText = nextInput;
    wrapper.find('div').simulate('input');
    expect(wrapper.state('value')).toEqual(nextInput);
  });
});

describe('Handles props', () => {
  it('renders a tagName', () => {
    const tag = 'p';
    const wrapper = shallow(<ContentEditable tagName={tag} />);
    expect(wrapper.find(tag)).toHaveLength(1);
  });

  it('spreads in the style prop', () => {
    const wrapper = shallow(<ContentEditable style={{ color: 'blue' }} />);
    expect(wrapper.prop('style')).toMatchObject({
      whiteSpace: 'pre-wrap',
      color: 'blue',
    });
  });

  it('renders the props.content', () => {
    const content = 'foo';
    const wrapper = shallow(<ContentEditable content={content} />);
    expect(wrapper.render().text()).toEqual(content);
  });

  it('toggles "contentEditable" when props.editable={false}', () => {
    const wrapper = shallow(<ContentEditable editable={false} />);
    expect(wrapper.prop('contentEditable')).toBe(false);
  });

  // @todo: I think Enzyme converts props.ref to props.innerRef when props.styled={false}
  it('props.styled={true} sets innerRef handler', () => {
    const wrapper = mount(<ContentEditable />);
    expect(wrapper.prop('innerRef')).toEqual(expect.any(Function));
  });

  it('shouldComponentUpdate returns false when props are the same', () => {
    const wrapper = mount(<ContentEditable multiLine />);
    const shouldUpdate = wrapper.instance().shouldComponentUpdate(wrapper.props());
    expect(shouldUpdate).toBe(false);
  });

  it('shouldComponentUpdate returns true when props are different', () => {
    const wrapper = mount(<ContentEditable multiLine />);
    const shouldUpdate = wrapper.instance().shouldComponentUpdate({ ...wrapper.props(), sanitise: false });
    expect(shouldUpdate).toBe(true);
  });

  xdescribe('Failing tests to fix in component', () => {
    it('renders the props.content respecting maxLength={5}', () => {
      const content = 'foo bar';
      const wrapper = shallow(<ContentEditable content={content} maxLength={5} />);
      expect(wrapper.render().text()).toEqual('foo ba');
    });
  });
});

describe('Sanitisation', () => {
  it('does not sanitise when props.sanitise={false}', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" onChange={mockHandler} sanitise={false} />);
    const nextInput = 'foo&nbsp;bar';

    wrapper.instance()._element.innerText = nextInput;
    focusThenBlur(wrapper);
    expect(wrapper.state('value')).toEqual(nextInput);
  });

  it('removes &nbsp;', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" onChange={mockHandler} />);

    wrapper.instance()._element.innerText = 'foo&nbsp;bar';
    focusThenBlur(wrapper);
    expect(wrapper.state('value')).toEqual('foo bar');
  });

  it('trims whitespace', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content=" foo " onChange={mockHandler} />);

    wrapper.instance()._element.innerText = 'foo  bar';
    focusThenBlur(wrapper);
    expect(wrapper.state('value')).toEqual('foo bar');
  });

  it('removes multiple spaces', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" onChange={mockHandler} />);

    wrapper.instance()._element.innerText = 'foo  bar';
    focusThenBlur(wrapper);
    expect(wrapper.state('value')).toEqual('foo bar');
  });

  it('replaces line terminator characters with a space', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" onChange={mockHandler} />);

    wrapper.instance()._element.innerText = 'foo\nbar';
    focusThenBlur(wrapper);
    expect(wrapper.state('value')).toEqual('foo bar');
  });

  it('value trimmed when maxLength exceeded', () => {
    const maxLength = 5;
    const content = 'foo';
    const wrapper = mount(<ContentEditable content={content} maxLength={maxLength} />);
    const dom = wrapper.instance()._element;

    dom.innerText = `${content} bar`;
    focusThenBlur(wrapper);
    expect(wrapper.state('value')).toHaveLength(maxLength);
  });

  describe('with props.multiLine', () => {
    it('limits consecutive line terminator characters to a maximum of 2', () => {
      const mockHandler = jest.fn();
      const wrapper = mount(<ContentEditable multiLine content="foo" onChange={mockHandler} />);

      wrapper.instance()._element.innerText = 'foo\n\n\nbar';
      focusThenBlur(wrapper);
      expect(wrapper.state('value')).toEqual('foo\n\nbar');
    });

    it('removes multiple spaces maintaining newlines', () => {
      const mockHandler = jest.fn();
      const wrapper = mount(<ContentEditable multiLine content="foo" onChange={mockHandler} />);

      wrapper.instance()._element.innerText = 'foo  bar\f\f \r\rbaz\nqux\t\t quux\v\v quuz';
      focusThenBlur(wrapper);
      expect(wrapper.state('value')).toEqual('foo bar baz\nqux quux quuz');
    });

    // @todo: ASCII spaces and feeds should probably be replaced regardless of multiLine
    it('replaces ASCII spaces and feeds', () => {
      const mockHandler = jest.fn();
      const wrapper = mount(<ContentEditable multiLine content="foo" onChange={mockHandler} />);

      wrapper.instance()._element.innerText = `foo\f\f bar\r\r baz\t\t qux\v\v quux`;
      focusThenBlur(wrapper);
      expect(wrapper.state('value')).toEqual('foo bar baz qux quux');
    });

    // @todo: Unicode spaces should probably be replaced regardless of multiLine
    it('replaces unicode spaces', () => {
      const mockHandler = jest.fn();
      const wrapper = mount(<ContentEditable multiLine content="foo" onChange={mockHandler} />);
      const unicodeChars = [
        '\u00a0',
        '\u2000',
        '\u2001',
        '\u2002',
        '\u2003',
        '\u2004',
        '\u2005',
        '\u2006',
        '\u2007',
        '\u2008',
        '\u2009',
        '\u200a',
        '\u200b',
        '\u2028',
        '\u2029',
        '\u202e',
        '\u202f',
        '\u3000',
      ].join('');

      wrapper.instance()._element.innerText = `foo ${unicodeChars}bar`;
      focusThenBlur(wrapper);
      expect(wrapper.state('value')).toEqual('foo bar');
    });

    xdescribe('Failing tests to fix in component', () => {
      // @todo @fixme: Component should probably be fixed so that this test passes,  given that it uses dangerouslySetInnerHTML
      // the naming of props.sanitise suggests that it will protect against this.
      it('protects against XSS input', () => {
        const mockHandler = jest.fn();
        const content = 'foo';
        const wrapper = mount(<ContentEditable content={content} onChange={mockHandler} />);

        wrapper.instance()._element.innerText = 'foo <script>console.log(\'XSS vulnerability\')</script>';
        focusThenBlur(wrapper);
        expect(wrapper.state('value')).toEqual(content);
      });
    });
  });
});

describe('Calls handlers', () => {
  it('props.innerRef called', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable innerRef={mockHandler} />);
    wrapper.render();
    expect(mockHandler).toHaveBeenCalled();
  });

  it('props.onBlur called', () => {
    const mockHandler = jest.fn();
    const content = 'foo';
    const wrapper = mount(<ContentEditable content={content} onBlur={mockHandler} />);

    wrapper.instance()._element.innerText = content;
    focusThenBlur(wrapper);
    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'blur',
    }));
  });

  it('props.onChange called', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" onChange={mockHandler} />);
    const dom = wrapper.instance()._element;
    const nextInput = 'foo bar';

    dom.innerText = nextInput;
    wrapper.find('div').simulate('input');
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'input',
        nativeEvent: expect.any(Object),
      }),
      nextInput,
    );
  });

  it('props.onKeyDown called', () => {
    const mockHandler = jest.fn();
    const content = 'foo';
    const wrapper = mount(<ContentEditable content={content} onKeyDown={mockHandler} />);
    const dom = wrapper.instance()._element;

    dom.innerText = content;
    wrapper.find('div').simulate('keydown', { key: 'Enter', keyCode: 13, which: 13 });
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'keydown',
        nativeEvent: expect.any(Object),
      }),
      content,
    );
  });

  it('keydown event.preventDefault called when maxLength exceeded', () => {
    const mockPreventDefault = jest.fn();
    const content = 'foo b';
    const wrapper = mount(<ContentEditable content={content} maxLength={content.length} />);
    const dom = wrapper.instance()._element;

    dom.innerText = content;
    wrapper.find('div').simulate('keydown', {
      metaKey: false,
      preventDefault: mockPreventDefault,
    });
    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it('props.onChange not called when maxLength exceeded', () => {
    const mockHandler = jest.fn();
    const wrapper = mount(<ContentEditable content="foo" maxLength={3} onChange={mockHandler} />);

    wrapper.instance()._element.innerText = 'foo bar';
    wrapper.find('div').simulate('input');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('props.onPaste called', () => {
    const mockOnPaste = jest.fn().mockName('onPaste');
    const mockExecCommand = jest.fn().mockName('execCommand');
    const mockGetClipboardData = jest.fn().mockName('getClipboardData');
    const wrapper = mount(<ContentEditable content="foo" onPaste={mockOnPaste} />);
    const nextInput = 'foo bar';

    document.execCommand = mockExecCommand;
    mockGetClipboardData.mockReturnValue(nextInput);
    wrapper.instance()._element.innerText = nextInput;
    wrapper.find('div').simulate('paste', { clipboardData: { getData: mockGetClipboardData } });
    expect(mockOnPaste).toHaveBeenCalledWith(expect.objectContaining({
      type: 'paste',
      nativeEvent: expect.any(Object),
    }));
  });
});
