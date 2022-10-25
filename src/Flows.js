import React, { PureComponent, useState } from 'react';
import copy from 'copy-to-clipboard';
import { ColorPicker } from './color_picker';
import { split_text, PID_RE } from './text_splitter';
import {
  format_time,
  Time,
  TitleLine,
  ClickHandler,
  ColoredSpan,
  HighlightedMarkdown,
  get_push_subscription,
} from './Common';
import './Flows.css';
import LazyLoad, { forceCheck } from 'react-lazyload';
import { TokenCtx, ReplyForm } from './UserAction';
import { API, parse_replies } from './flows_api';
import { cache } from './cache';
import { save_attentions } from './Attention';
import Poll from 'react-polls';

/*
const IMAGE_BASE = 'https://thimg.yecdn.com/';
const IMAGE_BAK_BASE = 'https://img2.thuhole.com/';
*/

const CLICKABLE_TAGS = { a: true, audio: true, button: true };
const PREVIEW_REPLY_COUNT = 10;
// const QUOTE_BLACKLIST=['23333','233333','66666','666666','10086','10000','100000','99999','999999','55555','555555'];
const QUOTE_BLACKLIST = [];

window.LATEST_POST_ID = parseInt(localStorage['_LATEST_POST_ID'], 10) || 0;

const DZ_NAME = '洞主';

function check_block(info) {
  return (
    (((window.config.block_tmp || !window.config.show_all_rooms) &&
      info.is_tmp) ||
      window.config.block_words_v4.some((word) => info.text.includes(word)) ||
      (info.cw &&
        window.config.block_words_v4
          .concat(window.config.block_cw)
          .some((word) => info.cw.includes(word)))) &&
    !info.can_del
  );
}

function load_single_meta(show_sidebar, token) {
  return async (pid, replace = false) => {
    let color_picker = new ColorPicker();
    let title_elem = '树洞 #' + pid;
    show_sidebar(
      title_elem,
      <div className="box box-tip">正在加载 #{pid}</div>,
      replace ? 'replace' : 'push',
    );
    try {
      let single = await API.get_single(pid, token);
      single.data.variant = {};
      let { data: replies } = await API.load_replies_with_cache(
        pid,
        token,
        color_picker,
        parseInt(single.data.reply),
      );
      show_sidebar(
        title_elem,
        <FlowSidebar
          key={+new Date()}
          info={single.data}
          replies={replies.data}
          attention={replies.attention}
          token={token}
          show_sidebar={show_sidebar}
          color_picker={color_picker}
          deletion_detect={localStorage['DELETION_DETECT'] === 'on'}
        />,
        'replace',
      );
    } catch (e) {
      console.error(e);
      show_sidebar(
        title_elem,
        <div className="box box-tip">
          <p>
            <a
              href="###"
              onClick={() => load_single_meta(show_sidebar, token)(pid, true)}
            >
              重新加载
            </a>
          </p>
          <p>{'' + e}</p>
        </div>,
        'replace',
      );
    }
  };
}

class Reply extends PureComponent {
  render() {
    const {
      info,
      color_picker,
      show_pid,
      do_filter_name,
      do_delete,
      do_report,
      do_block,
      search_param,
    } = this.props;
    const author = info.name,
      replyText = info.text;
    this.color_picker = new ColorPicker();
    return (
      !check_block(info) && (
        <div
          className={'flow-reply box'}
          style={
            info._display_color
              ? {
                  '--box-bgcolor-light': info._display_color[0],
                  '--box-bgcolor-dark': info._display_color[1],
                }
              : null
          }
        >
          <div className="box-header">
            {!!do_filter_name && (
              <span
                className="reply-header-badge clickable"
                onClick={() => {
                  do_filter_name(info.name);
                }}
              >
                <span className="icon icon-locate" />
              </span>
            )}
            &nbsp;
            {<span className="box-header-name">{info.name}</span>}
            {info.author_title && (
              <span className="box-header-name author-title">{`"${info.author_title}"`}</span>
            )}
            {info.is_tmp && (
              <span className="box-header-name tmp-title">临时账号</span>
            )}
            {!!do_delete && !!info.can_del && (
              <span
                className="clickable icon icon-delete op-btn"
                onClick={() => {
                  do_delete('cid', info.cid);
                }}
              />
            )}
            {!!do_block && (
              <span
                className="clickable icon icon-block op-btn"
                onClick={do_block}
              />
            )}
            {!!do_report && (
              <span
                className="clickable icon icon-flag op-btn"
                onClick={do_report}
              />
            )}
            {info.blocked_count && (
              <span className="danger-info"> {info.blocked_count} </span>
            )}
            <Time stamp={info.timestamp} short={!do_report} />
            &nbsp;
          </div>
          <div className="box-content">
            <HighlightedMarkdown
              author={author}
              text={replyText}
              color_picker={color_picker}
              show_pid={show_pid}
              search_param={search_param}
            />
          </div>
        </div>
      )
    );
  }
}

