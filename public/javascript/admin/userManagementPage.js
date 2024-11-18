
const searchInput = document.getElementById('searchInput');
//?---------------------unblocking the user------------------------
const unblockUser = async (id) => {
    try {

        const response = await fetch(`/admin/userList/unblocked/${id}`, {
            method: "PUT",
            headers: { 'Content-Type': "application/json" }
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                title: 'User Unblocked!',
                text: data.message,
                icon: 'success',
                width: '600px',
                confirmButtonText: 'Ok'
            });
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(`Error caught unblockUser in client side.${err}`);
        alert(err.message);
    }
};


//?------------------blocking the user---------------------
const blockUser = async (id) => {
    try {
        const response = await fetch(`/admin/userList/blocked/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire({
                title: 'User Blocked!',
                text: data.message,
                icon: 'success',
                width: '600px',
                confirmButtonText: 'Ok'
            });
        } else {
            alert(data.message)
        }

    } catch (err) {
        console.error(`Error caught unblockUser in client side.${err}`);
        alert(err.message);
    }
};

//*Block/Unblock action
document.addEventListener("DOMContentLoaded", function () {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const userId = this.dataset.userId;
            if (!checkbox.checked) unblockUser(userId);
            else blockUser(userId);
        });
    });
});


// //*search functionality
// searchInput.addEventListener('input', async function () {
//     const searchInput = this.value.trim();
//     const resultsContainer = document.getElementById('resultsContainer');
//     const userTable = document.querySelector('#userTable tbody');

//     if (!searchInput) {
//         resultsContainer.innerHTML = '';
//         window.location.reload()
//         return;
//     }

//     //clearing existing rows
//     userTable.innerHTML = ''

//     //show the loading... message
//     resultsContainer.innerHTML = '<span class="w-full p-2 shadow text-slate-600 border text-medium">loading...</span>'

//     try {
//         const response = await fetch(`/admin/search?search=${encodeURIComponent(searchInput)}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//         });
//         const data = await response.json();

//         resultsContainer.innerHTML = '';

//         if (data.users.length === 0) {
//             resultsContainer.innerHTML = '<span class="w-full font-regular p-2 shadow-lg text-slate-600 border text-medium">User not found.</span>';
//         }
//         else {

//             data.users.forEach(user => {
//                 if (user) {
//                     const row = document.createElement('tr');
//                     row.innerHTML = `
//                     <td class="border-b text-sm border-gray-200 px-6 py-4">${user._id}</td>
//                     <td class="border-b text-sm border-gray-200 px-6 py-4">${user.username || 'N/A'}</td>
//                     <td class="border-b text-sm border-gray-200 px-6 py-4">${user.email}</td>
//                     <td class="border-b text-sm border-gray-200 px-6 py-4">${new Date(user.createdAt).toLocaleString() || 'Never'}</td>
//                     <td class="border-b text-sm border-gray-200 px-6 py-4">${user.isBlocked}</td>
//                     <td class="border-b text-sm border-gray-200 px-6 py-4">
//                         <label class="relative cursor-pointer">
//                             <input type="checkbox" class="peer sr-only"
//                                 data-user-id="${user._id}" ${user.isBlocked === 'blocked' ? 'checked' : ''} />
//                             <div class=" peer flex h-6 w-11 items-center rounded-full bg-gray-300 after:absolute after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#007bff] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
//                         </label>
//                     </td>
//                 `;
//                     userTable.appendChild(row);
//                 } else {
//                     userTable.innerHTML = '<td class="border-b text-sm border-gray-200 px-6 py-4">No users were found.</td>';
//                 }
//             });

//         }
//     } catch (err) {
//         console.error(`Error caught search functionality in client side.${err}`);
//         resultsContainer.innerHTML = '<span class="w-full p-2 shadow text-slate-600 border text-medium">Something went wrong.</span>'
//         alert(err.message);
//     }

//     const checkboxes = document.querySelectorAll('input[type="checkbox"]');
//     checkboxes.forEach(checkbox => {
//         checkbox.addEventListener('change', function () {
//             const userId = this.dataset.userId;
//             if (!checkbox.checked) unblockUser(userId);
//             else blockUser(userId);
//         });
//     });

// });

