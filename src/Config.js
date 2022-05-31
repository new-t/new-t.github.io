import React, { PureComponent } from 'react';

import './Config.css';

const BUILTIN_IMGS = {
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/gbp.jpg':
    '怀旧背景（默认）',
  'https://www.tsinghua.edu.cn/image/nav-bg.jpg': '清华紫',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/gbp.jpg':
    '寻觅繁星',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/eriri.jpg':
    '平成著名画师',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/yurucamp.jpg':
    '露营天下第一',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/minecraft.jpg':
    '麦恩·库拉夫特',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/cyberpunk.jpg':
    '赛博城市',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/bj.jpg':
    '城市的星光',
  'https://cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/sif.jpg':
    '梦开始的地方',
};

const DEFAULT_CONFIG = {
  background_img:
    '//cdn.jsdelivr.net/gh/thuhole/webhole@gh-pages/static/bg/gbp.jpg',
  background_color: '#113366',
  pressure: false,
  easter_egg: true,
  color_scheme: 'default',
  block_tmp: true,
  block_cw: ['xxg', 'zzxg'],
  block_words_v4: ['🕷️', '[系统自动代发]'],
  whitelist_cw: [],
  ipfs_gateway_list: [
    'https://<hash>.ipfs.dweb.link/',
    'https://<hash>.ipfs.hub.textile.io/',
    'https://<hash>.ipfs.infura-ipfs.io/',
    'https://ipfs.adatools.io/ipfs/<hash>',
    'https://<hash>.ipfs.astyanax.io/',
    'https://crustwebsites.net/ipfs/<hash>',
    'https://gateway.pinata.cloud/ipfs/<hash>',
    'https://ipfs.eth.aragon.network/ipfs/<hash>',
    'https://ipfs.best-practice.se/ipfs/<hash>',
    'https://gateway.ipfs.io/ipfs/<hash>',
    'https://ipfs.fleek.co/ipfs/<hash>',
    'https://cloudflare-ipfs.com/ipfs/<hash>',
    'https://via0.com/ipfs/<hash>',
  ],
};

export function load_config() {
  let config = Object.assign({}, DEFAULT_CONFIG);
  let loaded_config;
  try {
    loaded_config = JSON.parse(localStorage['hole_config'] || '{}');
  } catch (e) {
    alert('设置加载失败，将重置为默认设置！\n' + e);
    delete localStorage['hole_config'];
    loaded_config = {};
  }

  // unrecognized configs are removed
  Object.keys(loaded_config).forEach((key) => {
    if (config[key] !== undefined) config[key] = loaded_config[key];
  });

  if (loaded_config['block_words_v3']) {
    config['block_words_v4'] = loaded_config['block_words_v3'].concat(
      config['block_words_v4'],
    );
  }

  console.log('config loaded', config);
  window.config = config;
}
export function save_config(need_load = true) {
  localStorage['hole_config'] = JSON.stringify(window.config);
  if (need_load) load_config();
}

export function bgimg_style(img, color) {
  if (img === undefined) img = window.config.background_img;
  if (color === undefined) color = window.config.background_color;
  return {
    background: 'transparent center center',
    backgroundImage: img === null ? 'unset' : 'url("' + encodeURI(img) + '")',
    backgroundColor: color,
    backgroundSize: 'cover',
  };
}

class ConfigBackground extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      img: window.config.background_img,
      color: window.config.background_color,
    };
  }

  save_changes() {
    this.props.callback({
      background_img: this.state.img,
      background_color: this.state.color,
    });
  }

  on_select(e) {
    let value = e.target.value;
    this.setState(
      {
        img: value === '##other' ? '' : value === '##color' ? null : value,
      },
      this.save_changes.bind(this),
    );
  }
  on_change_img(e) {
    this.setState(
      {
        img: e.target.value,
      },
      this.save_changes.bind(this),
    );
  }
  on_change_color(e) {
    this.setState(
      {
        color: e.target.value,
      },
      this.save_changes.bind(this),
    );
  }

  render() {
    let img_select =
      this.state.img === null
        ? '##color'
        : Object.keys(BUILTIN_IMGS).indexOf(this.state.img) === -1
        ? '##other'
        : this.state.img;
    return (
      <div>
        <p>
          <b>背景图片：</b>
          <select
            className="config-select"
            value={img_select}
            onChange={this.on_select.bind(this)}
          >
            {Object.keys(BUILTIN_IMGS).map((key) => (
              <option key={key} value={key}>
                {BUILTIN_IMGS[key]}
              </option>
            ))}
            <option value="##other">输入图片网址……</option>
            <option value="##color">纯色背景……</option>
          </select>
          &nbsp;
          <small>#background_img</small>&nbsp;
          {img_select === '##other' && (
            <input
              type="url"
              placeholder="图片网址"
              value={this.state.img}
              onChange={this.on_change_img.bind(this)}
            />
          )}
          {img_select === '##color' && (
            <input
              type="color"
              value={this.state.color}
              onChange={this.on_change_color.bind(this)}
            />
          )}
        </p>
        <div
          className="bg-preview"
          style={bgimg_style(this.state.img, this.state.color)}
        />
      </div>
    );
  }
}

class ConfigColorScheme extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      color_scheme: window.config.color_scheme,
    };
  }

  save_changes() {
    this.props.callback({
      color_scheme: this.state.color_scheme,
    });
  }

  on_select(e) {
    let value = e.target.value;
    this.setState(
      {
        color_scheme: value,
      },
      this.save_changes.bind(this),
    );
  }

  render() {
    return (
      <div>
        <p>
          <b>夜间模式：</b>
          <select
            className="config-select"
            value={this.state.color_scheme}
            onChange={this.on_select.bind(this)}
          >
            <option value="default">跟随系统</option>
            <option value="light">始终浅色模式</option>
            <option value="dark">始终深色模式</option>
          </select>
          &nbsp;<small>#color_scheme</small>
        </p>
        <p className="config-description">
          选择浅色或深色模式，深色模式下将会调暗图片亮度
        </p>
      </div>
    );
  }
}

