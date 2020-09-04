import React, { PureComponent } from 'react';
import { Time } from './Common';
import { get_json } from './infrastructure/functions';

export class MessageViewer extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      loading_status: 'idle',
      msg: [],
    };
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
        fetch(
            '/_api/v1/systemlog?user_token=' +
            encodeURIComponent(this.props.token)
        )
          .then(get_json)
          .then((json) => {
            this.setState({
              loading_status: 'done',
              msg: json.data,
              start_time: json.start_time,
              salt: json.salt
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

  render() {
    if (this.state.loading_status === 'loading')
      return <p className="box box-tip">加载中……</p>;
    else if (this.state.loading_status === 'failed')
      return (
        <div className="box box-tip">
          <a
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
          <br/>
          <p>
            最近一次重置 <Time stamp={this.state.start_time} short={false} />
          </p>
          <p>
            随机盐 <b>{this.state.salt}</b>
          </p>
          {this.state.msg.map((msg) => (
            <div className="box" key={msg.timestamp}>
              <div className="box-header">
                <Time stamp={msg.timestamp} short={false} />
                &nbsp;
                &nbsp;
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
      )
    else return null;
  }
}
