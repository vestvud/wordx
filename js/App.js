var App = function(){
    var FILE_NAME = 'word/document.xml',
        DEFAULT_DOWNLOAD_NAME = 'result.docx',
        WORDX_FILE_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    function App() {
        this._ui = new Ui;
        this._init();
    }
    App.KEEP_FILE_INPUT = true;
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
                that._processFile(function(text, vars){
                    that._ui.displayVariables(vars, function(vars){
                        that._injectImages(vars, function(){
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
            }, function(){
                alert('Выбран неправильный файл!');
            });
        })
    };
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
                    extension = imgVar.uniqueName.replace(/^.*\.([^\.]+)$/, '$1');
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
    App.prototype._replaceFile = function(text){
        this.fs.remove(this.file);
        this.fs.root.addText(FILE_NAME, text);
    };
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
    App.prototype._processFile = function(callback){
        var that = this;

        this.file = this.fs.find(FILE_NAME);
        if (!this.file) {
            alert('Файла не существует!');
            return false;
        }
        this.file.getText(function(text){
            //text = that._replaceVars(text);
            var vars = that._findVars(text);
            callback(text, vars);
        });
        return true;
    };
    App.prototype._findVars = function(text){
        var myRe = /{(?:<[^>]+?>)*?([a-zA-Zа-яА-Я][a-zA-Zа-яА-Я-_]*)(?:<[^>]+?>)*?}/g,
            vars = [],
            match;
        while ((match = myRe.exec(text)) != null) {
            vars.push(match[1]);
        }
        return vars;
    };
    App.prototype._replaceVars = function(text, vars, rid){
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
                        '<v:shape id="myShape' + vars[varname].rid + '">' +
                        '<v:imagedata r:id="rId' + vars[varname].rid + '"/>' +
                        '</v:shape>' +
                        '</w:pict>';
                }

                return before + tmpl + after;
            //чекбокс
            } else if (/^checkbox_/i.test(varname)) {
                tmpl =
                '<w:p>' +
                    '<w:r>' +
                        '<w:fldChar w:fldCharType="begin">' +
                            '<w:ffData w:enabled="">' +
                                '<w:name w:val="' + vars[varname] + '"/>' +
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
                    '</w:r>' +
                '</w:p>';

                return before + tmpl + after;
            //значение
            } else {
                return before + vars[varname] + after;
            }
        });

        return text;
    };
    App.prototype.reset = function(keepFileInput){
        this.fs = new zip.fs.FS();
        this._ui.reset(keepFileInput);
        this.busy = false;
    };

    return App;
}();

$(document).ready(function(){
    var app = window.app = new App();
});