class ConfigTextArea extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      [props.id]: window.config[props.id],
    };
  }

  save_changes() {
    this.props.callback({
      [this.props.id]: this.props.sift(this.state[this.props.id]),
    });
  }

  on_change(e) {
    let value = this.props.parse(e.target.value);
    this.setState(
      {
        [this.props.id]: value,
      },
      this.save_changes.bind(this),
    );
  }

  render() {
    return (
      <div>
        <label>
          <p>
            <b>{this.props.name}</b>&nbsp;<small>#{this.props.id}</small>
          </p>
          <p className="config-description">{this.props.description}</p>
          <textarea
            name={'config-' + this.props.id}
            id={`config-textarea-${this.props.id}`}
            className="config-textarea"
            value={this.props.display(this.state[this.props.id])}
            onChange={this.on_change.bind(this)}
          />
        </label>
      </div>
    );
  }
}

class ConfigSwitch extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      switch: window.config[this.props.id],
    };
  }

  on_change(e) {
    let val = e.target.checked;
    this.setState(
      {
        switch: val,
      },
      () => {
        this.props.callback({
          [this.props.id]: val,
        });
      },
    );
  }

  render() {
    return (
      <div>
        <p>
          <label>
            <input
              name={'config-' + this.props.id}
              type="checkbox"
              checked={this.state.switch}
              onChange={this.on_change.bind(this)}
            />
            &nbsp;<b>{this.props.name}</b>
            &nbsp;<small>#{this.props.id}</small>
          </label>
        </p>
        <p className="config-description">{this.props.description}</p>
      </div>
    );
  }
}

export class ConfigUI extends PureComponent {
  constructor(props) {
    super(props);
    this.save_changes_bound = this.save_changes.bind(this);
  }

  save_changes(chg) {
    console.log(chg);
    Object.keys(chg).forEach((key) => {
      window.config[key] = chg[key];
    });
    save_config(false);
  }

  reset_settings() {
    if (window.confirm('重置所有设置？')) {
      window.config = {};
      save_config();
      window.location.reload();
    }
  }

  render() {
    return (
      <div>
        <div className="box config-ui-header">
          <p>
            这些功能仍在测试，可能不稳定（
            <a onClick={this.reset_settings.bind(this)}>全部重置</a>）
          </p>
          <p>
            <b>
              部分设置修改后需要{' '}
              <a
                onClick={() => {
                  window.location.reload();
                }}
              >
                刷新页面
              </a>{' '}
              方可生效
            </b>
          </p>
        </div>
        <div className="box">
          <ConfigBackground
            id="background"
            callback={this.save_changes_bound}
          />
          <hr />
          <ConfigColorScheme
            id="color-scheme"
            callback={this.save_changes_bound}
          />
          <hr />
          <ConfigSwitch
            callback={this.save_changes_bound}
            id="block_tmp"
            name="屏蔽临时帐号"
            description="屏蔽所有临时帐号的发言"
          />
          <hr />
          <ConfigTextArea
            id="block_cw"
            callback={this.save_changes_bound}
            name="设置屏蔽的折叠警告"
            description={
              '折叠警告包含屏蔽词的树洞会不显示而非折叠，每行一个屏蔽词'
            }
            display={(array) => array.join('\n')}
            sift={(array) => array.filter((v) => v)}
            parse={(string) => string.split('\n')}
          />
          <hr />
          <ConfigTextArea
            id="block_words_v4"
            callback={this.save_changes_bound}
            name="设置屏蔽词"
            description={'包含屏蔽词的树洞会不被显示，每行一个屏蔽词'}
            display={(array) => array.join('\n')}
            sift={(array) => array.filter((v) => v)}
            parse={(string) => string.split('\n')}
          />
          <hr />
          <ConfigTextArea
            id="whitelist_cw"
            callback={this.save_changes_bound}
            name="展开指定的折叠警告"
            description={
              '完全匹配的树洞不会被折叠，每行一个豁免词，也可使用一个星号("*")表示豁免所有'
            }
            display={(array) => array.join('\n')}
            sift={(array) => array.filter((v) => v)}
            parse={(string) => string.split('\n')}
          />
          <hr />
          <ConfigTextArea
            id="ipfs_gateway_list"
            callback={this.save_changes_bound}
            name="候选ipfs网关"
            description={
              '<hash>表示要替换的哈希值。下次上传文件会使用第一行的，上传后根据速度调整。'
            }
            display={(array) => array.join('\n')}
            sift={(array) => array.filter((v) => v)}
            parse={(string) => string.split('\n')}
          />
          <hr />
          <ConfigSwitch
            callback={this.save_changes_bound}
            id="pressure"
            name="快速返回"
            description="短暂按住 Esc 键或重压屏幕（3D Touch）可以快速返回或者刷新树洞"
          />
          <hr />
          <ConfigSwitch
            callback={this.save_changes_bound}
            id="easter_egg"
            name="允许彩蛋"
            description="在某些情况下显示彩蛋"
          />
          <hr />
          <p>
            新功能建议或问题反馈请在&nbsp;
            <a
              href="https://git.thu.monster/newthuhole/hole-backend-rust/issues"
              target="_blank"
            >
              Gitea
            </a>
            &nbsp;提出。
          </p>
        </div>
      </div>
    );
  }
}
