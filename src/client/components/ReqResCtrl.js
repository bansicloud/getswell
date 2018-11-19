import * as store from '../store';
import * as actions from '../actions/actions';

const ReqResCtrl = {
  openConnectionArray:[],


  /* Iterates across REQ/RES Array and opens connections for each object and passes each object to fetchController */
  openAllEndPoints(e) {
    const gotState = store.default.getState();
    const reqResArr = gotState.business.reqResArray;
    ReqResCtrl.closeAllEndpoints(e);

    reqResArr.forEach(reqResObj => {
      const reqResId = reqResObj.id;
        ReqResCtrl.setAbortCtrl(reqResId);
    })
    reqResObj.connection = 'open';
  },

  closeEndPoint(e) {
    const gotState = store.default.getState();
    const reqResArr = gotState.business.reqResArray;
    let reqResObj;
    ReqResCtrl.openConnectionArray.forEach((el) => {
      if(el.id == e.target.id){
        reqResObj = el;
      }
    });

    reqResArr.forEach((el) => {
      if(el.id == e.target.id) {
        el.connection = 'closed';
        store.default.dispatch(actions.reqResUpdate(el));
      }
    });

    reqResObj.abort.abort();

    const openConnectionObj = {
      abort : new AbortController(),
    }
    ReqResCtrl.openConnectionArray.push(openConnectionObj);
  },

  /* Closes all open endpoint */
  closeAllEndpoints(e) {
    console.log('closeall!');
    const gotState = store.default.getState();
    const reqResArr = gotState.business.reqResArray;
    let reqResObj;

    reqResArr.forEach((el) => {
      console.log('el', el.id)
      console.log('e.target.id', e.target.id)
      el.connection = 'closed';
      store.default.dispatch(actions.reqResUpdate(el));
    });

    ReqResCtrl.openConnectionArray.forEach(abortObject => {
      abortObject.abort.abort();
      let openConnectionObj = {
        abort: new AbortController(),
      }
      ReqResCtrl.openConnectionArray.push(openConnectionObj);
    });
  },

  clearAllEndPoints(e) {
    const gotState = store.default.getState();
    const reqResArr = gotState.business.reqResArray;
    store.default.dispatch(actions.reqResClear());
    ReqResCtrl.closeAllEndpoints(e);

    reqResArr.forEach((el) => {
      if (el.id == e.target.id) {
        el.connection = 'closed';
        store.default.dispatch(actions.reqResUpdate(el));
      }
    });
  },

  setAbortCtrl(id) {
    const openConnectionObj = {
      abort : new AbortController(),
      id: id,
    }
    const gotState = store.default.getState();
    const reqResArr = gotState.business.reqResArray;
    // Search the store for the passed in ID
    const reqResObj = reqResArr.find((el) => el.id == openConnectionObj.id);
    ReqResCtrl.openConnectionArray.push(openConnectionObj);
    ReqResCtrl.parseReqObject (reqResObj, openConnectionObj.abort);
  },

  parseReqObject(object, abortController) {
    let { url, request: { method }, request: { headers }, request: { body } } = object;

    method = method.toUpperCase();
    
    let formattedHeaders = {};
    headers.forEach(head => {
      formattedHeaders[head.key] = head.value
    })
    //add the original URL as a targetURL for proxy to read from
    formattedHeaders.targetUrl = url;
    formattedHeaders.targetMethod = method;


    let outputObj = {
      method: 'GET',
      // mode: "cors", // no-cors, cors, *same-origin
      // // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: "same-origin", // include, *same-origin, omit
      headers: formattedHeaders,
      // redirect: "follow", // manual, *follow, error
      // referrer: "no-referrer", // no-referrer, *client
    };

    if (method !== 'GET' && method !== 'HEAD') {
      outputObj.body = body;
    }

    this.fetchController(outputObj, url, object, abortController)
  },

  /* Utility function to open fetches */
  fetchController(parsedObj, url, originalObj, abortController) {
    let timeSentSnap = Date.now();

    const newObj = JSON.parse(JSON.stringify(originalObj));
    newObj.connection = 'pending';
    store.default.dispatch(actions.reqResUpdate(newObj));

    const signal = abortController.signal;

    parsedObj.signal = signal; 

    return fetch('http://localhost:80/cors', parsedObj)
    .then(response => {
      console.log('RESPONSE RECEIVED BY FRONT END',response);

      let heads = {};

      for (let entry of response.headers.entries()) {
        heads[entry[0].toLowerCase()] = entry[1];
      }

      const contentType = heads['content-type'];
      const isStream = contentType.includes('stream');

      isStream ? this.handleSSE(response, originalObj, timeSentSnap, heads) : this.handleSingleEvent(response.json(), originalObj, timeSentSnap, heads);
    })
    .catch(err => console.log(err))
  },

  handleSingleEvent(response, originalObj, timeSentSnap, headers) {
    console.log('Handling Single Event')

    const newObj = JSON.parse(JSON.stringify(originalObj));

    response.then((res) => {
      newObj.connection = 'closed';
      newObj.connectionType = 'plain';
      newObj.timeSent = timeSentSnap;
      newObj.timeReceived = Date.now();
      newObj.response = {
        headers: headers,
        events: [],
      };

      newObj.response.events.push({
        data: res,
        timeReceived: Date.now(),
      });
      store.default.dispatch(actions.reqResUpdate(newObj));
    })
  },

  /* handle SSE Streams */
  handleSSE(response, originalObj, timeSentSnap, headers) {
    let reader = response.body.getReader();

    read();

    const newObj = JSON.parse(JSON.stringify(originalObj));

    newObj.timeSent = timeSentSnap;
    newObj.timeReceived = Date.now();
    newObj.response = {
      headers,
      events: [],
    };

    newObj.connection = 'open';
    newObj.connectionType = 'SSE';

    function read() {
      reader.read().then(obj => {
        if (obj.done) {
          return;
        } 

        //decode and recursively call
        else {
          //decode
          let receivedEventFields = new TextDecoder("utf-8").decode(obj.value)

          //since the string is multi line, each for a different field, split by line
          .split('\n')
          //remove empty lines
          .filter(field => field != '')
          //massage fields so they can be parsed into JSON
          .map(field => {
            let fieldColonSplit = field
            .replace(/:/,'&&&&')
            .split('&&&&')
            .map(kv => kv.trim());

            let fieldObj = {
              [fieldColonSplit[0]] : fieldColonSplit[1],
            }

            return fieldObj;
          })
          .reduce((acc, cur) => {
            let key = Object.keys(cur)[0];
            if (acc[key]) {
              acc[key] = acc[key] + '\n' + cur[key];
            } else {
              acc[key] = cur[key];
            }
            return acc;
          },{})

          receivedEventFields.timeReceived = Date.now();
          
          newObj.response.events.push(receivedEventFields);

          store.default.dispatch(actions.reqResUpdate(newObj));
          read();
        }
      });
    }
  }
};


export default ReqResCtrl;
