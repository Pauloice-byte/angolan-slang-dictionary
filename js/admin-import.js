const dictionaryFile =
    document.getElementById("dictionaryFile");

const fileInfo =
    document.getElementById("fileInfo");

const fileName =
    document.getElementById("fileName");

const fileSize =
    document.getElementById("fileSize");

const previewButton =
    document.getElementById("previewButton");

const importMessage =
    document.getElementById("importMessage");

const previewSection =
    document.getElementById("previewSection");

const previewList =
    document.getElementById("previewList");

const previewEmpty =
    document.getElementById("previewEmpty");

const previewCount =
    document.getElementById("previewCount");

const importButton =
    document.getElementById("importButton");

const cancelImportButton =
    document.getElementById("cancelImportButton");


let selectedFile = null;

let importedEntries = [];


/* =========================================
   ADMIN ACCESS
========================================= */

async function checkAdminAccess() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href = "login.html";

        return false;
    }


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();


    if (profileError || !profile) {

        window.location.href = "login.html";

        return false;
    }


    if (profile.role !== "admin") {

        window.location.href = "app.html";

        return false;
    }


    return true;
}


/* =========================================
   FILE SELECTION
========================================= */

dictionaryFile.addEventListener(
    "change",
    function () {

        const file =
            dictionaryFile.files[0];


        if (!file) {

            selectedFile = null;

            fileInfo.hidden = true;

            previewButton.disabled = true;

            return;
        }


        const fileExtension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (fileExtension !== "docx") {

            alert(
                "Please select a Microsoft Word (.docx) file."
            );

            dictionaryFile.value = "";

            selectedFile = null;

            fileInfo.hidden = true;

            previewButton.disabled = true;

            return;
        }


        selectedFile = file;


        fileName.textContent =
            file.name;


        fileSize.textContent =
            formatFileSize(file.size);


        fileInfo.hidden = false;

        previewButton.disabled = false;

        importMessage.textContent =
            "Document selected successfully.";
    }
);


/* =========================================
   FILE SIZE
========================================= */

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return `${bytes} B`;
    }


    if (bytes < 1024 * 1024) {

        return `${(bytes / 1024).toFixed(1)} KB`;
    }


    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


/* =========================================
   READ DOCX
========================================= */

async function readDocxFile(file) {

    if (typeof JSZip === "undefined") {

        throw new Error(
            "The DOCX reader could not load. Please refresh the page and try again."
        );
    }


    const arrayBuffer =
        await file.arrayBuffer();


    const zip =
        await JSZip.loadAsync(arrayBuffer);


    const documentFile =
        zip.file("word/document.xml");


    if (!documentFile) {

        throw new Error(
            "Unable to find the document content inside this Word file."
        );
    }


    const xml =
        await documentFile.async("string");


    return extractParagraphs(xml);
}


/* =========================================
   EXTRACT PARAGRAPHS
========================================= */

function extractParagraphs(xml) {

    const parser =
        new DOMParser();


    const document =
        parser.parseFromString(
            xml,
            "application/xml"
        );


    const parserError =
        document.querySelector("parsererror");


    if (parserError) {

        throw new Error(
            "The Word document could not be read."
        );
    }


    const paragraphs =
        Array.from(
            document.getElementsByTagName("w:p")
        );


    const result = [];


    paragraphs.forEach(
        function (paragraph) {

            const textNodes =
                Array.from(
                    paragraph.getElementsByTagName("w:t")
                );


            const text =
                textNodes
                    .map(
                        function (node) {
                            return node.textContent;
                        }
                    )
                    .join("")
                    .trim();


            if (text) {

                result.push(text);
            }
        }
    );


    return result;
}


/* =========================================
   PARSE DICTIONARY
========================================= */

function parseDictionary(paragraphs) {

    const entries = [];


    let index = 0;


    while (index < paragraphs.length) {

        const word =
            paragraphs[index]
                ? paragraphs[index].trim()
                : "";


        const meaning =
            paragraphs[index + 1]
                ? paragraphs[index + 1].trim()
                : "";


        const example =
            paragraphs[index + 2]
                ? paragraphs[index + 2].trim()
                : "";


        if (!word) {

            index++;

            continue;
        }


        /*
         * Every dictionary entry is:
         *
         * Word
         * Meaning
         * Example
         */


        if (!meaning || !example) {

            entries.push({

                word: word,

                meaning: meaning,

                example: example,

                valid: false

            });


            break;
        }


        entries.push({

            word: word,

            meaning: meaning,

            example: example,

            valid: true

        });


        index += 3;
    }


    return entries;
}


/* =========================================
   PREVIEW
========================================= */

previewButton.addEventListener(
    "click",
    async function () {

        if (!selectedFile) {

            return;
        }


        previewButton.disabled = true;

        importButton.disabled = true;


        importMessage.textContent =
            "Reading dictionary document...";


        try {

            const paragraphs =
                await readDocxFile(
                    selectedFile
                );


            if (paragraphs.length === 0) {

                throw new Error(
                    "No text was found in this Word document."
                );
            }


            importedEntries =
                parseDictionary(
                    paragraphs
                );


            if (importedEntries.length === 0) {

                throw new Error(
                    "No dictionary entries could be found."
                );
            }


            previewSection.hidden = false;


            renderPreview();


            const invalidEntries =
                importedEntries.filter(
                    function (entry) {
                        return !entry.valid;
                    }
                );


            if (invalidEntries.length > 0) {

                importMessage.textContent =
                    `Found ${importedEntries.length} entries, but ${invalidEntries.length} need attention.`;

            } else {

                importMessage.textContent =
                    `Successfully found ${importedEntries.length} dictionary entries.`;
            }


        } catch (error) {

            console.error(
                "DICTIONARY IMPORT ERROR:",
                error
            );


            importedEntries = [];


            previewSection.hidden = false;


            renderPreview();


            importMessage.textContent =
                error.message ||
                "Unable to read the dictionary document.";

        } finally {

            previewButton.disabled = false;
        }
    }
);


