import React, { Component } from 'react';
import { connect } from 'react-redux';
import Request from './Request.jsx';
import ResponseContainer from '../containers/ResponseContainer.jsx';
import OpenBtn from './OpenBtn.jsx';
import CloseBtn from './CloseBtn.jsx';
import WebSocketWindow from './WebSocketWindow.jsx';
import connectionController from '../../controllers/connectionController';

import * as actions from '../../actions/actions';

const mapStateToProps = store => ({});

const mapDispatchToProps = dispatch => ({
  reqResDelete: (reqRes) => {
    dispatch(actions.reqResDelete(reqRes));
  },
  reqResUpdate: (reqRes) => {
    dispatch(actions.reqResUpdate(reqRes));
  },
});

class ReqRes extends Component {
  constructor(props) {
    super(props);
    this.removeReqRes = this.removeReqRes.bind(this);
    this.onCheckHandler = this.onCheckHandler.bind(this);
  }

  onCheckHandler() {
    this.props.content.checked = !this.props.content.checked;
    this.props.reqResUpdate(this.props.content);
  }

  removeReqRes() {
    connectionController.closeReqRes(this.props.content.id);
    this.props.reqResDelete(this.props.content);
  }

  render() {
    const contentBody = [];

    if (this.props.content.protocol === 'ws://') {
      contentBody.push(<WebSocketWindow
        key={0}
        outgoingMessages={this.props.content.request.messages}
        incomingMessages={this.props.content.response.messages}
        id={this.props.content.id}
        connection={this.props.content.connection} />)
    } else {
      contentBody.push(<Request content={this.props.content.request} key={0} />);
      if (this.props.content.connection !== 'uninitialized') {
        contentBody.push(<ResponseContainer content={this.props.content.response} connectionType={this.props.content.connectionType} key={1} />)
      }
    }

    let openButtonStyles = {
      display: (this.props.content.connection === 'uninitialized' || this.props.content.connection === 'closed' || this.props.content.connection === 'error') ? 'block' : 'none',
    }
    let closeButtonStyles = {
      display: (this.props.content.connection === 'pending' || this.props.content.connection === 'open') ? 'block' : 'none',
    }
    let errorStyles = {
      'display': this.props.content.connection === 'error' ? 'block' : 'none',
      'color': 'red',
    }
    let http2Display = {
      'display': this.props.content.isHTTP2 ? 'block' : 'none',
    }

    let statusLight;
    let itmArr = ['itmOne', 'itmTwo', 'itmThree', 'itmFour', 'itmFive', 'itmSix'];
    let num = document.querySelectorAll('.resreq_wrap').length;

    switch (this.props.content.connection) {
      case 'uninitialized':
        statusLight = <status-indicator></status-indicator>;
        break;
      case 'pending':
        statusLight = <status-indicator intermediary pulse></status-indicator>;
        break;
      case 'open':
        statusLight = <status-indicator positive pulse></status-indicator>;
        break;
      case 'closed':
        statusLight = <status-indicator negative></status-indicator>;
        break;
      case 'error':
        statusLight = <status-indicator negative></status-indicator>;
        break;
      default:
        console.log('not a valid connection for content object');
    }

    return (
      <div className={"resreq_wrap"} id={this.props.content.id}>
        {/* ReqRes */}

        <div className="title-row">
          <div>
            <span className={'primary-title title-offset_top highlighter title_reverse-offset'}>{this.props.content.request.method}</span>
            <span className={'primary-title title-offset_top'}> {this.props.content.url}</span></div>
        </div>

        <div className="nested-grid-6">
          <div>
            <input
              id={this.props.content.id}
              checked={this.props.content.checked}
              className="resreq_select-radio"
              name="resreq-select"
              type="checkbox"
              onChange={this.onCheckHandler}
            />
          </div>

          <div className={'btn-sm'}>
            <OpenBtn stylesObj={openButtonStyles} content={this.props.content} connectionStatus={this.props.content.connection} />
            <CloseBtn stylesObj={closeButtonStyles} content={this.props.content} connectionStatus={this.props.content.connection} />
          </div>
          <div className={'btn-sm '}>
            <button className={'btn resreq_remove'} onClick={this.removeReqRes}>Remove</button>
          </div>
          <div>{statusLight}</div>
          <div>
            <span className="tertiary-title">{this.props.content.connectionType}</span>
          </div>

          <div>
            <span className="tertiary-title">
              Roundtrip: {this.props.content.timeReceived - this.props.content.timeSent}
            </span>
          </div>
        </div>

        <div style={http2Display} className={'httptwo'}>
          HTTP2 connection: Requests with the same host will share a single HTTP2 connection.
        </div>

        <div style={errorStyles} className='networkerror'>There was a network error in connecting to endpoint.</div>
        {contentBody}
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ReqRes);
