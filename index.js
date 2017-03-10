var http = require('http')
  , net = require('net')
  , url = require('url')
  , httpProxy = require('http-proxy');

const PORT = 6666;

// http proxy for http:// flow using http-proxy
var request = function (req, res) {
  // parsed request url
  var purl = url.parse(req.url);
  // e.g. http://weibo.com
  var target = purl.protocol + '//' + purl.host;

  console.log("info[http]: proxy for: " + target);

  // create a proxy server with http-proxy(npm package)
  var proxy = httpProxy.createProxyServer({});

  // error handling
  proxy.on('error', function (err, req, res) {
    res.end();
  });

  proxy.web(req, res, {target: target});
}

// regex for host and port
var regex_hostport = /^([^:]+)(:([0-9]+))?$/;

// get host and port from parsed url string
var getHostPortFromString = function (hostString, defaultPort) {
  var host = hostString;
  var port = defaultPort;

  // if https default port is not 443, this regex will
  // parse the real port
  // example: hostString='zhihu.com:442'
  // result = ['zhihu.com:442', 'zhihu.com', ':442', '442']
  var result = regex_hostport.exec(hostString);
  if (result != null) {
    host = result[1];
    if (result[2] != null) {
      port = result[3];
    }
  }

  return ([host, port]);
};

// socket(TCP) proxy for https://
var connect = function (req, sock, bodyhead) {
  var hostport = getHostPortFromString(req.url, 443); // default port 443
  var hostdomain = hostport[0];
  var port = parseInt(hostport[1]);

  console.log('info[https]: proxy for: ' + hostdomain + ":" + hostport);

  // create a proxy socket
  var proxySocket = new net.Socket();
  // connect to client requesting server and established basic connection
  proxySocket.connect(port, hostdomain, function() {
    proxySocket.write(bodyhead);
    sock.write('HTTP/' + req.httpVersion + ' 200 Connection established\r\n\r\n');
  });

  // proxy passing server data to client
  proxySocket.on('data', function (chunk) {
    sock.write(chunk);
  });

  // close connection
  proxySocket.on('end', function () {
    sock.end();
  });

  // close connection if error occur
  proxySocket.on('error', function (err) {
    sock.write('HTTP/' + req.httpVersion + ' 500 Connection error\r\n\r\n');
    sock.end();
  });

  // proxy passing client data to server
  sock.on('data', function (chunk) {
    proxySocket.write(chunk);
  });

  // proxy close server connection when client closed
  sock.on('end', function () {
    proxySocket.end();
  });

  // proxy close server connection when client error
  sock.on('error', function () {
    proxySocket.end();
  });
}

http.createServer()
  .on('request', request)
  .on('connect', connect)
  .on('error', function (err) {console.log('server error: ' + err);})
  .listen(PORT, '0.0.0.0');

console.log("proxy server listen on port " + PORT);