class FlowItem extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      cw: props.info.cw || '',
    };
  }

  copy_link(event) {
    event.preventDefault();
    copy(
      `${event.target.href}${
        this.props.info.cw ? ' 【' + this.props.info.cw + '】' : ''
      }\n\n${this.props.info.text}\n` +
        `（${format_time(new Date(this.props.info.timestamp * 1000))} ${
          this.props.info.likenum
        }关注 ${this.props.info.reply}回复）\n\n` +
        this.props.replies.map((r) => `【${r.name}】\n${r.text}\n`).join('\n'),
    );
  }

  on_cw_change(event) {
    this.setState({
      cw: event.target.value,
    });
  }

  render() {
    const {
      info,
      is_quote,
      cached,
      attention,
      do_filter_name,
      do_delete,
      do_edit_cw,
      img_clickable,
      color_picker,
      show_pid,
      do_vote,
      do_block,
      do_react,
      search_param,
    } = this.props;
    const { cw } = this.state;
    const _display_color = color_picker.get(DZ_NAME, info.is_tmp);
    return (
      <div className={'flow-item' + (is_quote ? ' flow-item-quote' : '')}>
        {!!is_quote && (
          <div className="quote-tip black-outline">
            <div>
              <span className="icon icon-quote" />
            </div>
            {/*<div>*/}
            {/*  <small>提到</small>*/}
            {/*</div>*/}
          </div>
        )}
        <div
          className="box box-post"
          style={{
            '--box-bgcolor-light': _display_color[0],
            '--box-bgcolor-dark': _display_color[1],
          }}
        >
          <div className="box-post-main">
            {!!window.LATEST_POST_ID &&
              parseInt(info.pid, 10) > window.LATEST_POST_ID && (
                <div className="flow-item-dot" />
              )}
            {!!attention && !cached && <div className="flow-item-dot" />}
            <div className="box-header">
              {!!do_filter_name && (
                <span
                  className="reply-header-badge clickable"
                  onClick={() => {
                    do_filter_name(DZ_NAME);
                  }}
                >
                  <span className="icon icon-locate" />
                </span>
              )}
              {!do_react && (
                <span className="box-header-badge">
                  <span className="icon icon-up-and-down" />
                  <span style={{ verticalAlign: 'super' }}>
                    {info.up_votes - info.down_votes}
                  </span>
                </span>
              )}
              {!!parseInt(info.likenum, 10) && (
                <span className="box-header-badge">
                  {info.likenum}&nbsp;
                  <span
                    className={'icon icon-' + (attention ? 'star-ok' : 'star')}
                  />
                </span>
              )}
              {!!parseInt(info.reply, 10) && (
                <span className="box-header-badge">
                  {info.reply}&nbsp;
                  <span className="icon icon-comment" />
                </span>
              )}
              <code className="box-id">
                <a href={'##' + info.pid} onClick={this.copy_link.bind(this)}>
                  #{info.pid}
                  {info.room_id !== parseInt(window.config.room) && (
                    <> @{info.room_id}</>
                  )}
                </a>
              </code>
              &nbsp;
              {info.author_title && (
                <span className="box-header-name author-title">{`"${info.author_title}"`}</span>
              )}
              {info.is_tmp && (
                <span className="box-header-name tmp-title">临时账号</span>
              )}
              {info.is_reported && <span className="danger-info"> R </span>}
              {!!do_delete && !!info.can_del && (
                <span
                  className="clickable icon icon-delete op-btn"
                  onClick={() => {
                    do_delete('pid', info.pid);
                  }}
                />
              )}
              {!!do_block && (
                <span
                  className="clickable icon icon-block op-btn"
                  onClick={do_block}
                />
              )}
              {info.dangerous_user && (
                <span className="danger-info"> {info.dangerous_user} </span>
              )}
              {info.blocked_count && (
                <span className="danger-info"> {info.blocked_count} </span>
              )}
              {info.cw !== null && (!do_edit_cw || !info.can_del) && (
                <span className="box-header-cw">{info.cw}</span>
              )}
              {!!do_edit_cw && !!info.can_del && (
                <div className="box-header-cw-edit clickable">
                  <input
                    type="text"
                    value={cw}
                    maxLength="32"
                    placeholder="编辑折叠警告"
                    onChange={this.on_cw_change.bind(this)}
                  />
                  <button
                    type="button"
                    onClick={(e) => do_edit_cw(cw, info.pid)}
                  >
                    更新
                  </button>
                </div>
              )}
              {!info.allow_search && <span className="icon icon-lock" />}
              <Time stamp={info.timestamp} short={!img_clickable} />
            </div>
            {!!info.hot_score && (
              <span className="box-header">hot score: {info.hot_score}</span>
            )}
            <div className="box-content">
              <HighlightedMarkdown
                text={info.text}
                color_picker={color_picker}
                show_pid={show_pid}
                search_param={search_param}
              />
            </div>
            {info.poll && (
              <div className="box-poll">
                <Poll
                  key={info.poll.answers.map((a) => a.votes).join('_')}
                  question={''}
                  answers={info.poll.answers}
                  onVote={do_vote}
                  customStyles={{ theme: 'cyan' }}
                  noStorage={true}
                  vote={
                    localStorage['VOTE_RECORD:' + info.pid] || info.poll.vote
                  }
                />
              </div>
            )}
            {!!(attention && info.variant.latest_reply) && (
              <p className="box-footer">
                最新回复{' '}
                <Time stamp={info.variant.latest_reply} short={false} />
              </p>
            )}
          </div>
          {do_react && (
            <div className="box-post-vote">
              <span
                className="clickable"
                onClick={() => do_react(info.reaction_status === 1 ? 0 : 1)}
              >
                <svg
                  className={
                    info.reaction_status === 1
                      ? 'vote-icon-active'
                      : 'vote-icon-inactive'
                  }
                  width="24"
                  height="24"
                  viewBox="0 0 36 36"
                >
                  <path d="M2 25h32L18 9 2 25Z" />
                </svg>
              </span>
              <div className="vote-num">{info.up_votes}</div>
              <hr />
              <span
                className="clickable"
                onClick={() =>
                  do_react && do_react(info.reaction_status === -1 ? 0 : -1)
                }
              >
                <svg
                  className={
                    info.reaction_status === -1
                      ? 'vote-icon-active'
                      : 'vote-icon-inactive'
                  }
                  width="24"
                  height="24"
                  viewBox="0 0 36 36"
                >
                  <path d="M2 11h32L18 27 2 11Z"></path>
                </svg>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
}

class FlowSidebar extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      attention: props.attention,
      info: props.info,
      replies: props.replies,
      loading_status: 'done',
      error_msg: null,
      filter_name: null,
      rev: false,
    };
    this.color_picker = props.color_picker;
    this.syncState = props.sync_state || (() => {});
    this.reply_ref = React.createRef();
  }

  set_variant(cid, variant) {
    this.setState(
      (prev) => {
        if (cid)
          return {
            replies: prev.replies.map((reply) => {
              if (reply.cid === cid)
                return Object.assign({}, reply, {
                  variant: Object.assign({}, reply.variant, variant),
                });
              else return reply;
            }),
          };
        else
          return {
            info: Object.assign({}, prev.info, {
              variant: Object.assign({}, prev.info.variant, variant),
            }),
          };
      },
      function () {
        this.syncState({
          info: this.state.info,
          replies: this.state.replies,
        });
      },
    );
  }

  load_replies(update_count = true) {
    this.setState({
      loading_status: 'loading',
      error_msg: null,
    });
    API.load_replies(
      this.state.info.pid,
      this.props.token,
      this.color_picker,
      null,
    )
      .then((json) => {
        this.setState(
          (prev, props) => ({
            replies: json.data,
            info: update_count
              ? Object.assign({}, prev.info, {
                  reply: '' + json.data.length,
                  likenum: '' + json.likenum,
                })
              : prev.info,
            attention: !!json.attention,
            loading_status: 'done',
            error_msg: null,
          }),
          () => {
            this.syncState({
              replies: this.state.replies,
              attention: this.state.attention,
              info: this.state.info,
            });
            if (this.state.replies.length)
              this.set_variant(null, {
                latest_reply: Math.max.apply(
                  null,
                  this.state.replies.map((r) => parseInt(r.timestamp)),
                ),
              });
          },
        );
      })
      .catch((e) => {
        console.error(e);
        this.setState({
          replies: [],
          loading_status: 'done',
          error_msg: '' + e,
        });
      });
  }

  set_reaction(reaction_status) {
    console.log(reaction_status);
    const prev_info = this.state.info;
    const pid = prev_info.pid;
    API.set_reaction(pid, reaction_status, this.props.token).then((json) => {
      this.setState({
        info: Object.assign({}, prev_info, json.data),
      });
      // TODO: save to localStore
      this.syncState({
        info: Object.assign({}, prev_info, json.data),
      });
    });
  }

  toggle_attention() {
    const prev_info = this.state.info;
    const pid = prev_info.pid;
    API.set_attention(pid, !this.state.attention, this.props.token)
      .then((json) => {
        this.setState({
          attention: json.attention,
          info: Object.assign({}, prev_info, {
            likenum: '' + json.likenum,
          }),
        });

        let saved_attentions = window.saved_attentions;
        if (json.attention && !saved_attentions.includes(pid)) {
          saved_attentions.unshift(pid);
        } else if (!json.attention && saved_attentions.includes(pid)) {
          const idx = saved_attentions.indexOf(pid);
          saved_attentions.splice(idx, 1);
        }
        window.saved_attentions = saved_attentions;
        save_attentions();

        this.syncState({
          attention: json.attention,
          info: Object.assign({}, prev_info, {
            likenum: '' + json.likenum,
          }),
        });
      })
      .catch((e) => {
        this.setState({
          loading_status: 'done',
        });
        alert('设置关注失败\n' + e);
        console.error(e);
      });
  }

  toggle_notification() {
    console.log('set notifi');
    get_push_subscription().then((sc) => {
      if (!sc) {
        alert('浏览器不支持消息推送，或无法连接到推送服务');
        return;
      }
      let sc_data = JSON.parse(JSON.stringify(sc));
      API.set_notification(
        this.state.info.pid,
        true,
        sc_data.endpoint,
        sc_data.keys.auth,
        sc_data.keys.p256dh,
        this.props.token,
      ).then((json) => {
        // TODO
      });
    });
  }

  do_vote(vote) {
    this.setState({
      loading_status: 'loading',
      error_msg: null,
    });
    API.add_vote(vote, this.state.info.pid, this.props.token)
      .then((json) => {
        if (json.code !== 0) return;
        localStorage['VOTE_RECORD:' + this.state.info.pid] = vote;
        this.setState(
          (prev, props) => ({
            info: Object.assign({}, prev.info, { poll: json.data }),
            loading_status: 'done',
          }),
          () => {
            this.syncState({
              info: this.state.info,
            });
          },
        );
      })
      .catch((e) => {
        console.error(e);
        this.setState({
          loading_status: 'done',
          error_msg: '' + e,
        });
      });
  }

  report(event, text = '') {
    console.log(text);
    let reason = prompt(`举报 #${this.state.info.pid} 的理由：`, text);
    if (!reason) return;
    let should_hide = window.confirm('是否认为此洞应该被删除或隐藏？');
    if (reason !== null) {
      API.report(this.state.info.pid, reason, should_hide, this.props.token)
        .then((json) => {
          alert('举报成功');
        })
        .catch((e) => {
          alert('举报失败\n' + e);
          console.error(e);
        });
    }
  }

  block(name, type, id, on_complete) {
    if (window.confirm(`确定拉黑${name}吗？后续将不会收到其发布的任何内容`)) {
      API.block(type, id, this.props.token)
        .then((json) => {
          let data = json.data;
          alert(`操作成功，当前拉黑数 ${data.curr}`);
          !!on_complete && on_complete();
        })
        .catch((e) => {
          alert('拉黑失败\n' + e);
          console.error(e);
        });
    }
  }

  set_filter_name(name) {
    this.setState((prevState) => ({
      filter_name: name === prevState.filter_name ? null : name,
    }));
  }

  toggle_rev() {
    this.setState((prevState) => ({ rev: !prevState.rev }), forceCheck);
  }

  show_reply_bar(name, event) {
    if (this.reply_ref.current && !event.target.closest('a, .clickable')) {
      let text = this.reply_ref.current.get();
      if (
        /^\s*(?:Re (?:|洞主|(?:[A-Z][a-z]+ )?(?:[A-Z][a-z]+)|You Win(?: \d+)?):)?\s*$/.test(
          text,
        )
      ) {
        // text is nearly empty so we can replace it
        let should_text = 'Re ' + name + ': ';
        if (should_text === this.reply_ref.current.get())
          this.reply_ref.current.set('');
        else this.reply_ref.current.set(should_text);
      }
    }
  }

  make_do_delete(token, on_complete = null) {
    const do_delete = (type, id) => {
      let note = prompt(`将删除${type}=${id}, 备注：`, '(无)');
      if (note !== null) {
        API.del(type, id, note, token)
          .then((json) => {
            alert('删除成功');
            on_complete();
          })
          .catch((e) => {
            alert('删除失败\n' + e);
            console.error(e);
          });
      }
    };
    return do_delete;
  }

  do_edit_cw(cw, id) {
    API.update_cw(cw, id, this.props.token)
      .then((json) => {
        this.setState(
          {
            info: Object.assign({}, this.state.info, { cw: cw }),
          },
          () => {
            this.syncState({
              info: this.state.info,
            });
          },
        );
        alert('已更新');
      })
      .catch((e) => {
        alert('更新失败\n' + e);
        console.error(e);
      });
  }

  render() {
    if (this.state.loading_status === 'loading')
      return <p className="box box-tip">加载中……</p>;

    let show_pid = load_single_meta(this.props.show_sidebar, this.props.token);

    let replies_to_show = this.state.filter_name
      ? this.state.replies.filter((r) => r.name === this.state.filter_name)
      : this.state.replies.slice();
    if (this.state.rev) replies_to_show.reverse();

    // may not need key, for performance
    // key for lazyload elem
    // let view_mode_key =
    //   (this.state.rev ? 'y-' : 'n-') + (this.state.filter_name || 'null');

    let replies_cnt = { [DZ_NAME]: 1 };
    replies_to_show.forEach((r) => {
      if (replies_cnt[r.name] === undefined) replies_cnt[r.name] = 0;
      replies_cnt[r.name]++;
    });

    // hide main thread when filtered
    let main_thread_elem =
      this.state.filter_name && this.state.filter_name !== DZ_NAME ? null : (
        <ClickHandler
          callback={(e) => {
            this.show_reply_bar('', e);
          }}
        >
          <FlowItem
            info={this.state.info}
            attention={this.state.attention}
            img_clickable={true}
            color_picker={this.color_picker}
            show_pid={show_pid}
            search_param={this.props.search_param}
            replies={this.state.replies}
            set_variant={(variant) => {
              this.set_variant(null, variant);
            }}
            do_filter_name={
              replies_cnt[DZ_NAME] > 1 ? this.set_filter_name.bind(this) : null
            }
            do_delete={this.make_do_delete(this.props.token, () => {
              window.location.reload();
            })}
            do_edit_cw={this.do_edit_cw.bind(this)}
            do_vote={this.do_vote.bind(this)}
            do_block={() => {
              this.block('洞主', 'post', this.state.info.pid, () => {
                window.location.reload();
              });
            }}
            do_react={this.set_reaction.bind(this)}
          />
        </ClickHandler>
      );

    return (
      <div className="flow-item-row sidebar-flow-item">
        <div className="box box-tip">
          {!!this.props.token && (
            <span>
              <a href="###" onClick={this.report.bind(this)}>
                <span className="icon icon-flag" />
                <label>举报</label>
              </a>
              &nbsp;&nbsp;
            </span>
          )}
          <a href="###" onClick={this.load_replies.bind(this)}>
            <span className="icon icon-refresh" />
            <label>刷新</label>
          </a>
          {(this.state.replies.length >= 1 || this.state.rev) && (
            <span>
              &nbsp;&nbsp;
              <a href="###" onClick={this.toggle_rev.bind(this)}>
                <span className="icon icon-order-rev" />
                <label>{this.state.rev ? '还原' : '逆序'}</label>
              </a>
            </span>
          )}
          {!!this.props.token && (
            <span>
              &nbsp;&nbsp;
              <a href="###" onClick={() => this.toggle_attention()}>
                {this.state.attention ? (
                  <span>
                    <span className="icon icon-star-ok" />
                    <label>已关注</label>
                  </span>
                ) : (
                  <span>
                    <span className="icon icon-star" />
                    <label>未关注</label>
                  </span>
                )}
              </a>
            </span>
          )}
          {!!this.props.token && !!this.state.attention && (
            <span style={{ display: 'none' }}>
              &nbsp;&nbsp;
              <a href="###" onClick={() => this.toggle_notification()}>
                <span>
                  <span className="icon icon-bell" />
                  <label>提醒</label>
                </span>
              </a>
            </span>
          )}
        </div>
        {!!this.state.filter_name && (
          <div className="box box-tip flow-item filter-name-bar">
            <p>
              <span style={{ float: 'left' }}>
                <a
                  href="###"
                  onClick={() => {
                    this.set_filter_name(null);
                  }}
                >
                  还原
                </a>
              </span>
              <span className="icon icon-locate" />
              &nbsp;当前只看&nbsp;
              <ColoredSpan
                colors={this.color_picker.get(this.state.filter_name)}
              >
                {this.state.filter_name}
              </ColoredSpan>
            </p>
          </div>
        )}
        {!this.state.rev && main_thread_elem}
        {!!this.state.error_msg && (
          <div className="box box-tip flow-item">
            <p>加载失败</p>
            <p>{this.state.error_msg}</p>
          </div>
        )}
        {this.props.deletion_detect &&
          parseInt(this.state.info.reply) > this.state.replies.length &&
          !!this.state.replies.length && (
            <div className="box box-tip flow-item box-danger">
              {parseInt(this.state.info.reply) - this.state.replies.length}{' '}
              条回复被删除
            </div>
          )}
        {replies_to_show.map(
          (reply, i) =>
            (reply.can_del || !reply.is_blocked) && (
              <LazyLoad
                key={i}
                offset={1500}
                height="5em"
                overflow={true}
                once={true}
              >
                <ClickHandler
                  callback={(e) => {
                    this.show_reply_bar(reply.name, e);
                  }}
                >
                  <Reply
                    info={reply}
                    color_picker={this.color_picker}
                    show_pid={show_pid}
                    search_param={this.props.search_param}
                    set_variant={(variant) => {
                      this.set_variant(reply.cid, variant);
                    }}
                    do_filter_name={
                      replies_cnt[reply.name] > 1
                        ? this.set_filter_name.bind(this)
                        : null
                    }
                    do_delete={this.make_do_delete(
                      this.props.token,
                      this.load_replies.bind(this),
                    )}
                    do_block={() => {
                      this.block(
                        reply.name,
                        'comment',
                        reply.cid,
                        this.load_replies.bind(this),
                      );
                    }}
                    do_report={(e) => {
                      this.report(
                        e,
                        `评论区${reply.name}，评论id ${reply.cid}`,
                      );
                    }}
                  />
                </ClickHandler>
              </LazyLoad>
            ),
        )}
        {this.state.rev && main_thread_elem}
        {this.props.token ? (
          <ReplyForm
            pid={this.state.info.pid}
            token={this.props.token}
            area_ref={this.reply_ref}
            on_complete={this.load_replies.bind(this)}
          />
        ) : (
          <div className="box box-tip flow-item">登录后可以回复树洞</div>
        )}
      </div>
    );
  }
}

