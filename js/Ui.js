var Ui = function(){
    function Ui() {
    }
    Ui.prototype._createObjectUrl = function(file) {
        if (window.webkitURL) {
            return window.webkitURL.createObjectURL(file);
        } else if (window.URL && window.URL.createObjectURL) {
            return window.URL.createObjectURL(file);
        } else {
            return null;
        }
    };
    Ui.prototype.showSaveDialog = function(blob, fileName, callback){
        var blobUrl = this._createObjectUrl(blob),
            downloadLink = document.createElement('a');
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.href = blobUrl;
        downloadLink.download = fileName;
        downloadLink.target = '_blank';
        downloadLink.click();
        setTimeout(function(){
            $(downloadLink).remove();
            if (callback) callback();
        }, 0);
    };
    Ui.prototype.attachChooseHandler = function(callback){
        this._chooseHandler = callback;

        $('#file-input').on('change', function(e) {
            var input = $(this)[0];
            if (!input.files.length) {
                return;
            }
            callback(input.files[0]);
        });
    };
    Ui.prototype.displayVariables = function(vars, callback){
        var tmpl = '<span class="instuction">Заполните ключевые слова:</span>';
        for (var k = 0; k < vars.length; k++) {
            if (vars[k] === "img") {
                tmpl = tmpl + "<div><b>" + vars[k] + ":</b><input type='file' accept='image/jpeg,image/png' class='j-field field_file' id='var_" + vars[k] + "'></div>";
            } else {
                tmpl = tmpl + "<div><b>" + vars[k] + ":</b><input class='j-field field' id='var_" + vars[k] + "'></div>";
            }
        }
        tmpl = tmpl + "<div><button class='j-save'>Сохранить!</button></div>";

        $('.j-fields')
            .append(tmpl)
            .on('click.wordx', '.j-save', function(e){
                e.preventDefault();

                var newVars = {};
                vars.forEach(function(varname){
                    if (varname === "img") {
                        var files = $('#var_' + varname).get(0).files;
                        if (files.length) {
                            newVars[varname] = files[0];
                        } else {
                            newVars[varname] = null;
                        }
                    } else {
                        newVars[varname] = $('#var_' + varname).val();
                    }
                });

                callback(newVars);
            });
    };
    Ui.prototype.reset = function(keepFileInput){
        var input = '<input class="j-file-inp" type="file" accept="application/zip" id="file-input">';
        $('.j-fields')
            .empty()
            .off('.wordx');

        if (!keepFileInput) {
            $('#file-input').replaceWith(input);
            this.attachChooseHandler(this._chooseHandler);
        }
    };


    return Ui;
}();