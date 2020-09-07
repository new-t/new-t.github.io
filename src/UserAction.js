import React, { Component } from 'react';
import {
  API_BASE,
  SafeTextarea,
  PromotionBar,
  HighlightedMarkdown,
} from './Common';
import { MessageViewer } from './Message';
import { LoginPopup } from './infrastructure/widgets';
import { ColorPicker } from './color_picker';
import { ConfigUI } from './Config';
import fixOrientation from 'fix-orientation';
import copy from 'copy-to-clipboard';
import { cache } from './cache';
import {
  API,
  get_json,
  token_param,
} from './flows_api';

import './UserAction.css';

const BASE64_RATE = 4 / 3;
const MAX_IMG_DIAM = 8000;
const MAX_IMG_PX = 5000000;
const MAX_IMG_FILESIZE = 450000 * BASE64_RATE;

const REPOSITORY = 'https://github.com/newthuhole';
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
          <label>设置</label>
        </a>
        &nbsp;&nbsp;
        <a href="/policy.html" target="_blank">
          <span className="icon icon-textfile" />
          <label>树洞规范（试行）</label>
        </a>
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
        <p>意见反馈请加tag #意见反馈 或到github后端的issus区。</p>
        <p>联系我们：<a href={"mailto:"+EMAIL}>{EMAIL}</a> 。</p>
      </div>
      <div className="box help-desc-box">
        <p>
          新T树洞 网页版 by @hole_thu，基于
          <a href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
          >
            AGPLv3
          </a>
          协议在{' '}
          <a href={REPOSITORY} target="_blank">
            GitHub
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
          <a href="https://reactjs.org/" target="_blank" rel="noopener">
            React
          </a>
          、
          <a href="https://icomoon.io/#icons" target="_blank" rel="noopener">
            IcoMoon
          </a>
          等开源项目。
        </p>
      </div>
    </div>
  );
}

export class LoginForm extends Component {
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
                    举报记录、管理日志等都是公开的
                  </p>
                  <p>
                    <small>{token.value}</small>
                    <br/>
                    <a onClick={this.copy_token.bind(this, token.value)}>
                      复制 User Token
                    </a>
                    <br />
                    User Token仅用于开发bot，切勿告知他人。若怀疑被盗号请刷新Token(刷新功能即将上线)。
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
    };
    this.on_change_bound = this.on_change.bind(this);
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

  on_submit(event) {
    if (event) event.preventDefault();
    if (this.state.loading_status === 'loading') return;
    this.setState({
      loading_status: 'loading',
    });

    let data = new URLSearchParams();
    data.append('pid', this.props.pid);
    data.append('text', this.state.text);
    data.append('user_token', this.props.token);
    fetch(
      API_BASE + '/docomment' + token_param(this.props.token),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      },
    )
      .then(get_json)
      .then((json) => {
        if (json.code !== 0) {
          if (json.msg) alert(json.msg);
          throw new Error(JSON.stringify(json));
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
      </form>
    );
  }
}