class FlowItemRow extends PureComponent {
  constructor(props) {
    super(props);
    this.needFold =
      props.info.cw &&
      window.config.whitelist_cw.indexOf('*') === -1 &&
      window.config.whitelist_cw.indexOf(props.info.cw) === -1 &&
      (props.mode === 'list' || this.props.is_quote);
    this.has_block_words = check_block(props.info);
    this.too_many_downvotes =
      props.info.down_votes > 10 &&
      props.info.down_votes > 2 * props.info.up_votes;
    this.color_picker = new ColorPicker();
    this.state = {
      replies: props.info.comments
        ? parse_replies(props.info.comments, this.color_picker)
        : [],
      reply_status: 'done',
      reply_error: null,
      info: Object.assign({}, props.info, { variant: {} }),
      attention: props.info.attention,
      cached: true, // default no display anything
    };
  }

  componentDidMount() {
    // cache from getlist, so always to this to update attention
    if (!this.props.info.comments) {
      //if (true || parseInt(this.state.info.reply, 10)) {
      this.load_replies(null, /*update_count=*/ false);
    }
  }

  // reveal() {
  //   this.setState({ hidden: false });
  // }

  do_vote(vote) {
    const { info } = this.state;
    let current_poll = info.poll;
    current_poll.vote = vote;
    current_poll.answers.forEach((ans) => {
      if (ans.option === vote) ans.votes += 1;
    });

    this.setState(
      {
        info: Object.assign({}, info, { poll: current_poll }),
      },
      () => {
        API.add_vote(vote, info.pid, this.props.token)
          .then((json) => {
            if (json.code !== 0) return;
            localStorage['VOTE_RECORD:' + info.pid] = vote;
            this.setState((prev, props) => ({
              info: Object.assign({}, prev.info, { poll: json.data }),
            }));
          })
          .catch((e) => {
            console.error(e);
            alert('投票失败');
          });
      },
    );
  }

