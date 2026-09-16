const addCategoryButton =
    document.getElementById("addCategoryButton");

const categoryFormCard =
    document.getElementById("categoryFormCard");

const categoryFormTitle =
    document.getElementById("categoryFormTitle");

const categoryForm =
    document.getElementById("categoryForm");

const categoryName =
    document.getElementById("categoryName");

const categoryDescription =
    document.getElementById("categoryDescription");

const categoryOrder =
    document.getElementById("categoryOrder");

const categoryActive =
    document.getElementById("categoryActive");

const saveCategoryButton =
    document.getElementById("saveCategoryButton");

const cancelCategoryButton =
    document.getElementById("cancelCategoryButton");

const categoryMessage =
    document.getElementById("categoryMessage");

const categoryList =
    document.getElementById("categoryList");

const categoryEmpty =
    document.getElementById("categoryEmpty");

const categoryCount =
    document.getElementById("categoryCount");

const logoutButton =
    document.getElementById("logoutButton");


let categories = [];

let editingCategoryId = null;


/* =========================================
   ADMIN ACCESS
========================================= */

async function checkAdminAccess() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "login.html";

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


    if (
        profileError ||
        !profile
    ) {

        window.location.href =
            "login.html";

        return false;
    }


    if (profile.role !== "admin") {

        window.location.href =
            "app.html";

        return false;
    }


    return true;
}


/* =========================================
   LOAD CATEGORIES
========================================= */

async function loadCategories() {

    categoryMessage.textContent =
        "Loading categories...";


    const {
        data,
        error
    } = await supabaseClient
        .from("categories")
        .select("*")
        .order(
            "display_order",
            {
                ascending: true
            }
        )
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        throw error;
    }


    categories =
        data || [];


    renderCategories();


    categoryMessage.textContent = "";
}


/* =========================================
   RENDER CATEGORIES
========================================= */

async function renderCategories() {

    categoryList.innerHTML = "";


    categoryCount.textContent =
        categories.length;


    if (categories.length === 0) {

        categoryEmpty.hidden = false;

        return;
    }


    categoryEmpty.hidden = true;


    /*
     * Get word counts for each category.
     */

    const {
        data: words,
        error
    } = await supabaseClient
        .from("words")
        .select("id, category_id");


    if (error) {

        throw error;
    }


    const wordCounts = {};


    (words || []).forEach(
        function (word) {

            if (!word.category_id) {

                return;
            }


            if (!wordCounts[word.category_id]) {

                wordCounts[word.category_id] = 0;
            }


            wordCounts[word.category_id]++;
        }
    );


    categories.forEach(
        function (category) {

            const card =
                document.createElement("div");


            card.className =
                "category-admin-card";


            const wordCount =
                wordCounts[category.id] || 0;


            const statusClass =
                category.is_active
                    ? "active"
                    : "inactive";


            const statusText =
                category.is_active
                    ? "Active"
                    : "Inactive";


            card.innerHTML = `

                <div class="category-admin-main">

                    <div>

                        <h3>
                            ${escapeHtml(category.name)}
                        </h3>

                        <p>
                            ${
                                category.description
                                    ? escapeHtml(category.description)
                                    : "No description."
                            }
                        </p>

                    </div>


                    <div class="category-admin-meta">

                        <span>
                            ${wordCount}
                            ${wordCount === 1 ? "word" : "words"}
                        </span>

                        <span>
                            Order:
                            ${category.display_order}
                        </span>

                        <span class="category-status ${statusClass}">
                            ${statusText}
                        </span>

                    </div>

                </div>


                <div class="category-admin-actions">

                    <button
                        class="btn small"
                        data-action="edit"
                        data-id="${category.id}"
                    >
                        Edit
                    </button>


                    <button
                        class="btn small"
                        data-action="toggle"
                        data-id="${category.id}"
                    >
                        ${
                            category.is_active
                                ? "Deactivate"
                                : "Activate"
                        }
                    </button>

                </div>

            `;


            categoryList.appendChild(card);
        }
    );
}


/* =========================================
   OPEN ADD FORM
========================================= */

