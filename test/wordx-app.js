var express = require('express');
var app = express(); //создание express-приложения

//middleware-обработчик для подстановки разрешающего CORS заголовка
app.use(function(req, res, next){
	res.set('Access-Control-Allow-Origin', '*');
	next();
});

//правильн для редиректа с / на /index.html
app.get('/', function(req, res){
  res.redirect('/index.html');
});

//миддлвара для отдачи статических файлов в текущей директории
app.use(express.static('.'));

//создание локального сервера на 3002 порту
var server = app.listen(3002, '127.0.0.1', function(){
    var host = server.address().address;
    var port = server.address().port;

    console.log('Wordx app listening at http://%s:%s', host, port)
});