  load_replies(callback, update_count = true) {
    //console.log('fetching reply', this.state.info.pid);
    this.setState({
      reply_status: 'loading',
      reply_error: null,
    });
    API.load_replies_with_cache(
      this.state.info.pid,
      this.props.token,
      this.color_picker,
      parseInt(this.state.info.reply),
    )
      .then(({ data: json, cached }) => {
        //console.log('>> update', json, json.attention);
        this.setState(
          (prev, props) => ({
            replies: json.data,
            info: Object.assign({}, prev.info, {
              reply: update_count ? '' + json.data.length : prev.info.reply,
              variant: json.data.length
                ? {
                    latest_reply: Math.max.apply(
                      null,
                      json.data.map((r) => parseInt(r.timestamp)),
                    ),
                  }
                : {},
            }),
            attention: !!json.attention,
            reply_status: 'done',
            reply_error: null,
            cached,
          }),
          callback,
        );
      })
      .catch((e) => {
        console.error(e);
        this.setState(
          {
            replies: [],
            reply_status: 'failed',
            reply_error: '' + e,
          },
          callback,
        );
      });
  }

  show_sidebar() {
    this.props.show_sidebar(
      '树洞 #' + this.state.info.pid,
      <FlowSidebar
        key={+new Date()}
        info={this.state.info}
        search_param={this.props.search_param}
        replies={this.state.replies}
        attention={this.state.attention}
        sync_state={this.setState.bind(this)}
        token={this.props.token}
        show_sidebar={this.props.show_sidebar}
        color_picker={this.color_picker}
        deletion_detect={this.props.deletion_detect}
      />,
    );
  }