addCategoryButton.addEventListener(
    "click",
    function () {

        editingCategoryId = null;


        categoryForm.reset();


        categoryActive.checked = true;


        categoryOrder.value = 0;


        categoryFormTitle.textContent =
            "Add Category";


        saveCategoryButton.textContent =
            "Save Category";


        categoryFormCard.hidden = false;


        categoryName.focus();
    }
);


/* =========================================
   EDIT CATEGORY
========================================= */

categoryList.addEventListener(
    "click",
    async function (event) {

        const button =
            event.target.closest("button");


        if (!button) {

            return;
        }


        const categoryId =
            button.dataset.id;


        const action =
            button.dataset.action;


        const category =
            categories.find(
                function (item) {

                    return item.id === categoryId;

                }
            );


        if (!category) {

            return;
        }


        if (action === "edit") {

            openEditForm(category);

            return;
        }


        if (action === "toggle") {

            await toggleCategory(category);

        }

    }
);


/* =========================================
   OPEN EDIT FORM
========================================= */

function openEditForm(category) {

    editingCategoryId =
        category.id;


    categoryName.value =
        category.name || "";


    categoryDescription.value =
        category.description || "";


    categoryOrder.value =
        category.display_order || 0;


    categoryActive.checked =
        Boolean(category.is_active);


    categoryFormTitle.textContent =
        "Edit Category";


    saveCategoryButton.textContent =
        "Save Changes";


    categoryFormCard.hidden = false;


    categoryName.focus();
}


/* =========================================
   SAVE CATEGORY
========================================= */

categoryForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            categoryName.value.trim();


        if (!name) {

            categoryMessage.textContent =
                "Category name is required.";

            return;
        }


        saveCategoryButton.disabled = true;


        categoryMessage.textContent =
            "Saving category...";


        try {

            const categoryData = {

                name: name,

                description:
                    categoryDescription.value.trim() ||
                    null,

                display_order:
                    Number(categoryOrder.value) || 0,

                is_active:
                    categoryActive.checked

            };


            if (editingCategoryId) {

                const {
                    error
                } = await supabaseClient
                    .from("categories")
                    .update(categoryData)
                    .eq(
                        "id",
                        editingCategoryId
                    );


                if (error) {

                    throw error;
                }


                categoryMessage.textContent =
                    "Category updated successfully.";

            } else {

                const {
                    error
                } = await supabaseClient
                    .from("categories")
                    .insert(categoryData);


                if (error) {

                    throw error;
                }


                categoryMessage.textContent =
                    "Category created successfully.";
            }


            categoryFormCard.hidden = true;


            categoryForm.reset();


            editingCategoryId = null;


            await loadCategories();


        } catch (error) {

            console.error(
                "CATEGORY SAVE ERROR:",
                error
            );


            categoryMessage.textContent =
                error.message ||
                "Unable to save category.";

        } finally {

            saveCategoryButton.disabled = false;
        }
    }
);


/* =========================================
   TOGGLE CATEGORY
========================================= */

async function toggleCategory(category) {

    const newStatus =
        !category.is_active;


    const actionText =
        newStatus
            ? "activate"
            : "deactivate";


    const confirmed =
        confirm(
            `Are you sure you want to ${actionText} "${category.name}"?`
        );


    if (!confirmed) {

        return;
    }


    try {

        categoryMessage.textContent =
            "Updating category...";


        const {
            error
        } = await supabaseClient
            .from("categories")
            .update({

                is_active:
                    newStatus

            })
            .eq(
                "id",
                category.id
            );


        if (error) {

            throw error;
        }


        await loadCategories();


    } catch (error) {

        console.error(
            "CATEGORY STATUS ERROR:",
            error
        );


        categoryMessage.textContent =
            error.message ||
            "Unable to update category.";
    }
}


/* =========================================
   CANCEL FORM
========================================= */

cancelCategoryButton.addEventListener(
    "click",
    function () {

        categoryForm.reset();

        editingCategoryId = null;

        categoryFormCard.hidden = true;

        categoryMessage.textContent = "";
    }
);


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";
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


    try {

        await loadCategories();

    } catch (error) {

        console.error(
            "CATEGORY LOAD ERROR:",
            error
        );


        categoryMessage.textContent =
            error.message ||
            "Unable to load categories.";
    }
}


initialize();
