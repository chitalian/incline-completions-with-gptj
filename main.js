const http = require('http');

const postData = JSON.stringify({
    "params": {
        "top_k": 40,
        "top_p": 0.9,
        "temp": 0.8,
        "gen_len": 512
    },
    "body": "English: I pooped my pants\nSpanish:"
});

const options = {
  hostname: '192.168.2.244',
  port: 8789,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();