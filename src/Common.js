import React, { Component, PureComponent } from 'react';
import { format_time, Time, TitleLine } from './infrastructure/widgets';
import HtmlToReact from 'html-to-react';
import './Common.css';
import {
  URL_PID_RE,
  URL_RE,
  PID_RE,
  NICKNAME_RE,
  TAG_RE,
  split_text,
} from './text_splitter';
import { save_config } from './Config';
import renderMd from './Markdown';

export { format_time, Time, TitleLine };

export const API_BASE = '/_api/v1';

// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escape_regex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function is_video(s) {
  try {
    let url = new URL(s);
    return (
      url.pathname.endsWith('.mp4') ||
      url.pathname.endsWith('.mov') ||
      (url.searchParams.get('filetype') || '').startsWith('video/')
    );
  } catch (e) {
    return false;
  }
}

function is_audio(s) {
  try {
    let url = new URL(s);
    return (
      url.pathname.endsWith('.mp3') ||
      (url.searchParams.get('filetype') || '').startsWith('audio/')
    );
  } catch (e) {
    return false;
  }
}

export function build_highlight_re(
  txt,
  split = ' ',
  option = 'g',
  isRegex = false,
) {
  if (isRegex) {
    try {
      return new RegExp('(' + txt.slice(1, -1) + ')', option);
    } catch (e) {
      return /^$/g;
    }
  } else {
    return txt
      ? new RegExp(
          `(${txt
            .split(split)
            .filter((x) => !!x)
            .map(escape_regex)
            .join('|')})`,
          option,
        )
      : /^$/g;
  }
}

export function ColoredSpan(props) {
  return (
    <span
      className="colored-span"
      style={{
        '--coloredspan-bgcolor-light': props.colors[0],
        '--coloredspan-bgcolor-dark': props.colors[1],
      }}
    >
      {props.children}
    </span>
  );
}

function normalize_url(url) {
  return /^https?:\/\//.test(url) ? url : 'http://' + url;
}

function stop_loading(e) {
  e.target.parentNode.classList.remove('loading');
}

// props: text, show_pid, color_picker, search_param
export class HighlightedMarkdown extends Component {
  render() {
    const props = this.props;
    const processDefs = new HtmlToReact.ProcessNodeDefinitions(React);
    const processInstructions = [
      {
        shouldProcessNode: (node) => /^h[123456]$/.test(node.name),
        processNode(node, children, index) {
          let currentLevel = +node.name[1];
          if (currentLevel < 3) currentLevel = 3;
          const HeadingTag = `h${currentLevel}`;
          return <HeadingTag key={index}>{children}</HeadingTag>;
        },
      },
      {
        shouldProcessNode: (node) => node.name === 'img',
        processNode(node, index) {
          return (
            <span className="ext-img__warpper loading">
              <img
                src={normalize_url(node.attribs.src)}
                alt={node.alt}
                className="ext-img"
                referrerPolicy="no-referrer"
                onError={stop_loading}
                onLoad={stop_loading}
              />
            </span>
          );
        },
      },
      {
        shouldProcessNode: (node) => node.name === 'a',
        processNode(node, children, index) {
          return (
            <a
              href={normalize_url(node.attribs.href)}
              target="_blank"
              rel="noopenner noreferrer"
              className="ext-link"
              key={index}
            >
              {children}
              <span className="icon icon-new-tab" />
            </a>
          );
        },
      },
      {
        shouldProcessNode(node) {
          return (
            node.type === 'text' &&
            (!node.parent ||
              !node.parent.attribs ||
              node.parent.attribs['encoding'] !== 'application/x-tex')
          ); // pid, nickname, search
        },
        processNode(node, children, index) {
          const originalText = node.data;
          let rules = [
            ['url_pid', URL_PID_RE],
            ['url', URL_RE],
            ['pid', PID_RE],
            ['nickname', NICKNAME_RE],
            ['tag', TAG_RE],
          ];
          if (props.search_param) {
            let search_kws = props.search_param.split(' ').filter((s) => !!s);
            rules.push([
              'search',
              new RegExp(
                `(${search_kws
                  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                  .join('|')})`,
                'g',
              ),
            ]);
          }
          const splitted = split_text(originalText, rules);

          return (
            <React.Fragment key={index}>
              {splitted.map(([rule, p], idx) => {
                return (
                  <span key={idx}>
                    {rule === 'url_pid' ? (
                      <span className="url-pid-link" title={p}>
                        /##
                      </span>
                    ) : rule === 'url' ? (
                      <>
                        <a
                          href={normalize_url(p)}
                          className="ext-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {p}
                          <span className="icon icon-new-tab" />
                        </a>
                        {is_video(p) && (
                          <video className="ext-video" src={p} controls />
                        )}
                        {is_audio(p) && (
                          <audio className="ext-audio" src={p} controls />
                        )}
                      </>
                    ) : rule === 'pid' ? (
                      <a
                        href={'#' + p}
                        onClick={(e) => {
                          e.preventDefault();
                          props.show_pid(p.substring(1));
                        }}
                      >
                        {p}
                      </a>
                    ) : rule === 'nickname' ? (
                      <ColoredSpan colors={props.color_picker.get(p)}>
                        {p}
                      </ColoredSpan>
                    ) : rule === 'search' ? (
                      <span className="search-query-highlight">{p}</span>
                    ) : rule === 'tag' ? (
                      <a href={p}>{p}</a>
                    ) : (
                      p
                    )}
                  </span>
                );
              })}
            </React.Fragment>
          );
        },
      },
      {
        shouldProcessNode: () => true,
        processNode: processDefs.processDefaultNode,
      },
    ];
    const parser = new HtmlToReact.Parser();
    let rawMd = props.text;
    const renderedMarkdown = renderMd(rawMd);
    return (
      parser.parseWithInstructions(
        renderedMarkdown,
        (node) => node.type !== 'script',
        processInstructions,
      ) || null
    );
  }
}

