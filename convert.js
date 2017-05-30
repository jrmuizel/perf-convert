'use strict';
function _createThread(name, tid) {
  const markers = {
    schema: {
      name: 0,
      time: 1,
      data: 2,
    },
    data: [],
  };
  const samples = {
    schema: {
      stack: 0,
      time: 1,
      responsiveness: 2,
      rss: 3,
      uss: 4,
      frameNumber: 5,
    },
    data: [],
  };
  const frameTable = {
    schema: {
      location: 0,
      implementation: 1,
      optimizations: 2,
      line: 3,
      category: 4,
    },
    data: [],
  };
  const stackTable = {
    schema: {
      frame: 0,
      prefix: 1,
    },
    data: [],
  };
  const stringTable = [];

  const stackMap = new Map();
  function getOrCreateStack(frame, prefix) {
    const key = (prefix === null) ? `${frame}` : `${frame},${prefix}`;
    let stack = stackMap.get(key);
    if (stack === undefined) {
      stack = stackTable.data.length;
      stackTable.data.push([frame, prefix]);
      stackMap.set(key, stack);
    }
    return stack;
  }

  const frameMap = new Map();
  function getOrCreateFrame(frameString) {
    let frame = frameMap.get(frameString);
    if (frame === undefined) {
      frame = frameTable.data.length;
      const stringIndex = stringTable.length;
      stringTable.push(frameString);
      frameTable.data.push([stringIndex]);
      frameMap.set(frameString, frame);
    }
    return frame;
  }

  function addSample(stackArray, time) {
    const stack = stackArray.reduce((prefix, frameString) => {
      const frame = getOrCreateFrame(frameString);
      return getOrCreateStack(frame, prefix);
    }, null);
    samples.data.push([stack, time])
  }

  return {
    addSample,
    finish: () => {
      return {
        tid, name, markers, samples, frameTable, stackTable, stringTable,
      };
    },
  };
}

function _convertThreads(profile) {
  const threads = new Map();
  let time = 0;
  for (const line of profile.split('\n')) {
    const lineParts = line.split(';');
    const [threadName, tid] = lineParts.shift().split('/');
    if (!tid) {
      continue;
    }
    let thread = threads.get(tid);
    if (thread === undefined) {
      thread = _createThread(threadName, tid);
      threads.set(tid, thread);
    }
    thread.addSample(lineParts, time++);
  }
  return Array.from(threads.values()).map(thread => thread.finish());
}

/**
* Convert the old cleopatra format into the serialized preprocessed format
* version zero.
* @param {object} profile The input profile.
* @returns A "preprocessed" profile that needs to be run through the
*          "preprocessed format" compatibility conversion.
*/
function convertJeffFormat(profile) {
  return {
    meta: {
      abi: 'x86_64-gcc3',
      interval: 1,
      misc: 'rv:48.0',
      oscpu: 'Intel Mac OS X 10.11',
      platform: 'Macintosh',
      processType: 0,
      product: 'Firefox',
      stackwalk: 1,
      startTime: 1460221352723.438,
      toolkit: 'cocoa',
      version: 4,
    },
    libs: [],
    threads: _convertThreads(profile),
  };
}

var content = '';
process.stdin.resume();
process.stdin.on('data', function(buf) { content += buf.toString(); });
process.stdin.on('end', function() {
  console.log(JSON.stringify(convertJeffFormat(content)));
});
