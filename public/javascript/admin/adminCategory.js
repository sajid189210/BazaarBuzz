//?for modal only
let brandToBeDeleted = []; //?This contains the brands that needs to be removed.


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

        if (!data.success) {
            Swal.fire({
                title: 'Warning',
                icon: 'warning',
                text: data.message,
                confirmButtonText: 'Ok'
            });
            return;
        }

        await Swal.fire({
            title: 'Success',
            icon: 'success',
            text: data.message,
            confirmButtonText: 'Ok'
        });

        window.location.reload();

    } catch (err) {
        console.error(`Error creating category: ${err.message}`);
        alert(`An error occurred while creating category in the category.${err.message}.`);
    }

}


//*----------------------------------------[Modal Area]----------------------------------------------

//creating html inputs to store the brand items
function createInputElement(brand) {
    try {

        const inputContainer = document.createElement('div');
        inputContainer.classList.add('flex', 'items-center', 'mb-2', 'mt-2');

        //creating input element for each brand.
        const input = document.createElement('input');
        input.type = 'text';
        input.value = brand;
        input.id = brand;
        input.classList.add('px-4', 'py-3', 'mr-4', 'bg-white', 'text-gray-800', 'w-full', 'text-sm', 'border', 'border-gray-300', 'focus:border-blue-600', 'outline-none', 'rounded-lg');

        //creating remove buttons for each brand.
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('ml-4', 'w-3.5', 'cursor-pointer', 'shrink-0', 'fill-gray-400', 'hover:fill-red-500', 'float-right');
        removeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                                            stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                         </svg>`;

        removeButton.addEventListener('click', function () {
            brandToBeDeleted.push(brand);
            inputContainer.remove();
        });

        inputContainer.appendChild(input);
        inputContainer.appendChild(removeButton);

        return inputContainer;

    } catch (err) {
        console.error(`Error creating brand input: ${err.message}`);
        alert(`An error occurred while creating brand input in the category.${err.message}.`);
    }

}

//opens the modal
function openModal(category) {
    try {
        const categoryData = JSON.parse(category)

        document.getElementById("editTitle").value = categoryData.title;
        document.getElementById('categoryId').value = categoryData._id;

        const brandDiv = document.getElementById("brandContainer");

        brandDiv.innerHTML = '';

        categoryData.brands.forEach(brand => {
            const container = createInputElement(brand);
            brandDiv.appendChild(container);
        });

        document.getElementById("modal").classList.remove('hidden');

    } catch (err) {
        console.error(`Error opening modal: ${err.message}`);
        alert(`An error occurred while opening modal in the category.${err.message}.`);
    }
}

//close modal
function closeModal() {
    try {

        document.getElementById("modal").classList.add('hidden');
        brandToBeDeleted = [];

    } catch (err) {
        console.error(`Error closing modal: ${err.message}`);
        alert(`An error occurred while closing modal in the category.${err.message}.`);
    }
}

//* -------------[updates category]-------------
const updateCategory = async function () {
    try {

        const title = document.getElementById("editTitle").value.trim();
        const categoryId = document.getElementById("categoryId").value;

        const response = await fetch('/admin/category/update', {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brandToBeDeleted, title, categoryId })
        });

        const data = await response.json();

        if (!data.success) {
            Swal.fire({
                title: 'Error',
                icon: 'error',
                text: data.message,
                confirmButtonText: 'Ok'
            });
            return;
        }

        await Swal.fire({
            title: 'Success',
            icon: 'success',
            text: data.message,
            confirmButtonText: 'Ok'
        });

        window.location.reload();

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

        if (!data.success) {
            alert(data.message);
            return;
        }

        if (data.isActive) {
            Swal.fire({
                title: 'Success',
                text: 'Category has been successfully activated!',
                confirmButtonText: "Ok",
                icon: 'success'
            });
        } else {
            Swal.fire({
                title: 'Success',
                text: 'Category has been successfully inactivated!',
                confirmButtonText: "Ok",
                icon: 'success'
            });

        }
    } catch (err) {
        console.error(`Error toggling category status: ${err.message}`);
        alert(`An error occurred while toggling category status in the category client side.${err.message}.`);
    }
}
