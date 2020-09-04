import React, {Component, PureComponent} from 'react';
import ReactDOM from 'react-dom';

import TimeAgo from 'react-timeago';
import chineseStrings from 'react-timeago/lib/language-strings/zh-CN';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';

import './global.css';
import './widgets.css';

import appicon_hole from './appicon/hole.png';
import appicon_imasugu from './appicon/imasugu.png';
import appicon_imasugu_rev from './appicon/imasugu_rev.png';
import appicon_syllabus from './appicon/syllabus.png';
import appicon_score from './appicon/score.png';
import appicon_course_survey from './appicon/course_survey.png';
import appicon_dropdown from './appicon/dropdown.png';
import appicon_dropdown_rev from './appicon/dropdown_rev.png';
import appicon_homepage from './appicon/homepage.png';
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
	};
    
	render() {

        return (
            <div>
                <div className="thuhole-login-popup-shadow" />
                <div className="thuhole-login-popup">
                    <p>
                        <b>通过第三方验证登陆T大树洞</b>
                    </p>
			        <p>
                        <a href="/_login?p=cs" target="_blank">
                            <span className="icon icon-login" />
                            &nbsp;闭社
                        </a>
			        </p>
			        <p>
                        <button type="button" disabled
                                >
                            <span className="icon icon-login" />
                            &nbsp;T大树洞
                        </button>
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
