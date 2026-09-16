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
   PREVIEW
========================================= */

previewButton.addEventListener(
    "click",
    async function () {

        if (!selectedFile) {

            return;
        }


        importMessage.textContent =
            "Reading dictionary document...";


        previewButton.disabled = true;


        try {

            /*
             * DOCX parsing will be connected here.
             *
             * For now we verify that the file has
             * been selected correctly.
             */

            importedEntries = [];


            previewSection.hidden = false;

            renderPreview();


            importMessage.textContent =
                "Document selected successfully. The import parser will be connected next.";


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

    importButton.disabled = false;


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

                </div>


                <span>
                    Draft
                </span>

            `;


            previewList.appendChild(card);
        }
    );
}


/* =========================================
   IMPORT
========================================= */

importButton.addEventListener(
    "click",
    async function () {

        if (importedEntries.length === 0) {

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

            /*
             * Database import will be connected
             * after the document parser is completed.
             */

            importMessage.textContent =
                "Import system ready for database connection.";

        } catch (error) {

            console.error(error);

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
