/**
 * App - класс приложения заполнения wordx шаблонов на клиенте
 */
var App = function(){
    var FILE_NAME = 'word/document.xml',
        DEFAULT_DOWNLOAD_NAME = 'result.docx',
        WORDX_FILE_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    /**
     * Конструктор приложения. Создает и инициализирует приложение.
     * @constructor
     */
    function App() {
        this._ui = new Ui;
        this._init();
    }
    App.KEEP_FILE_INPUT = true;
    /**
     * Инициализирует приложение - насатривает интерфейс и связывает бизнес-логику
     * приложения с интерфейсом.
     * @private
     */
    App.prototype._init = function(){
        var that = this;
        this.busy = false;
        this.fs = new zip.fs.FS();

        this._ui.attachChooseHandler(function(file) {
            if (that.busy) {
                that.reset(App.KEEP_FILE_INPUT);
            }
            that.busy = true;
            var name;
            if (file.name) {
                name = file.name.replace(/(\.[^.]+)?$/, '_result$1');
            } else {
                name = DEFAULT_DOWNLOAD_NAME;
            }
            that._fileType = file._type || WORDX_FILE_TYPE;

            that.fs.importBlob(file, function(){
                that._processFile(function(error, text, vars){
                    if (error) {
                        alert(error);
                        that.reset();
                        return;
                    }
                    that._ui.displayVariables(vars, function(vars){
                        that._injectImages(vars, function(){
                            that._setImageSizes(vars, function(){
                                text = that._replaceVars(text, vars);
                                that._replaceFile(text);
                                that._getWordxBlob(function(blob){
                                    that._ui.showSaveDialog(blob, name, function(){
                                        that.reset();
                                    });
                                });
                            });
                        });
                    });
                });
            }, function(){
                alert('Выбран неправильный файл!');
            });
        })
    };
    /**
     * Добавляет заданные MIME-типы в файл описания типов содержимого документа wordx.
     * Это асинхронная функция.
     * @param types массив простых объектов, описывающих MIME-типы, которые нужно добавить
     * Формат массива [{type: 'тип', extension: 'расширение'}, ...]
     * @param callback функция, вызываемая при успешном добавлении типов в файл
     * @returns {boolean} возвращает false, если не удалось записать типы в файлы, или undefined
     * @private
     */
    App.prototype._addContentTypes = function(types, callback){
        var that = this;
        var filename = "[Content_Types].xml";
        var contentTypes;

        var file = this.fs.find(filename);

        if (!file) {
            alert('Файла не существует!');
            return false;
        }

        types = types
            .reduce(function(uniqueTypes, typeObj){
                uniqueTypes[typeObj.extension] = typeObj.type;
                return uniqueTypes;
            }, {});

        contentTypes = Object.getOwnPropertyNames(types)
            .map(function(extension){
                return '<Default Extension="' + extension + '" ContentType="' + types[extension] + '" />';
            })
            .join('');

        file.getText(function(text){
            text = text.replace(/<\/Types>/, contentTypes + '</Types>');
            that.fs.remove(file);
            that.fs.root.addText(filename, text);
            callback();
        });
    };
    /**
     * Связывает документ с изображениями, заданными для подстановки вместо
     * переменных, с помощью файла связей документа docx.
     * @param imgVars массив переменных шаблона типа "изображение"
     * @param callback функция, которая будет вызывана, если подстановка
     * прошла успешно
     * @returns {boolean} возвращает false, если не удалось выполнить
     * подстановку, иначе undefined
     * @private
     */
    App.prototype._addRels = function(imgVars, callback){
        var that = this;
        var filename = "word/_rels/document.xml.rels";

        var file = this.fs.find(filename);

        if (!file) {
            alert('Файла не существует!');
            return false;
        }

        file.getText(function(text){
            var ridRe = /Id\s*=\s*"rId(\d+)"/g,
                maxId = 0,
                relations;

            while ((match = ridRe.exec(text)) != null) {
                maxId = Math.max(maxId, +match[1]);
            }

            relations = imgVars
                .map(function(imgVar){
                    imgVar.rid = ++maxId;
                    return '<Relationship Id="rId'+ (imgVar.rid) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../' + imgVar.uniqueName + '"/>';
                })
                .join('');

            text = text.replace(/<\/Relationships>/, relations + '</Relationships>');
            that.fs.remove(file);
            that.fs.root.addText(filename, text);

            callback(imgVars);
        });
    };
    /**
     * Встраивает в документ изображения, указанные в качестве значений соответствующих
     * переменных шаблона.
     * @param vars Массив, описывающий переменные шаблона и их значения
     * @param callback Функция, которая будет вызвана, если встаривание прошло успешно.
     * @private
     */
    App.prototype._injectImages = function(vars, callback){
        var that = this,
            imgVars = Object.getOwnPropertyNames(vars)
                .filter(function(varName){
                    //отбираем только переменные-картинки, и только если они были заданы
                    return varName.indexOf('img_') === 0 && vars[varName] != null;
                })
                .map(function(varName){
                    return vars[varName];
                }),
            contentTypes;

        //нет переменных-картинок
        if (!imgVars.length) {
            callback();
            return;
        }

        //делаем имена файлов картинок уникальными
        imgVars
            .forEach(function(imgVar, idx){
                imgVar.uniqueName = imgVar.name.replace(/(\.[^\.]+)$/, '') + idx + RegExp.$1;
            });

        contentTypes = imgVars
            .map(function(imgVar){
                var blob = new Blob([imgVar], {type: imgVar.type}),
                    extension = imgVar.uniqueName.replace(/^.*\.([^\.]+)$/, '$1'),
                    image = new Image;
                that.fs.root.addBlob(imgVar.uniqueName, blob);
                return {
                    extension: extension,
                    type: imgVar.type
                };
            });

        this._addContentTypes(contentTypes, function(){
            that._addRels(imgVars, callback);
        });
    };
    /**
     * Заменяет содержимое документа (только разметку самого документа,
     * без других служебных файлов) на заданное.
     * @param text новая разметка содержимого документа
     * @private
     */
    App.prototype._replaceFile = function(text){
        this.fs.remove(this.file);
        this.fs.root.addText(FILE_NAME, text);
    };
    /**
     * Возвращает документ в виде Blob объекта
     * @param callback функция, которая будет вызвана,
     * когда документ успешно преобразован в Blob
     * обхект. Первым параметром это функции будет
     * передан сам Blob объект документа
     * @private
     */
    App.prototype._getWordxBlob = function(callback){
        var that = this;

        this.fs.exportBlob(function(blob){
            if (that._fileType) {
                //ставим blob'у обратно изначальный тип файла, т. к. exportBlob возвращает zip
                blob = new Blob([blob], {
                    type: that._fileType
                });
            }
            callback(blob);
        }, null, null);
    };
    /**
     * Извлекает из разметки документа переменные и передает их в функцию callback вместе
     * с разметкой документа.
     * @param callback функция, которая будет вызвана, когда разметка и переменные в ней
     * извлечены. Первым параметром ей будет передана разметка, а вторым массив имен
     * переменных
     * @returns {boolean} возвращает false в случае неудачи, иначе true
     * @private
     */
    App.prototype._processFile = function(callback){
        var that = this;

        this.file = this.fs.find(FILE_NAME);
        if (!this.file) {
            alert('Файла не существует!');
            callback('Файла не существует!');
            return false;
        }
        this.file.getText(function(text){
            //text = that._replaceVars(text);
            that._normalizeMarkup(text, function(error, markup){
                if (error) {
                    callback(error);
                    return;
                }
                var vars = that._findVars(markup);
                callback(null, markup, vars);
            });
        });
        return true;
    };
    App.prototype._normalizeMarkup = function(xml, callback){
        kiss.parse(xml, {trim: false}, function(error, nodes){
            if (error) {
                callback(error);
                return;
            }

            var root;
            for (var i = 0; i < nodes.length; ++i) {
                if (typeof nodes[i] === 'object' && nodes[i].name === 'w:document') {
                    root = nodes[i];
                    break;
                }
            }
            if (!root) {
                console.log('Не найден узел документа!');
                callback('Не найден узел документа!');
                return;
            }

            var state = 'NEUTRAL',
                targetTextNode,
                candidates = [];

            traverse(root);
            console.log(root);
            callback(null, kiss.serialize(nodes));

            function traverse(node){
                var openBracketPos,
                    closeBracketPos;
                if (typeof node !== 'object') {
                    return;
                }
                if (node.name === 'w:t' && node.text != null) {
                    if (state === 'NEUTRAL') {
                        openBracketPos = node.text.indexOf('{');
                        if (openBracketPos !== -1 && node.text.indexOf('}', openBracketPos + 1) === -1) {
                            state = 'VARIABLE';
                            targetTextNode = node;
                            candidates.length = 0;
                        }
                    } else if (state === 'VARIABLE') {
                        closeBracketPos = node.text.indexOf('}');
                        if (closeBracketPos === -1) {
                            candidates.push(node);
                        } else {
                            targetTextNode.text += candidates
                                .map(function(node){
                                    var text = node.text;
                                    node.text = '';
                                    return text;
                                }).join('');
                            candidates.length = 0;
                            targetTextNode.text += node.text.substring(0, closeBracketPos + 1);
                            node.text = node.text.substr(closeBracketPos + 1);
                            state = 'NEUTRAL';
                            targetTextNode = null;
                        }
                    }
                    return;
                }
                if (node.children) {
                    for (var i = 0; i < node.children.length; ++i) {
                        traverse(node.children[i]);
                    }
                }
            }
        });
    };
    /**
     * Извлекает из переданной разметки имена переменных и возвращает их
     * в виде массива.
     * @param text разметка документа
     * @returns {Array} массив найденных имент переменных
     * @private
     */
    App.prototype._findVars = function(text){
        var myRe = /{(?:<[^>]+?>)*?([a-zA-Zа-яА-Я][a-zA-Zа-яА-Я-_]*)(?:<[^>]+?>)*?}/g,
            vars = [],
            varsAdded = {},
            match;
        while ((match = myRe.exec(text)) != null) {
            if (!(match[1] in varsAdded)) {
                vars.push(match[1]);
                varsAdded[match[1]] = true;
            }
        }
        return vars;
    };
    /**
     * Перебирает переданный массив переменных шаблона со значениями и
     * проставляет найденным в нем переменным-изображениям размеры.
     * @param vars массив переменных шаблона со значениями
     * @param callback функция, которая будет вызвана, когда обработка
     * массива завершена
     * @private
     */
    App.prototype._setImageSizes = function(vars, callback){
        var images = [],
            imagesLeft;

        Object.getOwnPropertyNames(vars).forEach(function(varname){
            if (varname.toLowerCase().indexOf('img_') !== 0) {
                return;
            }
            if (vars[varname] == null) {
                return;
            }

            images.push(vars[varname]);
        });

        if (!images.length) {
            callback();
        }

        imagesLeft = images.length;
        function imageDone(){
            if (--imagesLeft <= 0) {
                callback();
            }
        }

        images.forEach(function(imgVar){
            var blob = new Blob([imgVar], {type: imgVar.type}),
                image = new Image;
            image.onload = image.onerror = function(){
                imgVar.width = image.width;
                imgVar.height = image.height;
                imageDone();
            };
            image.src = (window.URL || window.WebkitURL).createObjectURL(blob);
        });
    };
    /**
     * Заменяет в переданной разметке документа переменные шаблона на их значения
     * (или на пустую строку, если значение не задано)
     * @param text разметка документа
     * @param vars массив переменных шаблона со значениями
     * @returns string возвращает разметку после подстановки значений переменных
     * @private
     */
    App.prototype._replaceVars = function(text, vars){
        var myRe = /{((?:<[^>]+?>)*?)([a-zA-Zа-яА-Я][a-zA-Zа-яА-Я-_]*)((?:<[^>]+?>)*?)}/g;

        text = text.replace(myRe, function(full, before, varname, after){
            var tmpl;

            //не строка - значит картинка
            if (typeof vars[varname] !== 'string') {
                //картинка не была выбрана - вставляем пустоту
                if (vars[varname] == null) {
                    tmpl = '';
                } else {
                    tmpl = '<w:pict>' +
                        '<v:shape id="myShape' + vars[varname].rid + '" style="width:' + vars[varname].width + '; height: ' + vars[varname].height + '">' +
                        '<v:imagedata r:id="rId' + vars[varname].rid + '"/>' +
                        '</v:shape>' +
                        '</w:pict>';
                }

                return before + tmpl + after;
            //чекбокс
            } else if (/^checkbox_/i.test(varname)) {
                tmpl =
//                '<w:p>' +
                    '<w:r>' +
                        '<w:fldChar w:fldCharType="begin">' +
                            '<w:ffData w:enabled="">' +
                                '<w:name w:val="' + varname + '"/>' +
                                '<w:calcOnExit w:val="0"/>' +
                                '<w:checkBox w:sizeAuto="">' +
                                    '<w:default w:val="' + vars[varname] + '"/>' +
                                '</w:checkBox>' +
                            '</w:ffData>' +
                        '</w:fldChar>' +
                    '</w:r>' +
                    '<w:r>' +
                        '<w:instrText xml:space="preserve">FORMCHECKBOX</w:instrText>' +
                    '</w:r>' +
                    '<w:r>' +
                        '<w:fldChar w:fldCharType="separate"/>' +
                    '</w:r>' +
                    '<w:r>' +
                        '<w:fldChar w:fldCharType="end"/>' +
                    '</w:r>' +
                    '<w:r>' +
                        '<w:rPr>' +
                            '<w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/>' +
                        '</w:rPr>' +
                        '<w:t xml:space="preserve"></w:t>' + //какой-то текст тут
                    '</w:r>' /*+
                '</w:p>'*/;

                return before + tmpl + after;
            //значение
            } else {
                return before + vars[varname] + after;
            }
        });

        return text;
    };
    /**
     * Сбрасывает приложение в начальное состояние
     * @param keepFileInput boolean параметр, определяющий нужно ли заново
     * создавать виджет выбора файла (true - да, false - нет)
     */
    App.prototype.reset = function(keepFileInput){
        this.fs = new zip.fs.FS();
        this._ui.reset(keepFileInput);
        this.busy = false;
    };

    return App;
}();

$(document).ready(function(){
    //Создание и инициализация приложения
    var app = window.app = new App();
});