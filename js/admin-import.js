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

```javascript
dictionaryFile.addEventListener(
    "change",
    function () {

        console.log("FILE CHANGE EVENT FIRED");

        const file =
            dictionaryFile.files[0];

        console.log("SELECTED FILE:", file);


        if (!file) {

            selectedFile = null;

            fileInfo.hidden = true;

            previewButton.disabled = true;

            importMessage.textContent =
                "No file selected.";

            return;
        }


        const fileExtension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        console.log(
            "FILE EXTENSION:",
            fileExtension
        );


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

        
        console.log(
            "PREVIEW BUTTON ENABLED"
        );
    }
);
```

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


    const zip =
        await JSZip.loadAsync(arrayBuffer);


    const documentFile =
        zip.file("word/document.xml");


    if (!documentFile) {

        throw new Error(
            "Unable to find the Word document content."
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


    const paragraphs =
        Array.from(
            document.getElementsByTagName("w:p")
        );


    const text = [];


    paragraphs.forEach(
        function (paragraph) {

            const textNodes =
                Array.from(
                    paragraph.getElementsByTagName("w:t")
                );


            const paragraphText =
                textNodes
                    .map(
                        function (node) {
                            return node.textContent || "";
                        }
                    )
                    .join("")
                    .trim();


            if (paragraphText) {

                text.push(paragraphText);
            }

        }
    );


    return text;
}


/* =========================================
   PARSE DICTIONARY
========================================= */

function parseDictionary(paragraphs) {

    const entries = [];


    /*
     * DOCUMENT FORMAT:
     *
     * Word
     * Meaning
     * Example
     *
     * Word
     * Meaning
     * Example
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
         * If the last entry is incomplete,
         * mark it as invalid.
         */

        const valid =
            Boolean(
                word &&
                meaning &&
                example
            );


        if (!word) {

            continue;
        }


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
   PREVIEW
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


        try {

            const paragraphs =
                await readDocxFile(
                    selectedFile
                );


            console.log(
                "Extracted paragraphs:",
                paragraphs
            );


            importedEntries =
                parseDictionary(
                    paragraphs
                );


            console.log(
                "Parsed entries:",
                importedEntries
            );


            previewSection.hidden = false;


            renderPreview();


            if (
                importedEntries.length === 0
            ) {

                importMessage.textContent =
                    "No dictionary entries were found.";

            } else {

                const validEntries =
                    importedEntries.filter(
                        entry => entry.valid
                    ).length;


                importMessage.textContent =
                    `${validEntries} dictionary entries found.`;
            }


        } catch (error) {

            console.error(
                "DOCX parsing error:",
                error
            );


            importMessage.textContent =
                error.message ||
                "Unable to read the dictionary document.";


            previewSection.hidden = false;

            importedEntries = [];

            renderPreview();


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
            "Some entries are incomplete. Check the document before importing.";

    }
}


/* =========================================
   IMPORT
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
                 * Check if the word already exists.
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
                 * Create word.
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
                 * Create meaning.
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
                 * Create example.
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
                "Import error:",
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
