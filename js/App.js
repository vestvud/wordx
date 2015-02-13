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
                        text = that._replaceVars(text, vars);
                        that._replaceFile(text);
                        that._getWordxBlob(function(blob){
                            that._ui.showSaveDialog(blob, name, function(){
                                that.reset();
                            });
                        });
                    });
                });
            }, function(){
                console.log('Мы все останемся без печенек!');
            });
        })
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
            console.log('А еще у нас выпала вся шерстка!');
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
    App.prototype._replaceVars = function(text, vars){
        var myRe = /{((?:<[^>]+?>)*?)([a-zA-Z]+)((?:<[^>]+?>)*?)}/g;

        text = text.replace(myRe, function(full, before, varname, after){
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