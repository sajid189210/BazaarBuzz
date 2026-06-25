
const validateCredentials = (req,res) => {
    const { email, password } = req.body;
    console.error(email,password);
    
}

module.exports = { validateCredentials };