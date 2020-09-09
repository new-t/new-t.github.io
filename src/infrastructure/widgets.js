import React, {Component, PureComponent} from 'react';
import ReactDOM from 'react-dom';

import TimeAgo from 'react-timeago';
import chineseStrings from 'react-timeago/lib/language-strings/zh-CN';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';

import './global.css';
import './widgets.css';

import {get_json, API_VERSION_PARAM} from './functions';

function pad2(x) {
    return x<10 ? '0'+x : ''+x;
}
export function format_time(time) {
    return `${time.getMonth()+1}-${pad2(time.getDate())} ${time.getHours()}:${pad2(time.getMinutes())}:${pad2(time.getSeconds())}`;
}
const chinese_format=buildFormatter(chineseStrings);
export function Time(props) {
    const time=new Date(props.stamp*1000);
    return (
        <span className={"time-str"}>
            <TimeAgo date={time} formatter={chinese_format} title={time.toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false,
            })} />
            &nbsp;
            {!props.short ? format_time(time) : null}
        </span>
    );
}

export function TitleLine(props) {
    return (
        <p className="centered-line title-line aux-margin">
            <span className="black-outline">{props.text}</span>
        </p>
    )
}

export function GlobalTitle(props) {
    return (
        <div className="aux-margin">
            <div className="title">
                <p className="centered-line">{props.text}</p>
            </div>
        </div>
    );
}

class LoginPopupSelf extends Component {
    constructor(props) {
        super(props);
        this.state={
            loading_status: 'idle',
        }

        this.input_token_ref=React.createRef();
	};
   
  setThuhole(tar, ref) {
    console.log(tar);
    tar.href = '/_login?p=thuhole&token=' + ref.current.value;
    console.log(tar);
  }

	render() {

        return (
            <div>
                <div className="thuhole-login-popup-shadow" />
                <div className="thuhole-login-popup">
                    <p>
                        <b>通过第三方验证登陆新T树洞</b>
                    </p>
			              <p>
                        <a href="/_login?p=cs" target="_blank">
                            <span className="icon icon-login" />
                            &nbsp;闭社
                        </a>
			              </p>
			              <p>
                        <input ref={this.input_token_ref} placeholder="T大树洞Token" />
                        <br/>
                        <a href="/_login?p=thuhole" target="_blank" 
                          onClick={(e) =>{this.setThuhole(e.target, this.input_token_ref)}}
                                >
                            <span className="icon icon-login" />
                            &nbsp;T大树洞
                        </a>
			              </p>
			              <p>
                        <button type="button" disabled
                                >
                            <span className="icon icon-login" />
                            &nbsp;未名bbs
                        </button>
			              </p>
			              <p>
                        <button type="button" disabled
                                >
                            <span className="icon icon-login" />
                            &nbsp;清华统一身份认证
                        </button>
                    </p>
                    <hr />
                    <p>
                        <button onClick={this.props.on_close}>
                            取消
                        </button>
                    </p>
                    <hr/ >
                    <div className="thuhole-login-popup-info">
                      <p>提醒:
                      </p>
                      <ul>
                        <li> 无论采用哪种方式注册，你后台记录的用户名都是本质实名的，因为闭社/T大树洞的管理员可以根据你的闭社id/树洞评论区代号查到邮箱。但是这不影响新T树洞的安全性。新T树洞的匿名性来自隔离用户名与发布的内容，而非试图隔离用户名与真实身份。</li>
                        <li> 由于T大树洞仍未提供授权接口，使用T大树洞方式登陆需要用你的token在特定洞发布一段随机内容以确定身份。这是否违反用户条例由T大树洞管理员决定，需自行承担相关风险。完成登陆后建议立即重置T大树洞token。 </li>
                        <li> 目前一个人可能有两个帐号。</li>
                      </ul>
                    </div>
                </div>
            </div>
        );
    }
}

export class LoginPopup extends Component {
    constructor(props) {
        super(props);
        this.state={
            popup_show: false,
        };
        this.on_popup_bound=this.on_popup.bind(this);
        this.on_close_bound=this.on_close.bind(this);
    }

    on_popup() {
        this.setState({
            popup_show: true,
        });
    }
    on_close() {
        this.setState({
            popup_show: false,
        });
    }

    render() {
        return (
            <>
                {this.props.children(this.on_popup_bound)}
                {this.state.popup_show &&
                    <LoginPopupSelf token_callback={this.props.token_callback} on_close={this.on_close_bound} />
                }
            </>
        );
    }
}
