//?for modal only
let currentId = null;
let brandContainer = []; //?this is storing all the created containers for brand.
let currentBrands = []; //?this contains the brands that needs to be removed.


//*---------------create category-------------
const createCategory = async function () {
    try {

        const brand = document.getElementById('brand').value;
        const title = document.getElementById('title').value;

        const response = await fetch("/admin/category/create", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, brand })
        });

        const data = await response.json();

        if (data.success) {

            alert(data.message);
            window.location.reload();

        }
        else alert(data.message);

    } catch (err) {
        console.error(`Error creating category: ${err.message}`);
        alert(`An error occurred while creating category in the category.${err.message}.`);
    }

}


//*----------------------------------------Modal Area----------------------------------------------
const openModal = (id, title, brands) => {
    try {

        currentId = id;
        document.getElementById("editTitle").value = title;

        const brandElement = document.getElementById("brandContainer");
        brandContainer.innerHTML = '';


        const categoryBrands = brands.split(',');

        categoryBrands.forEach((brand, index) => {
            const container = createBrandInput(brand.trim(), index); //creates container for each brand.
            brandContainer.push(container);
            brandElement.appendChild(container);
        });

        document.getElementById("modal").classList.remove('hidden');

    } catch (err) {
        console.error(`Error opening modal: ${err.message}`);
        alert(`An error occurred while opening modal in the category.${err.message}.`);
    }
}


//*-----------------close modal---------------
const closeModal = () => {
    try {

        document.getElementById("modal").classList.add('hidden');
        currentId = null;
        brandContainer.forEach(container => container.remove());
        currentBrands = [];

    } catch (err) {
        console.error(`Error closing modal: ${err.message}`);
        alert(`An error occurred while closing modal in the category.${err.message}.`);
    }
}


//*-----------------creating html inputs to store the brand items.--------------
const createBrandInput = (brand) => {
    try {

        const container = document.createElement('div');
        container.className = 'flex items-center mb-2 mt-2';

        //creating input element for each brand.
        const input = document.createElement('input');
        input.type = 'text';
        input.value = brand;
        input.className = 'px-4 py-3 mr-4 bg-white text-gray-800 w-full text-sm border border-gray-300 focus:border-blue-600 outline-none rounded-lg';
        input.name = 'editBrand[]';

        //creating remove buttons for each brand.
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'ml-4 w-3.5 cursor-pointer shrink-0 fill-gray-400 hover:fill-red-500 float-right';
        removeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;

        removeButton.onclick = async () => {
            currentBrands.push(brand);
            container.remove();
        }

        container.appendChild(input);
        container.appendChild(removeButton);

        return container;

    } catch (err) {
        console.error(`Error creating brand input: ${err.message}`);
        alert(`An error occurred while creating brand input in the category.${err.message}.`);
    }

}

//*-------------updates category-------------
const updateCategory = async function () {
    try {

        if (!currentId) {
            alert("No category was selected!");
            return;
        }

        const title = document.getElementById("editTitle").value;

        const response = await fetch(`/admin/category/update/${currentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentBrands, title })
        });

        const data = await response.json();

        if (data.success) {

            alert(data.message);
            window.location.reload();

        } else alert(data.message)

    } catch (err) {
        console.error(`Error updating category: ${err.message}`);
        alert(`An error occurred while updating category in the category.${err.message}.`);
    }
}


//*-------------delete category----------
const deleteCategory = async function (id) {
    try {

        if (confirm("Are you sure you want to delete the category?")) {

            const response = await fetch(`/admin/category/delete/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (data.success) window.location.reload();
            else alert(data.message);

        } else return

    } catch (error) {
        console.error(`Error deleting category: ${err.message}`);
        alert(`An error occurred while deleting category in the category.${err.message}.`);
    }
}


//*toggles between active and inactive.
const toggleCategoryStatus = async (element, id) => {
    try {

        //gets the selected option.
        const selectedOption = element.options[element.selectedIndex];

        const response = await fetch(`/admin/categoryStatus/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedOption: selectedOption.value })
        });

        const data = await response.json();

        if (data) return;
        else alert(data.message)

    } catch (err) {
        console.error(`Error toggling category status: ${err.message}`);
        alert(`An error occurred while toggling category status in the category client side.${err.message}.`);
    }
}
