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
    Ui.prototype.showSaveDialog = function(blob, fileName){
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
        }, 0);
    };
    Ui.prototype.attachChooseHandler = function(callback){
        var fileInput = document.getElementById('file-input');

        fileInput.addEventListener('change', function() {
            callback(fileInput.files[0]);
        }, false);
    };
    //Ui.prototype.attachSaveHandler = function(callback){
    //    this._saveHandler = callback;
    //};
    Ui.prototype.displayVariables = function(vars, callback){
        var tmpl = '';
        for (var k = 0; k < vars.length; k++) {
            tmpl = tmpl + "<div>" + vars[k] + "<input class='j-field' id='var_" + vars[k] + "'></div>";
        }
        tmpl = tmpl + "<div><button class='j-save'>Сохранить!</button></div>";
        $('.j-fields')
            .append(tmpl)
            .on('click', '.j-save', function(e){
                e.preventDefault();

                var newVars = {};
                vars.forEach(function(varname){
                    newVars[varname] = $('#var_' + varname).val();
                });

                callback(newVars);
            });
    };


    return Ui;
}();