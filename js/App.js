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
                        that._injectImages(vars, function(rid){
                            text = that._replaceVars(text, vars, rid);
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
    App.prototype._addContentType = function(type, callback){
        var that = this;
        var filename = "[Content_Types].xml";
        var contentType = '<Default Extension="jpg" ContentType="image/jpeg" />';

        var file = this.fs.find(filename);

        if (!file) {
            alert('Файла не существует!');
            return false;
        }
        file.getText(function(text){
            if (text.indexOf(contentType)===-1) {
                text = text.replace(/<\/Types>/, contentType + '</Types>');
                that.fs.remove(file);
                that.fs.root.addText(filename, text);
            }
            callback();
        });
    };
    App.prototype._addRels = function(imgName, callback){
        var that = this;
        var filename = "word/_rels/document.xml.rels";

        var file = this.fs.find(filename);

        if (!file) {
            alert('Файла не существует!');
            return false;
        }
        file.getText(function(text){
            var ridRe = /Id\s*=\s*"rId(\d+)"/g,
                maxId = 0;
            if (text.indexOf(contentType) === -1) {
                while ((match = ridRe.exec(text)) != null) {
                    maxId = Math.max(maxId, +match[1]);
                }

                var contentType = '<Relationship Id="rId'+ (++maxId) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../' + imgName + '"/>';

                text = text.replace(/<\/Relationships>/, contentType + '</Relationships>');
                that.fs.remove(file);
                that.fs.root.addText(filename, text);
            }
            callback(maxId);
        });
    };
    App.prototype._injectImages = function(vars, callback){
        if (!vars.img) {
            return;
        }
        var blob = new Blob([vars.img], {type: vars.img.type});
        this.fs.root.addBlob(vars.img.name, blob);
        this._addContentType(vars.img.type, function(){
            this._addRels(vars.img.name, callback);
        }.bind(this));
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
        var myRe = /{(?:<[^>]+?>)*?([a-zA-Z]+)(?:<[^>]+?>)*?}/g,
            vars = [],
            match;
        while ((match = myRe.exec(text)) != null) {
            vars.push(match[1]);
        }
        return vars;
    };
    App.prototype._replaceVars = function(text, vars, rid){
        var myRe = /{((?:<[^>]+?>)*?)([a-zA-Z]+)((?:<[^>]+?>)*?)}/g;

        text = text.replace(myRe, function(full, before, varname, after){
            if (varname === 'img') {
                var tmpl = '<w:pict>' +
                    '<v:shape id="myShape1" type="#_x0000_t75">' +
                        '<v:imagedata r:id="rId' + rid + '"/>' +
                        '</v:shape>' +
                    '</w:pict>';

                return before + tmpl + after;
            }
            return before + vars[varname] + after;
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