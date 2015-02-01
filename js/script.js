(function(obj) {

    function template(data) {
        $(".j-template").html(data);

        var myRe = /{((?:<[^>]+?>)*?)([a-zA-Z]+)((?:<[^>]+?>)*?)}/g,
            arr = [],
            tmpl = "";

        while (match = myRe.exec(data) ) {
            arr.push({
                position: match.index,
                skipBefore: match[1].length,
                skipAfter: match[3].length,
                token: match[2]
            });
        }

        for (var k = 0; k < arr.length; k++) {
            tmpl = tmpl + "<div>" + arr[k].token + "<input class='j-field' data-id='" + arr[k].token + "'></div>";
        }
        tmpl = tmpl + "<div><button class='j-save'>Сохранить!</button></div>";
        $(".j-fields").append(tmpl);

        save(data, arr);
    }

    function save(data, arr) {
        $(".j-save").on("click", function(e){
            e.preventDefault();
            var obj = {}, fileNew = "";

            $(".j-field").each(function(){
                var $this = $(this),
                    id = $(this).data("id"),
                    val = $(this).val();

                obj[id] = val;
            });

            var pos, data2;
            arr.reverse().forEach(function(entry){
                pos = 0;
                data2 = data.substring(pos, entry.position);
                pos += entry.position + 1;
                data2 += data.substr(pos, entry.skipBefore);
                pos += entry.skipBefore + entry.token.length;
                data2 += obj[entry.token] + data.substr(pos, entry.skipAfter);
                pos += entry.skipAfter;
                data2 += data.substr(pos + 1);

                data = data2;
            });

            $(".j-data").append(data);
        })
    }

	(function() {
		var fileInput = document.getElementById("file-input");

		fileInput.addEventListener('change', function() {
            zip.createReader(new zip.BlobReader(fileInput.files[0]), function(reader) {

                reader.getEntries(function(entries) {
                    if (entries.length) {

                        entries.forEach(function(elem, i){
                            if (elem.filename === "word/document.xml") {
                                elem.getData(new zip.TextWriter(), function(data) {
                                    template(data);
                                    reader.close(function() {
                                        console.log("haha");
                                    });

                                }, function(current, total) {
                                    // onprogress callback
                                });
                            }
                        })
                    }
                });
            }, function(error) {
            });
		}, false);
	})();

    // use a BlobWriter to store the zip into a Blob object
    zip.createWriter(new zip.BlobWriter(), function(writer) {

        writer.add("filename.txt", new zip.TextReader("test!"), function() {
            // onsuccess callback

            // close the zip writer
            writer.close(function(blob) {
                // blob contains the zip file as a Blob object

            });
        }, function(currentIndex, totalIndex) {
            // onprogress callback
        });
    }, function(error) {
        // onerror callback
    });

})(this);