  render() {
    const { show_sidebar, token, search_param, is_quote, mode } = this.props;
    let show_pid = load_single_meta(show_sidebar, token, [this.state.info.pid]);

    let hl_rules = [['pid', PID_RE]];
    let parts = split_text(this.state.info.text, hl_rules);

    //console.log('hl:', parts,this.state.info.pid);

    let quote_id = null;
    if (!is_quote)
      for (let [mode, content] of parts) {
        content = content.length > 0 ? content.substring(1) : content;
        if (
          mode === 'pid' &&
          QUOTE_BLACKLIST.indexOf(content) === -1 &&
          parseInt(content) < parseInt(this.state.info.pid)
        ) {
          if (quote_id === null) quote_id = parseInt(content);
          else {
            quote_id = null;
            break;
          }
        }
      }

    let res = (
      <div
        className={
          'flow-item-row flow-item-row-with-prompt' +
          (is_quote ? ' flow-item-row-quote' : '')
        }
        onClick={(event) => {
          if (!CLICKABLE_TAGS[event.target.tagName.toLowerCase()])
            this.show_sidebar();
        }}
      >
        <FlowItem
          info={this.state.info}
          attention={this.state.attention}
          img_clickable={false}
          is_quote={this.props.is_quote}
          color_picker={this.color_picker}
          show_pid={show_pid}
          replies={this.state.replies}
          cached={this.state.cached}
          search_param={search_param}
          do_vote={this.do_vote.bind(this)}
        />
        <div className="flow-reply-row">
          {this.state.reply_status === 'loading' && (
            <div className="box box-tip">加载中</div>
          )}
          {this.state.reply_status === 'failed' && (
            <div className="box box-tip">
              <p>
                <a
                  href="###"
                  onClick={() => {
                    this.load_replies();
                  }}
                >
                  重新加载评论
                </a>
              </p>
              <p>{this.state.reply_error}</p>
            </div>
          )}
          {this.state.replies
            .slice(0, PREVIEW_REPLY_COUNT)
            .map(
              (reply) =>
                (reply.can_del || !reply.is_blocked) && (
                  <Reply
                    key={reply.cid}
                    info={reply}
                    color_picker={this.color_picker}
                    show_pid={show_pid}
                    search_param={search_param}
                  />
                ),
            )}
          {this.state.replies.length > PREVIEW_REPLY_COUNT && (
            <div className="box box-tip">
              还有 {this.state.replies.length - PREVIEW_REPLY_COUNT} 条
            </div>
          )}
        </div>
      </div>
    );

    if (this.needFold || this.has_block_words || this.too_many_downvotes) {
      return (
        (!this.has_block_words || mode !== 'list') && (
          <div
            className={
              'flow-item-row flow-item-row-with-prompt' +
              (is_quote ? ' flow-item-row-quote' : '')
            }
            onClick={(event) => {
              if (!CLICKABLE_TAGS[event.target.tagName.toLowerCase()])
                this.show_sidebar();
            }}
          >
            <div
              className={
                'flow-item' + (this.props.is_quote ? ' flow-item-quote' : '')
              }
            >
              {!!this.props.is_quote && (
                <div className="quote-tip black-outline">
                  <div>
                    <span className="icon icon-quote" />
                  </div>
                  {/*<div>*/}
                  {/*  <small>提到</small>*/}
                  {/*</div>*/}
                </div>
              )}
              <div className="box">
                <div className="box-header">
                  {!!this.props.do_filter_name && (
                    <span
                      className="reply-header-badge clickable"
                      onClick={() => {
                        this.props.do_filter_name(DZ_NAME);
                      }}
                    >
                      <span className="icon icon-locate" />
                    </span>
                  )}
                  <code className="box-id">#{this.props.info.pid}</code>
                  &nbsp;
                  {this.props.info.author_title && (
                    <span className="box-header-name author-title">{`"${this.props.info.author_title}"`}</span>
                  )}
                  {this.props.info.is_tmp && (
                    <span className="box-header-name tmp-title">临时账号</span>
                  )}
                  {this.props.info.cw !== null && (
                    <span className="box-header-cw">{this.props.info.cw}</span>
                  )}
                  <Time stamp={this.props.info.timestamp} short={true} />
                  <span className="box-header-badge">
                    {this.needFold && ' 已折叠'}
                    {this.has_block_words && ' 已屏蔽'}
                    {this.too_many_downvotes && ' 争议较大'}
                  </span>
                  <div style={{ clear: 'both' }} />
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return quote_id ? (
      <div>
        {res}
        <FlowItemQuote
          pid={quote_id}
          show_sidebar={this.props.show_sidebar}
          token={this.props.token}
          deletion_detect={this.props.deletion_detect}
        />
      </div>
    ) : (
      res
    );
  }
}

class FlowItemQuote extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      loading_status: 'empty',
      error_msg: null,
      info: null,
    };
  }

