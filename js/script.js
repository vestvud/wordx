$(document).ready(function(){

    function handleFileSelect(evt) {
        var files = evt.target.files;

        var reader = new FileReader();

        reader.onload = (function(theFile) {
            return function(e) {
                console.log( "e.target", e.target.result );
                console.log("file2", theFile);
            };
        })(files[0]);

        reader.readAsArrayBuffer(files[0]);

    }

    $(".j-add").on("change", handleFileSelect);
});