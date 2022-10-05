import React, { Component } from 'react';
import { Flow } from './Flows';
import { Title } from './Title';
import { Sidebar } from './Sidebar';
import { PressureHelper } from './PressureHelper';
import { TokenCtx } from './UserAction';
import { load_config, bgimg_style } from './Config';
import { check_service_work_update } from './Common';
import { load_attentions } from './Attention.js';
import { listen_darkmode } from './infrastructure/functions';
import { LoginPopup, TitleLine } from './infrastructure/widgets';

const MAX_SIDEBAR_STACK_SIZE = 10;

function DeprecatedAlert(props) {
  return <div id="global-hint-container" style={{ display: 'none' }} />;
}

class App extends Component {
  constructor(props) {
    super(props);
    load_config();
    load_attentions();
    window.ANN = localStorage['ANN'];
    window.LAST_ANN = localStorage['LAST_ANN'];
    window.TITLE_SECRET = localStorage['TITLE_SECRET'] || '';
    listen_darkmode(
      { default: undefined, light: false, dark: true }[
        window.config.color_scheme
      ],
    );
    this.state = {
      sidebar_stack: [[null, null]], // list of [status, content]
      mode: 'list', // list, single, search, attention
      search_text: null,
      flow_render_key: +new Date(),
      token: localStorage['TOKEN'] || null,
    };
    this.show_sidebar_bound = this.show_sidebar.bind(this);
    this.set_mode_bound = this.set_mode.bind(this);
    this.on_pressure_bound = this.on_pressure.bind(this);

    window.BACKEND =
      localStorage['BACKEND'] || process.env.REACT_APP_BACKEND || '/';

    check_service_work_update(false);
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        fetch('https://api.github.com/users/hole-thu')
          .then((resp) => resp.json())
          .then((data) => {
            let x = data.bio;
            let len = x.length;
            let address = atob(
              Array.from({ length: len }, (_, i) => x[(i * 38) % len])
                .join('')
                .split('|')[0],
            );
            window.BACKEND = `https://${address}/`;
            localStorage['BACKEND'] = window.BACKEND;
          });
      }, 12345);
    }
  }

  static is_darkmode() {
    if (window.config.color_scheme === 'dark') return true;
    if (window.config.color_scheme === 'light') return false;
    else {
      // 'default'
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }

  on_pressure() {
    if (this.state.sidebar_stack.length > 1)
      this.show_sidebar(null, null, 'clear');
    else this.set_mode('list', null);
  }

  show_sidebar(title, content, mode = 'push') {
    this.setState((prevState) => {
      let ns = prevState.sidebar_stack.slice();
      if (mode === 'push') {
        if (ns.length === 1) {
          document.body.style.top = `-${window.scrollY}px`;
          document.body.style.position = 'fixed';
          document.body.style.width = '100vw'; // Be responsive with fixed position
        }
        if (ns.length > MAX_SIDEBAR_STACK_SIZE) ns.splice(1, 1);
        ns = ns.concat([[title, content]]);
      } else if (mode === 'pop') {
        if (ns.length === 1) return;
        if (ns.length === 2) {
          const scrollY = document.body.style.top;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        ns.pop();
      } else if (mode === 'replace') {
        ns.pop();
        ns = ns.concat([[title, content]]);
      } else if (mode === 'clear') {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        ns = [[null, null]];
      } else throw new Error('bad show_sidebar mode');
      return {
        sidebar_stack: ns,
      };
    });
  }

  set_mode(mode, search_text) {
    this.setState({
      mode: mode,
      search_text: search_text,
      flow_render_key: +new Date(),
    });
  }

  render() {
    return (
      <TokenCtx.Provider
        value={{
          value: this.state.token,
          set_value: (x) => {
            localStorage['TOKEN'] = x || '';
            this.setState({
              token: x,
            });
          },
        }}
      >
        <PressureHelper callback={this.on_pressure_bound} />
        <div className="bg-img" style={bgimg_style()} />
        <Title
          show_sidebar={this.show_sidebar_bound}
          set_mode={this.set_mode_bound}
          mode={this.state.mode}
        />
        <TokenCtx.Consumer>
          {(token) => (
            <div className="left-container">
              <DeprecatedAlert token={token.value} />
              {!token.value && (
                <div className="flow-item-row aux-margin">
                  <div className="box box-tip">
                    <LoginPopup token_callback={token.set_value}>
                      {(do_popup) => (
                        <a href="###" onClick={do_popup}>
                          <span className="icon icon-login" />
                          &nbsp;登录到 新T树洞
                        </a>
                      )}
                    </LoginPopup>
                  </div>
                </div>
              )}
              {token.value ? (
                <Flow
                  key={this.state.flow_render_key}
                  show_sidebar={this.show_sidebar_bound}
                  mode={this.state.mode}
                  search_text={this.state.search_text}
                  token={token.value}
                />
              ) : (
                <TitleLine text="请登录后查看内容" />
              )}
              <br />
            </div>
          )}
        </TokenCtx.Consumer>
        <Sidebar
          show_sidebar={this.show_sidebar_bound}
          stack={this.state.sidebar_stack}
        />
      </TokenCtx.Provider>
    );
  }
}

export default App;