  componentDidMount() {
    this.load();
  }

  load() {
    this.setState(
      {
        loading_status: 'loading',
      },
      () => {
        API.get_single(this.props.pid, this.props.token)
          .then((json) => {
            this.setState({
              loading_status: 'done',
              info: json.data,
            });
          })
          .catch((err) => {
            if (('' + err).indexOf('没有这条树洞') !== -1)
              this.setState({
                loading_status: 'empty',
              });
            else
              this.setState({
                loading_status: 'error',
                error_msg: '' + err,
              });
          });
      },
    );
  }

  render() {
    if (this.state.loading_status === 'empty') return null;
    else if (this.state.loading_status === 'loading')
      return (
        <div className="aux-margin">
          <div className="box box-tip">
            <span className="icon icon-loading" />
            提到了 #{this.props.pid}
          </div>
        </div>
      );
    else if (this.state.loading_status === 'error')
      return (
        <div className="aux-margin">
          <div className="box box-tip">
            <p>
              <a href="###" onClick={this.load.bind(this)}>
                重新加载
              </a>
            </p>
            <p>{this.state.error_msg}</p>
          </div>
        </div>
      );
    // 'done'
    else
      return (
        <FlowItemRow
          info={this.state.info}
          mode={this.props.mode}
          show_sidebar={this.props.show_sidebar}
          token={this.props.token}
          is_quote={true}
          deletion_detect={this.props.deletion_detect}
        />
      );
  }
}

function FlowChunk(props) {
  return (
    <TokenCtx.Consumer>
      {({ value: token }) => (
        <div className="flow-chunk">
          {!!props.title && <TitleLine text={props.title} />}
          {props.list.map(
            (info, ind) =>
              (info.can_del || !info.is_blocked) && (
                <LazyLoad
                  key={info.key || info.pid}
                  offset={500}
                  height="15em"
                  hiddenIfInvisible={false}
                >
                  <div>
                    {!!(
                      props.deletion_detect &&
                      props.mode === 'list' &&
                      ind &&
                      props.list[ind - 1].pid - info.pid > 1
                    ) && (
                      <div className="flow-item-row">
                        <div className="box box-tip flow-item box-danger">
                          {props.list[ind - 1].pid - info.pid - 1} 条被删除
                        </div>
                      </div>
                    )}
                    <FlowItemRow
                      info={info}
                      mode={props.mode}
                      show_sidebar={props.show_sidebar}
                      token={token}
                      deletion_detect={props.deletion_detect}
                      search_param={props.search_param}
                    />
                  </div>
                </LazyLoad>
              ),
          )}
        </div>
      )}
    </TokenCtx.Consumer>
  );
}

