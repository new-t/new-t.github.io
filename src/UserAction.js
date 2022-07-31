import React, { Component } from 'react';
import {
  API_BASE,
  API_BASE_2,
  STORAGE_BASE,
  SafeTextarea,
  PromotionBar,
  HighlightedMarkdown,
} from './Common';
import { MessageViewer } from './Message';
import { LoginPopup } from './infrastructure/widgets';
import { ColorPicker } from './color_picker';
import { ConfigUI } from './Config';
import copy from 'copy-to-clipboard';
import { cache } from './cache';
import { get_json } from './flows_api';
import { save_attentions } from './Attention';

import './UserAction.css';

const REPOSITORY = 'https://git.thu.monster/newthuhole/';
const EMAIL = 'hole_thu@riseup.net';

export const TokenCtx = React.createContext({
  value: null,
  set_value: () => {},
});

export function InfoSidebar(props) {
  return (
    <div>
      <PromotionBar />
      <LoginForm show_sidebar={props.show_sidebar} />
      <div className="box list-menu">
        <a href="/about.html" target="_blank">
          <span className="icon icon-about" />
          <label>关于</label>
        </a>
        &nbsp;&nbsp;
        <a
          onClick={() => {
            props.show_sidebar('设置', <ConfigUI />);
          }}
        >
          <span className="icon icon-settings" />
          <label>本地设置</label>
        </a>
        &nbsp;&nbsp;
        <a href="/policy.html" target="_blank">
          <span className="icon icon-textfile" />
          <label>树洞规范（试行）</label>
        </a>
        <p>
          <em>强烈建议开始使用前先看一遍所有设置选项</em>
        </p>
      </div>
      <div className="box help-desc-box">
        <p>
          <a
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker
                  .getRegistrations()
                  .then((registrations) => {
                    for (let registration of registrations) {
                      console.log('unregister', registration);
                      registration.unregister();
                    }
                  });
              }
              cache().clear();
              setTimeout(() => {
                window.location.reload(true);
              }, 200);
            }}
          >
            强制检查更新
          </a>
          （当前版本：【{process.env.REACT_APP_BUILD_INFO || '---'}{' '}
          {process.env.NODE_ENV}】 会自动在后台检查更新并在下次访问时更新）
        </p>
      </div>
      <div className="box help-desc-box">
        <p>意见反馈请加tag #意见反馈 或到github后端的issue区。</p>
        <p>
          新T树洞强烈期待有其他更多树洞的出现，一起分布式互联，构建清华树洞族。详情见
          关于 中的描述。
        </p>
        <p>
          联系我们：<a href={'mailto:' + EMAIL}>{EMAIL}</a> 。
        </p>
      </div>
      <div className="box help-desc-box">
        <p>
          新T树洞 网页版 by @hole_thu，基于
          <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank">
            AGPLv3
          </a>
          协议在{' '}
          <a href={REPOSITORY} target="_blank">
            Gitea
          </a>{' '}
          开源。
        </p>
        <p>
          新T树洞 网页版基于
          <a
            href="https://github.com/pkuhelper-web/webhole"
            target="_blank"
            rel="noopener"
          >
            P大树洞网页版 by @xmcp
          </a>
          、
          <a
            href="https://github.com/thuhole/webhole"
            target="_blank"
            rel="noopener"
          >
            T大树洞网页版 by @thuhole
          </a>
          、{' '}
          <a href="https://reactjs.org/" target="_blank" rel="noopener">
            React
          </a>
          、
          <a href="https://icomoon.io/#icons" target="_blank" rel="noopener">
            IcoMoon
          </a>
          等开源项目。
        </p>
        <hr />
        <p>
          新T树洞 后端 by @hole_thu，基于
          <a href="http://www.wtfpl.net/about/" target="_blank">
            WTFPLv2
          </a>
          协议在{' '}
          <a href={REPOSITORY} target="_blank">
            Gitea
          </a>{' '}
          开源。
        </p>
      </div>
    </div>
  );
}

