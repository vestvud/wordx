var express = require('express');
var app = express();

app.use(function(req, res, next){
	res.set('Access-Control-Allow-Origin', '*');
	next();
});

app.get('/', function(req, res){
  res.redirect('/index.html');
});

app.use(express.static('.'));

var server = app.listen(3002, '127.0.0.1', function(){
    var host = server.address().address;
    var port = server.address().port;

    console.log('Wordx app listening at http://%s:%s', host, port)
});