function Announcement(props) {
  const [show, setShow] = useState(true);
  function do_close() {
    window.LAST_ANN = props.text;
    localStorage['LAST_ANN'] = props.text;
    setShow(false);
  }
  return (
    show && (
      <div className="flow-item-row">
        <div className="flow-item">
          <div className="box">
            <div className="box-header announcement-header">
              <a href="###" className="no-underline" onClick={do_close}>
                &nbsp;
                <span className="icon icon-close" />
                &nbsp;
              </a>
            </div>
            <div className="box-content">
              <HighlightedMarkdown
                text={props.text}
                show_pid={props.show_pid}
              />
            </div>
          </div>
        </div>
      </div>
    )
  );
}

export class Flow extends PureComponent {
  constructor(props) {
    super(props);
    let submode = window[props.mode.toUpperCase() + '_SUBMODE_BACKUP'];
    if (submode === undefined) {
      submode = props.mode === 'list' ? (window.config.by_c ? 1 : 0) : 0;
    }
    this.state = {
      submode: submode,
      announcement: window.ANN,
    };
  }

  get_submode_names(mode) {
    switch (mode) {
      case 'list':
        return ['最新', '最近回复', '近期热门', '随机'];
      case 'attention':
        return ['线上关注', '本地收藏'];
      case 'search':
        return ['Tag搜索', '全文搜索', '头衔'];
      default:
        return [];
    }
  }

  set_submode(submode) {
    window[this.props.mode.toUpperCase() + '_SUBMODE_BACKUP'] = submode;
    this.setState({
      submode: submode,
    });
  }

  update_announcement(text) {
    if (text !== this.state.announcement) {
      window.ANN = text;
      localStorage['ANN'] = text;
      this.setState({
        announcement: text,
      });
    }
  }

  render() {
    const { submode, announcement } = this.state;
    const { mode, show_sidebar, search_text, token } = this.props;
    const submode_names = this.get_submode_names(mode);
    return (
      <>
        {announcement && window.LAST_ANN !== announcement && (
          <Announcement
            text={announcement}
            show_pid={load_single_meta(show_sidebar, token)}
          />
        )}
        <div className="aux-margin flow-submode-choice">
          {submode_names.map((name, idx) => (
            <a
              href="###"
              key={idx}
              className={submode === idx ? 'choiced' : ''}
              onClick={this.set_submode.bind(this, idx)}
            >
              {name}
            </a>
          ))}
        </div>

        <SubFlow
          key={submode}
          show_sidebar={show_sidebar}
          update_announcement={(text) => this.update_announcement(text)}
          mode={mode}
          submode={submode}
          search_text={search_text}
          token={token}
        />
      </>
    );
  }
}

