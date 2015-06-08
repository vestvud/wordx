// Класс, реализующий интерфейс приложения заполнения wordx шаблонов на клиенте
var Ui = function(){
    /**
     * Конструктор приложения
     * @constructor
     */
    function Ui() {
    }

    /**
     * Создает для заданного файла URL, который указывает на него как
     * на ресурс
     * @param file файловых объект
     * @returns * возвращает ObjectURL или null, если его не удалось создать
     * @private
     */
    Ui.prototype._createObjectUrl = function(file) {
        if (window.webkitURL) {
            return window.webkitURL.createObjectURL(file);
        } else if (window.URL && window.URL.createObjectURL) {
            return window.URL.createObjectURL(file);
        } else {
            return null;
        }
    };
    /**
     * Показывает диалог сохранения файла
     * @param blob Blob объект, описывающий файл для сохранения
     * @param fileName имя файла, используемое при сохранении
     * @param callback (необязательная) функция, которая будет вызвана
     * после того, как диалог показан
     */
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
    /**
     * Привязывает виджету выбора файлов обработчик, вызывающий
     * заданную функцию, если был выбран хотя бы один файл
     * @param callback функция, которая будет вызвана после выбора
     * файлов (если было что-то выбрано)
     */
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
    /**
     * Показывает список переменных шаблона документа и устанавливает обработчик,
     * который будет вызван при нажатии на кнопку сохранения
     * @param vars массив переменных шаблона
     * @param callback функция для вызова при сохранении. Первым аргументом ей будет
     * передан массив переменных шаблона со значениями (введенными пользователем)
     */
    Ui.prototype.displayVariables = function(vars, callback){
        var tmpl = '<div class="instuction">Заполните, пожалуйста, ключевые слова:</div>',
            imgVarRegexp = /^img_.+$/i,
            checkboxVarRegexp = /^checkbox_.+$/i;
        for (var k = 0; k < vars.length; k++) {
            if (imgVarRegexp.test(vars[k])) {
                tmpl = tmpl + "<div><b>" + vars[k] + ":</b><input type='file' accept='image/jpeg,image/png' class='j-field field_file' id='var_" + vars[k] + "'></div>";
            } else if (checkboxVarRegexp.test(vars[k])) {
                tmpl = tmpl + "<div><b>" + vars[k] + ":</b><input type='checkbox' class='j-field' id='var_" + vars[k] + "'></div>";
            } else {
                tmpl = tmpl + "<div><b>" + vars[k] + ":</b><input class='j-field field' id='var_" + vars[k] + "'></div>";
            }
        }
        tmpl = tmpl + "<div><button class='j-save'>Сохранить!</button></div>";

        $('.j-fields')
            .append(tmpl)
            .on('click.wordx', '.j-save', function(e){
                e.preventDefault();
                console.log('saving');
                var newVars = {};
                vars.forEach(function(varname){
                    if (imgVarRegexp.test(varname)) {
                        var files = $('#var_' + varname).get(0).files;
                        if (files.length) {
                            newVars[varname] = files[0];
                        } else {
                            newVars[varname] = null;
                        }
                    } else if (checkboxVarRegexp.test(varname)) {
                        newVars[varname] = $('#var_' + varname).prop('checked') ? '1' : '0';
                    } else {
                        newVars[varname] = $('#var_' + varname).val();
                    }
                });
                console.log('saving2');
                console.log(newVars);
                callback(newVars);
            });
    };
    /**
     * Сбрасывает интерфейс приложения в начальное состояние
     * @param keepFileInput boolean Если true, создает заново виджет выбора файлов
     */
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