export class LoginForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      custom_title: window.TITLE || '',
      auto_block_rank: window.AUTO_BLCOK || 2,
    };
  }

  update_title(title, token) {
    if (title === window.TITLE) {
      alert('无变化');
      return;
    }
    let data = new FormData();
    data.append('title', title);
    fetch(API_BASE + '/title', {
      method: 'POST',
      headers: { 'User-Token': token },
      body: data,
    })
      .then(get_json)
      .then((j) => {
        if (j.code !== 0) {
          throw new Error(j.msg);
        }
        window.TITLE = title;
        alert('专属头衔设置成功');
      })
      .catch((err) => alert('设置头衔出错了:\n' + err));
  }

  update_auto_block(rank, token) {
    let data = new FormData();
    data.append('rank', rank);
    fetch(API_BASE + '/auto_block', {
      method: 'POST',
      headers: { 'User-Token': token },
      body: data,
    })
      .then(get_json)
      .then((j) => {
        if (j.code !== 0) {
          throw new Error(j.msg);
        }
        window.AUTO_BLCOK = rank;
        alert('设置自动拉黑阈值成功');
      })
      .catch((err) => alert('设置自动拉黑出错了:\n' + err));
  }

  copy_token(token) {
    if (copy(token)) alert('复制成功！\n请一定不要泄露哦');
  }

  render() {
    return (
      <TokenCtx.Consumer>
        {(token) => (
          <div>
            {/*{!!token.value &&*/}
            {/*    <LifeInfoBox token={token.value} set_token={token.set_value} />*/}
            {/*}*/}
            <div className="login-form box">
              {token.value ? (
                <div>
                  <p>
                    <b>您已登录。</b>
                    <button
                      type="button"
                      onClick={() => {
                        token.set_value(null);
                      }}
                    >
                      <span className="icon icon-logout" /> 注销
                    </button>
                    <br />
                  </p>
                  <p>
                    <a
                      onClick={() => {
                        this.props.show_sidebar(
                          '系统日志',
                          <MessageViewer token={token.value} />,
                        );
                      }}
                    >
                      查看系统日志
                    </a>
                    <br />
                    举报记录、管理日志等都是公开的。
                  </p>
                  <p>
                    <a onClick={this.copy_token.bind(this, token.value)}>
                      复制 User Token
                    </a>
                    <br />
                    User
                    Token仅用于开发bot，切勿告知他人。若怀疑被盗号请刷新Token(刷新功能即将上线)。
                  </p>
                  <p>
                    专属头衔：
                    <input
                      value={this.state.custom_title}
                      onChange={(e) => {
                        this.setState({ custom_title: e.target.value });
                      }}
                      maxLength={10}
                    />
                    <button
                      className="update-title-btn"
                      type="button"
                      onClick={(e) => {
                        this.update_title(this.state.custom_title, token.value);
                      }}
                      disabled={!this.state.custom_title}
                    >
                      提交
                    </button>
                    <br />
                    设置专属头衔后，可在发言时选择使用。重置后需重新设置。临时用户如需保持头衔请使用相同后缀。
                  </p>
                  <p>
                    自动拉黑阈值:
                    <span style={{ display: 'inline-block', width: '3rem' }}>
                      <b>{this.state.auto_block_rank * 5}</b>
                    </span>
                    <input
                      value={this.state.auto_block_rank}
                      type="range"
                      min="1"
                      max="10"
                      list="autoBlock"
                      onChange={(e) => {
                        this.setState({ auto_block_rank: e.target.value });
                      }}
                    />
                    <button
                      className="update-title-btn"
                      type="button"
                      onClick={(e) => {
                        this.update_auto_block(
                          this.state.auto_block_rank,
                          token.value,
                        );
                      }}
                    >
                      提交
                    </button>
                    <datalist id="autoBlock">
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                    </datalist>
                    <br />
                    自动不展示被拉黑次数较多用户发布的内容，包括自己。对每个洞及其评论的可见性会有1小时缓存，频繁修改无效。
                  </p>
                </div>
              ) : (
                <LoginPopup token_callback={token.set_value}>
                  {(do_popup) => (
                    <div>
                      <p>
                        <button type="button" onClick={do_popup}>
                          <span className="icon icon-login" />
                          &nbsp;登录
                        </button>
                      </p>
                      <p>
                        <small>
                          新T树洞
                          面向T大学生，通过已验证身份的第三方服务授权登陆。
                        </small>
                      </p>
                    </div>
                  )}
                </LoginPopup>
              )}
            </div>
          </div>
        )}
      </TokenCtx.Consumer>
    );
  }
}