/* =========================================
   PREVIEW RENDERING
========================================= */

function renderPreview() {

    previewList.innerHTML = "";


    previewCount.textContent =
        importedEntries.length;


    if (importedEntries.length === 0) {

        previewEmpty.hidden = false;

        importButton.disabled = true;

        return;
    }


    previewEmpty.hidden = true;


    const hasInvalid =
        importedEntries.some(
            function (entry) {
                return !entry.valid;
            }
        );


    importButton.disabled =
        hasInvalid;


    importedEntries.forEach(
        function (entry, index) {

            const card =
                document.createElement("div");


            card.className =
                "import-preview-card";


            card.innerHTML = `

                <div>

                    <strong>
                        ${escapeHtml(entry.word)}
                    </strong>

                    ${
                        entry.meaning
                            ? `<p>
                                ${escapeHtml(entry.meaning)}
                               </p>`
                            : `<p class="missing">
                                Meaning missing
                               </p>`
                    }

                    ${
                        entry.example
                            ? `<p>
                                <em>
                                    ${escapeHtml(entry.example)}
                                </em>
                               </p>`
                            : `<p class="missing">
                                Example missing
                               </p>`
                    }

                </div>


                <span>
                    ${
                        entry.valid
                            ? "Draft"
                            : "Needs attention"
                    }
                </span>

            `;


            previewList.appendChild(card);
        }
    );
}


/* =========================================
   IMPORT INTO SUPABASE
========================================= */

importButton.addEventListener(
    "click",
    async function () {

        if (importedEntries.length === 0) {

            return;
        }


        const invalidEntries =
            importedEntries.filter(
                function (entry) {
                    return !entry.valid;
                }
            );


        if (invalidEntries.length > 0) {

            alert(
                "Please correct the incomplete entries before importing."
            );

            return;
        }


        const confirmed =
            confirm(
                `Import ${importedEntries.length} entries as drafts?`
            );


        if (!confirmed) {

            return;
        }


        importButton.disabled = true;

        previewButton.disabled = true;


        importMessage.textContent =
            "Importing dictionary entries...";


        try {

            let importedCount = 0;

            let skippedCount = 0;


            for (
                const entry of importedEntries
            ) {

                /*
                 * Check whether the word already exists.
                 */

                const {
                    data: existingWord,
                    error: existingError
                } = await supabaseClient
                    .from("words")
                    .select("id")
                    .ilike("word", entry.word)
                    .maybeSingle();


                if (existingError) {

                    throw existingError;
                }


                if (existingWord) {

                    skippedCount++;

                    continue;
                }


                /*
                 * Create the word as a draft.
                 */

                const {
                    data: wordData,
                    error: wordError
                } = await supabaseClient
                    .from("words")
                    .insert({

                        word: entry.word,

                        is_premium: false,

                        is_published: false,

                        short_meaning: entry.meaning

                    })
                    .select("id")
                    .single();


                if (wordError) {

                    throw wordError;
                }


                /*
                 * Create the meaning.
                 */

                const {
                    data: meaningData,
                    error: meaningError
                } = await supabaseClient
                    .from("meanings")
                    .insert({

                        word_id:
                            wordData.id,

                        meaning:
                            entry.meaning,

                        display_order: 1

                    })
                    .select("id")
                    .single();


                if (meaningError) {

                    throw meaningError;
                }


                /*
                 * Create the example.
                 */

                const {
                    error: exampleError
                } = await supabaseClient
                    .from("examples")
                    .insert({

                        meaning_id:
                            meaningData.id,

                        example_text:
                            entry.example,

                        display_order: 1

                    });


                if (exampleError) {

                    throw exampleError;
                }


                importedCount++;
            }


            importMessage.textContent =
                `Import complete. ${importedCount} entries imported as drafts${skippedCount > 0 ? `, ${skippedCount} duplicates skipped` : ""}.`;


            importButton.disabled = true;


        } catch (error) {

            console.error(
                "DATABASE IMPORT ERROR:",
                error
            );


            importMessage.textContent =
                error.message ||
                "Unable to import dictionary entries.";


            importButton.disabled = false;
        } finally {

            previewButton.disabled = false;
        }
    }
);


/* =========================================
   CANCEL
========================================= */

cancelImportButton.addEventListener(
    "click",
    function () {

        importedEntries = [];

        selectedFile = null;

        dictionaryFile.value = "";

        previewList.innerHTML = "";

        previewSection.hidden = true;

        fileInfo.hidden = true;

        importButton.disabled = true;

        previewButton.disabled = true;

        importMessage.textContent = "";
    }
);


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


/* =========================================
   INITIALIZE
========================================= */

async function initialize() {

    const authorized =
        await checkAdminAccess();


    if (!authorized) {

        return;
    }
}


initialize();