window.TEXTAREA_BACKUP = {};

export class SafeTextarea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
    };
    this.on_change_bound = this.on_change.bind(this);
    this.on_keydown_bound = this.on_keydown.bind(this);
    this.clear = this.clear.bind(this);
    this.area_ref = React.createRef();
    this.change_callback = props.on_change || (() => {});
    this.submit_callback = props.on_submit || (() => {});
  }

  componentDidMount() {
    this.setState(
      {
        text: window.TEXTAREA_BACKUP[this.props.id] || '',
      },
      () => {
        this.change_callback(this.state.text);
      },
    );
  }

  componentWillUnmount() {
    window.TEXTAREA_BACKUP[this.props.id] = this.state.text;
    this.change_callback(this.state.text);
  }

  on_change(event) {
    this.setState({
      text: event.target.value,
    });
    this.change_callback(event.target.value);
  }
  on_keydown(event) {
    if (event.key === 'Enter' && event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.submit_callback();
    }
  }

  clear() {
    this.setState({
      text: '',
    });
  }
  set(text) {
    this.change_callback(text);
    this.setState({
      text: text,
    });
  }
  get() {
    return this.state.text;
  }
  focus() {
    this.area_ref.current.focus();
  }

  render() {
    return (
      <textarea
        ref={this.area_ref}
        onChange={this.on_change_bound}
        value={this.state.text}
        onKeyDown={this.on_keydown_bound}
        maxLength="4096"
      />
    );
  }
}

let pwa_prompt_event = null;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('pwa: received before install prompt');
  pwa_prompt_event = e;
});

export function PromotionBar(props) {
  let is_ios = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  let is_installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;

  if (is_installed) return null;

  if (is_ios)
    // noinspection JSConstructorReturnsPrimitive
    return !navigator.standalone ? (
      <div className="box promotion-bar">
        <span className="icon icon-about" />
        &nbsp; 用 Safari 把树洞 <b>添加到主屏幕</b> 更好用
      </div>
    ) : null;
  // noinspection JSConstructorReturnsPrimitive
  else
    return pwa_prompt_event ? (
      <div className="box promotion-bar">
        <span className="icon icon-about" />
        &nbsp; 把网页版树洞{' '}
        <b>
          <a
            onClick={() => {
              if (pwa_prompt_event) pwa_prompt_event.prompt();
            }}
          >
            安装到桌面
          </a>
        </b>{' '}
        更好用
      </div>
    ) : null;
}

export class ClickHandler extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      moved: true,
      init_y: 0,
      init_x: 0,
    };
    this.on_begin_bound = this.on_begin.bind(this);
    this.on_move_bound = this.on_move.bind(this);
    this.on_end_bound = this.on_end.bind(this);

    this.MOVE_THRESHOLD = 3;
    this.last_fire = 0;
  }

  on_begin(e) {
    //console.log('click',(e.touches?e.touches[0]:e).screenY,(e.touches?e.touches[0]:e).screenX);
    this.setState({
      moved: false,
      init_y: (e.touches ? e.touches[0] : e).screenY,
      init_x: (e.touches ? e.touches[0] : e).screenX,
    });
  }
  on_move(e) {
    if (!this.state.moved) {
      let mvmt =
        Math.abs((e.touches ? e.touches[0] : e).screenY - this.state.init_y) +
        Math.abs((e.touches ? e.touches[0] : e).screenX - this.state.init_x);
      //console.log('move',mvmt);
      if (mvmt > this.MOVE_THRESHOLD)
        this.setState({
          moved: true,
        });
    }
  }
  on_end(event) {
    //console.log('end');
    if (!this.state.moved) this.do_callback(event);
    this.setState({
      moved: true,
    });
  }

  do_callback(event) {
    if (this.last_fire + 100 > +new Date()) return;
    this.last_fire = +new Date();
    this.props.callback(event);
  }

  render() {
    return (
      <div
        onTouchStart={this.on_begin_bound}
        onMouseDown={this.on_begin_bound}
        onTouchMove={this.on_move_bound}
        onMouseMove={this.on_move_bound}
        onClick={this.on_end_bound}
      >
        {this.props.children}
      </div>
    );
  }
}

export function test_ipfs(hash) {
  let key = 'testing_' + hash;
  window[key] = { curr: 0 };
  window.config.ipfs_gateway_list.forEach((url) => {
    fetch(url.replaceAll('<hash>', hash), { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          console.log(url, 'success!');
          if (window[key]) {
            window[key].curr += 1;
            window[key][url] = window[key].curr;
            let list = window.config.ipfs_gateway_list;
            list.sort(
              (x, y) => (window[key][x] || 9999) - (window[key][y] || 999),
            );
            window.config.ipfs_gateway_list = list;
            save_config(false);
          }
        }
      })
      .catch((e) => {
        console.log(url, 'fail!');
      });
  });
}