class SubFlow extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      mode: props.mode,
      search_param: props.search_text,
      loaded_pages: 0,
      chunks: {
        title: '',
        data: [],
      },
      local_attention_text: null,
      loading_status: 'done',
      error_msg: null,
    };
    this.on_scroll_bound = this.on_scroll.bind(this);
    window.LATEST_POST_ID = parseInt(localStorage['_LATEST_POST_ID'], 10) || 0;
  }

  load_page(page) {
    const failed = (err) => {
      console.error(err);
      this.setState((prev, props) => ({
        loaded_pages: prev.loaded_pages - 1,
        loading_status: 'failed',
        error_msg: '' + err,
      }));
    };

    if (page > this.state.loaded_pages + 1) throw new Error('bad page');
    if (page === this.state.loaded_pages + 1) {
      const { mode, search_param } = this.state;
      const { token, submode, update_announcement } = this.props;
      console.log('fetching page', page);
      cache();
      if (mode === 'list') {
        API.get_list(page, token, submode)
          .then((json) => {
            if (page === 1 && json.data.length) {
              // update latest_post_id
              let max_id = window.LATEST_POST_ID || -1;
              json.data.forEach((x) => {
                if (parseInt(x.pid, 10) > max_id) max_id = parseInt(x.pid, 10);
              });
              localStorage['_LATEST_POST_ID'] = '' + max_id;
            }

            if (page === 1) {
              window.IS_ADMIN = json.is_admin;
              window.IS_CANDIDATE = json.is_candidate;
              window.TITLE = json.custom_title;
              window.AUTO_BLCOK = json.auto_block_rank;
              if (
                json.custom_title &&
                window.TITLE_SECRET !== json.title_secret
              ) {
                window.TITLE_SECRET = json.title_secret;
                localStorage['TITLE_SECRET'] = json.title_secret;
              }
            }

            json.data.forEach((x) => {
              if (x.comments) {
                let comment_json = {
                  code: 0,
                  attention: x.attention,
                  data: x.comments,
                };
                //console.log('My cache', comment_json, x.pid, x.reply)
                cache().put(x.pid, parseInt(x.reply, 10), comment_json);
              }
            });
            this.setState(
              (prev, props) => ({
                chunks: {
                  title: 'News Feed',
                  data: prev.chunks.data.concat(
                    json.data.filter(
                      (x) =>
                        prev.chunks.data.length === 0 ||
                        !prev.chunks.data
                          .slice(-100)
                          .some((p) => p.pid === x.pid),
                    ),
                  ),
                },
                loading_status: 'done',
              }),
              () => {
                update_announcement(json.announcement);
              },
            );
          })
          .catch(failed);
      } else if (mode === 'search' && search_param) {
        API.get_search(page, search_param, token, submode)
          .then((json) => {
            const finished = json.data.length === 0;
            this.setState((prev, props) => ({
              chunks: {
                title: 'Result for "' + search_param + '"',
                data: prev.chunks.data.concat(json.data),
              },
              mode: finished ? 'search_finished' : 'search',
              loading_status: 'done',
            }));
          })
          .catch(failed);
      } else if (mode === 'single') {
        const pid = parseInt(this.state.search_param.substr(1), 10);
        API.get_single(pid, this.props.token)
          .then((json) => {
            let x = json.data;
            if (x.comments) {
              let comment_json = {
                code: 0,
                attention: x.attention,
                data: x.comments,
              };
              //console.log('My cache', comment_json, x.pid, x.reply)
              cache().put(x.pid, parseInt(x.reply, 10), comment_json);
            }

            this.setState({
              chunks: {
                title: 'PID = ' + pid,
                data: [json.data],
              },
              mode: 'single_finished',
              loading_status: 'done',
            });
          })
          .catch(failed);
      } else if (mode === 'attention') {
        let use_search = !!this.state.search_param;
        let use_regex = use_search && !!this.state.search_param.match(/\/.+\//);
        let regex_search = /.+/;
        if (use_regex) {
          try {
            regex_search = new RegExp(this.state.search_param.slice(1, -1));
          } catch (e) {
            alert(`请检查正则表达式合法性！\n${e}`);
            regex_search = /.+/;
          }
        }
        console.log(use_search, use_regex);

        if (this.props.submode === 0) {
          API.get_attention(this.props.token)
            .then((json) => {
              this.setState({
                chunks: {
                  title: `${
                    use_search
                      ? use_regex
                        ? `Result for RegEx ${regex_search.toString()} in `
                        : `Result for "${this.state.search_param}" in `
                      : ''
                  }Attention List`,
                  data: !use_search
                    ? json.data
                    : !use_regex
                    ? json.data.filter((post) => {
                        return this.state.search_param
                          .split(' ')
                          .every((keyword) => post.text.includes(keyword));
                      }) // Not using regex
                    : json.data.filter(
                        (post) => !!post.text.match(regex_search),
                      ), // Using regex
                },
                mode: 'attention_finished',
                loading_status: 'done',
              });
              if (!use_search) {
                window.saved_attentions = Array.from(
                  new Set([
                    ...window.saved_attentions,
                    ...json.data.map((post) => post.pid),
                  ]),
                ).sort((a, b) => b - a);
                save_attentions();
              }
            })
            .catch(failed);
        } else if (this.props.submode === 1) {
          const PERPAGE = 50;
          let pids = window.saved_attentions
            .sort((a, b) => b - a)
            .slice((page - 1) * PERPAGE, page * PERPAGE);
          if (pids.length) {
            API.get_multi(pids, this.props.token)
              .then((json) => {
                json.data.forEach((x) => {
                  if (x.comments) {
                    let comment_json = {
                      code: 0,
                      attention: x.attention,
                      data: x.comments,
                    };
                    //console.log('My cache', comment_json, x.pid, x.reply)
                    cache().put(x.pid, parseInt(x.reply, 10), comment_json);
                  }
                });
                this.setState((prev, props) => ({
                  chunks: {
                    title: 'Attention List: Local',
                    data: prev.chunks.data.concat(json.data),
                  },
                  loading_status: 'done',
                }));
              })
              .catch(failed);
          } else {
            console.log('local attention finished');
            this.setState({
              loading_status: 'done',
              mode: 'attention_finished',
            });
            return;
          }
        }
      } else {
        console.log('nothing to load');
        return;
      }

      this.setState((prev, props) => ({
        loaded_pages: prev.loaded_pages + 1,
        loading_status: 'loading',
        error_msg: null,
      }));
    }
  }

  on_scroll(event) {
    if (event.target === document) {
      const avail =
        document.body.scrollHeight - window.scrollY - window.innerHeight;
      if (avail < window.innerHeight && this.state.loading_status === 'done')
        this.load_page(this.state.loaded_pages + 1);
    }
  }

  componentDidMount() {
    this.load_page(1);
    window.addEventListener('scroll', this.on_scroll_bound);
    window.addEventListener('resize', this.on_scroll_bound);
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.on_scroll_bound);
    window.removeEventListener('resize', this.on_scroll_bound);
  }

  trunc_string(s, max_len) {
    return s.substr(0, max_len) + (s.length > max_len ? '...' : '');
  }

  gen_export() {
    this.setState({
      can_export: false,
      local_attention_text: JSON.parse(localStorage['saved_attentions'] || '[]')
        .map((pid) => `#${pid}`)
        .join(' '),
    });
  }

  render() {
    const should_deletion_detect = localStorage['DELETION_DETECT'] === 'on';
    const { mode, chunks, local_attention_text, search_param } = this.state;
    const { submode, show_sidebar } = this.props;
    return (
      <div className="flow-container">
        {mode === 'attention' &&
          submode === 1 &&
          local_attention_text === null && (
            <button
              className="export-btn"
              type="button"
              onClick={this.gen_export.bind(this)}
            >
              导出/导入
            </button>
          )}

        {local_attention_text && (
          <LocalAttentionEditer init_text={local_attention_text} />
        )}

        <FlowChunk
          title={chunks.title}
          list={chunks.data}
          mode={mode}
          search_param={search_param || null}
          show_sidebar={show_sidebar}
          deletion_detect={should_deletion_detect}
        />
        {this.state.loading_status === 'failed' && (
          <div className="aux-margin">
            <div className="box box-tip">
              <p>
                <a
                  href="###"
                  onClick={() => {
                    this.load_page(this.state.loaded_pages + 1);
                  }}
                >
                  重新加载
                </a>
              </p>
              <p>{this.state.error_msg}</p>
            </div>
          </div>
        )}
        <TitleLine
          text={
            this.state.loading_status === 'loading' ? (
              <span>
                <span className="icon icon-loading" />
                &nbsp;Loading...
              </span>
            ) : (
              '🄯 2020 copyleft: hole_thu'
            )
          }
        />
      </div>
    );
  }
}

function LocalAttentionEditer(props) {
  const [text, setText] = useState(props.init_text);
  const PID_RE = /#(\d+)/g;

  const save = () => {
    let pids = [...text.matchAll(PID_RE)]
      .map((m) => parseInt(m[1]))
      .sort((a, b) => b - a);
    console.log(pids);
    window.saved_attentions = pids;
    save_attentions();
    setText(pids.map((pid) => `#${pid}`).join(' '));
  };

  return (
    <div className="box">
      <textarea
        className="export-textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button className="export-btn" type="button" onClick={save}>
        保存
      </button>
    </div>
  );
}