export class PostForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      cw: '',
      loading_status: 'done',
      img_tip: null,
      preview: false,
    };
    this.img_ref = React.createRef();
    this.area_ref = React.createRef();
    this.on_change_bound = this.on_change.bind(this);
    this.on_cw_change_bound = this.on_cw_change.bind(this);
    this.on_img_change_bound = this.on_img_change.bind(this);
    this.color_picker = new ColorPicker();
  }

  componentDidMount() {
    if (this.area_ref.current) this.area_ref.current.focus();
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

  do_post(text, img) {
    let data = new URLSearchParams();
    data.append('cw', this.state.cw);
    data.append('text', this.state.text);
    data.append('type', img ? 'image' : 'text');
    data.append('user_token', this.props.token);
    if (img) data.append('data', img);

    fetch(API_BASE + '/dopost' + token_param(this.props.token), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data,
    })
      .then(get_json)
      .then((json) => {
        if (json.code !== 0) {
          if (json.msg) alert(json.msg);
          throw new Error(JSON.stringify(json));
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
        alert('发表失败\n' + e);
        this.setState({
          loading_status: 'done',
        });
      });
  }

  proc_img(file) {
    return new Promise((resolve, reject) => {
      function return_url(url) {
        const idx = url.indexOf(';base64,');
        if (idx === -1) throw new Error('img not base64 encoded');

        return url.substr(idx + 8);
      }

      let reader = new FileReader();
      function on_got_img(url) {
        const image = new Image();
        image.onload = () => {
          let width = image.width;
          let height = image.height;
          let compressed = false;

          if (width > MAX_IMG_DIAM) {
            height = (height * MAX_IMG_DIAM) / width;
            width = MAX_IMG_DIAM;
            compressed = true;
          }
          if (height > MAX_IMG_DIAM) {
            width = (width * MAX_IMG_DIAM) / height;
            height = MAX_IMG_DIAM;
            compressed = true;
          }
          if (height * width > MAX_IMG_PX) {
            let rate = Math.sqrt((height * width) / MAX_IMG_PX);
            height /= rate;
            width /= rate;
            compressed = true;
          }
          console.log('chosen img size', width, height);

          let canvas = document.createElement('canvas');
          let ctx = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(image, 0, 0, width, height);

          let quality_l = 0.1,
            quality_r = 0.9,
            quality,
            new_url;
          while (quality_r - quality_l >= 0.03) {
            quality = (quality_r + quality_l) / 2;
            new_url = canvas.toDataURL('image/jpeg', quality);
            console.log(
              quality_l,
              quality_r,
              'trying quality',
              quality,
              'size',
              new_url.length,
            );
            if (new_url.length <= MAX_IMG_FILESIZE) quality_l = quality;
            else quality_r = quality;
          }
          if (quality_l >= 0.101) {
            console.log('chosen img quality', quality);
            resolve({
              img: return_url(new_url),
              quality: quality,
              width: Math.round(width),
              height: Math.round(height),
              compressed: compressed,
            });
          } else {
            reject('图片过大，无法上传');
          }
        };
        image.src = url;
      }
      reader.onload = (event) => {
        fixOrientation(event.target.result, {}, (fixed_dataurl) => {
          on_got_img(fixed_dataurl);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  on_img_change() {
    if (this.img_ref.current && this.img_ref.current.files.length)
      this.setState(
        {
          img_tip: '（正在处理图片……）',
        },
        () => {
          this.proc_img(this.img_ref.current.files[0])
            .then((d) => {
              this.setState({
                img_tip:
                  `（${d.compressed ? '压缩到' : '尺寸'} ${d.width}*${
                    d.height
                  } / ` +
                  `质量 ${Math.floor(d.quality * 100)}% / ${Math.floor(
                    d.img.length / BASE64_RATE / 1000,
                  )}KB）`,
              });
            })
            .catch((e) => {
              this.setState({
                img_tip: `图片无效：${e}`,
              });
            });
        },
      );
    else
      this.setState({
        img_tip: null,
      });
  }

  on_submit(event) {
    if (event) event.preventDefault();
    if (this.state.loading_status === 'loading') return;
    /*
    if (this.img_ref.current.files.length) {
      this.setState({
        loading_status: 'processing',
      });
      this.proc_img(this.img_ref.current.files[0])
        .then((d) => {
          this.setState({
            loading_status: 'loading',
          });
          this.do_post(this.state.text, d.img);
        })
        .catch((e) => {
          alert(e);
        });
    } else */
    {
      this.setState({
        loading_status: 'loading',
      });
      this.do_post(this.state.text, null);
    }
  }

  toggle_preview() {
    this.setState({
      preview: !this.state.preview,
    });
  }

  render() {
    return (
      <form onSubmit={this.on_submit.bind(this)} className="post-form box">
        <div className="post-form-bar">
          {/*
          <label>
            图片
            <input
              ref={this.img_ref}
              type="file"
              accept="image/*"
              disabled={this.state.loading_status !== 'done'}
              onChange={this.on_img_change_bound}
            />
          </label>
          */}

          {this.state.preview ? (
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

          {this.state.loading_status !== 'done' ? (
            <button disabled="disabled">
              <span className="icon icon-loading" />
              &nbsp;
              {this.state.loading_status === 'processing' ? '处理' : '上传'}
            </button>
          ) : (
            <button type="submit">
              <span className="icon icon-send" />
              &nbsp;发表
            </button>
          )}
        </div>
        {!!this.state.img_tip && (
          <p className="post-form-img-tip">
            <a
              onClick={() => {
                this.img_ref.current.value = '';
                this.on_img_change();
              }}
            >
              删除图片
            </a>
            {this.state.img_tip}
          </p>
        )}
        {this.state.preview ? (
          <div className="post-preview">
            <HighlightedMarkdown
              text={this.state.text}
              color_picker={this.color_picker}
              show_pid={() => {}}
            />
          </div>
        ) : (
          <>
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
        <p>
          <small>
            请遵守
            <a href="https://thuhole.com/policy.html" target="_blank">
              树洞管理规范（试行）
            </a>
            ，文明发言。
          </small>
        </p>
        <p>
          <small>
            插入图片请使用图片外链，Markdown格式 ![](图片链接)， 支持动图，支持多图。推荐的图床： 
            <a href="https://imgchr.com/" target="_blank">
              路过图床
            </a>
            、
            <a href="https://sm.ms/" target="_blank">
              sm.ms
            </a>
            、
            <a href="https://bbs.pku.edu.cn/v2/post-read.php?bid=154&threadid=3743" target="_blank">
              未名BBS
            </a>
            、
            <a href="https://zhuanlan.zhihu.com/write" target="_blank">
              知乎
            </a>
            。
          </small>
        </p>
      </form>
    );
  }
}