export class ReplyForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      loading_status: 'done',
      preview: false,
      use_title: false,
    };
    this.on_change_bound = this.on_change.bind(this);
    this.on_use_title_change_bound = this.on_use_title_change.bind(this);
    this.area_ref = this.props.area_ref || React.createRef();
    this.global_keypress_handler_bound = this.global_keypress_handler.bind(
      this,
    );
    this.color_picker = new ColorPicker();
  }

  global_keypress_handler(e) {
    if (
      e.code === 'Enter' &&
      !e.ctrlKey &&
      !e.altKey &&
      ['input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) === -1
    ) {
      if (this.area_ref.current) {
        e.preventDefault();
        this.area_ref.current.focus();
      }
    }
  }
  componentDidMount() {
    document.addEventListener('keypress', this.global_keypress_handler_bound);
  }
  componentWillUnmount() {
    document.removeEventListener(
      'keypress',
      this.global_keypress_handler_bound,
    );
  }

  on_change(value) {
    this.setState({
      text: value,
    });
  }

  on_use_title_change(event) {
    this.setState({
      use_title: event.target.checked,
    });
  }

  on_submit(event) {
    if (event) event.preventDefault();
    if (this.state.loading_status === 'loading') return;
    if (!this.state.text) return;
    this.setState({
      loading_status: 'loading',
    });

    const { pid } = this.props;
    const { text, use_title } = this.state;
    let data = new URLSearchParams({
      text: text,
      use_title: use_title ? '1' : '',
    });
    fetch(`${API_BASE_2}/post/${pid}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': this.props.token,
      },
      body: data,
    })
      .then(get_json)
      .then((json) => {
        if (json.code !== 0) {
          throw new Error(json.msg);
        }

        let saved_attentions = window.saved_attentions;
        if (!saved_attentions.includes(pid)) {
          saved_attentions.unshift(pid);
          window.saved_attentions = saved_attentions;
          save_attentions();
        }

        this.setState({
          loading_status: 'done',
          text: '',
          preview: false,
        });
        this.area_ref.current.clear();
        this.props.on_complete();
      })
      .catch((e) => {
        console.error(e);
        alert('回复失败\n' + e);
        this.setState({
          loading_status: 'done',
        });
      });
  }

  toggle_preview() {
    this.setState({
      preview: !this.state.preview,
    });
  }

  render() {
    return (
      <form
        onSubmit={this.on_submit.bind(this)}
        className={'reply-form box' + (this.state.text ? ' reply-sticky' : '')}
      >
        {this.state.preview ? (
          <div className="reply-preview">
            <HighlightedMarkdown
              text={this.state.text}
              color_picker={this.color_picker}
              show_pid={() => {}}
            />
          </div>
        ) : (
          <SafeTextarea
            ref={this.area_ref}
            id={this.props.pid}
            on_change={this.on_change_bound}
            on_submit={this.on_submit.bind(this)}
          />
        )}
        <div className="reply-form-opt-box">
          <div className="reply-form-buttons">
            <button
              type="button"
              onClick={() => {
                this.toggle_preview();
              }}
            >
              {this.state.preview ? (
                <span className="icon icon-eye-blocked" />
              ) : (
                <span className="icon icon-eye" />
              )}
            </button>
            {this.state.loading_status === 'loading' ? (
              <button disabled="disabled">
                <span className="icon icon-loading" />
              </button>
            ) : (
              <button type="submit">
                <span className="icon icon-send" />
              </button>
            )}
          </div>
          {window.TITLE && (
            <label>
              <input
                type="checkbox"
                onChange={this.on_use_title_change_bound}
                checked={this.state.use_title}
              />{' '}
              使用头衔
            </label>
          )}
        </div>
      </form>
    );
  }
}

export class PostForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      upload_progress_text: '',
      is_loading: false,
      file_name: '',
      file_type: '',
      cw: window.CW_BACKUP || '',
      allow_search: window.AS_BACKUP || false,
      loading_status: 'done',
      preview: false,
      has_poll: !!window.POLL_BACKUP,
      poll_options: JSON.parse(window.POLL_BACKUP || '[""]'),
      use_title: false,
    };
    this.area_ref = React.createRef();
    this.on_change_bound = this.on_change.bind(this);
    this.on_allow_search_change_bound = this.on_allow_search_change.bind(this);
    this.on_use_title_change_bound = this.on_use_title_change.bind(this);
    this.on_cw_change_bound = this.on_cw_change.bind(this);
    this.on_poll_option_change_bound = this.on_poll_option_change.bind(this);
    this.color_picker = new ColorPicker();
  }

  componentDidMount() {
    if (this.area_ref.current) this.area_ref.current.focus();
  }

  componentWillUnmount() {
    const { cw, allow_search, has_poll, poll_options } = this.state;
    window.CW_BACKUP = cw;
    window.AS_BACKUP = allow_search;
    localStorage['DEFAULT_ALLOW_SEARCH'] = allow_search ? '1' : '';
    window.POLL_BACKUP = has_poll ? JSON.stringify(poll_options) : null;
  }

  on_allow_search_change(event) {
    this.setState({
      allow_search: event.target.checked,
    });
  }

  on_use_title_change(event) {
    this.setState({
      use_title: event.target.checked,
    });
  }

  on_cw_change(event) {
    this.setState({
      cw: event.target.value,
    });
  }

  on_change(value) {
    this.setState({
      text: value,
    });
  }

  do_post() {
    const {
      cw,
      text,
      allow_search,
      use_title,
      has_poll,
      poll_options,
    } = this.state;
    let data = new URLSearchParams({
      cw: cw,
      text: text,
      allow_search: allow_search ? '1' : '',
      use_title: use_title ? '1' : '',
      type: 'text',
    });
    if (has_poll) {
      poll_options.forEach((opt) => {
        if (opt) data.append('poll_options', opt);
      });
    }

    fetch(API_BASE + '/dopost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Token': this.props.token,
      },
      body: data,
    })
      .then(get_json)
      .then((json) => {
        if (json.code !== 0) {
          throw new Error(json.msg);
        }

        this.setState({
          loading_status: 'done',
          text: '',
          preview: false,
        });
        this.area_ref.current.clear();
        this.props.on_complete();
        window.CW_BACKUP = '';
        window.POLL_BACKUP = null;
      })
      .catch((e) => {
        console.error(e);
        alert('发表失败\n' + e);
        this.setState({
          loading_status: 'done',
        });
      });
  }

  on_submit(event) {
    if (event) event.preventDefault();
    if (this.state.loading_status === 'loading') return;
    if (!this.state.text) return;
    {
      this.setState({
        loading_status: 'loading',
      });
      this.do_post();
    }
  }

  toggle_preview() {
    this.setState({
      preview: !this.state.preview,
    });
  }

  on_poll_option_change(event, idx) {
    let poll_options = this.state.poll_options;
    let text = event.target.value;
    poll_options[idx] = text;
    if (!text && poll_options.length > 1) {
      poll_options.splice(idx, 1);
    }
    if (poll_options[poll_options.length - 1] && poll_options.length < 8) {
      poll_options.push('');
    }
    this.setState({ poll_options: poll_options });
  }

  on_file_change(event) {
    console.log(event);
    let f = event.target.files[0];
    if (f) {
      console.log(f);
      this.setState({ is_loading: true, file_name: f.name, file_type: f.type });
      // let data = new FormData();
      // data.append('file', f);

      var xh = new XMLHttpRequest();
      xh.upload.addEventListener(
        'progress',
        this.upload_progress.bind(this),
        false,
      );
      xh.addEventListener('load', this.upload_complete.bind(this), false);
      xh.addEventListener('error', this.upload_error.bind(this), false);
      xh.addEventListener('abort', this.upload_abort.bind(this), false);
      xh.open('POST', API_BASE_2 + '/upload');
      xh.setRequestHeader('User-Token', this.props.token);
      xh.send(f);
    }
  }

  update_text_after_upload(data) {
    const { file_name, file_type } = this.state;
    let url = `${STORAGE_BASE}/${data.path}?filename=${encodeURIComponent(
      file_name,
    )}&filetype=${encodeURIComponent(file_type)}`;
    let new_text =
      this.state.text +
      '\n' +
      (file_type.startsWith('image/') ? `![](${url})` : url);
    this.setState({ text: new_text });
    this.area_ref.current.set(new_text);
  }

  upload_progress(event) {
    console.log(event.loaded, event.total);
    this.setState({
      upload_progress_text: `${((event.loaded * 100) / event.total).toFixed(
        2,
      )}%`,
    });
  }

  upload_complete(event) {
    try {
      let j = JSON.parse(event.target.responseText);
      if (j.code != 0) {
        alert(j.msg);
        throw new Error();
      }
      this.update_text_after_upload(j.data);
      this.setState({ is_loading: false });
    } catch (e) {
      console.log(e);
      this.upload_error(event);
    }
  }

  upload_error(event) {
    alert(
      '上传失败\n' +
        (event.target.responseText.length < 100
          ? event.target.responseText
          : event.target.status),
    );
    this.setState({ is_loading: false });
  }

  upload_abort(event) {
    alert('上传已中断');
    this.setState({ is_loading: false });
  }

  render() {
    const {
      has_poll,
      poll_options,
      preview,
      loading_status,
      upload_progress_text,
      is_loading,
      file_name,
    } = this.state;
    return (
      <form onSubmit={this.on_submit.bind(this)} className="post-form box">
        <div className="post-form-bar">
          <div>
            {preview ? (
              <button
                type="button"
                onClick={() => {
                  this.toggle_preview();
                }}
              >
                <span className="icon icon-eye-blocked" />
                &nbsp;编辑
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  this.toggle_preview();
                }}
              >
                <span className="icon icon-eye" />
                &nbsp;预览
              </button>
            )}

            {loading_status !== 'done' ? (
              <button disabled="disabled">
                <span className="icon icon-loading" />
                &nbsp;上传
              </button>
            ) : (
              <button type="submit">
                <span className="icon icon-send" />
                &nbsp;发表
              </button>
            )}
          </div>
          <div className="checkbox-bar">
            <label>
              <input
                type="checkbox"
                onChange={this.on_allow_search_change_bound}
                checked={this.state.allow_search}
              />{' '}
              允许搜索
            </label>
            {window.TITLE && (
              <label>
                <input
                  type="checkbox"
                  onChange={this.on_use_title_change_bound}
                  checked={this.state.use_title}
                />{' '}
                使用头衔
              </label>
            )}
          </div>
        </div>
        {preview ? (
          <div className="post-preview">
            <HighlightedMarkdown
              text={this.state.text}
              color_picker={this.color_picker}
              show_pid={() => {}}
            />
          </div>
        ) : (
          <>
            <span>上传并插入文件: </span>
            <input
              className="file-input"
              type="file"
              name="file"
              onChange={this.on_file_change.bind(this)}
              disabled={is_loading}
            />
            {is_loading && (
              <p>
                <small>
                  上传 <i>{file_name}</i> 中: {upload_progress_text}
                </small>
              </p>
            )}
            <input
              type="text"
              placeholder="折叠警告(留空表示不折叠)"
              value={this.state.cw}
              id="post_cw"
              className="spoiler-input"
              onChange={this.on_cw_change_bound}
              maxLength="32"
            />
            <SafeTextarea
              ref={this.area_ref}
              id="new_post"
              on_change={this.on_change_bound}
              on_submit={this.on_submit.bind(this)}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            this.setState({ has_poll: !has_poll });
          }}
        >
          {has_poll ? '取消' : '添加'}投票
        </button>

        {has_poll && (
          <div className="post-form-poll-options">
            <h6>投票选项</h6>
            {poll_options.map((option, idx) => (
              <input
                key={idx}
                type="text"
                value={option}
                placeholder="输入以添加选项..."
                onChange={(e) => this.on_poll_option_change_bound(e, idx)}
                maxLength="32"
              />
            ))}
          </div>
        )}
        <br />
        <br />
        <br />
        <p>
          <small>
            请遵守
            <a href="/policy.html" target="_blank">
              树洞管理规范（试行）
            </a>
            ，文明发言。
          </small>
        </p>
        <p>
          <small>上传文件限制200M，保留至少一个月。也可使用第三方图床。</small>
        </p>
      </form>
    );
  }
}
