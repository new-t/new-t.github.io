import React, { PureComponent } from 'react';
import { Time, get_api_base } from './Common';
import { get_json } from './infrastructure/functions';

import './Message.css';

export class MessageViewer extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      loading_status: 'idle',
      msg: [],
    };
    this.input_suf_ref = React.createRef();
  }

  componentDidMount() {
    this.load();
  }

  load() {
    if (this.state.loading_status === 'loading') return;
    this.setState(
      {
        loading_status: 'loading',
      },
      () => {
        fetch(get_api_base() + '/systemlog', {
          headers: { 'User-Token': this.props.token },
        })
          .then(get_json)
          .then((json) => {
            this.setState({
              loading_status: 'done',
              msg: json.data,
              start_time: json.start_time,
              salt: json.salt,
              admin_list: json.admin_list,
              candidate_list: json.candidate_list,
              tmp_token: json.tmp_token,
            });
          })
          .catch((err) => {
            console.error(err);
            alert('' + err);
            this.setState({
              loading_status: 'failed',
            });
          });
      },
    );
  }

  do_set_token() {
    if (this.state.loading_status === 'loading') return;
    if (!this.input_suf_ref.current.value) {
      alert('不建议后缀为空');
      return;
    }
    let tt = this.state.tmp_token + '_' + this.input_suf_ref.current.value;
    console.log(tt);
    localStorage['TOKEN'] = tt;
    alert('已登录为临时用户，过期后需注销重新登陆');
    window.location.reload();
  }

  render() {
    if (this.state.loading_status === 'loading')
      return <p className="box box-tip">加载中……</p>;
    else if (this.state.loading_status === 'failed')
      return (
        <div className="box box-tip">
          <a
            href="###"
            onClick={() => {
              this.load();
            }}
          >
            重新加载
          </a>
        </div>
      );
    else if (this.state.loading_status === 'done')
      return (
        <>
          <br />
          <p>
            最近一次重置 <Time stamp={this.state.start_time} short={false} />
          </p>
          <p>
            随机盐 <b>{this.state.salt}</b>
          </p>
          <br />
          <div>
            <p>15分钟临时token:</p>
            <div className="input-prepend">{this.state.tmp_token}_ </div>
            <input
              type="text"
              className="input-suf"
              ref={this.input_suf_ref}
              placeholder="自定义后缀"
              maxLength={10}
            />
            <button
              type="button"
              disabled={this.state.loading_status === 'loading'}
              onClick={(e) => this.do_set_token()}
            >
              使用
            </button>
          </div>
          <br />
          <div>
            当前管理员:
            {this.state.admin_list.map((admin) => (
              <span className="admin-card" key={admin}>
                {admin}
              </span>
            ))}
          </div>
          <br />
          <div>
            当前候选管理员:
            {this.state.candidate_list.map((admin) => (
              <span className="admin-card" key={admin}>
                {admin}
              </span>
            ))}
          </div>
          {this.state.msg.map((msg) => (
            <div className="box" key={msg.type + msg.timestamp}>
              <div className="box-header">
                <Time stamp={msg.timestamp} short={false} />
                &nbsp; &nbsp;
                <b>{msg.type}</b>
                &nbsp;
                <span className="box-header-name">{msg.user}</span>
              </div>
              <div className="box-content">
                <pre>{msg.detail}</pre>
              </div>
            </div>
          ))}
        </>
      );
    else return null;
  }
}
