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


    const zip =
        await JSZip.loadAsync(arrayBuffer);


    const documentFile =
        zip.file(
            "word/document.xml"
        );


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
   EXTRACT WORD PARAGRAPHS
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


    return paragraphs

        .map(function (paragraph) {

            const textNodes =
                Array.from(
                    paragraph.getElementsByTagName("w:t")
                );


            return textNodes

                .map(node => node.textContent)

                .join("")

                .trim();

        })

        .filter(text => text.length > 0);
}


/* =========================================
   PARSE DICTIONARY
========================================= */

function parseDictionary(paragraphs) {

    const entries = [];

    let index = 0;


    while (index < paragraphs.length) {

        const word =
            paragraphs[index]?.trim();


        const meaning =
            paragraphs[index + 1]?.trim();


        const example =
            paragraphs[index + 2]?.trim();


        if (!word) {

            index++;

            continue;
        }


        if (!meaning || !example) {

            entries.push({

                word: word,

                meaning: meaning || "",

                example: example || "",

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

        importMessage.textContent =
            "Reading dictionary document...";


        try {

            const paragraphs =
                await readDocxFile(
                    selectedFile
                );


            importedEntries =
                parseDictionary(
                    paragraphs
                );


            renderPreview();


            if (importedEntries.length === 0) {

                importMessage.textContent =
                    "No dictionary entries were found.";

            } else {

                importMessage.textContent =
                    `${importedEntries.length} dictionary entries found.`;
            }


            previewSection.hidden = false;

        } catch (error) {

            console.error(error);

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


    if (importedEntries.length === 0) {

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
            "Some entries are incomplete. Correct the document and upload it again before importing.";

    }
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


            for (
                const entry
                of importedEntries
            ) {

                const {
                    data: existingWord,
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
                    existingWord &&
                    existingWord.length > 0
                ) {

                    continue;
                }


                const {
                    data: newWord,
                    error: wordError
                } = await supabaseClient

                    .from("words")

                    .insert({

                        word: entry.word,

                        short_meaning:
                            entry.meaning,

                        is_premium: false,

                        is_published: false

                    })

                    .select("id")

                    .single();


                if (wordError) {

                    throw wordError;
                }


                const {
                    error: meaningError
                } = await supabaseClient

                    .from("meanings")

                    .insert({

                        word_id:
                            newWord.id,

                        meaning:
                            entry.meaning,

                        display_order: 1

                    });


                if (meaningError) {
```
