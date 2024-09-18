
//*---------------------unblocking the user------------------------
const unblockUser = async (id) => {
    try {

        const response = await fetch(`/admin/userList/unblocked/${id}`, {
            method: "PUT",
            headers: { 'Content-Type': "application/json" }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            window.location.reload();
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(`Error caught unblockUser in client side.${err}`);
        alert(err.message);
    }
};


//*------------------blocking the user---------------------
const blockUser = async (id) => {
    try {
        const response = await fetch(`/admin/userList/blocked/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            window.location.reload();
        } else {
            alert(data.message)
        }

    } catch (err) {
        console.error(`Error caught unblockUser in client side.${err}`);
        alert(err.message);
    }
}
