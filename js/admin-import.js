```javascript
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

        console.error(profileError);

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

        importMessage.textContent = "";
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

    const arrayBuffer =
        await file.arrayBuffer();


    if (typeof JSZip === "undefined") {

        throw new Error(
            "JSZip could not be loaded."
        );
    }


    const zip =
        await JSZip.loadAsync(arrayBuffer);


    const documentFile =
        zip.file("word/document.xml");


    if (!documentFile) {

        throw new Error(
            "The selected file does not contain a valid Word document."
        );
    }


    const xml =
        await documentFile.async("string");


    if (!xml || !xml.trim()) {

        throw new Error(
            "The Word document contains no readable content."
        );
    }


    return extractParagraphs(xml);
}


/* =========================================
   EXTRACT DOCX PARAGRAPHS
========================================= */

function extractParagraphs(xml) {

    const parser =
        new DOMParser();


    const xmlDocument =
        parser.parseFromString(
            xml,
            "application/xml"
        );


    const parserError =
        xmlDocument.querySelector("parsererror");


    if (parserError) {

        throw new Error(
            "Unable to read the internal Word document structure."
        );
    }


    const paragraphs =
        Array.from(
            xmlDocument.getElementsByTagName("w:p")
        );


    const results = [];


    paragraphs.forEach(function (paragraph) {

        /*
         * A Word paragraph can contain many runs.
         *
         * Example:
         *
         * <w:p>
         *   <w:r>
         *     <w:t>Kota</w:t>
         *   </w:r>
         * </w:p>
         *
         * We collect every w:t inside the paragraph.
         */

        const textNodes =
            Array.from(
                paragraph.getElementsByTagName("w:t")
            );


        let text = "";


        textNodes.forEach(function (node) {

            text += node.textContent || "";

        });


        text =
            text
                .replace(/\u00A0/g, " ")
                .replace(/\r/g, "")
                .replace(/\n/g, " ")
                .trim();


        /*
         * Ignore completely empty Word paragraphs.
         */

        if (text.length > 0) {

            results.push(text);
        }

    });


    console.log(
        "DOCX paragraphs found:",
        results
    );


    return results;
}


/* =========================================
   PARSE DICTIONARY
========================================= */

function parseDictionary(paragraphs) {

    const entries = [];


    /*
     * Your document format is:
     *
     * WORD
     * MEANING
     * EXAMPLE
     *
     * WORD
     * MEANING
     * EXAMPLE
     *
     * etc.
     */

    for (
        let index = 0;
        index < paragraphs.length;
        index += 3
    ) {

        const word =
            paragraphs[index] || "";

        const meaning =
            paragraphs[index + 1] || "";

        const example =
            paragraphs[index + 2] || "";


        /*
         * Ignore completely empty groups.
         */

        if (
            !word &&
            !meaning &&
            !example
        ) {

            continue;
        }


        const valid =
            Boolean(
                word &&
                meaning &&
                example
            );


        entries.push({

            word: word,

            meaning: meaning,

            example: example,

            valid: valid

        });

    }


    return entries;
}


/* =========================================
   PREVIEW BUTTON
========================================= */

previewButton.addEventListener(
    "click",
    async function () {

        if (!selectedFile) {

            return;
        }


        previewButton.disabled = true;

        importMessage.textContent =
            "Reading dictionary document...";


        previewSection.hidden = false;


        try {

            const paragraphs =
                await readDocxFile(
                    selectedFile
                );


            console.log(
                "Extracted paragraphs:",
                paragraphs
            );


            if (paragraphs.length === 0) {

                importedEntries = [];

                renderPreview();


                importMessage.textContent =
                    "No text was found in the Word document.";

                return;
            }


            importedEntries =
                parseDictionary(
                    paragraphs
                );


            console.log(
                "Parsed dictionary entries:",
                importedEntries
            );


            renderPreview();


            if (importedEntries.length === 0) {

                importMessage.textContent =
                    "No dictionary entries were found.";

            } else {

                const validCount =
                    importedEntries.filter(
                        entry => entry.valid
                    ).length;


                importMessage.textContent =
                    `${validCount} valid dictionary entries found.`;
            }


        } catch (error) {

            console.error(
                "DOCX IMPORT ERROR:",
                error
            );


            importedEntries = [];

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
   RENDER PREVIEW
========================================= */

function renderPreview() {

    previewList.innerHTML = "";


    previewCount.textContent =
        importedEntries.length;


    if (
        importedEntries.length === 0
    ) {

        previewEmpty.hidden = false;

        importButton.disabled = true;

        return;
    }


    previewEmpty.hidden = true;


    const hasInvalidEntries =
        importedEntries.some(
            entry => !entry.valid
        );


    importButton.disabled =
        hasInvalidEntries;


    importedEntries.forEach(
        function (entry, index) {

            const card =
                document.createElement("div");


            card.className =
                "import-preview-card";


            if (!entry.valid) {

                card.classList.add(
                    "import-invalid"
                );
            }


            card.innerHTML = `

                <div class="import-preview-content">

                    <div class="import-preview-number">
                        ${index + 1}
                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(entry.word)}
                        </strong>

                        <p>
                            <b>Meaning:</b>
                            ${escapeHtml(
                                entry.meaning ||
                                "Missing"
                            )}
                        </p>

                        <p>
                            <b>Example:</b>
                            ${escapeHtml(
                                entry.example ||
                                "Missing"
                            )}
                        </p>

                    </div>

                </div>

                <span class="${entry.valid
                    ? ""
                    : "invalid-label"}">

                    ${entry.valid
                        ? "Ready"
                        : "Incomplete"}

                </span>

            `;


            previewList.appendChild(card);

        }
    );


    if (hasInvalidEntries) {

        importMessage.textContent =
            "Some entries are incomplete. Check the document structure before importing.";
    }
}


/* =========================================
   IMPORT INTO SUPABASE
========================================= */

importButton.addEventListener(
    "click",
    async function () {

        if (
            importedEntries.length === 0
        ) {

            return;
        }


        const invalid =
            importedEntries.some(
                entry => !entry.valid
            );


        if (invalid) {

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

        importMessage.textContent =
            "Importing dictionary entries...";


        try {

            let importedCount = 0;
            let skippedCount = 0;


            for (
                const entry
                of importedEntries
            ) {

                /*
                 * Check whether this word already exists.
                 */

                const {
                    data: existingWords,
                    error: existingError
                } = await supabaseClient
                    .from("words")
                    .select("id")
                    .ilike(
                        "word",
                        entry.word
                    )
                    .limit(1);


                if (existingError) {

                    throw existingError;
                }


                if (
                    existingWords &&
                    existingWords.length > 0
                ) {

                    skippedCount++;

                    continue;
                }


                /*
                 * Create the word.
                 */

                const {
                    data: newWord,
                    error: wordError
                } = await supabaseClient
                    .from("words")
                    .insert({

                        word:
                            entry.word,

                        short_meaning:
                            entry.meaning,

                        is_premium:
                            false,

                        is_published:
                            false

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
                    data: newMeaning,
                    error: meaningError
                } = await supabaseClient
                    .from("meanings")
                    .insert({

                        word_id:
                            newWord.id,

                        meaning:
                            entry.meaning,

                        display_order:
                            1

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
                            newMeaning.id,

                        example_text:
                            entry.example,

                        display_order:
                            1

                    });


                if (exampleError) {

                    throw exampleError;
                }


                importedCount++;

            }


            importMessage.textContent =
                `${importedCount} entries imported successfully as drafts.` +
                (
                    skippedCount > 0
                        ? ` ${skippedCount} existing entries were skipped.`
                        : ""
                );


            importedEntries = [];


            renderPreview();


            dictionaryFile.value = "";

            selectedFile = null;

            fileInfo.hidden = true;

            previewButton.disabled = true;


        } catch (error) {

            console.error(
                "IMPORT ERROR:",
                error
            );


            importMessage.textContent =
                error.message ||
                "Unable to import dictionary entries.";


            importButton.disabled = false;
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

        previewList.innerHTML = "";

        previewSection.hidden = true;

        importButton.disabled = true;

        importMessage.textContent = "";

    }
);


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
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
```
